CREATE POLICY "Farmers upload own product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Farmers update own product images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Farmers delete own product images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Subscribers read product images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'product-images' AND (public.has_active_subscription(auth.uid()) OR (storage.foldername(name))[1] = auth.uid()::text));

INSERT INTO public.categories (name, slug) VALUES
  ('Grains', 'grains'),
  ('Tubers', 'tubers'),
  ('Vegetables', 'vegetables'),
  ('Fruits', 'fruits'),
  ('Livestock', 'livestock'),
  ('Poultry', 'poultry'),
  ('Fish & Seafood', 'fish-seafood'),
  ('Cash Crops', 'cash-crops'),
  ('Legumes', 'legumes'),
  ('Others', 'others')
ON CONFLICT DO NOTHING;