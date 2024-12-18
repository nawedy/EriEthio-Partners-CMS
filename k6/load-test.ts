import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const assetLoadTime = new Trend('asset_load_time');
const aiGenerationTime = new Trend('ai_generation_time');
const versionCompareTime = new Trend('version_compare_time');

export const options = {
  scenarios: {
    // Smoke test
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { test_type: 'smoke' },
    },
    // Load test
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 50 },  // Ramp up
        { duration: '10m', target: 50 }, // Stay at peak
        { duration: '5m', target: 0 },   // Ramp down
      ],
      tags: { test_type: 'load' },
    },
    // Stress test
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '3m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'stress' },
    },
    // Spike test
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 500 },
        { duration: '1m', target: 500 },
        { duration: '10s', target: 0 },
      ],
      tags: { test_type: 'spike' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% of requests should fail
    errors: ['rate<0.05'],            // Less than 5% error rate
    asset_load_time: ['p(95)<1000'],  // 95% of asset loads should be under 1s
    ai_generation_time: ['p(95)<5000'], // 95% of AI generations under 5s
    version_compare_time: ['p(95)<2000'], // 95% of version comparisons under 2s
  },
};

// Simulated user behavior
export default function() {
  const baseUrl = 'http://localhost:3000/api';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAuthToken()}`,
  };

  group('authentication', () => {
    const loginRes = http.post(`${baseUrl}/auth/login`, JSON.stringify({
      email: 'test@example.com',
      password: 'password123',
    }), { headers });

    check(loginRes, {
      'login successful': (r) => r.status === 200,
      'has token': (r) => r.json('token') !== undefined,
    }) || errorRate.add(1);
  });

  group('asset management', () => {
    // List assets
    const startTime = new Date();
    const assetsRes = http.get(`${baseUrl}/assets`, { headers });
    assetLoadTime.add(new Date() - startTime);

    check(assetsRes, {
      'assets retrieved': (r) => r.status === 200,
      'has items': (r) => r.json('items') !== undefined,
    }) || errorRate.add(1);

    // Create asset
    const createRes = http.post(`${baseUrl}/assets`, JSON.stringify({
      type: 'text',
      name: `Load Test Asset ${Date.now()}`,
    }), { headers });

    check(createRes, {
      'asset created': (r) => r.status === 200,
      'has id': (r) => r.json('id') !== undefined,
    }) || errorRate.add(1);

    if (createRes.status === 200) {
      const assetId = createRes.json('id');

      // Update asset
      const updateRes = http.put(`${baseUrl}/assets/${assetId}`, JSON.stringify({
        name: 'Updated Asset',
      }), { headers });

      check(updateRes, {
        'asset updated': (r) => r.status === 200,
      }) || errorRate.add(1);

      // Delete asset
      const deleteRes = http.del(`${baseUrl}/assets/${assetId}`, null, { headers });
      check(deleteRes, {
        'asset deleted': (r) => r.status === 200,
      }) || errorRate.add(1);
    }
  });

  group('ai operations', () => {
    // Generate text
    const startTime = new Date();
    const generateRes = http.post(`${baseUrl}/ai/generate`, JSON.stringify({
      prompt: 'Write a test prompt',
      model: 'gpt-4',
    }), { headers });
    aiGenerationTime.add(new Date() - startTime);

    check(generateRes, {
      'generation successful': (r) => r.status === 200,
      'has result': (r) => r.json('result') !== undefined,
    }) || errorRate.add(1);

    // Generate image
    const imageRes = http.post(`${baseUrl}/ai/generate-image`, JSON.stringify({
      prompt: 'A test image',
      model: 'dall-e-3',
    }), { headers });

    check(imageRes, {
      'image generation successful': (r) => r.status === 200,
      'has url': (r) => r.json('url') !== undefined,
    }) || errorRate.add(1);
  });

  group('version control', () => {
    // Create test asset
    const assetRes = http.post(`${baseUrl}/assets`, JSON.stringify({
      type: 'text',
      name: `Version Test Asset ${Date.now()}`,
    }), { headers });

    if (assetRes.status === 200) {
      const assetId = assetRes.json('id');

      // Create version
      const versionRes = http.post(`${baseUrl}/versions/${assetId}`, JSON.stringify({
        changes: [{ type: 'add', path: '/test.txt', content: 'test' }],
      }), { headers });

      check(versionRes, {
        'version created': (r) => r.status === 200,
        'has version id': (r) => r.json('id') !== undefined,
      }) || errorRate.add(1);

      if (versionRes.status === 200) {
        const versionId = versionRes.json('id');

        // Compare versions
        const startTime = new Date();
        const compareRes = http.get(
          `${baseUrl}/versions/compare?version1=${versionId}&version2=latest`,
          { headers }
        );
        versionCompareTime.add(new Date() - startTime);

        check(compareRes, {
          'version comparison successful': (r) => r.status === 200,
          'has changes': (r) => r.json('changes') !== undefined,
        }) || errorRate.add(1);
      }

      // Clean up
      http.del(`${baseUrl}/assets/${assetId}`, null, { headers });
    }
  });

  group('analytics', () => {
    // Get usage metrics
    const usageRes = http.get(`${baseUrl}/analytics/usage`, { headers });
    check(usageRes, {
      'usage metrics retrieved': (r) => r.status === 200,
      'has total assets': (r) => r.json('totalAssets') !== undefined,
    }) || errorRate.add(1);

    // Get AI metrics
    const aiRes = http.get(`${baseUrl}/analytics/ai`, { headers });
    check(aiRes, {
      'ai metrics retrieved': (r) => r.status === 200,
      'has total generations': (r) => r.json('totalGenerations') !== undefined,
    }) || errorRate.add(1);

    // Generate insights
    const insightsRes = http.post(`${baseUrl}/analytics/insights`, null, { headers });
    check(insightsRes, {
      'insights generated': (r) => r.status === 200,
      'has recommendations': (r) => r.json()[0].recommendations !== undefined,
    }) || errorRate.add(1);
  });

  sleep(1);
}

// Helper function to get auth token
function getAuthToken() {
  const loginRes = http.post('http://localhost:3000/api/auth/login', JSON.stringify({
    email: 'test@example.com',
    password: 'password123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status === 200) {
    return loginRes.json('token');
  }
  throw new Error('Failed to get auth token');
}
