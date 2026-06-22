-- Pipz Database Schema
-- Run this in Supabase SQL Editor

-- 1. Users (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  total_steps BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 2. Pets
CREATE TABLE public.pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT DEFAULT '',
  species_id TEXT NOT NULL,
  image_url TEXT DEFAULT '',
  rarity TEXT NOT NULL CHECK (rarity IN ('common','uncommon','rare','epic','legendary')),
  level INT DEFAULT 1,
  xp INT DEFAULT 0,
  total_steps INT DEFAULT 0,
  evolution_stage INT DEFAULT 1,
  status TEXT DEFAULT 'baby' CHECK (status IN ('baby','juvenile','adult','evolved','legendary')),
  speed INT DEFAULT 5,
  luck INT DEFAULT 5,
  charm INT DEFAULT 5,
  energy INT DEFAULT 5,
  mood TEXT DEFAULT 'happy' CHECK (mood IN ('happy','excited','hungry','sleepy','sad')),
  mood_value INT DEFAULT 100,
  last_fed_at TIMESTAMPTZ DEFAULT now(),
  last_interaction_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  is_for_sale BOOLEAN DEFAULT false,
  price INT DEFAULT 0
);

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own pets"
  ON public.pets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pets"
  ON public.pets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pets"
  ON public.pets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pets"
  ON public.pets FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Daily Activity
CREATE TABLE public.daily_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  steps INT DEFAULT 0,
  pets_encountered INT DEFAULT 0,
  achievements TEXT[] DEFAULT '{}',
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own activity"
  ON public.daily_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own activity"
  ON public.daily_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity"
  ON public.daily_activity FOR UPDATE
  USING (auth.uid() = user_id);

-- 4. Eggs
CREATE TABLE public.eggs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('common','uncommon','rare','epic','legendary')),
  collected_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.eggs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own eggs"
  ON public.eggs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own eggs"
  ON public.eggs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own eggs"
  ON public.eggs FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Add favorite_order to pets
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS favorite_order INT;

-- 6. Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES public.profiles(id) NOT NULL,
  buyer_id UUID REFERENCES public.profiles(id),
  pet_id UUID REFERENCES public.pets(id) NOT NULL,
  price INT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

-- 7. Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, read);

-- 8. Atomic buy_pet function (prevents duplicate purchases)
CREATE OR REPLACE FUNCTION public.buy_pet(
  p_pet_id UUID,
  p_buyer_id UUID,
  p_seller_id UUID,
  p_price BIGINT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_for_sale BOOLEAN;
  v_owner UUID;
  v_buyer_steps BIGINT;
BEGIN
  SELECT is_for_sale, user_id INTO v_is_for_sale, v_owner
  FROM public.pets WHERE id = p_pet_id;
  IF NOT v_is_for_sale OR v_owner != p_seller_id THEN
    RETURN FALSE;
  END IF;
  SELECT total_steps INTO v_buyer_steps
  FROM public.profiles WHERE id = p_buyer_id;
  IF v_buyer_steps < p_price THEN
    RAISE EXCEPTION '能量不足';
  END IF;
  UPDATE public.profiles SET total_steps = total_steps - p_price WHERE id = p_buyer_id;
  UPDATE public.profiles SET total_steps = total_steps + p_price WHERE id = p_seller_id;
  UPDATE public.pets SET user_id = p_buyer_id, is_for_sale = FALSE, price = 0 WHERE id = p_pet_id;
  RETURN TRUE;
END;
$$;

CREATE POLICY "Seller can unlist own pets"
  ON public.pets FOR UPDATE
  USING (auth.uid() = user_id AND is_for_sale = true)
  WITH CHECK (auth.uid() = user_id AND is_for_sale = false);

-- 5. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
