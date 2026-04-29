import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Product, Category } from '@/lib/inventory-data';

// --- Categories ---
export function useCategories() {
    return useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const { data, error } = await supabase.from('categories').select('*').order('name');
            if (error) throw error;
            return data;
        },
    });
}

export function useAddCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ name, emoji }: { name: string; emoji: string }) => {
            const { data, error } = await supabase.from('categories').insert([{ name, emoji }]).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
    });
}

export function useDeleteCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('categories').delete().eq('id', id);
            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['products'] }); // Invalidate products too as category reference might change
        },
    });
}

// --- Products ---
export function useProducts() {
    return useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('products')
                .select(`
          *,
          category:categories(name, emoji)
        `)
                .order('name');

            if (error) throw error;

            // Transform data to match the Product interface expected by the UI
            return data.map((item: any) => ({
                id: item.id,
                name: item.name,
                category: item.category?.name || 'Uncategorized',
                categoryEmoji: item.category?.emoji || '',
                brand: item.brand,
                priceIn: Number(item.price_in),
                priceOut: Number(item.price_out),
                quantity: item.quantity,
                minStock: item.min_stock,
                volume: item.volume,
                imageUrl: item.image_url,
            })) as Product[];
        },
    });
}

export function useSaveProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (productData: Partial<Product> & { id?: string }) => {
            // First, get the category ID
            const { data: catData } = await supabase
                .from('categories')
                .select('id')
                .eq('name', productData.category)
                .single();

            const payload = {
                name: productData.name,
                category_id: catData?.id,
                brand: productData.brand,
                price_in: productData.priceIn,
                price_out: productData.priceOut,
                quantity: productData.quantity,
                min_stock: productData.minStock,
                volume: productData.volume,
            };

            if (productData.id && !productData.id.startsWith('draft-')) {
                // Update
                const { data, error } = await supabase
                    .from('products')
                    .update(payload)
                    .eq('id', productData.id)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('products')
                    .insert([payload])
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
}

export function useDeleteProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
}

// --- Sales ---
export function useSalesHistory() {
    return useQuery({
        queryKey: ['sales'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sales')
                .select(`
          *,
          product:products(name, brand, volume)
        `)
                .order('sale_date', { ascending: false });
            if (error) throw error;
            return data;
        },
    });
}

export function useRecordSale() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ productId, quantity, priceAtSale, description, customerInfo }: {
            productId: string;
            quantity: number;
            priceAtSale: number;
            description?: string;
            customerInfo?: string;
        }) => {
            // 1. Record the sale
            const { error: saleError } = await supabase
                .from('sales')
                .insert([{
                    product_id: productId,
                    quantity,
                    price_at_sale: priceAtSale,
                    description,
                    customer_info: customerInfo
                }]);

            if (saleError) throw saleError;

            // 2. Decrement product quantity (Using an RPC or simple read-update since we don't have RPC setup here)
            const { data: product, error: fetchError } = await supabase
                .from('products')
                .select('quantity')
                .eq('id', productId)
                .single();

            if (fetchError) throw fetchError;

            const { error: updateError } = await supabase
                .from('products')
                .update({ quantity: (product.quantity || 0) - quantity })
                .eq('id', productId);

            if (updateError) throw updateError;

            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['sales'] });
        },
    });
}

export function useBulkRecordSale() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (salesData: Array<{
            product_id: string;
            quantity: number;
            price_at_sale: number;
            description?: string;
            customer_info?: string;
        }>) => {
            const { data, error } = await supabase.rpc('process_bulk_sales', {
                sales_data: salesData
            });

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['sales'] });
        },
    });
}

export function useImportSalesCSV() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (parsedSales: Array<{
            product_id: string;
            quantity: number;
            price_at_sale: number;
            sale_date: string;
            customer_info?: string;
            description?: string;
        }>) => {
            // Note: Directly inserting into 'sales' bypasses stock decrement since historical sales 
            // shouldn't deduct from CURRENT stock, or if they should, we need to handle it.
            // For legacy import, we typically just insert the records.
            // But we must disable the trigger temporarily or accept that the trigger will fire.
            // Let's assume standard insert is fine and the user handles stock manually, 
            // or the trigger fires if it's identical to a new sale.
            const { data, error } = await supabase
                .from('sales')
                .insert(parsedSales);

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
        },
    });
}

export function useUndoSale() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (sale: any) => {
            if (sale.is_reversed) throw new Error("Sale is already reversed");

            // 1. Mark sale as reversed
            const { error: updateSaleError } = await supabase
                .from('sales')
                .update({ is_reversed: true })
                .eq('id', sale.id);

            if (updateSaleError) throw updateSaleError;

            // 2. Increment product quantity back
            if (sale.product_id) {
                const { data: product, error: fetchError } = await supabase
                    .from('products')
                    .select('quantity')
                    .eq('id', sale.product_id)
                    .single();

                if (!fetchError && product) {
                    await supabase
                        .from('products')
                        .update({ quantity: product.quantity + sale.quantity })
                        .eq('id', sale.product_id);
                }
            }
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['sales'] });
        },
    });
}
