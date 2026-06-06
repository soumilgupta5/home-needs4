import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/store-config";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/admin/")({ ssr: false, component: AdminOrders });

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-secondary text-secondary-foreground",
  confirmed: "bg-accent text-accent-foreground",
  out_for_delivery: "bg-primary text-primary-foreground",
  delivered: "bg-success text-success-foreground",
  cancelled: "bg-destructive/20 text-destructive",
};

function AdminOrders() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("active");

  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders", filter],
    queryFn: async () => {
      let q = supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
      if (filter === "active") q = q.in("status", ["pending", "confirmed", "out_for_delivery"]);
      else if (filter !== "all") q = q.eq("status", filter as any);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    refetchInterval: 15_000,
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    
    // Award loyalty points when marking as delivered
    if (status === "delivered") {
      const { error: ptsErr } = await supabase.rpc("award_delivery_points", { _order_id: id });
      if (ptsErr) toast.error("Order delivered but points award failed: " + ptsErr.message);
    }
    
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  const updatePayment = async (id: string, payment_status: string) => {
    const { error } = await supabase.from("orders").update({ payment_status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Payment updated"); qc.invalidateQueries({ queryKey: ["admin-orders"] }); }
  };

  const payBadge: Record<string, string> = {
    not_required: "bg-muted text-muted-foreground",
    pending: "bg-secondary text-secondary-foreground",
    submitted: "bg-accent text-accent-foreground",
    verified: "bg-success text-success-foreground",
    failed: "bg-destructive/20 text-destructive",
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 pb-20">
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {[["active","Active"],["pending","Pending"],["confirmed","Confirmed"],["out_for_delivery","Out"],["delivered","Delivered"],["cancelled","Cancelled"],["all","All"]].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium border ${filter === v ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>{l}</button>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">{t("noOrders")}</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o: any) => {
            const payLabel = o.payment_method === "cod" ? "COD" :
              o.payment_status === "pending" ? "UPI · pending" :
              o.payment_status === "submitted" ? "UPI · awaiting verify" :
              o.payment_status === "verified" ? "UPI · verified ✓" :
              o.payment_status === "failed" ? "UPI · failed" : `UPI · ${o.payment_status}`;
            return (
            <Card key={o.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-xs text-muted-foreground">#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleString()}</div>
                  <div className="font-semibold">{o.customer_name} · 📞 {o.customer_phone}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">📍 {o.delivery_address}</div>
                  {o.distance_km != null && (
                    <div className="text-xs text-muted-foreground">📏 {Number(o.distance_km).toFixed(1)} km from store
                      {o.delivery_lat != null && (
                        <> · <a className="underline" target="_blank" rel="noreferrer"
                          href={`https://maps.google.com/?q=${o.delivery_lat},${o.delivery_lng}`}>map</a></>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs font-semibold rounded-full px-2 py-1 ${STATUS_COLOR[o.status]}`}>{t(`status_${o.status}` as any)}</span>
                  <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${payBadge[o.payment_status] ?? ""}`}>{payLabel}</span>
                </div>
              </div>

              <div className="text-sm border-t pt-2 mt-2 space-y-1">
                {o.order_items?.map((i: any) => (
                  <div key={i.id} className="flex justify-between">
                    <span>{i.product_name} × {i.quantity}</span>
                    <span>{inr(i.unit_price * i.quantity)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-1 border-t">
                  <span>{t("total")} ({o.payment_method === "upi" ? "UPI" : "COD"})</span><span>{inr(o.total)}</span>
                </div>
                {o.upi_ref && <div className="text-xs text-muted-foreground">UTR: <span className="font-mono">{o.upi_ref}</span></div>}
                {o.notes && <div className="text-xs text-muted-foreground italic">"{o.notes}"</div>}
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {o.status === "pending" && <Button size="sm" onClick={() => updateStatus(o.id, "confirmed")}>{t("confirm")}</Button>}
                {o.status === "confirmed" && <Button size="sm" onClick={() => updateStatus(o.id, "out_for_delivery")}>{t("markOutForDelivery")}</Button>}
                {o.status === "out_for_delivery" && <Button size="sm" onClick={() => updateStatus(o.id, "delivered")}>{t("markDelivered")}</Button>}
                {!["delivered","cancelled"].includes(o.status) && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus(o.id, "cancelled")}>{t("cancel")}</Button>
                )}
                {o.payment_method === "upi" && ["pending","submitted","failed"].includes(o.payment_status) && (
                  <Button size="sm" variant="secondary" onClick={() => updatePayment(o.id, "verified")}>{t("verifyPayment")}</Button>
                )}
                {o.payment_method === "upi" && o.payment_status === "submitted" && (
                  <Button size="sm" variant="outline" onClick={() => updatePayment(o.id, "failed")}>{t("markPayFailed")}</Button>
                )}
              </div>
            </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
