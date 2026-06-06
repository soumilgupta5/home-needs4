import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = {
  id: string; name: string; name_hi?: string | null;
  price: number; image_url?: string | null; quantity: number;
};

type CartCtx = {
  items: CartItem[];
  add: (p: Omit<CartItem, "quantity">, qty?: number) => void;
  setQty: (id: string, q: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const Ctx = createContext<CartCtx>({
  items: [], add: () => {}, setQty: () => {}, remove: () => {}, clear: () => {}, count: 0, subtotal: 0,
});

const KEY = "hn_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ }
  }, [items]);

  const add: CartCtx["add"] = (p, qty = 1) => {
    setItems((cur) => {
      const idx = cur.findIndex((i) => i.id === p.id);
      if (idx >= 0) {
        const next = [...cur]; next[idx] = { ...next[idx], quantity: next[idx].quantity + qty }; return next;
      }
      return [...cur, { ...p, quantity: qty }];
    });
  };
  const setQty = (id: string, q: number) =>
    setItems((cur) => q <= 0 ? cur.filter((i) => i.id !== id) : cur.map((i) => i.id === id ? { ...i, quantity: q } : i));
  const remove = (id: string) => setItems((cur) => cur.filter((i) => i.id !== id));
  const clear = () => setItems([]);
  const count = items.reduce((a, i) => a + i.quantity, 0);
  const subtotal = items.reduce((a, i) => a + i.quantity * i.price, 0);
  return <Ctx.Provider value={{ items, add, setQty, remove, clear, count, subtotal }}>{children}</Ctx.Provider>;
}

export const useCart = () => useContext(Ctx);
