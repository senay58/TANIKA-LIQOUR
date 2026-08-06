import { useFinanceSummary, useCashFlow, useCredits, usePayCredit, useInjectCash } from "@/hooks/useInventory";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowUpCircle, ArrowDownCircle, Clock, CheckCircle2, Phone, User, Calendar, PlusCircle, Download } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { exportToCSV } from "@/lib/utils";

export function FinanceDashboard() {
    const { data: summary } = useFinanceSummary();
    const { data: cashFlow = [] } = useCashFlow();
    const { data: credits = [] } = useCredits();
    const payCreditMutation = usePayCredit();
    const injectCashMutation = useInjectCash();

    const [isInjectOpen, setIsInjectOpen] = useState(false);
    const [injectAmount, setInjectAmount] = useState("");
    const [injectDesc, setInjectDesc] = useState("");
    const [injectPassword, setInjectPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePayCredit = async (id: string) => {
        try {
            await payCreditMutation.mutateAsync(id);
            toast.success("Credit payment recorded successfully!");
        } catch (error: any) {
            toast.error(error.message || "Failed to record payment");
        }
    };

    const handleInjectCash = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!injectAmount || isNaN(Number(injectAmount))) {
            toast.error("Please enter a valid amount");
            return;
        }
        if (!injectPassword) {
            toast.error("Admin password is required");
            return;
        }

        setIsSubmitting(true);
        try {
            await injectCashMutation.mutateAsync({
                amount: Number(injectAmount),
                description: injectDesc || "Manual cash injection",
                passcode: injectPassword
            });
            toast.success("Cash injected successfully!");
            setIsInjectOpen(false);
            setInjectAmount("");
            setInjectDesc("");
            setInjectPassword("");
        } catch (error: any) {
            toast.error(error.message || "Failed to inject cash");
        } finally {
            setIsSubmitting(false);
        }
    };

    const pendingCredits = credits.filter(c => c.status === 'pending');
    const totalDebt = pendingCredits.reduce((sum, c) => sum + Number(c.amount), 0);

    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    const overdue = pendingCredits
        .filter(c => new Date(c.due_date) < now)
        .reduce((sum, c) => sum + Number(c.amount), 0);
        
    const dueSoon = pendingCredits
        .filter(c => {
            const due = new Date(c.due_date);
            return due >= now && due <= threeDaysFromNow;
        })
        .reduce((sum, c) => sum + Number(c.amount), 0);

    const openWhatsAppReminder = (phone: string, name: string, amount: number) => {
        if (!phone) {
            toast.error("No phone number recorded for this customer.");
            return;
        }
        let cleanPhone = phone.replace(/\D/g, ''); // remove non-digits
        // If it's a local Ethiopian number starting with 0, replace with 251
        if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
            cleanPhone = '251' + cleanPhone.substring(1);
        } else if (!cleanPhone.startsWith('251')) {
            // Default to Ethiopian country code if not specified
            cleanPhone = '251' + cleanPhone;
        }

        const msg = encodeURIComponent(`Hello ${name}, this is a gentle reminder regarding your pending credit of ETB ${amount.toFixed(2)} at Tanika Liquor. Please arrange for payment at your earliest convenience. Thank you!`);
        window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
    };

    const drawPDFHeader = (doc: jsPDF, title: string) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(28);
        doc.setTextColor(180, 20, 20);
        doc.text("TANIKA LIQUOR", 14, 25);
        doc.setFontSize(12);
        doc.setTextColor(80);
        doc.text(title, 14, 34);
        doc.setDrawColor(180, 20, 20);
        doc.setLineWidth(1);
        doc.line(14, 38, 196, 38);
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(`Generated: ${format(new Date(), "PPpp")}`, 14, 45);
    };

    const exportPendingCredits = () => {
        if (pendingCredits.length === 0) {
            toast.error("No pending credits to export.");
            return;
        }
        try {
            const doc = new jsPDF();
            drawPDFHeader(doc, "Pending Credits Report");
            
            autoTable(doc, {
                head: [["Customer Name", "Phone", "Amount (ETB)", "Due Date", "Status"]],
                body: pendingCredits.map(c => [
                    c.customer_name,
                    c.customer_phone || '-',
                    Number(c.amount).toFixed(2),
                    format(new Date(c.due_date), "MMM dd, yyyy"),
                    c.status.toUpperCase()
                ]),
                startY: 55,
                theme: "grid",
                styles: { fontSize: 9 },
                headStyles: { fillColor: [180, 20, 20], textColor: 255, fontStyle: 'bold' },
            });

            doc.save(`Tanika_Pending_Credits_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
            toast.success("Pending Credits PDF downloaded");
        } catch (error) {
            toast.error("Failed to generate PDF");
        }
    };

    const exportCashFlow = () => {
        if (cashFlow.length === 0) {
            toast.error("No cash flow data to export.");
            return;
        }
        try {
            const doc = new jsPDF();
            drawPDFHeader(doc, "Recent Cash Flow Report");
            
            autoTable(doc, {
                head: [["Date", "Type", "Description", "Amount (ETB)"]],
                body: cashFlow.map(entry => [
                    format(new Date(entry.created_at), "MMM dd, yyyy HH:mm"),
                    entry.type.toUpperCase(),
                    entry.description || '-',
                    Number(entry.amount).toFixed(2)
                ]),
                startY: 55,
                theme: "grid",
                styles: { fontSize: 9 },
                headStyles: { fillColor: [180, 20, 20], textColor: 255, fontStyle: 'bold' },
            });

            doc.save(`Tanika_Cash_Flow_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
            toast.success("Cash Flow PDF downloaded");
        } catch (error) {
            toast.error("Failed to generate PDF");
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="glass-card border-green-500/20 bg-green-500/5 overflow-hidden relative">
                    <div className="absolute right-0 top-0 p-8 opacity-10 pointer-events-none">
                        <Wallet className="w-24 h-24 text-green-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Wallet className="w-4 h-4 text-green-500" />
                                Current Cash Pile
                            </CardTitle>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 px-2 text-[10px] gap-1 border-green-500/30 hover:bg-green-500/10 text-green-500"
                                onClick={() => setIsInjectOpen(true)}
                            >
                                <PlusCircle className="w-3 h-3" />
                                Inject Cash
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-500">
                            ETB {summary?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Real-time business liquidity</p>
                    </CardContent>
                </Card>

                <Card className="glass-card border-red-500/20 bg-red-500/5 overflow-hidden relative">
                    <div className="absolute right-0 top-0 p-8 opacity-10 pointer-events-none">
                        <Clock className="w-24 h-24 text-red-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Clock className="w-4 h-4 text-red-500" />
                            Outstanding Credits
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-500 mb-2">
                            ETB {totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="flex gap-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Due Soon</span>
                                <span className="text-sm font-semibold text-yellow-500">ETB {dueSoon.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Overdue</span>
                                <span className="text-sm font-semibold text-red-600">ETB {overdue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Pending Credits */}
                <Card className="glass-card h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-red-400" />
                                Pending Credits
                            </div>
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={exportPendingCredits}>
                                <Download className="w-3 h-3" /> Export
                            </Button>
                        </CardTitle>
                        <CardDescription>Track customers who took items on credit</CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                        <div className="space-y-4">
                            {pendingCredits.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground italic text-sm">No pending credits. All clear!</div>
                            ) : (
                                pendingCredits.map(credit => (
                                    <div key={credit.id} className="flex flex-col gap-3 p-4 bg-secondary/20 rounded-2xl border border-border/50 relative overflow-hidden group hover:bg-secondary/40 transition-all">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-red-500/20 p-2 rounded-full">
                                                    <User className="w-4 h-4 text-red-400" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm">{credit.customer_name}</h4>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Phone className="w-3 h-3" />
                                                        {credit.customer_phone || "No phone"}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-black text-red-400">ETB {Number(credit.amount).toFixed(2)}</div>
                                                <Badge variant="outline" className="text-[9px] h-4 mt-1 border-red-500/30 text-red-400 uppercase">Pending</Badge>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between mt-1 pt-3 border-t border-border/30">
                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                <Calendar className="w-3 h-3" />
                                                Due: {format(new Date(credit.due_date), "MMM dd, yyyy")}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    className="h-8 text-xs gap-1"
                                                    onClick={() => openWhatsAppReminder(credit.customer_phone, credit.customer_name, Number(credit.amount))}
                                                >
                                                    <Phone className="w-3.5 h-3.5" />
                                                    Remind
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white gap-1"
                                                    onClick={() => handlePayCredit(credit.id)}
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Paid
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Cash Flow */}
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-blue-400" />
                                Recent Cash Flow
                            </div>
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={exportCashFlow}>
                                <Download className="w-3 h-3" /> Export
                            </Button>
                        </CardTitle>
                        <CardDescription>Income and expenses tracking</CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                        <div className="space-y-3">
                            {cashFlow.map((entry) => (
                                <div key={entry.id} className="flex items-center justify-between p-3 bg-secondary/10 rounded-xl border border-border/30">
                                    <div className="flex items-center gap-3">
                                        {Number(entry.amount) >= 0 ? (
                                            <ArrowUpCircle className="w-8 h-8 text-green-500/80" />
                                        ) : (
                                            <ArrowDownCircle className="w-8 h-8 text-red-500/80" />
                                        )}
                                        <div>
                                            <p className="text-sm font-medium">{entry.description}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-tight">
                                                {format(new Date(entry.created_at), "MMM dd, HH:mm")} • {entry.type}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`font-bold text-sm ${Number(entry.amount) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {Number(entry.amount) >= 0 ? '+' : ''}{Number(entry.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Injection Dialog */}
            <Dialog open={isInjectOpen} onOpenChange={setIsInjectOpen}>
                <DialogContent className="sm:max-w-[400px] glass-card border-green-500/20">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <PlusCircle className="w-5 h-5 text-green-500" />
                            Inject Extra Cash
                        </DialogTitle>
                        <DialogDescription>
                            Add manual funds to the business cash pile without resetting.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleInjectCash} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount (ETB)</Label>
                            <Input 
                                id="amount" 
                                type="number" 
                                placeholder="0.00" 
                                value={injectAmount}
                                onChange={(e) => setInjectAmount(e.target.value)}
                                className="bg-secondary/50 border-border/50 focus:border-green-500/50"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Input 
                                id="description" 
                                placeholder="e.g. Found extra business funds" 
                                value={injectDesc}
                                onChange={(e) => setInjectDesc(e.target.value)}
                                className="bg-secondary/50 border-border/50 focus:border-green-500/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Admin Password</Label>
                            <Input 
                                id="password" 
                                type="password"
                                placeholder="••••••" 
                                value={injectPassword}
                                onChange={(e) => setInjectPassword(e.target.value)}
                                className="bg-secondary/50 border-border/50 focus:border-green-500/50"
                                required
                            />
                        </div>
                        <DialogFooter className="pt-4">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => setIsInjectOpen(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                className="bg-green-600 hover:bg-green-700 text-white"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Injecting..." : "Inject Cash"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
