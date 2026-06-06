import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  refreshRole: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({ user: null, session: null, isAdmin: false, loading: true, refreshRole: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRole = async (uid: string | null) => {
    if (!uid) { setIsAdmin(false); return; }
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setIsAdmin(!!data?.some((r) => r.role === "admin"));
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadRole(data.session?.user.id ?? null).finally(() => setLoading(false));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      loadRole(s?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshRole = async () => loadRole(session?.user.id ?? null);

  return <Ctx.Provider value={{ user: session?.user ?? null, session, isAdmin, loading, refreshRole }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
