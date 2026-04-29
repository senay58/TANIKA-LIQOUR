import { useState, useMemo } from "react";
import { format, isSameDay } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useSalesHistory, useUndoSale, useProducts } from "@/hooks/useInventory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Undo2, ReceiptText, CalendarIcon, Download, X } from "lucide-react";
import { cn } from "@/lib/utils";
import fileDownload from "js-file-download";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SalesHistoryProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SalesHistory({ open, onOpenChange }: SalesHistoryProps) {
    const { data: sales = [], isLoading } = useSalesHistory();
    const { data: products = [] } = useProducts();
    const undoSaleMutation = useUndoSale();
    const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);

    const filteredSales = useMemo(() => {
        if (!dateFilter) return sales;
        return sales.filter(sale => isSameDay(new Date(sale.sale_date), dateFilter));
    }, [sales, dateFilter]);

    const handleDownloadCSV = () => {
        if (filteredSales.length === 0) {
            toast.error("No data to download for the selected period.");
            return;
        }

        const headers = ["ID", "Product Name", "Quantity", "Price At Sale", "Total", "Date", "Customer", "Description", "Status"];
        const rows = filteredSales.map(sale => [
            sale.id,
            `"${sale.product?.name || 'Unknown'}"`,
            sale.quantity,
            sale.price_at_sale,
            (sale.quantity * sale.price_at_sale).toFixed(2),
            format(new Date(sale.sale_date), 'yyyy-MM-dd HH:mm:ss'),
            `"${sale.customer_info || ''}"`,
            `"${sale.description || ''}"`,
            sale.is_reversed ? 'Reversed' : 'Completed'
        ]);

        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const fileName = dateFilter ? `sales_${format(dateFilter, 'yyyy-MM-dd')}.csv` : 'sales_all_time.csv';
        fileDownload(csvContent, fileName);
    };

    const handleDownloadPDF = () => {
        if (filteredSales.length === 0) {
            toast.error("No data to download for the selected period.");
            return;
        }

        const doc = new jsPDF();

        // Branding
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(200, 40, 40); // Red thematic color
        doc.text("TANIKA LIQUOR", 14, 20);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text("Sales History Report", 14, 28);
        doc.text(`Date: ${dateFilter ? format(dateFilter, "PPP") : "All Time"}`, 14, 34);

        const headers = [["Product", "Qty", "Price", "Total", "Date", "Status"]];
        const rows = filteredSales.map(sale => [
            sale.product?.name || 'Unknown',
            sale.quantity.toString(),
            `ETB ${sale.price_at_sale.toFixed(2)}`,
            `ETB ${(sale.quantity * sale.price_at_sale).toFixed(2)}`,
            format(new Date(sale.sale_date), 'yyyy-MM-dd HH:mm'),
            sale.is_reversed ? 'Reversed' : 'Completed'
        ]);

        autoTable(doc, {
            startY: 40,
            head: headers,
            body: rows,
            theme: 'striped',
            headStyles: { fillColor: [200, 40, 40] },
            styles: { fontSize: 9 },
        });

        const fileName = dateFilter ? `Tanika_Sales_${format(dateFilter, 'yyyy-MM-dd')}.pdf` : 'Tanika_Sales_All_Time.pdf';
        doc.save(fileName);
    };

    const handleUndo = async (sale: any) => {
        if (confirm("Are you sure you want to undo this sale? The inventory will be restored.")) {
            try {
                await undoSaleMutation.mutateAsync(sale);
                toast.success("Sale reversed successfully.");
            } catch (error) {
                console.error(error);
                toast.error("Failed to undo sale");
            }
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle className="flex items-center gap-2">
                        <ReceiptText className="w-5 h-5" />
                        Sales History
                    </SheetTitle>
                    <SheetDescription>
                        View recent transactions and undo erroneous sales.
                    </SheetDescription>
                </SheetHeader>

                {isLoading ? (
                    <div className="text-center text-muted-foreground p-8">Loading history...</div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-[200px] justify-start text-left font-normal",
                                            !dateFilter && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateFilter ? format(dateFilter, "PPP") : <span>Filter by date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={dateFilter}
                                        onSelect={setDateFilter}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            {dateFilter && (
                                <Button variant="ghost" size="icon" onClick={() => setDateFilter(undefined)} className="h-9 w-9 text-muted-foreground hover:text-foreground">
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                            <div className="flex-1" />
                            <div className="flex gap-2 shrink-0">
                                <Button variant="secondary" size="sm" onClick={handleDownloadCSV} className="h-9">
                                    <Download className="h-4 w-4 mr-2" />
                                    CSV
                                </Button>
                                <Button variant="default" size="sm" onClick={handleDownloadPDF} className="h-9">
                                    <Download className="h-4 w-4 mr-2" />
                                    PDF
                                </Button>
                            </div>
                        </div>

                        {filteredSales.length === 0 && (
                            <div className="text-center text-muted-foreground p-8 bg-secondary/30 rounded-lg">
                                No recent sales found.
                            </div>
                        )}

                        {filteredSales.map((sale) => (
                            <div
                                key={sale.id}
                                className={`p-4 rounded-lg border flex flex-col gap-3 transition-all ${sale.is_reversed ? 'opacity-50 bg-secondary/20' : 'bg-card shadow-sm hover:shadow-md'
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-semibold text-base line-clamp-1">
                                            {sale.product?.name || 'Unknown Product'}
                                            <Badge variant="outline" className="ml-2 font-normal">
                                                x{sale.quantity}
                                            </Badge>
                                        </h4>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {format(new Date(sale.sale_date), "MMM d, yyyy 'at' h:mm a")}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-primary">
                                            ETB {(sale.quantity * sale.price_at_sale).toFixed(2)}
                                        </p>
                                        {sale.is_reversed ? (
                                            <Badge variant="destructive" className="mt-1 text-[10px]">Reversed</Badge>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs mt-1 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleUndo(sale)}
                                                disabled={undoSaleMutation.isPending}
                                            >
                                                <Undo2 className="w-3 h-3 mr-1" />
                                                Undo
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {(sale.description || sale.customer_info) && (
                                    <div className="bg-secondary/50 p-2 text-sm rounded-md border-l-2 border-primary/50">
                                        {sale.customer_info && (
                                            <p className="font-medium text-xs mb-1">Customer: <span className="font-normal">{sale.customer_info}</span></p>
                                        )}
                                        {sale.description && (
                                            <p className="text-xs text-muted-foreground italic">"{sale.description}"</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
