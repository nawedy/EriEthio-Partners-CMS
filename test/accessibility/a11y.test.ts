import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import AxeBuilder from '@axe-core/webdriverjs';
import { expect } from 'chai';

describe('Accessibility Tests', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options();
    options.addArguments('--headless', '--disable-gpu', '--no-sandbox');
    
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
      
    await driver.get('http://localhost:3000');
  });

  afterAll(async () => {
    await driver.quit();
  });

  it('should pass axe-core accessibility tests', async () => {
    const results = await new AxeBuilder(driver).analyze();
    const violations = results.violations.filter(violation => 
      violation.impact === 'critical' || violation.impact === 'serious'
    );
    expect(violations).to.have.lengthOf(0);
  });

  it('should have proper ARIA attributes', async () => {
    const elements = await driver.findElements({ css: '[aria-label], [aria-describedby], [role]' });
    expect(elements.length).to.be.greaterThan(0);
  });

  it('should have proper heading structure', async () => {
    const h1Elements = await driver.findElements({ css: 'h1' });
    expect(h1Elements).to.have.lengthOf.at.least(1);
  });

  it('should have proper form labels', async () => {
    const forms = await driver.findElements({ css: 'form' });
    for (const form of forms) {
      const inputs = await form.findElements({ css: 'input:not([type="hidden"])' });
      for (const input of inputs) {
        const hasLabel = await input.getAttribute('aria-label') || 
                        await input.getAttribute('aria-labelledby') ||
                        (await driver.findElements({ css: `label[for="${await input.getAttribute('id')}"]` })).length > 0;
        expect(hasLabel).to.be.true;
      }
    }
  });

  it('should have proper image alt text', async () => {
    const images = await driver.findElements({ css: 'img:not([role="presentation"])' });
    for (const image of images) {
      const alt = await image.getAttribute('alt');
      expect(alt).to.not.be.empty;
    }
  });

  it('should have proper link text', async () => {
    const links = await driver.findElements({ css: 'a' });
    for (const link of links) {
      const text = await link.getText();
      const ariaLabel = await link.getAttribute('aria-label');
      expect(text || ariaLabel).to.not.be.empty;
    }
  });

  it('should have proper focus management', async () => {
    const focusableElements = await driver.findElements({ 
      css: 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    });
    expect(focusableElements.length).to.be.greaterThan(0);

    for (const element of focusableElements) {
      await element.click();
      const activeElement = await driver.switchTo().activeElement();
      expect(await activeElement.getId()).to.equal(await element.getId());
    }
  });

  it('should have proper color contrast', async () => {
    const results = await new AxeBuilder(driver)
      .configure({
        checks: ['color-contrast']
      })
      .analyze();

    const contrastViolations = results.violations.filter(v => v.id === 'color-contrast');
    expect(contrastViolations).to.have.lengthOf(0);
  });
});
