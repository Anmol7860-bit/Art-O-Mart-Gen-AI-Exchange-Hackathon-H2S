import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { signIn, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e?.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors?.[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData?.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/?.test(formData?.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData?.password) {
      newErrors.password = 'Password is required';
    } else if (formData?.password?.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object?.keys(newErrors)?.length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      const { data, error } = await signIn(formData?.email, formData?.password);
      
      if (error) {
        setErrors({ submit: error?.message || 'Login failed. Please try again.' });
      } else if (data?.user) {
        navigate('/marketplace-homepage');
      }
    } catch (error) {
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const mockCredentials = [
    { email: 'admin@artomart.com', password: 'admin123', role: 'Admin' },
    { email: 'priya.sharma@artomart.com', password: 'artisan123', role: 'Artisan' },
    { email: 'arjun.patel@artomart.com', password: 'artisan123', role: 'Artisan' },
    { email: 'meera.devi@gmail.com', password: 'customer123', role: 'Customer' },
    { email: 'ravi.kumar@gmail.com', password: 'customer123', role: 'Customer' }
  ];

  const handleMockLogin = (credentials) => {
    setFormData({
      email: credentials?.email,
      password: credentials?.password
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-center">
          <div className="w-8 h-8 bg-primary rounded-full animate-bounce mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative w-16 h-16 mx-auto mb-4"
          >
            {/* Custom logo with fallback */}
            <img 
              src="/artomart-logo.jpg" 
              alt="Art O Mart Logo" 
              className="w-16 h-16 rounded-2xl object-cover"
              onError={(e) => {
                // Fallback to CSS-based logo if image doesn't exist
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
            <div className="hidden w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">A</span>
            </div>
          </motion.div>
          <h1 className="text-2xl font-heading font-bold text-foreground mb-2">
            Welcome back to Art O Mart
          </h1>
          <p className="text-muted-foreground">
            Sign in to continue exploring authentic handcrafted treasures
          </p>
        </div>

        {/* Login Form */}
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          onSubmit={handleSubmit}
          className="bg-card p-8 rounded-2xl border border-border shadow-lg space-y-6"
        >
          {errors?.submit && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
              {errors?.submit}
            </div>
          )}

          <div className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              name="email"
              value={formData?.email}
              onChange={handleChange}
              placeholder="Enter your email address"
              error={errors?.email}
              disabled={isSubmitting}
              data-testid="email-input"
            />

            <Input
              label="Password"
              type="password"
              name="password"
              value={formData?.password}
              onChange={handleChange}
              placeholder="Enter your password"
              error={errors?.password}
              disabled={isSubmitting}
              data-testid="password-input"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
              />
              <span className="text-muted-foreground">Remember me</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-primary hover:text-primary/80 font-medium"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={isSubmitting}
            disabled={isSubmitting}
            data-testid="login-button"
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </Button>

          <div className="text-center">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link
              to="/signup"
              className="text-primary hover:text-primary/80 font-medium"
              data-testid="sign-up-link"
            >
              Sign up
            </Link>
          </div>
        </motion.form>

        {/* Demo Credentials */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-6 bg-card p-6 rounded-2xl border border-border"
        >
          <h3 className="text-sm font-semibold text-foreground mb-3">Demo Credentials</h3>
          <div className="space-y-2">
            {mockCredentials?.map((cred, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleMockLogin(cred)}
                className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors duration-200 text-xs"
              >
                <div className="flex justify-between items-center">
                  <span className="text-foreground font-medium">{cred?.role}</span>
                  <span className="text-muted-foreground">{cred?.email}</span>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Click any credential to auto-fill the form
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;