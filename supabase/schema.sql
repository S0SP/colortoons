-- 1. Create Profiles Table
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    coins INTEGER DEFAULT 100,
    total_coins_earned INTEGER DEFAULT 100,
    energy INTEGER DEFAULT 5,
    streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    games_completed INTEGER DEFAULT 0,
    total_regions_filled INTEGER DEFAULT 0,
    total_play_time_seconds INTEGER DEFAULT 0,
    last_played_date TEXT,
    last_energy_refill BIGINT,
    has_seen_onboarding BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- 2. Create Saved Paintings Table (for paused artwork)
CREATE TABLE public.saved_paintings (
    id TEXT PRIMARY KEY, -- We use the local ID format as PK for easy syncing
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    thumbnail_b64 TEXT,
    progress REAL DEFAULT 0,
    total_regions INTEGER,
    filled_regions JSONB,
    backend_data JSONB,
    saved_at BIGINT,
    last_played_at BIGINT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for Saved Paintings
ALTER TABLE public.saved_paintings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved paintings" 
    ON public.saved_paintings FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved paintings" 
    ON public.saved_paintings FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved paintings" 
    ON public.saved_paintings FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved paintings" 
    ON public.saved_paintings FOR DELETE 
    USING (auth.uid() = user_id);

-- 3. Trigger to create a profile automatically when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
