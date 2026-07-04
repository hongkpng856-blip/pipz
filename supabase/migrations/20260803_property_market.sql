-- Add property listing (marketplace) support
-- is_listed = true means the owner wants to sell
-- list_price = the price in steps the seller wants

ALTER TABLE properties
  ADD COLUMN is_listed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN list_price INTEGER;

-- Allow users to update their own properties (for list/unlist/rename)
CREATE POLICY "Users can update own properties"
  ON properties FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for querying listed properties
CREATE INDEX IF NOT EXISTS idx_properties_listed ON properties(is_listed)
  WHERE is_listed = true;
