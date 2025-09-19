import React, { useState, useEffect } from 'react';
import Header from '../../components/ui/Header';
import MetricsCard from './components/MetricsCard';
import ProductTable from './components/ProductTable';
import SalesChart from './components/SalesChart';
import OrderManagement from './components/OrderManagement';
import AIContentGenerator from './components/AIContentGenerator';
import QuickActions from './components/QuickActions';
import { WebSocketProvider } from '../ai-shopping-assistant/components/WebSocketManager';
import PricingAssistant from './components/PricingAssistant';
import ProductOptimizer from './components/ProductOptimizer';
import BusinessInsights from './components/BusinessInsights';
import AgentControlPanel from './components/AgentControlPanel';

const ArtisanDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    metrics: {
      totalSales: 45200,
      salesChange: '+12.5%',
      totalOrders: 156,
      ordersChange: '+8.3%',
      activeProducts: 24,
      productsChange: '+2',
      trustScore: 4.8,
      trustChange: '+0.2'
    },
    products: []
  });
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('insights'); // 'insights', 'pricing', 'optimizer', 'content'

  useEffect(() => {
    // In real implementation, fetch data from backend
    const mockProducts = [
      {
        id: 1,
        name: 'Handwoven Silk Saree',
        sku: 'HSS-001',
        category: 'Textiles',
        price: 8500,
        stock: 5,
        status: 'active',
        image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=150',
        lastOptimized: '2025-08-15T10:30:00Z',
        optimizationScore: 85
      },
      {
        id: 2,
        name: 'Wooden Jewelry Box',
        sku: 'WJB-002',
        category: 'Woodwork',
        price: 1200,
        stock: 12,
        status: 'active',
        image: 'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=150',
        lastOptimized: '2025-09-01T14:20:00Z',
        optimizationScore: 92
      },
      {
        id: 3,
        name: 'Ceramic Tea Set',
        sku: 'CTS-003',
        category: 'Pottery',
        price: 3200,
        stock: 0,
        status: 'out_of_stock',
        image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=150',
        lastOptimized: null,
        optimizationScore: 0
      },
      {
        id: 4,
        name: 'Brass Wall Hanging',
        sku: 'BWH-004',
        category: 'Metalwork',
        price: 2800,
        stock: 8,
        status: 'active',
        image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=150',
        lastOptimized: '2025-07-20T09:15:00Z',
        optimizationScore: 78
      }
    ];

    setDashboardData(prev => ({
      ...prev,
      products: mockProducts
    }));
  }, []);

  const handleUpdateProduct = (productId, updateData) => {
    setDashboardData(prev => ({
      ...prev,
      products: prev.products.map(product =>
        product.id === productId
          ? { ...product, ...updateData }
          : product
      )
    }));
  };

  const handleDeleteProduct = (productId) => {
    setDashboardData(prev => ({
      ...prev,
      products: prev.products.filter(product => product.id !== productId)
    }));
  };

  const handleBulkPriceUpdate = (updates) => {
    setDashboardData(prev => ({
      ...prev,
      products: prev.products.map(product => {
        const update = updates.find(u => u.id === product.id);
        return update ? { ...product, price: update.price } : product;
      })
    }));
  };

  const handleBulkOptimization = (updates) => {
    setDashboardData(prev => ({
      ...prev,
      products: prev.products.map(product => {
        const update = updates.find(u => u.productId === product.id);
        if (!update) return product;

        return {
          ...product,
          name: update.title || product.name,
          description: update.description || product.description,
          tags: update.tags || product.tags,
          lastOptimized: new Date().toISOString(),
          optimizationScore: update.score || product.optimizationScore
        };
      })
    }));
  };

  const handleBulkContentGeneration = (updates) => {
    setDashboardData(prev => ({
      ...prev,
      products: prev.products.map(product => {
        const update = updates.find(u => u.productId === product.id);
        if (!update) return product;

        return {
          ...product,
          description: update.content || product.description,
          story: update.story || product.story
        };
      })
    }));
  };

  return (
    <WebSocketProvider>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
            {/* Page Header */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div>
                  <h1 className="text-3xl font-heading font-bold text-foreground">
                    Artisan Dashboard
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    Manage your crafts with AI-powered insights and optimization
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  Last updated: {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>

            {/* Agent Control Panel */}
            <div className="mb-8">
              <AgentControlPanel />
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricsCard
                title="Total Sales"
                value={`₹${dashboardData.metrics.totalSales.toLocaleString()}`}
                change={dashboardData.metrics.salesChange}
                changeType="positive"
                icon="trending-up"
                color="primary"
              />
              <MetricsCard
                title="Total Orders"
                value={dashboardData.metrics.totalOrders}
                change={dashboardData.metrics.ordersChange}
                changeType="positive"
                icon="shopping-bag"
                color="success"
              />
              <MetricsCard
                title="Active Products"
                value={dashboardData.metrics.activeProducts}
                change={dashboardData.metrics.productsChange}
                changeType="positive"
                icon="package"
                color="accent"
              />
              <MetricsCard
                title="Trust Score"
                value={dashboardData.metrics.trustScore}
                change={dashboardData.metrics.trustChange}
                changeType="positive"
                icon="shield"
                color="warning"
              />
            </div>

            {/* AI Insights & Tools */}
            <div className="mb-8">
              <div className="bg-card border border-border rounded-lg shadow-warm-sm overflow-hidden">
                <div className="border-b border-border">
                  <div className="flex overflow-x-auto">
                    <button
                      onClick={() => setActiveTab('insights')}
                      className={`px-4 py-3 text-sm font-medium border-b-2 ${
                        activeTab === 'insights'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Business Insights
                    </button>
                    <button
                      onClick={() => setActiveTab('pricing')}
                      className={`px-4 py-3 text-sm font-medium border-b-2 ${
                        activeTab === 'pricing'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Pricing Assistant
                    </button>
                    <button
                      onClick={() => setActiveTab('optimizer')}
                      className={`px-4 py-3 text-sm font-medium border-b-2 ${
                        activeTab === 'optimizer'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Product Optimizer
                    </button>
                    <button
                      onClick={() => setActiveTab('content')}
                      className={`px-4 py-3 text-sm font-medium border-b-2 ${
                        activeTab === 'content'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Content Generator
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {activeTab === 'insights' && (
                    <BusinessInsights />
                  )}
                  {activeTab === 'pricing' && (
                    <PricingAssistant
                      selectedProducts={selectedProducts}
                      onUpdatePrices={handleBulkPriceUpdate}
                    />
                  )}
                  {activeTab === 'optimizer' && (
                    <ProductOptimizer
                      selectedProducts={selectedProducts}
                      onApplyOptimizations={handleBulkOptimization}
                    />
                  )}
                  {activeTab === 'content' && (
                    <AIContentGenerator />
                  )}
                </div>
              </div>
            </div>

            {/* Product Table */}
            <div className="mb-8">
              <ProductTable
                products={dashboardData.products}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onApplyOptimizations={handleBulkOptimization}
                onApplyPricing={handleBulkPriceUpdate}
                onGenerateContent={handleBulkContentGeneration}
                onProductSelection={setSelectedProducts}
              />
            </div>

            {/* Bottom Section Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Sales Chart */}
              <div>
                <SalesChart />
              </div>
              
              {/* Order Management */}
              <div>
                <OrderManagement />
              </div>
            </div>
          </div>
        </main>
      </div>
    </WebSocketProvider>
  );
};

export default ArtisanDashboard;