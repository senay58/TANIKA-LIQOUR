import { useState, useMemo } from "react";
import { format, startOfDay, startOfWeek, startOfMonth } from "date-fns";
import { Search, ShoppingCart, LogOut, Package, ReceiptText, Wine, User, Sun, Moon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/ProductGrid";
import { CategoryFilter } from "@/components/CategoryFilter";
import { CartSheet } from "@/components/CartSheet";
import { SalesHistory } from "@/components/SalesHistory";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/lib/AuthContext";
import { useCart } from "@/lib/CartContext";
import { Product } from "@/lib/inventory-data";
import { useProducts, useCategories, useSalesHistory, useSalespersonNames } from "@/hooks/useInventory";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

type SalesTab = "sales_entry" | "sales_detail";

const NAV_ITEMS: { id: SalesTab; label: string; icon: React.ElementType }[] = [
    { id: "sales_entry",  label: "Sales Entry",  icon: Package },
    { id: "sales_detail", label: "Sales Detail", icon: ReceiptText },
];

const SalesPortal = () => {
    const { logout, username } = useAuth();
    const { theme, setTheme } = useTheme();
    const { data: products = [], isLoading } = useProducts();
    const { data: categories = [] } = useCategories();
    const { data: sales = [] } = useSalesHistory();
    const { data: spNames } = useSalespersonNames();
    const { cartCount, setCartOpen } = useCart();

    const [activeTab, setActiveTab] = useState<SalesTab>("sales_entry");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("All");
    const [graphTimeFrame, setGraphTimeFrame] = useState<"all" | "today" | "week" | "month">("all");
    const [profileOpen, setProfileOpen] = useState(false);
    const { addToCart } = useCart();

    const filtered = useMemo(() => {
        return products.filter((p: Product) => {
            const matchesSearch =
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.brand.toLowerCase().includes(search.toLowerCase());
            const matchesCategory = categoryFilter === "All" || p.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [products, search, categoryFilter]);

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

        const timeLabel = graphTimeFrame === "all" ? "All Time" :
                          graphTimeFrame === "today" ? format(new Date(), "MMM dd, yyyy") :
                          graphTimeFrame === "week" ? "This Week" :
                          format(new Date(), "yyyy-MM");

        return {
            sp1: [{ name: timeLabel, revenue: sp1Rev, items: sp1Items }],
            sp2: [{ name: timeLabel, revenue: sp2Rev, items: sp2Items }]
        };
    }, [sales, graphTimeFrame]);

    return (
        <div className="flex h-screen bg-background overflow-hidden">

            {/* ── DESKTOP SIDEBAR ── */}
            <aside className={cn(
                "hidden md:flex flex-col shrink-0 bg-sidebar-background border-r border-sidebar-border transition-all duration-300 z-30",
                sidebarCollapsed ? "w-[68px]" : "w-[200px]"
            )}>
                {/* Brand */}
                <button
                    onClick={() => setSidebarCollapsed(c => !c)}
                    className={cn(
                        "flex items-center gap-3 px-4 py-5 border-b border-sidebar-border w-full text-left hover:bg-sidebar-accent transition-colors",
                        sidebarCollapsed && "justify-center px-0"
                    )}
                >
                    <div className="shrink-0 bg-primary/15 rounded-xl p-2">
                        <Wine className="w-5 h-5 text-primary" />
                    </div>
                    {!sidebarCollapsed && (
                        <div className="min-w-0">
                            <p className="font-display font-black text-sm tracking-tight text-foreground">TANIKA</p>
                            <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Sales Portal</p>
                        </div>
                    )}
                </button>

                {/* Nav */}
                <nav className="flex-1 p-2 space-y-1 pt-3">
                    {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
                        const active = activeTab === id;
                        return (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id)}
                                title={sidebarCollapsed ? label : undefined}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                                    active
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                    sidebarCollapsed && "justify-center px-0"
                                )}
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                                {!sidebarCollapsed && <span>{label}</span>}
                            </button>
                        );
                    })}
                </nav>

                {/* Bottom */}
                <div className="p-2 pb-4 space-y-1 border-t border-sidebar-border">
                    <button
                        onClick={logout}
                        title={sidebarCollapsed ? "Logout" : undefined}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all",
                            sidebarCollapsed && "justify-center px-0"
                        )}
                    >
                        <LogOut className="h-4 w-4 shrink-0" />
                        {!sidebarCollapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* ── MAIN AREA ── */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

                {/* Top bar */}
                <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border/50 bg-background/80 backdrop-blur-xl shrink-0">
                    <div className="flex items-center gap-3">
                        {/* Mobile brand - stacked */}
                        <div className="flex items-center gap-2 md:hidden">
                            <div className="bg-primary/15 rounded-lg p-1.5">
                                <Wine className="w-4 h-4 text-primary" />
                            </div>
                            <div className="leading-none">
                                <p className="font-display font-black text-sm tracking-tight text-foreground leading-tight">TANIKA</p>
                                <p className="text-[9px] text-primary uppercase tracking-widest font-bold leading-tight">liquor</p>
                            </div>
                        </div>
                        {/* Desktop page title */}
                        <div className="hidden md:flex items-center gap-2">
                            {NAV_ITEMS.map(({ id, label, icon: Icon }) =>
                                id === activeTab ? (
                                    <div key={id} className="flex items-center gap-2">
                                        <Icon className="h-5 w-5 text-primary" />
                                        <h1 className="text-lg font-display font-bold">{label}</h1>
                                    </div>
                                ) : null
                            )}
                            <span className="text-xs text-muted-foreground hidden md:block px-2 py-0.5 bg-secondary rounded-full">
                                {username}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Cart button (always visible on mobile when in sales_entry) */}
                        {activeTab === "sales_entry" && (
                            <Button
                                size="sm"
                                onClick={() => setCartOpen(true)}
                                className="relative rounded-xl shadow-md shadow-primary/20 font-bold"
                            >
                                <ShoppingCart className="h-4 w-4 mr-1.5" />
                                <span className="hidden sm:inline">Cart</span>
                                {cartCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center ring-2 ring-background">
                                        {cartCount}
                                    </span>
                                )}
                            </Button>
                        )}

                        {/* Profile Button */}
                        <Popover open={profileOpen} onOpenChange={setProfileOpen}>
                            <PopoverTrigger asChild>
                                <button className="flex items-center justify-center h-9 w-9 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all shadow-sm">
                                    <User className="w-4 h-4 text-primary" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-56 p-2 rounded-2xl shadow-2xl bg-popover/95 backdrop-blur-xl border-border">
                                <div className="px-3 py-2 border-b border-border/50 mb-1">
                                    <p className="text-xs font-bold text-foreground">{username}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Sales Staff</p>
                                </div>
                                {/* Theme toggle */}
                                <button
                                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-all"
                                >
                                    {theme === "dark"
                                        ? <Sun className="h-4 w-4 text-yellow-400" />
                                        : <Moon className="h-4 w-4 text-blue-400" />
                                    }
                                    <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                                </button>
                                {/* Logout */}
                                <button
                                    onClick={logout}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all"
                                >
                                    <LogOut className="h-4 w-4" />
                                    <span>Log Out</span>
                                </button>
                            </PopoverContent>
                        </Popover>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 pb-28 md:pb-6">

                    {/* ── SALES ENTRY ── */}
                    {activeTab === "sales_entry" && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    placeholder="Search products by name or brand..."
                                    className="pl-10 h-11 rounded-2xl bg-secondary/30 border-border/50"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>

                            <CategoryFilter selected={categoryFilter} onSelect={setCategoryFilter} categories={categories} />

                            {isLoading ? (
                                <div className="py-16 text-center text-muted-foreground">Loading products...</div>
                            ) : filtered.length === 0 ? (
                                <div className="py-16 text-center text-muted-foreground">No products found.</div>
                            ) : (
                                <ProductGrid
                                    products={filtered}
                                    onSell={p => { addToCart(p, 1, p.priceOut); }}
                                    hidePriceIn={true}
                                />
                            )}
                        </div>
                    )}

                    {/* ── SALES DETAIL ── */}
                    {activeTab === "sales_detail" && (() => {
                        const spList = [
                            { key: 1, name: spNames?.sp1 || "Salesperson 1", color: "#f97316", bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-500" },
                            { key: 2, name: spNames?.sp2 || "Salesperson 2", color: "#3b82f6", bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-500" },
                        ];

                        const sp1Revenue = salesDataBySP.sp1?.[0]?.revenue || 0;
                        const sp2Revenue = salesDataBySP.sp2?.[0]?.revenue || 0;
                        const maxRevenue = Math.max(sp1Revenue, sp2Revenue, 1);
                        const timeLabel = graphTimeFrame === "all" ? "All Time" : graphTimeFrame === "today" ? "Today" : graphTimeFrame === "week" ? "This Week" : "This Month";

                        return (
                            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
                                <div>
                                    <h2 className="text-lg font-display font-bold">Sales Detail</h2>
                                    <p className="text-sm text-muted-foreground mt-1">Track performance and review sales records.</p>
                                </div>

                                {/* Time Frame Selector */}
                                <div className="flex items-center justify-between bg-card/50 border border-border/50 rounded-xl p-4 shadow-sm">
                                    <h3 className="font-bold text-sm">Performance Overview</h3>
                                    <Select value={graphTimeFrame} onValueChange={(val: any) => setGraphTimeFrame(val)}>
                                        <SelectTrigger className="w-[140px] h-9">
                                            <SelectValue placeholder="Time Frame" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="today">Today</SelectItem>
                                            <SelectItem value="week">This Week</SelectItem>
                                            <SelectItem value="month">This Month</SelectItem>
                                            <SelectItem value="all">All Time</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Salesperson Stats */}
                                <div className="grid grid-cols-1 gap-4">
                                    {spList.map((sp) => {
                                        const data = sp.key === 1 ? salesDataBySP.sp1[0] : salesDataBySP.sp2[0];
                                        const pct = maxRevenue > 0 ? Math.round((data.revenue / maxRevenue) * 100) : 0;
                                        return (
                                            <div key={sp.key} className={`rounded-xl border ${sp.border} ${sp.bg} p-5 space-y-4`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full" style={{ background: sp.color }} />
                                                        <h3 className={`font-bold text-sm ${sp.text}`}>{sp.name}</h3>
                                                    </div>
                                                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{timeLabel}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-background/60 rounded-lg p-3">
                                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Revenue</p>
                                                        <p className="text-xl font-black text-foreground">ETB {data.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                                    </div>
                                                    <div className="bg-background/60 rounded-lg p-3">
                                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Items Sold</p>
                                                        <p className="text-xl font-black text-foreground">{data.items}</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between text-[10px] text-muted-foreground">
                                                        <span>Relative Performance</span>
                                                        <span className="font-bold" style={{ color: sp.color }}>{pct}%</span>
                                                    </div>
                                                    <div className="h-2 bg-background/60 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-700"
                                                            style={{ width: `${pct}%`, background: sp.color }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Sales History */}
                                <SalesHistory open={true} onOpenChange={() => {}} inline />
                            </div>
                        );
                    })()}
                </main>
            </div>

            {/* ── MOBILE BOTTOM NAV (floating pill - slim) ── */}
            <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
                <div className="flex items-center gap-0.5 bg-foreground/90 backdrop-blur-xl rounded-full px-1.5 py-1 shadow-2xl shadow-black/40 border border-white/10">
                    {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
                        const active = activeTab === id;
                        return (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id)}
                                aria-label={label}
                                className={cn(
                                    "relative flex items-center justify-center w-9 h-8 rounded-full transition-all duration-200",
                                    active
                                        ? "bg-background text-foreground shadow scale-105"
                                        : "text-background/60 hover:text-background"
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {id === "sales_entry" && cartCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center ring-1 ring-background">
                                        {cartCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </nav>

            <CartSheet />
        </div>
    );
};

export default SalesPortal;
