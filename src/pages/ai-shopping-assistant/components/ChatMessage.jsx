import React from 'react';
import AppIcon from '../../../components/AppIcon';
import AppImage from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import { TaskProgress } from './TaskProgress';
import AgentStatusIndicator from './AgentStatusIndicator';

const AGENT_ICONS = {
  productRecommendation: '🛍️',
  customerSupport: '💬',
  artisanAssistant: '🎨',
  orderProcessing: '📦',
  contentGeneration: '✍️'
};

const AGENT_NAMES = {
  productRecommendation: 'Product Advisor',
  customerSupport: 'Customer Support',
  artisanAssistant: 'Artisan Assistant',
  orderProcessing: 'Order Manager',
  contentGeneration: 'Content Expert'
};

const ChatMessage = ({ 
  id, 
  sender, 
  agentType, 
  text, 
  products, 
  culturalInsight, 
  timestamp, 
  progress,
  actions,
  onViewProduct,
  onAddToCart,
  className = '' 
}) => {
  const isUser = sender === 'user';
  
  const formatTime = (timestamp) => {
    return new Date(timestamp)?.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const agentIcon = AGENT_ICONS[agentType] || '🤖';
  const agentName = AGENT_NAMES[agentType] || 'AI Assistant';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 ${className}`}>
      <div className={`flex max-w-4xl ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isUser ? 'bg-primary' : 'bg-accent'
          }`}>
            {isUser ? (
              <AppIcon 
                name="user"
                className="w-5 h-5 text-primary-foreground" 
              />
            ) : (
              <span className="text-xl">{agentIcon}</span>
            )}
          </div>
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          {/* Agent Name */}
          {!isUser && agentType && (
            <div className="flex items-center space-x-2 mb-1 text-sm text-muted-foreground">
              <span className="font-medium">{agentName}</span>
              <AgentStatusIndicator status="running" showDetails={false} />
            </div>
          )}

          <div className={`rounded-2xl px-4 py-3 max-w-2xl ${
            isUser 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-card text-card-foreground border border-border'
          }`}>
            {/* Text Content */}
            {text && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {text}
              </p>
            )}

            {/* Product Recommendations */}
            {products && products.length > 0 && (
              <div className="mt-4 space-y-3">
                {products.map((product) => (
                  <div key={product.id} className="bg-background rounded-lg border border-border p-4">
                    <div className="flex space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-20 h-20 rounded-lg overflow-hidden">
                          <Image
                            src={product?.image}
                            alt={product?.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-foreground mb-1">
                          {product?.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          by {product?.artisan}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-primary">
                            ₹{product?.price?.toLocaleString()}
                          </span>
                          <div className="flex items-center space-x-1">
                            <Icon name="Star" size={12} className="text-warning fill-current" />
                            <span className="text-xs text-muted-foreground">
                              {product?.rating}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2 mt-3">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => onViewProduct(product?.id)}
                            className="text-xs"
                          >
                            View Details
                          </Button>
                          <Button
                            variant="default"
                            size="xs"
                            iconName="ShoppingCart"
                            iconPosition="left"
                            iconSize={12}
                            onClick={() => onAddToCart(product?.id)}
                            className="text-xs"
                          >
                            Add to Cart
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cultural Insights */}
            {culturalInsight && (
              <div className="mt-4 p-3 bg-muted rounded-lg border-l-4 border-accent">
                <div className="flex items-start space-x-2">
                  <AppIcon name="lightbulb" size={16} className="text-accent mt-0.5" />
                  <div>
                    <h5 className="text-xs font-semibold text-foreground mb-1">
                      Cultural Insight
                    </h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {culturalInsight}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {/* Actions */}
            {actions && actions.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant || 'secondary'}
                    size="xs"
                    onClick={action.onClick}
                    className="text-xs"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}

            {/* Task Progress */}
            {progress && (
              <div className="mt-4">
                <TaskProgress value={progress.value} label={progress.label} />
              </div>
            )}
          </div>

          {/* Timestamp */}
          <span className="text-xs text-muted-foreground mt-1 px-2">
            {formatTime(timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;