import { PrismaClient, Asset, AssetVersion } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { diff_match_patch } from 'diff-match-patch';

interface Version {
  id: string;
  assetId: string;
  userId: string;
  timestamp: Date;
  changes: Change[];
  metadata: any;
  tags: string[];
  description: string;
}

interface Change {
  type: 'add' | 'modify' | 'delete';
  path: string;
  content?: string;
  previousContent?: string;
  metadata?: any;
}

export class VersionManager {
  private prisma: PrismaClient;
  private differ: diff_match_patch;

  constructor() {
    this.prisma = new PrismaClient();
    this.differ = new diff_match_patch();
  }

  async createVersion(
    assetId: string,
    userId: string,
    changes: Change[],
    description: string,
    tags: string[] = []
  ): Promise<Version> {
    const version: Version = {
      id: uuidv4(),
      assetId,
      userId,
      timestamp: new Date(),
      changes,
      metadata: {},
      tags,
      description,
    };

    await this.prisma.assetVersion.create({
      data: {
        id: version.id,
        assetId: version.assetId,
        userId: version.userId,
        timestamp: version.timestamp,
        changes: JSON.stringify(version.changes),
        metadata: version.metadata,
        tags: version.tags,
        description: version.description,
      },
    });

    return version;
  }

  async getVersions(
    assetId: string,
    options: {
      limit?: number;
      offset?: number;
      fromDate?: Date;
      toDate?: Date;
      tags?: string[];
    } = {}
  ): Promise<Version[]> {
    const versions = await this.prisma.assetVersion.findMany({
      where: {
        assetId,
        timestamp: {
          gte: options.fromDate,
          lte: options.toDate,
        },
        tags: options.tags ? {
          hasEvery: options.tags,
        } : undefined,
      },
      orderBy: {
        timestamp: 'desc',
      },
      skip: options.offset,
      take: options.limit,
    });

    return versions.map(v => ({
      ...v,
      changes: JSON.parse(v.changes as string),
    }));
  }

  async getVersion(versionId: string): Promise<Version | null> {
    const version = await this.prisma.assetVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) return null;

    return {
      ...version,
      changes: JSON.parse(version.changes as string),
    };
  }

  async compareVersions(
    versionId1: string,
    versionId2: string
  ): Promise<Change[]> {
    const [version1, version2] = await Promise.all([
      this.getVersion(versionId1),
      this.getVersion(versionId2),
    ]);

    if (!version1 || !version2) {
      throw new Error('One or both versions not found');
    }

    const changes: Change[] = [];
    const paths = new Set([
      ...version1.changes.map(c => c.path),
      ...version2.changes.map(c => c.path),
    ]);

    for (const path of paths) {
      const change1 = version1.changes.find(c => c.path === path);
      const change2 = version2.changes.find(c => c.path === path);

      if (!change1) {
        changes.push({
          type: 'add',
          path,
          content: change2?.content,
        });
      } else if (!change2) {
        changes.push({
          type: 'delete',
          path,
          previousContent: change1.content,
        });
      } else if (change1.content !== change2.content) {
        const diffs = this.differ.diff_main(
          change1.content || '',
          change2.content || ''
        );
        this.differ.diff_cleanupSemantic(diffs);

        changes.push({
          type: 'modify',
          path,
          content: change2.content,
          previousContent: change1.content,
          metadata: { diffs },
        });
      }
    }

    return changes;
  }

  async revertToVersion(
    assetId: string,
    versionId: string,
    userId: string
  ): Promise<Version> {
    const version = await this.getVersion(versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    // Create inverse changes to revert to the specified version
    const inverseChanges = version.changes.map(change => {
      switch (change.type) {
        case 'add':
          return {
            type: 'delete' as const,
            path: change.path,
            previousContent: change.content,
          };
        case 'delete':
          return {
            type: 'add' as const,
            path: change.path,
            content: change.previousContent,
          };
        case 'modify':
          return {
            type: 'modify' as const,
            path: change.path,
            content: change.previousContent,
            previousContent: change.content,
          };
      }
    });

    return this.createVersion(
      assetId,
      userId,
      inverseChanges,
      `Reverted to version ${versionId}`,
      ['revert']
    );
  }

  async createBranch(
    assetId: string,
    branchName: string,
    fromVersionId?: string
  ): Promise<void> {
    const baseVersion = fromVersionId
      ? await this.getVersion(fromVersionId)
      : (await this.getVersions(assetId, { limit: 1 }))[0];

    if (!baseVersion) {
      throw new Error('Base version not found');
    }

    await this.prisma.assetBranch.create({
      data: {
        assetId,
        name: branchName,
        baseVersionId: baseVersion.id,
        createdAt: new Date(),
      },
    });
  }

  async mergeBranches(
    assetId: string,
    sourceBranch: string,
    targetBranch: string,
    userId: string
  ): Promise<Version> {
    const [sourceVersions, targetVersions] = await Promise.all([
      this.getVersionsInBranch(assetId, sourceBranch),
      this.getVersionsInBranch(assetId, targetBranch),
    ]);

    const latestSourceVersion = sourceVersions[0];
    const latestTargetVersion = targetVersions[0];

    if (!latestSourceVersion || !latestTargetVersion) {
      throw new Error('Source or target version not found');
    }

    const mergeChanges = await this.compareVersions(
      latestSourceVersion.id,
      latestTargetVersion.id
    );

    return this.createVersion(
      assetId,
      userId,
      mergeChanges,
      `Merged ${sourceBranch} into ${targetBranch}`,
      ['merge']
    );
  }

  private async getVersionsInBranch(
    assetId: string,
    branchName: string
  ): Promise<Version[]> {
    const branch = await this.prisma.assetBranch.findFirst({
      where: {
        assetId,
        name: branchName,
      },
    });

    if (!branch) {
      throw new Error(`Branch ${branchName} not found`);
    }

    return this.getVersions(assetId, {
      fromDate: branch.createdAt,
    });
  }

  async addTag(versionId: string, tag: string): Promise<void> {
    const version = await this.prisma.assetVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new Error('Version not found');
    }

    await this.prisma.assetVersion.update({
      where: { id: versionId },
      data: {
        tags: {
          push: tag,
        },
      },
    });
  }

  async removeTag(versionId: string, tag: string): Promise<void> {
    const version = await this.prisma.assetVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new Error('Version not found');
    }

    await this.prisma.assetVersion.update({
      where: { id: versionId },
      data: {
        tags: version.tags.filter(t => t !== tag),
      },
    });
  }

  async getVersionsByTag(
    assetId: string,
    tag: string
  ): Promise<Version[]> {
    return this.getVersions(assetId, {
      tags: [tag],
    });
  }
}
