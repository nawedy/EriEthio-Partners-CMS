import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { AI_CONFIG } from '@/utils/ai-config';

interface UsageMetrics {
  totalAssets: number;
  totalUsers: number;
  activeUsers: number;
  storageUsed: number;
  aiCreditsUsed: number;
}

interface AssetMetrics {
  totalViews: number;
  uniqueViews: number;
  averageEditTime: number;
  popularTags: { tag: string; count: number }[];
  collaborators: number;
}

interface AIMetrics {
  totalGenerations: number;
  successRate: number;
  averageLatency: number;
  costPerModel: { model: string; cost: number }[];
  popularPrompts: { prompt: string; count: number }[];
}

interface CollaborationMetrics {
  totalSessions: number;
  averageSessionDuration: number;
  peakConcurrentUsers: number;
  editConflicts: number;
}

interface InsightReport {
  key: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  recommendations: string[];
}

export class AnalyticsManager {
  private prisma: PrismaClient;
  private openai: OpenAI;

  constructor() {
    this.prisma = new PrismaClient();
    this.openai = new OpenAI({
      apiKey: AI_CONFIG.openai.apiKey,
    });
  }

  async getUsageMetrics(tenantId: string): Promise<UsageMetrics> {
    const [
      assets,
      users,
      activeUsers,
      storage,
      aiUsage,
    ] = await Promise.all([
      this.prisma.asset.count({ where: { tenantId } }),
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.user.count({
        where: {
          tenantId,
          lastActive: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days
          },
        },
      }),
      this.prisma.asset.aggregate({
        where: { tenantId },
        _sum: { size: true },
      }),
      this.prisma.aiUsage.aggregate({
        where: { tenantId },
        _sum: { credits: true },
      }),
    ]);

    return {
      totalAssets: assets,
      totalUsers: users,
      activeUsers,
      storageUsed: storage._sum.size || 0,
      aiCreditsUsed: aiUsage._sum.credits || 0,
    };
  }

  async getAssetMetrics(assetId: string): Promise<AssetMetrics> {
    const [
      views,
      uniqueViews,
      editTime,
      tags,
      collaborators,
    ] = await Promise.all([
      this.prisma.assetView.count({ where: { assetId } }),
      this.prisma.assetView.groupBy({
        by: ['userId'],
        where: { assetId },
      }).then(groups => groups.length),
      this.prisma.assetEdit.aggregate({
        where: { assetId },
        _avg: { duration: true },
      }),
      this.prisma.assetTag.groupBy({
        by: ['tag'],
        where: { assetId },
        _count: true,
        orderBy: {
          _count: {
            tag: 'desc',
          },
        },
        take: 10,
      }),
      this.prisma.assetCollaborator.count({ where: { assetId } }),
    ]);

    return {
      totalViews: views,
      uniqueViews,
      averageEditTime: editTime._avg.duration || 0,
      popularTags: tags.map(t => ({
        tag: t.tag,
        count: t._count,
      })),
      collaborators,
    };
  }

  async getAIMetrics(tenantId: string): Promise<AIMetrics> {
    const [
      generations,
      successCount,
      latency,
      costs,
      prompts,
    ] = await Promise.all([
      this.prisma.aiGeneration.count({ where: { tenantId } }),
      this.prisma.aiGeneration.count({
        where: {
          tenantId,
          status: 'success',
        },
      }),
      this.prisma.aiGeneration.aggregate({
        where: { tenantId },
        _avg: { latency: true },
      }),
      this.prisma.aiUsage.groupBy({
        by: ['model'],
        where: { tenantId },
        _sum: {
          cost: true,
        },
      }),
      this.prisma.aiGeneration.groupBy({
        by: ['prompt'],
        where: { tenantId },
        _count: true,
        orderBy: {
          _count: {
            prompt: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    return {
      totalGenerations: generations,
      successRate: generations ? successCount / generations : 0,
      averageLatency: latency._avg.latency || 0,
      costPerModel: costs.map(c => ({
        model: c.model,
        cost: c._sum.cost || 0,
      })),
      popularPrompts: prompts.map(p => ({
        prompt: p.prompt,
        count: p._count,
      })),
    };
  }

  async getCollaborationMetrics(tenantId: string): Promise<CollaborationMetrics> {
    const [
      sessions,
      duration,
      conflicts,
      concurrentUsers,
    ] = await Promise.all([
      this.prisma.collaborationSession.count({ where: { tenantId } }),
      this.prisma.collaborationSession.aggregate({
        where: { tenantId },
        _avg: { duration: true },
      }),
      this.prisma.editConflict.count({ where: { tenantId } }),
      this.prisma.userPresence.groupBy({
        by: ['timestamp'],
        where: { tenantId },
        _count: true,
        orderBy: {
          _count: {
            userId: 'desc',
          },
        },
        take: 1,
      }),
    ]);

    return {
      totalSessions: sessions,
      averageSessionDuration: duration._avg.duration || 0,
      peakConcurrentUsers: concurrentUsers[0]?._count || 0,
      editConflicts: conflicts,
    };
  }

  async generateInsights(tenantId: string): Promise<InsightReport[]> {
    const [
      usage,
      ai,
      collaboration,
    ] = await Promise.all([
      this.getUsageMetrics(tenantId),
      this.getAIMetrics(tenantId),
      this.getCollaborationMetrics(tenantId),
    ]);

    const analysis = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an analytics expert. Analyze the provided metrics and generate actionable insights."
        },
        {
          role: "user",
          content: JSON.stringify({
            usage,
            ai,
            collaboration,
          })
        }
      ],
      functions: [
        {
          name: "provide_insights",
          parameters: {
            type: "object",
            properties: {
              insights: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    key: {
                      type: "string",
                      description: "Unique identifier for the insight"
                    },
                    title: {
                      type: "string",
                      description: "Short, descriptive title"
                    },
                    description: {
                      type: "string",
                      description: "Detailed explanation of the insight"
                    },
                    impact: {
                      type: "string",
                      enum: ["high", "medium", "low"]
                    },
                    recommendations: {
                      type: "array",
                      items: { type: "string" }
                    }
                  },
                  required: ["key", "title", "description", "impact", "recommendations"]
                }
              }
            },
            required: ["insights"]
          }
        }
      ],
      function_call: { name: "provide_insights" }
    });

    const insights = JSON.parse(
      analysis.choices[0].message.function_call?.arguments || '{}'
    ).insights;

    return insights;
  }

  async trackAssetView(assetId: string, userId: string): Promise<void> {
    await this.prisma.assetView.create({
      data: {
        assetId,
        userId,
        timestamp: new Date(),
      },
    });
  }

  async trackAssetEdit(
    assetId: string,
    userId: string,
    duration: number
  ): Promise<void> {
    await this.prisma.assetEdit.create({
      data: {
        assetId,
        userId,
        duration,
        timestamp: new Date(),
      },
    });
  }

  async trackAIGeneration(
    tenantId: string,
    model: string,
    prompt: string,
    status: 'success' | 'failure',
    latency: number,
    cost: number
  ): Promise<void> {
    await Promise.all([
      this.prisma.aiGeneration.create({
        data: {
          tenantId,
          model,
          prompt,
          status,
          latency,
          timestamp: new Date(),
        },
      }),
      this.prisma.aiUsage.create({
        data: {
          tenantId,
          model,
          credits: cost,
          timestamp: new Date(),
        },
      }),
    ]);
  }

  async trackCollaborationSession(
    tenantId: string,
    sessionId: string,
    duration: number,
    userCount: number
  ): Promise<void> {
    await this.prisma.collaborationSession.create({
      data: {
        tenantId,
        sessionId,
        duration,
        userCount,
        timestamp: new Date(),
      },
    });
  }

  async trackUserPresence(
    tenantId: string,
    userId: string,
    status: 'online' | 'offline'
  ): Promise<void> {
    await this.prisma.userPresence.create({
      data: {
        tenantId,
        userId,
        status,
        timestamp: new Date(),
      },
    });
  }

  async getTimeSeriesData(
    tenantId: string,
    metric: string,
    interval: 'hour' | 'day' | 'week' | 'month',
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ timestamp: Date; value: number }>> {
    const intervalMap = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };

    const bucketSize = intervalMap[interval];
    const buckets: { [key: string]: number } = {};

    // Initialize buckets
    for (
      let timestamp = startDate.getTime();
      timestamp <= endDate.getTime();
      timestamp += bucketSize
    ) {
      buckets[new Date(timestamp).toISOString()] = 0;
    }

    // Fill buckets based on metric
    const data = await this.getMetricData(tenantId, metric, startDate, endDate);
    data.forEach(item => {
      const bucketTimestamp = new Date(
        Math.floor(item.timestamp.getTime() / bucketSize) * bucketSize
      );
      buckets[bucketTimestamp.toISOString()] += item.value;
    });

    return Object.entries(buckets).map(([timestamp, value]) => ({
      timestamp: new Date(timestamp),
      value,
    }));
  }

  private async getMetricData(
    tenantId: string,
    metric: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ timestamp: Date; value: number }>> {
    const whereClause = {
      tenantId,
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };

    switch (metric) {
      case 'asset_views':
        return this.prisma.assetView.groupBy({
          by: ['timestamp'],
          where: whereClause,
          _count: true,
        }).then(data =>
          data.map(d => ({
            timestamp: d.timestamp,
            value: d._count,
          }))
        );

      case 'ai_generations':
        return this.prisma.aiGeneration.groupBy({
          by: ['timestamp'],
          where: whereClause,
          _count: true,
        }).then(data =>
          data.map(d => ({
            timestamp: d.timestamp,
            value: d._count,
          }))
        );

      case 'ai_costs':
        return this.prisma.aiUsage.groupBy({
          by: ['timestamp'],
          where: whereClause,
          _sum: {
            credits: true,
          },
        }).then(data =>
          data.map(d => ({
            timestamp: d.timestamp,
            value: d._sum.credits || 0,
          }))
        );

      case 'active_users':
        return this.prisma.userPresence.groupBy({
          by: ['timestamp'],
          where: {
            ...whereClause,
            status: 'online',
          },
          _count: true,
        }).then(data =>
          data.map(d => ({
            timestamp: d.timestamp,
            value: d._count,
          }))
        );

      default:
        throw new Error(`Unsupported metric: ${metric}`);
    }
  }
}
