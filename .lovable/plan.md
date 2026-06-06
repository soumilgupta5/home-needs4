## Two fixes

### 1. Store location → Muradnagar, Ghaziabad
Update `src/lib/store-config.ts` coordinates from Loni (`28.7515, 77.2891`) to Muradnagar (`28.7811, 77.4977`) and change `city` label to `"Muradnagar, Ghaziabad"`. The 4 km delivery radius logic stays the same — only the center point moves.

### 2. Admin role not being granted
**Root cause:** The `user_roles` table has no INSERT RLS policy, so the client-side `supabase.from("user_roles").insert(...)` in `src/routes/auth.tsx` silently fails. Every signup ends up `customer`, including the three existing accounts. That's why your "admin" login sees the customer UI and can't manage products.

**Fix:**
1. Create a SECURITY DEFINER RPC `redeem_admin_invite(_code text)` that checks the code against `app_settings.admin_invite_code` and, if it matches, inserts `(auth.uid(), 'admin')` into `user_roles` (ignore conflict). Grant EXECUTE to `authenticated`.
2. Update `src/routes/auth.tsx` to call `supabase.rpc("redeem_admin_invite", { _code: invite.trim() })` instead of the direct insert. Also expose the same flow on the Account page so an already-signed-up user can redeem the code without creating a new account.
3. Promote your existing account to admin now. Tell me your phone number (last 10 digits) and I'll run a one-off update; or you can sign up fresh once the RPC is live and enter `HOMENEEDS-OWNER-2026`.

After this, the admin dropdown link and `/admin/products` add/edit/delete will work for your account.

### Files touched
- `src/lib/store-config.ts` — coordinates + city label
- `src/routes/auth.tsx` — call RPC instead of direct insert
- `src/routes/account.tsx` — small "Redeem admin code" section (optional but useful)
- New migration — `redeem_admin_invite` function + grant
