import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/CartContext";
import { useBulkRecordSale } from "@/hooks/useInventory";
import { Trash2, Plus, Minus, ShoppingCart, Banknote, Building2, Hash } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, User, Phone, UserCog, UserCheck } from "lucide-react";
import { useSalespersonNames } from "@/hooks/useInventory";

type PaymentMethod = "cash" | "bank_transfer";

const BANKS = ["CBE", "BOA", "Telebirr", "Dashen Bank"];

export function CartSheet() {
    const { items, isCartOpen, setCartOpen, removeFromCart, updateQuantity, clearCart, cartTotal } = useCart();
    const bulkSaleMutation = useBulkRecordSale();
    const { data: salespersonNames } = useSalespersonNames();
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    // Credit sale fields
    // Customer fields
    const [isCreditSale, setIsCreditSale] = useState(false);
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [dueDate, setDueDate] = useState("");

    // Payment fields
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
    const [bankName, setBankName] = useState("");
    const [referenceNumber, setReferenceNumber] = useState("");

    // Salesperson
    const [salesperson, setSalesperson] = useState<number | null>(null);

    const resetForm = () => {
        setIsCreditSale(false);
        setCustomerName("");
        setCustomerPhone("");
        setDueDate("");
        setPaymentMethod("cash");
        setBankName("");
        setReferenceNumber("");
        setSalesperson(null);
    };

    const handleCheckout = async () => {
        if (items.length === 0) return;

        if (!customerName.trim()) {
            toast.error("Please enter a customer name.");
            return;
        }
        if (isCreditSale && (!dueDate)) {
            toast.error("Please provide a due date for credit sales.");
            return;
        }
        if (paymentMethod === "bank_transfer" && !bankName) {
            toast.error("Please select a bank for the bank transfer.");
            return;
        }
        if (paymentMethod === "bank_transfer" && !referenceNumber.trim()) {
            toast.error("Please enter the transaction reference number.");
            return;
        }
        if (!salesperson) {
            toast.error("Please select a Salesperson (1 or 2) before checking out.");
            return;
        }

        setIsCheckingOut(true);
        try {
            const salesData = items.map(item => ({
                product_id: item.product.id,
                quantity: item.quantity,
                price_at_sale: item.priceAtSale,
                description: item.description,
                customer_info: isCreditSale ? `CREDIT: ${customerName}` : (customerName || item.customerInfo || ""),
                customer_phone: customerPhone || "", // Added this
                payment_method: paymentMethod,
                bank_name: paymentMethod === "bank_transfer" ? bankName : null,
                reference_number: paymentMethod === "bank_transfer" ? referenceNumber : null,
                salesperson_number: salesperson,
            }));

            await bulkSaleMutation.mutateAsync({
                salesData,
                creditInfo: isCreditSale ? {
                    customer_name: customerName,
                    customer_phone: customerPhone,
                    due_date: new Date(dueDate).toISOString(),
                } : undefined,
            });

            toast.success(`✅ Order checked out! Payment: ${paymentMethod === "cash" ? "Cash" : `${bankName} Transfer`}`);
            clearCart();
            setCartOpen(false);
            resetForm();
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
                    <SheetDescription>Review items before finalizing the sale.</SheetDescription>
                </SheetHeader>

                {/* Scrollable Body: Items + Forms */}
                <div className="flex-1 overflow-y-auto mt-6 -mx-6 px-6 pb-6 space-y-5">
                    {/* Cart Items */}
                    <div className="space-y-3">
                        {items.length === 0 ? (
                            <div className="text-center text-muted-foreground pt-10 text-sm">Your cart is empty.</div>
                        ) : (
                            items.map(item => (
                                <div key={item.product.id} className="flex flex-col gap-2 p-3 bg-secondary/30 rounded-xl border border-border/50">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-semibold text-sm line-clamp-1">{item.product.name}</h4>
                                            <p className="text-xs text-muted-foreground">ETB {item.priceAtSale.toFixed(2)} each</p>
                                        </div>
                                        <p className="font-bold text-sm">ETB {(item.priceAtSale * item.quantity).toFixed(2)}</p>
                                    </div>

                                    <div className="flex items-center justify-between mt-1">
                                        <div className="flex items-center gap-1 bg-background rounded-lg border p-0.5">
                                            <Button variant="ghost" size="icon" className="h-6 w-6"
                                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                                disabled={item.quantity <= 1}>
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="text-xs font-medium w-5 text-center">{item.quantity}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6"
                                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                                disabled={item.product.quantity <= item.quantity}>
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            onClick={() => removeFromCart(item.product.id)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Checkout Forms (Only show if items exist) */}
                    {items.length > 0 && (
                        <div className="space-y-4 border-t pt-5 border-border/50">

                        {/* ── Credit Sale Toggle ── */}
                        {/* ── Global Customer Name ── */}
                        <div className="p-3 bg-secondary/20 rounded-xl border border-border/50 space-y-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase tracking-wider opacity-60 flex items-center gap-1">
                                    <UserCheck className="w-3 h-3" />
                                    Customer Name (Required)
                                </Label>
                                <div className="relative">
                                    <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input 
                                        placeholder="Enter customer name..." 
                                        className="pl-8 h-9 text-xs" 
                                        value={customerName} 
                                        onChange={e => setCustomerName(e.target.value)} 
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-1 border-t border-border/10">
                                <Checkbox
                                    id="credit-sale"
                                    checked={isCreditSale}
                                    onCheckedChange={(c) => setIsCreditSale(c as boolean)}
                                />
                                <Label htmlFor="credit-sale" className="text-sm font-bold cursor-pointer text-orange-500">Sell on Credit</Label>
                            </div>

                            {isCreditSale && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase tracking-wider opacity-60">Phone (Optional)</Label>
                                            <div className="relative">
                                                <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                                <Input placeholder="09..." className="pl-8 h-9 text-xs" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase tracking-wider opacity-60">Due Date</Label>
                                            <div className="relative">
                                                <CalendarIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                                <Input type="date" className="pl-8 h-9 text-xs" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Payment Method ── */}
                        <div className="p-3 bg-secondary/20 rounded-xl border border-border/50 space-y-3">
                            <Label className="text-sm font-bold flex items-center gap-2">
                                <Banknote className="w-4 h-4 text-green-500" />
                                Payment Method
                            </Label>

                            {/* Toggle buttons */}
                            <div className="flex rounded-lg overflow-hidden border border-border/50 bg-background/50">
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod("cash")}
                                    className={`flex-1 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                                        paymentMethod === "cash"
                                            ? "bg-green-600 text-white"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    <Banknote className="w-3.5 h-3.5" />
                                    Cash
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod("bank_transfer")}
                                    className={`flex-1 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                                        paymentMethod === "bank_transfer"
                                            ? "bg-blue-600 text-white"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    <Building2 className="w-3.5 h-3.5" />
                                    Bank Transfer
                                </button>
                            </div>

                            {/* Bank transfer details */}
                            {paymentMethod === "bank_transfer" && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase tracking-wider opacity-60">Select Bank</Label>
                                        <Select value={bankName} onValueChange={setBankName}>
                                            <SelectTrigger className="h-9 text-xs">
                                                <SelectValue placeholder="Choose bank..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {BANKS.map(b => (
                                                    <SelectItem key={b} value={b}>{b}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase tracking-wider opacity-60">Reference Number</Label>
                                        <div className="relative">
                                            <Hash className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                            <Input
                                                placeholder="e.g. TXN-20240502-001"
                                                className="pl-8 h-9 text-xs font-mono"
                                                value={referenceNumber}
                                                onChange={e => setReferenceNumber(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Salesperson Selector ── */}
                        <div className="p-3 bg-secondary/20 rounded-xl border border-border/50 space-y-3">
                            <Label className="text-sm font-bold flex items-center gap-2">
                                <UserCog className="w-4 h-4 text-primary" />
                                Select Salesperson
                            </Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={salesperson === 1 ? "default" : "outline"}
                                    onClick={() => setSalesperson(1)}
                                    className="flex-1 text-xs"
                                >
                                    {salespersonNames?.sp1 || "Salesperson 1"}
                                </Button>
                                <Button
                                    type="button"
                                    variant={salesperson === 2 ? "default" : "outline"}
                                    onClick={() => setSalesperson(2)}
                                    className="flex-1 text-xs"
                                >
                                    {salespersonNames?.sp2 || "Salesperson 2"}
                                </Button>
                            </div>
                        </div>

                        </div>
                    )}
                </div>

                {/* Pinned Footer Actions */}
                {items.length > 0 && (
                    <div className="shrink-0 pt-4 border-t space-y-4 bg-background">
                        {/* Order Total */}
                        <div className="flex items-center justify-between px-1">
                            <span className="font-medium text-muted-foreground">Order Total</span>
                            <span className="text-xl font-bold text-[hsl(var(--revenue))]">ETB {cartTotal.toFixed(2)}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pb-2">
                            <Button variant="outline" className="w-1/3" onClick={clearCart}>Clear</Button>
                            <Button className="w-2/3" onClick={handleCheckout} disabled={isCheckingOut}>
                                {isCheckingOut ? "Processing..." : "Checkout Order"}
                            </Button>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
