-- Migration 058 — Partage de cheval V2.1 (lecture seule)

CREATE TABLE public.horse_shares (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  horse_id             uuid NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  shared_with_email    text NOT NULL,
  shared_with_user_id  uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role                 text NOT NULL CHECK (role IN ('gerant', 'coach')),
  can_see_training     boolean NOT NULL DEFAULT true,
  can_see_health       boolean NOT NULL DEFAULT false,
  can_see_competitions boolean NOT NULL DEFAULT true,
  can_see_planning     boolean NOT NULL DEFAULT true,
  status               text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  invited_by           uuid NOT NULL REFERENCES auth.users(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (horse_id, shared_with_email)
);

ALTER TABLE public.horse_shares ENABLE ROW LEVEL SECURITY;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER horse_shares_updated_at
  BEFORE UPDATE ON public.horse_shares
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS horse_shares : propriétaire (via horses.user_id)
CREATE POLICY "owner_manage_shares" ON public.horse_shares
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.horses
      WHERE horses.id = horse_shares.horse_id
        AND horses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.horses
      WHERE horses.id = horse_shares.horse_id
        AND horses.user_id = auth.uid()
    )
  );

-- RLS horse_shares : invité (lecture seule)
CREATE POLICY "invitee_select_shares" ON public.horse_shares
  FOR SELECT
  USING (shared_with_user_id = auth.uid());

-- RLS étendue : invité peut lire la fiche cheval partagée
CREATE POLICY "shared_horse_select" ON public.horses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.horse_shares hs
      WHERE hs.horse_id = horses.id
        AND hs.shared_with_user_id = auth.uid()
        AND hs.status = 'active'
    )
  );

-- RLS étendue : invité peut lire les séances si can_see_training
CREATE POLICY "shared_training_select" ON public.training_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.horse_shares hs
      WHERE hs.horse_id = training_sessions.horse_id
        AND hs.shared_with_user_id = auth.uid()
        AND hs.status = 'active'
        AND hs.can_see_training = true
    )
  );

-- RLS étendue : invité peut lire les soins si can_see_health
CREATE POLICY "shared_health_select" ON public.health_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.horse_shares hs
      WHERE hs.horse_id = health_records.horse_id
        AND hs.shared_with_user_id = auth.uid()
        AND hs.status = 'active'
        AND hs.can_see_health = true
    )
  );

-- RLS étendue : invité peut lire les concours si can_see_competitions
CREATE POLICY "shared_competitions_select" ON public.competitions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.horse_shares hs
      WHERE hs.horse_id = competitions.horse_id
        AND hs.shared_with_user_id = auth.uid()
        AND hs.status = 'active'
        AND hs.can_see_competitions = true
    )
  );

-- Index performance
CREATE INDEX idx_horse_shares_horse_id  ON public.horse_shares(horse_id);
CREATE INDEX idx_horse_shares_invitee   ON public.horse_shares(shared_with_user_id);
CREATE INDEX idx_horse_shares_email     ON public.horse_shares(shared_with_email);
CREATE INDEX idx_horse_shares_status    ON public.horse_shares(status);
