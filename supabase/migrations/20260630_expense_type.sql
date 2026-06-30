-- ============================================
-- Migration 20260630: Add type column to administrative_expenses
-- Classifies expenses as 'fixed' (gasto fijo) or 'variable' (gasto variable)
-- ============================================

ALTER TABLE administrative_expenses ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'variable' CHECK (type IN ('fixed', 'variable'));
