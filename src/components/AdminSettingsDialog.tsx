import { useState, useEffect } from "react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import {
    KeyRound, Timer, ShoppingBag, ShieldCheck, RefreshCcw,
    AlertTriangle, Wallet, Package, PlusCircle, Edit2, Trash2, Check, X
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    useSalespersonNames, useProducts, useBrands, useCategories,
    useSaveProduct, useDeleteProduct, useSaveBrand, useDeleteBrand,
    useSaveCategory, useDeleteCategory
} from "@/hooks/useInventory";
import { useQueryClient } from "@tanstack/react-query";
import { Product } from "@/lib/inventory-data";

interface AdminSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// ─── Products & Brands Panel ──────────────────────────────────────────────────
function ProductsPanel() {
    const { data: products = [] } = useProducts();
    const { data: brands = [] } = useBrands();
    const { data: categories = [] } = useCategories();

    const saveProductMutation  = useSaveProduct();
    const deleteProductMutation = useDeleteProduct();
    const saveBrandMutation    = useSaveBrand();
    const deleteBrandMutation  = useDeleteBrand();
    const saveCategoryMutation = useSaveCategory();
    const deleteCategoryMutation = useDeleteCategory();

    // Sub-view
    const [subView, setSubView] = useState<"products" | "brands" | "categories" | "add-product" | "edit-product" | "add-brand" | "edit-brand" | "add-category" | "edit-category">("products");
    const [searchProducts, setSearchProducts] = useState("");
    const [searchBrands, setSearchBrands] = useState("");
    const [searchCategories, setSearchCategories] = useState("");

    // Product form
    const [pId, setPId]           = useState<string | null>(null);
    const [pName, setPName]       = useState("");
    const [pBrandId, setPBrandId] = useState("");
    const [pCategory, setPCategory] = useState("");
    const [pPriceOut, setPPriceOut] = useState("");
    const [pMinStock, setPMinStock] = useState("");
    const [pVolume, setPVolume]   = useState("750ml");

    // Brand form
    const [bId, setBId]     = useState<string | null>(null);
    const [bName, setBName] = useState("");

    // Category form
    const [cId, setCId] = useState<string | null>(null);
    const [cName, setCName] = useState("");

    function resetProductForm() {
        setPId(null); setPName(""); setPBrandId(""); setPCategory(""); setPPriceOut(""); setPMinStock(""); setPVolume("750ml");
    }

    function openEditProduct(p: Product) {
        setPId(p.id); setPName(p.name); setPBrandId((p as any).brand_id || "");
        setPCategory(p.category); setPPriceOut(p.priceOut.toString());
        setPMinStock(p.minStock.toString()); setPVolume(p.volume);
        setSubView("edit-product");
    }

    function openEditBrand(b: any) {
        setBId(b.id); setBName(b.name);
        setSubView("edit-brand");
    }

    function openEditCategory(c: any) {
        setCId(c.id); setCName(c.name);
        setSubView("edit-category");
    }

    const handleProductSubmit = async () => {
        if (!pName.trim())  { toast.error("Product name required"); return; }
        if (!pBrandId)      { toast.error("Select a brand"); return; }
        if (!pCategory)     { toast.error("Select a category"); return; }
        if (!pPriceOut || Number(pPriceOut) <= 0) { toast.error("Enter a valid selling price"); return; }
        try {
            await saveProductMutation.mutateAsync({
                id: pId || undefined,
                name: pName.trim(),
                brand_id: pBrandId,
                category: pCategory,
                priceOut: Number(pPriceOut),
                minStock: Number(pMinStock) || 0,
                volume: pVolume || "750ml",
                priceIn: 0, quantity: 0,
            });
            toast.success(`Product "${pName}" ${pId ? "updated" : "created"}!`);
            resetProductForm();
            setSubView("products");
        } catch (e: any) { toast.error(e.message || "Failed to save product"); }
    };

    const handleDeleteProduct = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        try {
            await deleteProductMutation.mutateAsync(id);
            toast.success("Product deleted");
        } catch { toast.error("Failed to delete product"); }
    };

    const handleBrandSubmit = async () => {
        if (!bName.trim()) { toast.error("Brand name required"); return; }
        try {
            await saveBrandMutation.mutateAsync({ name: bName.trim(), id: bId || undefined });
            toast.success(`Brand "${bName}" ${bId ? "updated" : "created"}!`);
            setBId(null); setBName("");
            setSubView("brands");
        } catch (e: any) { toast.error(e.message || "Failed to save brand"); }
    };

    const handleDeleteBrand = async (id: string, name: string) => {
        if (!confirm(`Delete brand "${name}"? Products using it may break.`)) return;
        try {
            await deleteBrandMutation.mutateAsync(id);
            toast.success("Brand deleted");
        } catch (e: any) { toast.error(e.message || "Cannot delete — brand is in use"); }
    };

    const handleCategorySubmit = async () => {
        if (!cName.trim()) { toast.error("Category name required"); return; }
        try {
            await saveCategoryMutation.mutateAsync({ name: cName.trim(), id: cId || undefined });
            toast.success(`Category "${cName}" ${cId ? "updated" : "created"}!`);
            setCId(null); setCName("");
            setSubView("categories");
        } catch (e: any) { toast.error(e.message || "Failed to save category"); }
    };

    const handleDeleteCategory = async (id: string, name: string) => {
        if (!confirm(`Delete category "${name}"? Products using it may break.`)) return;
        try {
            await deleteCategoryMutation.mutateAsync(id);
            toast.success("Category deleted");
        } catch (e: any) { toast.error(e.message || "Cannot delete — category is in use"); }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchProducts.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchProducts.toLowerCase())
    );
    const filteredBrands = brands.filter((b: any) =>
        b.name.toLowerCase().includes(searchBrands.toLowerCase())
    );
    const filteredCategories = categories.filter((c: any) =>
        c.name.toLowerCase().includes(searchCategories.toLowerCase())
    );

    // ── Sub-views ──

    if (subView === "add-product" || subView === "edit-product") {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Button variant="ghost" size="sm" onClick={() => { resetProductForm(); setSubView("products"); }} className="text-muted-foreground px-2">
                        ← Back
                    </Button>
                    <h3 className="font-semibold text-sm">{pId ? "Edit Product" : "Create New Product"}</h3>
                </div>

                <div className="space-y-3">
                    <div>
                        <Label className="text-xs mb-1 block">Product Name *</Label>
                        <Input value={pName} onChange={e => setPName(e.target.value)} className="bg-secondary h-10" placeholder="e.g. Johnnie Walker Black Label" autoFocus />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs mb-1 block">Brand *</Label>
                            <select
                                value={pBrandId}
                                onChange={e => setPBrandId(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-secondary px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="">Select brand...</option>
                                {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <Label className="text-xs mb-1 block">Category *</Label>
                            <select
                                value={pCategory}
                                onChange={e => setPCategory(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-secondary px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="">Select category...</option>
                                {categories.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <Label className="text-xs mb-1 block">Sell Price (ETB) *</Label>
                            <Input type="number" step="0.01" value={pPriceOut} onChange={e => setPPriceOut(e.target.value)} className="bg-secondary h-10" placeholder="300.00" />
                        </div>
                        <div>
                            <Label className="text-xs mb-1 block">Min Stock Alert</Label>
                            <Input type="number" value={pMinStock} onChange={e => setPMinStock(e.target.value)} className="bg-secondary h-10" placeholder="5" />
                        </div>
                        <div>
                            <Label className="text-xs mb-1 block">Volume</Label>
                            <Input value={pVolume} onChange={e => setPVolume(e.target.value)} className="bg-secondary h-10" placeholder="750ml" />
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => { resetProductForm(); setSubView("products"); }}>Cancel</Button>
                    <Button className="flex-1" onClick={handleProductSubmit} disabled={saveProductMutation.isPending}>
                        {saveProductMutation.isPending ? "Saving..." : pId ? "Update Product" : "Create Product"}
                    </Button>
                </div>
            </div>
        );
    }

    if (subView === "add-brand" || subView === "edit-brand") {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Button variant="ghost" size="sm" onClick={() => { setBId(null); setBName(""); setSubView("brands"); }} className="text-muted-foreground px-2">
                        ← Back
                    </Button>
                    <h3 className="font-semibold text-sm">{bId ? "Edit Brand" : "Add New Brand"}</h3>
                </div>
                <div>
                    <Label className="text-xs mb-1 block">Brand Name *</Label>
                    <Input
                        value={bName}
                        onChange={e => setBName(e.target.value)}
                        className="bg-secondary h-10"
                        placeholder="e.g. Johnnie Walker"
                        autoFocus
                        onKeyDown={e => e.key === "Enter" && handleBrandSubmit()}
                    />
                </div>
                <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setBId(null); setBName(""); setSubView("brands"); }}>Cancel</Button>
                    <Button className="flex-1" onClick={handleBrandSubmit} disabled={saveBrandMutation.isPending}>
                        {saveBrandMutation.isPending ? "Saving..." : bId ? "Update Brand" : "Create Brand"}
                    </Button>
                </div>
            </div>
        );
    }

    if (subView === "add-category" || subView === "edit-category") {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Button variant="ghost" size="sm" onClick={() => { setCId(null); setCName(""); setSubView("categories"); }} className="text-muted-foreground px-2">
                        ← Back
                    </Button>
                    <h3 className="font-semibold text-sm">{cId ? "Edit Category" : "Add New Category"}</h3>
                </div>
                <div>
                    <Label className="text-xs mb-1 block">Category Name *</Label>
                    <Input
                        value={cName}
                        onChange={e => setCName(e.target.value)}
                        className="bg-secondary h-10"
                        placeholder="e.g. Whisky"
                        autoFocus
                        onKeyDown={e => e.key === "Enter" && handleCategorySubmit()}
                    />
                </div>
                <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setCId(null); setCName(""); setSubView("categories"); }}>Cancel</Button>
                    <Button className="flex-1" onClick={handleCategorySubmit} disabled={saveCategoryMutation.isPending}>
                        {saveCategoryMutation.isPending ? "Saving..." : cId ? "Update Category" : "Create Category"}
                    </Button>
                </div>
            </div>
        );
    }

    // ── Products / Brands list toggle ──
    return (
        <div className="space-y-3">
            {/* Toggle */}
            <div className="flex gap-2">
                <button
                    onClick={() => setSubView("products")}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        subView === "products" ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
                    }`}
                >
                    🍾 Products ({products.length})
                </button>
                <button
                    onClick={() => setSubView("brands")}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        subView === "brands" ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
                    }`}
                >
                    🏷️ Brands ({brands.length})
                </button>
                <button
                    onClick={() => setSubView("categories")}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        subView === "categories" ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
                    }`}
                >
                    📁 Categories ({categories.length})
                </button>
            </div>

            {/* ── PRODUCTS LIST ── */}
            {subView === "products" && (
                <>
                    <div className="flex gap-2">
                        <Input
                            value={searchProducts}
                            onChange={e => setSearchProducts(e.target.value)}
                            placeholder="Search products..."
                            className="bg-secondary h-9 text-sm"
                        />
                        <Button size="sm" onClick={() => { resetProductForm(); setSubView("add-product"); }} className="shrink-0 h-9">
                            <PlusCircle className="h-4 w-4 mr-1" /> Add
                        </Button>
                    </div>
                    <div className="overflow-y-auto space-y-1.5 pr-0.5" style={{ maxHeight: "260px" }}>
                        {filteredProducts.length === 0 && (
                            <p className="text-center text-sm text-muted-foreground py-8">No products found.</p>
                        )}
                        {filteredProducts.map(p => (
                            <div key={p.id} className="flex items-center justify-between bg-secondary/60 rounded-lg px-3 py-2.5">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{p.name}</p>
                                    <p className="text-xs text-muted-foreground">{p.brand} • {p.volume} • ETB {p.priceOut} • Stock: {p.quantity}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 ml-2 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/20 hover:text-primary" onClick={() => openEditProduct(p)}>
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <button
                                        onClick={() => handleDeleteProduct(p.id, p.name)}
                                        className="p-1.5 rounded text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* ── BRANDS LIST ── */}
            {subView === "brands" && (
                <>
                    <div className="flex gap-2">
                        <Input
                            value={searchBrands}
                            onChange={e => setSearchBrands(e.target.value)}
                            placeholder="Search brands..."
                            className="bg-secondary h-9 text-sm"
                        />
                        <Button size="sm" onClick={() => { setBId(null); setBName(""); setSubView("add-brand"); }} className="shrink-0 h-9">
                            <PlusCircle className="h-4 w-4 mr-1" /> Add
                        </Button>
                    </div>
                    <div className="overflow-y-auto space-y-1.5 pr-0.5" style={{ maxHeight: "260px" }}>
                        {filteredBrands.length === 0 && (
                            <p className="text-center text-sm text-muted-foreground py-8">No brands found.</p>
                        )}
                        {filteredBrands.map((b: any) => (
                            <div key={b.id} className="flex items-center justify-between bg-secondary/60 rounded-lg px-3 py-2.5">
                                <p className="text-sm font-medium">{b.name}</p>
                                <div className="flex items-center gap-1 shrink-0 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/20 hover:text-primary" onClick={() => openEditBrand(b)}>
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <button
                                        onClick={() => handleDeleteBrand(b.id, b.name)}
                                        className="p-1.5 rounded text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* ── CATEGORIES LIST ── */}
            {subView === "categories" && (
                <>
                    <div className="flex gap-2">
                        <Input
                            value={searchCategories}
                            onChange={e => setSearchCategories(e.target.value)}
                            placeholder="Search categories..."
                            className="bg-secondary h-9 text-sm"
                        />
                        <Button size="sm" onClick={() => { setCId(null); setCName(""); setSubView("add-category"); }} className="shrink-0 h-9">
                            <PlusCircle className="h-4 w-4 mr-1" /> Add
                        </Button>
                    </div>
                    <div className="overflow-y-auto space-y-1.5 pr-0.5" style={{ maxHeight: "260px" }}>
                        {filteredCategories.length === 0 && (
                            <p className="text-center text-sm text-muted-foreground py-8">No categories found.</p>
                        )}
                        {filteredCategories.map((c: any) => (
                            <div key={c.id} className="flex items-center justify-between bg-secondary/60 rounded-lg px-3 py-2.5">
                                <p className="text-sm font-medium">{c.name}</p>
                                <div className="flex items-center gap-1 shrink-0 ml-2 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/20 hover:text-primary" onClick={() => openEditCategory(c)}>
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <button
                                        onClick={() => handleDeleteCategory(c.id, c.name)}
                                        className="p-1.5 rounded text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Main Settings Dialog ─────────────────────────────────────────────────────
export function AdminSettingsDialog({ open, onOpenChange }: AdminSettingsDialogProps) {
    const { username, logout, autoLogoutMinutes, setAutoLogoutMinutes } = useAuth();

    const [newPassword, setNewPassword]     = useState("");
    const [newSecret, setNewSecret]         = useState("");
    const [isUpdatingAdmin, setIsUpdatingAdmin] = useState(false);

    const [salesPassword, setSalesPassword] = useState("");
    const [salesPasswordConfirm, setSalesPasswordConfirm] = useState("");
    const [isUpdatingSales, setIsUpdatingSales] = useState(false);

    const { data: salespersonNames } = useSalespersonNames();
    const [sp1Name, setSp1Name] = useState("Salesperson 1");
    const [sp2Name, setSp2Name] = useState("Salesperson 2");
    const [isUpdatingNames, setIsUpdatingNames] = useState(false);

    const [resetPasscode, setResetPasscode] = useState("");
    const [initialCash, setInitialCash]     = useState<number | "">("");
    const [isResetting, setIsResetting]     = useState(false);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (salespersonNames) {
            setSp1Name(salespersonNames.sp1);
            setSp2Name(salespersonNames.sp2);
        }
    }, [salespersonNames]);

    const handleUpdateAdmin = async () => {
        if (!newPassword.trim() || !newSecret.trim()) {
            toast.error("All admin credential fields are required.");
            return;
        }
        setIsUpdatingAdmin(true);
        try {
            const { error } = await supabase.rpc('update_admin_credentials', {
                p_username: "admin", p_password: newPassword, p_secret: newSecret,
            });
            if (error) throw error;
            toast.success("Admin credentials updated. Please log in again.");
            onOpenChange(false);
            logout();
        } catch (err: any) {
            toast.error(err.message || "Failed to update admin credentials");
        } finally { setIsUpdatingAdmin(false); }
    };

    const handleUpdateSales = async () => {
        if (!salesPassword.trim()) { toast.error("Sales password is required."); return; }
        if (salesPassword !== salesPasswordConfirm) { toast.error("Passwords do not match."); return; }
        setIsUpdatingSales(true);
        try {
            const { error } = await supabase.rpc('update_sales_credentials', {
                p_password: salesPassword, p_username: "sales",
            });
            if (error) throw error;
            toast.success("Sales staff password updated.");
            setSalesPassword(""); setSalesPasswordConfirm("");
        } catch (err: any) {
            toast.error(err.message || "Failed to update sales credentials");
        } finally { setIsUpdatingSales(false); }
    };

    const handleUpdateNames = async () => {
        if (!sp1Name.trim() || !sp2Name.trim()) { toast.error("Both salesperson names are required."); return; }
        setIsUpdatingNames(true);
        try {
            const { error } = await supabase.rpc('update_salesperson_names', { p_sp1: sp1Name, p_sp2: sp2Name });
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['salesperson-names'] });
            toast.success("Salesperson names updated successfully.");
        } catch (err: any) {
            toast.error(err.message || "Failed to update salesperson names");
        } finally { setIsUpdatingNames(false); }
    };

    const handleSystemReset = async () => {
        if (!resetPasscode) return;
        if (!confirm("CRITICAL WARNING: This will delete EVERYTHING (Inventory, Sales, Credits). This is PERMANENT. Are you absolutely sure?")) return;
        setIsResetting(true);
        try {
            const { error } = await supabase.rpc('reset_entire_system', {
                p_password: resetPasscode,
                p_initial_cash: initialCash === "" ? 0 : Number(initialCash)
            });
            if (error) throw error;
            toast.success("System reset successful. All data has been cleared.");
            setResetPasscode(""); setInitialCash("");
            queryClient.invalidateQueries();
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.message || "Reset failed. Check your passcode.");
        } finally { setIsResetting(false); }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px] max-h-[92dvh] flex flex-col">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <KeyRound className="w-5 h-5" />
                        System Settings
                    </DialogTitle>
                    <DialogDescription>
                        Manage credentials, products, brands, and session settings.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="admin" className="mt-2 flex flex-col min-h-0 flex-1 overflow-hidden">
                    {/* 5 tabs: Admin | Sales | Products | Session | Reset */}
                    <TabsList className="w-full grid grid-cols-5 shrink-0 h-auto">
                        <TabsTrigger value="admin" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-[10px] sm:text-xs">
                            <ShieldCheck className="w-4 h-4 shrink-0" /><span>Admin</span>
                        </TabsTrigger>
                        <TabsTrigger value="sales" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-[10px] sm:text-xs">
                            <ShoppingBag className="w-4 h-4 shrink-0" /><span>Sales</span>
                        </TabsTrigger>
                        <TabsTrigger value="products" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-[10px] sm:text-xs">
                            <Package className="w-4 h-4 shrink-0" /><span>Products</span>
                        </TabsTrigger>
                        <TabsTrigger value="session" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-[10px] sm:text-xs">
                            <Timer className="w-4 h-4 shrink-0" /><span>Session</span>
                        </TabsTrigger>
                        <TabsTrigger value="reset" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-[10px] sm:text-xs text-destructive data-[state=active]:text-destructive">
                            <RefreshCcw className="w-4 h-4 shrink-0" /><span>Reset</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* ─── Admin ─── */}
                    <TabsContent value="admin" className="space-y-4 pt-4 overflow-y-auto flex-1 px-0.5">
                        <p className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded-lg">
                            ⚠️ Updating admin credentials will log you out immediately.
                        </p>
                        <div className="grid gap-2">
                            <Label htmlFor="admin-password">New Password</Label>
                            <Input id="admin-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new admin password" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="admin-secret">New Recovery Secret Code</Label>
                            <Input id="admin-secret" type="password" value={newSecret} onChange={e => setNewSecret(e.target.value)} placeholder="e.g. 1A2B3D4E" />
                            <p className="text-[10px] text-muted-foreground">This code bypasses standard password entry. Do not share it.</p>
                        </div>
                        <Button variant="destructive" className="w-full" onClick={handleUpdateAdmin} disabled={isUpdatingAdmin}>
                            {isUpdatingAdmin ? "Updating..." : "Update Admin Credentials & Log Out"}
                        </Button>
                    </TabsContent>

                    {/* ─── Sales ─── */}
                    <TabsContent value="sales" className="space-y-4 pt-4 overflow-y-auto flex-1 px-0.5">
                        <p className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded-lg">
                            Set the password that sales staff use to log into the Sales Portal.
                        </p>
                        <div className="grid gap-2">
                            <Label htmlFor="sales-password">New Password</Label>
                            <Input id="sales-password" type="password" value={salesPassword} onChange={e => setSalesPassword(e.target.value)} placeholder="Enter new sales password" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="sales-password-confirm">Confirm Password</Label>
                            <Input id="sales-password-confirm" type="password" value={salesPasswordConfirm} onChange={e => setSalesPasswordConfirm(e.target.value)} placeholder="Repeat password" />
                        </div>
                        <Button className="w-full" onClick={handleUpdateSales} disabled={isUpdatingSales}>
                            {isUpdatingSales ? "Saving..." : "Save Sales Staff Credentials"}
                        </Button>
                        <div className="border-t pt-4 mt-4 space-y-4">
                            <h4 className="text-sm font-semibold">Salesperson Configuration</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="sp1">Salesperson 1 Name</Label>
                                    <Input id="sp1" value={sp1Name} onChange={e => setSp1Name(e.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="sp2">Salesperson 2 Name</Label>
                                    <Input id="sp2" value={sp2Name} onChange={e => setSp2Name(e.target.value)} />
                                </div>
                            </div>
                            <Button variant="secondary" className="w-full" onClick={handleUpdateNames} disabled={isUpdatingNames}>
                                {isUpdatingNames ? "Saving Names..." : "Save Names"}
                            </Button>
                        </div>
                    </TabsContent>

                    {/* ─── Products & Brands ─── */}
                    <TabsContent value="products" className="pt-4 overflow-y-auto flex-1 px-0.5">
                        <ProductsPanel />
                    </TabsContent>

                    {/* ─── Session ─── */}
                    <TabsContent value="session" className="space-y-4 pt-4 overflow-y-auto flex-1 px-0.5">
                        <div className="grid gap-2">
                            <Label htmlFor="auto-logout">Auto-Logout (Idle Timer)</Label>
                            <Select
                                value={autoLogoutMinutes === null ? "never" : autoLogoutMinutes.toString()}
                                onValueChange={(val) => setAutoLogoutMinutes(val === "never" ? null : Number(val))}
                            >
                                <SelectTrigger id="auto-logout" className="w-full">
                                    <SelectValue placeholder="Select timeout" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10 Minutes</SelectItem>
                                    <SelectItem value="30">30 Minutes</SelectItem>
                                    <SelectItem value="60">1 Hour</SelectItem>
                                    <SelectItem value="120">2 Hours</SelectItem>
                                    <SelectItem value="never">Never (Stay Logged In)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground mt-1">Automatically logs you out when inactive. Saved instantly.</p>
                        </div>
                    </TabsContent>

                    {/* ─── System Reset ─── */}
                    <TabsContent value="reset" className="space-y-4 pt-4 overflow-y-auto flex-1 px-0.5">
                        <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl space-y-2">
                            <h4 className="text-sm font-bold text-destructive flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                DANGER ZONE: SYSTEM WIPE
                            </h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                This will <strong>permanently delete</strong> all products, categories, sales records, cash flow history, and pending credits. This action <strong>cannot be undone</strong>.
                            </p>
                        </div>
                        <div className="grid gap-3 pt-2">
                            <div>
                                <Label htmlFor="reset-passcode">Enter Admin Passcode to Confirm</Label>
                                <Input
                                    id="reset-passcode" type="password" value={resetPasscode}
                                    onChange={e => setResetPasscode(e.target.value)}
                                    placeholder="Your login password"
                                    className="border-destructive/30 focus-visible:ring-destructive mt-1"
                                />
                            </div>
                            <div className="mt-2">
                                <Label htmlFor="initial-cash" className="text-primary font-bold">Initial Cash Pile (Optional)</Label>
                                <p className="text-[10px] text-muted-foreground mb-1.5 leading-tight">
                                    Enter the amount of cash you are investing to restock inventory so the cash flow doesn't go negative.
                                </p>
                                <div className="relative">
                                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="initial-cash" type="number" placeholder="e.g. 50000"
                                        className="pl-9 bg-background/50 border-border/50"
                                        value={initialCash}
                                        onChange={e => setInitialCash(e.target.value === "" ? "" : Number(e.target.value))}
                                        min="0" step="any"
                                    />
                                </div>
                            </div>
                        </div>
                        <Button
                            variant="destructive" className="w-full h-11 font-black tracking-widest"
                            onClick={handleSystemReset} disabled={isResetting || !resetPasscode}
                        >
                            {isResetting ? "WIPING SYSTEM..." : "ERASE EVERYTHING"}
                        </Button>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
