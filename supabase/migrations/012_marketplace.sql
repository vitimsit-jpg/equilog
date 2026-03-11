-- Marketplace listings table
CREATE TABLE IF NOT EXISTS listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price INTEGER, -- in euros, NULL = nous contacter
  price_negotiable BOOLEAN DEFAULT false,
  category TEXT NOT NULL CHECK (category IN ('cheval', 'materiel', 'service')),
  subcategory TEXT,
  condition TEXT CHECK (condition IN ('neuf', 'bon_etat', 'usage')),
  image_url TEXT,
  location TEXT,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'expired')),
  -- Horse specific
  breed TEXT,
  birth_year INTEGER,
  sexe TEXT CHECK (sexe IN ('hongre', 'jument', 'etalon')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active listings"
  ON listings FOR SELECT USING (status = 'active');

CREATE POLICY "Users can create listings"
  ON listings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listings"
  ON listings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own listings"
  ON listings FOR DELETE USING (auth.uid() = user_id);

-- NOTE: Create a 'marketplace' storage bucket in Supabase Dashboard > Storage
-- Make it public, allow image/* MIME types, max 5MB
