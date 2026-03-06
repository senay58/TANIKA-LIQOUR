import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddCategory } from "@/hooks/useInventory";
import { toast } from "sonner";

interface AddCategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddCategoryDialog({ open, onOpenChange }: AddCategoryDialogProps) {
    const [name, setName] = useState("");
    const [emoji, setEmoji] = useState("");
    const addCategoryMutation = useAddCategory();

    const handleAdd = async () => {
        if (!name.trim()) {
            toast.error("Category name is required");
            return;
        }

        try {
            await addCategoryMutation.mutateAsync({ name, emoji: emoji || "🏷️" });
            toast.success(`Category '${name}' added`);
            onOpenChange(false);
            setName("");
            setEmoji("");
        } catch (error) {
            console.error(error);
            toast.error("Failed to add category");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Category</DialogTitle>
                    <DialogDescription>
                        Create a custom product category for inventory.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Category Name <span className="text-destructive">*</span></Label>
                        <Input
                            id="name"
                            placeholder="E.g., Seltzer"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="emoji">Emoji Icon (Optional)</Label>
                        <Input
                            id="emoji"
                            placeholder="E.g., 🥤"
                            value={emoji}
                            onChange={e => setEmoji(e.target.value)}
                            className="text-2xl h-12"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleAdd} disabled={addCategoryMutation.isPending || !name.trim()}>
                        {addCategoryMutation.isPending ? "Adding..." : "Add Category"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
