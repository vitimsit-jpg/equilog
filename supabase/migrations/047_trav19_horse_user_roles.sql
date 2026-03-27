-- TRAV-19 : Gardien non-cavalier
-- Table horse_user_roles : rôle et relation cavalier/gardien pour chaque cheval

CREATE TABLE IF NOT EXISTS horse_user_roles (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  horse_id    uuid REFERENCES horses(id) ON DELETE CASCADE NOT NULL,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role        text CHECK (role IN ('owner', 'guardian', 'caretaker')) NOT NULL DEFAULT 'owner',
  rides_horse boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now() NOT NULL,
  UNIQUE(horse_id, user_id)
);

ALTER TABLE horse_user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_horse_roles" ON horse_user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_horse_roles" ON horse_user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_horse_roles" ON horse_user_roles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_horse_roles" ON horse_user_roles
  FOR DELETE USING (auth.uid() = user_id);

-- Backfill : créer une entrée owner+rides_horse=true pour tous les chevaux existants
INSERT INTO horse_user_roles (horse_id, user_id, role, rides_horse)
SELECT id, user_id, 'owner', true
FROM horses
ON CONFLICT (horse_id, user_id) DO NOTHING;
