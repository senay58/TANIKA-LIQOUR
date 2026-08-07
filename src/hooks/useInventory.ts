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

export function useSaveCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ name, id }: { name: string; id?: string }) => {
            if (id) {
                const { data, error } = await supabase.from('categories').update({ name }).eq('id', id).select().single();
                if (error) throw new Error(error.message || "Failed to update category");
                return data;
            } else {
                const { data, error } = await supabase.from('categories').insert([{ name }]).select().single();
                if (error) {
                    if (error.code === '23505') {
                        throw new Error(`Category '${name}' already exists.`);
                    }
                    throw new Error(error.message || "Failed to add category");
                }
                return data;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
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

// --- Brands ---
export function useBrands() {
    return useQuery({
        queryKey: ['brands'],
        queryFn: async () => {
            const { data, error } = await supabase.from('brands').select('*').order('name');
            if (error) throw error;
            return data;
        },
    });
}

export function useSaveBrand() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ name, id }: { name: string; id?: string }) => {
            if (id) {
                const { data, error } = await supabase.from('brands').update({ name }).eq('id', id).select().single();
                if (error) throw error;
                return data;
            } else {
                const { data, error } = await supabase.from('brands').insert([{ name }]).select().single();
                if (error) {
                    if (error.code === '23505') throw new Error(`Brand '${name}' already exists.`);
                    throw error;
                }
                return data;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['brands'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
}

export function useDeleteBrand() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('brands').delete().eq('id', id);
            if (error) {
                if (error.code === '23503') throw new Error(`Cannot delete brand. It is assigned to products.`);
                throw error;
            }
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['brands'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
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
          category:categories(name),
          brand_rel:brands(name)
        `)
                .order('name');

            if (error) throw error;

            return data.map((item: any) => ({
                id: item.id,
                name: item.name,
                category: item.category?.name || 'Uncategorized',
                brand: item.brand_rel?.name || 'Unknown',
                brand_id: item.brand_id,
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
        mutationFn: async (productData: Partial<Product> & { id?: string; brand_id?: string }) => {
            let catId = null;
            if (productData.category && productData.category !== 'Uncategorized') {
                const { data: catData } = await supabase
                    .from('categories')
                    .select('id')
                    .eq('name', productData.category)
                    .maybeSingle();

                if (catData) catId = catData.id;
            }
            
            // Allow string-based brand input for backward compatibility or direct creation
            let finalBrandId = productData.brand_id;
            if (!finalBrandId && productData.brand) {
                // Try to find the brand by name, or create it
                const { data: existingBrand } = await supabase.from('brands').select('id').eq('name', productData.brand).maybeSingle();
                if (existingBrand) {
                    finalBrandId = existingBrand.id;
                } else {
                    const { data: newBrand, error: brandErr } = await supabase.from('brands').insert([{ name: productData.brand }]).select().single();
                    if (!brandErr && newBrand) finalBrandId = newBrand.id;
                }
            }

            const payload = {
                name: productData.name,
                category_id: catId,
                brand_id: finalBrandId,
                price_in: Number(productData.priceIn) || 0,
                price_out: Number(productData.priceOut) || 0,
                quantity: Number(productData.quantity) || 0,
                min_stock: Number(productData.minStock) || 0,
                volume: productData.volume || '750ml',
            };

            if (productData.id && !productData.id.startsWith('draft-')) {
                const { data, error } = await supabase.from('products').update(payload).eq('id', productData.id).select().single();
                if (error) throw new Error(error.message);
                return data;
            } else {
                const { data, error } = await supabase.from('products').insert([payload]).select().single();
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

// --- Stock Entries ---
export function useSaveStockEntry() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ product_id, product_name, quantity, price_in }: { product_id: string; product_name: string; quantity: number; price_in: number }) => {
            // 1. Insert stock entry (triggers DB function to update quantity & cash ledger)
            const { data, error } = await supabase.from('stock_entries').insert([{
                product_id,
                quantity_added: quantity,
                price_in: price_in
            }]).select().single();
            
            if (error) throw new Error(error.message);

            // 2. Patch the cash_ledger description to include the real product name
            //    The DB trigger writes the description first, then we overwrite it with a friendly name.
            const friendlyDesc = `Restock: ${product_name} — ${quantity} units @ ETB ${price_in}`;
            await supabase
                .from('cash_ledger')
                .update({ description: friendlyDesc })
                .eq('reference_id', data.id)
                .eq('type', 'restock');

            // 3. Keep the baseline price_in on the product up to date
            await supabase.from('products').update({ price_in: price_in }).eq('id', product_id);
            
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
            queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
            queryClient.invalidateQueries({ queryKey: ['stock-entries'] });
        },
    });
}

export function useStockEntries(productId: string | null) {
    return useQuery({
        queryKey: ['stock-entries', productId],
        enabled: !!productId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stock_entries')
                .select('*')
                .eq('product_id', productId!)
                .order('created_at', { ascending: false })
                .limit(3);
            if (error) throw error;
            return data;
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
          product:products(
            name,
            volume,
            brand_rel:brands(name)
          )
        `)
                .order('sale_date', { ascending: false });
            if (error) throw error;
            
            return data.map((item: any) => ({
                ...item,
                product: item.product ? {
                    name: item.product.name,
                    volume: item.product.volume,
                    brand: item.product.brand_rel?.name || 'Unknown',
                } : null
            }));
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

export function useInjectCash() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ amount, description, passcode }: { amount: number; description: string; passcode: string }) => {
            const { data, error } = await supabase.rpc('inject_cash', {
                p_amount: amount,
                p_description: description,
                p_passcode: passcode
            });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
            queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
        },
    });
}
