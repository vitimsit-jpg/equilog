-- Horses: mark as confiés with owner info
ALTER TABLE horses ADD COLUMN IF NOT EXISTS is_confie BOOLEAN DEFAULT false;
ALTER TABLE horses ADD COLUMN IF NOT EXISTS owner_name TEXT NULL;

-- To-do écurie
CREATE TABLE IF NOT EXISTS ecurie_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'ponctuel', -- quotidien | hebdo | mensuel | ponctuel
  status TEXT NOT NULL DEFAULT 'a_faire', -- a_faire | en_cours | fait
  assigned_to_name TEXT NULL,
  last_done_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ecurie_todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own todos"
ON ecurie_todos FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
