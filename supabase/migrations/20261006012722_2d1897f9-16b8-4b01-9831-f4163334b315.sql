ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';

CREATE OR REPLACE FUNCTION public.enforce_inquiry_status_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('open', 'negotiating', 'closed') THEN
    RAISE EXCEPTION 'Invalid inquiry status';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND auth.uid() IS NOT NULL
     AND auth.uid() <> OLD.farmer_id THEN
    RAISE EXCEPTION 'Only the farmer can change inquiry status';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_inquiry_status_update ON public.inquiries;
CREATE TRIGGER enforce_inquiry_status_update
BEFORE INSERT OR UPDATE OF status ON public.inquiries
FOR EACH ROW EXECUTE FUNCTION public.enforce_inquiry_status_update();