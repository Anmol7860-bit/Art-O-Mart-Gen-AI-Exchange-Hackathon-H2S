/**
 * useDatabase Hook
 * 
 * Custom React hook for database health monitoring and migration management
 * 
 * Features:
 * - Real-time database health status
 * - Connection monitoring
 * - Migration status tracking
 * - Automatic retry logic
 * - Error reporting and recovery
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const useDatabase = () => {
  const [isHealthy, setIsHealthy] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  /**
   * Check database health using the health_check RPC function
   */
  const checkHealth = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      // Test basic connection first
      const { data: connectionTest, error: connectionError } = await supabase
        .from('categories')
        .select('count')
        .limit(1);

      if (connectionError) {
        throw new Error(`Connection failed: ${connectionError.message}`);
      }

      // If connection works, check health_check RPC
      const { data: health, error: healthError } = await supabase
        .rpc('health_check');

      if (healthError) {
        throw new Error(`Health check failed: ${healthError.message}`);
      }

      setHealthData(health);
      setIsHealthy(true);
      setLastChecked(new Date());
      setRetryCount(0);

    } catch (err) {
      console.error('Database health check failed:', err);
      setError(err.message);
      setIsHealthy(false);
      setHealthData(null);
      setLastChecked(new Date());
      
      // Implement exponential backoff for retries
      const nextRetryCount = retryCount + 1;
      setRetryCount(nextRetryCount);
      
      if (nextRetryCount < 5) {
        const retryDelay = Math.min(1000 * Math.pow(2, nextRetryCount), 30000);
        setTimeout(() => checkHealth(false), retryDelay);
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [retryCount]);

  /**
   * Force refresh health status
   */
  const refreshHealth = useCallback(() => {
    setRetryCount(0);
    checkHealth(true);
  }, [checkHealth]);

  /**
   * Check if migration is needed (basic version check)
   */
  const checkMigrationStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', [
          'user_profiles',
          'categories', 
          'artisan_profiles',
          'products',
          'orders'
        ]);

      if (error) throw error;

      const requiredTables = ['user_profiles', 'categories', 'artisan_profiles', 'products', 'orders'];
      const existingTables = data.map(table => table.table_name);
      const missingTables = requiredTables.filter(table => !existingTables.includes(table));

      return {
        isUpToDate: missingTables.length === 0,
        missingTables,
        existingTables
      };
    } catch (err) {
      console.error('Migration status check failed:', err);
      return {
        isUpToDate: false,
        error: err.message
      };
    }
  }, []);

  /**
   * Get database statistics
   */
  const getDatabaseStats = useCallback(async () => {
    try {
      const stats = {};
      
      const tables = ['user_profiles', 'categories', 'artisan_profiles', 'products', 'orders'];
      
      for (const table of tables) {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (!error) {
          stats[table] = count;
        }
      }

      return stats;
    } catch (err) {
      console.error('Failed to get database stats:', err);
      return {};
    }
  }, []);

  // Initial health check on mount
  useEffect(() => {
    checkHealth(true);
  }, []);

  // Periodic health checks (every 5 minutes)
  useEffect(() => {
    if (!isHealthy && retryCount >= 5) {
      // Don't set up periodic checks if we've exceeded retry limit
      return;
    }

    const interval = setInterval(() => {
      checkHealth(false);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [checkHealth, isHealthy, retryCount]);

  return {
    // Status
    isHealthy,
    isLoading,
    error,
    lastChecked,
    retryCount,
    
    // Data
    healthData,
    
    // Actions
    refreshHealth,
    checkHealth: () => checkHealth(true),
    checkMigrationStatus,
    getDatabaseStats,
    
    // Computed values
    isConnected: isHealthy === true,
    isDisconnected: isHealthy === false,
    needsAttention: error !== null || retryCount >= 3,
    statusText: isLoading 
      ? 'Checking...' 
      : isHealthy 
        ? 'Healthy' 
        : error 
          ? `Error: ${error}` 
          : 'Unknown'
  };
};