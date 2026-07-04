-- Create grid_config table for Monopoly world anchor
-- This stores the fixed geographic anchor for the 6×6 Monopoly grid
-- Shared across all players — server-authoritative, cannot be tampered with client-side

CREATE TABLE IF NOT EXISTS grid_config (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  anchor_lat DOUBLE PRECISION NOT NULL,
  anchor_lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row-level security: only the service role can write, but everyone can read
ALTER TABLE grid_config ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read the grid anchor
CREATE POLICY "Anyone can read grid_config"
  ON grid_config FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert (enforced by USING false + service_role_key bypass)
CREATE POLICY "Only service role can insert grid_config"
  ON grid_config FOR INSERT
  TO authenticated
  WITH CHECK (false);
