import React from "react";
import Icon from "./AppIcon";
import monitoring from "../utils/monitoring";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      showDetails: false,
      isRecovering: false
    };
    
    this.maxRetries = 3;
    this.retryTimeouts = [1000, 3000, 5000]; // Progressive retry delays
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Enhanced error logging with monitoring integration
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Capture comprehensive error context
    const errorContext = {
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name,
      props: this.props,
      state: this.state,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      errorId,
      retryCount: this.state.retryCount,
      reactVersion: React.version,
      memory: window.performance?.memory ? {
        used: window.performance.memory.usedJSHeapSize,
        total: window.performance.memory.totalJSHeapSize,
        limit: window.performance.memory.jsHeapSizeLimit
      } : null
    };

    // Capture error with monitoring service
    monitoring.captureError(error, errorContext);
    
    // Track business metric for error occurrence
    monitoring.trackBusinessMetric('error_boundary_triggered', {
      component: this.props.name || 'Unknown',
      error_type: error.name,
      error_message: error.message,
      retry_count: this.state.retryCount,
      is_recoverable: this.isRecoverableError(error)
    });

    // Update state with error details
    this.setState({
      error,
      errorInfo,
      errorId,
      hasError: true
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorContext);
    }

    // Legacy error handling
    error.__ErrorBoundary = true;
    window.__COMPONENT_ERROR__?.(error, errorInfo);
  }

  /**
   * Determine if error is recoverable
   */
  isRecoverableError(error) {
    const recoverableErrors = [
      'ChunkLoadError',
      'NetworkError',
      'TypeError: Failed to fetch',
      'Loading chunk'
    ];
    
    return recoverableErrors.some(pattern => 
      error.message?.includes(pattern) || error.name?.includes(pattern)
    );
  }

  /**
   * Attempt to recover from error
   */
  handleRetry = () => {
    const { retryCount } = this.state;
    
    if (retryCount >= this.maxRetries) {
      monitoring.captureMessage('Max retries exceeded for error boundary', 'warning', {
        error_id: this.state.errorId,
        retry_count: retryCount
      });
      return;
    }

    this.setState({ isRecovering: true });

    // Progressive retry delay
    const delay = this.retryTimeouts[retryCount] || 5000;
    
    setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1,
        isRecovering: false
      });

      // Track retry attempt
      monitoring.trackBusinessMetric('error_boundary_retry', {
        error_id: this.state.errorId,
        retry_count: retryCount + 1,
        delay
      });
    }, delay);
  }

  /**
   * Reset error boundary state
   */
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      showDetails: false,
      isRecovering: false
    });

    monitoring.trackBusinessMetric('error_boundary_reset', {
      error_id: this.state.errorId
    });
  }

  /**
   * Toggle error details display
   */
  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
    
    monitoring.trackInteraction('toggle_error_details', 'error_boundary', {
      error_id: this.state.errorId,
      show_details: !this.state.showDetails
    });
  }

  /**
   * Send feedback about the error
   */
  sendFeedback = () => {
    const feedback = prompt('Please describe what you were doing when this error occurred:');
    
    if (feedback) {
      monitoring.captureMessage('User feedback for error', 'info', {
        error_id: this.state.errorId,
        user_feedback: feedback,
        error_message: this.state.error?.message
      });
      
      alert('Thank you for your feedback! Our team will review this error.');
    }
  }

  render() {
    if (this.state?.hasError) {
      const { error, errorId, retryCount, showDetails, isRecovering } = this.state;
      const canRetry = retryCount < this.maxRetries && this.isRecoverableError(error);
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50">
          <div className="text-center p-8 max-w-2xl">
            {/* Error Icon */}
            <div className="flex justify-center items-center mb-4">
              {isRecovering ? (
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="48px" height="48px" viewBox="0 0 32 33" fill="none">
                  <path d="M16 28.5C22.6274 28.5 28 23.1274 28 16.5C28 9.87258 22.6274 4.5 16 4.5C9.37258 4.5 4 9.87258 4 16.5C4 23.1274 9.37258 28.5 16 28.5Z" stroke="#ef4444" strokeWidth="2" strokeMiterlimit="10" />
                  <path d="M16 11.5V17.5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="16" cy="21.5" r="1" fill="#ef4444" />
                </svg>
              )}
            </div>

            {/* Error Message */}
            <div className="flex flex-col gap-2 text-center mb-6">
              <h1 className="text-2xl font-medium text-neutral-800">
                {isRecovering ? 'Recovering...' : 'Something went wrong'}
              </h1>
              <p className="text-neutral-600 text-base">
                {isRecovering 
                  ? 'Attempting to recover from the error...'
                  : 'We encountered an unexpected error while processing your request.'
                }
              </p>
              
              {errorId && (
                <p className="text-xs text-neutral-500 font-mono bg-neutral-100 px-2 py-1 rounded">
                  Error ID: {errorId}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            {!isRecovering && (
              <div className="flex justify-center items-center gap-3 mb-4">
                {canRetry && (
                  <button
                    onClick={this.handleRetry}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded flex items-center gap-2 transition-colors duration-200 shadow-sm"
                  >
                    <Icon name="RotateCcw" size={16} color="#fff" />
                    Retry ({this.maxRetries - retryCount} left)
                  </button>
                )}
                
                <button
                  onClick={this.handleReset}
                  className="bg-neutral-500 hover:bg-neutral-600 text-white font-medium py-2 px-4 rounded flex items-center gap-2 transition-colors duration-200 shadow-sm"
                >
                  <Icon name="RefreshCw" size={16} color="#fff" />
                  Reset
                </button>
                
                <button
                  onClick={() => window.location.href = "/"}
                  className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded flex items-center gap-2 transition-colors duration-200 shadow-sm"
                >
                  <Icon name="Home" size={16} color="#fff" />
                  Home
                </button>
              </div>
            )}

            {/* Additional Actions */}
            {!isRecovering && (
              <div className="flex justify-center items-center gap-3 text-sm">
                <button
                  onClick={this.toggleDetails}
                  className="text-neutral-600 hover:text-neutral-800 underline"
                >
                  {showDetails ? 'Hide' : 'Show'} Details
                </button>
                
                <button
                  onClick={this.sendFeedback}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Send Feedback
                </button>
              </div>
            )}

            {/* Error Details */}
            {showDetails && !isRecovering && (
              <div className="mt-6 p-4 bg-neutral-100 rounded-lg text-left">
                <h3 className="font-semibold text-neutral-800 mb-2">Error Details:</h3>
                <div className="text-sm text-neutral-700 space-y-2">
                  <div>
                    <strong>Type:</strong> {error?.name || 'Unknown'}
                  </div>
                  <div>
                    <strong>Message:</strong> {error?.message || 'No message available'}
                  </div>
                  <div>
                    <strong>Component:</strong> {this.props.name || 'Unknown Component'}
                  </div>
                  <div>
                    <strong>Timestamp:</strong> {new Date().toLocaleString()}
                  </div>
                  {error?.stack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer font-medium">Stack Trace</summary>
                      <pre className="mt-2 text-xs bg-neutral-200 p-2 rounded overflow-x-auto">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            )}

            {/* Recovery Progress */}
            {isRecovering && (
              <div className="mt-4">
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: '100%' }}
                  ></div>
                </div>
                <p className="text-sm text-neutral-600 mt-2">
                  This may take a few seconds...
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props?.children;
  }
}

export default ErrorBoundary;