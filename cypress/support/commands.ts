Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.findByLabelText(/email/i).type(email);
  cy.findByLabelText(/password/i).type(password);
  cy.findByRole('button', { name: /sign in/i }).click();
  cy.url().should('not.include', '/login');
});

Cypress.Commands.add('logout', () => {
  cy.findByRole('button', { name: /user menu/i }).click();
  cy.findByRole('menuitem', { name: /sign out/i }).click();
  cy.url().should('include', '/login');
});

Cypress.Commands.add('createAsset', (type: string, name: string) => {
  cy.visit('/assets');
  cy.findByRole('button', { name: /create asset/i }).click();
  cy.findByLabelText(/asset type/i).select(type);
  cy.findByLabelText(/asset name/i).type(name);
  cy.findByRole('button', { name: /create/i }).click();
  cy.url().should('match', /\/assets\/[\w-]+$/);
  return cy.url().then(url => url.split('/').pop() as string);
});

Cypress.Commands.add('deleteAsset', (id: string) => {
  cy.visit(`/assets/${id}`);
  cy.findByRole('button', { name: /delete asset/i }).click();
  cy.findByRole('button', { name: /confirm/i }).click();
  cy.url().should('equal', `${Cypress.config().baseUrl}/assets`);
});

Cypress.Commands.add('generateAIContent', (prompt: string, model: string) => {
  cy.findByRole('button', { name: /generate content/i }).click();
  cy.findByLabelText(/prompt/i).type(prompt);
  cy.findByLabelText(/model/i).select(model);
  cy.findByRole('button', { name: /generate/i }).click();
  return cy.findByTestId('generated-content').invoke('text');
});

Cypress.Commands.add('waitForOperation', (operationId: string) => {
  const checkStatus = () => {
    return cy.request(`/api/operations/${operationId}`).then(response => {
      if (response.body.status === 'completed') {
        return;
      }
      if (response.body.status === 'failed') {
        throw new Error(`Operation ${operationId} failed: ${response.body.error}`);
      }
      cy.wait(1000);
      checkStatus();
    });
  };
  checkStatus();
});

Cypress.Commands.add('checkPerformance', () => {
  cy.lighthouse({
    performance: 85,
    accessibility: 100,
    'best-practices': 85,
    seo: 85,
    pwa: 100,
  });
});
