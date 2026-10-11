-- ============================================================
-- KASAJA RLS AUDIT
-- Run this in Supabase SQL editor to check your security posture
-- ============================================================

-- 1. Tables with RLS DISABLED (these are fully open — fix immediately)
SELECT
  schemaname,
  tablename,
  'RLS DISABLED — anyone with anon key can read/write' AS risk
FROM pg_tables
WHERE schemaname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = tablename
      AND c.relrowsecurity = true
  )
ORDER BY tablename;

-- 2. Policies with "using (true)" or "with check (true)" (fully open policies)
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check,
  'WARNING: Open policy — all rows accessible to everyone' AS risk
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true')
ORDER BY tablename;

-- 3. wallet_transactions — confirm no UPDATE or DELETE policies exist
SELECT
  policyname,
  cmd,
  'CRITICAL: wallet_transactions must be append-only (no UPDATE/DELETE)' AS risk
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'wallet_transactions'
  AND cmd IN ('UPDATE', 'DELETE');

-- 4. profiles — confirm only the owner can update their own row
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY cmd;

-- 5. Summary: tables with RLS enabled vs disabled
SELECT
  COUNT(*) FILTER (WHERE c.relrowsecurity = true) AS rls_enabled,
  COUNT(*) FILTER (WHERE c.relrowsecurity = false) AS rls_disabled,
  COUNT(*) AS total_tables
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r';
