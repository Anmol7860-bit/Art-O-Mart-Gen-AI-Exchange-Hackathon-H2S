import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import AppIcon from '../../../components/AppIcon';
import AgentStatusIndicator from '../../ai-shopping-assistant/components/AgentStatusIndicator';
import TaskProgress from '../../ai-shopping-assistant/components/TaskProgress';
import { useWebSocket } from '../../ai-shopping-assistant/components/WebSocketManager';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

const TIME_RANGES = [
  { value: '30d', label: 'Last 30 Days' },
  { value: '3m', label: 'Last 3 Months' },
  { value: '6m', label: 'Last 6 Months' },
  { value: '1y', label: 'Last Year' },
];

export default function BusinessInsights({ className = '' }) {
  const [timeRange, setTimeRange] = useState('30d');
  const [insights, setInsights] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(null);
  const { socket, isConnected } = useWebSocket();

  // Handle WebSocket events for analysis progress
  useEffect(() => {
    if (!socket) return;

    const handleProgress = (data) => {
      if (data.taskType === 'business-insights') {
        setProgress(data.progress);
      }
    };

    const handleComplete = (data) => {
      if (data.taskType === 'business-insights') {
        setIsAnalyzing(false);
        setInsights(data.results);
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

  const generateInsights = async () => {
    setIsAnalyzing(true);
    setInsights(null);
    
    try {
      const response = await fetch('/api/agents/artisanAssistant/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getBusinessInsights',
          timeRange,
        })
      });
      
      if (!response.ok) throw new Error('Failed to generate insights');
      
    } catch (error) {
      console.error('Business insights error:', error);
      setIsAnalyzing(false);
    }
  };

  const exportInsights = () => {
    if (!insights) return;

    const formattedData = JSON.stringify(insights, null, 2);
    const blob = new Blob([formattedData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `business-insights-${timeRange}-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Business Insights
          </h2>
          <p className="text-sm text-muted-foreground">
            AI-powered analysis of your business performance
          </p>
        </div>
        <AgentStatusIndicator 
          status={isAnalyzing ? 'running' : 'ready'} 
          showDetails={true}
        />
      </div>

      {/* Time Range Selection */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium">Time Range:</label>
        <div className="flex space-x-2">
          {TIME_RANGES.map(range => (
            <Button
              key={range.value}
              variant={timeRange === range.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range.value)}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Analysis Actions */}
      <div className="flex justify-end space-x-4">
        <Button
          variant="outline"
          onClick={exportInsights}
          disabled={!insights}
        >
          Export Insights
        </Button>
        <Button
          onClick={generateInsights}
          disabled={isAnalyzing || !isConnected}
        >
          {isAnalyzing ? 'Analyzing...' : 'Generate Insights'}
        </Button>
      </div>

      {/* Progress Indicator */}
      {progress && (
        <TaskProgress 
          value={progress.value}
          label={progress.label || 'Analyzing business data...'}
        />
      )}

      {/* Insights Display */}
      {insights && (
        <div className="space-y-6">
          {/* Sales Trends */}
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="font-medium mb-4">Sales Trends</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={insights.salesTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="var(--primary)" 
                    strokeWidth={2} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {insights.salesMetrics.map(metric => (
                <div key={metric.label} className="bg-background rounded-md p-3">
                  <div className="text-sm text-muted-foreground">{metric.label}</div>
                  <div className="text-lg font-semibold">
                    {metric.prefix || ''}{metric.value}{metric.suffix || ''}
                  </div>
                  <div className="flex items-center space-x-1 text-xs">
                    <AppIcon 
                      name={metric.trend > 0 ? 'trending-up' : 'trending-down'}
                      className={metric.trend > 0 ? 'text-success' : 'text-destructive'}
                    />
                    <span>{Math.abs(metric.trend)}% vs previous period</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="font-medium mb-4">Product Performance</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insights.topProducts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="var(--primary)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4">
              {insights.productInsights.map((insight, idx) => (
                <div key={idx} className="flex items-start space-x-2 mt-2">
                  <AppIcon 
                    name={insight.type === 'success' ? 'check-circle' : 'alert-circle'}
                    className={insight.type === 'success' ? 'text-success' : 'text-warning'}
                  />
                  <p className="text-sm">{insight.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Feedback */}
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="font-medium mb-4">Customer Feedback Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Positives */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center space-x-2">
                  <AppIcon name="thumbs-up" className="text-success" />
                  <span>Top Positives</span>
                </h4>
                <ul className="space-y-2">
                  {insights.customerFeedback.positives.map((item, idx) => (
                    <li key={idx} className="text-sm flex items-start space-x-2">
                      <AppIcon name="check" className="text-success mt-1" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Areas for Improvement */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center space-x-2">
                  <AppIcon name="alert-triangle" className="text-warning" />
                  <span>Areas for Improvement</span>
                </h4>
                <ul className="space-y-2">
                  {insights.customerFeedback.improvements.map((item, idx) => (
                    <li key={idx} className="text-sm flex items-start space-x-2">
                      <AppIcon name="alert-circle" className="text-warning mt-1" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Growth Recommendations */}
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="font-medium mb-4">Growth Recommendations</h3>
            <div className="space-y-4">
              {insights.recommendations.map((rec, idx) => (
                <div key={idx} className="bg-background rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary/10 rounded-lg p-2">
                      <AppIcon 
                        name={rec.category === 'marketing' ? 'megaphone' : 
                             rec.category === 'product' ? 'package' : 'trending-up'} 
                        className="text-primary"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium mb-1">{rec.title}</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {rec.description}
                      </p>
                      <div className="flex items-center space-x-4 text-xs">
                        <span className="flex items-center space-x-1">
                          <AppIcon name="clock" className="w-3 h-3" />
                          <span>Timeline: {rec.timeline}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <AppIcon name="bar-chart" className="w-3 h-3" />
                          <span>Expected Impact: {rec.impact}</span>
                        </span>
                      </div>
                      {rec.steps && (
                        <div className="mt-3">
                          <h5 className="text-xs font-medium mb-2">Implementation Steps:</h5>
                          <ul className="space-y-1">
                            {rec.steps.map((step, stepIdx) => (
                              <li key={stepIdx} className="text-xs flex items-start space-x-2">
                                <span className="text-primary">{stepIdx + 1}.</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}