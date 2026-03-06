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
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save product" });
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
        <img src={heroBanner} alt="Liquor shelf" className="w-full h-full object-cover opacity-30 dark:opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 to-background" />
        <div className="absolute inset-0 flex items-center justify-between px-6 md:px-12">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-gradient-red">
              TANIKA LIQOUR
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Inventory & Sales Management
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setSettingsOpen(true)} className="rounded-full bg-background/50 backdrop-blur-md border-border/50 h-10 w-10 text-muted-foreground hover:text-foreground">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={logout} className="rounded-full bg-background/50 backdrop-blur-md border-border/50 h-10 w-10 text-muted-foreground hover:text-destructive">
              <LogOut className="h-5 w-5" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-6 relative z-10 pb-12 space-y-5">
        <StatsCards products={products} />

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-72 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-secondary border-border"
            />
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" onClick={() => setCartOpen(true)} className="relative border-primary text-primary hover:bg-primary/10">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Cart
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Button>
            <Button variant="outline" onClick={() => setHistoryOpen(true)}>
              <ReceiptText className="h-4 w-4 mr-2" />
              History
            </Button>
            <Button variant="outline" onClick={() => setViewMode(v => v === "table" ? "grid" : "table")} className="w-10 px-0">
              {viewMode === "table" ? <div className="grid grid-cols-2 gap-[2px] w-4 h-4"><div className="bg-current rounded-[1px]" /><div className="bg-current rounded-[1px]" /><div className="bg-current rounded-[1px]" /><div className="bg-current rounded-[1px]" /></div> : <div className="flex flex-col gap-[2px] w-4 h-4"><div className="bg-current h-[3px] w-full rounded-[1px]" /><div className="bg-current h-[3px] w-full rounded-[1px]" /><div className="bg-current h-[3px] w-full rounded-[1px]" /></div>}
            </Button>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(true)}>
              <Tag className="h-4 w-4 mr-2" />
              Add Category
            </Button>
            <Button onClick={() => { setEditingProduct(null); setProductDialogOpen(true); }}>
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
