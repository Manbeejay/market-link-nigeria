CREATE TABLE public.listing_assistant_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_assistant_chats TO authenticated;
GRANT ALL ON public.listing_assistant_chats TO service_role;
ALTER TABLE public.listing_assistant_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own listing chats" ON public.listing_assistant_chats FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER listing_assistant_chats_updated_at BEFORE UPDATE ON public.listing_assistant_chats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id),
  farmer_id uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, buyer_id)
);
GRANT SELECT, INSERT, UPDATE ON public.inquiries TO authenticated;
GRANT ALL ON public.inquiries TO service_role;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inquiry parties read" ON public.inquiries FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = farmer_id);
CREATE POLICY "Subscribers start inquiries" ON public.inquiries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id AND buyer_id <> farmer_id AND public.has_active_subscription(auth.uid())
    AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.farmer_id = inquiries.farmer_id));
CREATE POLICY "Inquiry parties touch" ON public.inquiries FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = farmer_id) WITH CHECK (auth.uid() = buyer_id OR auth.uid() = farmer_id);
CREATE TRIGGER inquiries_updated_at BEFORE UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.inquiry_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.inquiry_messages TO authenticated;
GRANT ALL ON public.inquiry_messages TO service_role;
ALTER TABLE public.inquiry_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inquiry parties read messages" ON public.inquiry_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inquiries i WHERE i.id = inquiry_id AND (i.buyer_id = auth.uid() OR i.farmer_id = auth.uid())));
CREATE POLICY "Inquiry parties send messages" ON public.inquiry_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.inquiries i WHERE i.id = inquiry_id AND (i.buyer_id = auth.uid() OR i.farmer_id = auth.uid())));
ALTER TABLE public.inquiry_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inquiry_messages;