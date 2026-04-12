-- 060: Templates de semaine type pour le planning

CREATE TABLE IF NOT EXISTS training_week_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Ma semaine type',
  horse_id uuid REFERENCES horses(id) ON DELETE SET NULL,
  sessions jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE training_week_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own templates"
  ON training_week_templates FOR ALL
  USING (auth.uid() = user_id);
