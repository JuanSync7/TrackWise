
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { TripContribution } from '@/lib/types';

// Form values do not include ids or tripId/tripMemberId as these are contextual
const tripContributionFormSchema = z.object({
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  date: z.date({ required_error: "A date is required." }),
  notes: z.string().max(200).optional(),
});

export type TripContributionFormValues = Omit<TripContribution, 'id' | 'tripId' | 'tripMemberId'>;

interface TripContributionFormProps {
  onSave: (data: TripContributionFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  tripMemberName?: string; // To display whose contribution it is
}

export function TripContributionForm({ onSave, onCancel, isSubmitting, tripMemberName }: TripContributionFormProps) {
  const form = useForm<TripContributionFormValues>({
    resolver: zodResolver(tripContributionFormSchema),
    defaultValues: {
      amount: 0,
      date: new Date(),
      notes: "",
    },
  });

  function onSubmit(data: TripContributionFormValues) {
    onSave(data);
    form.reset({ amount: 0, date: new Date(), notes: "" });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {tripMemberName && <p className="text-sm text-muted-foreground">Adding contribution for trip member: <span className="font-semibold">{tripMemberName}</span></p>}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contribution Amount</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Contribution</FormLabel>
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
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
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
                <Textarea placeholder="e.g., For shared flights, Initial contribution" {...field} />
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
            {isSubmitting ? "Saving..." : "Save Trip Contribution"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
