import { useState, useEffect } from 'react';
import AppIcon from '../../../components/AppIcon';

const TaskProgress = ({
  taskId,
  agentType,
  status,
  progress,
  message,
  estimatedTime,
  error,
  onCancel,
  onRetry
}) => {
  const [timeLeft, setTimeLeft] = useState(estimatedTime);

  useEffect(() => {
    if (status !== 'in-progress' || !estimatedTime) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = Math.max(0, prev - 1000);
        if (newTime === 0) clearInterval(timer);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, estimatedTime]);

  const getStatusIcon = () => {
    switch (status) {
      case 'in-progress':
        return <AppIcon name="refresh" className="w-5 h-5 animate-spin text-blue-500" />;
      case 'completed':
        return <AppIcon name="check-circle" className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AppIcon name="alert-circle" className="w-5 h-5 text-red-500" />;
      default:
        return <AppIcon name="clock" className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTimeLeft = (ms) => {
    if (!ms) return '';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-medium">
              {agentType} Task {taskId}
            </h3>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
        </div>
        {status === 'in-progress' && timeLeft > 0 && (
          <span className="text-sm text-gray-500">
            {formatTimeLeft(timeLeft)} remaining
          </span>
        )}
      </div>

      {status === 'in-progress' && (
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block text-blue-600">
                {Math.round(progress)}%
              </span>
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            )}
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-100">
            <div
              style={{ width: `${progress}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex items-start">
            <AppIcon name="alert-circle" className="w-5 h-5 text-red-500 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-1 text-sm text-red-700">{error}</div>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {status === 'completed' && (
        <div className="text-sm text-green-600">Task completed successfully</div>
      )}
    </div>
  );
};

export default TaskProgress;