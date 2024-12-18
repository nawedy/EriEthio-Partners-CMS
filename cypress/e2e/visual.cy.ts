describe('Visual Regression Tests', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password123');
  });

  const viewports = [
    { width: 375, height: 667, device: 'mobile' },
    { width: 768, height: 1024, device: 'tablet' },
    { width: 1280, height: 720, device: 'desktop' },
  ];

  const pages = [
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/assets', name: 'Assets' },
    { path: '/analytics', name: 'Analytics' },
    { path: '/settings', name: 'Settings' },
  ];

  viewports.forEach(viewport => {
    context(`${viewport.device} viewport`, () => {
      beforeEach(() => {
        cy.viewport(viewport.width, viewport.height);
      });

      pages.forEach(page => {
        it(`should match ${page.name} page snapshot`, () => {
          cy.visit(page.path);
          // Wait for dynamic content to load
          cy.wait(1000);
          cy.matchImageSnapshot(`${page.name}-${viewport.device}`);
        });
      });

      it('should match asset details page snapshot', () => {
        const assetName = `Visual Test Asset ${Date.now()}`;
        cy.createAsset('image', assetName).then(assetId => {
          cy.visit(`/assets/${assetId}`);
          cy.wait(1000);
          cy.matchImageSnapshot(`asset-details-${viewport.device}`);
          cy.deleteAsset(assetId);
        });
      });

      it('should match version history snapshot', () => {
        const assetName = `Version Test Asset ${Date.now()}`;
        cy.createAsset('text', assetName).then(assetId => {
          cy.visit(`/assets/${assetId}`);
          
          // Create versions
          cy.findByRole('textbox').type('Initial content');
          cy.findByRole('button', { name: /save/i }).click();
          cy.findByRole('textbox').clear().type('Updated content');
          cy.findByRole('button', { name: /save/i }).click();
          
          cy.findByRole('button', { name: /version history/i }).click();
          cy.wait(1000);
          cy.matchImageSnapshot(`version-history-${viewport.device}`);
          
          cy.deleteAsset(assetId);
        });
      });

      it('should match analytics dashboard snapshot', () => {
        cy.visit('/analytics');
        cy.wait(2000); // Wait for charts to render
        cy.matchImageSnapshot(`analytics-dashboard-${viewport.device}`);
      });

      it('should match AI generation modal snapshot', () => {
        const assetName = `AI Test Asset ${Date.now()}`;
        cy.createAsset('text', assetName).then(assetId => {
          cy.visit(`/assets/${assetId}`);
          cy.findByRole('button', { name: /generate content/i }).click();
          cy.wait(500);
          cy.matchImageSnapshot(`ai-generation-modal-${viewport.device}`);
          cy.deleteAsset(assetId);
        });
      });

      it('should match theme variations', () => {
        cy.visit('/dashboard');
        // Light theme
        cy.matchImageSnapshot(`dashboard-light-${viewport.device}`);
        
        // Dark theme
        cy.findByRole('button', { name: /theme/i }).click();
        cy.wait(500);
        cy.matchImageSnapshot(`dashboard-dark-${viewport.device}`);
      });

      it('should match error states', () => {
        // 404 page
        cy.visit('/non-existent-page', { failOnStatusCode: false });
        cy.wait(500);
        cy.matchImageSnapshot(`404-page-${viewport.device}`);

        // Error state in asset list
        cy.intercept('GET', '/api/assets*', {
          statusCode: 500,
          body: { error: 'Internal Server Error' },
        });
        cy.visit('/assets');
        cy.wait(500);
        cy.matchImageSnapshot(`error-state-${viewport.device}`);
      });

      it('should match loading states', () => {
        cy.intercept('GET', '/api/assets*', (req) => {
          req.on('response', (res) => {
            res.setDelay(2000);
          });
        });
        cy.visit('/assets');
        cy.matchImageSnapshot(`loading-state-${viewport.device}`);
      });

      it('should match hover and focus states', () => {
        cy.visit('/assets');
        
        // Hover state
        cy.findByRole('button', { name: /create asset/i })
          .trigger('mouseover')
          .wait(200);
        cy.matchImageSnapshot(`button-hover-${viewport.device}`);

        // Focus state
        cy.findByRole('searchbox')
          .focus()
          .wait(200);
        cy.matchImageSnapshot(`search-focus-${viewport.device}`);
      });
    });
  });

  describe('Component-specific snapshots', () => {
    beforeEach(() => {
      cy.viewport(1280, 720);
    });

    it('should match dropdown menu snapshot', () => {
      cy.visit('/dashboard');
      cy.findByRole('button', { name: /user menu/i }).click();
      cy.wait(200);
      cy.matchImageSnapshot('user-menu-dropdown');
    });

    it('should match modal snapshots', () => {
      cy.visit('/assets');
      
      // Create asset modal
      cy.findByRole('button', { name: /create asset/i }).click();
      cy.wait(200);
      cy.matchImageSnapshot('create-asset-modal');

      // Delete confirmation modal
      cy.createAsset('text', 'Modal Test Asset').then(assetId => {
        cy.visit(`/assets/${assetId}`);
        cy.findByRole('button', { name: /delete asset/i }).click();
        cy.wait(200);
        cy.matchImageSnapshot('delete-confirmation-modal');
        cy.deleteAsset(assetId);
      });
    });

    it('should match form validation states', () => {
      cy.visit('/assets');
      cy.findByRole('button', { name: /create asset/i }).click();
      
      // Empty form submission
      cy.findByRole('button', { name: /create/i }).click();
      cy.wait(200);
      cy.matchImageSnapshot('form-validation-errors');

      // Invalid input
      cy.findByLabelText(/asset name/i).type('a'); // Too short
      cy.wait(200);
      cy.matchImageSnapshot('form-invalid-input');
    });

    it('should match toast notifications', () => {
      cy.visit('/assets');
      
      // Success toast
      cy.window().then(win => {
        win.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            type: 'success',
            message: 'Operation successful',
          },
        }));
      });
      cy.wait(200);
      cy.matchImageSnapshot('success-toast');

      // Error toast
      cy.window().then(win => {
        win.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            type: 'error',
            message: 'Operation failed',
          },
        }));
      });
      cy.wait(200);
      cy.matchImageSnapshot('error-toast');
    });
  });
});
