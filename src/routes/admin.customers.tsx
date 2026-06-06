import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/customers")({ ssr: false, component: Customers });

function Customers() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const { data: customers = [] } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => (await supabase.from("profiles").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter((c: any) => (c.full_name ?? "").toLowerCase().includes(s) || c.phone.includes(s));
  }, [customers, q]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-20">
      <Input placeholder="Search by name or phone" value={q} onChange={(e) => setQ(e.target.value)} className="mb-4" />
      {filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">—</p> : (
        <div className="space-y-2">
          {filtered.map((c: any) => (
            <Card key={c.id} className="p-3 flex justify-between items-center">
              <div>
                <div className="font-medium">{c.full_name ?? "—"}</div>
                <div className="text-sm text-muted-foreground">📞 {c.phone}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-primary">{c.points_balance}</div>
                <div className="text-xs text-muted-foreground">{t("points")}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
