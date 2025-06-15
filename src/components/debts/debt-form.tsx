
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
import { Textarea } from "@/components/ui/textarea";
import type { PersonalDebt } from '@/lib/types';
import { useEffect } from "react";

const debtFormSchema = z.object({
  name: z.string().min(2, { message: "Debt name must be at least 2 characters." }).max(100),
  lender: z.string().max(100).optional(),
  initialAmount: z.coerce.number().positive({ message: "Initial amount must be positive." }),
  interestRate: z.coerce.number().min(0, "Interest rate cannot be negative.").optional(),
  minimumPayment: z.coerce.number().min(0, "Minimum payment cannot be negative.").optional(),
  dueDate: z.string().max(50).optional(), // e.g., "15th of month", or a specific date for one-offs
  notes: z.string().max(300).optional(),
});

export type DebtFormValues = Omit<PersonalDebt, 'id' | 'createdAt' | 'currentBalance'>;

interface DebtFormProps {
  debt?: PersonalDebt;
  onSave: (data: DebtFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function DebtForm({ debt, onSave, onCancel, isSubmitting }: DebtFormProps) {
  const form = useForm<DebtFormValues>({
    resolver: zodResolver(debtFormSchema),
    defaultValues: { // Initialize all fields, especially optional numeric ones, to prevent uncontrolled -> controlled switch
      name: "",
      lender: "",
      initialAmount: 0,
      interestRate: "" as any, // Start as empty string; Zod will coerce. `as any` to satisfy TS with Zod coercion.
      minimumPayment: "" as any, // Start as empty string
      dueDate: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (debt) {
      form.reset({
        name: debt.name,
        lender: debt.lender || "",
        initialAmount: debt.initialAmount,
        // Ensure string for form, coercion will handle it for RHF.
        // If debt.interestRate is a number, convert to string for reset, or use ""
        interestRate: debt.interestRate === undefined || debt.interestRate === null ? "" : String(debt.interestRate),
        minimumPayment: debt.minimumPayment === undefined || debt.minimumPayment === null ? "" : String(debt.minimumPayment),
        dueDate: debt.dueDate || "",
        notes: debt.notes || "",
      });
    } else {
      // For a new form, ensure optional numeric fields are reset to empty strings
      // This is also covered by defaultValues now, but good for explicit reset.
      form.reset({
        name: "",
        lender: "",
        initialAmount: 0,
        interestRate: "",
        minimumPayment: "",
        dueDate: "",
        notes: "",
      });
    }
  }, [debt, form]);

  function onSubmit(values: z.infer<typeof debtFormSchema>) { // Use inferred type from schema for values
    // Zod has already coerced interestRate and minimumPayment to numbers if they were strings
    onSave(values as DebtFormValues);
    if (!debt) {
        form.reset({ name: "", lender: "", initialAmount: 0, interestRate: "", minimumPayment: "", dueDate: "", notes: "" });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Debt Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Car Loan, Student Loan" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="initialAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Initial Amount</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0.00" {...field} step="0.01" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lender (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Bank of America, Sallie Mae" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
            control={form.control}
            name="interestRate"
            render={({ field }) => ( // field.value will be a number (e.g. 0 if "" was passed and coerced)
                <FormItem>
                <FormLabel>Interest Rate (APR %)</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="e.g., 5.25" {...field} step="0.01" />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="minimumPayment"
            render={({ field }) => ( // field.value will be a number
                <FormItem>
                <FormLabel>Minimum Payment (Optional)</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="e.g., 150.00" {...field} step="0.01" />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>


        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due Date / Cycle (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 15th of month, March 30, 2025" {...field} value={field.value || ""} />
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
                <Textarea placeholder="Add any relevant notes or account numbers..." {...field} value={field.value || ""} />
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
            {isSubmitting ? (debt ? "Saving..." : "Adding...") : (debt ? "Save Changes" : "Add Debt")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
