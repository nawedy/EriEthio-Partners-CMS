import { AnalyticsManager } from '../AnalyticsManager';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    asset: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
    assetView: {
      count: jest.fn(),
      groupBy: jest.fn(),
      create: jest.fn(),
    },
    assetEdit: {
      aggregate: jest.fn(),
      create: jest.fn(),
    },
    assetTag: {
      groupBy: jest.fn(),
    },
    assetCollaborator: {
      count: jest.fn(),
    },
    aiGeneration: {
      count: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
    },
    aiUsage: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      create: jest.fn(),
    },
    collaborationSession: {
      count: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
    },
    userPresence: {
      create: jest.fn(),
      groupBy: jest.fn(),
    },
  })),
}));

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
}));

describe('AnalyticsManager', () => {
  let analyticsManager: AnalyticsManager;
  let prisma: jest.Mocked<PrismaClient>;
  let openai: jest.Mocked<OpenAI>;

  beforeEach(() => {
    prisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    openai = new OpenAI({ apiKey: 'test-key' }) as jest.Mocked<OpenAI>;
    analyticsManager = new AnalyticsManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsageMetrics', () => {
    it('should return correct usage metrics', async () => {
      const mockCounts = {
        assets: 100,
        users: 50,
        activeUsers: 25,
      };

      const mockStorage = {
        _sum: { size: 1024 * 1024 * 100 }, // 100MB
      };

      const mockAIUsage = {
        _sum: { credits: 1000 },
      };

      (prisma.asset.count as jest.Mock).mockResolvedValue(mockCounts.assets);
      (prisma.user.count as jest.Mock)
        .mockResolvedValueOnce(mockCounts.users)
        .mockResolvedValueOnce(mockCounts.activeUsers);
      (prisma.asset.aggregate as jest.Mock).mockResolvedValue(mockStorage);
      (prisma.aiUsage.aggregate as jest.Mock).mockResolvedValue(mockAIUsage);

      const metrics = await analyticsManager.getUsageMetrics('tenant-1');

      expect(metrics).toEqual({
        totalAssets: mockCounts.assets,
        totalUsers: mockCounts.users,
        activeUsers: mockCounts.activeUsers,
        storageUsed: mockStorage._sum.size,
        aiCreditsUsed: mockAIUsage._sum.credits,
      });
    });
  });

  describe('getAssetMetrics', () => {
    it('should return correct asset metrics', async () => {
      const mockData = {
        views: 1000,
        uniqueViews: 500,
        editTime: { _avg: { duration: 300 } },
        tags: [
          { tag: 'tag1', _count: 10 },
          { tag: 'tag2', _count: 5 },
        ],
        collaborators: 3,
      };

      (prisma.assetView.count as jest.Mock).mockResolvedValue(mockData.views);
      (prisma.assetView.groupBy as jest.Mock).mockResolvedValue(
        Array(mockData.uniqueViews).fill({ userId: 'user-id' })
      );
      (prisma.assetEdit.aggregate as jest.Mock).mockResolvedValue(mockData.editTime);
      (prisma.assetTag.groupBy as jest.Mock).mockResolvedValue(mockData.tags);
      (prisma.assetCollaborator.count as jest.Mock).mockResolvedValue(mockData.collaborators);

      const metrics = await analyticsManager.getAssetMetrics('asset-1');

      expect(metrics.totalViews).toBe(mockData.views);
      expect(metrics.uniqueViews).toBe(mockData.uniqueViews);
      expect(metrics.averageEditTime).toBe(mockData.editTime._avg.duration);
      expect(metrics.popularTags).toHaveLength(2);
      expect(metrics.collaborators).toBe(mockData.collaborators);
    });
  });

  describe('getAIMetrics', () => {
    it('should return correct AI metrics', async () => {
      const mockData = {
        generations: 1000,
        successCount: 900,
        latency: { _avg: { latency: 500 } },
        costs: [
          { model: 'gpt-4', _sum: { cost: 100 } },
          { model: 'dall-e-3', _sum: { cost: 200 } },
        ],
        prompts: [
          { prompt: 'test1', _count: 50 },
          { prompt: 'test2', _count: 30 },
        ],
      };

      (prisma.aiGeneration.count as jest.Mock)
        .mockResolvedValueOnce(mockData.generations)
        .mockResolvedValueOnce(mockData.successCount);
      (prisma.aiGeneration.aggregate as jest.Mock).mockResolvedValue(mockData.latency);
      (prisma.aiUsage.groupBy as jest.Mock).mockResolvedValue(mockData.costs);
      (prisma.aiGeneration.groupBy as jest.Mock).mockResolvedValue(mockData.prompts);

      const metrics = await analyticsManager.getAIMetrics('tenant-1');

      expect(metrics.totalGenerations).toBe(mockData.generations);
      expect(metrics.successRate).toBe(0.9); // 900/1000
      expect(metrics.averageLatency).toBe(mockData.latency._avg.latency);
      expect(metrics.costPerModel).toHaveLength(2);
      expect(metrics.popularPrompts).toHaveLength(2);
    });
  });

  describe('generateInsights', () => {
    it('should generate insights using GPT-4', async () => {
      const mockInsights = {
        insights: [
          {
            key: 'high-usage',
            title: 'High AI Usage',
            description: 'AI usage has increased significantly',
            impact: 'high',
            recommendations: ['Optimize prompts', 'Implement caching'],
          },
        ],
      };

      (openai.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              function_call: {
                arguments: JSON.stringify(mockInsights),
              },
            },
          },
        ],
      });

      const insights = await analyticsManager.generateInsights('tenant-1');

      expect(insights).toHaveLength(1);
      expect(insights[0].key).toBe('high-usage');
      expect(insights[0].recommendations).toHaveLength(2);
    });
  });

  describe('tracking methods', () => {
    it('should track asset view', async () => {
      await analyticsManager.trackAssetView('asset-1', 'user-1');

      expect(prisma.assetView.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          assetId: 'asset-1',
          userId: 'user-1',
        }),
      });
    });

    it('should track AI generation', async () => {
      await analyticsManager.trackAIGeneration(
        'tenant-1',
        'gpt-4',
        'test prompt',
        'success',
        500,
        0.1
      );

      expect(prisma.aiGeneration.create).toHaveBeenCalled();
      expect(prisma.aiUsage.create).toHaveBeenCalled();
    });

    it('should track collaboration session', async () => {
      await analyticsManager.trackCollaborationSession(
        'tenant-1',
        'session-1',
        300,
        3
      );

      expect(prisma.collaborationSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          sessionId: 'session-1',
          duration: 300,
          userCount: 3,
        }),
      });
    });
  });

  describe('time series data', () => {
    it('should return correct time series data', async () => {
      const mockData = [
        { timestamp: new Date(), _count: 10 },
        { timestamp: new Date(), _count: 15 },
      ];

      (prisma.assetView.groupBy as jest.Mock).mockResolvedValue(mockData);

      const data = await analyticsManager.getTimeSeriesData(
        'tenant-1',
        'asset_views',
        'day',
        new Date(),
        new Date()
      );

      expect(data).toHaveLength(mockData.length);
      expect(data[0]).toHaveProperty('timestamp');
      expect(data[0]).toHaveProperty('value');
    });

    it('should handle invalid metric', async () => {
      await expect(
        analyticsManager.getTimeSeriesData(
          'tenant-1',
          'invalid_metric',
          'day',
          new Date(),
          new Date()
        )
      ).rejects.toThrow('Unsupported metric');
    });
  });
});
