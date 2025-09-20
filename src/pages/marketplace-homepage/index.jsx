import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Header from '../../components/ui/Header';
import HeroCarousel from './components/HeroCarousel';
import AISearchBar from './components/AISearchBar';
import CategoryChips from './components/CategoryChips';
import ProductGrid from './components/ProductGrid';
import FeaturedArtisans from './components/FeaturedArtisans';
import TrustIndicators from './components/TrustIndicators';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

const MarketplaceHomepage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: 'all',
    region: 'all',
    priceRange: 'all'
  });

  const handleSearch = (query) => {
    setSearchQuery(query);
    // Scroll to products section
    document.getElementById('products-section')?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  };

  const handleCategoryChange = (category) => {
    setFilters(prev => ({ ...prev, category }));
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="px-6 lg:px-8 py-8 lg:py-12">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Welcome Message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-4"
            >
              <h1 className="text-3xl lg:text-5xl font-heading font-bold text-foreground">
                Discover Authentic
                <span className="text-primary"> Handcrafted </span>
                Treasures
              </h1>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Connect with skilled artisans across India and bring home unique, 
                culturally-rich handmade products with stories that matter.
              </p>
            </motion.div>

            {/* AI Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              data-testid="ai-search-bar"
            >
              <AISearchBar onSearch={handleSearch} />
            </motion.div>

            {/* Hero Carousel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              data-testid="hero-carousel"
            >
              <HeroCarousel />
            </motion.div>
          </div>
        </section>

        {/* Category Navigation */}
        <section className="px-6 lg:px-8 py-8 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              data-testid="category-chips"
            >
              <CategoryChips 
                onCategoryChange={handleCategoryChange}
                onFilterChange={handleFilterChange}
              />
            </motion.div>
          </div>
        </section>

        {/* Products Section */}
        <section id="products-section" className="px-6 lg:px-8 py-12">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              data-testid="product-grid"
            >
              <ProductGrid filters={filters} searchQuery={searchQuery} />
            </motion.div>
          </div>
        </section>

        {/* Featured Artisans Section */}
        <section className="px-6 lg:px-8 py-12 bg-muted/20">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              data-testid="featured-artisans"
            >
              <FeaturedArtisans />
            </motion.div>
          </div>
        </section>

        {/* Trust Indicators Section */}
        <section className="px-6 lg:px-8 py-12">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              data-testid="trust-indicators"
            >
              <TrustIndicators />
            </motion.div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="px-6 lg:px-8 py-16 bg-gradient-to-r from-primary/10 to-secondary/10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              <h2 className="text-2xl lg:text-4xl font-heading font-bold text-foreground">
                Ready to Start Your Journey?
              </h2>
              <p className="text-lg text-muted-foreground">
                Join thousands of customers who have discovered the beauty of authentic handcrafted products.
                Support artisans, preserve traditions, and bring unique stories into your home.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Button 
                variant="default" 
                size="lg" 
                iconName="ShoppingBag"
                onClick={() => document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Start Shopping
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                iconName="Users"
              >
                Meet Our Artisans
              </Button>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-3 gap-8 pt-8 border-t border-border/50"
            >
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">2,500+</div>
                <div className="text-sm text-muted-foreground">Verified Artisans</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">50,000+</div>
                <div className="text-sm text-muted-foreground">Happy Customers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">100K+</div>
                <div className="text-sm text-muted-foreground">Products Sold</div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Newsletter Signup */}
        <section className="px-6 lg:px-8 py-12 bg-card">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-3"
            >
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
                <Icon name="Mail" size={24} className="text-accent" />
              </div>
              <h3 className="text-xl font-heading font-semibold text-foreground">
                Stay Connected with Artisan Stories
              </h3>
              <p className="text-muted-foreground">
                Get weekly updates about new artisans, exclusive products, and cultural insights delivered to your inbox.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <input
                type="email"
                placeholder="Enter your email address"
                className="flex-1 px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
              />
              <Button variant="default" iconName="Send">
                Subscribe
              </Button>
            </motion.div>

            <p className="text-xs text-muted-foreground">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </section>
      </main>
      {/* Footer */}
      <footer className="bg-foreground text-background px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  {/* Custom logo with fallback */}
                  <img 
                    src="/artomart-logo.jpg" 
                    alt="Art O Mart Logo" 
                    className="w-10 h-10 rounded-full object-cover"
                    onError={(e) => {
                      // Fallback to icon-based logo if image doesn't exist
                      e.target.style.display = 'none'
                      e.target.nextSibling.style.display = 'flex'
                    }}
                  />
                  <div className="hidden w-10 h-10 bg-primary rounded-lg items-center justify-center">
                    <Icon name="Palette" size={24} color="var(--color-primary-foreground)" />
                  </div>
                </div>
                <div className="relative">
                  {/* Custom brand name with fallback */}
                  <img 
                    src="/artomart-name.png" 
                    alt="Art O Mart" 
                    className="h-6 object-contain"
                    onError={(e) => {
                      // Fallback to text-based brand if image doesn't exist
                      e.target.style.display = 'none'
                      e.target.nextSibling.style.display = 'flex'
                    }}
                  />
                  <div className="hidden flex-col">
                    <span className="text-xl font-heading font-semibold">Art O Mart</span>
                    <span className="text-xs font-caption opacity-80">Artisan Marketplace</span>
                  </div>
                </div>
              </div>
              <p className="text-sm opacity-80">
                Connecting authentic artisans with conscious consumers, preserving traditional crafts for future generations.
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h4 className="font-heading font-semibold">Quick Links</h4>
              <div className="space-y-2 text-sm opacity-80">
                <div><a href="#" className="hover:opacity-100 transition-opacity">About Us</a></div>
                <div><a href="#" className="hover:opacity-100 transition-opacity">How It Works</a></div>
                <div><a href="#" className="hover:opacity-100 transition-opacity">Artisan Program</a></div>
                <div><a href="#" className="hover:opacity-100 transition-opacity">Quality Promise</a></div>
              </div>
            </div>

            {/* Support */}
            <div className="space-y-4">
              <h4 className="font-heading font-semibold">Support</h4>
              <div className="space-y-2 text-sm opacity-80">
                <div><a href="#" className="hover:opacity-100 transition-opacity">Help Center</a></div>
                <div><a href="#" className="hover:opacity-100 transition-opacity">Shipping Info</a></div>
                <div><a href="#" className="hover:opacity-100 transition-opacity">Returns</a></div>
                <div><a href="#" className="hover:opacity-100 transition-opacity">Contact Us</a></div>
              </div>
            </div>

            {/* Connect */}
            <div className="space-y-4">
              <h4 className="font-heading font-semibold">Connect</h4>
              <div className="flex space-x-3">
                <button className="w-8 h-8 bg-background/10 rounded-full flex items-center justify-center hover:bg-background/20 transition-colors">
                  <Icon name="Facebook" size={16} />
                </button>
                <button className="w-8 h-8 bg-background/10 rounded-full flex items-center justify-center hover:bg-background/20 transition-colors">
                  <Icon name="Instagram" size={16} />
                </button>
                <button className="w-8 h-8 bg-background/10 rounded-full flex items-center justify-center hover:bg-background/20 transition-colors">
                  <Icon name="Twitter" size={16} />
                </button>
              </div>
              <p className="text-sm opacity-80">
                Follow us for artisan stories and product updates
              </p>
            </div>
          </div>

          <div className="border-t border-background/20 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center text-sm opacity-80">
            <p>&copy; {new Date()?.getFullYear()} Art O Mart. All rights reserved.</p>
            <div className="flex space-x-4 mt-4 sm:mt-0">
              <a href="#" className="hover:opacity-100 transition-opacity">Privacy Policy</a>
              <a href="#" className="hover:opacity-100 transition-opacity">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MarketplaceHomepage;