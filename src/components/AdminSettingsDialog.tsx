import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { KeyRound, Timer } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AdminSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AdminSettingsDialog({ open, onOpenChange }: AdminSettingsDialogProps) {
    const { username, logout, autoLogoutMinutes, setAutoLogoutMinutes } = useAuth();
    const [newUsername, setNewUsername] = useState(username || "");
    const [newPassword, setNewPassword] = useState("");
    const [newSecret, setNewSecret] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleUpdate = async () => {
        if (!newUsername.trim() || !newPassword.trim() || !newSecret.trim()) {
            toast.error("All fields (Username, Password, Secret Code) must be filled to update credentials.");
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase.rpc('update_admin_credentials', {
                p_username: newUsername,
                p_password: newPassword,
                p_secret: newSecret
            });

            if (error) throw error;

            toast.success("Credentials updated successfully. Please log in again.");
            onOpenChange(false);
            logout(); // Force re-login with new creds
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to update credentials");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <KeyRound className="w-5 h-5" />
                        Admin Security Settings
                    </DialogTitle>
                    <DialogDescription>
                        Update your login credentials and recovery secret code. Note: updating will log you out.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
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
                            placeholder="Enter heavily guarded password"
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
                        <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                            This code bypasses standard password entry. Do not share it.
                        </p>
                    </div>

                    <div className="border-t border-border/50 pt-4 mt-2">
                        <div className="flex items-center gap-2 mb-3">
                            <Timer className="w-4 h-4 text-primary" />
                            <h4 className="font-semibold text-sm">Session Timeout</h4>
                        </div>
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
                            <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                                Automatically logs you out if inactive. Instantly saved.
                            </p>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleUpdate} disabled={isSubmitting}>
                        {isSubmitting ? "Updating..." : "Update & Log Out"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
