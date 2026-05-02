import { useState, useMemo } from "react";
import {
    Search, Plus, Tag, Package, TrendingUp, Wallet,
    Settings, LogOut, Wine, FileText, User, Sun, Moon,
    ChevronLeft, ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdminDashboard } from "@/components/AdminDashboard";
import { ReportsDashboard } from "@/components/ReportsDashboard";
import { ProductTable } from "@/components/ProductTable";
import { ProductGrid } from "@/components/ProductGrid";
import { ProductFormDialog } from "@/components/ProductFormDialog";
import { CategoryFilter } from "@/components/CategoryFilter";
import { SalesHistory } from "@/components/SalesHistory";
import { AddCategoryDialog } from "@/components/AddCategoryDialog";
import { AdminSettingsDialog } from "@/components/AdminSettingsDialog";
import { FinanceDashboard } from "@/components/FinanceDashboard";
import { useAuth } from "@/lib/AuthContext";
import { Product } from "@/lib/inventory-data";
import { useProducts, useSaveProduct, useDeleteProduct, useCategories } from "@/hooks/useInventory";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTheme } from "next-themes";
import heroBanner from "@/assets/hero-banner.jpg";
import { cn } from "@/lib/utils";

type Tab = "dashboard" | "inventory" | "reports" | "finance";

const NAV_ITEMS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "dashboard", label: "Dashboard", icon: TrendingUp },
    { id: "inventory", label: "Inventory",  icon: Package },
    { id: "reports",   label: "Reports",    icon: FileText },
    { id: "finance",   label: "Finance",    icon: Wallet },
];

const Index = () => {
    const { logout, username } = useAuth();
    const { theme, setTheme } = useTheme();
    const { data: products = [], isLoading } = useProducts();
    const { data: categories = [] } = useCategories();
    const saveProductMutation = useSaveProduct();
    const deleteProductMutation = useDeleteProduct();

    const [activeTab, setActiveTab] = useState<Tab>("dashboard");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("All");
    const [viewMode, setViewMode] = useState<"table" | "grid">("table");

    const [productDialogOpen, setProductDialogOpen] = useState(false);
    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const { toast } = useToast();

    const filtered = useMemo(() => {
        return products.filter((p: Product) => {
            const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase());
            const matchesCategory = categoryFilter === "All" || p.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [products, search, categoryFilter]);

    const handleSave = async (data: Omit<Product, "id"> & { id?: string }) => {
        try {
            await saveProductMutation.mutateAsync(data);
            toast({ title: data.id ? "Product updated" : "Product added", description: `${data.name} has been saved.` });
            setProductDialogOpen(false);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message || "Failed to save product" });
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this product?")) {
            try {
                await deleteProductMutation.mutateAsync(id);
                toast({ title: "Product removed" });
            } catch {
                toast({ variant: "destructive", title: "Error", description: "Failed to delete product" });
            }
        }
    };

    return (
        <div className="flex h-screen bg-background overflow-hidden">

            {/* ── DESKTOP SIDEBAR ── */}
            <aside className={cn(
                "hidden md:flex flex-col shrink-0 bg-sidebar-background border-r border-sidebar-border transition-all duration-300 z-30",
                sidebarCollapsed ? "w-[68px]" : "w-[220px]"
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
                            <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Admin Panel</p>
                        </div>
                    )}
                </button>

                {/* Nav items */}
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

                {/* Bottom: settings + logout */}
                <div className="p-2 pb-4 space-y-1 border-t border-sidebar-border">
                    <button
                        onClick={() => setSettingsOpen(true)}
                        title={sidebarCollapsed ? "Settings" : undefined}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-all",
                            sidebarCollapsed && "justify-center px-0"
                        )}
                    >
                        <Settings className="h-4 w-4 shrink-0" />
                        {!sidebarCollapsed && <span>Settings</span>}
                    </button>
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

                {/* Top Bar */}
                <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border/50 bg-background/80 backdrop-blur-xl shrink-0">
                    <div className="flex items-center gap-3">
                        {/* Mobile brand - stacked TANIKA / liquor */}
                        <div className="flex items-center gap-2 md:hidden">
                            <div className="bg-primary/15 rounded-lg p-1.5">
                                <Wine className="w-4 h-4 text-primary" />
                            </div>
                            <div className="leading-none">
                                <p className="font-display font-black text-sm tracking-tight text-foreground leading-tight">TANIKA</p>
                                <p className="text-[9px] text-primary uppercase tracking-widest font-bold leading-tight">liquor</p>
                            </div>
                        </div>
                        {/* Desktop: page title */}
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

                    {/* Profile Button (mobile + desktop) */}
                    <Popover open={profileOpen} onOpenChange={setProfileOpen}>
                        <PopoverTrigger asChild>
                            <button className="flex items-center gap-2 h-9 w-9 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all justify-center shadow-sm">
                                <User className="w-4 h-4 text-primary" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-56 p-2 rounded-2xl shadow-2xl bg-popover/95 backdrop-blur-xl border-border">
                            <div className="px-3 py-2 border-b border-border/50 mb-1">
                                <p className="text-xs font-bold text-foreground">{username}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Admin</p>
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
                            {/* Settings */}
                            <button
                                onClick={() => { setProfileOpen(false); setSettingsOpen(true); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-all"
                            >
                                <Settings className="h-4 w-4 text-muted-foreground" />
                                <span>Settings</span>
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
                </header>

                {/* Scrollable content */}
                <main className="flex-1 overflow-y-auto pb-28 md:pb-6">

                    {/* Hero banner */}
                    <div className="relative h-36 md:h-44 overflow-hidden shrink-0">
                        <img src={heroBanner} alt="Liquor shelf" className="w-full h-full object-cover object-top brightness-[1.1] saturate-[1.3] opacity-80" />
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                        {/* Centered branding */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 shadow-xl text-center">
                                <h2 className="text-2xl md:text-3xl font-display font-black text-white drop-shadow tracking-tight">
                                    TANIKA <span className="text-red-500">LIQUOR</span>
                                </h2>
                                <p className="text-[9px] md:text-[10px] text-white/80 uppercase tracking-widest mt-1 font-medium">Inventory &amp; Sales Management</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 md:p-6 space-y-6">

                        {/* ── INVENTORY ── */}
                        {activeTab === "inventory" && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
                                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card/60 backdrop-blur-xl p-4 rounded-2xl border border-border/50 shadow-lg">
                                    <div className="relative w-full sm:w-80 group">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                        <Input
                                            placeholder="Search by name or brand..."
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                            className="pl-9 bg-background/50 h-10 rounded-xl"
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setCategoryDialogOpen(true)} className="rounded-xl h-10">
                                            <Tag className="h-3.5 w-3.5 mr-1.5" />
                                            Categories
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setViewMode(v => v === "table" ? "grid" : "table")}
                                            className="h-10 w-10 rounded-xl"
                                        >
                                            {viewMode === "table"
                                                ? <div className="grid grid-cols-2 gap-[2px] w-3.5 h-3.5"><div className="bg-current rounded-[1px]" /><div className="bg-current rounded-[1px]" /><div className="bg-current rounded-[1px]" /><div className="bg-current rounded-[1px]" /></div>
                                                : <div className="flex flex-col gap-[2px] w-3.5 h-3.5"><div className="bg-current h-[3px] w-full rounded-[1px]" /><div className="bg-current h-[3px] w-full rounded-[1px]" /><div className="bg-current h-[3px] w-full rounded-[1px]" /></div>
                                            }
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => { setEditingProduct(null); setProductDialogOpen(true); }}
                                            className="h-10 rounded-xl shadow-lg shadow-primary/30 font-bold"
                                        >
                                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                                            Add Product
                                        </Button>
                                    </div>
                                </div>

                                <CategoryFilter selected={categoryFilter} onSelect={setCategoryFilter} categories={categories} />

                                {isLoading ? (
                                    <div className="py-16 text-center text-muted-foreground">Loading inventory...</div>
                                ) : viewMode === "table" ? (
                                    <ProductTable products={filtered} onEdit={p => { setEditingProduct(p); setProductDialogOpen(true); }} onDelete={handleDelete} />
                                ) : (
                                    <ProductGrid products={filtered} onEdit={p => { setEditingProduct(p); setProductDialogOpen(true); }} onDelete={handleDelete} />
                                )}
                            </div>
                        )}

                        {/* ── DASHBOARD ── */}
                        {activeTab === "dashboard" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
                                <AdminDashboard products={products} onNavigateToFinance={() => setActiveTab("finance")} />
                            </div>
                        )}

                        {/* ── REPORTS ── */}
                        {activeTab === "reports" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
                                <ReportsDashboard />
                            </div>
                        )}

                        {/* ── FINANCE ── */}
                        {activeTab === "finance" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
                                <FinanceDashboard />
                            </div>
                        )}

                    </div>
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
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* Dialogs */}
            <ProductFormDialog open={productDialogOpen} onOpenChange={setProductDialogOpen} product={editingProduct} onSave={handleSave} categories={categories} />
            <AddCategoryDialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen} />
            <AdminSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        </div>
    );
};

export default Index;
