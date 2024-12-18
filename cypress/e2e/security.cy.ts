describe('Security Tests', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password123');
  });

  describe('Authentication Security', () => {
    it('should prevent brute force attacks', () => {
      const attempts = Array(5).fill(null);
      cy.wrap(attempts).each(() => {
        cy.request({
          method: 'POST',
          url: '/api/auth/login',
          body: {
            email: 'test@example.com',
            password: 'wrongpassword',
          },
          failOnStatusCode: false,
        }).then(response => {
          expect(response.status).to.eq(401);
        });
      });

      // Should be rate limited after multiple attempts
      cy.request({
        method: 'POST',
        url: '/api/auth/login',
        body: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
        failOnStatusCode: false,
      }).then(response => {
        expect(response.status).to.eq(429);
      });
    });

    it('should enforce password complexity', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/register',
        body: {
          email: 'test2@example.com',
          password: 'weak',
          name: 'Test User',
        },
        failOnStatusCode: false,
      }).then(response => {
        expect(response.status).to.eq(400);
        expect(response.body.error).to.contain('password requirements');
      });
    });

    it('should handle session expiration', () => {
      cy.clock();
      cy.login('test@example.com', 'password123');
      
      // Advance time by 24 hours
      cy.tick(24 * 60 * 60 * 1000);
      
      cy.request({
        method: 'GET',
        url: '/api/auth/session',
        failOnStatusCode: false,
      }).then(response => {
        expect(response.status).to.eq(401);
      });
    });
  });

  describe('Input Validation', () => {
    it('should prevent XSS attacks', () => {
      const xssPayload = '<script>alert("xss")</script>';
      
      cy.request({
        method: 'POST',
        url: '/api/assets',
        headers: { 'Content-Type': 'application/json' },
        body: {
          name: xssPayload,
          type: 'text',
        },
        failOnStatusCode: false,
      }).then(response => {
        expect(response.status).to.eq(400);
      });
    });

    it('should prevent SQL injection', () => {
      const sqlPayload = "' OR '1'='1";
      
      cy.request({
        method: 'GET',
        url: `/api/assets?search=${sqlPayload}`,
        failOnStatusCode: false,
      }).then(response => {
        expect(response.status).to.eq(400);
      });
    });

    it('should validate file uploads', () => {
      const maliciousFile = {
        name: '../../../etc/passwd',
        content: 'malicious content',
      };

      cy.request({
        method: 'POST',
        url: '/api/assets/upload',
        body: maliciousFile,
        failOnStatusCode: false,
      }).then(response => {
        expect(response.status).to.eq(400);
      });
    });
  });

  describe('Authorization', () => {
    it('should enforce resource access control', () => {
      // Create an asset as user 1
      cy.login('user1@example.com', 'password123');
      cy.request('POST', '/api/assets', {
        type: 'text',
        name: 'Private Asset',
      }).then(response => {
        const assetId = response.body.id;

        // Try to access as user 2
        cy.login('user2@example.com', 'password123');
        cy.request({
          method: 'GET',
          url: `/api/assets/${assetId}`,
          failOnStatusCode: false,
        }).then(response => {
          expect(response.status).to.eq(403);
        });
      });
    });

    it('should enforce role-based access control', () => {
      cy.login('regular@example.com', 'password123');
      
      // Try to access admin endpoints
      cy.request({
        method: 'GET',
        url: '/api/admin/users',
        failOnStatusCode: false,
      }).then(response => {
        expect(response.status).to.eq(403);
      });
    });
  });

  describe('API Security', () => {
    it('should require CSRF tokens', () => {
      cy.request({
        method: 'POST',
        url: '/api/assets',
        headers: {
          'X-CSRF-Token': 'invalid',
        },
        body: {
          type: 'text',
          name: 'Test Asset',
        },
        failOnStatusCode: false,
      }).then(response => {
        expect(response.status).to.eq(403);
      });
    });

    it('should validate content types', () => {
      cy.request({
        method: 'POST',
        url: '/api/assets',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: 'invalid body',
        failOnStatusCode: false,
      }).then(response => {
        expect(response.status).to.eq(415);
      });
    });

    it('should prevent parameter pollution', () => {
      cy.request({
        method: 'GET',
        url: '/api/assets?sort=asc&sort=desc',
        failOnStatusCode: false,
      }).then(response => {
        expect(response.status).to.eq(400);
      });
    });
  });

  describe('Data Protection', () => {
    it('should redact sensitive information', () => {
      cy.request('GET', '/api/user/profile').then(response => {
        expect(response.body).not.to.have.property('password');
        expect(response.body).not.to.have.property('passwordHash');
      });
    });

    it('should enforce secure communication', () => {
      cy.request({
        method: 'GET',
        url: 'http://localhost:3000/api/assets',
        failOnStatusCode: false,
      }).then(response => {
        expect(response.status).to.eq(301);
      });
    });
  });

  describe('Error Handling', () => {
    it('should not expose stack traces', () => {
      cy.request({
        method: 'GET',
        url: '/api/error-test',
        failOnStatusCode: false,
      }).then(response => {
        expect(response.status).to.eq(500);
        expect(response.body).not.to.have.property('stack');
        expect(response.body).not.to.have.property('trace');
      });
    });

    it('should sanitize error messages', () => {
      cy.request({
        method: 'POST',
        url: '/api/assets',
        body: { invalid: 'data' },
        failOnStatusCode: false,
      }).then(response => {
        expect(response.body.error).not.to.contain('SQL');
        expect(response.body.error).not.to.contain('prisma');
      });
    });
  });
});
