import { Pencil, Trash2, ArrowUpDown, ShoppingCart } from "lucide-react";
import { Product, categoryEmojis } from "@/lib/inventory-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import React, { useState } from "react";

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onSell?: (product: Product) => void;
}

type SortField = "name" | "category" | "priceOut" | "quantity";

export function ProductTable({ products, onEdit, onDelete, onSell }: ProductTableProps) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...products].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    if (sortField === "priceOut" || sortField === "quantity") return (a[sortField] - b[sortField]) * dir;
    return a[sortField].localeCompare(b[sortField]) * dir;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const stockStatus = (p: Product) => {
    if (p.quantity === 0) return <Badge variant="destructive" className="text-xs">Out</Badge>;
    if (p.quantity <= p.minStock) return <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">Low</Badge>;
    return <Badge className="bg-success/20 text-success border-success/30 text-xs">OK</Badge>;
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3" />
      </span>
    </th>
  );

  return (
    <div className="glass-card rounded-lg overflow-hidden glow-red">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <SortHeader field="name">Product</SortHeader>
              <SortHeader field="category">Category</SortHeader>
              <th className="hidden md:table-cell px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price In</th>
              <SortHeader field="priceOut">Price Out</SortHeader>
              <SortHeader field="quantity">Stock</SortHeader>
              <th className="hidden sm:table-cell px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((product, i) => (
              <React.Fragment key={product.id}>
                <tr
                  className="border-b border-border/30 hover:bg-secondary/50 transition-colors animate-fade-in cursor-pointer"
                  style={{ animationDelay: `${i * 30}ms` }}
                  onClick={() => setExpandedId(expandedId === product.id ? null : product.id)}
                >
                  <td className="px-3 py-3">
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.brand} · {product.volume}</p>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm">
                      {product.categoryEmoji || (categoryEmojis as any)[product.category]} {product.category}
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-3 py-3 text-sm text-muted-foreground">ETB {product.priceIn.toFixed(2)}</td>
                  <td className="px-3 py-3 text-sm font-medium">ETB {product.priceOut.toFixed(2)}</td>
                  <td className="px-3 py-3 text-sm font-medium">{product.quantity}</td>
                  <td className="hidden sm:table-cell px-3 py-3">{stockStatus(product)}</td>
                  <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {onSell && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 hover:bg-primary/10 hover:text-primary text-xs"
                          onClick={() => onSell(product)}
                          disabled={product.quantity === 0}
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Add to Cart
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-foreground" onClick={() => onEdit(product)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => onDelete(product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
                {expandedId === product.id && (
                  <tr className="bg-secondary/30 transition-all animate-in slide-in-from-top-2">
                    <td colSpan={7} className="px-4 py-3 text-sm text-center font-medium opacity-90 delay-100">
                      <span className="text-muted-foreground">Total Inventory Cost:</span> <span className="text-foreground mr-1">ETB {(product.priceIn * product.quantity).toFixed(2)}</span>
                      <span className="mx-4 text-border opacity-50">|</span>
                      <span className="text-muted-foreground">Total Possible Value:</span> <span className="text-[hsl(var(--revenue))]">ETB {(product.priceOut * product.quantity).toFixed(2)}</span>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length === 0 && (
        <div className="p-12 text-center text-muted-foreground">
          <WineIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-display text-lg">No products found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}

function WineIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 22h8" /><path d="M12 11v11" /><path d="m19 3-7 8-7-8Z" />
    </svg>
  );
}
