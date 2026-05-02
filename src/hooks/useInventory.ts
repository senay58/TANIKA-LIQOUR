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
            if (error) {
                if (error.code === '23505') {
                    throw new Error(`Category '${name}' already exists.`);
                }
                throw new Error(error.message || "Failed to add category");
            }
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
            let catId = null;
            if (productData.category && productData.category !== 'Uncategorized') {
                const { data: catData, error: catError } = await supabase
                    .from('categories')
                    .select('id')
                    .eq('name', productData.category)
                    .maybeSingle();

                if (catData) {
                    catId = catData.id;
                }
            }

            const payload = {
                name: productData.name,
                category_id: catId,
                brand: productData.brand,
                price_in: Number(productData.priceIn) || 0,
                price_out: Number(productData.priceOut) || 0,
                quantity: Number(productData.quantity) || 0,
                min_stock: Number(productData.minStock) || 0,
                volume: productData.volume || '750ml',
            };

            if (productData.id && !productData.id.startsWith('draft-')) {
                // Update
                const { data, error } = await supabase
                    .from('products')
                    .update(payload)
                    .eq('id', productData.id)
                    .select()
                    .single();
                if (error) throw new Error(error.message);
                return data;
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('products')
                    .insert([payload])
                    .select()
                    .single();
                if (error) throw new Error(error.message);
                return data;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
            queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
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
        refetchInterval: 20000,
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
        mutationFn: async ({ salesData, creditInfo }: { 
            salesData: Array<{
                product_id: string;
                quantity: number;
                price_at_sale: number;
                description?: string;
                customer_info?: string;
                payment_method?: 'cash' | 'bank_transfer';
                bank_name?: string | null;
                reference_number?: string | null;
                salesperson_number?: number;
            }>,
            creditInfo?: {
                customer_name: string;
                customer_phone?: string;
                due_date: string;
            }
        }) => {
            // 1. Record Sales and Credits ATOMICALLY via RPC
            const { data: salesResults, error: salesError } = await supabase.rpc('process_bulk_sales', {
                sales_data: salesData,
                credit_info: creditInfo || null
            });
            if (salesError) throw salesError;

            return salesResults;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['credits'] });
            queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
            queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
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
            queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
        },
    });
}

// --- Finance & Credits ---

export function useFinanceSummary() {
    return useQuery({
        queryKey: ['finance-summary'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_current_cash_balance');
            if (error) throw error;
            return { balance: data || 0 };
        },
        refetchInterval: 20000,
    });
}

export function useCashFlow() {
    return useQuery({
        queryKey: ['cash-flow'],
        queryFn: async () => {
            const { data, error } = await supabase.from('cash_ledger').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        },
        refetchInterval: 20000,
    });
}

export function useCredits() {
    return useQuery({
        queryKey: ['credits'],
        queryFn: async () => {
            const { data, error } = await supabase.from('credits').select('*').order('due_date', { ascending: true });
            if (error) throw error;
            return data;
        },
        refetchInterval: 20000,
    });
}

export function usePayCredit() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (creditId: string) => {
            const { data: credit, error: fetchError } = await supabase.from('credits').select('*').eq('id', creditId).single();
            if (fetchError) throw fetchError;

            // 1. Mark credit as paid
            const { error: updateError } = await supabase.from('credits').update({ status: 'paid' }).eq('id', creditId);
            if (updateError) throw updateError;

            // 2. Add to cash ledger
            const { error: ledgerError } = await supabase.from('cash_ledger').insert([{
                type: 'credit_payment',
                amount: credit.amount,
                description: `Credit payment from ${credit.customer_name}`,
                reference_id: credit.id
            }]);
            if (ledgerError) throw ledgerError;

            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['credits'] });
            queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
            queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
        },
    });
}

export function useSalespersonNames() {
    return useQuery({
        queryKey: ['salesperson-names'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_salesperson_names');
            if (error) throw error;
            return data as { sp1: string; sp2: string };
        },
        refetchInterval: 60000,
    });
}
