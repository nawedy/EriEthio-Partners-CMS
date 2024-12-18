describe('API Integration Tests', () => {
  let authToken: string;

  before(() => {
    // Get auth token
    cy.request('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: 'password123',
    }).then(response => {
      authToken = response.body.token;
    });
  });

  describe('Authentication API', () => {
    it('should handle login', () => {
      cy.request('POST', '/api/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      }).then(response => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('token');
        expect(response.body).to.have.property('user');
      });
    });

    it('should handle invalid credentials', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/login',
        body: {
          email: 'wrong@example.com',
          password: 'wrongpass',
        },
        failOnStatusCode: false,
      }).then(response => {
        expect(response.status).to.eq(401);
        expect(response.body).to.have.property('error');
      });
    });

    it('should handle session validation', () => {
      cy.request({
        method: 'GET',
        url: '/api/auth/session',
        headers: { Authorization: `Bearer ${authToken}` },
      }).then(response => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('user');
      });
    });
  });

  describe('Asset API', () => {
    let assetId: string;

    beforeEach(() => {
      // Create test asset
      cy.request({
        method: 'POST',
        url: '/api/assets',
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          type: 'text',
          name: `API Test Asset ${Date.now()}`,
        },
      }).then(response => {
        assetId = response.body.id;
      });
    });

    afterEach(() => {
      // Clean up test asset
      if (assetId) {
        cy.request({
          method: 'DELETE',
          url: `/api/assets/${assetId}`,
          headers: { Authorization: `Bearer ${authToken}` },
        });
      }
    });

    it('should handle asset creation', () => {
      cy.request({
        method: 'POST',
        url: '/api/assets',
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          type: 'image',
          name: 'Test Image',
        },
      }).then(response => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('id');
        expect(response.body.type).to.eq('image');
      });
    });

    it('should handle asset retrieval', () => {
      cy.request({
        method: 'GET',
        url: `/api/assets/${assetId}`,
        headers: { Authorization: `Bearer ${authToken}` },
      }).then(response => {
        expect(response.status).to.eq(200);
        expect(response.body.id).to.eq(assetId);
      });
    });

    it('should handle asset update', () => {
      cy.request({
        method: 'PUT',
        url: `/api/assets/${assetId}`,
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          name: 'Updated Name',
          metadata: { key: 'value' },
        },
      }).then(response => {
        expect(response.status).to.eq(200);
        expect(response.body.name).to.eq('Updated Name');
      });
    });

    it('should handle asset list with filters', () => {
      cy.request({
        method: 'GET',
        url: '/api/assets',
        headers: { Authorization: `Bearer ${authToken}` },
        qs: {
          type: 'text',
          page: 1,
          limit: 10,
        },
      }).then(response => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('items');
        expect(response.body).to.have.property('total');
      });
    });
  });

  describe('AI API', () => {
    it('should handle text generation', () => {
      cy.request({
        method: 'POST',
        url: '/api/ai/generate',
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          prompt: 'Write a test prompt',
          model: 'gpt-4',
        },
      }).then(response => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('result');
      });
    });

    it('should handle image generation', () => {
      cy.request({
        method: 'POST',
        url: '/api/ai/generate-image',
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          prompt: 'A test image',
          model: 'dall-e-3',
        },
      }).then(response => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('url');
      });
    });

    it('should handle model comparison', () => {
      cy.request({
        method: 'POST',
        url: '/api/ai/compare',
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          prompt: 'Test comparison',
          models: ['gpt-4', 'claude-2'],
        },
      }).then(response => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
        expect(response.body[0]).to.have.property('model');
        expect(response.body[0]).to.have.property('result');
      });
    });
  });

  describe('Version API', () => {
    let assetId: string;
    let versionId: string;

    beforeEach(() => {
      // Create test asset and version
      cy.request({
        method: 'POST',
        url: '/api/assets',
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          type: 'text',
          name: `Version Test Asset ${Date.now()}`,
        },
      }).then(response => {
        assetId = response.body.id;
        return cy.request({
          method: 'POST',
          url: `/api/versions/${assetId}`,
          headers: { Authorization: `Bearer ${authToken}` },
          body: {
            changes: [{ type: 'add', path: '/test.txt', content: 'test' }],
          },
        });
      }).then(response => {
        versionId = response.body.id;
      });
    });

    it('should handle version creation', () => {
      cy.request({
        method: 'POST',
        url: `/api/versions/${assetId}`,
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          changes: [{ type: 'modify', path: '/test.txt', content: 'modified' }],
        },
      }).then(response => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('id');
        expect(response.body).to.have.property('changes');
      });
    });

    it('should handle version comparison', () => {
      cy.request({
        method: 'GET',
        url: '/api/versions/compare',
        headers: { Authorization: `Bearer ${authToken}` },
        qs: {
          version1: versionId,
          version2: 'latest',
        },
      }).then(response => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('changes');
      });
    });

    it('should handle version revert', () => {
      cy.request({
        method: 'POST',
        url: `/api/versions/${assetId}/revert`,
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          versionId,
        },
      }).then(response => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('id');
      });
    });
  });

  describe('Analytics API', () => {
    it('should retrieve usage metrics', () => {
      cy.request({
        method: 'GET',
        url: '/api/analytics/usage',
        headers: { Authorization: `Bearer ${authToken}` },
      }).then(response => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('totalAssets');
        expect(response.body).to.have.property('totalUsers');
        expect(response.body).to.have.property('storageUsed');
      });
    });

    it('should retrieve AI metrics', () => {
      cy.request({
        method: 'GET',
        url: '/api/analytics/ai',
        headers: { Authorization: `Bearer ${authToken}` },
      }).then(response => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('totalGenerations');
        expect(response.body).to.have.property('successRate');
        expect(response.body).to.have.property('costPerModel');
      });
    });

    it('should generate insights', () => {
      cy.request({
        method: 'POST',
        url: '/api/analytics/insights',
        headers: { Authorization: `Bearer ${authToken}` },
      }).then(response => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
        expect(response.body[0]).to.have.property('key');
        expect(response.body[0]).to.have.property('recommendations');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limiting', () => {
      // Make multiple requests quickly
      const requests = Array(10).fill(null).map(() => 
        cy.request({
          method: 'POST',
          url: '/api/ai/generate',
          headers: { Authorization: `Bearer ${authToken}` },
          body: { prompt: 'test' },
          failOnStatusCode: false,
        })
      );

      Promise.all(requests).then(responses => {
        const rateLimited = responses.some(r => r.status === 429);
        expect(rateLimited).to.be.true;
      });
    });

    it('should handle invalid requests', () => {
      cy.request({
        method: 'POST',
        url: '/api/assets',
        headers: { Authorization: `Bearer ${authToken}` },
        body: {}, // Missing required fields
        failOnStatusCode: false,
      }).then(response => {
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('error');
      });
    });

    it('should handle server errors gracefully', () => {
      cy.request({
        method: 'GET',
        url: '/api/error-test',
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(response => {
        expect(response.status).to.eq(500);
        expect(response.body).to.have.property('error');
      });
    });
  });
});
