/**
 * Backend Environment Variable Validator
 * Validates all required environment variables for backend services
 */

import crypto from 'crypto';
import { URL } from 'url';

// Required environment variables with validation rules
const REQUIRED_VARS = {
  GEMINI_API_KEY: {
    required: true,
    validator: (value) => {
      if (!value || value === 'your_gemini_api_key_here') {
        return 'Please configure your actual Google Gemini API key';
      }
      if (!value.startsWith('AI') && value.length < 20) {
        return 'Gemini API key format appears to be invalid';
      }
      return null;
    },
    setupInstructions: [
      '1. Go to https://makersuite.google.com/app/apikey',
      '2. Create a new API key',
      '3. Copy the generated key to GEMINI_API_KEY in your .env file'
    ]
  },
  SUPABASE_URL: {
    required: true,
    validator: (value) => {
      if (!value || value === 'https://placeholder.supabase.co') {
        return 'Please configure your actual Supabase project URL';
      }
      try {
        const url = new URL(value);
        if (!url.hostname.includes('supabase.co')) {
          return 'Invalid Supabase URL format. Should be a supabase.co domain';
        }
      } catch {
        return 'Invalid URL format for Supabase URL';
      }
      return null;
    },
    setupInstructions: [
      '1. Go to https://app.supabase.com',
      '2. Select your project > Settings > API',
      '3. Copy the Project URL to SUPABASE_URL'
    ]
  },
  SUPABASE_SERVICE_KEY: {
    required: true,
    validator: (value) => {
      if (!value || value === 'your_supabase_service_key_here') {
        return 'Please configure your actual Supabase service role key';
      }
      if (value.length < 100) {
        return 'Supabase service key appears to be invalid (too short)';
      }
      return null;
    },
    setupInstructions: [
      '1. Go to https://app.supabase.com',
      '2. Select your project > Settings > API', 
      '3. Copy the service_role key to SUPABASE_SERVICE_KEY',
      '4. ⚠️ Keep this key secure - it has admin privileges!'
    ]
  },
  JWT_SECRET: {
    required: true,
    validator: (value) => {
      if (!value || value === 'your_jwt_secret_here_generate_a_secure_32_char_string') {
        return 'Please generate a secure JWT secret';
      }
      if (value.length < 32) {
        return 'JWT secret should be at least 32 characters long';
      }
      return null;
    },
    setupInstructions: [
      '1. Generate a secure secret using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
      '2. Copy the generated string to JWT_SECRET in your .env file'
    ]
  }
};

// Optional environment variables with defaults and validation
const OPTIONAL_VARS = {
  PORT: {
    default: '5000',
    validator: (value) => {
      const port = parseInt(value);
      if (isNaN(port) || port < 1 || port > 65535) {
        return 'Port must be a valid number between 1 and 65535';
      }
      return null;
    }
  },
  NODE_ENV: {
    default: 'development',
    validator: (value) => {
      if (!['development', 'production', 'test'].includes(value)) {
        return 'NODE_ENV must be one of: development, production, test';
      }
      return null;
    }
  },
  FRONTEND_URL: {
    default: 'http://localhost:4028',
    validator: (value) => {
      try {
        new URL(value);
        return null;
      } catch {
        return 'FRONTEND_URL must be a valid URL';
      }
    }
  },
  AI_MODEL: {
    default: 'gemini-2.0-flash-001'
  },
  AI_TEMPERATURE: {
    default: '0.7',
    validator: (value) => {
      const temp = parseFloat(value);
      if (isNaN(temp) || temp < 0 || temp > 2) {
        return 'AI_TEMPERATURE must be a number between 0 and 2';
      }
      return null;
    }
  },
  AI_MAX_TOKENS: {
    default: '2000',
    validator: (value) => {
      const tokens = parseInt(value);
      if (isNaN(tokens) || tokens < 1) {
        return 'AI_MAX_TOKENS must be a positive integer';
      }
      return null;
    }
  },
  JWT_EXPIRY: {
    default: '7d'
  },
  LOG_LEVEL: {
    default: 'info',
    validator: (value) => {
      if (!['error', 'warn', 'info', 'debug'].includes(value)) {
        return 'LOG_LEVEL must be one of: error, warn, info, debug';
      }
      return null;
    }
  },
  RATE_LIMIT_MAX: {
    default: '100',
    validator: (value) => {
      const max = parseInt(value);
      if (isNaN(max) || max < 1) {
        return 'RATE_LIMIT_MAX must be a positive integer';
      }
      return null;
    }
  },
  RATE_LIMIT_WINDOW_MS: {
    default: '900000',
    validator: (value) => {
      const window = parseInt(value);
      if (isNaN(window) || window < 1000) {
        return 'RATE_LIMIT_WINDOW_MS must be at least 1000 milliseconds';
      }
      return null;
    }
  }
};

/**
 * Validate a single environment variable
 */
function validateEnvVar(key, config, value) {
  if (config.required && !value) {
    return {
      isValid: false,
      error: `${key} is required but not set`,
      setupInstructions: config.setupInstructions || []
    };
  }
  
  // Use default if not provided and not required
  const finalValue = value || config.default;
  
  if (finalValue && config.validator) {
    const validationError = config.validator(finalValue);
    if (validationError) {
      return {
        isValid: false,
        error: `${key}: ${validationError}`,
        setupInstructions: config.setupInstructions || []
      };
    }
  }
  
  return { isValid: true, value: finalValue };
}

/**
 * Get environment variable with fallback to default
 */
export function getEnvVar(key, defaultValue = null) {
  const value = process.env[key];
  if (value) return value;
  
  const config = OPTIONAL_VARS[key];
  return config?.default || defaultValue;
}

/**
 * Check if we're in production mode
 */
export function isProduction() {
  return getEnvVar('NODE_ENV') === 'production';
}

/**
 * Check if we're in development mode
 */
export function isDevelopment() {
  return getEnvVar('NODE_ENV') === 'development';
}

/**
 * Generate a secure JWT secret
 */
export function generateJWTSecret() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate all environment variables
 */
export function validateEnvironment() {
  const errors = [];
  const warnings = [];
  const validatedVars = {};
  
  console.log('🔍 Validating backend environment variables...');
  
  // Validate required variables
  for (const [key, config] of Object.entries(REQUIRED_VARS)) {
    const value = process.env[key];
    const result = validateEnvVar(key, config, value);
    
    if (!result.isValid) {
      errors.push({
        variable: key,
        error: result.error,
        setupInstructions: result.setupInstructions
      });
      console.error(`❌ ${key}: ${result.error}`);
    } else {
      validatedVars[key] = result.value;
      console.log(`✅ ${key}: configured`);
    }
  }
  
  // Validate optional variables
  for (const [key, config] of Object.entries(OPTIONAL_VARS)) {
    const value = process.env[key];
    const result = validateEnvVar(key, config, value);
    
    if (!result.isValid) {
      warnings.push({
        variable: key,
        error: result.error,
        recommendation: `Fix the value or remove ${key} to use default: ${config.default}`
      });
      console.warn(`⚠️  ${key}: ${result.error}`);
      // Use default value for invalid optional vars
      validatedVars[key] = config.default;
    } else {
      validatedVars[key] = result.value;
      if (!value && config.default) {
        console.log(`💡 ${key}: using default value (${config.default})`);
      } else {
        console.log(`✅ ${key}: configured`);
      }
    }
  }
  
  // Special validation for production environment
  if (isProduction()) {
    const productionWarnings = [];
    
    // Check for placeholder values in production
    if (validatedVars.SUPABASE_URL === 'https://placeholder.supabase.co') {
      productionWarnings.push('SUPABASE_URL is still using placeholder value in production');
    }
    
    if (validatedVars.JWT_SECRET === 'your_jwt_secret_here_generate_a_secure_32_char_string') {
      productionWarnings.push('JWT_SECRET is using placeholder value in production - security risk!');
    }
    
    productionWarnings.forEach(warning => {
      warnings.push({
        variable: 'PRODUCTION',
        error: warning,
        recommendation: 'Update production environment variables'
      });
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    validatedVars,
    canStart: errors.length === 0
  };
}

/**
 * Format validation results for console output
 */
export function formatValidationResults(validationResult) {
  const lines = [];
  
  if (validationResult.isValid) {
    lines.push('🎉 All required environment variables are properly configured!');
  } else {
    lines.push('🚨 Environment Configuration Issues:');
    lines.push('');
    
    for (const error of validationResult.errors) {
      lines.push(`❌ ${error.variable}:`);
      lines.push(`   ${error.error}`);
      if (error.setupInstructions && error.setupInstructions.length > 0) {
        lines.push('   Setup Instructions:');
        error.setupInstructions.forEach(instruction => {
          lines.push(`   ${instruction}`);
        });
      }
      lines.push('');
    }
    
    lines.push('Please fix the above issues before starting the server.');
  }
  
  if (validationResult.warnings.length > 0) {
    lines.push('');
    lines.push('⚠️  Warnings:');
    validationResult.warnings.forEach(warning => {
      lines.push(`   ${warning.variable}: ${warning.error || warning.message}`);
      if (warning.recommendation) {
        lines.push(`   💡 ${warning.recommendation}`);
      }
    });
  }
  
  return lines.join('\\n');
}

/**
 * Exit process with validation error message
 */
export function exitWithValidationError(validationResult) {
  console.error('\\n' + formatValidationResults(validationResult));
  console.error('\\n📝 See ENVIRONMENT_SETUP.md for detailed setup instructions.');
  process.exit(1);
}

/**
 * Initialize and validate environment
 * Should be called at server startup
 */
export function initializeEnvironment() {
  console.log('🚀 Initializing Art-O-Mart Backend Environment...');
  
  const validation = validateEnvironment();
  
  if (!validation.canStart) {
    exitWithValidationError(validation);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('\\n' + formatValidationResults(validation));
  }
  
  console.log('✅ Environment validation completed successfully!');
  return validation.validatedVars;
}