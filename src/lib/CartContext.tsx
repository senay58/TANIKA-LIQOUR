import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Product } from './inventory-data';

export interface CartItem {
    product: Product;
    quantity: number;
    priceAtSale: number;
    description?: string;
    customerInfo?: string;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (product: Product, quantity: number, price: number, customer?: string, desc?: string) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    cartTotal: number;
    cartCount: number;
    isCartOpen: boolean;
    setCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isCartOpen, setCartOpen] = useState(false);

    const addToCart = (product: Product, quantity: number, price: number, customer?: string, desc?: string) => {
        setItems(prevItems => {
            const existing = prevItems.find(item => item.product.id === product.id);
            if (existing) {
                // Return new array with updated item
                return prevItems.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...prevItems, { product, quantity, priceAtSale: price, customerInfo: customer, description: desc }];
        });
        setCartOpen(true);
    };

    const removeFromCart = (productId: string) => {
        setItems(prev => prev.filter(item => item.product.id !== productId));
    };

    const updateQuantity = (productId: string, quantity: number) => {
        setItems(prev => prev.map(item =>
            item.product.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item
        ));
    };

    const clearCart = () => setItems([]);

    const cartTotal = items.reduce((total, item) => total + (item.priceAtSale * item.quantity), 0);
    const cartCount = items.reduce((count, item) => count + item.quantity, 0);

    return (
        <CartContext.Provider value={{
            items,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            cartTotal,
            cartCount,
            isCartOpen,
            setCartOpen
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
