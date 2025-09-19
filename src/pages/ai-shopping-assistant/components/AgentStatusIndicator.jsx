import { useEffect, useState } from 'react';
import { AppIcon } from '../../../components/AppIcon';

const statusConfig = {
  idle: {
    color: 'bg-gray-200',
    icon: 'pause',
    label: 'Idle'
  },
  starting: {
    color: 'bg-blue-200 animate-pulse',
    icon: 'refresh',
    label: 'Starting'
  },
  running: {
    color: 'bg-green-200',
    icon: 'check-circle',
    label: 'Running'
  },
  busy: {
    color: 'bg-yellow-200 animate-pulse',
    icon: 'clock',
    label: 'Busy'
  },
  stopping: {
    color: 'bg-orange-200 animate-pulse',
    icon: 'power',
    label: 'Stopping'
  },
  error: {
    color: 'bg-red-200',
    icon: 'alert-circle',
    label: 'Error'
  }
};

const Tooltip = ({ children, content }) => (
  <div className="group relative inline-block">
    {children}
    <div className="hidden group-hover:block absolute z-10 px-2 py-1 mt-2 text-sm text-white bg-gray-900 rounded-md whitespace-nowrap">
      {content}
    </div>
  </div>
);

const MetricsDisplay = ({ metrics }) => (
  <div className="text-xs text-gray-600 space-y-1">
    <div>Response Time: {metrics.responseTime}ms</div>
    <div>Success Rate: {metrics.successRate}%</div>
    <div>Active Tasks: {metrics.activeTasks}</div>
  </div>
);

const AgentStatusIndicator = ({ status, metrics, showDetails = true }) => {
  const config = statusConfig[status] || statusConfig.idle;
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (status === 'starting' || status === 'stopping' || status === 'busy') {
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
    }
  }, [status]);

  return (
    <Tooltip
      content={
        <div className="p-2 space-y-2">
          <div className="font-medium">{config.label}</div>
          {showDetails && metrics && <MetricsDisplay metrics={metrics} />}
        </div>
      }
    >
      <div className="flex items-center space-x-2">
        <div
          className={`w-3 h-3 rounded-full ${config.color} ${
            isAnimating ? 'animate-pulse' : ''
          }`}
        />
        <AppIcon
          name={config.icon}
          className={`w-4 h-4 text-gray-600 ${
            isAnimating ? 'animate-spin' : ''
          }`}
        />
        {showDetails && (
          <span className="text-sm text-gray-600">{config.label}</span>
        )}
      </div>
    </Tooltip>
  );
};

export default AgentStatusIndicator;