describe('Authentication', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should login successfully', () => {
    cy.login('test@example.com', 'password123');
    cy.url().should('equal', `${Cypress.config().baseUrl}/dashboard`);
    cy.findByRole('heading', { name: /dashboard/i }).should('exist');
  });

  it('should show error for invalid credentials', () => {
    cy.login('invalid@example.com', 'wrongpassword');
    cy.findByText(/invalid credentials/i).should('exist');
    cy.url().should('include', '/login');
  });

  it('should logout successfully', () => {
    cy.login('test@example.com', 'password123');
    cy.logout();
    cy.url().should('include', '/login');
  });

  it('should redirect to login for protected routes', () => {
    cy.visit('/dashboard');
    cy.url().should('include', '/login');
    cy.findByText(/sign in to your account/i).should('exist');
  });
});
