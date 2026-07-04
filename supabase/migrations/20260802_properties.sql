-- Create properties table for Monopoly grid land ownership
-- Each row = one grid cell owned by a player

CREATE TABLE IF NOT EXISTS properties (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anchor_lat DOUBLE PRECISION NOT NULL,
  anchor_lng DOUBLE PRECISION NOT NULL,
  cell_row INTEGER NOT NULL,
  cell_col INTEGER NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  price INTEGER NOT NULL DEFAULT 100,
  name TEXT,
  UNIQUE(anchor_lat, anchor_lng, cell_row, cell_col)
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all properties (see who owns what)
CREATE POLICY "Anyone can read properties"
  ON properties FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to insert their own properties
CREATE POLICY "Users can insert own properties"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own properties (sell/abandon)
CREATE POLICY "Users can delete own properties"
  ON properties FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);

-- Index for fast lookup by cell position
CREATE INDEX IF NOT EXISTS idx_properties_cell ON properties(anchor_lat, anchor_lng, cell_row, cell_col);
