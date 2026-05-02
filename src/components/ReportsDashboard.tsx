import { FileText, Download, FileDigit, Calendar as CalIcon, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProducts, useSalesHistory, useSalespersonNames } from "@/hooks/useInventory";
import { useState, useMemo } from "react";
import { format, isWithinInterval, startOfDay, endOfDay, startOfWeek, startOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { SalesHistory } from "@/components/SalesHistory";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ReportsDashboard() {
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: sales = [], isLoading: loadingSales } = useSalesHistory();
  const { data: spNames } = useSalespersonNames();
  const [isExporting, setIsExporting] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateRange | undefined>(undefined);
  const [graphTimeFrame, setGraphTimeFrame] = useState<"all" | "today" | "week" | "month">("all");

  // ── Sales Performance Data ──────────────────────────────────────────────────
  const salesDataBySP = useMemo(() => {
    let sp1Rev = 0, sp1Items = 0;
    let sp2Rev = 0, sp2Items = 0;
    const now = new Date();

    sales.forEach((s: any) => {
      if (s.is_reversed) return;
      const saleDate = new Date(s.sale_date);
      let include = false;

      if (graphTimeFrame === "all") include = true;
      else if (graphTimeFrame === "today") include = saleDate >= startOfDay(now);
      else if (graphTimeFrame === "week") include = saleDate >= startOfWeek(now, { weekStartsOn: 1 });
      else if (graphTimeFrame === "month") include = saleDate >= startOfMonth(now);

      if (include) {
        const revenue = s.quantity * s.price_at_sale;
        if (s.salesperson_number === 1) { sp1Rev += revenue; sp1Items += s.quantity; }
        if (s.salesperson_number === 2) { sp2Rev += revenue; sp2Items += s.quantity; }
      }
    });

    return [
      { name: spNames?.sp1 || "Salesperson 1", revenue: sp1Rev, items: sp1Items, color: "#f97316" },
      { name: spNames?.sp2 || "Salesperson 2", revenue: sp2Rev, items: sp2Items, color: "#3b82f6" },
    ];
  }, [sales, graphTimeFrame, spNames]);

  // ── PDF Exports ──────────────────────────────────────────────────────────────
  const drawPDFHeader = (doc: jsPDF, title: string) => {
    // Big Red Logo
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(180, 20, 20); // Branded Red
    doc.text("TANIKA LIQUOR", 14, 25);
    
    // Subtitle / Title
    doc.setFontSize(12);
    doc.setTextColor(80);
    doc.text(title, 14, 34);
    
    // Decorative line
    doc.setDrawColor(180, 20, 20);
    doc.setLineWidth(1);
    doc.line(14, 38, 196, 38);
    
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Generated: ${format(new Date(), "PPpp")}`, 14, 45);
  };

  const exportInventoryPDF = () => {
    if (products.length === 0) { toast.error("No inventory data to export."); return; }
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      drawPDFHeader(doc, "Complete Inventory & Valuation Report");

      autoTable(doc, {
        head: [["Product Name", "Brand", "Category", "Quantity", "Price In (ETB)", "Price Out (ETB)"]],
        body: products.map((p) => [p.name, p.brand, p.category, p.quantity.toString(), p.priceIn.toFixed(2), p.priceOut.toFixed(2)]),
        startY: 55,
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [180, 20, 20], textColor: 255, fontStyle: 'bold' },
      });

      doc.save(`Tanika_Inventory_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Branded inventory report downloaded.");
    } catch (err) {
      toast.error("Failed to generate PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const exportSalesPDF = () => {
    let salesToExport = sales as any[];
    if (dateFilter?.from) {
      salesToExport = sales.filter((s: any) => {
        const saleDate = new Date(s.sale_date);
        const start = startOfDay(dateFilter.from!);
        const end = dateFilter.to ? endOfDay(dateFilter.to) : endOfDay(dateFilter.from!);
        return isWithinInterval(saleDate, { start, end });
      });
    }
    if (salesToExport.length === 0) { toast.error("No sales data for the selected date range."); return; }

    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const dateStr = dateFilter?.from
        ? `${format(dateFilter.from, "PPP")}${dateFilter.to ? ` - ${format(dateFilter.to, "PPP")}` : ""}`
        : "Full History";
      
      drawPDFHeader(doc, `Sales Details Report (${dateStr})`);

      autoTable(doc, {
        head: [["Date", "Product", "Customer", "Qty", "Total (ETB)", "Payment", "Ref", "Salesperson"]],
        body: salesToExport.map((s: any) => [
          format(new Date(s.sale_date), "MMM dd, yyyy HH:mm"),
          s.product?.name || "Unknown",
          s.customer_info || "-",
          s.quantity.toString(),
          (s.quantity * s.price_at_sale).toFixed(2),
          s.payment_method === "cash" ? "Cash" : `${s.bank_name || "Bank"}`,
          s.reference_number || "-",
          s.salesperson_number === 1 ? (spNames?.sp1 || "Salesperson 1") : (s.salesperson_number === 2 ? (spNames?.sp2 || "Salesperson 2") : "N/A"),
        ]),
        startY: 55,
        theme: "grid",
        styles: { fontSize: 8 },
        headStyles: { fillColor: [180, 20, 20], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 2: { cellWidth: 28 } },
      });

      const fileName = dateFilter?.from
        ? `Tanika_Sales_${format(dateFilter.from, "yyyy-MM-dd")}${dateFilter.to ? `_to_${format(dateFilter.to, "yyyy-MM-dd")}` : ""}.pdf`
        : `Tanika_Sales_Full_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`;
      doc.save(fileName);
      toast.success("Branded sales report downloaded.");
    } catch (err) {
      toast.error("Failed to generate PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative space-y-6 pb-32 md:pb-24">

      {/* ── Sales History (inline at top) ──────────────────────────── */}
      <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl p-6 shadow-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">Sales Detail & Analytics</h2>
            <p className="text-sm text-muted-foreground">Historical transaction log and performance insights.</p>
          </div>
        </div>
        
        {/* The SalesHistory now has its own internal collapsible state by default */}
        <SalesHistory open={true} onOpenChange={() => {}} inline showUndo={true} />
      </div>

      {/* ── Salesperson Performance Graph (Admin only) ── */}
      <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl p-6 shadow-md">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold">Sales Performance</h2>
              <p className="text-sm text-muted-foreground">Comparative revenue analytics for sales staff.</p>
            </div>
          </div>
          <Select value={graphTimeFrame} onValueChange={(v: any) => setGraphTimeFrame(v)}>
            <SelectTrigger className="w-[140px] h-9 text-xs bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary stat pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {salesDataBySP.map((sp) => (
            <div key={sp.name} className="rounded-xl p-5 border shadow-sm transition-all hover:shadow-md" style={{ borderColor: sp.color + "30", background: sp.color + "05" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: sp.color }}>{sp.name}</p>
                <div className="w-2 h-2 rounded-full" style={{ background: sp.color }} />
              </div>
              <p className="text-2xl font-black text-foreground">ETB {sp.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">{sp.items} items sold in total</p>
            </div>
          ))}
        </div>

        <div className="h-[280px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesDataBySP} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={(v) => `ETB ${v}`} />
              <Tooltip
                cursor={{ fill: "hsl(var(--primary))", opacity: 0.05 }}
                content={({ active, payload }) => {
                  if (active && payload?.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-popover/90 backdrop-blur-md border border-border shadow-2xl p-4 rounded-xl text-xs min-w-[180px]">
                        <p className="font-bold text-sm mb-2">{d.name}</p>
                        <div className="space-y-1">
                          <p className="flex justify-between"><span>Revenue:</span> <span className="font-bold">ETB {d.revenue.toFixed(2)}</span></p>
                          <p className="flex justify-between text-muted-foreground"><span>Items sold:</span> <span>{d.items}</span></p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="revenue" radius={[8, 8, 0, 0]} barSize={80}>
                {salesDataBySP.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── FLOATING DOWNLOAD BUTTON ── */}
      <div className="fixed bottom-20 right-5 md:bottom-8 md:right-8 z-50">
        <Popover>
          <PopoverTrigger asChild>
            <Button size="lg" className="h-14 w-14 rounded-full shadow-2xl shadow-primary/40 hover:scale-105 transition-transform p-0 bg-primary hover:bg-primary/90">
              <Download className="w-6 h-6 text-primary-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-2 bg-popover/90 backdrop-blur-xl border-border shadow-2xl rounded-2xl mb-4" align="end" side="top">
            <div className="p-3 border-b border-border/50 mb-1">
              <p className="text-sm font-bold text-foreground">Download Reports</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">Select a report type to export</p>
            </div>
            
            <div className="space-y-1">
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 h-12 rounded-xl text-sm"
                onClick={exportInventoryPDF}
                disabled={loadingProducts || isExporting}
              >
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                  <FileDigit className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-xs">Total Inventory</p>
                  <p className="text-[9px] text-muted-foreground">Full stock & valuation report</p>
                </div>
              </Button>

              <div className="px-3 py-2">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Sales Report Filter</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left text-xs h-9 rounded-lg bg-background/50", !dateFilter && "text-muted-foreground")}
                    >
                      <CalIcon className="mr-2 h-3.5 w-3.5" />
                      {dateFilter?.from ? (
                        dateFilter.to
                          ? <>{format(dateFilter.from, "LLL dd")} - {format(dateFilter.to, "LLL dd")}</>
                          : format(dateFilter.from, "LLL dd")
                      ) : (
                        <span>Date Range (Optional)</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar mode="range" selected={dateFilter} onSelect={setDateFilter} numberOfMonths={1} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 h-12 rounded-xl text-sm"
                onClick={exportSalesPDF}
                disabled={loadingSales || isExporting}
              >
                <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                  <FileDigit className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-xs">Sales Details</p>
                  <p className="text-[9px] text-muted-foreground">Detailed transaction log export</p>
                </div>
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

