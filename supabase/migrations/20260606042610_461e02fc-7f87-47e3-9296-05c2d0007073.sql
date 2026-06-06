
CREATE OR REPLACE FUNCTION public.redeem_admin_invite(_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _expected text;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT value INTO _expected FROM public.app_settings WHERE key = 'admin_invite_code';
  IF _expected IS NULL OR _code IS NULL OR btrim(_code) <> _expected THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (_uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_admin_invite(text) TO authenticated;
