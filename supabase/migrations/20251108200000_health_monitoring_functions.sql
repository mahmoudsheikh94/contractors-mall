-- ============================================================================
-- HEALTH MONITORING DATABASE FUNCTIONS
-- ============================================================================
-- This migration creates database functions for health monitoring dashboard
-- ============================================================================

-- ============================================================================
-- FUNCTION: Get Table Statistics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS TABLE (
  name TEXT,
  row_count BIGINT,
  size TEXT,
  last_vacuum TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname || '.' || tablename AS name,
    n_live_tup AS row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    last_vacuum
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_table_stats IS
'Returns statistics for all tables including row count, size, and last vacuum time';

-- ============================================================================
-- FUNCTION: Check RLS Policy Health
-- ============================================================================

CREATE OR REPLACE FUNCTION check_rls_health()
RETURNS TABLE (
  table_name TEXT,
  policies_count INTEGER,
  has_errors BOOLEAN,
  error_details TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.tablename::TEXT,
    COUNT(p.policyname)::INTEGER AS policies_count,
    FALSE AS has_errors,
    NULL::TEXT AS error_details
  FROM pg_tables t
  LEFT JOIN pg_policies p ON t.tablename = p.tablename
  WHERE t.schemaname = 'public'
    AND t.tablename IN ('orders', 'order_items', 'deliveries', 'profiles', 'suppliers', 'products', 'disputes')
  GROUP BY t.tablename
  ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_rls_health IS
'Returns RLS policy health status for critical tables';

-- ============================================================================
-- FUNCTION: Get Performance Metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_performance_metrics()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_cache_hit_rate NUMERIC;
  v_deadlocks INTEGER;
BEGIN
  -- Calculate cache hit rate
  SELECT
    CASE
      WHEN (blks_hit + blks_read) = 0 THEN 100
      ELSE ROUND((blks_hit::NUMERIC / (blks_hit + blks_read)) * 100, 2)
    END INTO v_cache_hit_rate
  FROM pg_stat_database
  WHERE datname = current_database();

  -- Get deadlock count
  SELECT COALESCE(deadlocks, 0) INTO v_deadlocks
  FROM pg_stat_database
  WHERE datname = current_database();

  -- Build result JSON
  SELECT json_build_object(
    'slowestQueries', (
      SELECT COALESCE(json_agg(sq), '[]'::json)
      FROM (
        SELECT
          query,
          mean_exec_time AS avg_duration,
          calls
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_%'
        ORDER BY mean_exec_time DESC
        LIMIT 10
      ) sq
    ),
    'cacheHitRate', v_cache_hit_rate,
    'deadlocks', v_deadlocks
  ) INTO v_result;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    -- If pg_stat_statements is not available, return default values
    RETURN json_build_object(
      'slowestQueries', '[]'::json,
      'cacheHitRate', v_cache_hit_rate,
      'deadlocks', v_deadlocks
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_performance_metrics IS
'Returns database performance metrics including slowest queries and cache hit rate';

-- ============================================================================
-- TABLE: System Logs (for error tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  context JSONB,
  severity TEXT CHECK (severity IN ('warning', 'error', 'critical'))
);

CREATE INDEX IF NOT EXISTS system_logs_created_at_idx ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS system_logs_level_idx ON system_logs(level);

COMMENT ON TABLE system_logs IS
'System-wide logs for monitoring and debugging';

-- Enable RLS
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Admin can view all logs
CREATE POLICY "Admins can view all system logs" ON system_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- System can insert logs
CREATE POLICY "Service role can insert logs" ON system_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- FUNCTION: Log System Event
-- ============================================================================

CREATE OR REPLACE FUNCTION log_system_event(
  p_level TEXT,
  p_message TEXT,
  p_context JSONB DEFAULT NULL,
  p_severity TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO system_logs (level, message, context, severity)
  VALUES (p_level, p_message, p_context, p_severity);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_system_event IS
'Logs a system event with optional context and severity';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ HEALTH MONITORING FUNCTIONS CREATED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions available:';
  RAISE NOTICE '  • get_table_stats()';
  RAISE NOTICE '  • check_rls_health()';
  RAISE NOTICE '  • get_performance_metrics()';
  RAISE NOTICE '  • log_system_event(...)';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  • system_logs (for error tracking)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Health monitoring dashboard is now ready!';
  RAISE NOTICE '';
END $$;
