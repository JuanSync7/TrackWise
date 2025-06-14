
"use client";

import type { ShoppingListItem as ShoppingListItemType } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit3, Trash2, ShoppingBag, MinusCircle, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { useAppContext } from '@/contexts/app-context'; // Added for direct context access

interface ShoppingListItemProps {
  item: ShoppingListItemType;
  onEdit: (item: ShoppingListItemType) => void; // For opening edit form
  onDelete: (itemId: string) => void;
  onTogglePurchased: (itemId: string) => void;
}

export function ShoppingListItem({ item, onEdit, onDelete, onTogglePurchased }: ShoppingListItemProps) {
  const { editShoppingListItem } = useAppContext(); // Get context function
  const timeAgo = formatDistanceToNowStrict(new Date(item.addedAt), { addSuffix: true });

  const isNumericQuantity = /^\d+$/.test(item.quantity);

  const handleQuantityChange = (increment: boolean) => {
    if (!isNumericQuantity) return;
    const currentVal = parseInt(item.quantity, 10);
    const newVal = increment ? currentVal + 1 : Math.max(1, currentVal - 1); // Ensure quantity doesn't go below 1
    
    // Directly call context function to update item quantity
    editShoppingListItem({
      id: item.id,
      itemName: item.itemName,
      quantity: String(newVal),
      notes: item.notes,
    });
  };

  return (
    <Card className={cn("overflow-hidden transition-shadow hover:shadow-md", item.isPurchased && "bg-muted/50 opacity-70")}>
      <CardContent className="p-4 flex items-center justify-between gap-2">
        {/* Checkbox and Item Name/Notes/Timestamp */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Checkbox
            id={`item-${item.id}`}
            checked={item.isPurchased}
            onCheckedChange={() => onTogglePurchased(item.id)}
            aria-label={`Mark ${item.itemName} as ${item.isPurchased ? 'not purchased' : 'purchased'}`}
          />
          <div className="flex-1 min-w-0">
            <label 
              htmlFor={`item-${item.id}`} 
              className={cn(
                "font-medium cursor-pointer",
                item.isPurchased && "line-through text-muted-foreground"
              )}
            >
              {item.itemName}
            </label>
            {item.notes && <p className="text-xs text-muted-foreground italic truncate" title={item.notes}>{item.notes}</p>}
            <p className="text-xs text-muted-foreground mt-0.5">Added {timeAgo}</p>
          </div>
        </div>

        {/* Quantity Controls OR Static Quantity Display - positioned before ShoppingBag/Menu */}
        <div className="flex items-center"> {/* Wrapper for quantity and action icons */}
            {/* Quantity Controls */}
            {!item.isPurchased && isNumericQuantity && (
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleQuantityChange(false)} disabled={parseInt(item.quantity, 10) <= 1}>
                        <MinusCircle className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium w-6 text-center tabular-nums">{item.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleQuantityChange(true)}>
                        <PlusCircle className="h-4 w-4" />
                    </Button>
                </div>
            )}
            {/* Static Quantity Display (if not numeric or purchased) */}
            {((!isNumericQuantity && item.quantity) || (item.isPurchased && item.quantity)) && (
                 <div className="px-2">
                    <span className={cn("text-sm", item.isPurchased ? "text-muted-foreground" : "text-foreground")}>Qty: {item.quantity}</span>
                </div>
            )}

            {/* Shopping Bag and Options Menu */}
            <ShoppingBag className={cn("h-5 w-5 ml-2", item.isPurchased ? "text-green-500" : "text-primary/70")} />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Item options</span>
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(item)} disabled={item.isPurchased}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(item.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
