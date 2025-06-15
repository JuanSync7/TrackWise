
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { BudgetGoal } from '@/lib/types';
import { useAppContext } from '@/contexts/app-context';
import { CategoryIcon } from '@/components/shared/category-icon';
import { useState, useEffect } from "react";

const budgetFormSchema = z.object({
  categoryId: z.string({ required_error: "Please select a category." }),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  period: z.enum(['monthly', 'yearly', 'weekly'], { required_error: "Please select a period." }),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

interface BudgetFormProps {
  budgetGoal?: BudgetGoal; 
  onSave: (data: Omit<BudgetGoal, 'id' | 'currentSpending'>) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function BudgetForm({ budgetGoal, onSave, onCancel, isSubmitting }: BudgetFormProps) {
  const { categories, getCategoryById } = useAppContext();
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    // defaultValues are set in useEffect to handle dynamic budgetGoal prop
  });

  useEffect(() => {
    if (budgetGoal) {
      form.reset({
        categoryId: budgetGoal.categoryId,
        amount: budgetGoal.amount,
        period: budgetGoal.period,
      });
    } else {
      form.reset({
        categoryId: "",
        amount: 0,
        period: "monthly",
      });
    }
  }, [budgetGoal, form]);


  function onSubmit(data: BudgetFormValues) {
    onSave(data);
    if (!budgetGoal) { // Reset only if it's a new item form
        form.reset({ categoryId: "", amount: 0, period: "monthly" });
    }
  }

  const selectedCategory = getCategoryById(form.watch("categoryId"));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Category</FormLabel>
              <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                       {selectedCategory ? (
                        <div className="flex items-center gap-2">
                          <CategoryIcon category={selectedCategory} size="sm" />
                          {selectedCategory.name}
                        </div>
                      ) : "Select category"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search category..." />
                    <CommandList>
                    <CommandEmpty>No category found.</CommandEmpty>
                    <CommandGroup>
                      {categories.map((category) => (
                        <CommandItem
                          value={category.name}
                          key={category.id}
                          onSelect={() => {
                            form.setValue("categoryId", category.id, { shouldValidate: true });
                            setCategoryPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              category.id === field.value
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                           <div className="flex items-center gap-2">
                            <CategoryIcon category={category} size="sm" />
                            {category.name}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Budget Amount</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0.00" {...field} step="0.01" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="period"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Period</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || "monthly"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a budget period" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
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
            {isSubmitting ? (budgetGoal ? "Saving..." : "Adding...") : (budgetGoal ? "Save Changes" : "Set Budget")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

