import { Pencil, Trash2, ArrowUpDown, ShoppingCart, ChevronDown, History } from "lucide-react";
import { Product } from "@/lib/inventory-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import React, { useState } from "react";
import { useStockEntries } from "@/hooks/useInventory";
import { format } from "date-fns";

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onSell?: (product: Product) => void;
}

type SortField = "name" | "category" | "priceOut" | "quantity";

// Expanded row component — fetches its own data only when opened
function ExpandedProductRow({ product }: { product: Product }) {
  const { data: entries = [], isLoading } = useStockEntries(product.id);

  const totalCost = product.priceIn * product.quantity;
  const totalValue = product.priceOut * product.quantity;

  return (
    <tr className="bg-secondary/20 border-b border-border/30">
      <td colSpan={6} className="px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Totals */}
          <div className="flex gap-6 items-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Inventory Cost</p>
              <p className="text-base font-bold text-foreground mt-0.5">
                ETB {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-px h-8 bg-border/50" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Possible Value</p>
              <p className="text-base font-bold text-green-500 mt-0.5">
                ETB {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Last 3 Price-In History */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1 mb-2">
              <History className="h-3 w-3" /> Last 3 Purchase Prices
            </p>
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : entries.length === 0 ? (
              <p className="text-xs text-muted-foreground">No restock history yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {entries.map((e: any, i: number) => (
                  <div key={e.id} className="bg-secondary/60 border border-border/50 rounded-lg px-3 py-1.5 text-xs">
                    <span className="text-muted-foreground">
                      {format(new Date(e.created_at), "MMM dd, yyyy")}
                    </span>
                    <span className="mx-1.5 text-border">·</span>
                    <span className="font-bold text-foreground">ETB {Number(e.price_in).toFixed(2)}</span>
                    <span className="text-muted-foreground ml-1">× {e.quantity_added} units</span>
                    {i === 0 && (
                      <span className="ml-2 text-[9px] uppercase bg-primary/20 text-primary rounded px-1 py-0.5">Latest</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

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
                    <div className="flex items-center gap-2">
                      <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0 ${expandedId === product.id ? 'rotate-180' : ''}`} />
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.brand} · {product.volume}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm">{product.category}</span>
                  </td>
                  <td className="px-3 py-3 text-sm font-medium">ETB {product.priceOut.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
                  <ExpandedProductRow product={product} />
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
