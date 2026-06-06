import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { inr } from "@/lib/store-config";

export const Route = createFileRoute("/admin/products")({ ssr: false, component: AdminProducts });

type ProductForm = { id?: string; name: string; name_hi: string; description: string; category: string; price_inr: string; stock: string; image_url: string; is_active: boolean };
const empty: ProductForm = { name: "", name_hi: "", description: "", category: "Kitchen", price_inr: "", stock: "100", image_url: "", is_active: true };

function AdminProducts() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<ProductForm>(empty);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from('products').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('products').getPublicUrl(filePath);
      setForm({ ...form, image_url: data.publicUrl });
      toast.success("Image uploaded!");
    } catch (error: any) {
      toast.error(error.message || "Error uploading image. Check if 'products' bucket exists and is public.");
    } finally {
      setUploading(false);
    }
  };

  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => (await supabase.from("products").select("*").order("category").order("name")).data ?? [],
  });

  const startEdit = (p: any) => {
    setForm({ id: p.id, name: p.name, name_hi: p.name_hi ?? "", description: p.description ?? "", category: p.category, price_inr: String(p.price_inr), stock: String(p.stock), image_url: p.image_url ?? "", is_active: p.is_active });
    setOpen(true);
  };
  const startNew = () => { setForm(empty); setOpen(true); };

  const save = async () => {
    const payload = {
      name: form.name, name_hi: form.name_hi || null, description: form.description || null, category: form.category,
      price_inr: Number(form.price_inr), stock: Number(form.stock),
      image_url: form.image_url || null, is_active: form.is_active,
    };
    const { error } = form.id
      ? await supabase.from("products").update(payload).eq("id", form.id)
      : await supabase.from("products").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); setOpen(false); qc.invalidateQueries({ queryKey: ["admin-products"] }); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-products"] }); }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 pb-20">
      <div className="flex justify-end mb-3">
        <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" />{t("addProduct")}</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {products.map((p: any) => (
          <Card key={p.id} className="p-3 flex gap-3">
            <div className="w-16 h-16 rounded bg-muted flex items-center justify-center text-2xl shrink-0">
              {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover rounded" /> : "🛍️"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{p.name}</div>
              <div className="text-xs text-muted-foreground">{p.category} · {inr(p.price_inr)} · Stock {p.stock}</div>
              {!p.is_active && <div className="text-xs text-destructive">Inactive</div>}
            </div>
            <div className="flex flex-col gap-1">
              <Button size="icon" variant="ghost" onClick={() => startEdit(p)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? t("edit") : t("addProduct")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t("name")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>{t("nameHi")}</Label><Input value={form.name_hi} onChange={(e) => setForm({ ...form, name_hi: e.target.value })} /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description..." /></div>
            <div><Label>{t("category")}</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option>Kitchen</option><option>Cleaning</option><option>Storage</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("price")}</Label><Input type="number" value={form.price_inr} onChange={(e) => setForm({ ...form, price_inr: e.target.value })} /></div>
              <div><Label>{t("stock")}</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
            </div>
            <div><Label>{t("imageUrl")}</Label>
              {form.image_url && (
                <div className="my-2 border rounded-md overflow-hidden bg-muted w-24 h-24 flex items-center justify-center relative">
                  <span className="text-xs text-muted-foreground text-center px-2 absolute">Failed to load</span>
                  <img src={form.image_url} alt="Preview" className="w-full h-full object-cover absolute inset-0 z-10 bg-muted transition-opacity" onError={(e) => e.currentTarget.style.opacity = '0'} onLoad={(e) => e.currentTarget.style.opacity = '1'} />
                </div>
              )}
              <div className="flex gap-2 items-center mb-2 mt-1">
                <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="text-sm" />
                {uploading && <span className="text-xs text-muted-foreground animate-pulse whitespace-nowrap">Uploading...</span>}
              </div>
              <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />{t("active")}</label>
            <Button className="w-full" onClick={save}>{t("save")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
