'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Database Health Monitoring Dashboard
 *
 * Real-time monitoring of:
 * - Database connection status
 * - Query performance
 * - RLS policy health
 * - Table statistics
 * - Error rates
 */

interface HealthMetrics {
  database: {
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
    activeConnections: number;
    maxConnections: number;
  };
  tables: {
    name: string;
    rowCount: number;
    size: string;
    lastVacuum: string;
  }[];
  rlsPolicies: {
    table: string;
    policiesCount: number;
    hasErrors: boolean;
    errorDetails?: string;
  }[];
  performance: {
    slowestQueries: {
      query: string;
      avgDuration: number;
      calls: number;
    }[];
    cacheHitRate: number;
    deadlocks: number;
  };
  errors: {
    timestamp: string;
    message: string;
    severity: 'warning' | 'error' | 'critical';
  }[];
}

export default function HealthMonitoringPage() {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealthMetrics = async () => {
    const supabase = createClient();

    try {
      // 1. Check database connection
      const startTime = Date.now();
      const { error: pingError } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
      const responseTime = Date.now() - startTime;

      const databaseStatus: HealthMetrics['database'] = {
        status: pingError ? 'down' : responseTime < 100 ? 'healthy' : 'degraded',
        responseTime,
        activeConnections: 0, // Will be populated by RPC
        maxConnections: 100,
      };

      // 2. Get table statistics
      const { data: tableStats } = await (supabase.rpc as any)('get_table_stats');

      // 3. Get RLS policy health
      const { data: rlsHealth } = await (supabase.rpc as any)('check_rls_health');

      // 4. Get performance metrics
      const { data: perfMetrics } = await (supabase.rpc as any)('get_performance_metrics');

      // 5. Get recent errors from logs
      const { data: recentErrors } = await (supabase as any)
        .from('system_logs')
        .select('*')
        .eq('level', 'error')
        .order('created_at', { ascending: false })
        .limit(10);

      setMetrics({
        database: databaseStatus,
        tables: tableStats || [],
        rlsPolicies: rlsHealth || [],
        performance: perfMetrics || {
          slowestQueries: [],
          cacheHitRate: 0,
          deadlocks: 0,
        },
        errors: recentErrors?.map(err => ({
          timestamp: err.created_at,
          message: err.message,
          severity: err.severity,
        })) || [],
      });

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch health metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthMetrics();

    if (autoRefresh) {
      const interval = setInterval(fetchHealthMetrics, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading health metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Database Health Monitoring</h1>
            <p className="mt-1 text-sm text-gray-500">
              Last updated: {lastUpdate.toLocaleString()}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Auto-refresh (30s)</span>
            </label>

            <button
              onClick={fetchHealthMetrics}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Refresh Now
            </button>
          </div>
        </div>

        {/* Database Status */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatusCard
            title="Database Status"
            value={metrics?.database.status || 'unknown'}
            status={metrics?.database.status}
            subtitle={`Response time: ${metrics?.database.responseTime}ms`}
          />

          <StatusCard
            title="Active Connections"
            value={`${metrics?.database.activeConnections || 0}/${metrics?.database.maxConnections || 100}`}
            status={
              (metrics?.database.activeConnections || 0) / (metrics?.database.maxConnections || 100) > 0.8
                ? 'degraded'
                : 'healthy'
            }
            subtitle="Connection pool usage"
          />

          <StatusCard
            title="Cache Hit Rate"
            value={`${(metrics?.performance.cacheHitRate || 0).toFixed(1)}%`}
            status={
              (metrics?.performance.cacheHitRate || 0) > 90
                ? 'healthy'
                : (metrics?.performance.cacheHitRate || 0) > 70
                ? 'degraded'
                : 'down'
            }
            subtitle="Database cache efficiency"
          />
        </div>

        {/* RLS Policy Health */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-gray-900">RLS Policy Health</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Table
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Policies
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {metrics?.rlsPolicies.map((policy) => (
                  <tr key={policy.table}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {policy.table}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {policy.policiesCount} policies
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {policy.hasErrors ? (
                        <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                          ⚠️ Error
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                          ✓ Healthy
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Slowest Queries */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Slowest Queries</h2>

          <div className="space-y-4">
            {metrics?.performance.slowestQueries.map((query, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <code className="flex-1 overflow-x-auto text-sm text-gray-700">
                    {query.query.substring(0, 100)}...
                  </code>
                  <div className="ml-4 text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {query.avgDuration.toFixed(2)}ms
                    </p>
                    <p className="text-xs text-gray-500">{query.calls} calls</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Table Statistics */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Table Statistics</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Table
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Rows
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Last Vacuum
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {metrics?.tables.map((table) => (
                  <tr key={table.name}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {table.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {table.rowCount.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {table.size}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {table.lastVacuum}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Errors */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Recent Errors</h2>

          <div className="space-y-2">
            {metrics?.errors.length === 0 ? (
              <p className="text-sm text-gray-500">No recent errors 🎉</p>
            ) : (
              metrics?.errors.map((error, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-3 ${
                    error.severity === 'critical'
                      ? 'border-red-300 bg-red-50'
                      : error.severity === 'error'
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-yellow-300 bg-yellow-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{error.message}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(error.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`ml-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        error.severity === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : error.severity === 'error'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {error.severity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  title,
  value,
  status,
  subtitle,
}: {
  title: string;
  value: string;
  status?: 'healthy' | 'degraded' | 'down';
  subtitle: string;
}) {
  const statusColors = {
    healthy: 'bg-green-100 text-green-800',
    degraded: 'bg-yellow-100 text-yellow-800',
    down: 'bg-red-100 text-red-800',
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {status && (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[status]}`}>
            {status}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}
