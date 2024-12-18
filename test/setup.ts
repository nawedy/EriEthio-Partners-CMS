import { WebDriver } from 'selenium-webdriver';

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): Promise<R>;
    }
  }
  
  var driver: WebDriver;
}

// Increase timeout for all tests
jest.setTimeout(30000);

// Add custom matchers
expect.extend({
  async toHaveNoViolations(received) {
    const pass = received.violations.length === 0;
    if (pass) {
      return {
        message: () => 'Expected accessibility violations but found none',
        pass: true,
      };
    }
    return {
      message: () => `Found ${received.violations.length} accessibility violations:\n${JSON.stringify(received.violations, null, 2)}`,
      pass: false,
    };
  },
});
