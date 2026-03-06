import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Product } from "@/lib/inventory-data";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/CartContext";
import { toast } from "sonner";

interface SellDialogProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function SellDialog({ product, open, onOpenChange, onSuccess }: SellDialogProps) {
    const [quantity, setQuantity] = useState<any>("");
    const [description, setDescription] = useState("");
    const [customerInfo, setCustomerInfo] = useState("");
    const { addToCart } = useCart();

    if (!product) return null;

    const handleSell = () => {
        if (quantity <= 0 || quantity > product.quantity) {
            toast.error("Invalid quantity");
            return;
        }

        addToCart(product, quantity, product.priceOut, customerInfo, description);
        toast.success(`Added ${quantity}x ${product.name} to Cart`);

        onSuccess?.();
        onOpenChange(false);

        // Reset form
        setQuantity("");
        setDescription("");
        setCustomerInfo("");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add to Cart</DialogTitle>
                    <DialogDescription>
                        Queue a sale for {product.name} ({product.volume})
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="quantity" className="text-right">
                            Quantity
                        </Label>
                        <div className="col-span-3 flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                            >
                                -
                            </Button>
                            <Input
                                id="quantity"
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-20 text-center"
                                min={1}
                                max={product.quantity}
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setQuantity(q => Math.min(product.quantity, q + 1))}
                            >
                                +
                            </Button>
                            <span className="text-sm text-muted-foreground ml-2">
                                (Max: {product.quantity})
                            </span>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="customerInfo">Customer Name (Optional)</Label>
                        <Input
                            id="customerInfo"
                            placeholder="E.g., John Doe"
                            value={customerInfo}
                            onChange={e => setCustomerInfo(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Notes / Description (Optional)</Label>
                        <Textarea
                            id="description"
                            placeholder="Any additional details about this sale..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="bg-secondary/50 p-3 rounded-md flex justify-between items-center mt-2">
                        <span className="text-sm font-medium">Total Amount:</span>
                        <span className="text-lg font-bold text-primary">
                            ETB {(product.priceOut * quantity).toFixed(2)}
                        </span>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSell} disabled={quantity <= 0 || quantity > product.quantity}>
                        Add to Cart
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
