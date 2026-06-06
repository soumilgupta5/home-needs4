import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { phoneToEmail, isValidPhone } from "@/lib/store-config";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const { user, refreshRole } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [invite, setInvite] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/" }); }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPhone(phone)) { toast.error(t("invalidPhone")); return; }
    if (password.length < 6) { toast.error("Password ≥ 6 chars"); return; }
    setLoading(true);
    const email = phoneToEmail(phone);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { phone: phone.replace(/\D/g, "").slice(-10), full_name: fullName } },
        });
        if (error) throw error;
        // Sign in immediately so RPC has auth.uid()
        await supabase.auth.signInWithPassword({ email, password });
        if (invite.trim()) {
          const { data: ok, error: rpcErr } = await supabase.rpc("redeem_admin_invite", { _code: invite.trim() });
          if (rpcErr) toast.error(rpcErr.message);
          else if (ok) toast.success("Admin access granted");
          else toast.error("Invalid invite code (signed up as customer)");
        }
        await refreshRole();
        toast.success(t("welcome"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await refreshRole();
        toast.success(t("welcomeBack"));
      }
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-md px-4 py-8">
        <Card className="p-6">
          <h1 className="font-display text-2xl font-bold">{mode === "login" ? t("login") : t("signup")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("appName")} · {t("tagline")}</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">{t("fullName")}</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
            )}
            <div>
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input id="phone" inputMode="numeric" placeholder="98XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="pw">{t("password")}</Label>
              <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {mode === "signup" && (
              <div>
                <Label htmlFor="inv">{t("inviteCode")}</Label>
                <Input id="inv" value={invite} onChange={(e) => setInvite(e.target.value)} placeholder={t("optional")} />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "…" : (mode === "login" ? t("login") : t("signup"))}
            </Button>
          </form>

          <div className="text-center mt-4 text-sm text-muted-foreground">
            {mode === "login" ? t("noAccount") : t("haveAccount")}{" "}
            <button className="text-primary font-semibold underline-offset-2 hover:underline"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}>
              {mode === "login" ? t("signup") : t("login")}
            </button>
          </div>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-4">
          <Link to="/" className="hover:underline">← {t("continueShopping")}</Link>
        </p>
      </main>
    </div>
  );
}
