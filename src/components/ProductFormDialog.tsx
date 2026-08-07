import { useState, useEffect } from "react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ChevronsUpDown, PackagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProducts, useSaveStockEntry } from "@/hooks/useInventory";
import { toast } from "sonner";

interface StockEntryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories?: any[];
    editProductId?: string | null;
}

export function StockEntryDialog({ open, onOpenChange, editProductId }: StockEntryDialogProps) {
    const { data: products = [] } = useProducts();
    const saveStockMutation = useSaveStockEntry();

    const [search, setSearch] = useState("");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState("");
    const [priceIn, setPriceIn]   = useState("");
    const [quantity, setQuantity] = useState("");

    // Reset when dialog opens
    useEffect(() => {
        if (open) {
            setSearch("");
            setSelectedProductId(editProductId || "");
            setPriceIn("");
            setQuantity("");
            setDropdownOpen(false);
        }
    }, [open, editProductId]);

    // Pre-fill last known price when product selected
    useEffect(() => {
        if (!selectedProductId) return;
        const p = products.find(pr => pr.id === selectedProductId);
        if (p && p.priceIn) setPriceIn(p.priceIn.toString());
        else setPriceIn("");
    }, [selectedProductId, products]);

    const filtered = search.trim()
        ? products.filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.brand.toLowerCase().includes(search.toLowerCase())
          )
        : products;

    const selectedProduct = products.find(p => p.id === selectedProductId);

    const handleSubmit = async () => {
        if (!selectedProductId) { toast.error("Please select a product"); return; }
        if (!priceIn || Number(priceIn) <= 0) { toast.error("Enter the purchase cost per unit"); return; }
        if (!quantity || Number(quantity) <= 0) { toast.error("Enter the quantity added"); return; }
        try {
            await saveStockMutation.mutateAsync({
                product_id: selectedProductId,
                price_in: Number(priceIn),
                quantity: Number(quantity),
            });
            toast.success(`Stock added! ${selectedProduct?.name} now has ${(selectedProduct?.quantity || 0) + Number(quantity)} units.`);
            onOpenChange(false);
        } catch (e: any) {
            toast.error(e.message || "Failed to add stock");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] bg-card border-border p-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
                    <DialogTitle className="font-display text-lg flex items-center gap-2">
                        <PackagePlus className="w-5 h-5 text-primary shrink-0" />
                        Add Stock / Purchase Entry
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Select a product, enter the purchase cost and quantity received.
                        <br />
                        <span className="text-primary font-medium">Need to add a new product or brand? Go to Settings → Products.</span>
                    </p>
                </DialogHeader>

                {/* Body */}
                <div className="px-6 py-5 space-y-5">
                    {/* Product Dropdown */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Product</Label>

                        {/* Trigger button */}
                        <button
                            type="button"
                            onClick={() => setDropdownOpen(o => !o)}
                            className={cn(
                                "flex items-center justify-between w-full h-12 px-4 rounded-xl border border-input bg-secondary text-sm",
                                "hover:bg-secondary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
                                !selectedProductId && "text-muted-foreground"
                            )}
                        >
                            <span className="truncate text-left">
                                {selectedProduct ? selectedProduct.name : "Search and select a product..."}
                            </span>
                            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground ml-2" />
                        </button>

                        {/* Dropdown panel */}
                        {dropdownOpen && (
                            <div className="rounded-xl border border-border bg-popover shadow-2xl overflow-hidden">
                                <div className="p-2 border-b border-border">
                                    <input
                                        autoFocus
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Type to search..."
                                        className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-input focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                                <div className="overflow-y-auto" style={{ maxHeight: "240px" }}>
                                    {filtered.length === 0 ? (
                                        <p className="text-center text-sm text-muted-foreground py-6">No products found.</p>
                                    ) : (
                                        filtered.map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedProductId(p.id);
                                                    setDropdownOpen(false);
                                                    setSearch("");
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary text-left transition-colors"
                                            >
                                                <Check className={cn("h-4 w-4 shrink-0 text-primary", selectedProductId === p.id ? "opacity-100" : "opacity-0")} />
                                                <div className="min-w-0">
                                                    <p className="font-medium text-sm truncate">{p.name}</p>
                                                    <p className="text-xs text-muted-foreground">{p.brand} • {p.volume} • Sell: ETB {p.priceOut} • Stock: <strong>{p.quantity}</strong></p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Selected product confirmation chip */}
                        {selectedProduct && !dropdownOpen && (
                            <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 mt-1">
                                <div>
                                    <p className="text-sm font-semibold">{selectedProduct.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedProduct.brand} • {selectedProduct.volume} • Current stock: <strong>{selectedProduct.quantity} units</strong>
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setSelectedProductId(""); setPriceIn(""); setQuantity(""); }}
                                    className="p-1 rounded-full hover:bg-border ml-3"
                                >
                                    <X className="h-4 w-4 text-muted-foreground" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Price In & Quantity — shown only after product is selected */}
                    {selectedProductId && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <div className="space-y-2">
                                <Label htmlFor="priceIn" className="text-sm font-medium">
                                    Purchase Cost (ETB)
                                </Label>
                                <Input
                                    id="priceIn"
                                    type="number" min="0" step="0.01"
                                    value={priceIn}
                                    onChange={e => setPriceIn(e.target.value)}
                                    className="h-12 bg-secondary text-base"
                                    placeholder="e.g. 150.00"
                                    autoFocus
                                />
                                <p className="text-[10px] text-muted-foreground">Price you paid per unit for this batch.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="qty" className="text-sm font-medium">
                                    Quantity Added
                                </Label>
                                <Input
                                    id="qty"
                                    type="number" min="1"
                                    value={quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                    className="h-12 bg-secondary text-base"
                                    placeholder="e.g. 50"
                                />
                                <p className="text-[10px] text-muted-foreground">Number of units received.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-border/60 px-6 py-4 flex justify-between items-center bg-card">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!selectedProductId || saveStockMutation.isPending}
                        className="shadow-lg shadow-primary/25 px-6"
                    >
                        {saveStockMutation.isPending ? "Saving..." : "Confirm Stock Entry"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
