describe('Analytics Dashboard', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password123');
    cy.visit('/analytics');
  });

  it('should display usage metrics', () => {
    cy.findByTestId('usage-metrics').within(() => {
      cy.findByText(/total assets/i).should('exist');
      cy.findByText(/total users/i).should('exist');
      cy.findByText(/storage used/i).should('exist');
      cy.findByText(/ai credits used/i).should('exist');
    });
  });

  it('should show asset analytics', () => {
    cy.findByRole('tab', { name: /asset analytics/i }).click();
    cy.findByTestId('asset-analytics').within(() => {
      cy.findByText(/most viewed/i).should('exist');
      cy.findByText(/most edited/i).should('exist');
      cy.findByText(/popular tags/i).should('exist');
    });
  });

  it('should display AI metrics', () => {
    cy.findByRole('tab', { name: /ai analytics/i }).click();
    cy.findByTestId('ai-analytics').within(() => {
      cy.findByText(/total generations/i).should('exist');
      cy.findByText(/success rate/i).should('exist');
      cy.findByText(/average latency/i).should('exist');
      cy.findByText(/cost per model/i).should('exist');
    });
  });

  it('should show collaboration metrics', () => {
    cy.findByRole('tab', { name: /collaboration/i }).click();
    cy.findByTestId('collaboration-analytics').within(() => {
      cy.findByText(/active sessions/i).should('exist');
      cy.findByText(/concurrent users/i).should('exist');
      cy.findByText(/average session duration/i).should('exist');
    });
  });

  it('should generate insights', () => {
    cy.findByRole('button', { name: /generate insights/i }).click();
    cy.findByTestId('insights-panel').within(() => {
      cy.findByText(/insights/i).should('exist');
      cy.findByRole('list', { name: /recommendations/i })
        .findByRole('listitem')
        .should('have.length.at.least', 1);
    });
  });

  it('should export analytics data', () => {
    cy.findByRole('button', { name: /export data/i }).click();
    cy.findByRole('menu').within(() => {
      cy.findByRole('menuitem', { name: /export as csv/i }).click();
    });
    // Verify download
    cy.readFile('cypress/downloads/analytics.csv').should('exist');
  });

  it('should check performance', () => {
    cy.checkPerformance();
  });
});
