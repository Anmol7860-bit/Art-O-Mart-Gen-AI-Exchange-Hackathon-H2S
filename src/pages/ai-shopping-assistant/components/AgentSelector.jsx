import { useState, useEffect } from 'react';
import { Select } from '../../../components/ui/Select';
import AgentStatusIndicator from './AgentStatusIndicator';

const AGENT_TYPES = {
  productRecommendation: {
    name: 'Product Recommendation',
    description: 'Get personalized product suggestions',
    icon: '🛍️',
    keywords: ['recommend', 'suggest', 'find', 'similar', 'products']
  },
  customerSupport: {
    name: 'Customer Support',
    description: 'Get help with shopping and orders',
    icon: '💬',
    keywords: ['help', 'support', 'question', 'issue', 'order']
  },
  artisanAssistant: {
    name: 'Artisan Assistant',
    description: 'Learn about artisans and their work',
    icon: '🎨',
    keywords: ['artisan', 'craft', 'culture', 'tradition', 'story']
  },
  orderProcessing: {
    name: 'Order Processing',
    description: 'Handle orders and inventory queries',
    icon: '📦',
    keywords: ['order', 'shipping', 'track', 'return', 'inventory']
  },
  contentGeneration: {
    name: 'Content Generation',
    description: 'Get detailed product descriptions',
    icon: '✍️',
    keywords: ['description', 'details', 'features', 'specifications']
  }
};

const AgentSelector = ({
  query = '',
  selectedAgent,
  onSelect,
  agentStatus = {},
  className = ''
}) => {
  const [suggestedAgent, setSuggestedAgent] = useState(null);

  useEffect(() => {
    if (!query) {
      setSuggestedAgent(null);
      return;
    }

    // Suggest agent based on query keywords
    const queryWords = query.toLowerCase().split(' ');
    let bestMatch = {
      type: null,
      matches: 0
    };

    Object.entries(AGENT_TYPES).forEach(([type, agent]) => {
      const matches = agent.keywords.reduce((count, keyword) => {
        return count + (queryWords.includes(keyword.toLowerCase()) ? 1 : 0);
      }, 0);

      if (matches > bestMatch.matches) {
        bestMatch = { type, matches };
      }
    });

    if (bestMatch.matches > 0) {
      setSuggestedAgent(bestMatch.type);
    } else {
      setSuggestedAgent(null);
    }
  }, [query]);

  const options = Object.entries(AGENT_TYPES).map(([type, agent]) => ({
    value: type,
    label: (
      <div className="flex items-center space-x-3">
        <span className="text-xl">{agent.icon}</span>
        <div className="flex-1">
          <div className="font-medium">{agent.name}</div>
          <div className="text-xs text-gray-500">{agent.description}</div>
        </div>
        <AgentStatusIndicator
          status={agentStatus[type]?.status || 'idle'}
          metrics={agentStatus[type]?.metrics}
          showDetails={false}
        />
      </div>
    )
  }));

  return (
    <div className={className}>
      <Select
        value={selectedAgent}
        onChange={onSelect}
        options={options}
        placeholder="Select an agent..."
        className="w-full"
      />
      {suggestedAgent && suggestedAgent !== selectedAgent && (
        <div className="mt-2 text-sm text-gray-600">
          💡 Suggested: {AGENT_TYPES[suggestedAgent].name} for this query
        </div>
      )}
    </div>
  );
};

export default AgentSelector;