import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { useI18n } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Minus, Search } from "lucide-react";
import { inr, STORE } from "@/lib/store-config";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  ssr: false,
  component: HomePage,
});

type Product = {
  id: string; name: string; name_hi: string | null; description: string | null; category: string;
  price_inr: number; image_url: string | null; stock: number;
};

const CATEGORY_ICON: Record<string, string> = {
  Kitchen: "🍳", Cleaning: "🧼", Storage: "📦",
};

function HomePage() {
  const { t, lang } = useI18n();
  const { items, add, setQty } = useCart();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products").select("*").eq("is_active", true).order("category").order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ["all", ...Array.from(set)];
  }, [products]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return products.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (!query) return true;
      return p.name.toLowerCase().includes(query) || (p.name_hi ?? "").toLowerCase().includes(query);
    });
  }, [products, q, cat]);

  const inCartQty = (id: string) => items.find((i) => i.id === id)?.quantity ?? 0;

  const catLabel = (c: string) => {
    if (c === "all") return t("all");
    if (c === "Kitchen") return t("kitchen");
    if (c === "Cleaning") return t("cleaning");
    if (c === "Storage") return t("storage");
    return c;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header transparent />

      {/* Hero */}
      <section className="bg-[#d22d41] text-primary-foreground relative">
        <div className="w-full flex flex-col sm:flex-row items-stretch sm:min-h-[160px] md:min-h-[220px]">
          <div className="w-full pt-16 pb-2 h-[220px] sm:h-auto sm:py-0 sm:w-2/5 md:w-1/3 xl:w-1/4 relative shrink-0 flex">
            {/* Desktop Logo */}
            <img 
              src="/logo.png" 
              alt="Home Needs Logo" 
              className="absolute inset-0 w-full h-full object-cover hidden sm:block"
              style={{
                objectPosition: "center",
                WebkitMaskImage: "linear-gradient(to right, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)",
                maskImage: "linear-gradient(to right, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)"
              }}
            />
            {/* Mobile Logo */}
            <div className="w-full h-full relative block sm:hidden">
              <img 
                src="/logo.png" 
                alt="Home Needs Logo" 
                className="absolute inset-0 w-full h-full object-contain"
                style={{
                  objectPosition: "center",
                  WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)",
                  maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)"
                }}
              />
            </div>
          </div>
          <div className="px-4 pt-2 pb-10 sm:px-4 sm:pt-20 sm:pb-10 flex-1 relative z-10 flex flex-col justify-center items-center text-center sm:items-start sm:text-left max-w-3xl">
            <div className="text-xs uppercase tracking-widest opacity-80">{STORE.city}</div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mt-1">{t("welcome")}</h1>
            <p className="opacity-90 mt-2 text-sm sm:text-base md:text-lg">{t("tagline")}</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-black/20 text-white text-xs md:text-sm font-semibold px-3 py-1.5">
              🛵 {t("loniDelivery")} · {t("freeDelivery")}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-4 pb-24">
        <div className="sticky top-0 z-30 -mx-4 px-4 py-3 bg-background/95 backdrop-blur">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="pl-9 h-11" />
          </div>
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button key={c} onClick={() => setCat(c)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${cat === c ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
                {c !== "all" && <span className="mr-1">{CATEGORY_ICON[c] ?? "🛍️"}</span>}{catLabel(c)}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="h-48 animate-pulse bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">{t("noProducts")}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {filtered.map((p) => {
              const q = inCartQty(p.id);
              const displayName = lang === "hi" && p.name_hi ? p.name_hi : p.name;
              return (
                <Card key={p.id} className="overflow-hidden flex flex-col p-0">
                  <div className="aspect-square bg-gradient-to-br from-accent to-muted flex items-center justify-center text-5xl">
                    {p.image_url ? (
                      <img src={p.image_url} alt={displayName} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <span>{CATEGORY_ICON[p.category] ?? "🛍️"}</span>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <div className="text-sm font-medium leading-tight line-clamp-2">{displayName}</div>
                    {p.description && <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{p.description}</div>}
                    <div className="mt-1 text-xs text-muted-foreground">{catLabel(p.category)}</div>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="font-bold">{inr(p.price_inr)}</span>
                      {q === 0 ? (
                        <Button size="sm" onClick={() => { add({ id: p.id, name: p.name, name_hi: p.name_hi, price: Number(p.price_inr), image_url: p.image_url }); toast.success(t("addToCart")); }}>
                          <Plus className="h-4 w-4 mr-1" />{t("addToCart")}
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1 rounded-md border bg-primary/5">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setQty(p.id, q - 1)}><Minus className="h-3 w-3" /></Button>
                          <span className="text-sm font-semibold w-5 text-center">{q}</span>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setQty(p.id, q + 1)}><Plus className="h-3 w-3" /></Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-muted py-8 mt-auto border-t">
        <div className="mx-auto max-w-5xl px-4 text-center sm:text-left flex flex-col sm:flex-row gap-6 justify-between items-center text-sm text-muted-foreground">
          <div>
            <h3 className="font-semibold text-foreground text-base mb-1">Home Needs</h3>
            <p>
              <a href="https://maps.app.goo.gl/GYsQuYRKJzUe4AFH8" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors hover:underline">
                Opposite Town School, Main Road<br />Muradnagar, Ghaziabad - 201206
              </a>
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-base mb-1 sm:text-right">Contact Us</h3>
            <p className="sm:text-right">
              <a href="tel:7417102790" className="hover:text-primary transition-colors">7417102790</a>
              <span className="mx-2">•</span>
              <a href="tel:7668859471" className="hover:text-primary transition-colors">7668859471</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
