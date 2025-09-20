import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import AppIcon from '../../../components/AppIcon';
import AgentStatusIndicator from '../../ai-shopping-assistant/components/AgentStatusIndicator';
import TaskProgress from '../../ai-shopping-assistant/components/TaskProgress';
import { useWebSocket } from '../../ai-shopping-assistant/components/WebSocketManager';

const AGENT_TYPES = {
  artisanAssistant: {
    id: 'artisanAssistant',
    name: 'Artisan Assistant',
    icon: '🎨',
    description: 'AI agent for product optimization, pricing, and business insights',
    features: [
      'Product listing optimization',
      'Intelligent pricing analysis',
      'Business insights and recommendations',
      'Content generation with cultural context'
    ]
  },
  contentGeneration: {
    id: 'contentGeneration',
    name: 'Content Generator',
    icon: '✍️',
    description: 'Specialized content creation for product listings and marketing',
    features: [
      'Product descriptions',
      'Cultural storytelling',
      'Marketing copy',
      'SEO optimization'
    ]
  },
  orderProcessing: {
    id: 'orderProcessing',
    name: 'Order Manager',
    icon: '📦',
    description: 'Automated order processing and customer communication',
    features: [
      'Order status updates',
      'Shipping notifications',
      'Customer inquiries',
      'Inventory management'
    ]
  }
};

export default function AgentControlPanel({ className = '' }) {
  const [agentStatuses, setAgentStatuses] = useState({});
  const [agentMetrics, setAgentMetrics] = useState({});
  const [agentLogs, setAgentLogs] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const { socket, isConnected } = useWebSocket();

  // Handle WebSocket events for agent status updates
  useEffect(() => {
    if (!socket) return;

    const handleAgentStatus = (data) => {
      setAgentStatuses(prev => ({
        ...prev,
        [data.agentId]: data.status
      }));
    };

    const handleAgentMetrics = (data) => {
      setAgentMetrics(prev => ({
        ...prev,
        [data.agentId]: data.metrics
      }));
    };

    const handleAgentLog = (data) => {
      setAgentLogs(prev => [data, ...prev].slice(0, 100));
    };

    socket.on('agent-status', handleAgentStatus);
    socket.on('agent-metrics', handleAgentMetrics);
    socket.on('agent-log', handleAgentLog);

    return () => {
      socket.off('agent-status', handleAgentStatus);
      socket.off('agent-metrics', handleAgentMetrics);
      socket.off('agent-log', handleAgentLog);
    };
  }, [socket]);

  const toggleAgent = async (agentId) => {
    const currentStatus = agentStatuses[agentId];
    const action = currentStatus === 'running' ? 'stop' : 'start';

    try {
      const response = await fetch(`/api/agents/${agentId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`Failed to ${action} agent`);

    } catch (error) {
      console.error(`Agent ${action} error:`, error);
    }
  };

  const configureAgent = async (agentId, config) => {
    setIsConfiguring(true);

    try {
      const response = await fetch(`/api/agents/${agentId}/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) throw new Error('Failed to configure agent');

      setSelectedAgent(null);
    } catch (error) {
      console.error('Agent configuration error:', error);
    } finally {
      setIsConfiguring(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Agent Control Panel
        </h2>
        <p className="text-sm text-muted-foreground">
          Monitor and manage your AI assistants
        </p>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.values(AGENT_TYPES).map(agent => {
          const metrics = agentMetrics[agent.id] || {};
          const status = agentStatuses[agent.id] || 'stopped';

          return (
            <div key={agent.id} className="bg-card rounded-lg border border-border p-4">
              {/* Agent Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{agent.icon}</span>
                  <div>
                    <h3 className="font-medium">{agent.name}</h3>
                    <AgentStatusIndicator 
                      status={status}
                      showDetails={true}
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button
                  variant={status === 'running' ? 'destructive' : 'default'}
                  size="sm"
                  onClick={() => toggleAgent(agent.id)}
                  disabled={!isConnected}
                >
                  {status === 'running' ? 'Stop' : 'Start'}
                </Button>
              </div>

              {/* Agent Metrics */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-background rounded-md p-2">
                  <div className="text-xs text-muted-foreground">Response Time</div>
                  <div className="text-sm font-medium">
                    {metrics.avgResponseTime || '0'}ms
                  </div>
                </div>
                <div className="bg-background rounded-md p-2">
                  <div className="text-xs text-muted-foreground">Success Rate</div>
                  <div className="text-sm font-medium">
                    {metrics.successRate || '0'}%
                  </div>
                </div>
                <div className="bg-background rounded-md p-2">
                  <div className="text-xs text-muted-foreground">Active Tasks</div>
                  <div className="text-sm font-medium">
                    {metrics.activeTasks || '0'}
                  </div>
                </div>
                <div className="bg-background rounded-md p-2">
                  <div className="text-xs text-muted-foreground">Completed</div>
                  <div className="text-sm font-medium">
                    {metrics.completedTasks || '0'}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
                {agent.features.map((feature, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left text-sm px-3 py-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={status !== 'running'}
                  >
                    {feature}
                  </button>
                ))}
              </div>

              {/* Configure Button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-4"
                onClick={() => setSelectedAgent(agent)}
              >
                Configure
              </Button>
            </div>
          );
        })}
      </div>

      {/* Agent Logs */}
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="font-medium mb-4">Agent Activity Log</h3>
        <div className="space-y-2">
          {agentLogs.map((log, idx) => (
            <div 
              key={idx}
              className="flex items-start space-x-3 text-sm bg-background rounded-md p-3"
            >
              <span className="text-lg">
                {AGENT_TYPES[log.agentId]?.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {AGENT_TYPES[log.agentId]?.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1">{log.message}</p>
              </div>
            </div>
          ))}
          {agentLogs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent agent activity
            </p>
          )}
        </div>
      </div>

      {/* Configuration Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-x-4 top-[20%] md:inset-x-1/4 md:top-[25%]">
            <div className="bg-card rounded-lg border border-border shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">
                  Configure {selectedAgent.name}
                </h3>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <AppIcon name="x" className="w-5 h-5" />
                </button>
              </div>

              {/* Configuration Form */}
              <div className="space-y-4">
                {/* Add configuration options based on agent type */}
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedAgent(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => configureAgent(selectedAgent.id, {})}
                    disabled={isConfiguring}
                  >
                    {isConfiguring ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}