/**
 * Frontend Environment Variable Validator
 * Validates required VITE_ prefixed environment variables for proper application configuration
 */

// Required environment variables with their validation rules
const REQUIRED_VARS = {
  VITE_SUPABASE_URL: {
    required: true,
    validator: (value) => {
      if (!value || value === 'https://placeholder.supabase.co') {
        return 'Please configure your actual Supabase project URL';
      }
      if (!value.includes('supabase.co')) {
        return 'Invalid Supabase URL format. Should contain "supabase.co"';
      }
      return null;
    },
    setupInstructions: [
      '1. Go to https://app.supabase.com',
      '2. Create a new project or select existing project',
      '3. Go to Settings > API',
      '4. Copy the Project URL'
    ]
  },
  VITE_SUPABASE_ANON_KEY: {
    required: true,
    validator: (value) => {
      if (!value || value === 'placeholder-key') {
        return 'Please configure your actual Supabase anon key';
      }
      if (value.length < 50) {
        return 'Supabase anon key appears to be invalid (too short)';
      }
      return null;
    },
    setupInstructions: [
      '1. Go to https://app.supabase.com',
      '2. Select your project > Settings > API',
      '3. Copy the anon public key'
    ]
  }
};

// Optional environment variables with defaults
const OPTIONAL_VARS = {
  VITE_API_URL: 'http://localhost:5000/api',
  VITE_WS_URL: 'http://localhost:5000',
  VITE_APP_NAME: 'Art-O-Mart',
  VITE_APP_VERSION: '1.0.0',
  VITE_ENABLE_AI_FEATURES: 'true',
  VITE_ENABLE_WEBSOCKETS: 'true',
  VITE_ENABLE_ANALYTICS: 'false',
  VITE_DEBUG_MODE: 'false',
  VITE_MOCK_DATA: 'false'
};

/**
 * Validate a single environment variable
 */
function validateEnvVar(key, config) {
  const value = import.meta.env[key];
  
  if (config.required && !value) {
    return {
      isValid: false,
      error: `${key} is required but not set`,
      setupInstructions: config.setupInstructions || []
    };
  }
  
  if (value && config.validator) {
    const validationError = config.validator(value);
    if (validationError) {
      return {
        isValid: false,
        error: `${key}: ${validationError}`,
        setupInstructions: config.setupInstructions || []
      };
    }
  }
  
  return { isValid: true };
}

/**
 * Get environment variable value with fallback to default
 */
export function getEnvVar(key, defaultValue = null) {
  return import.meta.env[key] || OPTIONAL_VARS[key] || defaultValue;
}

/**
 * Check if we're in development mode
 */
export function isDevelopment() {
  return import.meta.env.DEV;
}

/**
 * Check if mock data should be used
 */
export function shouldUseMockData() {
  return getEnvVar('VITE_MOCK_DATA') === 'true';
}

/**
 * Check if debug mode is enabled
 */
export function isDebugMode() {
  return getEnvVar('VITE_DEBUG_MODE') === 'true';
}

/**
 * Validate all required environment variables
 */
export function validateEnvironment() {
  const errors = [];
  const warnings = [];
  
  // Validate required variables
  for (const [key, config] of Object.entries(REQUIRED_VARS)) {
    const result = validateEnvVar(key, config);
    if (!result.isValid) {
      errors.push({
        variable: key,
        error: result.error,
        setupInstructions: result.setupInstructions
      });
    }
  }
  
  // Check for missing optional variables and provide defaults
  for (const [key, defaultValue] of Object.entries(OPTIONAL_VARS)) {
    if (!import.meta.env[key]) {
      warnings.push({
        variable: key,
        message: `Using default value: ${defaultValue}`,
        recommendation: `Consider setting ${key} in your .env file for explicit configuration`
      });
    }
  }
  
  // Special validation for development mode
  if (isDevelopment()) {
    const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
    if (supabaseUrl === 'https://placeholder.supabase.co') {
      warnings.push({
        variable: 'VITE_SUPABASE_URL',
        message: 'Using placeholder Supabase URL - some features may not work',
        recommendation: 'Configure your actual Supabase credentials for full functionality'
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    canRunWithMockData: isDevelopment() && shouldUseMockData()
  };
}

/**
 * Create error boundary component for environment issues
 */
export function createEnvironmentErrorBoundary() {
  return class EnvironmentErrorBoundary extends Error {
    constructor(validationResult) {
      const message = `Environment Configuration Error:\n${validationResult.errors.map(e => e.error).join('\n')}`;
      super(message);
      this.name = 'EnvironmentConfigurationError';
      this.validationResult = validationResult;
    }
  };
}

/**
 * Format setup instructions for display
 */
export function formatSetupInstructions(validationResult) {
  if (validationResult.isValid) return null;
  
  const instructions = [];
  instructions.push('🚨 Environment Configuration Required');
  instructions.push('');
  
  for (const error of validationResult.errors) {
    instructions.push(`❌ ${error.variable}:`);
    instructions.push(`   ${error.error}`);
    if (error.setupInstructions && error.setupInstructions.length > 0) {
      instructions.push('   Setup Instructions:');
      error.setupInstructions.forEach(instruction => {
        instructions.push(`   ${instruction}`);
      });
    }
    instructions.push('');
  }
  
  instructions.push('📝 Please update your .env file with the required values.');
  instructions.push('💡 See ENVIRONMENT_SETUP.md for detailed instructions.');
  
  if (validationResult.warnings.length > 0) {
    instructions.push('');
    instructions.push('⚠️  Warnings:');
    validationResult.warnings.forEach(warning => {
      instructions.push(`   ${warning.variable}: ${warning.message}`);
    });
  }
  
  return instructions.join('\n');
}

// Log validation results in development
if (isDevelopment()) {
  const validation = validateEnvironment();
  
  if (isDebugMode()) {
    console.group('🔍 Environment Validation');
    console.log('Validation Result:', validation);
    console.log('Environment Variables:', {
      ...Object.keys(REQUIRED_VARS).reduce((acc, key) => {
        acc[key] = import.meta.env[key] ? '✓ Set' : '❌ Missing';
        return acc;
      }, {}),
      ...Object.keys(OPTIONAL_VARS).reduce((acc, key) => {
        acc[key] = import.meta.env[key] || `Default: ${OPTIONAL_VARS[key]}`;
        return acc;
      }, {})
    });
    console.groupEnd();
  }
  
  if (!validation.isValid) {
    console.warn('⚠️ Environment configuration issues detected:');
    console.warn(formatSetupInstructions(validation));
  } else if (validation.warnings.length > 0) {
    console.info('💡 Environment configuration suggestions:');
    validation.warnings.forEach(warning => {
      console.info(`${warning.variable}: ${warning.message}`);
    });
  }
}