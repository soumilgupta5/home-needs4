import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/Header";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inr, STORE, upiPayUrl, rupeesForPoints } from "@/lib/store-config";
import { CheckCircle2, Circle, Truck, PackageCheck, Gift } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

export const Route = createFileRoute("/orders/$id")({ ssr: false, component: OrderDetail });

const STEPS = ["pending", "confirmed", "out_for_delivery", "delivered"] as const;
const ICONS = { pending: Circle, confirmed: CheckCircle2, out_for_delivery: Truck, delivered: PackageCheck };

const PAY_BADGE: Record<string, string> = {
  not_required: "bg-muted text-muted-foreground",
  pending: "bg-secondary text-secondary-foreground",
  submitted: "bg-accent text-accent-foreground",
  verified: "bg-success text-success-foreground",
  failed: "bg-destructive/20 text-destructive",
};

function OrderDetail() {
  const { id } = Route.useParams();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [ref, setRef] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const [{ data: order }, { data: items }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", id),
      ]);
      return { order, items: items ?? [] };
    },
  });

  const submitUpiRef = async () => {
    if (!ref.trim()) { toast.error("Enter a UPI reference"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("orders")
      .update({ upi_ref: ref.trim(), payment_status: "submitted" })
      .eq("id", id);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Submitted — owner will verify");
    setRef("");
    qc.invalidateQueries({ queryKey: ["order", id] });
  };

  if (isLoading) return <div className="min-h-screen bg-background"><Header /><div className="p-8 text-center text-muted-foreground">…</div></div>;
  if (!data?.order) return (
    <div className="min-h-screen bg-background"><Header />
      <div className="p-8 text-center"><p className="text-muted-foreground">Order not found</p>
        <Link to="/orders" className="inline-block mt-3"><Button>{t("orders")}</Button></Link></div>
    </div>
  );

  const o = data.order;
  const currentIdx = o.status === "cancelled" ? -1 : STEPS.indexOf(o.status as any);
  const payLabel =
    o.payment_method === "cod" ? t("paymentCod") :
    o.payment_status === "pending" ? t("paymentPending") :
    o.payment_status === "submitted" ? t("paymentSubmitted") :
    o.payment_status === "verified" ? t("paymentVerified") :
    o.payment_status === "failed" ? t("paymentFailed") : o.payment_status;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-20 space-y-4">
        <div>
          <div className="text-xs text-muted-foreground">#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleString()}</div>
          <h1 className="font-display text-2xl font-bold">{t("trackOrder")}</h1>
        </div>

        <Card className="p-4">
          {o.status === "cancelled" ? (
            <div className="text-destructive font-semibold text-center py-3">{t("status_cancelled")}</div>
          ) : (
            <div className="flex justify-between relative">
              <div className="absolute top-4 left-4 right-4 h-0.5 bg-border -z-0" />
              <div className="absolute top-4 left-4 h-0.5 bg-primary -z-0 transition-all" style={{ width: `calc(${(currentIdx / (STEPS.length - 1)) * 100}% - 1rem)` }} />
              {STEPS.map((s, i) => {
                const Icon = ICONS[s];
                const done = i <= currentIdx;
                return (
                  <div key={s} className="relative z-10 flex flex-col items-center gap-1 flex-1">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className={`text-[10px] text-center ${done ? "font-semibold" : "text-muted-foreground"}`}>{t(`status_${s}` as any)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Payment status */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">{t("paymentMethod")}: {o.payment_method === "upi" ? "UPI" : t("payCod")}</div>
            <span className={`text-xs font-semibold rounded-full px-2 py-1 ${PAY_BADGE[o.payment_status] ?? ""}`}>{payLabel}</span>
          </div>

          {o.payment_method === "upi" && ["pending", "failed"].includes(o.payment_status) && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-3 text-center space-y-2">
                <div className="flex justify-center bg-white rounded-md p-3 mx-auto w-fit">
                  <QRCodeSVG value={upiPayUrl(Number(o.total), `Order ${o.id.slice(0,8)}`)} size={140} />
                </div>
                <div className="text-xs text-muted-foreground">
                  UPI ID: <span className="font-mono font-semibold text-foreground">{STORE.upiId}</span> · {inr(Number(o.total))}
                </div>
                <a href={upiPayUrl(Number(o.total), `Order ${o.id.slice(0,8)}`)}
                  className="inline-block w-full rounded-md bg-primary text-primary-foreground text-sm font-medium py-2">
                  {t("upiPayNow")}
                </a>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("upiRefLabel")}</label>
                <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder={t("upiRefPlaceholder")} />
                <Button onClick={submitUpiRef} disabled={submitting} className="w-full">
                  {submitting ? "…" : t("submitUpiRef")}
                </Button>
                <p className="text-xs text-muted-foreground">{t("upiRefHint")}</p>
              </div>
            </div>
          )}

          {o.payment_method === "upi" && o.payment_status === "submitted" && o.upi_ref && (
            <p className="text-xs text-muted-foreground">UTR: <span className="font-mono">{o.upi_ref}</span></p>
          )}
        </Card>

        <Card className="p-4 space-y-2">
          <h3 className="font-semibold">Items</h3>
          {data.items.map((i: any) => (
            <div key={i.id} className="flex justify-between text-sm">
              <span>{i.product_name} × {i.quantity}</span>
              <span>{inr(i.unit_price * i.quantity)}</span>
            </div>
          ))}
        </Card>

        <Card className="p-4 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">{t("subtotal")}</span><span>{inr(o.subtotal)}</span></div>
          {Number(o.discount) > 0 && <div className="flex justify-between text-success"><span>{t("discount")} ({o.points_redeemed} pts)</span><span>− {inr(o.discount)}</span></div>}
          <div className="flex justify-between"><span className="text-muted-foreground">{t("delivery")}</span><span>{Number(o.delivery_fee) === 0 ? "FREE" : inr(o.delivery_fee)}</span></div>
          <div className="flex justify-between font-bold pt-2 border-t"><span>{t("total")}</span><span>{inr(o.total)}</span></div>
          {o.points_earned > 0 && (
            o.points_awarded ? (
              <div className="flex items-center gap-1.5 text-xs pt-1 bg-success/10 text-success rounded-md px-3 py-2 mt-1">
                <Gift className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{t("pointsAwarded", { n: o.points_earned, r: rupeesForPoints(o.points_earned) })}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs pt-1 bg-primary/5 text-muted-foreground rounded-md px-3 py-2 mt-1">
                <Gift className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span>{t("pointsPending", { n: o.points_earned, r: rupeesForPoints(o.points_earned) })}</span>
              </div>
            )
          )}
        </Card>

        <Card className="p-4 text-sm">
          <div className="font-semibold mb-1">{t("address")}</div>
          <div className="text-muted-foreground whitespace-pre-wrap">{o.delivery_address}</div>
          <div className="text-muted-foreground mt-1">📞 {o.customer_phone}</div>
          {o.distance_km != null && (
            <div className="text-xs text-muted-foreground mt-1">📍 {Number(o.distance_km).toFixed(1)} km from store</div>
          )}
        </Card>
      </main>
    </div>
  );
}
