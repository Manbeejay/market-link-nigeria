DROP TRIGGER IF EXISTS enforce_inquiry_status_update ON public.inquiries;
CREATE TRIGGER enforce_inquiry_status_update
BEFORE INSERT OR UPDATE ON public.inquiries
FOR EACH ROW EXECUTE FUNCTION public.enforce_inquiry_status_update();