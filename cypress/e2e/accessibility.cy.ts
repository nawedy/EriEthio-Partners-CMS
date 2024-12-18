describe('Accessibility Tests', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password123');
    cy.injectAxe();
  });

  const pages = [
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/assets', name: 'Assets' },
    { path: '/analytics', name: 'Analytics' },
    { path: '/settings', name: 'Settings' },
  ];

  pages.forEach(page => {
    it(`should pass accessibility checks for ${page.name} page`, () => {
      cy.visit(page.path);
      cy.wait(1000); // Wait for dynamic content
      cy.checkA11y(
        null,
        {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
          },
        },
        violations => {
          cy.task('log', `${violations.length} accessibility violations found`);
          violations.forEach(violation => {
            cy.task('log', {
              impact: violation.impact,
              description: violation.description,
              nodes: violation.nodes.length,
            });
          });
        }
      );
    });
  });

  describe('Navigation Accessibility', () => {
    it('should be keyboard navigable', () => {
      cy.visit('/dashboard');
      cy.findByRole('navigation').should('exist');
      cy.findByRole('link', { name: /assets/i }).focus();
      cy.focused().should('have.attr', 'href', '/assets');
      cy.tab().focused().should('have.attr', 'href', '/analytics');
    });

    it('should have skip links', () => {
      cy.visit('/dashboard');
      cy.findByRole('link', { name: /skip to main content/i })
        .should('exist')
        .and('have.attr', 'href', '#main-content');
    });
  });

  describe('Form Accessibility', () => {
    it('should have accessible forms', () => {
      cy.visit('/assets');
      cy.findByRole('button', { name: /create asset/i }).click();
      
      // Check form labeling
      cy.findByRole('dialog').within(() => {
        cy.findByLabelText(/asset name/i).should('exist');
        cy.findByLabelText(/asset type/i).should('exist');
        cy.findByRole('button', { name: /create/i }).should('exist');
      });

      // Check form validation
      cy.findByRole('button', { name: /create/i }).click();
      cy.findByText(/name is required/i).should('exist');
      cy.checkA11y();
    });

    it('should handle error states accessibly', () => {
      cy.visit('/assets');
      cy.findByRole('button', { name: /create asset/i }).click();
      
      cy.findByLabelText(/asset name/i).type('a'); // Too short
      cy.findByRole('button', { name: /create/i }).click();
      
      cy.findByRole('alert').within(() => {
        cy.findByText(/name must be at least/i).should('exist');
      });
      
      cy.checkA11y();
    });
  });

  describe('Dynamic Content Accessibility', () => {
    it('should handle loading states accessibly', () => {
      cy.intercept('GET', '/api/assets*', (req) => {
        req.on('response', (res) => {
          res.setDelay(2000);
        });
      });

      cy.visit('/assets');
      cy.findByRole('progressbar').should('exist');
      cy.findByText(/loading assets/i).should('exist');
      cy.checkA11y();
    });

    it('should handle modals accessibly', () => {
      cy.visit('/assets');
      cy.findByRole('button', { name: /create asset/i }).click();
      
      cy.findByRole('dialog').within(() => {
        cy.findByRole('heading', { name: /create asset/i }).should('exist');
        cy.findByRole('button', { name: /close/i }).should('exist');
      });

      // Test focus trap
      cy.focused().tab().tab().tab().focused()
        .should('have.attr', 'aria-label', 'close');
      
      cy.checkA11y();
    });
  });

  describe('Color and Contrast', () => {
    it('should maintain contrast in light theme', () => {
      cy.visit('/dashboard');
      cy.checkA11y(null, {
        runOnly: {
          type: 'tag',
          values: ['wcag2aa'],
        },
        rules: {
          'color-contrast': { enabled: true },
        },
      });
    });

    it('should maintain contrast in dark theme', () => {
      cy.visit('/dashboard');
      cy.findByRole('button', { name: /theme/i }).click();
      cy.checkA11y(null, {
        runOnly: {
          type: 'tag',
          values: ['wcag2aa'],
        },
        rules: {
          'color-contrast': { enabled: true },
        },
      });
    });
  });

  describe('Interactive Elements', () => {
    it('should have accessible buttons and controls', () => {
      cy.visit('/assets');
      
      // Check button labeling
      cy.findAllByRole('button').each($button => {
        cy.wrap($button).should('have.attr', 'aria-label')
          .or('not.be.empty');
      });

      // Check interactive elements
      cy.findByRole('searchbox').should('have.attr', 'aria-label');
      cy.findByRole('combobox', { name: /filter/i }).should('exist');
      
      cy.checkA11y();
    });

    it('should handle tooltips accessibly', () => {
      cy.visit('/assets');
      
      cy.findByRole('button', { name: /help/i })
        .should('have.attr', 'aria-describedby')
        .focus();
      
      cy.findByRole('tooltip').should('be.visible')
        .and('have.attr', 'role', 'tooltip');
      
      cy.checkA11y();
    });
  });

  describe('Content Structure', () => {
    it('should have proper heading hierarchy', () => {
      cy.visit('/dashboard');
      
      // Check heading levels
      cy.get('h1').should('have.length', 1);
      cy.get('h2, h3, h4, h5, h6').each(($heading, index, $headings) => {
        const level = parseInt($heading.prop('tagName').slice(1));
        if (index > 0) {
          const prevLevel = parseInt($headings.eq(index - 1).prop('tagName').slice(1));
          expect(level - prevLevel).to.be.lessThan(2);
        }
      });
    });

    it('should have proper landmarks', () => {
      cy.visit('/dashboard');
      
      cy.findByRole('banner').should('exist');
      cy.findByRole('navigation').should('exist');
      cy.findByRole('main').should('exist');
      cy.findByRole('contentinfo').should('exist');
    });
  });

  describe('Dynamic Updates', () => {
    it('should announce status changes', () => {
      cy.visit('/assets');
      
      cy.findByRole('button', { name: /create asset/i }).click();
      cy.findByLabelText(/asset name/i).type('Test Asset');
      cy.findByRole('button', { name: /create/i }).click();
      
      cy.findByRole('alert')
        .should('exist')
        .and('have.attr', 'aria-live', 'polite');
    });

    it('should handle async content updates accessibly', () => {
      cy.visit('/analytics');
      
      cy.findByRole('button', { name: /generate insights/i }).click();
      cy.findByRole('status')
        .should('exist')
        .and('have.attr', 'aria-live', 'polite');
      
      cy.findByRole('region', { name: /insights/i })
        .should('exist')
        .and('have.attr', 'aria-busy', 'true');
    });
  });
});
