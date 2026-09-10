REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO authenticated;
REVOKE SELECT ON public.categories FROM anon;