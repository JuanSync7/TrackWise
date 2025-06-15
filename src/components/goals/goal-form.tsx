
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { FinancialGoal } from '@/lib/types';
import { format, parseISO } from "date-fns";
import { useEffect } from "react";

const goalFormSchema = z.object({
  name: z.string().min(2, { message: "Goal name must be at least 2 characters." }).max(100),
  targetAmount: z.coerce.number().positive({ message: "Target amount must be positive." }),
  deadlineDate: z.date().optional(),
  notes: z.string().max(300).optional(),
});

export type GoalFormValues = Omit<FinancialGoal, 'id' | 'createdAt' | 'currentAmount'>;

interface GoalFormProps {
  goal?: FinancialGoal;
  onSave: (data: GoalFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function GoalForm({ goal, onSave, onCancel, isSubmitting }: GoalFormProps) {
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
  });

  useEffect(() => {
    if (goal) {
      form.reset({
        name: goal.name,
        targetAmount: goal.targetAmount,
        deadlineDate: goal.deadlineDate ? parseISO(goal.deadlineDate) : undefined,
        notes: goal.notes || "",
      });
    } else {
      form.reset({
        name: "",
        targetAmount: 0,
        deadlineDate: undefined,
        notes: "",
      });
    }
  }, [goal, form]);

  function onSubmit(values: GoalFormValues) {
    const dataToSave = {
        ...values,
        deadlineDate: values.deadlineDate ? format(values.deadlineDate, "yyyy-MM-dd") : undefined,
    };
    onSave(dataToSave);
    if (!goal) {
        form.reset({ name: "", targetAmount: 0, deadlineDate: undefined, notes: "" });
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
              <FormLabel>Goal Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Vacation Fund, Emergency Savings" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="targetAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Amount</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0.00" {...field} step="0.01" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="deadlineDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Deadline (Optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
                <Textarea placeholder="Add any relevant notes or details about this goal..." {...field} />
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
            {isSubmitting ? (goal ? "Saving..." : "Adding...") : (goal ? "Save Changes" : "Set Goal")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
