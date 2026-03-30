-- Migration 054: nouveaux profils = plan ecurie par défaut (accès complet)

-- 1. Changer la valeur par défaut de la colonne
ALTER TABLE public.users
  ALTER COLUMN plan SET DEFAULT 'ecurie';

-- 2. Mettre à jour le trigger handle_new_user pour utiliser 'ecurie'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, plan)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    'ecurie'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
