import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { expect } from 'chai';
import { WebDriver, Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

interface LighthouseReport {
  lhr: {
    categories: {
      performance: { score: number };
      accessibility: { score: number };
      'best-practices': { score: number };
      seo: { score: number };
    };
    audits: Record<string, { score: number; numericValue?: number }>;
  };
}

interface PerformanceMetrics {
  lcp?: { startTime: number };
  fid?: { duration: number };
  cls?: Array<{ value: number }>;
}

describe('Performance Tests', () => {
  let chromeInstance: chromeLauncher.LaunchedChrome;
  let results: LighthouseReport;
  let driver: WebDriver;

  beforeAll(async () => {
    chromeInstance = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--no-sandbox']
    });

    const options = {
      logLevel: 'info' as const,
      output: 'json' as const,
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      port: chromeInstance.port
    };

    results = await lighthouse('http://localhost:3000', options) as LighthouseReport;

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(new chrome.Options().headless())
      .build();

    await driver.get('http://localhost:3000');
  });

  afterAll(async () => {
    if (chromeInstance) {
      await chromeInstance.kill();
    }
    if (driver) {
      await driver.quit();
    }
  });

  it('should pass Lighthouse performance audit', async () => {
    expect(results.lhr.categories.performance.score).to.be.greaterThan(0.8);
  });

  it('should pass Lighthouse accessibility audit', async () => {
    expect(results.lhr.categories.accessibility.score).to.be.greaterThan(0.9);
  });

  it('should pass Lighthouse best practices audit', async () => {
    expect(results.lhr.categories['best-practices'].score).to.be.greaterThan(0.9);
  });

  it('should pass Lighthouse SEO audit', async () => {
    expect(results.lhr.categories.seo.score).to.be.greaterThan(0.9);
  });

  it('should have acceptable Core Web Vitals', async () => {
    const metrics = await driver.executeScript<PerformanceMetrics>(() => {
      return {
        lcp: (performance as any).getEntriesByType('largest-contentful-paint')[0],
        fid: (performance as any).getEntriesByType('first-input')[0],
        cls: (performance as any).getEntriesByType('layout-shift')
      };
    });

    expect(metrics.lcp?.startTime || 0).to.be.lessThan(2500); // LCP < 2.5s
    expect(metrics.fid?.duration || 0).to.be.lessThan(100); // FID < 100ms
    expect((metrics.cls || []).reduce((sum: number, entry: any) => sum + entry.value, 0)).to.be.lessThan(0.1); // CLS < 0.1
  });

  it('should have acceptable Time to First Byte (TTFB)', async () => {
    const navigationStart = await driver.executeScript<number>(() => {
      const nav = (performance as any).getEntriesByType('navigation')[0];
      return nav ? nav.responseStart - nav.requestStart : 0;
    });

    expect(navigationStart).to.be.lessThan(600); // TTFB < 600ms
  });

  it('should have acceptable First Contentful Paint (FCP)', async () => {
    const fcp = await driver.executeScript<number>(() => {
      const paint = (performance as any).getEntriesByType('paint')
        .find((entry: any) => entry.name === 'first-contentful-paint');
      return paint ? paint.startTime : null;
    });

    expect(fcp).to.be.lessThan(1800); // FCP < 1.8s
  });

  it('should have acceptable Time to Interactive (TTI)', async () => {
    const tti = await driver.executeScript<number>(() => {
      const timing = (performance as any).timing;
      return timing ? timing.domInteractive - timing.navigationStart : 0;
    });

    expect(tti).to.be.lessThan(3800); // TTI < 3.8s
  });

  it('should have acceptable memory usage', async () => {
    interface MemoryInfo {
      usedJSHeapSize: number;
    }

    const memoryInfo = await driver.executeScript<MemoryInfo>(() => {
      return (performance as any).memory || { usedJSHeapSize: 0 };
    });

    expect(memoryInfo.usedJSHeapSize).to.be.lessThan(50 * 1024 * 1024); // < 50MB
  });

  it('should handle memory leaks during navigation', async () => {
    interface MemoryInfo {
      usedJSHeapSize: number;
    }

    const initialMemory = await driver.executeScript<MemoryInfo>(() => {
      return (performance as any).memory || { usedJSHeapSize: 0 };
    });

    // Simulate user navigation
    for (let i = 0; i < 5; i++) {
      await driver.navigate().refresh();
      await driver.executeScript('return document.readyState === "complete"');
    }

    const finalMemory = await driver.executeScript<MemoryInfo>(() => {
      return (performance as any).memory || { usedJSHeapSize: 0 };
    });

    const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
    expect(memoryIncrease).to.be.lessThan(10 * 1024 * 1024); // < 10MB increase
  });

  it('should have acceptable JavaScript execution time', async () => {
    const metrics = await driver.executeScript<number>(() => {
      return (performance as any).getEntriesByType('measure')
        .filter((entry: any) => entry.name.startsWith('script-'))
        .reduce((total: number, entry: any) => total + entry.duration, 0);
    });

    expect(metrics).to.be.lessThan(1000); // Total JS execution < 1s
  });

  it('should have smooth scrolling performance', async () => {
    await driver.executeScript(() => {
      performance.mark('scroll-start');
      window.scrollTo(0, document.body.scrollHeight);
      performance.mark('scroll-end');
      performance.measure('scroll', 'scroll-start', 'scroll-end');
    });

    const scrollMetrics = await driver.executeScript<number>(() => {
      const entry = performance.getEntriesByName('scroll')[0];
      return entry ? entry.duration : 0;
    });

    expect(scrollMetrics).to.be.lessThan(300); // Scroll should take < 300ms
  });
});
