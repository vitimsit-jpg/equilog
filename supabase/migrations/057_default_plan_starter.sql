-- Migration 057: nouveaux inscrits → plan starter (gratuit) par défaut

-- 1. Remettre le défaut de la colonne à starter
ALTER TABLE public.users
  ALTER COLUMN plan SET DEFAULT 'starter';

-- 2. Mettre à jour le trigger handle_new_user
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
