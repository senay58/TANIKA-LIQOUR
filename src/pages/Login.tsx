import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Wine, Lock, User, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import heroBanner from "@/assets/hero-banner.jpg";

export default function Login() {
    const { login, loginWithSecret, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [isSecretMode, setIsSecretMode] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [secretCode, setSecretCode] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // If already authenticated, bounce to dashboard
    if (isAuthenticated) {
        navigate("/");
        return null;
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const success = isSecretMode
                ? await loginWithSecret(secretCode)
                : await login(username, password);

            if (success) {
                toast.success("Welcome back to Tanika Liquor Admin");
                navigate("/");
            } else {
                toast.error("Invalid credentials.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center bg-background overflow-hidden p-4">
            {/* Background Decor */}
            <div className="absolute inset-0 z-0">
                <img src={heroBanner} alt="Background" className="w-full h-full object-cover opacity-10 blur-sm dark:opacity-5" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
            </div>

            <div className="absolute top-4 right-4 md:top-8 md:right-8 z-20">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-md z-10">
                <div className="glass-card rounded-2xl p-8 border border-border/50 shadow-2xl relative overflow-hidden">
                    {/* Subtle top glow */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

                    <div className="flex flex-col items-center mb-8">
                        <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                            <Wine className="h-8 w-8" />
                        </div>
                        <h1 className="text-2xl font-display font-bold text-center tracking-wide">
                            TANIKA SECURE
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Admin Portal Authentication
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        {isSecretMode ? (
                            <div className="space-y-4 animate-fade-in">
                                <div className="space-y-2">
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
                            </div>
                        ) : (
                            <div className="space-y-4 animate-fade-in">
                                <div className="space-y-2">
                                    <Label htmlFor="username">Username</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="username"
                                            className="pl-9 bg-secondary border-border"
                                            placeholder="admin"
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
                            {isSubmitting ? "Authenticating..." : "Login"}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <Button
                            variant="link"
                            className="text-xs text-muted-foreground hover:text-primary"
                            onClick={() => setIsSecretMode(!isSecretMode)}
                            type="button"
                        >
                            {isSecretMode ? "Back to normal login" : "Forgot Password? Use Secret Code"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
