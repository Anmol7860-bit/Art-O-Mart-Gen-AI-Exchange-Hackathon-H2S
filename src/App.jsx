import React, { useState, useEffect } from "react";
import Routes from "./Routes";
import { AuthProvider } from "./contexts/AuthContext";
import { validateEnvironment, formatSetupInstructions, shouldUseMockData, isDevelopment } from "./utils/envValidator";

// Environment configuration error component
function EnvironmentConfigError({ validationResult }) {
  const instructions = formatSetupInstructions(validationResult);
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Environment Configuration Required</h1>
          <p className="text-gray-600">Art-O-Mart needs to be configured before it can run properly.</p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <pre className="text-sm text-gray-800 font-mono whitespace-pre-wrap overflow-x-auto">
            {instructions}
          </pre>
        </div>
        
        {isDevelopment() && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-sm font-medium text-blue-800">Development Mode</h3>
            </div>
            <p className="text-sm text-blue-700">
              You're running in development mode. The app can run with limited functionality using placeholder values, 
              but for full features, please configure the environment variables above.
            </p>
          </div>
        )}
        
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry Configuration
          </button>
          <a
            href="https://github.com/your-repo/Art-O-Mart-Gen-AI-Exchange-Hackathon-H2S#environment-setup"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            View Setup Guide
          </a>
        </div>
      </div>
    </div>
  );
}

// Loading component for environment validation
function EnvironmentLoader() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Validating environment configuration...</p>
      </div>
    </div>
  );
}

function App() {
  const [environmentStatus, setEnvironmentStatus] = useState('loading');
  const [validationResult, setValidationResult] = useState(null);

  useEffect(() => {
    // Validate environment on app startup
    const performValidation = async () => {
      try {
        const result = validateEnvironment();
        setValidationResult(result);
        
        if (result.isValid || result.canRunWithMockData) {
          setEnvironmentStatus('valid');
          
          // Log warnings if any
          if (result.warnings.length > 0) {
            console.warn('Environment configuration suggestions:', result.warnings);
          }
        } else {
          setEnvironmentStatus('invalid');
        }
      } catch (error) {
        console.error('Environment validation failed:', error);
        setEnvironmentStatus('invalid');
      }
    };

    // Small delay to show loading state briefly
    const timer = setTimeout(performValidation, 100);
    return () => clearTimeout(timer);
  }, []);

  // Show loading state during validation
  if (environmentStatus === 'loading') {
    return <EnvironmentLoader />;
  }

  // Show configuration error if validation failed
  if (environmentStatus === 'invalid' && validationResult) {
    return <EnvironmentConfigError validationResult={validationResult} />;
  }

  // Render main application
  return (
    <AuthProvider>
      <Routes />
    </AuthProvider>
  );
}

export default App;