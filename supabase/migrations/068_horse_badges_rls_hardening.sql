-- Migration 068 : durcir les policies RLS de horse_badges
-- Audit : un attaquant pouvait insérer un badge ciblant un horse_id qui ne lui appartient pas,
-- en mettant son propre user_id (la policy existante checkait juste user_id = auth.uid()).
-- Ce squat polluait le UNIQUE(horse_id, badge_key) du propriétaire légitime.

-- Drop policies existantes (si présentes)
DROP POLICY IF EXISTS "Users can read own horse badges" ON horse_badges;
DROP POLICY IF EXISTS "Users can insert own horse badges" ON horse_badges;

-- Recréer SELECT : autorise lecture si le cheval appartient à l'user
CREATE POLICY "Users can read own horse badges"
  ON horse_badges FOR SELECT
  USING (
    horse_id IN (SELECT id FROM horses WHERE user_id = auth.uid())
  );

-- Recréer INSERT : exige que user_id = auth.uid() ET que le horse appartienne à l'user
CREATE POLICY "Users can insert own horse badges"
  ON horse_badges FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND horse_id IN (SELECT id FROM horses WHERE user_id = auth.uid())
  );

-- Pas de policy UPDATE/DELETE : règle absolue, un badge obtenu n'est jamais modifié ni retiré.
