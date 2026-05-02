import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { KeyRound, Timer, ShoppingBag, ShieldCheck, RefreshCcw, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSalespersonNames } from "@/hooks/useInventory";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface AdminSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AdminSettingsDialog({ open, onOpenChange }: AdminSettingsDialogProps) {
    const { username, logout, autoLogoutMinutes, setAutoLogoutMinutes } = useAuth();

    // Admin credentials state
    const [newUsername, setNewUsername] = useState(username || "");
    const [newPassword, setNewPassword] = useState("");
    const [newSecret, setNewSecret] = useState("");
    const [isUpdatingAdmin, setIsUpdatingAdmin] = useState(false);

    // Sales credentials state
    const [salesUsername, setSalesUsername] = useState("sales");
    const [salesPassword, setSalesPassword] = useState("");
    const [salesPasswordConfirm, setSalesPasswordConfirm] = useState("");
    const [isUpdatingSales, setIsUpdatingSales] = useState(false);

    // Sales names state
    const { data: salespersonNames } = useSalespersonNames();
    const [sp1Name, setSp1Name] = useState("Salesperson 1");
    const [sp2Name, setSp2Name] = useState("Salesperson 2");
    const [isUpdatingNames, setIsUpdatingNames] = useState(false);

    // System Reset state
    const [resetPasscode, setResetPasscode] = useState("");
    const [isResetting, setIsResetting] = useState(false);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (salespersonNames) {
            setSp1Name(salespersonNames.sp1);
            setSp2Name(salespersonNames.sp2);
        }
    }, [salespersonNames]);

    const handleUpdateAdmin = async () => {
        if (!newUsername.trim() || !newPassword.trim() || !newSecret.trim()) {
            toast.error("All admin credential fields are required.");
            return;
        }
        setIsUpdatingAdmin(true);
        try {
            const { error } = await supabase.rpc('update_admin_credentials', {
                p_username: newUsername,
                p_password: newPassword,
                p_secret: newSecret,
            });
            if (error) throw error;
            toast.success("Admin credentials updated. Please log in again.");
            onOpenChange(false);
            logout();
        } catch (err: any) {
            toast.error(err.message || "Failed to update admin credentials");
        } finally {
            setIsUpdatingAdmin(false);
        }
    };

    const handleUpdateSales = async () => {
        if (!salesUsername.trim() || !salesPassword.trim()) {
            toast.error("Sales username and password are required.");
            return;
        }
        if (salesPassword !== salesPasswordConfirm) {
            toast.error("Passwords do not match.");
            return;
        }
        setIsUpdatingSales(true);
        try {
            const { error } = await supabase.rpc('update_sales_credentials', {
                p_password: salesPassword,
                p_username: salesUsername,
            });
            if (error) throw error;
            toast.success(`Sales staff credentials updated. New login: "${salesUsername}"`);
            setSalesPassword("");
            setSalesPasswordConfirm("");
        } catch (err: any) {
            toast.error(err.message || "Failed to update sales credentials");
        } finally {
            setIsUpdatingSales(false);
        }
    };

    const handleUpdateNames = async () => {
        if (!sp1Name.trim() || !sp2Name.trim()) {
            toast.error("Both salesperson names are required.");
            return;
        }
        setIsUpdatingNames(true);
        try {
            const { error } = await supabase.rpc('update_salesperson_names', {
                p_sp1: sp1Name,
                p_sp2: sp2Name,
            });
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['salesperson-names'] });
            toast.success("Salesperson names updated successfully.");
        } catch (err: any) {
            toast.error(err.message || "Failed to update salesperson names");
        } finally {
            setIsUpdatingNames(false);
        }
    };

    const handleSystemReset = async () => {
        if (!resetPasscode) return;
        
        if (!confirm("CRITICAL WARNING: This will delete EVERYTHING (Inventory, Sales, Credits). This is PERMANENT. Are you absolutely sure?")) {
            return;
        }

        setIsResetting(true);
        try {
            const { error } = await supabase.rpc('reset_entire_system', {
                p_password: resetPasscode,
            });

            if (error) throw error;

            toast.success("System reset successful. All data has been cleared.");
            setResetPasscode("");
            
            // Invalidate everything to clear the UI
            queryClient.invalidateQueries();
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.message || "Reset failed. Check your passcode.");
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90dvh] flex flex-col">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <KeyRound className="w-5 h-5" />
                        System Settings
                    </DialogTitle>
                    <DialogDescription>
                        Manage admin and sales staff credentials, and session settings.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="admin" className="mt-2 flex flex-col min-h-0 flex-1 overflow-hidden">
                    <TabsList className="w-full grid grid-cols-4 shrink-0 h-auto">
                        <TabsTrigger value="admin" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-[10px] sm:text-xs">
                            <ShieldCheck className="w-4 h-4 shrink-0" />
                            <span>Admin</span>
                        </TabsTrigger>
                        <TabsTrigger value="sales" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-[10px] sm:text-xs">
                            <ShoppingBag className="w-4 h-4 shrink-0" />
                            <span>Sales</span>
                        </TabsTrigger>
                        <TabsTrigger value="session" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-[10px] sm:text-xs">
                            <Timer className="w-4 h-4 shrink-0" />
                            <span>Session</span>
                        </TabsTrigger>
                        <TabsTrigger value="reset" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-[10px] sm:text-xs text-destructive data-[state=active]:text-destructive">
                            <RefreshCcw className="w-4 h-4 shrink-0" />
                            <span>Reset</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* ─── Admin Credentials ─── */}
                    <TabsContent value="admin" className="space-y-4 pt-4 overflow-y-auto flex-1 px-0.5">
                        <p className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded-lg">
                            ⚠️ Updating admin credentials will log you out immediately.
                        </p>
                        <div className="grid gap-2">
                            <Label htmlFor="admin-username">Admin Username</Label>
                            <Input
                                id="admin-username"
                                value={newUsername}
                                onChange={e => setNewUsername(e.target.value)}
                                placeholder="admin"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="admin-password">New Password</Label>
                            <Input
                                id="admin-password"
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Enter new admin password"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="admin-secret">New Recovery Secret Code</Label>
                            <Input
                                id="admin-secret"
                                type="password"
                                value={newSecret}
                                onChange={e => setNewSecret(e.target.value)}
                                placeholder="e.g. 1A2B3D4E"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                This code bypasses standard password entry. Do not share it.
                            </p>
                        </div>
                        <Button
                            variant="destructive"
                            className="w-full"
                            onClick={handleUpdateAdmin}
                            disabled={isUpdatingAdmin}
                        >
                            {isUpdatingAdmin ? "Updating..." : "Update Admin Credentials & Log Out"}
                        </Button>
                    </TabsContent>

                    {/* ─── Sales Staff Credentials ─── */}
                    <TabsContent value="sales" className="space-y-4 pt-4 overflow-y-auto flex-1 px-0.5">
                        <p className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded-lg">
                            Set the username and password that sales staff use to log into the Sales Portal. Any currently logged-in sales session will be invalidated on their next login attempt.
                        </p>
                        <div className="grid gap-2">
                            <Label htmlFor="sales-username">Sales Staff Username</Label>
                            <Input
                                id="sales-username"
                                value={salesUsername}
                                onChange={e => setSalesUsername(e.target.value)}
                                placeholder="sales"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="sales-password">New Password</Label>
                            <Input
                                id="sales-password"
                                type="password"
                                value={salesPassword}
                                onChange={e => setSalesPassword(e.target.value)}
                                placeholder="Enter new sales password"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="sales-password-confirm">Confirm Password</Label>
                            <Input
                                id="sales-password-confirm"
                                type="password"
                                value={salesPasswordConfirm}
                                onChange={e => setSalesPasswordConfirm(e.target.value)}
                                placeholder="Repeat password"
                            />
                        </div>
                        <Button
                            className="w-full"
                            onClick={handleUpdateSales}
                            disabled={isUpdatingSales}
                        >
                            {isUpdatingSales ? "Saving..." : "Save Sales Staff Credentials"}
                        </Button>

                        <div className="border-t pt-4 mt-4 space-y-4">
                            <h4 className="text-sm font-semibold">Salesperson Configuration</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="sp1">Salesperson 1 Name</Label>
                                    <Input id="sp1" value={sp1Name} onChange={e => setSp1Name(e.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="sp2">Salesperson 2 Name</Label>
                                    <Input id="sp2" value={sp2Name} onChange={e => setSp2Name(e.target.value)} />
                                </div>
                            </div>
                            <Button
                                variant="secondary"
                                className="w-full"
                                onClick={handleUpdateNames}
                                disabled={isUpdatingNames}
                            >
                                {isUpdatingNames ? "Saving Names..." : "Save Names"}
                            </Button>
                        </div>
                    </TabsContent>

                    {/* ─── Session Settings ─── */}
                    <TabsContent value="session" className="space-y-4 pt-4 overflow-y-auto flex-1 px-0.5">
                        <div className="grid gap-2">
                            <Label htmlFor="auto-logout">Auto-Logout (Idle Timer)</Label>
                            <Select
                                value={autoLogoutMinutes === null ? "never" : autoLogoutMinutes.toString()}
                                onValueChange={(val) => setAutoLogoutMinutes(val === "never" ? null : Number(val))}
                            >
                                <SelectTrigger id="auto-logout" className="w-full">
                                    <SelectValue placeholder="Select timeout" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10 Minutes</SelectItem>
                                    <SelectItem value="30">30 Minutes</SelectItem>
                                    <SelectItem value="60">1 Hour</SelectItem>
                                    <SelectItem value="120">2 Hours</SelectItem>
                                    <SelectItem value="never">Never (Stay Logged In)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Automatically logs you out when inactive. Saved instantly.
                            </p>
                        </div>
                    </TabsContent>

                    {/* ─── System Reset ─── */}
                    <TabsContent value="reset" className="space-y-4 pt-4 overflow-y-auto flex-1 px-0.5">
                        <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl space-y-2">
                            <h4 className="text-sm font-bold text-destructive flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                DANGER ZONE: SYSTEM WIPE
                            </h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                This will <strong>permanently delete</strong> all products, categories, sales records, cash flow history, and pending credits. This action <strong>cannot be undone</strong>.
                            </p>
                        </div>

                        <div className="grid gap-3 pt-2">
                            <Label htmlFor="reset-passcode">Enter Admin Passcode to Confirm</Label>
                            <Input
                                id="reset-passcode"
                                type="password"
                                value={resetPasscode}
                                onChange={e => setResetPasscode(e.target.value)}
                                placeholder="Your login password"
                                className="border-destructive/30 focus-visible:ring-destructive"
                            />
                        </div>

                        <Button
                            variant="destructive"
                            className="w-full h-11 font-black tracking-widest"
                            onClick={handleSystemReset}
                            disabled={isResetting || !resetPasscode}
                        >
                            {isResetting ? "WIPING SYSTEM..." : "ERASE EVERYTHING"}
                        </Button>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
