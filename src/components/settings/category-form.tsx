
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Category } from '@/lib/types';
import { availableIconNames, getIconComponent } from '@/lib/icon-map';
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Palette, TrendingDown, TrendingUp, CheckCircle } from "lucide-react"; // Added icons for radio group

const categoryFormSchema = z.object({
  name: z.string().min(2, { message: "Category name must be at least 2 characters." }).max(50),
  iconName: z.string({ required_error: "Please select an icon." }),
  color: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i, { message: "Must be a valid hex color (e.g., #RRGGBB or #RGB)." }),
  appliesTo: z.enum(['expense', 'income', 'both'], { required_error: "Please select transaction type applicability." }),
});

export type CategoryFormValues = Omit<Category, 'id'>;

interface CategoryFormProps {
  category?: Category;
  onSave: (data: CategoryFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function CategoryForm({ category, onSave, onCancel, isSubmitting }: CategoryFormProps) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: category || {
      name: "",
      iconName: availableIconNames[0] || "Archive",
      color: "#CCCCCC",
      appliesTo: "expense",
    },
  });

  useEffect(() => {
    if (category) {
      form.reset(category);
    } else {
      form.reset({
        name: "",
        iconName: availableIconNames[0] || "Archive",
        color: "#CCCCCC",
        appliesTo: "expense",
      });
    }
  }, [category, form]);

  const onSubmit = (data: CategoryFormValues) => {
    onSave(data);
    if (!category) {
        form.reset({ name: "", iconName: availableIconNames[0] || "Archive", color: "#CCCCCC", appliesTo: "expense"});
    }
  };

  const SelectedIcon = getIconComponent(form.watch("iconName"));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Groceries, Salary" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
            control={form.control}
            name="iconName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Icon</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <div className="flex items-center gap-2">
                            <SelectedIcon className="h-4 w-4" />
                            <SelectValue placeholder="Select an icon" />
                        </div>
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {availableIconNames.map((iconName) => {
                        const IconComponent = getIconComponent(iconName);
                        return (
                        <SelectItem key={iconName} value={iconName}>
                            <div className="flex items-center gap-2">
                                <IconComponent className="h-4 w-4" />
                                {iconName}
                            </div>
                        </SelectItem>
                        );
                    })}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />

            <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Color</FormLabel>
                <div className="flex items-center gap-2">
                    <FormControl>
                        <Input type="text" placeholder="#RRGGBB" {...field} className="flex-grow" />
                    </FormControl>
                    <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: field.value || "#CCCCCC" }} />
                </div>
                <FormDescription className="text-xs">Enter a hex color code.</FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>


        <FormField
          control={form.control}
          name="appliesTo"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Applies To Transaction Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0"
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="expense" />
                    </FormControl>
                    <FormLabel className="font-normal flex items-center gap-1 cursor-pointer"><TrendingDown className="h-4 w-4 text-destructive"/>Expense</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="income" />
                    </FormControl>
                    <FormLabel className="font-normal flex items-center gap-1 cursor-pointer"><TrendingUp className="h-4 w-4 text-accent"/>Income</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="both" />
                    </FormControl>
                    <FormLabel className="font-normal flex items-center gap-1 cursor-pointer"><CheckCircle className="h-4 w-4 text-primary"/>Both</FormLabel>
                  </FormItem>
                </RadioGroup>
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
            {isSubmitting ? (category ? "Saving..." : "Adding...") : (category ? "Save Changes" : "Add Category")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
