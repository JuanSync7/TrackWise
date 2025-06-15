
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
import type { TripMember } from '@/lib/types';

const tripMemberFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50, { message: "Name cannot exceed 50 characters." }),
});

// Values for the form, not including ids
export type TripMemberFormValues = Omit<TripMember, 'id' | 'tripId'>;

interface TripMemberFormProps {
  onSave: (data: TripMemberFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function TripMemberForm({ onSave, onCancel, isSubmitting }: TripMemberFormProps) {
  const form = useForm<TripMemberFormValues>({
    resolver: zodResolver(tripMemberFormSchema),
    defaultValues: { name: "" },
  });

  function onSubmit(data: TripMemberFormValues) {
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
              <FormLabel>Member Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Alex, Jamie" {...field} />
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
            {isSubmitting ? "Adding..." : "Add Trip Member"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
