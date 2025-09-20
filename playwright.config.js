import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Art-O-Mart Frontend E2E Tests
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }]
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:4028',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Global timeout for actions */
    actionTimeout: 10000,
    
    /* Global timeout for navigation */
    navigationTimeout: 30000,
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],

  /* Environment-specific configurations */
  ...(process.env.NODE_ENV === 'production' && {
    projects: [
      {
        name: 'production-chrome',
        use: { 
          ...devices['Desktop Chrome'],
          baseURL: process.env.PRODUCTION_URL || 'https://your-domain.com'
        },
      },
      {
        name: 'production-mobile',
        use: { 
          ...devices['Pixel 5'],
          baseURL: process.env.PRODUCTION_URL || 'https://your-domain.com'
        },
      },
    ]
  }),

  /* Global setup for authentication */
  globalSetup: './tests/e2e/global-setup.js',
  
  /* Global teardown */
  globalTeardown: './tests/e2e/global-teardown.js',

  /* Test timeout */
  timeout: 60000,

  /* Expect timeout */
  expect: {
    timeout: 10000,
  },

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 4028,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },

  /* Test environment variables */
  testMatch: /.*\.spec\.js$/,
  
  /* Test result output directory */
  outputDir: 'test-results/',

  /* Maximum number of test failures */
  maxFailures: process.env.CI ? 10 : undefined,

  /* Configure custom matchers */
  testIdAttribute: 'data-testid',

  /* Metadata for test results */
  metadata: {
    'test-environment': process.env.NODE_ENV || 'development',
    'base-url': process.env.BASE_URL || 'http://localhost:4028',
    'timestamp': new Date().toISOString(),
  },
});