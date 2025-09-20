/**
 * Frontend Environment Variable Validator
 * Validates required VITE_ prefixed environment variables for proper application configuration
 */

/**
 * Get environment variables from appropriate runtime context
 * Prefer Vite env if present; fallback to process.env in Node.js
 */
function getRuntimeEnv() {
  // Check if we're in a Vite/browser environment
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env;
    }
  } catch (e) {
    // Fall through to process.env
  }
  return process?.env ?? {};
}

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
  },
  VITE_WS_URL: {
    required: false,
    validator: (value) => {
      if (!value) return null; // Optional in development
      
      // Check if it's a valid WebSocket URL format
      if (!value.startsWith('ws://') && !value.startsWith('wss://') && !value.startsWith('http://') && !value.startsWith('https://')) {
        return 'WebSocket URL must start with ws://, wss://, http://, or https://';
      }
      
      // In production, require secure protocols
      const ENV = getRuntimeEnv();
      if (ENV.PROD) {
        if (value.startsWith('ws://') || value.startsWith('http://')) {
          return 'Production WebSocket URL must use secure protocols (wss:// or https://)';
        }
      }
      
      try {
        new URL(value.replace('ws://', 'http://').replace('wss://', 'https://'));
      } catch {
        return 'Invalid WebSocket URL format';
      }
      
      return null;
    },
    setupInstructions: [
      '1. Get your backend WebSocket URL from deployment platform',
      '2. For development: ws://localhost:5000',
      '3. For production: wss://your-backend-domain.com',
      '4. Ensure CORS is configured on backend for your domain'
    ]
  },
  VITE_BACKEND_URL: {
    required: false,
    validator: (value) => {
      if (!value) return null; // Optional, will derive from WS_URL
      
      if (!value.startsWith('http://') && !value.startsWith('https://')) {
        return 'Backend URL must start with http:// or https://';
      }
      
      // In production, require HTTPS
      const ENV = getRuntimeEnv();
      if (ENV.PROD && value.startsWith('http://')) {
        return 'Production backend URL must use HTTPS';
      }
      
      try {
        new URL(value);
      } catch {
        return 'Invalid backend URL format';
      }
      
      return null;
    },
    setupInstructions: [
      '1. Get your backend API URL from deployment platform',
      '2. For development: http://localhost:5000/api',
      '3. For production: https://your-backend-domain.com/api',
      '4. If not set, will derive from VITE_WS_URL'
    ]
  }
};

// Optional environment variables with defaults
const OPTIONAL_VARS = {
  VITE_API_URL: 'http://localhost:5000/api',
  VITE_WS_URL: 'ws://localhost:5000',
  VITE_BACKEND_URL: null, // Will derive from VITE_WS_URL if not set
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
  const ENV = getRuntimeEnv();
  const value = ENV[key];
  
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
  const ENV = getRuntimeEnv();
  const value = ENV[key] || OPTIONAL_VARS[key] || defaultValue;
  
  // Special handling for derived VITE_BACKEND_URL
  if (key === 'VITE_BACKEND_URL' && !value) {
    const wsUrl = ENV.VITE_WS_URL || OPTIONAL_VARS.VITE_WS_URL;
    if (wsUrl) {
      // Convert WebSocket URL to HTTP URL for API calls
      return wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    }
  }
  
  return value;
}

/**
 * Check if we're in development mode
 */
export function isDevelopment() {
  const ENV = getRuntimeEnv();
  return ENV.DEV || ENV.NODE_ENV !== 'production';
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
  const ENV = getRuntimeEnv();
  for (const [key, defaultValue] of Object.entries(OPTIONAL_VARS)) {
    if (!ENV[key]) {
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
  const ENV = getRuntimeEnv();
  
  if (isDebugMode()) {
    console.group('🔍 Environment Validation');
    console.log('Validation Result:', validation);
    console.log('Environment Variables:', {
      ...Object.keys(REQUIRED_VARS).reduce((acc, key) => {
        acc[key] = ENV[key] ? '✓ Set' : '❌ Missing';
        return acc;
      }, {}),
      ...Object.keys(OPTIONAL_VARS).reduce((acc, key) => {
        acc[key] = ENV[key] || `Default: ${OPTIONAL_VARS[key]}`;
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