
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ShoppingListItem } from '@/lib/types';

const shoppingListItemFormSchema = z.object({
  itemName: z.string().min(1, { message: "Item name cannot be empty." }).max(100),
  quantity: z.string().max(50).optional().default("1"), // Default quantity to "1" if not provided
  notes: z.string().max(200).optional(),
});

type ShoppingListItemFormValues = Omit<ShoppingListItem, 'id' | 'isPurchased' | 'addedAt'>;

interface ShoppingListItemFormProps {
  item?: ShoppingListItem; // For editing
  onSave: (data: ShoppingListItemFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function ShoppingListItemForm({ item, onSave, onCancel, isSubmitting }: ShoppingListItemFormProps) {
  const form = useForm<ShoppingListItemFormValues>({
    resolver: zodResolver(shoppingListItemFormSchema),
    defaultValues: item
      ? { itemName: item.itemName, quantity: item.quantity, notes: item.notes || "" }
      : { itemName: "", quantity: "1", notes: "" },
  });

  function onSubmit(data: ShoppingListItemFormValues) {
    onSave(data);
    if (!item) { // Reset only if it's a new item form
      form.reset({ itemName: "", quantity: "1", notes: "" });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="itemName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Milk, Bread, Apples" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 1 gallon, 2 loaves, 500g" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Low-fat, Whole wheat, Organic" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (item ? "Saving..." : "Adding...") : (item ? "Save Changes" : "Add Item")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
