
"use client";

import { useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, CopyCheck, MilkIcon, EggIcon, SandwichIcon, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/contexts/app-context';
import { useToast } from "@/hooks/use-toast";
import type { ShoppingListItem } from '@/lib/types';
import { ShoppingListItemForm } from '@/components/household/shopping-list-item-form';
import { ShoppingList } from '@/components/household/shopping-list';

export default function ShoppingListPage() {
  const { shoppingListItems, addShoppingListItem, editShoppingListItem, deleteShoppingListItem: contextDeleteShoppingListItem, toggleShoppingListItemPurchased, copyLastWeeksPurchasedItems } = useAppContext();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingListItem | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const commonItems = [
    { name: "Milk", icon: MilkIcon, defaultQuantity: "1", notes: "e.g., 1 gallon, Whole" },
    { name: "Eggs", icon: EggIcon, defaultQuantity: "12", notes: "e.g., Dozen, Large" },
    { name: "Bread", icon: SandwichIcon, defaultQuantity: "1", notes: "e.g., 1 loaf, Wheat" },
  ];

  const handleAddCommonItem = (itemName: string, quantity: string, itemNotes?: string) => {
      addShoppingListItem({ itemName, quantity, notes: itemNotes });
      toast({ title: `${itemName} Added`, description: "Item added to your shopping list." });
  };

  const handleSaveItem = async (data: Omit<ShoppingListItem, 'id' | 'isPurchased' | 'addedAt'>) => {
    setIsSubmitting(true);
    try {
      if (editingItem) {
        editShoppingListItem({ ...editingItem, ...data });
        toast({ title: "Item Updated", description: "The shopping list item has been successfully updated." });
      } else {
        addShoppingListItem(data);
        toast({ title: "Item Added", description: "New item added to the shopping list." });
      }
      setIsFormOpen(false);
      setEditingItem(undefined);
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save shopping list item. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditItem = (item: ShoppingListItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleDeleteItem = (itemId: string) => {
    setItemToDelete(itemId);
  };

  const confirmDeleteItem = () => {
    if (itemToDelete) {
      contextDeleteShoppingListItem(itemToDelete);
      toast({ title: "Item Deleted", description: "The shopping list item has been successfully deleted." });
      setItemToDelete(null);
    }
  };

  const handleTogglePurchased = (itemId: string) => {
    toggleShoppingListItemPurchased(itemId);
    const item = shoppingListItems.find(i => i.id === itemId);
    if (item) {
        toast({ title: "Status Updated", description: `${item.itemName} marked as ${!item.isPurchased ? "purchased" : "not purchased"}.` });
    }
  };

  const openFormForNew = () => {
    setEditingItem(undefined);
    setIsFormOpen(true);
  };

  const handleCopyItems = () => {
    const count = copyLastWeeksPurchasedItems();
    if (count > 0) {
      toast({ title: "Items Copied", description: `${count} item(s) from recent purchases were added to your list.` });
    } else {
      toast({ title: "No Items to Copy", description: "No recently purchased items found to copy to the list." });
    }
  };

  return (
    <div className="container mx-auto">
      <PageHeader
        title="Household Shopping List"
        description="Manage items your household needs to buy together."
        actions={
          <div className="flex gap-2">
            <Button onClick={handleCopyItems} variant="outline">
              <CopyCheck className="mr-2 h-4 w-4" /> Add Recent Purchases
            </Button>
            <Button onClick={openFormForNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
            </Button>
          </div>
        }
      />

      <Card className="mb-6 shadow-sm">
        <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Quick Add Common Items
            </CardTitle>
            <CardDescription>Add frequently bought items to your list with one click.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
            {commonItems.map(commonItem => (
                <Button 
                    key={commonItem.name} 
                    variant="outline" 
                    onClick={() => handleAddCommonItem(commonItem.name, commonItem.defaultQuantity, commonItem.notes)}
                    className="flex items-center gap-2 py-2 px-3 h-auto"
                >
                    <commonItem.icon className="h-5 w-5" />
                    {commonItem.name}
                </Button>
            ))}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
        if (!isOpen) setEditingItem(undefined);
        setIsFormOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-[425px] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item to Shopping List'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the details of the shopping list item.' : 'Fill in the details for the new item.'}
            </DialogDescription>
          </DialogHeader>
          <ShoppingListItemForm
            item={editingItem}
            onSave={handleSaveItem}
            onCancel={() => { setIsFormOpen(false); setEditingItem(undefined); }}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected shopping list item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteItem} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ShoppingList
        items={shoppingListItems}
        onEditItem={handleEditItem}
        onDeleteItem={handleDeleteItem}
        onTogglePurchased={handleTogglePurchased}
      />
    </div>
  );
}
