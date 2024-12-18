describe('Asset Management', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password123');
  });

  it('should create and delete an asset', () => {
    const assetName = `Test Asset ${Date.now()}`;
    cy.createAsset('image', assetName).then(assetId => {
      cy.findByText(assetName).should('exist');
      cy.deleteAsset(assetId);
      cy.findByText(assetName).should('not.exist');
    });
  });

  it('should edit asset metadata', () => {
    const assetName = `Test Asset ${Date.now()}`;
    cy.createAsset('document', assetName).then(assetId => {
      cy.visit(`/assets/${assetId}`);
      cy.findByRole('button', { name: /edit metadata/i }).click();
      cy.findByLabelText(/title/i).clear().type('Updated Title');
      cy.findByLabelText(/description/i).clear().type('Updated Description');
      cy.findByRole('button', { name: /save/i }).click();
      cy.findByText('Updated Title').should('exist');
      cy.findByText('Updated Description').should('exist');
      cy.deleteAsset(assetId);
    });
  });

  it('should generate AI content for asset', () => {
    const assetName = `AI Test Asset ${Date.now()}`;
    cy.createAsset('text', assetName).then(assetId => {
      cy.visit(`/assets/${assetId}`);
      cy.generateAIContent('Write a blog post about AI', 'gpt-4').then(content => {
        expect(content).to.have.length.greaterThan(0);
      });
      cy.deleteAsset(assetId);
    });
  });

  it('should handle version control', () => {
    const assetName = `Version Test Asset ${Date.now()}`;
    cy.createAsset('text', assetName).then(assetId => {
      cy.visit(`/assets/${assetId}`);
      
      // Create first version
      cy.findByRole('textbox').type('Initial content');
      cy.findByRole('button', { name: /save/i }).click();
      
      // Create second version
      cy.findByRole('textbox').clear().type('Updated content');
      cy.findByRole('button', { name: /save/i }).click();
      
      // View version history
      cy.findByRole('button', { name: /version history/i }).click();
      cy.findByRole('list', { name: /versions/i })
        .findByRole('listitem')
        .should('have.length.at.least', 2);
      
      // Revert to first version
      cy.findByRole('button', { name: /revert/i }).first().click();
      cy.findByRole('textbox').should('have.value', 'Initial content');
      
      cy.deleteAsset(assetId);
    });
  });

  it('should support real-time collaboration', () => {
    const assetName = `Collab Test Asset ${Date.now()}`;
    cy.createAsset('text', assetName).then(assetId => {
      cy.visit(`/assets/${assetId}`);
      
      // Check presence indicator
      cy.findByTestId('presence-indicator')
        .should('contain', 'Test User');
      
      // Check cursor sync
      cy.findByRole('textbox')
        .type('Collaborative content')
        .should('have.value', 'Collaborative content');
      
      cy.findByTestId('cursor-indicator')
        .should('exist');
      
      cy.deleteAsset(assetId);
    });
  });

  it('should check performance metrics', () => {
    cy.visit('/assets');
    cy.checkPerformance();
  });
});
