import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "./supabase";

export type UserRole = 'admin' | 'sales' | null;

interface AuthContextType {
    isAuthenticated: boolean;
    role: UserRole;
    username: string | null;
    login: (username: string, password: string) => Promise<boolean>;
    loginWithSecret: (secretCode: string) => Promise<boolean>;
    loginAsSales: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    isLoading: boolean;
    autoLogoutMinutes: number | null;
    setAutoLogoutMinutes: (mins: number | null) => void;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    role: null,
    username: null,
    login: async () => false,
    loginWithSecret: async () => false,
    loginAsSales: async () => false,
    logout: () => {},
    isLoading: true,
    autoLogoutMinutes: null,
    setAutoLogoutMinutes: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [role, setRole] = useState<UserRole>(null);
    const [username, setUsername] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [autoLogoutMinutes, setAutoLogoutMinutesState] = useState<number | null>(null);

    const setAutoLogoutMinutes = (mins: number | null) => {
        setAutoLogoutMinutesState(mins);
        if (mins === null) {
            localStorage.removeItem("tanika_auto_logout");
        } else {
            localStorage.setItem("tanika_auto_logout", mins.toString());
        }
    };

    // Restore session from localStorage on mount
    useEffect(() => {
        const storedUser = localStorage.getItem("tanika_user");
        const storedToken = localStorage.getItem("tanika_token");
        const storedRole = localStorage.getItem("tanika_role") as UserRole;

        if (storedUser && storedToken && storedRole) {
            setIsAuthenticated(true);
            setUsername(storedUser);
            setRole(storedRole);
        }

        const storedLogout = localStorage.getItem("tanika_auto_logout");
        if (storedLogout) setAutoLogoutMinutesState(Number(storedLogout));

        setIsLoading(false);
    }, []);

    // Idle auto-logout timer
    useEffect(() => {
        if (!isAuthenticated || autoLogoutMinutes === null) return;

        let timeoutId: NodeJS.Timeout;
        const resetTimer = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => logout(), autoLogoutMinutes * 60 * 1000);
        };

        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        events.forEach(e => document.addEventListener(e, resetTimer));
        resetTimer();

        return () => {
            clearTimeout(timeoutId);
            events.forEach(e => document.removeEventListener(e, resetTimer));
        };
    }, [isAuthenticated, autoLogoutMinutes]);

    const persistSession = (user: string, userRole: UserRole) => {
        setIsAuthenticated(true);
        setUsername(user);
        setRole(userRole);
        localStorage.setItem("tanika_user", user);
        localStorage.setItem("tanika_token", "session-token-v2");
        localStorage.setItem("tanika_role", userRole as string);
    };

    const login = async (user: string, pass: string) => {
        try {
            const { data, error } = await supabase.rpc('verify_admin_login', {
                p_username: user,
                p_password: pass,
            });
            if (data === true && !error) {
                persistSession(user, 'admin');
                return true;
            }
            return false;
        } catch {
            return false;
        }
    };

    const loginWithSecret = async (secret: string) => {
        try {
            const { data, error } = await supabase.rpc('verify_admin_secret', { p_secret: secret });
            if (data === true && !error) {
                persistSession('admin', 'admin');
                return true;
            }
            return false;
        } catch {
            return false;
        }
    };

    const loginAsSales = async (user: string, pass: string) => {
        try {
            const { data, error } = await supabase.rpc('verify_sales_login', {
                p_username: user,
                p_password: pass,
            });
            if (data === true && !error) {
                persistSession(user, 'sales');
                return true;
            }
            return false;
        } catch {
            return false;
        }
    };

    const logout = () => {
        setIsAuthenticated(false);
        setUsername(null);
        setRole(null);
        localStorage.removeItem("tanika_user");
        localStorage.removeItem("tanika_token");
        localStorage.removeItem("tanika_role");
        // Clear old key format too
        localStorage.removeItem("tanika_admin_user");
        localStorage.removeItem("tanika_admin_token");
    };

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            role,
            username,
            login,
            loginWithSecret,
            loginAsSales,
            logout,
            isLoading,
            autoLogoutMinutes,
            setAutoLogoutMinutes,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
