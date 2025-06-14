
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SharedBudget } from '@/lib/types';

const sharedBudgetFormSchema = z.object({
  name: z.string().min(2, { message: "Budget name must be at least 2 characters." }).max(50),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  period: z.enum(['monthly', 'yearly', 'weekly'], { required_error: "Please select a period." }),
  description: z.string().max(200).optional(),
});

type SharedBudgetFormValues = Omit<SharedBudget, 'id' | 'createdAt'>;

interface SharedBudgetFormProps {
  sharedBudget?: SharedBudget; // For editing, not implemented in this version
  onSave: (data: SharedBudgetFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function SharedBudgetForm({ sharedBudget, onSave, onCancel, isSubmitting }: SharedBudgetFormProps) {
  const form = useForm<SharedBudgetFormValues>({
    resolver: zodResolver(sharedBudgetFormSchema),
    defaultValues: sharedBudget 
      ? { ...sharedBudget }
      : { name: "", amount: 0, period: "monthly", description: "" },
  });

  function onSubmit(data: SharedBudgetFormValues) {
    onSave(data);
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Budget Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Monthly Groceries, Utilities" {...field} />
              </FormControl>
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
                <Input type="number" placeholder="0.00" {...field} />
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., For all household food items" {...field} />
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
            {isSubmitting ? (sharedBudget ? "Saving..." : "Creating...") : (sharedBudget ? "Save Changes" : "Create Shared Budget")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
