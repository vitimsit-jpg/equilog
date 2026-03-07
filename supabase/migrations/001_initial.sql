-- Equilog — Initial Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'ecurie')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own data" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Horses
CREATE TABLE IF NOT EXISTS public.horses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  breed TEXT,
  birth_year INT,
  discipline TEXT CHECK (discipline IN ('CSO', 'Dressage', 'CCE', 'Endurance', 'Attelage', 'Voltige', 'TREC', 'Hunter', 'Equitation_Western', 'Autre')),
  photo_url TEXT,
  share_horse_index BOOLEAN NOT NULL DEFAULT true,
  region TEXT,
  ecurie TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.horses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own horses" ON public.horses FOR ALL USING (auth.uid() = user_id);

-- Health records
CREATE TABLE IF NOT EXISTS public.health_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  horse_id UUID NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('vaccin', 'vermifuge', 'dentiste', 'osteo', 'ferrage', 'autre')),
  date DATE NOT NULL,
  next_date DATE,
  notes TEXT,
  vet_name TEXT,
  cost NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own health records" ON public.health_records FOR ALL
  USING (EXISTS (SELECT 1 FROM public.horses WHERE horses.id = health_records.horse_id AND horses.user_id = auth.uid()));

-- Training sessions
CREATE TABLE IF NOT EXISTS public.training_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  horse_id UUID NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  duration_min INT NOT NULL CHECK (duration_min > 0),
  intensity INT NOT NULL CHECK (intensity BETWEEN 1 AND 5),
  feeling INT NOT NULL CHECK (feeling BETWEEN 1 AND 5),
  notes TEXT,
  wearable_source TEXT CHECK (wearable_source IN ('equisense', 'seaver', 'garmin', 'equilab', 'autre')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own training sessions" ON public.training_sessions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.horses WHERE horses.id = training_sessions.horse_id AND horses.user_id = auth.uid()));

-- Competitions
CREATE TABLE IF NOT EXISTS public.competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  horse_id UUID NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  event_name TEXT NOT NULL,
  discipline TEXT NOT NULL,
  level TEXT NOT NULL,
  result_rank INT CHECK (result_rank > 0),
  total_riders INT CHECK (total_riders > 0),
  score NUMERIC(10, 3),
  notes TEXT,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own competitions" ON public.competitions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.horses WHERE horses.id = competitions.horse_id AND horses.user_id = auth.uid()));

-- Budget entries
CREATE TABLE IF NOT EXISTS public.budget_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  horse_id UUID NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('pension', 'soins', 'concours', 'equipement', 'maréchalerie', 'alimentation', 'transport', 'autre')),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own budget entries" ON public.budget_entries FOR ALL
  USING (EXISTS (SELECT 1 FROM public.horses WHERE horses.id = budget_entries.horse_id AND horses.user_id = auth.uid()));

-- Wearable data
CREATE TABLE IF NOT EXISTS public.wearable_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  horse_id UUID NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('equisense', 'seaver', 'garmin', 'equilab', 'autre')),
  date DATE NOT NULL,
  raw_json JSONB,
  hr_avg NUMERIC,
  hr_recovery NUMERIC,
  symmetry_score NUMERIC CHECK (symmetry_score BETWEEN 0 AND 100),
  gait_analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wearable_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own wearable data" ON public.wearable_data FOR ALL
  USING (EXISTS (SELECT 1 FROM public.horses WHERE horses.id = wearable_data.horse_id AND horses.user_id = auth.uid()));

-- Horse scores (Horse Index)
CREATE TABLE IF NOT EXISTS public.horse_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  horse_id UUID NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score BETWEEN 0 AND 100),
  score_breakdown JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  percentile_region INT CHECK (percentile_region BETWEEN 0 AND 100),
  percentile_category INT CHECK (percentile_category BETWEEN 0 AND 100),
  region TEXT
);
ALTER TABLE public.horse_scores ENABLE ROW LEVEL SECURITY;
-- Scores are readable by all (for leaderboards), but only horses with share=true
CREATE POLICY "Own horse scores always readable" ON public.horse_scores FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.horses WHERE horses.id = horse_scores.horse_id AND horses.user_id = auth.uid()));
CREATE POLICY "Shared horse scores readable by all" ON public.horse_scores FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.horses WHERE horses.id = horse_scores.horse_id AND horses.share_horse_index = true));
CREATE POLICY "Service role can insert scores" ON public.horse_scores FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.horses WHERE horses.id = horse_scores.horse_id AND horses.user_id = auth.uid()));

-- AI Insights
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  horse_id UUID NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  type TEXT NOT NULL DEFAULT 'weekly' CHECK (type IN ('weekly', 'alert', 'milestone'))
);
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own AI insights" ON public.ai_insights FOR ALL
  USING (EXISTS (SELECT 1 FROM public.horses WHERE horses.id = ai_insights.horse_id AND horses.user_id = auth.uid()));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_horses_user_id ON public.horses(user_id);
CREATE INDEX IF NOT EXISTS idx_health_records_horse_id ON public.health_records(horse_id);
CREATE INDEX IF NOT EXISTS idx_health_records_next_date ON public.health_records(next_date) WHERE next_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_training_sessions_horse_id ON public.training_sessions(horse_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_date ON public.training_sessions(horse_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_competitions_horse_id ON public.competitions(horse_id);
CREATE INDEX IF NOT EXISTS idx_budget_entries_horse_id ON public.budget_entries(horse_id);
CREATE INDEX IF NOT EXISTS idx_horse_scores_horse_id ON public.horse_scores(horse_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_horse_id ON public.ai_insights(horse_id, generated_at DESC);

-- Trigger: auto-create user profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, plan)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    'starter'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
