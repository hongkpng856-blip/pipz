CREATE TABLE IF NOT EXISTS pet_equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  equipment_id TEXT NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN ('head','body','feet','accessory')),
  equipped_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pet_id, slot)
);

CREATE TABLE IF NOT EXISTS inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('equipment','help')),
  quantity INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, item_id)
);

CREATE TABLE IF NOT EXISTS event_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pet_id UUID REFERENCES pets(id) ON DELETE SET NULL,
  event_id TEXT NOT NULL,
  choice_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
