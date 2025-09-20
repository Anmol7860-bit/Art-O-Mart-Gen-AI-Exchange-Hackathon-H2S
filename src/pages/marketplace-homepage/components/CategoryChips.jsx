import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Icon from '../../../components/AppIcon';

const CategoryChips = ({ onCategoryChange, onFilterChange }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  const categories = [
    { id: 'all', name: 'All Categories', icon: 'Grid3X3', count: 1247 },
    { id: 'textiles', name: 'Textiles', icon: 'Shirt', count: 324 },
    { id: 'pottery', name: 'Pottery', icon: 'Coffee', count: 189 },
    { id: 'jewelry', name: 'Jewelry', icon: 'Gem', count: 156 },
    { id: 'woodwork', name: 'Woodwork', icon: 'TreePine', count: 143 },
    { id: 'metalwork', name: 'Metalwork', icon: 'Wrench', count: 98 },
    { id: 'leather', name: 'Leather Goods', icon: 'Briefcase', count: 87 },
    { id: 'bamboo', name: 'Bamboo Crafts', icon: 'Leaf', count: 76 }
  ];

  const regions = [
    { id: 'all', name: 'All Regions', count: 1247 },
    { id: 'rajasthan', name: 'Rajasthan', count: 298 },
    { id: 'gujarat', name: 'Gujarat', count: 234 },
    { id: 'uttar-pradesh', name: 'Uttar Pradesh', count: 187 },
    { id: 'west-bengal', name: 'West Bengal', count: 156 },
    { id: 'karnataka', name: 'Karnataka', count: 143 },
    { id: 'tamil-nadu', name: 'Tamil Nadu', count: 129 }
  ];

  const priceRanges = [
    { id: 'all', name: 'All Prices', count: 1247 },
    { id: 'under-1000', name: 'Under ₹1,000', count: 423 },
    { id: '1000-3000', name: '₹1,000 - ₹3,000', count: 387 },
    { id: '3000-5000', name: '₹3,000 - ₹5,000', count: 234 },
    { id: '5000-10000', name: '₹5,000 - ₹10,000', count: 156 },
    { id: 'above-10000', name: 'Above ₹10,000', count: 47 }
  ];

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setSearchResults({ query: searchQuery, count: 42 }); // Mock results
      onFilterChange?.({
        category: selectedCategory,
        region: selectedRegion,
        priceRange: selectedPriceRange,
        searchQuery: searchQuery
      });
    }
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    onCategoryChange?.(categoryId);
    updateFilters(categoryId, selectedRegion, selectedPriceRange);
  };

  const handleRegionSelect = (regionId) => {
    setSelectedRegion(regionId);
    updateFilters(selectedCategory, regionId, selectedPriceRange);
  };

  const handlePriceRangeSelect = (priceRangeId) => {
    setSelectedPriceRange(priceRangeId);
    updateFilters(selectedCategory, selectedRegion, priceRangeId);
  };

  const updateFilters = (category, region, priceRange) => {
    onFilterChange?.({
      category,
      region,
      priceRange
    });
  };

  const clearAllFilters = () => {
    setSelectedCategory('all');
    setSelectedRegion('all');
    setSelectedPriceRange('all');
    onCategoryChange?.('all');
    onFilterChange?.({
      category: 'all',
      region: 'all',
      priceRange: 'all'
    });
  };

  const hasActiveFilters = selectedCategory !== 'all' || selectedRegion !== 'all' || selectedPriceRange !== 'all';

  return (
    <div className="space-y-6">
      {/* Header with Clear Filters */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-heading font-semibold text-foreground">
          Discover by Category
        </h3>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="flex items-center space-x-2 px-3 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <Icon name="X" size={14} />
            <span>Clear All</span>
          </button>
        )}
      </div>
      
      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search products..."
            className="w-full px-4 py-2 pl-10 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none transition-colors duration-200"
            data-testid="search-input"
          />
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>
        <button
          onClick={handleSearch}
          disabled={!searchQuery.trim()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          data-testid="search-button"
        >
          Search
        </button>
      </div>

      {/* Search Results Display */}
      {searchResults && (
        <div className="p-4 bg-muted/50 rounded-lg" data-testid="search-results">
          <p className="text-sm text-muted-foreground">
            Found {searchResults.count} results for "{searchResults.query}"
          </p>
        </div>
      )}
      
      {/* Category Chips */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Craft Categories
        </h4>
        <div className="flex flex-wrap gap-3">
          {categories?.map((category) => (
            <motion.button
              key={category?.id}
              onClick={() => handleCategorySelect(category?.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full border transition-all duration-200 ${
                selectedCategory === category?.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-warm-sm'
                  : 'bg-background text-foreground border-border hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              <Icon name={category?.icon} size={16} />
              <span className="text-sm font-medium">{category?.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                selectedCategory === category?.id
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {category?.count}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
      {/* Region Filter */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          By Region
        </h4>
        <div className="flex flex-wrap gap-2">
          {regions?.map((region) => (
            <motion.button
              key={region?.id}
              onClick={() => handleRegionSelect(region?.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm border transition-all duration-200 ${
                selectedRegion === region?.id
                  ? 'bg-secondary text-secondary-foreground border-secondary'
                  : 'bg-background text-foreground border-border hover:border-secondary/50 hover:bg-secondary/5'
              }`}
            >
              <span>{region?.name}</span>
              <span className={`text-xs ${
                selectedRegion === region?.id
                  ? 'text-secondary-foreground/80'
                  : 'text-muted-foreground'
              }`}>
                ({region?.count})
              </span>
            </motion.button>
          ))}
        </div>
      </div>
      {/* Price Range Filter */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Price Range
        </h4>
        <div className="flex flex-wrap gap-2">
          {priceRanges?.map((priceRange) => (
            <motion.button
              key={priceRange?.id}
              onClick={() => handlePriceRangeSelect(priceRange?.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm border transition-all duration-200 ${
                selectedPriceRange === priceRange?.id
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'bg-background text-foreground border-border hover:border-accent/50 hover:bg-accent/5'
              }`}
            >
              <span>{priceRange?.name}</span>
              <span className={`text-xs ${
                selectedPriceRange === priceRange?.id
                  ? 'text-accent-foreground/80'
                  : 'text-muted-foreground'
              }`}>
                ({priceRange?.count})
              </span>
            </motion.button>
          ))}
        </div>
      </div>
      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="p-4 bg-muted/50 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Icon name="Filter" size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Active Filters:</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Icon name="Package" size={14} />
              <span>
                {categories?.find(c => c?.id === selectedCategory)?.count || 0} products found
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryChips;