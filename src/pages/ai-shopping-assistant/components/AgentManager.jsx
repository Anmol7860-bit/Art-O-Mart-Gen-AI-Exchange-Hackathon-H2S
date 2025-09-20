import { useState, useEffect } from 'react';
import { useWebSocket } from './WebSocketManager';
import { useAuth } from '../../../contexts/AuthContext';
import AgentStatusIndicator from './AgentStatusIndicator';
import Button from '../../../components/ui/Button';

const AGENT_TYPES = {
  productRecommendation: {
    name: 'Product Recommendation',
    description: 'Analyzes preferences and suggests personalized products',
    icon: '🛍️'
  },
  customerSupport: {
    name: 'Customer Support',
    description: 'Handles inquiries and provides shopping assistance',
    icon: '💬'
  },
  artisanAssistant: {
    name: 'Artisan Assistant',
    description: 'Provides cultural context and artisan information',
    icon: '🎨'
  },
  orderProcessing: {
    name: 'Order Processing',
    description: 'Manages orders and inventory queries',
    icon: '📦'
  },
  contentGeneration: {
    name: 'Content Generation',
    description: 'Creates product descriptions and cultural insights',
    icon: '✍️'
  }
};

const AgentManager = () => {
  const { session } = useAuth();
  const { isConnected, subscribe, emit, joinAgentRoom, leaveAgentRoom } = useWebSocket();
  const [agents, setAgents] = useState(
    Object.entries(AGENT_TYPES).reduce((acc, [key, value]) => ({
      ...acc,
      [key]: {
        ...value,
        status: 'idle',
        metrics: {
          responseTime: 0,
          successRate: 0,
          activeTasks: 0
        }
      }
    }), {})
  );

  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to agent events
    const unsubscribeStarted = subscribe('agent-started', ({ type, config }) => {
      setAgents(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          status: 'running',
          config
        }
      }));
    });

    const unsubscribeStopped = subscribe('agent-stopped', ({ type }) => {
      setAgents(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          status: 'idle'
        }
      }));
    });

    const unsubscribeError = subscribe('agent-error', ({ type, error }) => {
      setAgents(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          status: 'error',
          error
        }
      }));
    });

    const unsubscribeMetrics = subscribe('agent-metrics', ({ type, metrics }) => {
      setAgents(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          metrics: {
            ...prev[type].metrics,
            ...metrics
          }
        }
      }));
    });

    // Fetch initial agent statuses
    Object.keys(AGENT_TYPES).forEach(type => {
      joinAgentRoom(type);
      emit('get-agent-status', { type });
    });

    return () => {
      unsubscribeStarted();
      unsubscribeStopped();
      unsubscribeError();
      unsubscribeMetrics();
      Object.keys(AGENT_TYPES).forEach(type => leaveAgentRoom(type));
    };
  }, [isConnected, subscribe, emit, joinAgentRoom, leaveAgentRoom]);

  const handleAgentControl = async (type, action) => {
    if (!isConnected) return;

    try {
      emit(`agent-${action}`, { type });
      setAgents(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          status: action === 'start' ? 'starting' : 'stopping'
        }
      }));
    } catch (error) {
      console.error(`Failed to ${action} agent:`, error);
      setAgents(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          status: 'error',
          error: error.message
        }
      }));
    }
  };

  return (
    <div className="grid gap-4 p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">AI Agents</h2>
      <div className="grid gap-4">
        {Object.entries(agents).map(([type, agent]) => (
          <div
            key={type}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
          >
            <div className="flex items-center space-x-4">
              <span className="text-2xl">{agent.icon}</span>
              <div>
                <h3 className="font-medium">{agent.name}</h3>
                <p className="text-sm text-gray-600">{agent.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <AgentStatusIndicator
                status={agent.status}
                metrics={agent.metrics}
              />
              <div className="flex space-x-2">
                {agent.status === 'idle' || agent.status === 'error' ? (
                  <Button
                    onClick={() => handleAgentControl(type, 'start')}
                    disabled={!isConnected}
                  >
                    Start
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleAgentControl(type, 'stop')}
                    disabled={!isConnected}
                    variant="secondary"
                  >
                    Stop
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgentManager;