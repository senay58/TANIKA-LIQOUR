import { useMemo } from "react";
import { Package, Layers, Tag, Wallet, DollarSign, TrendingUp, ShoppingCart } from "lucide-react";
import { Product } from "@/lib/inventory-data";
import { useFinanceSummary, useSalesHistory } from "@/hooks/useInventory";
import { startOfDay } from "date-fns";

interface InventoryStatsProps {
  products: Product[];
  categories: string[];
}

export function InventoryStats({ products, categories }: InventoryStatsProps) {
  const { data: summary } = useFinanceSummary();
  const { data: sales = [] } = useSalesHistory();

  // Stock health: % of products that are adequately stocked
  const totalProducts = products.length;
  const totalUnits = products.reduce((s, p) => s + p.quantity, 0);
  const uniqueCategories = categories.length;
  const lowStock = products.filter(p => p.quantity <= (p.minStock ?? 0)).length;
  const inventoryValue = products.reduce((s, p) => s + p.priceIn * p.quantity, 0);

  const healthPct = totalProducts > 0
    ? Math.round(((totalProducts - lowStock) / totalProducts) * 100)
    : 100;

  const healthColor =
    healthPct >= 75 ? "bg-green-500" :
    healthPct >= 45 ? "bg-yellow-400" :
    "bg-red-500";

  const healthLabel =
    healthPct >= 75 ? "Healthy" :
    healthPct >= 45 ? "Warning" :
    "Critical";

  const healthTextColor =
    healthPct >= 75 ? "text-green-500" :
    healthPct >= 45 ? "text-yellow-400" :
    "text-red-500";

  // Today's sales
  const todayStart = startOfDay(new Date());
  const todaySales = useMemo(() =>
    sales.filter((s: any) => !s.is_reversed && new Date(s.sale_date) >= todayStart),
  [sales]);
  const todayRevenue = todaySales.reduce((s: number, sale: any) => s + sale.quantity * sale.price_at_sale, 0);
  // Profit = revenue - cost (price_in * qty per sale — approximated via product priceIn)
  const todayProfit = todaySales.reduce((s: number, sale: any) => {
    const cost = (sale.product?.priceIn ?? sale.price_at_sale * 0.65) * sale.quantity;
    return s + (sale.quantity * sale.price_at_sale - cost);
  }, 0);

  const fmt = (v: number) =>
    `ETB ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-3">

      {/* ── Row 1: Product / Unit / Category stats ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card/70 border border-border/50 rounded-xl p-3 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Package className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest font-semibold">Products</span>
          </div>
          <p className="text-2xl font-black text-foreground">{totalProducts}</p>
        </div>
        <div className="bg-card/70 border border-border/50 rounded-xl p-3 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest font-semibold">Units</span>
          </div>
          <p className="text-2xl font-black text-foreground">{totalUnits.toLocaleString()}</p>
        </div>
        <div className="bg-card/70 border border-border/50 rounded-xl p-3 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Tag className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest font-semibold">Categories</span>
          </div>
          <p className="text-2xl font-black text-foreground">{uniqueCategories}</p>
        </div>
      </div>

      {/* ── Stock Health Bar ── */}
      <div className="bg-card/70 border border-border/50 rounded-xl p-3 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Stock Health</span>
          <span className={`text-xs font-black ${healthTextColor}`}>{healthLabel} · {healthPct}%</span>
        </div>
        <div className="h-3 bg-secondary/60 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${healthColor}`}
            style={{ width: `${healthPct}%` }}
          />
        </div>
        {lowStock > 0 && (
          <p className="text-[10px] text-muted-foreground">{lowStock} product{lowStock !== 1 ? "s" : ""} below minimum stock level</p>
        )}
      </div>

      {/* ── Row 2: Inventory Value ── */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1">
          <DollarSign className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Inventory Val.</span>
        </div>
        <p className="text-lg font-black text-primary leading-tight">{fmt(inventoryValue)}</p>
      </div>

    </div>
  );
}
