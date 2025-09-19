import React, { useState } from 'react';
import AppIcon from '../../../components/AppIcon';
import AppImage from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { AgentStatusIndicator } from '../../ai-shopping-assistant/components/AgentStatusIndicator';
import { TaskProgress } from '../../ai-shopping-assistant/components/TaskProgress';
import { useWebSocket } from '../../ai-shopping-assistant/components/WebSocketManager';

const ProductTable = ({ 
  products,
  onUpdateProduct,
  onDeleteProduct,
  onApplyOptimizations,
  onApplyPricing,
  onGenerateContent
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [bulkOperation, setBulkOperation] = useState(null);
  const [progress, setProgress] = useState(null);
  const { socket, isConnected } = useWebSocket();

  // Handle WebSocket events for bulk operations
  React.useEffect(() => {
    if (!socket) return;

    const handleProgress = (data) => {
      if (data.taskType === bulkOperation?.type) {
        setProgress(data.progress);
      }
    };

    const handleComplete = (data) => {
      if (data.taskType === bulkOperation?.type) {
        setBulkOperation(null);
        setProgress(null);

        // Call appropriate handler based on operation type
        switch (data.taskType) {
          case 'product-optimization':
            onApplyOptimizations(data.results);
            break;
          case 'pricing-analysis':
            onApplyPricing(data.results);
            break;
          case 'content-generation':
            onGenerateContent(data.results);
            break;
        }
      }
    };

    socket.on('agent-task-progress', handleProgress);
    socket.on('agent-task-complete', handleComplete);

    return () => {
      socket.off('agent-task-progress', handleProgress);
      socket.off('agent-task-complete', handleComplete);
    };
  }, [socket, bulkOperation]);

  const handleEdit = (product) => {
    setEditingId(product.id);
    setEditData({
      price: product.price,
      stock: product.stock,
      status: product.status
    });
  };

  const handleSave = (productId) => {
    onUpdateProduct(productId, editData);
    setEditingId(null);
    setEditData({});
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleSelectProduct = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    setSelectedProducts(
      selectedProducts.length === products.length 
        ? [] 
        : products.map(p => p.id)
    );
  };

  const startBulkOperation = async (type) => {
    if (!selectedProducts.length || !isConnected) return;

    setBulkOperation({ type, startTime: Date.now() });
    
    try {
      const response = await fetch('/api/agents/artisanAssistant/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: type === 'product-optimization' ? 'optimizeListing' :
                 type === 'pricing-analysis' ? 'suggestPricing' :
                 'generateListingContent',
          products: selectedProducts,
        })
      });

      if (!response.ok) throw new Error(`Failed to start ${type}`);
      
    } catch (error) {
      console.error('Bulk operation error:', error);
      setBulkOperation(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-success text-success-foreground';
      case 'inactive':
        return 'bg-muted text-muted-foreground';
      case 'out_of_stock':
        return 'bg-destructive text-destructive-foreground';
      case 'optimizing':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getProductOptimizationStatus = (product) => {
    if (product.lastOptimized) {
      const daysSinceOptimization = Math.floor(
        (Date.now() - new Date(product.lastOptimized).getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        status: daysSinceOptimization > 30 ? 'needs-update' : 'optimized',
        message: daysSinceOptimization > 30 
          ? 'Needs optimization'
          : `Optimized ${daysSinceOptimization} days ago`
      };
    }
    return { status: 'not-optimized', message: 'Not optimized' };
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-warm-sm">
      {/* Table Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-heading font-semibold text-foreground">
              Product Inventory
            </h3>
            <p className="text-sm text-muted-foreground">
              {selectedProducts.length} of {products.length} products selected
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {selectedProducts.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startBulkOperation('product-optimization')}
                  disabled={bulkOperation !== null || !isConnected}
                >
                  <AppIcon name="wand-2" size={16} className="mr-2" />
                  Optimize
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startBulkOperation('pricing-analysis')}
                  disabled={bulkOperation !== null || !isConnected}
                >
                  <AppIcon name="dollar-sign" size={16} className="mr-2" />
                  Price Analysis
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startBulkOperation('content-generation')}
                  disabled={bulkOperation !== null || !isConnected}
                >
                  <AppIcon name="sparkles" size={16} className="mr-2" />
                  Generate Content
                </Button>
              </>
            )}
            <Button variant="default" size="sm">
              <AppIcon name="plus" size={16} className="mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Bulk Operation Progress */}
        {bulkOperation && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <AgentStatusIndicator status="running" showDetails={false} />
                <span className="text-sm font-medium">
                  {bulkOperation.type === 'product-optimization' ? 'Optimizing Products' :
                   bulkOperation.type === 'pricing-analysis' ? 'Analyzing Pricing' :
                   'Generating Content'}
                </span>
              </div>
            </div>
            {progress && (
              <TaskProgress 
                value={progress.value}
                label={progress.label || `Processing ${selectedProducts.length} products...`}
              />
            )}
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="p-4 text-left">
                <input
                  type="checkbox"
                  checked={selectedProducts.length === products.length}
                  onChange={handleSelectAll}
                  className="rounded border-border"
                />
              </th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Product</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Category</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Price</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Stock</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Optimization</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const optimizationStatus = getProductOptimizationStatus(product);
              return (
                <tr key={product.id} className="border-b border-border hover:bg-muted/50">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => handleSelectProduct(product.id)}
                      className="rounded border-border"
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden">
                        <AppImage
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{product.name}</p>
                        <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-foreground">{product.category}</td>
                  <td className="p-4">
                    {editingId === product.id ? (
                      <Input
                        type="number"
                        value={editData.price}
                        onChange={(e) => setEditData({...editData, price: e.target.value})}
                        className="w-20"
                      />
                    ) : (
                      <span className="text-sm text-foreground">₹{product.price}</span>
                    )}
                  </td>
                  <td className="p-4">
                    {editingId === product.id ? (
                      <Input
                        type="number"
                        value={editData.stock}
                        onChange={(e) => setEditData({...editData, stock: e.target.value})}
                        className="w-20"
                      />
                    ) : (
                      <span className="text-sm text-foreground">{product.stock}</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                      {product.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${
                        optimizationStatus.status === 'optimized' 
                          ? 'bg-success' 
                          : optimizationStatus.status === 'needs-update'
                          ? 'bg-warning'
                          : 'bg-muted'
                      }`} />
                      <span className="text-xs text-muted-foreground">
                        {optimizationStatus.message}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      {editingId === product.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSave(product.id)}
                          >
                            <AppIcon name="check" size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancel}
                          >
                            <AppIcon name="x" size={16} />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startBulkOperation('product-optimization', [product.id])}
                            disabled={bulkOperation !== null}
                          >
                            <AppIcon name="wand-2" size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(product)}
                          >
                            <AppIcon name="edit-2" size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteProduct(product.id)}
                          >
                            <AppIcon name="trash-2" size={16} />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden p-4 space-y-4">
        {products.map((product) => {
          const optimizationStatus = getProductOptimizationStatus(product);
          return (
            <div key={product.id} className="bg-background border border-border rounded-lg p-4">
              <div className="flex items-start space-x-3 mb-3">
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(product.id)}
                  onChange={() => handleSelectProduct(product.id)}
                  className="mt-1 rounded border-border"
                />
                <div className="w-16 h-16 rounded-lg overflow-hidden">
                  <AppImage
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">{product.name}</h4>
                  <p className="text-sm text-muted-foreground">{product.category}</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(product.status)}`}>
                    {product.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="font-medium text-foreground">₹{product.price}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Stock</p>
                  <p className="font-medium text-foreground">{product.stock}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${
                    optimizationStatus.status === 'optimized' 
                      ? 'bg-success' 
                      : optimizationStatus.status === 'needs-update'
                      ? 'bg-warning'
                      : 'bg-muted'
                  }`} />
                  <span className="text-xs text-muted-foreground">
                    {optimizationStatus.message}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startBulkOperation('product-optimization', [product.id])}
                  disabled={bulkOperation !== null}
                >
                  <AppIcon name="wand-2" size={16} />
                </Button>
                <Button variant="ghost" size="sm">
                  <AppIcon name="edit-2" size={16} />
                </Button>
                <Button variant="ghost" size="sm">
                  <AppIcon name="trash-2" size={16} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProductTable;