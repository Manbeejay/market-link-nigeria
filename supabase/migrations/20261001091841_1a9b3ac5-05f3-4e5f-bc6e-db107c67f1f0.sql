CREATE TABLE public.wallet_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New question',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_threads TO authenticated;
GRANT ALL ON public.wallet_threads TO service_role;
ALTER TABLE public.wallet_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wallet threads" ON public.wallet_threads
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX wallet_threads_user_idx ON public.wallet_threads(user_id, updated_at DESC);