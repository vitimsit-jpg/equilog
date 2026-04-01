-- Migration 055: passer tous les utilisateurs existants au plan ecurie (accès complet)
UPDATE public.users
SET plan = 'ecurie'
WHERE plan IS NULL OR plan != 'ecurie';
