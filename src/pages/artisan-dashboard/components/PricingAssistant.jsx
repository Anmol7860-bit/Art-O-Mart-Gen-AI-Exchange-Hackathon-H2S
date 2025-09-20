import React, { useState, useCallback, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import AppIcon from '../../../components/AppIcon';
import AgentStatusIndicator from '../../ai-shopping-assistant/components/AgentStatusIndicator';
import TaskProgress from '../../ai-shopping-assistant/components/TaskProgress';
import { useWebSocket } from '../../ai-shopping-assistant/components/WebSocketManager';

const COMPLEXITY_LEVELS = [
  { value: 'low', label: 'Low - Simple design and basic techniques' },
  { value: 'medium', label: 'Medium - Moderate complexity and some detailed work' },
  { value: 'high', label: 'High - Intricate design and advanced techniques' },
  { value: 'expert', label: 'Expert - Masterwork requiring exceptional skill' },
];

const SEASONALITY_OPTIONS = [
  { value: 'all-year', label: 'All Year Round' },
  { value: 'seasonal', label: 'Seasonal Product' },
  { value: 'festival', label: 'Festival/Event Specific' },
  { value: 'limited', label: 'Limited Edition' },
];

export default function PricingAssistant({ 
  selectedProducts = [],
  onUpdatePrices,
  className = '' 
}) {
  const [productDetails, setProductDetails] = useState({
    materials: '',
    productionTime: '',
    complexity: 'medium',
    category: '',
    region: '',
    seasonality: 'all-year',
    competitorPrices: '',
  });

  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(null);
  const { socket, isConnected } = useWebSocket();

  // Handle WebSocket events for agent progress
  useEffect(() => {
    if (!socket) return;

    const handleProgress = (data) => {
      if (data.taskType === 'pricing-analysis') {
        setProgress(data.progress);
      }
    };

    const handleComplete = (data) => {
      if (data.taskType === 'pricing-analysis') {
        setIsAnalyzing(false);
        setAnalysis(data.results);
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

  const handleInputChange = (field, value) => {
    setProductDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const analyzePricing = async () => {
    if (!selectedProducts.length) return;
    
    setIsAnalyzing(true);
    setAnalysis(null);
    
    try {
      const response = await fetch('/api/agents/artisanAssistant/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggestPricing',
          products: selectedProducts,
          context: productDetails
        })
      });
      
      if (!response.ok) throw new Error('Failed to start pricing analysis');
      
    } catch (error) {
      console.error('Pricing analysis error:', error);
      setIsAnalyzing(false);
    }
  };

  const applyPricing = useCallback(() => {
    if (!analysis || !onUpdatePrices) return;
    
    const updates = selectedProducts.map(product => ({
      id: product.id,
      price: analysis.recommendations[product.id].recommendedPrice,
    }));
    
    onUpdatePrices(updates);
  }, [analysis, selectedProducts, onUpdatePrices]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Pricing Assistant
          </h2>
          <p className="text-sm text-muted-foreground">
            Get AI-powered pricing recommendations for your products
          </p>
        </div>
        <AgentStatusIndicator 
          status={isAnalyzing ? 'running' : 'ready'} 
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

      {/* Product Details Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Materials Cost</label>
            <input
              type="text"
              value={productDetails.materials}
              onChange={e => handleInputChange('materials', e.target.value)}
              placeholder="Enter materials cost..."
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Production Time (hours)</label>
            <input
              type="number"
              value={productDetails.productionTime}
              onChange={e => handleInputChange('productionTime', e.target.value)}
              placeholder="Enter production time..."
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Crafting Complexity</label>
            <select
              value={productDetails.complexity}
              onChange={e => handleInputChange('complexity', e.target.value)}
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
            >
              {COMPLEXITY_LEVELS.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Category</label>
            <input
              type="text"
              value={productDetails.category}
              onChange={e => handleInputChange('category', e.target.value)}
              placeholder="Enter product category..."
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Region</label>
            <input
              type="text"
              value={productDetails.region}
              onChange={e => handleInputChange('region', e.target.value)}
              placeholder="Enter region..."
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Seasonality</label>
            <select
              value={productDetails.seasonality}
              onChange={e => handleInputChange('seasonality', e.target.value)}
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
            >
              {SEASONALITY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Analysis Actions */}
      <div className="flex justify-end space-x-4">
        <Button
          variant="outline"
          onClick={() => setProductDetails({
            materials: '',
            productionTime: '',
            complexity: 'medium',
            category: '',
            region: '',
            seasonality: 'all-year',
            competitorPrices: '',
          })}
        >
          Reset
        </Button>
        <Button
          onClick={analyzePricing}
          disabled={!selectedProducts.length || isAnalyzing || !isConnected}
        >
          {isAnalyzing ? 'Analyzing...' : 'Get Pricing Recommendations'}
        </Button>
      </div>

      {/* Progress Indicator */}
      {progress && (
        <TaskProgress 
          value={progress.value}
          label={progress.label || 'Analyzing pricing...'}
        />
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="font-medium mb-4">Pricing Recommendations</h3>
            
            {Object.entries(analysis.recommendations).map(([productId, rec]) => {
              const product = selectedProducts.find(p => p.id === productId);
              return (
                <div key={productId} className="border-t border-border pt-4 mt-4 first:border-t-0 first:pt-0 first:mt-0">
                  <h4 className="font-medium mb-2">{product?.name}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-background rounded-md p-3">
                      <div className="text-sm text-muted-foreground">Base Price</div>
                      <div className="text-lg font-semibold">₹{rec.basePrice}</div>
                    </div>
                    <div className="bg-background rounded-md p-3">
                      <div className="text-sm text-muted-foreground">Recommended</div>
                      <div className="text-lg font-semibold text-primary">
                        ₹{rec.recommendedPrice}
                      </div>
                    </div>
                    <div className="bg-background rounded-md p-3">
                      <div className="text-sm text-muted-foreground">Price Range</div>
                      <div className="text-lg font-semibold">
                        ₹{rec.priceRange.min} - ₹{rec.priceRange.max}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h5 className="text-sm font-medium mb-2">Pricing Rationale</h5>
                    <p className="text-sm text-muted-foreground">
                      {rec.rationale}
                    </p>
                  </div>

                  <div className="mt-4">
                    <h5 className="text-sm font-medium mb-2">Impact Factors</h5>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {rec.impactFactors.map((factor, idx) => (
                        <li key={idx} className="flex items-center space-x-2">
                          <AppIcon 
                            name={factor.impact === 'positive' ? 'trending-up' : 'trending-down'}
                            className={factor.impact === 'positive' ? 'text-success' : 'text-destructive'}
                          />
                          <span>{factor.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}

            <div className="mt-6 flex justify-end">
              <Button onClick={applyPricing}>
                Apply Recommendations
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}