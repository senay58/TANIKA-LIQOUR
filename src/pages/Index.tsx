import { useState, useMemo } from "react";
import { Search, Plus, ReceiptText, Tag, LogOut, Settings, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatsCards } from "@/components/StatsCards";
import { ProductTable } from "@/components/ProductTable";
import { ProductGrid } from "@/components/ProductGrid";
import { ProductFormDialog } from "@/components/ProductFormDialog";
import { CategoryFilter } from "@/components/CategoryFilter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SellDialog } from "@/components/SellDialog";
import { SalesHistory } from "@/components/SalesHistory";
import { AddCategoryDialog } from "@/components/AddCategoryDialog";
import { AdminSettingsDialog } from "@/components/AdminSettingsDialog";
import { CartSheet } from "@/components/CartSheet";
import { UserMenu } from "@/components/UserMenu";
import { useAuth } from "@/lib/AuthContext";
import { useCart } from "@/lib/CartContext";
import { Product, Category } from "@/lib/inventory-data";
import { useProducts, useSaveProduct, useDeleteProduct, useCategories, useSalesHistory } from "@/hooks/useInventory";
import { useToast } from "@/hooks/use-toast";
import heroBanner from "@/assets/hero-banner.jpg";

const Index = () => {
  const { logout } = useAuth();
  const { data: products = [], isLoading } = useProducts();
  const { data: categories = [] } = useCategories();
  const { data: sales = [] } = useSalesHistory();
  const { cartCount, setCartOpen } = useCart();
  const saveProductMutation = useSaveProduct();
  const deleteProductMutation = useDeleteProduct();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Dialog states
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [sellingProduct, setSellingProduct] = useState<Product | null>(null);

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
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to delete product" });
      }
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setProductDialogOpen(true);
  };

  const handleSellClick = (product: Product) => {
    setSellingProduct(product);
    setSellDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="relative h-44 md:h-52 overflow-hidden">
        <img 
          src={heroBanner} 
          alt="Liquor shelf" 
          className="w-full h-full object-cover opacity-100 brightness-[1.25] contrast-[1.2] saturate-[1.4]" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <div className="absolute inset-0 flex flex-col sm:flex-row items-center justify-center sm:justify-between px-6 md:px-12">
            <div className="bg-black/40 backdrop-blur-xl p-4 md:p-8 rounded-3xl border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.3)] hover:shadow-[0_0_70px_rgba(239,68,68,0.5)] transition-shadow duration-500 text-center sm:text-left">
              <h1 className="text-3xl md:text-6xl font-display font-black text-white drop-shadow-[0_0_30px_rgba(239,68,68,1)] tracking-tighter animate-in zoom-in duration-500">
                TANIKA <span className="text-red-500">LIQUOR</span>
              </h1>
              <p className="text-white/90 font-bold drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] mt-2 md:mt-3 text-[10px] md:text-xl tracking-[0.1em] md:tracking-[0.2em] uppercase text-center bg-red-600/20 py-1 rounded-full border border-red-500/20">
                Inventory & Sales Management
              </p>
            </div>
          <div className="absolute top-4 right-4 sm:relative sm:top-0 sm:right-0 flex items-center gap-2 sm:gap-3">
            <UserMenu onSettingsClick={() => setSettingsOpen(true)} onLogoutClick={logout} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-8 relative z-20 pb-12 space-y-6">
        <StatsCards products={products} />

        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-card/60 backdrop-blur-xl p-4 rounded-3xl border border-border/50 shadow-2xl ring-1 ring-white/5">
          <div className="relative w-full lg:w-96 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search by name or brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background/50 border-border focus:ring-primary h-11 rounded-xl transition-all"
            />
          </div>
          
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCartOpen(true)} className="relative border-primary/50 text-primary hover:bg-primary/10 h-11 rounded-xl font-bold">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Cart
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center animate-bounce shadow-lg ring-2 ring-background">
                  {cartCount}
                </span>
              )}
            </Button>
            <Button variant="outline" onClick={() => setHistoryOpen(true)} className="h-11 rounded-xl">
              <ReceiptText className="h-4 w-4 mr-2" />
              History
            </Button>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(true)} className="h-11 rounded-xl">
              <Tag className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Categories</span>
              <span className="sm:hidden text-xs">Cats</span>
            </Button>
            <Button variant="outline" onClick={() => setViewMode(v => v === "table" ? "grid" : "table")} className="h-11 px-3 rounded-xl">
              {viewMode === "table" ? <div className="grid grid-cols-2 gap-[2px] w-4 h-4"><div className="bg-current rounded-[1px]" /><div className="bg-current rounded-[1px]" /><div className="bg-current rounded-[1px]" /><div className="bg-current rounded-[1px]" /></div> : <div className="flex flex-col gap-[2px] w-4 h-4"><div className="bg-current h-[3px] w-full rounded-[1px]" /><div className="bg-current h-[3px] w-full rounded-[1px]" /><div className="bg-current h-[3px] w-full rounded-[1px]" /></div>}
            </Button>
            <Button onClick={() => { setEditingProduct(null); setProductDialogOpen(true); }} className="col-span-2 sm:col-auto h-11 rounded-xl shadow-lg shadow-primary/30 font-bold bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        <CategoryFilter selected={categoryFilter} onSelect={setCategoryFilter} categories={categories} />

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading inventory...</div>
        ) : (
          viewMode === "table" ? (
            <ProductTable products={filtered} onEdit={handleEdit} onDelete={handleDelete} onSell={handleSellClick} />
          ) : (
            <ProductGrid products={filtered} onEdit={handleEdit} onDelete={handleDelete} onSell={handleSellClick} />
          )
        )}
      </div>

      <ProductFormDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        product={editingProduct}
        onSave={handleSave}
        categories={categories}
      />

      <SellDialog
        open={sellDialogOpen}
        onOpenChange={setSellDialogOpen}
        product={sellingProduct}
      />

      <AddCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
      />

      <SalesHistory
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />

      <AdminSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      <CartSheet />
    </div>
  );
};

export default Index;
