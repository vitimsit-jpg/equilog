-- BIBL-25 — Bibliothèque d'exercices
-- Tables: exercises, user_exercise_favorites
-- Bucket: exercise-schemas (images piste)

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exercises (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT        NOT NULL,
  description   TEXT,
  objectifs     TEXT[]      DEFAULT '{}',
  category      TEXT        NOT NULL,  -- 'plat' | 'obstacle' | 'cross' | 'longe' | 'travail_a_pied'
  tags          TEXT[]      DEFAULT '{}',
  schema_url    TEXT,                  -- URL image schéma piste (bucket exercise-schemas)
  video_url     TEXT,
  training_type TEXT        NOT NULL,  -- TrainingType value
  difficulty    TEXT        NOT NULL DEFAULT 'intermediaire', -- 'debutant' | 'intermediaire' | 'avance'
  duration_min  INTEGER,               -- durée suggérée en minutes
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_exercise_favorites (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, exercise_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS exercises_category_idx ON exercises(category);
CREATE INDEX IF NOT EXISTS exercises_training_type_idx ON exercises(training_type);
CREATE INDEX IF NOT EXISTS user_exercise_favorites_user_idx ON user_exercise_favorites(user_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_exercise_favorites ENABLE ROW LEVEL SECURITY;

-- Exercices visibles par tous les utilisateurs connectés (catalogue partagé)
CREATE POLICY "exercises_select" ON exercises
  FOR SELECT TO authenticated USING (true);

-- Favoris : chaque utilisateur gère les siens
CREATE POLICY "favorites_select" ON user_exercise_favorites
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert" ON user_exercise_favorites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_delete" ON user_exercise_favorites
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── Storage bucket ────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-schemas', 'exercise-schemas', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "exercise_schemas_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'exercise-schemas');

-- ── Données initiales — 9 exercices ───────────────────────────────────────────

INSERT INTO exercises (title, description, objectifs, category, tags, training_type, difficulty, duration_min) VALUES

-- PLAT (2)
(
  'Transitions trot-galop sur cercle',
  'Enchaîner des transitions trot → galop → trot sur un cercle de 20m, en cherchant des départs légers et un galop rassemblé. Commencer à main gauche puis à main droite.',
  ARRAY['Réactivité aux aides', 'Équilibre au galop', 'Rassembler progressif'],
  'plat',
  ARRAY['transitions', 'cercle', 'galop', 'équilibre'],
  'plat',
  'intermediaire',
  25
),
(
  'Serpentine 3 pistes au trot',
  'Tracer une serpentine en 3 boucles égales sur la longueur du manège, en cherchant un pli régulier et des changements de main fluides. Reprendre en cédant à la jambe entre chaque boucle.',
  ARRAY['Souplesse latérale', 'Pli et contre-pli', 'Régularité du trot'],
  'plat',
  ARRAY['serpentine', 'trot', 'souplesse', 'latéral'],
  'plat',
  'debutant',
  20
),

-- OBSTACLES / MÉCA (2)
(
  'Ligne de cavalettis en rythme',
  'Poser 4 cavalettis en ligne, espacés de 1,30m (trot) ou 3,60m (canter). Passer la ligne en maintenant un rythme constant sans accélérer. Varier les hauteurs progressivement.',
  ARRAY['Rythme et régularité', 'Regard', 'Engagement des postérieurs'],
  'obstacle',
  ARRAY['cavalettis', 'rythme', 'ligne', 'engagement'],
  'meca_obstacles',
  'debutant',
  20
),
(
  'Oxer avec filet en approche',
  'Poser un filet d''approche à 3 foulées d''un oxer moyen. Chercher une impulsion franche au filet pour aborder l''oxer avec amplitude. Alterner avec un simple vertical pour travailler la variation.',
  ARRAY['Impulsion', 'Mesure des foulées', 'Amplitude au saut'],
  'obstacle',
  ARRAY['oxer', 'filet', 'impulsion', 'foulées'],
  'meca_obstacles',
  'intermediaire',
  30
),

-- CROSS (2)
(
  'Tronc couché en sortie de virage',
  'Aborder un tronc couché (ou simulé) après un virage serré à droite puis à gauche. Travailler l''équilibre en virage et le maintien de l''impulsion jusqu''à l''obstacle.',
  ARRAY['Équilibre en virage', 'Impulsion constante', 'Confiance sur obstacle naturel'],
  'cross',
  ARRAY['tronc', 'virage', 'naturel', 'équilibre'],
  'cross_entrainement',
  'intermediaire',
  30
),
(
  'Banquette suivi d''un fossé',
  'Enchaîner une banquette (montée + descente) suivie d''un fossé à 4-5 foulées. Gérer la recharge après la banquette pour aborder le fossé en confiance.',
  ARRAY['Enchaînement cross', 'Gestion de la recharge', 'Confiance fossé'],
  'cross',
  ARRAY['banquette', 'fossé', 'enchaînement', 'cross'],
  'cross_entrainement',
  'avance',
  35
),

-- LONGE (2)
(
  'Cavalettis à la longe',
  'Poser 4 cavalettis en éventail sur un cercle de 15m. Travailler au trot puis au galop en cherchant un franchissement décontracté, sans accélération. Changer de main après 10 minutes.',
  ARRAY['Dos souple', 'Engagement postérieurs', 'Décontraction'],
  'longe',
  ARRAY['cavalettis', 'longe', 'cercle', 'éventail'],
  'longe',
  'debutant',
  25
),
(
  'Transitions canter-trot à la longe',
  'Sur un cercle de 18-20m, enchaîner des transitions canter → trot → canter à la voix et au claquement du fouet, sans pression. Chercher des transitions nettes et un retour au trot calme.',
  ARRAY['Obéissance aux aides vocales', 'Transitions nettes', 'Équilibre'],
  'longe',
  ARRAY['transitions', 'galop', 'voix', 'obéissance'],
  'longe',
  'intermediaire',
  20
),

-- TRAVAIL À PIED (1)
(
  'Cession à la hanche et reculer',
  'En position de travail à pied, demander une cession à la hanche (déplacement des postérieurs sur un demi-cercle) puis enchaîner avec un reculer en ligne droite sur 5 pas. Rester léger sur la corde.',
  ARRAY['Mobilité des hanches', 'Légèreté sur la corde', 'Équilibre', 'Obéissance à pied'],
  'travail_a_pied',
  ARRAY['hanche', 'reculer', 'mobilité', 'légèreté'],
  'travail_a_pied',
  'intermediaire',
  20
);
