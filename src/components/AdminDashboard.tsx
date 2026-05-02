import { Package, AlertTriangle, DollarSign, Wine, TrendingUp, ShoppingCart, Users, ArrowRight, X, Eye, EyeOff, Wallet } from "lucide-react";
import { Product } from "@/lib/inventory-data";
import { useState, useMemo } from "react";
import { useSalesHistory, useCredits, useFinanceSummary } from "@/hooks/useInventory";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Button } from "@/components/ui/button";

interface AdminDashboardProps {
  products: Product[];
  onNavigateToFinance: () => void;
}

export function AdminDashboard({ products, onNavigateToFinance }: AdminDashboardProps) {
  const { data: sales = [] } = useSalesHistory();
  const { data: credits = [] } = useCredits();
  const { data: summary } = useFinanceSummary();

  const [showRevenueChart, setShowRevenueChart] = useState(false);
  const [chartMode, setChartMode] = useState<"daily" | "monthly">("daily");
  const [hideValues, setHideValues] = useState(false);

  const formatCurrency = (val: number) => {
    if (hideValues) return "*******";
    return `ETB ${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const totalProducts = products.length;
  const totalUnits = products.reduce((sum, p) => sum + p.quantity, 0);
  const inventoryValue = products.reduce((sum, p) => sum + p.priceIn * p.quantity, 0);
  const possibleValue = products.reduce((sum, p) => sum + p.priceOut * p.quantity, 0);
  const revenue = possibleValue - inventoryValue;
  const lowStock = products.filter((p) => p.quantity <= p.minStock).length;

  const pendingCredits = useMemo(() => credits.filter((c: any) => c.status === 'pending'), [credits]);
  const totalCreditAmount = pendingCredits.reduce((sum: any, c: any) => sum + Number(c.amount), 0);
  const numberOfPeopleOwing = pendingCredits.length;

  const stats = [
    { label: "Cash Pile", value: formatCurrency(summary?.balance || 0), icon: Wallet, color: "text-green-500", subtitle: "Real-time liquidity" },
    { label: "Products / Units", value: `${totalProducts} / ${totalUnits.toLocaleString()}`, icon: Package, color: "text-primary", subtitle: "Current inventory" },
    { label: "Inv. Cost / Value", value: `${formatCurrency(inventoryValue)} / ${formatCurrency(possibleValue)}`, icon: DollarSign, color: "text-muted-foreground" },
    { label: "Expected Revenue", value: formatCurrency(revenue), icon: TrendingUp, color: "text-[hsl(var(--revenue))]", isClickable: true },
    { label: "Low Stock", value: lowStock, icon: AlertTriangle, color: lowStock > 0 ? "text-destructive" : "text-success", subtitle: "Products needing restock" },
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
    })).reverse();
  }, [sales, chartMode]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover text-popover-foreground border shadow-lg p-3 rounded-md text-sm z-50">
          <p className="font-bold mb-1">{label}</p>
          <p className="text-[hsl(var(--revenue))] font-medium">Revenue: {formatCurrency(payload[0].value)}</p>
          <p className="text-muted-foreground">Items Sold: {payload[0].payload.totalSold}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setHideValues(!hideValues)}
          className="text-muted-foreground hover:text-primary gap-2"
        >
          {hideValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {hideValues ? "Show Numbers" : "Hide Numbers"}
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            onClick={() => stat.isClickable && setShowRevenueChart(!showRevenueChart)}
            className={`glass-card rounded-xl p-5 glow-red animate-fade-in ${stat.isClickable ? 'cursor-pointer hover:bg-secondary/50 ring-1 ring-transparent hover:ring-[hsl(var(--revenue))] transition-all shadow-md hover:shadow-lg' : 'shadow-md'}`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{stat.label}</span>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="text-xl sm:text-2xl font-display font-bold">{stat.value}</p>
            {"subtitle" in stat && stat.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
            )}
            {"isClickable" in stat && stat.isClickable && (
              <p className="text-xs text-[hsl(var(--revenue))] mt-1 opacity-80 flex items-center gap-1 font-medium">Click to view charts &rsaquo;</p>
            )}
          </div>
        ))}
      </div>

      {/* Credit Summary Card */}
      <div className="bg-card/60 backdrop-blur-sm rounded-xl border border-border shadow-md p-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-4">
        <div className="flex items-center gap-4">
          <div className="bg-destructive/10 p-3 rounded-full">
            <Users className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">Outstanding Credits</p>
            <p className="text-2xl font-display font-bold">
              {formatCurrency(totalCreditAmount)}
              <span className="text-sm font-normal text-muted-foreground ml-2">across {numberOfPeopleOwing} people</span>
            </p>
          </div>
        </div>
        <Button onClick={onNavigateToFinance} className="w-full sm:w-auto rounded-xl" size="lg">
          Manage Finances
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Expandable Chart Section */}
      {showRevenueChart && (
        <div className="bg-card rounded-xl border p-4 sm:p-6 shadow-md animate-in slide-in-from-top-4 fade-in duration-300">
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
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} dx={0} tickFormatter={(value) => hideValues ? '***' : `ETB ${value}`} />
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
