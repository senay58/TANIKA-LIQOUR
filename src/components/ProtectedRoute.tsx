import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Wine } from 'lucide-react';

export const ProtectedRoute = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <Wine className="h-12 w-12 text-primary/50" />
                    <p className="text-muted-foreground font-display tracking-widest text-sm">LOADING SECURE ENVIRONMENT</p>
                </div>
            </div>
        );
    }

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};
