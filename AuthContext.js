// SwiftPick — Auth Context (Global auth state)
import React, { createContext, useState, useEffect, useContext } from 'react';
import { storage } from '../utils/storage';
import { authService } from '../services/authService';
import { MOCK_MODE } from '../utils/constants';
import { MOCK_USERS } from '../utils/mockData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check for existing session on app start
    useEffect(() => {
        loadStoredSession();
    }, []);

    async function loadStoredSession() {
        try {
            const storedToken = await storage.getToken();
            const storedUser = await storage.getUser();
            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(storedUser);
            }
        } catch (e) {
            console.log('Failed to load session:', e);
        } finally {
            setIsLoading(false);
        }
    }

    async function login(email, password) {
        if (MOCK_MODE) {
            // Mock login: determine role from email, or default to parent
            let mockUser = MOCK_USERS.parent;
            if (email.includes('driver')) {
                mockUser = MOCK_USERS.driver;
            } else if (email.includes('admin')) {
                mockUser = MOCK_USERS.admin;
            } else if (email.includes('teacher')) {
                mockUser = MOCK_USERS.teacher;
            }
            const mockToken = 'mock_jwt_token_' + Date.now();
            await storage.setToken(mockToken);
            await storage.setUser(mockUser);
            setToken(mockToken);
            setUser(mockUser);
            return mockUser;
        }

        const result = await authService.login(email, password);
        const { token: newToken, user: userData } = result.data;
        await storage.setToken(newToken);
        await storage.setUser(userData);
        setToken(newToken);
        setUser(userData);
        return userData;
    }

    async function register(data) {
        if (MOCK_MODE) {
            // Mock registration — just return success
            return { success: true, data: { id: 99, email: data.email, role: data.role } };
        }
        const result = await authService.register(data);
        return result;
    }

    async function logout() {
        await storage.clearAll();
        setToken(null);
        setUser(null);
    }

    async function refreshProfile() {
        if (MOCK_MODE) return;
        try {
            const result = await authService.getProfile();
            setUser(result.data);
            await storage.setUser(result.data);
        } catch (e) {
            console.log('Failed to refresh profile:', e);
        }
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isLoading,
                isAuthenticated: !!token,
                login,
                register,
                logout,
                refreshProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
