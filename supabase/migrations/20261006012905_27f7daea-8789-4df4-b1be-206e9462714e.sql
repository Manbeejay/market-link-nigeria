CREATE OR REPLACE FUNCTION public.enforce_inquiry_status_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('open', 'negotiating', 'closed') THEN
    RAISE EXCEPTION 'Invalid inquiry status';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'open';
  ELSIF NEW.status IS DISTINCT FROM OLD.status
     AND auth.uid() IS NOT NULL
     AND auth.uid() <> OLD.farmer_id THEN
    RAISE EXCEPTION 'Only the farmer can change inquiry status';
  END IF;

  RETURN NEW;
END;
$$;