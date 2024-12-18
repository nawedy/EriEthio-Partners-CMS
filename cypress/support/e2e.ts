import '@cypress/code-coverage/support';
import '@testing-library/cypress/add-commands';
import { addMatchImageSnapshotCommand } from 'cypress-image-snapshot/command';
import 'cypress-axe';
import './commands';

addMatchImageSnapshotCommand({
  failureThreshold: 0.03,
  failureThresholdType: 'percent',
  customDiffConfig: { threshold: 0.1 },
  capture: 'viewport',
});

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
      createAsset(type: string, name: string): Chainable<string>;
      deleteAsset(id: string): Chainable<void>;
      generateAIContent(prompt: string, model: string): Chainable<string>;
      waitForOperation(operationId: string): Chainable<void>;
      checkPerformance(): Chainable<void>;
      matchImageSnapshot(name?: string, options?: object): Chainable<void>;
      compareSnapshot(name: string, options?: object): Chainable<void>;
      checkA11y(
        context?: string | Node,
        options?: object,
        violationCallback?: (violations: any[]) => void,
        skipFailures?: boolean
      ): Chainable<void>;
      injectAxe(): Chainable<void>;
    }
  }
}

beforeEach(() => {
  cy.intercept('POST', '/api/auth/session', {
    statusCode: 200,
    body: {
      user: {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
      },
    },
  }).as('session');
});
