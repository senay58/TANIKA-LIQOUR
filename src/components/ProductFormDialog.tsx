import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Product, Category, categories } from "@/lib/inventory-data";

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSave: (product: Omit<Product, "id"> & { id?: string }) => void;
  categories: any[];
}

const emptyForm = { name: "", category: "Whiskey", brand: "", priceIn: "" as any, priceOut: "" as any, quantity: "" as any, minStock: "" as any, volume: "750ml" };

export function ProductFormDialog({ open, onOpenChange, product, onSave, categories }: ProductFormDialogProps) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (product) setForm({ name: product.name, category: product.category, brand: product.brand, priceIn: product.priceIn, priceOut: product.priceOut, quantity: product.quantity, minStock: product.minStock, volume: product.volume });
    else setForm(emptyForm);
  }, [product, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...form, id: product?.id });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{product ? "Edit Product" : "Add New Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Product Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="bg-secondary border-border" />
            </div>
            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required className="bg-secondary border-border" />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {categories.map((c) => <SelectItem key={c.id || c.name} value={c.name}>{c.emoji} {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priceIn">Price In (ETB)</Label>
              <Input id="priceIn" type="number" step="0.01" min="0" value={form.priceIn} onChange={(e) => setForm({ ...form, priceIn: e.target.value === "" ? ("" as any) : parseFloat(e.target.value) })} required className="bg-secondary border-border" />
            </div>
            <div>
              <Label htmlFor="priceOut">Price Out (ETB)</Label>
              <Input id="priceOut" type="number" step="0.01" min="0" value={form.priceOut} onChange={(e) => setForm({ ...form, priceOut: e.target.value === "" ? ("" as any) : parseFloat(e.target.value) })} required className="bg-secondary border-border" />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value === "" ? ("" as any) : parseInt(e.target.value) })} required className="bg-secondary border-border" />
            </div>
            <div>
              <Label htmlFor="minStock">Min. Stock</Label>
              <Input id="minStock" type="number" min="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value === "" ? ("" as any) : parseInt(e.target.value) })} required className="bg-secondary border-border" />
            </div>
            <div>
              <Label htmlFor="volume">Volume</Label>
              <Input id="volume" value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value })} required className="bg-secondary border-border" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{product ? "Update" : "Add Product"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
