import { Package, AlertTriangle, DollarSign, Wine, TrendingUp, ShoppingCart, Calendar as CalIcon, X } from "lucide-react";
import { Product } from "@/lib/inventory-data";
import { useState, useMemo } from "react";
import { useSalesHistory } from "@/hooks/useInventory";
import { format, isSameMonth, parseISO } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Button } from "@/components/ui/button";

interface StatsCardsProps {
  products: Product[];
}

export function StatsCards({ products }: StatsCardsProps) {
  const { data: sales = [] } = useSalesHistory();
  const [showRevenueChart, setShowRevenueChart] = useState(false);
  const [chartMode, setChartMode] = useState<"daily" | "monthly">("daily");

  const totalProducts = products.length;
  const totalUnits = products.reduce((sum, p) => sum + p.quantity, 0);
  const inventoryValue = products.reduce((sum, p) => sum + p.priceIn * p.quantity, 0);
  const possibleValue = products.reduce((sum, p) => sum + p.priceOut * p.quantity, 0);
  const revenue = possibleValue - inventoryValue;
  const lowStock = products.filter((p) => p.quantity <= p.minStock).length;

  const stats = [
    { label: "Total Products", value: totalProducts, icon: Wine, color: "text-primary" },
    { label: "Units in Stock", value: totalUnits.toLocaleString(), icon: Package, color: "text-success" },
    { label: "Inventory Cost", value: `ETB ${inventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-muted-foreground" },
    { label: "Possible Value", value: `ETB ${possibleValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: "text-primary", subtitle: "If all stock sold" },
    { label: "Revenue", value: `ETB ${revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: ShoppingCart, color: "text-[hsl(var(--revenue))]", isClickable: true },
    { label: "Low Stock Alerts", value: lowStock, icon: AlertTriangle, color: lowStock > 0 ? "text-destructive" : "text-success" },
  ];

  // Process sales data for chart
  const chartData = useMemo(() => {
    const validSales = sales.filter((s: any) => !s.is_reversed);
    const agg: Record<string, { totalSold: number, revenue: number, details: any[] }> = {};

    validSales.forEach((sale: any) => {
      const dateStr = chartMode === "daily"
        ? format(new Date(sale.sale_date), 'MMM dd')
        : format(new Date(sale.sale_date), 'MMM yyyy');

      if (!agg[dateStr]) agg[dateStr] = { totalSold: 0, revenue: 0, details: [] };
      agg[dateStr].totalSold += sale.quantity;
      agg[dateStr].revenue += (sale.quantity * sale.price_at_sale);
      agg[dateStr].details.push(sale.product?.name || "Item");
    });

    return Object.keys(agg).map(date => ({
      date,
      totalSold: agg[date].totalSold,
      revenue: agg[date].revenue,
      rawDetails: agg[date].details
    })).reverse(); // Oldest to newest left-to-right (assuming SQL gives newest first)
  }, [sales, chartMode]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover text-popover-foreground border shadow-lg p-3 rounded-md text-sm z-50">
          <p className="font-bold mb-1">{label}</p>
          <p className="text-[hsl(var(--revenue))] font-medium">Revenue: ETB {payload[0].value.toFixed(2)}</p>
          <p className="text-muted-foreground">Items Sold: {payload[0].payload.totalSold}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            onClick={() => stat.isClickable && setShowRevenueChart(!showRevenueChart)}
            className={`glass-card rounded-lg p-4 glow-red animate-fade-in ${stat.isClickable ? 'cursor-pointer hover:bg-secondary/50 ring-1 ring-transparent hover:ring-[hsl(var(--revenue))] transition-all' : ''}`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</span>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className="text-lg sm:text-xl font-display font-bold">{stat.value}</p>
            {"subtitle" in stat && stat.subtitle && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{stat.subtitle}</p>
            )}
            {"isClickable" in stat && stat.isClickable && (
              <p className="text-[10px] text-[hsl(var(--revenue))] mt-0.5 opacity-70 flex items-center gap-1">Click to view charts &rsaquo;</p>
            )}
          </div>
        ))}
      </div>

      {/* Expandable Chart Section */}
      {showRevenueChart && (
        <div className="bg-card rounded-xl border p-4 sm:p-6 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h3 className="font-display font-bold text-lg flex items-center gap-2 text-[hsl(var(--revenue))]">
                <TrendingUp className="w-5 h-5" />
                Sales & Revenue Analytics
              </h3>
              <p className="text-xs text-muted-foreground">Historical transaction data visualized</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={chartMode === "daily" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartMode("daily")}
              >
                Daily
              </Button>
              <Button
                variant={chartMode === "monthly" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartMode("monthly")}
              >
                Monthly
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowRevenueChart(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="h-[300px] w-full">
            {chartData.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground bg-secondary/20 rounded-lg">
                No sales data available to chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} dx={0} tickFormatter={(value) => `ETB ${value}`} />
                  <Tooltip cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.5 }} content={<CustomTooltip />} />
                  <Bar
                    dataKey="revenue"
                    radius={[4, 4, 0, 0]}
                    name="Gross Revenue"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="hsl(var(--revenue))" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
