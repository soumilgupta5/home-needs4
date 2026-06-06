import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { inr, STORE, pointsForAmount, rupeesForPoints, distanceKm, upiPayUrl } from "@/lib/store-config";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { MapPin, Loader2, Gift } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const customIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: hsl(var(--primary)); drop-shadow: 0 2px 4px rgba(0,0,0,0.3);"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28]
});

function MapEvents({ setLoc }: { setLoc: (loc: Loc) => void }) {
  useMapEvents({
    click(e) {
      const d = distanceKm(STORE.lat, STORE.lng, e.latlng.lat, e.latlng.lng);
      setLoc({ lat: e.latlng.lat, lng: e.latlng.lng, distance: d });
    }
  });
  return null;
}

export const Route = createFileRoute("/checkout")({ ssr: false, component: CheckoutPage });

type Loc = { lat: number; lng: number; distance: number };

function CheckoutPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string | null; phone: string; address: string | null; points_balance: number } | null>(null);
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [redeemPts, setRedeemPts] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "payu">("cod");
  const [locMode, setLocMode] = useState<"auto" | "manual">("auto");
  const [loc, setLoc] = useState<Loc | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate({ to: "/auth" }); return; }
    supabase.from("profiles").select("full_name, phone, address, points_balance").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile(data as any);
          setAddress(data.address ?? "");
          setName(data.full_name ?? "");
        }
      });
  }, [user, navigate]);

  if (!user) return null;
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background"><Header />
        <main className="mx-auto max-w-md px-4 py-12 text-center">
          <p className="text-muted-foreground">{t("emptyCart")}</p>
          <Link to="/" className="inline-block mt-4"><Button>{t("continueShopping")}</Button></Link>
        </main>
      </div>
    );
  }

  const maxRedeem = Math.min(profile?.points_balance ?? 0, Math.floor(subtotal * 10));
  const discount = rupeesForPoints(redeemPts);
  const afterDiscount = Math.max(0, subtotal - discount);
  const delivery = afterDiscount >= STORE.freeDeliveryThreshold ? 0 : STORE.deliveryFee;
  const total = afterDiscount + delivery;
  const earnPts = pointsForAmount(afterDiscount);
  const earnValue = rupeesForPoints(earnPts);

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocError(t("locationDenied"));
      return;
    }
    setLocLoading(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const d = distanceKm(STORE.lat, STORE.lng, pos.coords.latitude, pos.coords.longitude);
        setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude, distance: d });
        setLocLoading(false);
      },
      () => {
        setLocError(t("locationDenied"));
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const withinRadius = !!loc && loc.distance <= STORE.deliveryRadiusKm;
  const canPlace = !!loc && withinRadius && address.trim().length >= 10;

  const placeOrder = async () => {
    if (!loc) { toast.error(t("locationRequired", { n: STORE.deliveryRadiusKm })); return; }
    if (!withinRadius) { toast.error(t("outsideRadius", { d: loc.distance.toFixed(1), n: STORE.deliveryRadiusKm })); return; }
    if (!address.trim() || address.trim().length < 10) { toast.error("Enter a complete address"); return; }
    setPlacing(true);
    try {
      const payStatus = paymentMethod === "cod" ? "not_required" : "pending";

      const { data: order, error } = await supabase.from("orders").insert({
        user_id: user.id,
        subtotal,
        delivery_fee: delivery,
        points_redeemed: redeemPts,
        discount,
        total,
        points_earned: earnPts,
        delivery_address: address,
        customer_phone: profile?.phone ?? "",
        customer_name: name,
        notes: notes || null,
        payment_method: paymentMethod,
        payment_status: payStatus,
        delivery_lat: loc.lat,
        delivery_lng: loc.lng,
        distance_km: Math.round(loc.distance * 100) / 100,
      }).select().single();
      if (error) throw error;

      const { error: itemsErr } = await supabase.from("order_items").insert(
        items.map((i) => ({
          order_id: order.id, product_id: i.id, product_name: i.name,
          unit_price: i.price, quantity: i.quantity,
        }))
      );
      if (itemsErr) throw itemsErr;

      // Only handle point redemptions at order time (earning happens on delivery)
      if (redeemPts > 0) {
        const { error: pErr } = await supabase.rpc("finalize_order_points", { _order_id: order.id });
        if (pErr) throw pErr;
      }

      await supabase.from("profiles").update({ address, full_name: name }).eq("id", user.id);

      // For PayU payment, redirect to payment flow
      if (paymentMethod === "payu") {
        // PayU integration — launch payment modal
        try {
          await launchPayU(order.id, total, name, profile?.phone ?? "", user.email ?? "");
          // On success, update payment status
          await supabase.from("orders").update({ payment_status: "verified" }).eq("id", order.id);
        } catch (payErr: any) {
          // Payment failed or cancelled — order still exists with pending payment
          await supabase.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
          toast.error("Payment failed. You can retry from your order page.");
        }
      }

      clear();
      toast.success(t("orderPlaced"));
      navigate({ to: "/orders/$id", params: { id: order.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-32 space-y-4">
        <h1 className="font-display text-2xl font-bold">{t("checkout")}</h1>

        {/* Location check */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span>Delivery location</span>
            </div>
            <div className="flex bg-muted p-1 rounded-md">
              <button 
                type="button" 
                onClick={() => setLocMode("auto")}
                className={`text-xs px-2 py-1 rounded-sm transition-colors ${locMode === "auto" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
              >
                {t("mapDetect")}
              </button>
              <button 
                type="button" 
                onClick={() => setLocMode("manual")}
                className={`text-xs px-2 py-1 rounded-sm transition-colors ${locMode === "manual" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
              >
                {t("mapSelect")}
              </button>
            </div>
          </div>

          {locMode === "auto" ? (
            <>
              {!loc && !locError && (
                <>
                  <p className="text-xs text-muted-foreground">{t("locationRequired", { n: STORE.deliveryRadiusKm })}</p>
                  <Button type="button" variant="outline" onClick={requestLocation} disabled={locLoading} className="w-full">
                    {locLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("locating")}</> : t("useMyLocation")}
                  </Button>
                </>
              )}
              {locError && (
                <>
                  <p className="text-sm text-destructive">{locError}</p>
                  <Button type="button" variant="outline" onClick={requestLocation} className="w-full">{t("useMyLocation")}</Button>
                </>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t("mapPinpoint")}</p>
              <div className="h-56 rounded-md overflow-hidden border relative z-0">
                <MapContainer center={loc ? [loc.lat, loc.lng] : [STORE.lat, STORE.lng]} zoom={13} style={{ height: "100%", width: "100%", zIndex: 0 }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {loc && <Marker position={[loc.lat, loc.lng]} icon={customIcon} />}
                  <MapEvents setLoc={setLoc} />
                </MapContainer>
              </div>
            </div>
          )}
          {loc && withinRadius && (
            <p className="text-sm text-success font-medium">{t("insideRadius", { d: loc.distance.toFixed(1) })}</p>
          )}
          {loc && !withinRadius && (
            <p className="text-sm text-destructive font-medium">{t("outsideRadius", { d: loc.distance.toFixed(1), n: STORE.deliveryRadiusKm })}</p>
          )}
        </Card>

        <Card className="p-4 space-y-3">
          <div>
            <Label>{t("fullName")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>{t("address")}</Label>
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t("addressPlaceholder")} rows={3} />
            <p className="text-xs text-muted-foreground mt-1">{t("loniDelivery")}</p>
          </div>
          <div>
            <Label>{t("notes")}</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </Card>

        {(profile?.points_balance ?? 0) > 0 && maxRedeem > 0 && (
          <Card className="p-4">
            <div className="flex justify-between items-center mb-1">
              <div>
                <strong className="text-base">{t("redeem")}</strong>
                <p className="text-xs text-muted-foreground mt-0.5">{t("pointsBalance")}: {profile?.points_balance}</p>
              </div>
              <Switch checked={redeemPts > 0} onCheckedChange={(checked) => setRedeemPts(checked ? maxRedeem : 0)} />
            </div>
            <p className="text-sm font-medium text-success mt-2">
              {redeemPts > 0 ? `− ${inr(rupeesForPoints(maxRedeem))} (Applied ${maxRedeem} points)` : t("pointsRedeemMax", { n: maxRedeem, r: rupeesForPoints(maxRedeem) })}
            </p>
          </Card>
        )}

        {/* Payment method */}
        <Card className="p-4 space-y-3">
          <div className="font-semibold">{t("paymentMethod")}</div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setPaymentMethod("cod")}
              className={`rounded-lg border-2 p-3 text-sm font-medium transition-colors ${paymentMethod === "cod" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}>
              💵 {t("payCod")}
            </button>
            <button type="button" onClick={() => setPaymentMethod("payu")}
              className={`rounded-lg border-2 p-3 text-sm font-medium transition-colors ${paymentMethod === "payu" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}>
              💳 {t("payOnline")}
            </button>
          </div>

          {paymentMethod === "payu" && (
            <div className="rounded-lg bg-muted/50 p-3 text-center space-y-2">
              <div className="text-sm font-medium">Secure online payment via PayU</div>
              <p className="text-xs text-muted-foreground">
                You will be redirected to PayU's secure payment page after placing the order.
                Supports UPI, cards, net banking, and wallets.
              </p>
            </div>
          )}
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("subtotal")}</span><span>{inr(subtotal)}</span></div>
          {discount > 0 && <div className="flex justify-between text-sm text-success"><span>{t("discount")}</span><span>− {inr(discount)}</span></div>}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("delivery")}</span>
            <span>{delivery === 0 ? <span className="text-success font-semibold">FREE</span> : inr(delivery)}</span>
          </div>
          <div className="flex justify-between font-bold pt-2 border-t"><span>{t("total")}</span><span>{inr(total)}</span></div>
          {earnPts > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 bg-primary/5 rounded-md px-3 py-2 mt-1">
              <Gift className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span>{t("pointsAfterDelivery", { n: earnPts, r: earnValue })}</span>
            </div>
          )}
        </Card>

        <Button className="w-full h-12 text-base" onClick={placeOrder} disabled={placing || !canPlace}>
          {placing ? "…" : paymentMethod === "payu" ? t("placeOrderPayu") : t("placeOrderCod")}
        </Button>
      </main>
    </div>
  );
}

/**
 * Launch PayU Bolt.js payment modal.
 * Currently uses test/sandbox credentials. Replace PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT
 * in .env with production values when ready.
 */
async function launchPayU(orderId: string, amount: number, name: string, phone: string, email: string): Promise<void> {
  // Fetch hash from server
  const resp = await fetch("/api/payu-hash", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      txnid: orderId,
      amount: amount.toFixed(2),
      productinfo: "Home Needs Order",
      firstname: name,
      email: email || `u${phone}@homeneeds.in`,
      phone,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Hash generation failed: ${errText}`);
  }

  const { hash, key } = await resp.json();

  return new Promise((resolve, reject) => {
    const bolt = (window as any).bolt;
    if (!bolt) {
      reject(new Error("PayU Bolt.js not loaded. Please refresh and try again."));
      return;
    }

    bolt.launch({
      key,
      txnid: orderId,
      hash,
      amount: amount.toFixed(2),
      firstname: name,
      email: email || `u${phone}@homeneeds.in`,
      phone,
      productinfo: "Home Needs Order",
      surl: `${window.location.origin}/orders/${orderId}`,
      furl: `${window.location.origin}/orders/${orderId}`,
    }, {
      responseHandler: (response: any) => {
        if (response.response.txnStatus === "SUCCESS") {
          resolve();
        } else {
          reject(new Error(response.response.txnMessage || "Payment failed"));
        }
      },
      catchException: (error: any) => {
        reject(new Error(error.message || "Payment cancelled"));
      },
    });
  });
}
