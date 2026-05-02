import { useFinanceSummary, useCashFlow, useCredits, usePayCredit } from "@/hooks/useInventory";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowUpCircle, ArrowDownCircle, Clock, CheckCircle2, Phone, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export function FinanceDashboard() {
    const { data: summary } = useFinanceSummary();
    const { data: cashFlow = [] } = useCashFlow();
    const { data: credits = [] } = useCredits();
    const payCreditMutation = usePayCredit();

    const handlePayCredit = async (id: string) => {
        try {
            await payCreditMutation.mutateAsync(id);
            toast.success("Credit payment recorded successfully!");
        } catch (error: any) {
            toast.error(error.message || "Failed to record payment");
        }
    };

    const pendingCredits = credits.filter(c => c.status === 'pending');
    const totalDebt = pendingCredits.reduce((sum, c) => sum + Number(c.amount), 0);

    return (
        <div className="space-y-6">
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="glass-card border-green-500/20 bg-green-500/5 overflow-hidden relative">
                    <div className="absolute right-0 top-0 p-8 opacity-10">
                        <Wallet className="w-24 h-24 text-green-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-green-500" />
                            Current Cash Pile
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-500">
                            ETB {summary?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Real-time business liquidity</p>
                    </CardContent>
                </Card>

                <Card className="glass-card border-red-500/20 bg-red-500/5 overflow-hidden relative">
                    <div className="absolute right-0 top-0 p-8 opacity-10">
                        <Clock className="w-24 h-24 text-red-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Clock className="w-4 h-4 text-red-500" />
                            Total Debt Owed
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-500">
                            ETB {totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">From {pendingCredits.length} pending credits</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Pending Credits */}
                <Card className="glass-card h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="w-5 h-5 text-red-400" />
                            Pending Credits
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
                                            <Button 
                                                size="sm" 
                                                className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white gap-2"
                                                onClick={() => handlePayCredit(credit.id)}
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Mark as Paid
                                            </Button>
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
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-blue-400" />
                            Recent Cash Flow
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
        </div>
    );
}
