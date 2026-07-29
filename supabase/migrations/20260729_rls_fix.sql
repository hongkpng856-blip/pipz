-- ⚠️ CRITICAL SECURITY FIX — pipz Supabase RLS
-- These tables were created without Row-Level Security.
-- Anyone with the project's public anon key could read/write ALL user data.
-- Run this in Supabase Dashboard → SQL Editor immediately.

-- Enable RLS
ALTER TABLE IF EXISTS pet_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_log ENABLE ROW LEVEL SECURITY;

-- ── pet_equipment policies ──
DROP POLICY IF EXISTS "Users can read own equipment" ON pet_equipment;
CREATE POLICY "Users can read own equipment"
  ON pet_equipment FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own equipment" ON pet_equipment;
CREATE POLICY "Users can insert own equipment"
  ON pet_equipment FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own equipment" ON pet_equipment;
CREATE POLICY "Users can update own equipment"
  ON pet_equipment FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own equipment" ON pet_equipment;
CREATE POLICY "Users can delete own equipment"
  ON pet_equipment FOR DELETE
  USING (auth.uid() = user_id);

-- ── inventory policies ──
DROP POLICY IF EXISTS "Users can read own inventory" ON inventory;
CREATE POLICY "Users can read own inventory"
  ON inventory FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own inventory" ON inventory;
CREATE POLICY "Users can insert own inventory"
  ON inventory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own inventory" ON inventory;
CREATE POLICY "Users can update own inventory"
  ON inventory FOR UPDATE
  USING (auth.uid() = user_id);

-- ── event_log policies ──
DROP POLICY IF EXISTS "Users can read own event_log" ON event_log;
CREATE POLICY "Users can read own event_log"
  ON event_log FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own event_log" ON event_log;
CREATE POLICY "Users can insert own event_log"
  ON event_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ✅ Done. Run `SELECT * FROM pg_policies WHERE tablename IN ('pet_equipment','inventory','event_log');` to verify.
