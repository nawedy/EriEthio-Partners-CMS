import { rest } from 'msw';

export const handlers = [
  // Auth endpoints
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
        },
        token: 'mock-jwt-token',
      })
    );
  }),

  // Asset endpoints
  rest.get('/api/assets', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        assets: [
          {
            id: '1',
            name: 'Test Asset',
            type: 'image/png',
            url: 'https://example.com/test.png',
            size: 1024,
            createdAt: new Date().toISOString(),
          },
        ],
      })
    );
  }),

  rest.post('/api/assets/generate-image', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        url: 'https://example.com/generated.png',
        prompt: 'test prompt',
      })
    );
  }),

  // Version endpoints
  rest.get('/api/versions/:assetId', (req, res, ctx) => {
    const { assetId } = req.params;
    return res(
      ctx.status(200),
      ctx.json({
        versions: [
          {
            id: '1',
            assetId,
            userId: '1',
            timestamp: new Date().toISOString(),
            changes: [],
            tags: ['latest'],
          },
        ],
      })
    );
  }),

  // Analytics endpoints
  rest.get('/api/analytics/usage', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        totalAssets: 100,
        totalUsers: 50,
        activeUsers: 25,
        storageUsed: 1024 * 1024 * 100, // 100MB
        aiCreditsUsed: 1000,
      })
    );
  }),

  // AI endpoints
  rest.post('/api/ai/generate', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        result: 'Generated content',
        model: 'gpt-4',
        usage: {
          prompt_tokens: 100,
          completion_tokens: 150,
          total_tokens: 250,
        },
      })
    );
  }),

  // Collaboration endpoints
  rest.get('/api/collaboration/sessions/:sessionId', (req, res, ctx) => {
    const { sessionId } = req.params;
    return res(
      ctx.status(200),
      ctx.json({
        id: sessionId,
        users: [
          {
            id: '1',
            name: 'Test User',
            cursor: { x: 0, y: 0 },
          },
        ],
        lastModified: new Date().toISOString(),
      })
    );
  }),

  // Error handling
  rest.get('/api/error', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({
        error: 'Internal Server Error',
      })
    );
  }),

  rest.get('/api/unauthorized', (req, res, ctx) => {
    return res(
      ctx.status(401),
      ctx.json({
        error: 'Unauthorized',
      })
    );
  }),
];
