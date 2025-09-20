import React, { useState, useEffect, useCallback } from 'react';
import Button from '../../../components/ui/Button';
import AppIcon from '../../../components/AppIcon';
import AgentStatusIndicator from '../../ai-shopping-assistant/components/AgentStatusIndicator';
import TaskProgress from '../../ai-shopping-assistant/components/TaskProgress';
import { useWebSocket } from '../../ai-shopping-assistant/components/WebSocketManager';

const OPTIMIZATION_GOALS = [
  { value: 'title', label: 'Product Title', icon: 'type' },
  { value: 'description', label: 'Description', icon: 'file-text' },
  { value: 'tags', label: 'Tags & Categories', icon: 'tag' },
  { value: 'pricing', label: 'Pricing Strategy', icon: 'dollar-sign' },
  { value: 'images', label: 'Image Optimization', icon: 'image' },
];

export default function ProductOptimizer({
  selectedProducts = [],
  onApplyOptimizations,
  className = ''
}) {
  const [selectedGoals, setSelectedGoals] = useState(['title', 'description']);
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState(null);
  const { socket, isConnected } = useWebSocket();

  // Handle WebSocket events for optimization progress
  useEffect(() => {
    if (!socket) return;

    const handleProgress = (data) => {
      if (data.taskType === 'product-optimization') {
        setProgress(data.progress);
      }
    };

    const handleComplete = (data) => {
      if (data.taskType === 'product-optimization') {
        setIsOptimizing(false);
        setOptimizationResults(data.results);
        setProgress(null);
      }
    };

    socket.on('agent-task-progress', handleProgress);
    socket.on('agent-task-complete', handleComplete);

    return () => {
      socket.off('agent-task-progress', handleProgress);
      socket.off('agent-task-complete', handleComplete);
    };
  }, [socket]);

  const toggleGoal = (goal) => {
    setSelectedGoals(prev => 
      prev.includes(goal)
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const startOptimization = async () => {
    if (!selectedProducts.length || !selectedGoals.length) return;
    
    setIsOptimizing(true);
    setOptimizationResults(null);
    
    try {
      const response = await fetch('/api/agents/artisanAssistant/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'optimizeListing',
          products: selectedProducts,
          goals: selectedGoals,
        })
      });
      
      if (!response.ok) throw new Error('Failed to start optimization');
      
    } catch (error) {
      console.error('Optimization error:', error);
      setIsOptimizing(false);
    }
  };

  const applyOptimizations = useCallback((productId, fields) => {
    if (!optimizationResults || !onApplyOptimizations) return;
    
    const updates = fields.map(field => ({
      productId,
      field,
      value: optimizationResults[productId]?.suggestions[field]?.suggestion
    }));
    
    onApplyOptimizations(updates);
  }, [optimizationResults, onApplyOptimizations]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Product Optimizer
          </h2>
          <p className="text-sm text-muted-foreground">
            AI-powered suggestions to improve your product listings
          </p>
        </div>
        <AgentStatusIndicator 
          status={isOptimizing ? 'running' : 'ready'} 
          showDetails={true}
        />
      </div>

      {/* Product Selection Summary */}
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="font-medium mb-2">
          Selected Products ({selectedProducts.length})
        </h3>
        <div className="text-sm text-muted-foreground">
          {selectedProducts.length ? (
            <ul className="list-disc list-inside">
              {selectedProducts.map(product => (
                <li key={product.id}>{product.name}</li>
              ))}
            </ul>
          ) : (
            <p>No products selected. Please select products from the table.</p>
          )}
        </div>
      </div>

      {/* Optimization Goals */}
      <div>
        <h3 className="font-medium mb-3">What would you like to optimize?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {OPTIMIZATION_GOALS.map(goal => (
            <button
              key={goal.value}
              onClick={() => toggleGoal(goal.value)}
              className={`flex items-center space-x-2 p-3 rounded-lg border ${
                selectedGoals.includes(goal.value)
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-background'
              }`}
            >
              <AppIcon name={goal.icon} className="w-4 h-4" />
              <span className="text-sm font-medium">{goal.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <Button
          variant="outline"
          onClick={() => setSelectedGoals([])}
        >
          Reset Goals
        </Button>
        <Button
          onClick={startOptimization}
          disabled={!selectedProducts.length || !selectedGoals.length || isOptimizing || !isConnected}
        >
          {isOptimizing ? 'Optimizing...' : 'Start Optimization'}
        </Button>
      </div>

      {/* Progress Indicator */}
      {progress && (
        <TaskProgress 
          value={progress.value}
          label={progress.label || 'Optimizing products...'}
        />
      )}

      {/* Optimization Results */}
      {optimizationResults && (
        <div className="space-y-6">
          {selectedProducts.map(product => {
            const results = optimizationResults[product.id];
            if (!results) return null;

            return (
              <div key={product.id} className="bg-card rounded-lg border border-border p-4">
                <h3 className="font-medium mb-4">{product.name}</h3>
                
                <div className="space-y-6">
                  {selectedGoals.map(goal => {
                    const suggestion = results.suggestions[goal];
                    if (!suggestion) return null;

                    return (
                      <div key={goal} className="space-y-3">
                        <h4 className="text-sm font-medium flex items-center space-x-2">
                          <AppIcon 
                            name={OPTIMIZATION_GOALS.find(g => g.value === goal)?.icon} 
                            className="w-4 h-4" 
                          />
                          <span>{OPTIMIZATION_GOALS.find(g => g.value === goal)?.label}</span>
                        </h4>

                        {/* Before/After Comparison */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-background rounded-md p-3">
                            <div className="text-xs text-muted-foreground mb-2">Current</div>
                            <div className="text-sm">
                              {goal === 'tags' 
                                ? product[goal]?.join(', ') 
                                : product[goal]}
                            </div>
                          </div>
                          <div className="bg-background rounded-md p-3">
                            <div className="text-xs text-muted-foreground mb-2">Suggested</div>
                            <div className="text-sm">
                              {goal === 'tags'
                                ? suggestion.suggestion?.join(', ')
                                : suggestion.suggestion}
                            </div>
                          </div>
                        </div>

                        {/* Reasoning */}
                        <div>
                          <h5 className="text-xs font-medium mb-1">Why this change?</h5>
                          <p className="text-xs text-muted-foreground">
                            {suggestion.reasoning}
                          </p>
                        </div>

                        {/* Impact Prediction */}
                        <div className="flex items-center space-x-2">
                          <AppIcon
                            name={suggestion.impact >= 0 ? 'trending-up' : 'trending-down'}
                            className={suggestion.impact >= 0 ? 'text-success' : 'text-destructive'}
                          />
                          <span className="text-xs">
                            Expected Impact: {suggestion.impact > 0 ? '+' : ''}{suggestion.impact}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Apply Buttons */}
                <div className="mt-6 flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyOptimizations(product.id, selectedGoals)}
                  >
                    Apply All Changes
                  </Button>
                  {selectedGoals.map(goal => (
                    <Button
                      key={goal}
                      variant="ghost"
                      size="sm"
                      onClick={() => applyOptimizations(product.id, [goal])}
                    >
                      Apply {OPTIMIZATION_GOALS.find(g => g.value === goal)?.label}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}