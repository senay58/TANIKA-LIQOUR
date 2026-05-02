import { Product, categoryEmojis } from "@/lib/inventory-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Pencil, Trash2, PackageInfo } from "lucide-react";

interface ProductGridProps {
    products: Product[];
    onEdit?: (product: Product) => void;
    onDelete?: (id: string) => void;
    onSell?: (product: Product) => void;
    hidePriceIn?: boolean;
}

export function ProductGrid({ products, onEdit, onDelete, onSell, hidePriceIn = false }: ProductGridProps) {
    const stockStatus = (product: Product) => {
        if (product.quantity === 0) return <Badge variant="destructive">Out of Stock</Badge>;
        if (product.quantity <= product.minStock) return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30">Low Stock</Badge>;
        return <Badge variant="default" className="bg-green-500/20 text-green-600 hover:bg-green-500/30">In Stock</Badge>;
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in duration-500">
            {products.map((product, i) => (
                <div
                    key={product.id}
                    className="group relative flex flex-col bg-card rounded-xl border border-border/50 overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all"
                    style={{ animationDelay: `${i * 30}ms` }}
                >
                    {/* Header / Category */}
                    <div className="px-4 py-3 bg-secondary/30 flex justify-between items-center border-b border-border/50">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            {product.categoryEmoji || (categoryEmojis as any)[product.category]} {product.category}
                        </span>
                        {stockStatus(product)}
                    </div>

                    {/* Body */}
                    <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-bold text-lg leading-tight mb-1 group-hover:text-primary transition-colors">{product.name}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{product.brand} · {product.volume}</p>

                        <div className="grid grid-cols-2 gap-2 mt-auto">
                            <div className="bg-secondary/20 p-2 rounded-md">
                                <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-0.5">Price</p>
                                <p className="font-bold text-base text-foreground">ETB {product.priceOut.toFixed(2)}</p>
                            </div>
                            <div className="bg-secondary/20 p-2 rounded-md">
                                <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-0.5">Stock</p>
                                <p className="font-bold text-base text-foreground">{product.quantity}</p>
                            </div>
                        </div>

                        {/* Rollover exact costs (Hover state instead of expanded row) */}
                        {!hidePriceIn && (
                            <div className="mt-3 text-xs flex justify-between px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-muted-foreground">In: ETB {(product.priceIn * product.quantity).toFixed(0)}</span>
                                <span className="font-bold text-[hsl(var(--revenue))]">Out: ETB {(product.priceOut * product.quantity).toFixed(0)}</span>
                            </div>
                        )}
                    </div>

                    {/* Actions Footer */}
                    <div className="p-2 border-t border-border/50 bg-secondary/10 flex justify-between items-center">
                        {(onEdit || onDelete) && (
                            <div className="flex gap-1">
                                {onEdit && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-foreground" onClick={() => onEdit(product)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                )}
                                {onDelete && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => onDelete(product.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        )}
                        {onSell && (
                            <Button
                                size="sm"
                                className="h-8 px-3 hover:bg-primary/90 transition-transform active:scale-95 ml-auto"
                                onClick={() => onSell(product)}
                                disabled={product.quantity === 0}
                            >
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Add to Cart
                            </Button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
