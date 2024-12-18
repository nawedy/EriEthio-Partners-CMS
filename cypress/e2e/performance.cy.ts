describe('Performance Tests', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password123');
  });

  const pages = [
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/assets', name: 'Assets' },
    { path: '/analytics', name: 'Analytics' },
    { path: '/settings', name: 'Settings' },
  ];

  pages.forEach(page => {
    it(`should meet performance metrics for ${page.name} page`, () => {
      cy.visit(page.path);
      cy.lighthouse({
        performance: 85,
        accessibility: 100,
        'best-practices': 85,
        seo: 85,
        pwa: 100,
      });
    });
  });

  it('should handle large asset lists efficiently', () => {
    cy.intercept('GET', '/api/assets*', {
      body: Array(1000).fill(null).map((_, i) => ({
        id: `asset-${i}`,
        name: `Asset ${i}`,
        type: 'image',
        size: 1024,
        createdAt: new Date().toISOString(),
      })),
    }).as('getAssets');

    cy.visit('/assets');
    cy.wait('@getAssets');

    // Check initial render time
    cy.window().then(win => {
      const timing = win.performance.timing;
      const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
      expect(pageLoadTime).to.be.lessThan(3000);
    });

    // Check scroll performance
    cy.findByRole('list', { name: /assets/i }).within(() => {
      let lastScrollTime = Date.now();
      cy.scrollTo('bottom', { duration: 1000 }).then(() => {
        const scrollTime = Date.now() - lastScrollTime;
        expect(scrollTime).to.be.lessThan(1000);
      });
    });
  });

  it('should optimize image loading', () => {
    cy.intercept('GET', '/api/assets*', {
      body: Array(20).fill(null).map((_, i) => ({
        id: `image-${i}`,
        name: `Image ${i}`,
        type: 'image',
        url: `https://example.com/image-${i}.jpg`,
      })),
    }).as('getImages');

    cy.visit('/assets');
    cy.wait('@getImages');

    // Check if images are lazy loaded
    cy.get('img').each($img => {
      expect($img).to.have.attr('loading', 'lazy');
    });

    // Check if images have srcset for responsive loading
    cy.get('img').each($img => {
      expect($img).to.have.attr('srcset');
    });
  });

  it('should handle real-time updates efficiently', () => {
    const assetName = `Performance Test Asset ${Date.now()}`;
    cy.createAsset('text', assetName).then(assetId => {
      cy.visit(`/assets/${assetId}`);
      
      // Measure typing performance
      const text = 'Performance test '.repeat(100);
      const startTime = Date.now();
      
      cy.findByRole('textbox')
        .type(text, { delay: 0 })
        .then(() => {
          const typeTime = Date.now() - startTime;
          expect(typeTime).to.be.lessThan(1000);
        });

      // Check collaboration sync time
      cy.window().then(win => {
        const syncStart = Date.now();
        win.dispatchEvent(new CustomEvent('sync-required'));
        cy.get('[data-testid="sync-status"]').should('have.text', 'Synced').then(() => {
          const syncTime = Date.now() - syncStart;
          expect(syncTime).to.be.lessThan(500);
        });
      });

      cy.deleteAsset(assetId);
    });
  });

  it('should optimize AI operations', () => {
    const assetName = `AI Performance Test ${Date.now()}`;
    cy.createAsset('text', assetName).then(assetId => {
      cy.visit(`/assets/${assetId}`);
      
      // Measure AI generation time
      const startTime = Date.now();
      cy.generateAIContent('Write a short blog post', 'gpt-4').then(() => {
        const generateTime = Date.now() - startTime;
        expect(generateTime).to.be.lessThan(5000);
      });

      // Check streaming performance
      cy.window().then(win => {
        const streamStart = Date.now();
        cy.get('[data-testid="stream-content"]').should('not.be.empty').then(() => {
          const streamTime = Date.now() - streamStart;
          expect(streamTime).to.be.lessThan(100);
        });
      });

      cy.deleteAsset(assetId);
    });
  });

  it('should handle version control operations efficiently', () => {
    const assetName = `Version Performance Test ${Date.now()}`;
    cy.createAsset('text', assetName).then(assetId => {
      cy.visit(`/assets/${assetId}`);
      
      // Create multiple versions
      const versions = Array(10).fill('Version content ');
      const startTime = Date.now();
      
      versions.forEach((content, i) => {
        cy.findByRole('textbox').clear().type(`${content} ${i}`);
        cy.findByRole('button', { name: /save/i }).click();
      });

      // Check version list loading time
      cy.findByRole('button', { name: /version history/i }).click();
      cy.findByRole('list', { name: /versions/i }).should('exist').then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(2000);
      });

      // Check version diff performance
      const diffStart = Date.now();
      cy.findByRole('button', { name: /compare/i }).first().click();
      cy.get('[data-testid="version-diff"]').should('exist').then(() => {
        const diffTime = Date.now() - diffStart;
        expect(diffTime).to.be.lessThan(500);
      });

      cy.deleteAsset(assetId);
    });
  });
});
