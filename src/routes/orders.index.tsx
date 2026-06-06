import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { inr } from "@/lib/store-config";

export const Route = createFileRoute("/orders/")({ ssr: false, component: OrdersList });

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  confirmed: "bg-accent text-accent-foreground",
  out_for_delivery: "bg-secondary text-secondary-foreground",
  delivered: "bg-success text-success-foreground",
  cancelled: "bg-destructive/20 text-destructive",
};

function OrdersList() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  const { data: orders = [] } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-20">
        <h1 className="font-display text-2xl font-bold mb-4">{t("orders")}</h1>
        {orders.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">{t("noOrders")}</p>
        ) : (
          <div className="space-y-2">
            {orders.map((o: any) => (
              <Link key={o.id} to="/orders/$id" params={{ id: o.id }}>
                <Card className="p-4 hover:bg-accent/30 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs text-muted-foreground">#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString()}</div>
                      <div className="font-semibold mt-0.5">{inr(o.total)}</div>
                    </div>
                    <span className={`text-xs font-semibold rounded-full px-2 py-1 ${STATUS_COLOR[o.status]}`}>{t(`status_${o.status}` as any)}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
