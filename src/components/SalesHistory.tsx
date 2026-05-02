import { useSalesHistory, useUndoSale, useProducts, useSalespersonNames } from "@/hooks/useInventory";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ReceiptText, Undo2, Calendar as CalendarIcon, Download, X, ChevronDown, ChevronUp, User, Info, CreditCard, ChevronRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import fileDownload from "js-file-download";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DateRange } from "react-day-picker";

interface SalesHistoryProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    inline?: boolean;
    showUndo?: boolean;
}

export function SalesHistory({ open, onOpenChange, inline, showUndo = false }: SalesHistoryProps) {
    const { data: sales = [], isLoading } = useSalesHistory();
    const { data: products = [] } = useProducts();
    const { data: spNames } = useSalespersonNames();
    const undoSaleMutation = useUndoSale();
    const [dateFilter, setDateFilter] = useState<DateRange | undefined>();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(true);

    const getSalespersonName = (num: number | null | undefined) => {
        if (num === 1) return spNames?.sp1 || "Salesperson 1";
        if (num === 2) return spNames?.sp2 || "Salesperson 2";
        return "Not recorded";
    };


    const handleUndo = async (txItems: any[]) => {
        if (confirm(`Are you sure you want to undo this entire transaction (${txItems.length} items)? Stock will be restored.`)) {
            try {
                // For now, we undo each item sequentially
                for (const item of txItems) {
                    await undoSaleMutation.mutateAsync(item);
                }
                toast.success("Transaction reversed successfully.");
            } catch (error) {
                console.error(error);
                toast.error("Failed to undo some items in the transaction");
            }
        }
    };

    // ── Grouping into Transactions ──
    const transactions = useMemo(() => {
        const groups: Record<string, any[]> = {};
        const legacy: any[] = [];
        
        sales.forEach(s => {
            // Apply existing filters
            const saleDate = new Date(s.sale_date);
            let matchesDate = true;
            if (dateFilter?.from) {
                const start = startOfDay(dateFilter.from);
                const end = dateFilter.to ? endOfDay(dateFilter.to) : endOfDay(dateFilter.from);
                matchesDate = isWithinInterval(saleDate, { start, end });
            }
            if (!matchesDate) return;

            if (s.transaction_id) {
                if (!groups[s.transaction_id]) groups[s.transaction_id] = [];
                groups[s.transaction_id].push(s);
            } else {
                legacy.push(s);
            }
        });
        
        const grouped = Object.values(groups).map(items => ({
            id: items[0].transaction_id,
            is_transaction: true,
            items,
            sale_date: items[0].sale_date,
            customer_info: items[0].customer_info,
            customer_phone: items[0].customer_phone,
            payment_method: items[0].payment_method,
            bank_name: items[0].bank_name,
            reference_number: items[0].reference_number,
            salesperson_number: items[0].salesperson_number,
            total: items.reduce((sum, i) => sum + (i.quantity * i.price_at_sale), 0),
            is_reversed: items.some(i => i.is_reversed)
        }));

        const combined = [
            ...grouped,
            ...legacy.map(s => ({
                ...s,
                id: s.id, // Using the sale ID as tx ID
                is_transaction: false,
                items: [s],
                total: s.quantity * s.price_at_sale
            }))
        ];

        return combined.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
    }, [sales, dateFilter]);

    const content = (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !dateFilter && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateFilter?.from ? (
                                dateFilter.to ? <>{format(dateFilter.from, "LLL dd, y")} - {format(dateFilter.to, "LLL dd, y")}</> : format(dateFilter.from, "LLL dd, y")
                            ) : <span>Filter by date range</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="range" selected={dateFilter} onSelect={setDateFilter} numberOfMonths={2} initialFocus />
                    </PopoverContent>
                </Popover>

                {dateFilter && (
                    <Button variant="ghost" size="icon" onClick={() => setDateFilter(undefined)} className="h-9 w-9 text-muted-foreground">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* List */}
            {transactions.length === 0 && (
                <div className="text-center text-muted-foreground p-8 bg-secondary/30 rounded-lg italic text-sm">
                    No transactions found for the selected period.
                </div>
            )}

            <div className="space-y-3">
                {transactions.map((tx) => {
                    const isExpanded = expandedId === tx.id;
                    const isReversed = tx.is_reversed;
                    const primaryItem = tx.items[0];

                    return (
                        <div
                            key={tx.id}
                            onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                            className={`p-4 rounded-xl border flex flex-col gap-3 transition-all cursor-pointer ${
                                isReversed ? 'opacity-60 grayscale bg-secondary/20' : 'bg-card shadow-sm hover:shadow-md border-border/50'
                            } ${isExpanded ? 'ring-1 ring-primary/30 border-primary/40 shadow-lg' : ''}`}
                        >
                            <div className="flex gap-3 items-start">
                                <div className="bg-primary/10 rounded-lg p-2 h-fit shrink-0">
                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-primary" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className="font-bold text-sm leading-snug break-words min-w-0">
                                            {tx.is_transaction ? `Order (${tx.items.length} items)` : (primaryItem.product?.name || 'Item Sale')}
                                            {isReversed && <Badge variant="destructive" className="ml-2 text-[8px] h-4">REVERSED</Badge>}
                                        </h4>
                                        <div className="text-right shrink-0">
                                            <p className="font-black text-sm text-foreground whitespace-nowrap">ETB {tx.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                            <p className="text-[9px] uppercase tracking-tighter text-muted-foreground font-bold">{tx.payment_method === 'cash' ? 'Cash' : tx.bank_name}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                            <CalendarIcon className="w-3 h-3 shrink-0" />
                                            {format(new Date(tx.sale_date), "MMM d, h:mm a")}
                                        </p>
                                        <p className="text-[11px] font-bold text-primary flex items-center gap-1 min-w-0">
                                            <User className="w-3 h-3 shrink-0" />
                                            <span className="truncate">{tx.customer_info || "Walk-in"}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Detail View */}
                            {isExpanded && (
                                <div className="mt-2 pt-4 border-t border-border/50 animate-in fade-in slide-in-from-top-2">
                                    <div className="grid grid-cols-1 gap-5">
                                        {/* Order Items */}
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Order Items</p>
                                            <div className="space-y-2">
                                                {tx.items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between items-start gap-2 bg-secondary/20 p-2.5 rounded-lg text-xs">
                                                        <div className="min-w-0">
                                                            <p className="font-bold break-words">{item.product?.name || "Product"}</p>
                                                            <p className="opacity-60 mt-0.5">{item.quantity} × ETB {item.price_at_sale.toFixed(2)}</p>
                                                        </div>
                                                        <p className="font-bold shrink-0">ETB {(item.quantity * item.price_at_sale).toFixed(2)}</p>
                                                    </div>
                                                ))}
                                                <div className="flex justify-between items-center pt-2 px-1">
                                                    <p className="text-xs font-bold text-muted-foreground">Grand Total</p>
                                                    <p className="text-base font-black text-primary">ETB {tx.total.toFixed(2)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Customer & Payment Details */}
                                        <div className="bg-secondary/10 p-3 rounded-xl border border-border/20 space-y-3">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Customer Details</p>
                                                <div className="space-y-1.5">
                                                    <p className="text-sm font-bold flex items-center gap-2 break-all">
                                                        <User className="w-3.5 h-3.5 text-primary shrink-0" />
                                                        {tx.customer_info || "Not recorded"}
                                                    </p>
                                                    <p className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                                                        <Phone className="w-3.5 h-3.5 shrink-0" />
                                                        {tx.customer_phone || "No phone number"}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="pt-3 border-t border-border/30">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Payment Info</p>
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold flex items-center gap-2">
                                                        <CreditCard className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                                        {tx.payment_method === 'cash' ? 'Cash' : `Bank (${tx.bank_name})`}
                                                    </p>
                                                    {tx.reference_number && (
                                                        <p className="text-xs font-mono text-muted-foreground break-all pl-5">Ref: {tx.reference_number}</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="pt-3 border-t border-border/30">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Recorded By</p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {getSalespersonName(tx.salesperson_number)} · {format(new Date(tx.sale_date), "HH:mm:ss")}
                                                </p>
                                            </div>
                                        </div>

                                        {showUndo && !isReversed && (
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                className="w-full h-10 rounded-xl font-bold"
                                                onClick={(e) => { e.stopPropagation(); handleUndo(tx.items); }}
                                            >
                                                <Undo2 className="w-4 h-4 mr-2" />
                                                Reverse Sale
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    if (inline) {
        return (
            <div className="border border-border/50 rounded-xl overflow-hidden bg-card/30">
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-full flex items-center justify-between p-5 hover:bg-secondary/20 transition-colors border-b border-border/20"
                >
                    <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-2">
                            <div className="bg-primary/10 p-1.5 rounded-lg">
                                <ReceiptText className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-bold text-base tracking-tight">Full Transaction Log</span>
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] h-5 px-2 uppercase font-black">
                                {transactions.length} Records
                            </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-medium pl-8">Review details, customers, and undo sales.</p>
                    </div>
                    <div className="bg-secondary/50 p-2 rounded-full">
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </button>
                
                {!isCollapsed && (
                    <div className="p-4 animate-in slide-in-from-top-2 duration-300">
                        {isLoading ? <div className="text-center text-muted-foreground p-8">Loading...</div> : content}
                    </div>
                )}
            </div>
        );
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle className="flex items-center gap-2">
                        <ReceiptText className="w-5 h-5" />
                        Sales History
                    </SheetTitle>
                    <SheetDescription>Track transactions and manage records.</SheetDescription>
                </SheetHeader>
                {isLoading ? <div className="text-center text-muted-foreground p-8">Loading...</div> : content}
            </SheetContent>
        </Sheet>
    );
}
