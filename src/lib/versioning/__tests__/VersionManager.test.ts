import { VersionManager } from '../VersionManager';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    assetVersion: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    assetBranch: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  })),
}));

describe('VersionManager', () => {
  let versionManager: VersionManager;
  let prisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    prisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    versionManager = new VersionManager();
  });

  describe('createVersion', () => {
    it('should create a new version', async () => {
      const assetId = 'asset-1';
      const userId = 'user-1';
      const changes = [
        {
          type: 'add' as const,
          path: '/test.txt',
          content: 'test content',
        },
      ];
      const description = 'Initial version';

      const version = await versionManager.createVersion(
        assetId,
        userId,
        changes,
        description
      );

      expect(version).toHaveProperty('id');
      expect(version.assetId).toBe(assetId);
      expect(version.userId).toBe(userId);
      expect(version.changes).toEqual(changes);
      expect(version.description).toBe(description);
    });
  });

  describe('getVersions', () => {
    it('should retrieve versions with filters', async () => {
      const assetId = 'asset-1';
      const mockVersions = [
        {
          id: 'v1',
          assetId,
          userId: 'user-1',
          timestamp: new Date(),
          changes: '[]',
          tags: ['latest'],
          description: 'Version 1',
        },
      ];

      (prisma.assetVersion.findMany as jest.Mock).mockResolvedValue(mockVersions);

      const versions = await versionManager.getVersions(assetId, {
        limit: 10,
        tags: ['latest'],
      });

      expect(versions.length).toBe(1);
      expect(versions[0].id).toBe('v1');
      expect(JSON.parse(versions[0].changes)).toEqual([]);
    });
  });

  describe('compareVersions', () => {
    it('should compare two versions and return changes', async () => {
      const version1 = {
        id: 'v1',
        changes: JSON.stringify([
          {
            type: 'add',
            path: '/test.txt',
            content: 'original content',
          },
        ]),
      };

      const version2 = {
        id: 'v2',
        changes: JSON.stringify([
          {
            type: 'modify',
            path: '/test.txt',
            content: 'modified content',
          },
        ]),
      };

      (prisma.assetVersion.findUnique as jest.Mock)
        .mockResolvedValueOnce(version1)
        .mockResolvedValueOnce(version2);

      const changes = await versionManager.compareVersions('v1', 'v2');

      expect(changes.length).toBe(1);
      expect(changes[0].type).toBe('modify');
      expect(changes[0].path).toBe('/test.txt');
      expect(changes[0].content).toBe('modified content');
      expect(changes[0].previousContent).toBe('original content');
    });

    it('should handle missing versions', async () => {
      (prisma.assetVersion.findUnique as jest.Mock)
        .mockResolvedValueOnce(null);

      await expect(
        versionManager.compareVersions('v1', 'v2')
      ).rejects.toThrow('One or both versions not found');
    });
  });

  describe('revertToVersion', () => {
    it('should create a new version with inverse changes', async () => {
      const version = {
        id: 'v1',
        changes: JSON.stringify([
          {
            type: 'add',
            path: '/test.txt',
            content: 'test content',
          },
        ]),
      };

      (prisma.assetVersion.findUnique as jest.Mock)
        .mockResolvedValue(version);

      const revertedVersion = await versionManager.revertToVersion(
        'asset-1',
        'v1',
        'user-1'
      );

      expect(revertedVersion.changes[0].type).toBe('delete');
      expect(revertedVersion.changes[0].path).toBe('/test.txt');
      expect(revertedVersion.description).toContain('Reverted to version');
      expect(revertedVersion.tags).toContain('revert');
    });
  });

  describe('branch management', () => {
    it('should create a new branch', async () => {
      const mockVersion = {
        id: 'v1',
        changes: '[]',
      };

      (prisma.assetVersion.findMany as jest.Mock)
        .mockResolvedValue([mockVersion]);

      await versionManager.createBranch('asset-1', 'feature-branch');

      expect(prisma.assetBranch.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          assetId: 'asset-1',
          name: 'feature-branch',
          baseVersionId: 'v1',
        }),
      });
    });

    it('should merge branches', async () => {
      const mockBranch = {
        id: 'b1',
        name: 'feature-branch',
        createdAt: new Date(),
      };

      const mockVersions = [
        {
          id: 'v1',
          changes: '[]',
        },
      ];

      (prisma.assetBranch.findFirst as jest.Mock)
        .mockResolvedValue(mockBranch);
      (prisma.assetVersion.findMany as jest.Mock)
        .mockResolvedValue(mockVersions);

      await versionManager.mergeBranches(
        'asset-1',
        'feature-branch',
        'main',
        'user-1'
      );

      expect(prisma.assetVersion.create).toHaveBeenCalled();
    });
  });

  describe('tag management', () => {
    it('should add a tag to a version', async () => {
      const mockVersion = {
        id: 'v1',
        tags: ['existing-tag'],
      };

      (prisma.assetVersion.findUnique as jest.Mock)
        .mockResolvedValue(mockVersion);

      await versionManager.addTag('v1', 'new-tag');

      expect(prisma.assetVersion.update).toHaveBeenCalledWith({
        where: { id: 'v1' },
        data: {
          tags: {
            push: 'new-tag',
          },
        },
      });
    });

    it('should remove a tag from a version', async () => {
      const mockVersion = {
        id: 'v1',
        tags: ['tag1', 'tag2'],
      };

      (prisma.assetVersion.findUnique as jest.Mock)
        .mockResolvedValue(mockVersion);

      await versionManager.removeTag('v1', 'tag1');

      expect(prisma.assetVersion.update).toHaveBeenCalledWith({
        where: { id: 'v1' },
        data: {
          tags: ['tag2'],
        },
      });
    });
  });
});
