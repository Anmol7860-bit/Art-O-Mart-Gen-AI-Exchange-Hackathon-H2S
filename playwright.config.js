import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Art-O-Mart Frontend E2E Tests
 * Supports both development and production testing environments
 * See https://playwright.dev/docs/test-configuration.
 */

// Environment-specific configuration
const isProduction = process.env.TEST_ENV === 'production';
const baseURL = process.env.BASE_URL || 
  (isProduction ? 'https://art-o-mart-frontend-three.vercel.app' : 'http://localhost:4028');

export default defineConfig({
  testDir: './tests/e2e',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry configuration - more retries for production due to network variability */
  retries: isProduction ? 3 : (process.env.CI ? 2 : 0),
  
  /* Workers configuration - fewer workers for production to avoid rate limiting */
  workers: isProduction ? 2 : (process.env.CI ? 1 : undefined),
  
  /* Global timeout - longer for production environment */
  timeout: isProduction ? 60000 : 30000,
  
  /* Expect timeout - longer for production */
  expect: {
    timeout: isProduction ? 10000 : 5000,
  },
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { 
      outputFolder: 'playwright-report',
      open: isProduction ? 'never' : 'on-failure'
    }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }],
    ...(isProduction ? [['github']] : [])
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: baseURL,
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: isProduction ? 'retain-on-failure' : 'on-first-retry',
    
    /* Take screenshot on failure - always in production */
    screenshot: isProduction ? 'on' : 'only-on-failure',
    
    /* Record video - always in production for debugging */
    video: isProduction ? 'retain-on-failure' : 'retain-on-failure',
    
    /* Global timeout for actions - longer in production */
    actionTimeout: isProduction ? 15000 : 10000,
    
    /* Global timeout for navigation - longer in production */
    navigationTimeout: isProduction ? 60000 : 30000,
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
    
    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'User-Agent': 'Art-O-Mart E2E Tests',
      ...(isProduction && {
        'X-Test-Environment': 'production',
        'X-Test-Timestamp': new Date().toISOString()
      })
    },
  },

  /* Configure projects for major browsers */
  projects: [
    // Desktop browsers - always run in production
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        ...(isProduction && {
          // Production-specific Chrome settings
          contextOptions: {
            permissions: ['notifications'],
            geolocation: { latitude: 37.7749, longitude: -122.4194 }, // San Francisco
          }
        })
      },
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        ...(isProduction && {
          // Production-specific Firefox settings
          launchOptions: {
            firefoxUserPrefs: {
              'dom.webnotifications.enabled': true,
              'geo.enabled': true
            }
          }
        })
      },
    },

    // Only run Safari on production for cross-browser validation
    ...(isProduction ? [{
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    }] : []),

    // Mobile browsers - run in production for comprehensive testing
    ...(isProduction ? [
      {
        name: 'Mobile Chrome',
        use: { 
          ...devices['Pixel 5'],
          contextOptions: {
            permissions: ['notifications', 'geolocation'],
          }
        },
      },
      {
        name: 'Mobile Safari', 
        use: { ...devices['iPhone 12'] },
      }
    ] : []),

    // Branded browsers - only in comprehensive production testing
    ...(isProduction && process.env.COMPREHENSIVE_TESTING ? [
      {
        name: 'Microsoft Edge',
        use: { ...devices['Desktop Edge'], channel: 'msedge' },
      },
      {
        name: 'Google Chrome',
        use: { ...devices['Desktop Chrome'], channel: 'chrome' },
      },
    ] : []),
  ],

  /* Global setup for authentication and environment preparation */
  globalSetup: './tests/e2e/global-setup.js',
  
  /* Global teardown for cleanup */
  globalTeardown: './tests/e2e/global-teardown.js',

  /* Production-specific test metadata */
  metadata: {
    environment: isProduction ? 'production' : 'development',
    baseURL: baseURL,
    timestamp: new Date().toISOString(),
    ...(isProduction && {
      deployment: {
        frontend: process.env.BASE_URL,
        backend: process.env.VITE_BACKEND_URL,
        version: process.env.VITE_APP_VERSION || '1.0.0'
      }
    })
  },

  /* Web Server for development testing */
  ...((!isProduction && !process.env.CI) && {
    webServer: {
      command: 'npm run dev',
      port: 4028,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    }
  }),

  /* Test configuration */
  testMatch: /.*\.spec\.js$/,
  testIdAttribute: 'data-testid',
  maxFailures: process.env.CI ? 10 : undefined,

});