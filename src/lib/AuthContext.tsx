import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "./supabase";

interface AuthContextType {
    isAuthenticated: boolean;
    username: string | null;
    login: (username: string, passwordHash: string) => Promise<boolean>;
    loginWithSecret: (secretCodeHash: string) => Promise<boolean>;
    logout: () => void;
    isLoading: boolean;
    autoLogoutMinutes: number | null;
    setAutoLogoutMinutes: (mins: number | null) => void;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    username: null,
    login: async () => false,
    loginWithSecret: async () => false,
    logout: () => { },
    isLoading: true,
    autoLogoutMinutes: null,
    setAutoLogoutMinutes: () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
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

    // Check local storage on mount
    useEffect(() => {
        const checkAuth = async () => {
            const storedUser = localStorage.getItem("tanika_admin_user");
            const sessionToken = localStorage.getItem("tanika_admin_token");

            if (storedUser && sessionToken) {
                setIsAuthenticated(true);
                setUsername(storedUser);
            }

            const storedLogout = localStorage.getItem("tanika_auto_logout");
            if (storedLogout) {
                setAutoLogoutMinutesState(Number(storedLogout));
            }

            setIsLoading(false);
        };
        checkAuth();
    }, []);

    // Idle Timer Effect
    useEffect(() => {
        if (!isAuthenticated || autoLogoutMinutes === null) return;

        let timeoutId: NodeJS.Timeout;

        const resetTimer = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                logout();
            }, autoLogoutMinutes * 60 * 1000);
        };

        // Set up event listeners for activity
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => document.addEventListener(event, resetTimer));

        // Start the timer initially
        resetTimer();

        return () => {
            clearTimeout(timeoutId);
            events.forEach(event => document.removeEventListener(event, resetTimer));
        };
    }, [isAuthenticated, autoLogoutMinutes]);

    const login = async (user: string, pass: string) => {
        try {
            const { data, error } = await supabase.rpc('verify_admin_login', {
                p_username: user,
                p_password: pass
            });

            if (data === true && !error) {
                setIsAuthenticated(true);
                setUsername(user);
                // Save "token" (simulation)
                localStorage.setItem("tanika_admin_user", user);
                localStorage.setItem("tanika_admin_token", "custom-auth-token-123");
                return true;
            }
            return false;
        } catch {
            return false;
        }
    };

    const loginWithSecret = async (secret: string) => {
        try {
            const { data, error } = await supabase.rpc('verify_admin_secret', {
                p_secret: secret
            });

            if (data === true && !error) {
                setIsAuthenticated(true);
                // Since we don't get the username back from verifying secret, we default to 'admin' 
                // or we could change the RPC to return the username. For MVP, we'll assume 'admin'.
                setUsername('admin');
                localStorage.setItem("tanika_admin_user", 'admin');
                localStorage.setItem("tanika_admin_token", "custom-auth-token-123");
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
        localStorage.removeItem("tanika_admin_user");
        localStorage.removeItem("tanika_admin_token");
    };

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            username,
            login,
            loginWithSecret,
            logout,
            isLoading,
            autoLogoutMinutes,
            setAutoLogoutMinutes
        }}>
            {children}
        </AuthContext.Provider>
    );
};
