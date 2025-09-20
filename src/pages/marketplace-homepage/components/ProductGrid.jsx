import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from '../../../components/AppImage';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { marketplaceService } from '../../../services/marketplaceService';
import { useAuth } from '../../../contexts/AuthContext';

const ProductGrid = ({ filters, searchQuery }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoveredProduct, setHoveredProduct] = useState(null);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    loadProducts();
  }, [filters, searchQuery]);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const filterParams = {
        ...filters,
        searchQuery,
        limit: 12,
        page: 1
      };
      
      const { data, error: serviceError } = await marketplaceService?.getProducts(filterParams);
      
      if (serviceError) {
        setError(serviceError);
        setProducts([]);
      } else {
        setProducts(data || []);
      }
    } catch (err) {
      setError('Failed to load products. Please try again.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (productId) => {
    if (!user) {
      // Could redirect to login or show login modal
      alert('Please sign in to add items to cart');
      return;
    }

    try {
      const { error } = await marketplaceService?.addToCart(user?.id, productId, 1);
      if (error) {
        alert(`Failed to add to cart: ${error}`);
      } else {
        alert('Item added to cart successfully!');
      }
    } catch (err) {
      alert('Failed to add item to cart');
    }
  };

  const handleAddToWishlist = async (productId) => {
    if (!user) {
      alert('Please sign in to add items to wishlist');
      return;
    }

    try {
      const { error } = await marketplaceService?.addToWishlist(user?.id, productId);
      if (error) {
        alert(`Failed to add to wishlist: ${error}`);
      } else {
        alert('Item added to wishlist!');
      }
    } catch (err) {
      alert('Failed to add item to wishlist');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  const calculateDiscount = (price, originalPrice) => {
    if (!originalPrice) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  };

  const getProductImage = (product, isHovered) => {
    const images = product?.images;
    if (!images || images?.length === 0) {
      return 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop';
    }
    return isHovered && images?.length > 1 ? images?.[1] : images?.[0];
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)]?.map((_, index) => (
          <div key={index} className="bg-card rounded-xl border border-border overflow-hidden animate-pulse">
            <div className="aspect-square bg-muted" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-muted rounded" />
              <div className="h-6 bg-muted rounded w-2/3" />
              <div className="flex items-center space-x-2">
                <div className="h-8 bg-muted rounded-full w-8" />
                <div className="h-4 bg-muted rounded flex-1" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="AlertCircle" size={32} className="text-destructive" />
        </div>
        <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
          Failed to load products
        </h3>
        <p className="text-muted-foreground mb-6">
          {error}
        </p>
        <Button variant="outline" onClick={loadProducts}>
          Try Again
        </Button>
      </div>
    );
  }

  if (products?.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="Search" size={32} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
          No products found
        </h3>
        <p className="text-muted-foreground mb-6">
          Try adjusting your filters or search terms to find what you're looking for.
        </p>
        <Button variant="outline" onClick={() => window?.location?.reload()}>
          Reset Filters
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-heading font-semibold text-foreground">
            {searchQuery ? `Search Results for "${searchQuery}"` : 'Recommended Products'}
          </h3>
          <span className="text-sm text-muted-foreground">
            {products?.length} products found
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <select className="text-sm bg-background border border-border rounded-lg px-3 py-1 text-foreground focus:outline-none focus:border-primary">
            <option value="recommended">Recommended</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
            <option value="newest">Newest First</option>
          </select>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products?.map((product, index) => (
          <motion.div
            key={product?.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            onHoverStart={() => setHoveredProduct(product?.id)}
            onHoverEnd={() => setHoveredProduct(null)}
            className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-warm-md transition-all duration-300 cursor-pointer"
            data-testid="product-card"
          >
            {/* Product Image */}
            <div className="relative aspect-square overflow-hidden">
              <Image
                src={getProductImage(product, hoveredProduct === product?.id)}
                alt={product?.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                data-testid="product-image"
              />
              
              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col space-y-2">
                {product?.is_featured && (
                  <span className="px-2 py-1 bg-accent text-accent-foreground text-xs font-medium rounded-full">
                    Featured
                  </span>
                )}
                {product?.original_price && (
                  <span className="px-2 py-1 bg-success text-success-foreground text-xs font-medium rounded-full">
                    {calculateDiscount(product?.price, product?.original_price)}% OFF
                  </span>
                )}
              </div>

              {/* Quick Actions */}
              <div className="absolute top-3 right-3 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button 
                  onClick={() => handleAddToWishlist(product?.id)}
                  className="w-8 h-8 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-background transition-colors duration-200"
                >
                  <Icon name="Heart" size={16} />
                </button>
                <button className="w-8 h-8 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-background transition-colors duration-200">
                  <Icon name="Eye" size={16} />
                </button>
              </div>

              {/* Trust Score Overlay */}
              {product?.artisan?.trustScore && (
                <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex items-center space-x-1 px-2 py-1 bg-background/90 backdrop-blur-sm rounded-full">
                    <Icon name="Shield" size={12} className="text-success" />
                    <span className="text-xs font-medium text-foreground">
                      {product?.artisan?.trustScore}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="p-4 space-y-3">
              {/* Title and Rating */}
              <div className="space-y-1">
                <h4 
                  className="font-heading font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-200"
                  data-testid="product-title"
                >
                  {product?.title}
                </h4>
                <div className="flex items-center space-x-2">
                  {product?.rating > 0 && (
                    <>
                      <div className="flex items-center space-x-1">
                        <Icon name="Star" size={12} className="text-warning fill-current" />
                        <span className="text-xs font-medium text-foreground">
                          {product?.rating}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        ({product?.reviewCount || 0} reviews)
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="flex items-center space-x-2">
                <span 
                  className="text-lg font-bold text-foreground"
                  data-testid="product-price"
                >
                  {formatPrice(product?.price)}
                </span>
                {product?.original_price && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(product?.original_price)}
                  </span>
                )}
              </div>

              {/* Artisan Info */}
              <div className="flex items-center space-x-2">
                {product?.artisan?.image && (
                  <Image
                    src={product?.artisan?.image}
                    alt={product?.artisan?.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                )}
                <span 
                  className="text-sm text-muted-foreground"
                  data-testid="artisan-name"
                >
                  by {product?.artisan?.name || 'Unknown Artisan'}
                </span>
                {product?.artisan?.verified && (
                  <Icon name="BadgeCheck" size={14} className="text-success" />
                )}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {product?.tags?.slice(0, 2)?.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Add to Cart Button */}
              <Button
                variant="outline"
                size="sm"
                fullWidth
                iconName="ShoppingCart"
                iconPosition="left"
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                onClick={() => handleAddToCart(product?.id)}
              >
                Add to Cart
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Load More */}
      <div className="text-center pt-8">
        <Button variant="outline" size="lg" iconName="Plus" onClick={loadProducts}>
          Load More Products
        </Button>
      </div>
    </div>
  );
};

export default ProductGrid;