import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/CartContext";
import { useBulkRecordSale } from "@/hooks/useInventory";
import { Trash2, Plus, Minus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export function CartSheet() {
    const { items, isCartOpen, setCartOpen, removeFromCart, updateQuantity, clearCart, cartTotal } = useCart();
    const bulkSaleMutation = useBulkRecordSale();
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    const handleCheckout = async () => {
        if (items.length === 0) return;
        setIsCheckingOut(true);

        try {
            const salesData = items.map(item => ({
                product_id: item.product.id,
                quantity: item.quantity,
                price_at_sale: item.priceAtSale,
                description: item.description,
                customer_info: item.customerInfo
            }));

            await bulkSaleMutation.mutateAsync(salesData);
            toast.success(`Successfully checked out ${items.length} items!`);
            clearCart();
            setCartOpen(false);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to checkout. Check stock levels.");
        } finally {
            setIsCheckingOut(false);
        }
    };

    return (
        <Sheet open={isCartOpen} onOpenChange={setCartOpen}>
            <SheetContent className="w-full sm:max-w-md flex flex-col">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5" />
                        Current Order Cart
                    </SheetTitle>
                    <SheetDescription>
                        Review items before finalizing the sale.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto mt-6 -mx-6 px-6 space-y-4">
                    {items.length === 0 ? (
                        <div className="text-center text-muted-foreground pt-10">
                            Your cart is empty.
                        </div>
                    ) : (
                        items.map(item => (
                            <div key={item.product.id} className="flex flex-col gap-2 p-3 bg-secondary/30 rounded-lg border">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-semibold text-sm line-clamp-1">{item.product.name}</h4>
                                        <p className="text-xs text-muted-foreground">ETB {item.priceAtSale.toFixed(2)} each</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-sm">ETB {(item.priceAtSale * item.quantity).toFixed(2)}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-2 bg-background rounded-md border p-0.5">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                            disabled={item.quantity <= 1}
                                        >
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="text-xs font-medium w-4 text-center">{item.quantity}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                            disabled={item.product.quantity <= item.quantity} // Max stock
                                        >
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeFromCart(item.product.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {items.length > 0 && (
                    <div className="border-t pt-4 mt-auto">
                        <div className="flex items-center justify-between mb-4">
                            <span className="font-medium text-muted-foreground">Total</span>
                            <span className="text-xl font-bold text-[hsl(var(--revenue))]">ETB {cartTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="w-1/3" onClick={clearCart}>
                                Clear
                            </Button>
                            <Button
                                className="w-2/3"
                                onClick={handleCheckout}
                                disabled={isCheckingOut}
                            >
                                {isCheckingOut ? "Processing..." : "Checkout Order"}
                            </Button>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
