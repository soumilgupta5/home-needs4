import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, Plus, Minus } from "lucide-react";
import { inr, STORE } from "@/lib/store-config";

export const Route = createFileRoute("/cart")({ ssr: false, component: CartPage });

function CartPage() {
  const { items, setQty, remove, subtotal } = useCart();
  const { t, lang } = useI18n();
  const delivery = subtotal === 0 ? 0 : subtotal >= STORE.freeDeliveryThreshold ? 0 : STORE.deliveryFee;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-32">
        <h1 className="font-display text-2xl font-bold">{t("cart")}</h1>

        {items.length === 0 ? (
          <Card className="p-8 mt-6 text-center">
            <div className="text-5xl mb-3">🛒</div>
            <p className="text-muted-foreground">{t("emptyCart")}</p>
            <Link to="/" className="inline-block mt-4">
              <Button>{t("continueShopping")}</Button>
            </Link>
          </Card>
        ) : (
          <>
            <div className="space-y-2 mt-4">
              {items.map((i) => (
                <Card key={i.id} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{lang === "hi" && i.name_hi ? i.name_hi : i.name}</div>
                    <div className="text-sm text-muted-foreground">{inr(i.price)} × {i.quantity} = <strong className="text-foreground">{inr(i.price * i.quantity)}</strong></div>
                  </div>
                  <div className="flex items-center gap-1 rounded-md border">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setQty(i.id, i.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                    <span className="w-6 text-center text-sm font-semibold">{i.quantity}</span>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setQty(i.id, i.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </Card>
              ))}
            </div>

            <Card className="p-4 mt-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("subtotal")}</span><span>{inr(subtotal)}</span></div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("delivery")}</span>
                <span>{delivery === 0 ? <span className="text-success font-semibold">FREE</span> : inr(delivery)}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t"><span>{t("total")}</span><span>{inr(subtotal + delivery)}</span></div>
              {subtotal > 0 && subtotal < STORE.freeDeliveryThreshold && (
                <p className="text-xs text-muted-foreground">Add {inr(STORE.freeDeliveryThreshold - subtotal)} more for free delivery</p>
              )}
            </Card>

            <Link to="/checkout" className="block mt-4">
              <Button className="w-full h-12 text-base">{t("checkout")} · {inr(subtotal + delivery)}</Button>
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
