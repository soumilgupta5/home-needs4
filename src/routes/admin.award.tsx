import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { pointsForAmount, inr } from "@/lib/store-config";

export const Route = createFileRoute("/admin/award")({ ssr: false, component: AwardPoints });

function AwardPoints() {
  const { t } = useI18n();
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [customer, setCustomer] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const lookup = async () => {
    const digits = phone.replace(/\D/g, "").slice(-10);
    if (digits.length !== 10) { toast.error(t("invalidPhone")); return; }
    const { data } = await supabase.from("profiles").select("*").eq("phone", digits).maybeSingle();
    if (!data) { setCustomer(null); toast.error("Customer not found — they must sign up first"); return; }
    setCustomer(data);
  };

  const award = async () => {
    if (!customer) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("Enter bill amount"); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("award_instore_points", {
      _user_id: customer.id, _amount: amt, _note: note || "",
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Awarded ${data} points to ${customer.full_name ?? customer.phone}`);
    setAmount(""); setNote("");
    // refresh customer
    const { data: fresh } = await supabase.from("profiles").select("*").eq("id", customer.id).maybeSingle();
    setCustomer(fresh);
  };

  const earnPreview = pointsForAmount(Number(amount) || 0);

  return (
    <main className="mx-auto max-w-md px-4 py-6 pb-20 space-y-4">
      <Card className="p-4 bg-accent/40">
        <p className="text-sm">{t("awardPointsHint")}</p>
      </Card>

      <Card className="p-4 space-y-3">
        <div>
          <Label>{t("customerPhone")}</Label>
          <div className="flex gap-2">
            <Input inputMode="numeric" placeholder="98XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Button onClick={lookup} type="button">Find</Button>
          </div>
        </div>

        {customer && (
          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="font-semibold">{customer.full_name ?? "—"}</div>
            <div className="text-muted-foreground">📞 {customer.phone}</div>
            <div className="text-primary font-bold mt-1">{customer.points_balance} {t("points")}</div>
          </div>
        )}

        {customer && (
          <>
            <div>
              <Label>{t("billAmount")}</Label>
              <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              {Number(amount) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">Will award <strong>{earnPreview} {t("points")}</strong> for {inr(Number(amount))}</p>
              )}
            </div>
            <div>
              <Label>{t("notes")}</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("optional")} />
            </div>
            <Button onClick={award} className="w-full" disabled={busy}>{busy ? "…" : t("award")}</Button>
          </>
        )}
      </Card>
    </main>
  );
}
