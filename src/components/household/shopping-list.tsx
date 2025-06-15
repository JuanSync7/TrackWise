
"use client";

import type { ShoppingListItem as ShoppingListItemType } from '@/lib/types';
import { ShoppingListItem } from './shopping-list-item';
import { AnimatePresence, motion } from 'framer-motion';
import { ClipboardList } from 'lucide-react';

interface ShoppingListProps {
  items: ShoppingListItemType[];
  onEditItem: (item: ShoppingListItemType) => void;
  onDeleteItem: (itemId: string) => void;
  onTogglePurchased: (itemId: string) => void;
}

export function ShoppingList({ items, onEditItem, onDeleteItem, onTogglePurchased }: ShoppingListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg mt-6">
        <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2 text-muted-foreground">Shopping List is Empty</h3>
        <p className="text-muted-foreground">Add items your household needs to purchase.</p>
         
      </div>
    );
  }

  const sortedItems = [...items].sort((a, b) => {
    if (a.isPurchased === b.isPurchased) {
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(); // Sort by newest if same purchase status
    }
    return a.isPurchased ? 1 : -1; // Unpurchased items first
  });

  return (
    <div className="space-y-3 mt-6">
      <AnimatePresence initial={false}>
        {sortedItems.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <ShoppingListItem
              item={item}
              onEdit={onEditItem}
              onDelete={onDeleteItem}
              onTogglePurchased={onTogglePurchased}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

