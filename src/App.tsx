import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { CartProvider } from "@/lib/CartContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import SalesPortal from "./pages/SalesPortal";
import NotFound from "./pages/NotFound";
import { Wine } from "lucide-react";

const queryClient = new QueryClient();

// Guard: only admin role
function AdminRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, role, isLoading } = useAuth();
    if (isLoading) return <LoadingScreen />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (role !== "admin") return <Navigate to="/sales" replace />;
    return <>{children}</>;
}

// Guard: only sales role
function SalesRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, role, isLoading } = useAuth();
    if (isLoading) return <LoadingScreen />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (role !== "sales") return <Navigate to="/" replace />;
    return <>{children}</>;
}

function LoadingScreen() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4 animate-pulse">
                <Wine className="h-12 w-12 text-primary/50" />
                <p className="text-muted-foreground font-display tracking-widest text-sm">LOADING SECURE ENVIRONMENT</p>
            </div>
        </div>
    );
}

const App = () => (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <AuthProvider>
                    <Toaster />
                    <Sonner />
                    <BrowserRouter>
                        <Routes>
                            {/* Admin dashboard */}
                            <Route path="/" element={
                                <AdminRoute>
                                    <CartProvider>
                                        <Index />
                                    </CartProvider>
                                </AdminRoute>
                            } />

                            {/* Sales portal */}
                            <Route path="/sales" element={
                                <SalesRoute>
                                    <CartProvider>
                                        <SalesPortal />
                                    </CartProvider>
                                </SalesRoute>
                            } />

                            {/* Login */}
                            <Route path="/login" element={<Login />} />

                            {/* 404 */}
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </BrowserRouter>
                </AuthProvider>
            </TooltipProvider>
        </QueryClientProvider>
    </ThemeProvider>
);

export default App;
