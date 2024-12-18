import { defineConfig } from 'cypress';
import { lighthouse, prepareAudit } from 'cypress-audit';
import { addMatchImageSnapshotPlugin } from 'cypress-image-snapshot/plugin';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      addMatchImageSnapshotPlugin(on, config);
      
      on('before:browser:launch', (browser = {}, launchOptions) => {
        prepareAudit(launchOptions);
      });

      on('task', {
        lighthouse: lighthouse(),
        log(message) {
          console.log(message);
          return null;
        },
        table(message) {
          console.table(message);
          return null;
        },
      });

      require('@cypress/code-coverage/task')(on, config);
      return config;
    },
  },

  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
    supportFile: 'cypress/support/component.ts',
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
  },

  env: {
    codeCoverage: {
      exclude: ['cypress/**/*.*'],
    },
    lighthouse: {
      thresholds: {
        performance: 85,
        accessibility: 100,
        'best-practices': 85,
        seo: 85,
        pwa: 100,
      },
      performance: {
        preset: 'desktop',
      },
    },
    failOnSnapshotDiff: true,
    updateSnapshots: false,
  },
});
