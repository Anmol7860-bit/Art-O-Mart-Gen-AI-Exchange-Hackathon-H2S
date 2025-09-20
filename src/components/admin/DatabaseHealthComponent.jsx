/**
 * DatabaseHealthComponent
 * 
 * Admin component for monitoring database health and managing migrations
 * 
 * Features:
 * - Real-time health status display
 * - Connection monitoring
 * - Migration management
 * - Database statistics
 * - Manual refresh controls
 * - Error reporting and diagnostics
 */

import React, { useState, useEffect } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import { Button } from '../ui/Button';

const DatabaseHealthComponent = () => {
  const {
    isHealthy,
    isLoading,
    error,
    lastChecked,
    retryCount,
    healthData,
    refreshHealth,
    checkMigrationStatus,
    getDatabaseStats,
    isConnected,
    isDisconnected,
    needsAttention,
    statusText
  } = useDatabase();

  const [migrationStatus, setMigrationStatus] = useState(null);
  const [databaseStats, setDatabaseStats] = useState({});
  const [showDetails, setShowDetails] = useState(false);

  // Load additional data
  useEffect(() => {
    if (isConnected) {
      checkMigrationStatus().then(setMigrationStatus);
      getDatabaseStats().then(setDatabaseStats);
    }
  }, [isConnected, checkMigrationStatus, getDatabaseStats]);

  const getStatusIcon = () => {
    if (isLoading) return '⏳';
    if (isConnected) return '✅';
    if (isDisconnected) return '❌';
    return '❓';
  };

  const getStatusColor = () => {
    if (isLoading) return 'text-yellow-600';
    if (isConnected) return 'text-green-600';
    if (isDisconnected) return 'text-red-600';
    return 'text-gray-600';
  };

  const getStatusBgColor = () => {
    if (isLoading) return 'bg-yellow-50 border-yellow-200';
    if (isConnected) return 'bg-green-50 border-green-200';
    if (isDisconnected) return 'bg-red-50 border-red-200';
    return 'bg-gray-50 border-gray-200';
  };

  const formatLastChecked = (date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">{getStatusIcon()}</span>
          Database Health
        </h3>
        <Button
          onClick={refreshHealth}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          {isLoading ? 'Checking...' : 'Refresh'}
        </Button>
      </div>

      {/* Main Status Card */}
      <div className={`rounded-lg border p-4 mb-6 ${getStatusBgColor()}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className={`font-semibold text-lg ${getStatusColor()}`}>
              {statusText}
            </div>
            <div className="text-sm text-gray-600">
              Last checked: {formatLastChecked(lastChecked)}
            </div>
            {retryCount > 0 && (
              <div className="text-sm text-orange-600">
                Retry attempts: {retryCount}/5
              </div>
            )}
          </div>
          <div className="text-right">
            {healthData && (
              <div className="text-sm text-gray-600">
                <div>Version: {healthData.version}</div>
                <div>Database: {healthData.database}</div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {needsAttention && !error && (
          <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded text-yellow-700 text-sm">
            <strong>Attention:</strong> Database connection is unstable. Multiple retry attempts have been made.
          </div>
        )}
      </div>

      {/* Migration Status */}
      {migrationStatus && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Migration Status</h4>
          <div className={`p-3 rounded-lg border ${
            migrationStatus.isUpToDate 
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-yellow-50 border-yellow-200 text-yellow-700'
          }`}>
            {migrationStatus.isUpToDate ? (
              <div className="flex items-center gap-2">
                <span>✅</span>
                <span>All migrations are up to date</span>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span>⚠️</span>
                  <span>Missing tables detected</span>
                </div>
                {migrationStatus.missingTables && migrationStatus.missingTables.length > 0 && (
                  <div className="text-sm">
                    Missing: {migrationStatus.missingTables.join(', ')}
                  </div>
                )}
              </div>
            )}
            
            {migrationStatus.error && (
              <div className="text-red-600 text-sm mt-2">
                Error: {migrationStatus.error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Database Statistics */}
      {Object.keys(databaseStats).length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Table Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(databaseStats).map(([table, count]) => (
              <div key={table} className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{count}</div>
                <div className="text-sm text-gray-600 capitalize">
                  {table.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Information */}
      <div>
        <Button
          onClick={() => setShowDetails(!showDetails)}
          variant="ghost"
          size="sm"
          className="text-gray-600"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </Button>

        {showDetails && healthData && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-2">Health Check Details</h5>
            <pre className="text-sm text-gray-600 overflow-x-auto">
              {JSON.stringify(healthData, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {isConnected && (
        <div className="mt-6 pt-4 border-t">
          <h5 className="font-medium text-gray-900 mb-3">Quick Actions</h5>
          <div className="flex gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/api/health', '_blank')}
            >
              View API Health
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                checkMigrationStatus().then(setMigrationStatus);
                getDatabaseStats().then(setDatabaseStats);
              }}
            >
              Refresh Stats
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseHealthComponent;