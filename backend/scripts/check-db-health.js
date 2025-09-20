#!/usr/bin/env node

/**
 * Database Health Check Script
 * 
 * This script verifies database connectivity, schema integrity,
 * and validates core functionality for the Art-O-Mart backend.
 */

import { supabaseAdmin, supabaseClient } from '../config/database.js';
import chalk from 'chalk';

const log = {
  info: (msg) => console.log(chalk.blue('ℹ '), msg),
  success: (msg) => console.log(chalk.green('✓ '), msg),
  error: (msg) => console.log(chalk.red('✗ '), msg),
  warning: (msg) => console.log(chalk.yellow('⚠ '), msg)
};

class DatabaseHealthChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.startTime = Date.now();
  }

  async checkConnection() {
    log.info('Checking database connectivity...');
    
    try {
      // Test admin connection
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('categories')
        .select('count', { count: 'exact', head: true });

      if (adminError) {
        throw new Error(`Admin connection failed: ${adminError.message}`);
      }

      // Test client connection  
      const { data: clientData, error: clientError } = await supabaseClient
        .from('categories')
        .select('count', { count: 'exact', head: true });

      if (clientError) {
        throw new Error(`Client connection failed: ${clientError.message}`);
      }

      log.success('Database connectivity verified');
      return true;
    } catch (error) {
      this.errors.push(`Connection check failed: ${error.message}`);
      log.error(`Connection check failed: ${error.message}`);
      return false;
    }
  }

  async checkSchema() {
    log.info('Validating database schema...');
    
    try {
      // Use the helper RPC to check tables exist
      const { data: tables, error: tablesError } = await supabaseAdmin
        .rpc('get_public_tables');

      if (tablesError) {
        throw new Error(`Schema check failed: ${tablesError.message}`);
      }

      const requiredTables = [
        'categories',
        'user_profiles', 
        'artisan_profiles',
        'products',
        'carts',
        'wishlists',
        'orders',
        'order_items',
        'product_reviews',
        'payments',
        'ai_interactions',
        'conversations'
      ];

      const existingTables = tables.map(t => t.table_name);
      const missingTables = requiredTables.filter(table => 
        !existingTables.includes(table)
      );

      if (missingTables.length > 0) {
        this.errors.push(`Missing required tables: ${missingTables.join(', ')}`);
        log.error(`Missing required tables: ${missingTables.join(', ')}`);
        return false;
      }

      log.success(`All ${requiredTables.length} required tables exist`);
      return true;
    } catch (error) {
      this.errors.push(`Schema validation failed: ${error.message}`);
      log.error(`Schema validation failed: ${error.message}`);
      return false;
    }
  }

  async checkIndexes() {
    log.info('Checking critical database indexes...');
    
    try {
      const { data: indexes, error: indexError } = await supabaseAdmin
        .rpc('get_table_indexes');

      if (indexError) {
        throw new Error(`Index check failed: ${indexError.message}`);
      }

      // Critical indexes that should exist
      const criticalIndexes = [
        'products_category_id_idx',
        'products_artisan_id_idx', 
        'orders_customer_id_idx',
        'order_items_order_id_idx',
        'order_items_product_id_idx'
      ];

      const existingIndexes = indexes.map(i => i.indexname);
      const missingIndexes = criticalIndexes.filter(idx => 
        !existingIndexes.includes(idx)
      );

      if (missingIndexes.length > 0) {
        this.warnings.push(`Missing recommended indexes: ${missingIndexes.join(', ')}`);
        log.warning(`Missing recommended indexes: ${missingIndexes.join(', ')}`);
      } else {
        log.success('All critical indexes are present');
      }

      return true;
    } catch (error) {
      this.warnings.push(`Index check failed: ${error.message}`);
      log.warning(`Index check failed: ${error.message}`);
      return false;
    }
  }

  async checkRLS() {
    log.info('Checking Row Level Security policies...');
    
    try {
      // Check that RLS is enabled on critical tables
      const { data: policies, error: policyError } = await supabaseAdmin
        .from('pg_policies')
        .select('schemaname, tablename, policyname')
        .eq('schemaname', 'public');

      if (policyError) {
        // This might fail if we don't have access to pg_policies
        this.warnings.push('Could not check RLS policies - insufficient permissions');
        log.warning('Could not check RLS policies - insufficient permissions');
        return true;
      }

      const tablesWithPolicies = new Set(policies.map(p => p.tablename));
      const criticalTables = ['user_profiles', 'orders', 'carts', 'payments'];
      
      const unprotectedTables = criticalTables.filter(table => 
        !tablesWithPolicies.has(table)
      );

      if (unprotectedTables.length > 0) {
        this.warnings.push(`Tables without RLS policies: ${unprotectedTables.join(', ')}`);
        log.warning(`Tables without RLS policies: ${unprotectedTables.join(', ')}`);
      } else {
        log.success('RLS policies are configured for critical tables');
      }

      return true;
    } catch (error) {
      this.warnings.push(`RLS check failed: ${error.message}`);
      log.warning(`RLS check failed: ${error.message}`);
      return true; // Non-critical failure
    }
  }

  async checkMockData() {
    log.info('Verifying seed data presence...');
    
    try {
      const tables = [
        { name: 'categories', minCount: 1 },
        { name: 'user_profiles', minCount: 3 },
        { name: 'products', minCount: 5 }
      ];

      for (const table of tables) {
        const { count, error } = await supabaseAdmin
          .from(table.name)
          .select('*', { count: 'exact', head: true });

        if (error) {
          throw new Error(`Failed to check ${table.name}: ${error.message}`);
        }

        if (count < table.minCount) {
          this.warnings.push(`${table.name} has only ${count} records (expected >= ${table.minCount})`);
          log.warning(`${table.name} has only ${count} records (expected >= ${table.minCount})`);
        }
      }

      log.success('Seed data verification completed');
      return true;
    } catch (error) {
      this.warnings.push(`Seed data check failed: ${error.message}`);
      log.warning(`Seed data check failed: ${error.message}`);
      return true; // Non-critical failure
    }
  }

  async checkTriggers() {
    log.info('Checking database triggers...');
    
    try {
      // Check for updated_at triggers on key tables
      const { data: triggers, error: triggerError } = await supabaseAdmin
        .from('information_schema.triggers')
        .select('trigger_name, event_object_table')
        .eq('trigger_schema', 'public')
        .like('trigger_name', '%updated_at%');

      if (triggerError) {
        this.warnings.push('Could not check triggers - insufficient permissions');
        log.warning('Could not check triggers - insufficient permissions');
        return true;
      }

      const tablesWithTriggers = new Set(triggers.map(t => t.event_object_table));
      const criticalTables = ['user_profiles', 'products', 'orders'];
      
      const missingTriggers = criticalTables.filter(table => 
        !tablesWithTriggers.has(table)
      );

      if (missingTriggers.length > 0) {
        this.warnings.push(`Tables missing updated_at triggers: ${missingTriggers.join(', ')}`);
        log.warning(`Tables missing updated_at triggers: ${missingTriggers.join(', ')}`);
      } else {
        log.success('Updated_at triggers are configured');
      }

      return true;
    } catch (error) {
      this.warnings.push(`Trigger check failed: ${error.message}`);
      log.warning(`Trigger check failed: ${error.message}`);
      return true; // Non-critical failure
    }
  }

  async run() {
    console.log(chalk.cyan('\n🏥 Art-O-Mart Database Health Check\n'));
    
    const checks = [
      { name: 'Connection', fn: () => this.checkConnection(), critical: true },
      { name: 'Schema', fn: () => this.checkSchema(), critical: true },
      { name: 'Indexes', fn: () => this.checkIndexes(), critical: false },
      { name: 'RLS Policies', fn: () => this.checkRLS(), critical: false },
      { name: 'Triggers', fn: () => this.checkTriggers(), critical: false },
      { name: 'Mock Data', fn: () => this.checkMockData(), critical: false }
    ];

    let criticalFailures = 0;
    let totalFailures = 0;

    for (const check of checks) {
      try {
        const success = await check.fn();
        if (!success) {
          totalFailures++;
          if (check.critical) {
            criticalFailures++;
          }
        }
      } catch (error) {
        totalFailures++;
        if (check.critical) {
          criticalFailures++;
        }
        this.errors.push(`${check.name} check crashed: ${error.message}`);
        log.error(`${check.name} check crashed: ${error.message}`);
      }
    }

    // Summary
    const duration = Date.now() - this.startTime;
    console.log(chalk.cyan('\n📊 Health Check Summary'));
    console.log(`Duration: ${duration}ms`);
    console.log(`Errors: ${this.errors.length}`);
    console.log(`Warnings: ${this.warnings.length}`);

    if (criticalFailures > 0) {
      console.log(chalk.red('\n❌ Critical issues detected - database is not ready'));
      process.exit(1);
    } else if (this.errors.length > 0 || this.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Database has minor issues but is functional'));
      process.exit(0);
    } else {
      console.log(chalk.green('\n✅ Database is healthy and ready'));
      process.exit(0);
    }
  }
}

// Run the health check
if (process.argv[1].endsWith('check-db-health.js')) {
  const checker = new DatabaseHealthChecker();
  checker.run().catch(error => {
    console.error(chalk.red('Health check crashed:'), error);
    process.exit(1);
  });
}

export { DatabaseHealthChecker };