import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { inr, rupeesForPoints } from "@/lib/store-config";

export const Route = createFileRoute("/account")({ ssr: false, component: AccountPage });

const SOURCE_LABEL: Record<string, string> = {
  online_order: "Online order", in_store: "In-store purchase",
  redemption: "Redeemed", adjustment: "Adjustment",
};

function AccountPage() {
  const { user, loading, isAdmin, refreshRole } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [invite, setInvite] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  const redeem = async () => {
    if (!invite.trim()) return;
    setRedeeming(true);
    const { data, error } = await supabase.rpc("redeem_admin_invite", { _code: invite.trim() });
    setRedeeming(false);
    if (error) toast.error(error.message);
    else if (data) { toast.success("Admin access granted"); setInvite(""); await refreshRole(); }
    else toast.error("Invalid invite code");
  };

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
    enabled: !!user,
  });

  const { data: ledger = [] } = useQuery({
    queryKey: ["ledger", user?.id],
    queryFn: async () => (await supabase.from("points_ledger").select("*").order("created_at", { ascending: false }).limit(50)).data ?? [],
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-20 space-y-4">
        <h1 className="font-display text-2xl font-bold">{t("account")}</h1>

        <Card className="p-5 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <div className="text-xs uppercase tracking-widest opacity-80">{t("pointsBalance")}</div>
          <div className="text-4xl font-bold mt-1">{profile?.points_balance ?? 0}</div>
          <div className="text-sm opacity-90 mt-1">≈ {inr(rupeesForPoints(profile?.points_balance ?? 0))} {t("discount")}</div>
          <div className="text-xs opacity-75 mt-2">{t("pointsEarn")}</div>
        </Card>

        {!isAdmin && (
          <Card className="p-4 space-y-2">
            <h3 className="font-semibold">Admin invite code</h3>
            <p className="text-xs text-muted-foreground">Enter the owner invite code to unlock admin access.</p>
            <div className="flex gap-2">
              <Input value={invite} onChange={(e) => setInvite(e.target.value)} />
              <Button onClick={redeem} disabled={redeeming || !invite.trim()}>Redeem</Button>
            </div>
          </Card>
        )}

        <Card className="p-4">
          <div className="text-sm"><strong>{profile?.full_name ?? "—"}</strong></div>
          <div className="text-sm text-muted-foreground">📞 {profile?.phone}</div>
          {profile?.address && <div className="text-sm text-muted-foreground mt-1">📍 {profile.address}</div>}
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">{t("pointsHistory")}</h3>
          {ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <div className="space-y-2">
              {ledger.map((l: any) => (
                <div key={l.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                  <div>
                    <div>{SOURCE_LABEL[l.source] ?? l.source}</div>
                    <div className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString()} {l.amount_inr ? `· ${inr(l.amount_inr)}` : ""}</div>
                  </div>
                  <div className={`font-semibold ${l.delta >= 0 ? "text-success" : "text-destructive"}`}>
                    {l.delta >= 0 ? "+" : ""}{l.delta}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
