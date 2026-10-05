CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_farmer_on_inquiry_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inq record;
  buyer_name text;
BEGIN
  SELECT i.id, i.buyer_id, i.farmer_id, p.title INTO inq
  FROM inquiries i JOIN products p ON p.id = i.product_id WHERE i.id = NEW.inquiry_id;
  IF inq.id IS NULL OR NEW.sender_id <> inq.buyer_id THEN RETURN NEW; END IF;
  SELECT full_name INTO buyer_name FROM profiles WHERE id = inq.buyer_id;
  INSERT INTO notifications (user_id, title, body, link)
  VALUES (inq.farmer_id,
          'New inquiry about ' || inq.title,
          coalesce(buyer_name, 'A buyer') || ': ' || left(NEW.content, 140),
          '/inquiries/' || inq.id);
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_farmer_on_inquiry_message() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER inquiry_messages_notify AFTER INSERT ON public.inquiry_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_farmer_on_inquiry_message();

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;