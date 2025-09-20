import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import ErrorBoundary from "./components/ErrorBoundary";
import NotFound from "pages/NotFound";
import ShoppingCart from './pages/shopping-cart';
import AIShoppingAssistant from './pages/ai-shopping-assistant';
import ArtisanDashboard from './pages/artisan-dashboard';
import MarketplaceHomepage from './pages/marketplace-homepage';
import ArtisanStorefront from './pages/artisan-storefront';
import Register from './pages/register';
import Login from './pages/login';
import Signup from './pages/signup';
import SimpleRegister from './pages/simple-register';
import Settings from './pages/settings';

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <ScrollToTop />
      <RouterRoutes>
        {/* Define your route here */}
        <Route path="/" element={<AIShoppingAssistant />} />
        <Route path="/shopping-cart" element={<ShoppingCart />} />
        <Route path="/ai-shopping-assistant" element={<AIShoppingAssistant />} />
        <Route path="/artisan-dashboard" element={<ArtisanDashboard />} />
        <Route path="/marketplace-homepage" element={<MarketplaceHomepage />} />
        <Route path="/artisan-storefront" element={<ArtisanStorefront />} />
        <Route path="/register" element={<Register />} />
        <Route path="/simple-register" element={<SimpleRegister />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;