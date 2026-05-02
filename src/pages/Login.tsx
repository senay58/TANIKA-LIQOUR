import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Wine, Lock, User, KeyRound, ShoppingBag, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import heroBanner from "@/assets/hero-banner.jpg";

type LoginMode = "admin" | "admin-secret" | "sales";

export default function Login() {
    const { login, loginWithSecret, loginAsSales, isAuthenticated, role } = useAuth();
    const navigate = useNavigate();

    const [mode, setMode] = useState<LoginMode>("admin");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [secretCode, setSecretCode] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // If already authenticated, redirect by role
    if (isAuthenticated) {
        if (role === "sales") navigate("/sales");
        else navigate("/");
        return null;
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            let success = false;
            if (mode === "admin-secret") {
                success = await loginWithSecret(secretCode);
            } else if (mode === "admin") {
                success = await login(username, password);
            } else {
                success = await loginAsSales(username, password);
            }

            if (success) {
                if (mode === "sales") {
                    toast.success("Welcome, Sales Staff!");
                    navigate("/sales");
                } else {
                    toast.success("Welcome back, Admin.");
                    navigate("/");
                }
            } else {
                toast.error("Invalid credentials. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const isSalesMode = mode === "sales";

    return (
        <div className="min-h-screen relative flex items-center justify-center bg-background overflow-hidden p-4">
            {/* Background */}
            <div className="absolute inset-0 z-0">
                <img src={heroBanner} alt="Background" className="w-full h-full object-cover opacity-10 blur-sm dark:opacity-5" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
            </div>

            <div className="absolute top-4 right-4 md:top-8 md:right-8 z-20">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-md z-10">
                <div className="glass-card rounded-2xl p-8 border border-border/50 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

                    {/* Role indicator strip */}
                    <div className="flex rounded-xl overflow-hidden border border-border/50 mb-8 bg-secondary/30">
                        <button
                            type="button"
                            onClick={() => { setMode("admin"); setUsername(""); setPassword(""); setSecretCode(""); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all ${
                                !isSalesMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <ShieldCheck className="w-4 h-4" />
                            Admin
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode("sales"); setUsername(""); setPassword(""); setSecretCode(""); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all ${
                                isSalesMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <ShoppingBag className="w-4 h-4" />
                            Sales Staff
                        </button>
                    </div>

                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                            <Wine className="h-8 w-8" />
                        </div>
                        <h1 className="text-2xl font-display font-bold text-center tracking-wide">
                            TANIKA {isSalesMode ? <span className="text-primary">SALES</span> : <span className="text-primary">SECURE</span>}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {isSalesMode ? "Sales Staff Authentication" : "Admin Portal Authentication"}
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        {mode === "admin-secret" ? (
                            <div className="space-y-2 animate-in fade-in">
                                <Label htmlFor="secretCode">Secret Recovery Code</Label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="secretCode"
                                        type="password"
                                        className="pl-9 bg-secondary border-border"
                                        placeholder="Enter the secret bypass code"
                                        value={secretCode}
                                        onChange={(e) => setSecretCode(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="space-y-2">
                                    <Label htmlFor="username">{isSalesMode ? "Staff Username" : "Admin Username"}</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="username"
                                            className="pl-9 bg-secondary border-border"
                                            placeholder={isSalesMode ? "sales" : "admin"}
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="password"
                                            type="password"
                                            className="pl-9 bg-secondary border-border"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
                            {isSubmitting ? "Authenticating..." : `Login as ${isSalesMode ? "Sales Staff" : "Admin"}`}
                        </Button>
                    </form>

                    {/* Admin-only: secret code toggle */}
                    {!isSalesMode && (
                        <div className="mt-6 text-center">
                            <Button
                                variant="link"
                                className="text-xs text-muted-foreground hover:text-primary"
                                onClick={() => setMode(mode === "admin-secret" ? "admin" : "admin-secret")}
                                type="button"
                            >
                                {mode === "admin-secret" ? "← Back to normal login" : "Forgot Password? Use Secret Code"}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
