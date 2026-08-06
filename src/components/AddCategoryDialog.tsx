import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSaveCategory, useCategories, useDeleteCategory } from "@/hooks/useInventory";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

interface AddCategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddCategoryDialog({ open, onOpenChange }: AddCategoryDialogProps) {
    const [name, setName] = useState("");
    const { data: categories = [] } = useCategories();
    const saveCategoryMutation = useSaveCategory();
    const deleteCategoryMutation = useDeleteCategory();

    const handleAdd = async () => {
        if (!name.trim()) {
            toast.error("Category name is required");
            return;
        }

        try {
            await saveCategoryMutation.mutateAsync({ name });
            toast.success(`Category '${name}' added`);
            setName("");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to add category");
        }
    };

    const handleDelete = async (cat: any) => {
        if (!confirm(`Are you sure you want to delete '${cat.name}'?`)) return;

        try {
            if (!cat.id) throw new Error("Category ID is missing");
            await deleteCategoryMutation.mutateAsync(cat.id);
            toast.success(`Category '${cat.name}' removed`);
        } catch (error: any) {
            console.error("Delete error:", error);
            toast.error(error.message || "Failed to delete category. It might be in use.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Manage Categories</DialogTitle>
                    <DialogDescription>
                        Add or remove product categories for your inventory.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Add New Section */}
                    <div className="space-y-4 p-4 border rounded-lg bg-secondary/20">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Add New
                        </h4>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Category Name <span className="text-destructive">*</span></Label>
                                <Input
                                    id="name"
                                    placeholder="E.g., Seltzer"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleAdd} disabled={saveCategoryMutation.isPending || !name.trim()} className="w-full">
                                {saveCategoryMutation.isPending ? "Adding..." : "Add Category"}
                            </Button>
                        </div>
                    </div>

                    {/* List Section */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold">Existing Categories</h4>
                        <div className="grid gap-2">
                            {categories.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4">No categories found.</p>
                            ) : (
                                categories.map((cat: any) => (
                                    <div key={cat.id} className="flex items-center justify-between p-2 border rounded-md bg-card">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{cat.name}</span>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(cat);
                                            }}
                                            disabled={deleteCategoryMutation.isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
