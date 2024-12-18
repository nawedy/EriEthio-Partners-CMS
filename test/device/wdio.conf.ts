import type { Options } from '@wdio/types';

export const config: Options.Testrunner = {
  runner: 'local',
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      project: './tsconfig.json',
      transpileOnly: true
    }
  },

  specs: [
    './test/device/specs/**/*.ts'
  ],

  exclude: [],

  maxInstances: 10,

  capabilities: [{
    // Mobile devices
    browserName: 'chrome',
    'goog:chromeOptions': {
      mobileEmulation: { deviceName: 'iPhone 12' }
    },
  }, {
    browserName: 'chrome',
    'goog:chromeOptions': {
      mobileEmulation: { deviceName: 'iPad Pro' }
    },
  }, {
    browserName: 'chrome',
    'goog:chromeOptions': {
      mobileEmulation: { deviceName: 'Pixel 5' }
    },
  }, {
    // Desktop browsers
    browserName: 'chrome',
  }, {
    browserName: 'firefox',
  }, {
    browserName: 'safari',
  }],

  logLevel: 'info',
  bail: 0,
  baseUrl: 'http://localhost:3000',
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  services: ['browserstack'],

  framework: 'mocha',
  reporters: ['spec'],

  mochaOpts: {
    ui: 'bdd',
    timeout: 60000
  },

  // BrowserStack configuration
  user: process.env.BROWSERSTACK_USERNAME,
  key: process.env.BROWSERSTACK_ACCESS_KEY,

  // BrowserStack specific capabilities
  browserstackLocal: true,
  capabilities: [{
    // iOS devices
    'bstack:options': {
      deviceName: 'iPhone 14',
      osVersion: '16',
      realMobile: 'true',
    },
    browserName: 'safari',
  }, {
    'bstack:options': {
      deviceName: 'iPad Pro 12.9 2022',
      osVersion: '16',
      realMobile: 'true',
    },
    browserName: 'safari',
  }, {
    // Android devices
    'bstack:options': {
      deviceName: 'Samsung Galaxy S23 Ultra',
      osVersion: '13.0',
      realMobile: 'true',
    },
    browserName: 'chrome',
  }, {
    'bstack:options': {
      deviceName: 'Google Pixel 7 Pro',
      osVersion: '13.0',
      realMobile: 'true',
    },
    browserName: 'chrome',
  }, {
    // Desktop browsers
    'bstack:options': {
      os: 'Windows',
      osVersion: '11',
    },
    browserName: 'chrome',
  }, {
    'bstack:options': {
      os: 'Windows',
      osVersion: '11',
    },
    browserName: 'firefox',
  }, {
    'bstack:options': {
      os: 'OS X',
      osVersion: 'Ventura',
    },
    browserName: 'safari',
  }],
};
