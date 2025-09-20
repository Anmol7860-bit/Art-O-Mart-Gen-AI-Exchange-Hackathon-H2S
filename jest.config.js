/**
 * Jest Configuration for Art-O-Mart Frontend Integration Tests
 */
module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Module paths (corrected key name)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@styles/(.*)$': '<rootDir>/src/styles/$1',
    '^@contexts/(.*)$': '<rootDir>/src/contexts/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg|woff|woff2)$': 'jest-transform-stub',
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  
  // Module file extensions
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
  
  // Test match patterns
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.js'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/tests/e2e/',
  ],
  
  // Module path ignore patterns
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
  ],
  
  // Coverage configuration
  collectCoverage: false, // Enable when running coverage tests
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.d.ts',
    '!src/index.jsx',
    '!src/vite-env.d.ts',
    '!**/*.config.{js,jsx}',
    '!**/*.stories.{js,jsx}',
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // Mock configuration
  clearMocks: true,
  restoreMocks: true,
  
  // Test environment setup
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
  
  // Global variables
  globals: {
    'import.meta': {
      env: {
        VITE_SUPABASE_URL: 'https://test-project.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
        VITE_WS_URL: 'ws://localhost:5000',
        VITE_BACKEND_URL: 'http://localhost:5000/api',
        VITE_MOCK_DATA: 'true',
        VITE_DEBUG_MODE: 'true',
      }
    }
  },
  
  // Test timeout
  testTimeout: 10000,
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results',
        outputName: 'jest-results.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
      },
    ],
  ],
  
  // Error handling
  errorOnDeprecated: true,
  
  // Verbose output
  verbose: process.env.CI ? false : true,
  
  // Force exit
  forceExit: false,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Max workers
  maxWorkers: process.env.CI ? 2 : '50%',
  
  // Cache directory
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Extensions to transform
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@supabase|socket.io-client))',
  ],
  
  // Snapshot serializers
  snapshotSerializers: ['jest-serializer-html']
};