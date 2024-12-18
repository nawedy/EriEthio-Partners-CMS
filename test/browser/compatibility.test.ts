import { remote } from 'webdriverio';
import { expect } from 'chai';

describe('Browser Compatibility Tests', () => {
  const browsers = [
    { browserName: 'chrome', version: 'latest' },
    { browserName: 'firefox', version: 'latest' },
    { browserName: 'safari', version: 'latest' }
  ];

  browsers.forEach(({ browserName, version }) => {
    describe(`${browserName} ${version}`, () => {
      let browser;

      beforeAll(async () => {
        browser = await remote({
          capabilities: {
            browserName,
            browserVersion: version,
            'goog:chromeOptions': {
              args: ['--headless', '--disable-gpu']
            },
            'moz:firefoxOptions': {
              args: ['-headless']
            }
          }
        });
      });

      afterAll(async () => {
        await browser.deleteSession();
      });

      beforeEach(async () => {
        await browser.url('http://localhost:3000');
      });

      it('should render layout correctly', async () => {
        const layout = await browser.$('[data-testid="main-layout"]');
        expect(await layout.isDisplayed()).to.be.true;
      });

      it('should handle modern JavaScript features', async () => {
        const result = await browser.execute(() => {
          // Test modern JS features
          const asyncFunction = async () => true;
          const optionalChaining = { a: { b: 1 } }?.a?.b;
          const nullishCoalescing = null ?? 'default';
          const spreadOperator = [...[1, 2, 3]];
          
          return {
            asyncAwait: typeof asyncFunction === 'function',
            optionalChaining: optionalChaining === 1,
            nullishCoalescing: nullishCoalescing === 'default',
            spreadOperator: spreadOperator.length === 3
          };
        });

        expect(result.asyncAwait).to.be.true;
        expect(result.optionalChaining).to.be.true;
        expect(result.nullishCoalescing).to.be.true;
        expect(result.spreadOperator).to.be.true;
      });

      it('should handle modern CSS features', async () => {
        const result = await browser.execute(() => {
          const div = document.createElement('div');
          div.style.display = 'grid';
          div.style.gap = '1rem';
          div.style.color = 'var(--primary-color)';
          
          return {
            grid: getComputedStyle(div).display === 'grid',
            gap: getComputedStyle(div).gap === '1rem',
            cssVariables: CSS.supports('color', 'var(--primary-color)')
          };
        });

        expect(result.grid).to.be.true;
        expect(result.gap).to.be.true;
        expect(result.cssVariables).to.be.true;
      });

      it('should handle modern Web APIs', async () => {
        const result = await browser.execute(() => {
          return {
            intersectionObserver: 'IntersectionObserver' in window,
            resizeObserver: 'ResizeObserver' in window,
            mutationObserver: 'MutationObserver' in window,
            fetch: 'fetch' in window,
            webAnimations: 'animate' in Element.prototype
          };
        });

        expect(result.intersectionObserver).to.be.true;
        expect(result.resizeObserver).to.be.true;
        expect(result.mutationObserver).to.be.true;
        expect(result.fetch).to.be.true;
        expect(result.webAnimations).to.be.true;
      });

      it('should handle file operations correctly', async () => {
        const input = await browser.$('input[type="file"]');
        await input.setValue('test.jpg');
        
        const uploadStatus = await browser.$('[data-testid="upload-status"]');
        expect(await uploadStatus.getText()).to.include('File selected');
      });

      it('should handle responsive images', async () => {
        const image = await browser.$('img[data-testid="responsive-image"]');
        const srcset = await image.getAttribute('srcset');
        const sizes = await image.getAttribute('sizes');
        
        expect(srcset).to.include('1x');
        expect(srcset).to.include('2x');
        expect(sizes).to.include('100vw');
      });

      it('should handle touch events', async () => {
        const touchElement = await browser.$('[data-testid="touch-target"]');
        
        // Simulate touch events
        await browser.execute((el) => {
          el.dispatchEvent(new TouchEvent('touchstart'));
          el.dispatchEvent(new TouchEvent('touchend'));
        }, touchElement);
        
        const touchStatus = await browser.$('[data-testid="touch-status"]');
        expect(await touchStatus.getText()).to.include('touched');
      });

      it('should handle WebGL content', async () => {
        const result = await browser.execute(() => {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          return !!gl;
        });

        expect(result).to.be.true;
      });

      it('should handle web fonts correctly', async () => {
        const result = await browser.execute(() => {
          return document.fonts.ready.then(() => {
            const element = document.querySelector('[data-testid="custom-font"]');
            const fontFamily = getComputedStyle(element).fontFamily;
            return fontFamily.includes('CustomFont');
          });
        });

        expect(result).to.be.true;
      });

      it('should handle SVG content', async () => {
        const svg = await browser.$('svg[data-testid="test-svg"]');
        expect(await svg.isDisplayed()).to.be.true;
        
        const paths = await browser.$$('svg[data-testid="test-svg"] path');
        expect(paths.length).to.be.greaterThan(0);
      });
    });
  });
});
