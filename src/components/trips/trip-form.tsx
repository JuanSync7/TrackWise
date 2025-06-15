
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
import type { Trip } from '@/lib/types';
import { useEffect } from "react";

const tripFormSchema = z.object({
  name: z.string().min(2, { message: "Trip name must be at least 2 characters." }).max(100, { message: "Trip name cannot exceed 100 characters." }),
  description: z.string().max(300, { message: "Description cannot exceed 300 characters." }).optional(),
});

export type TripFormValues = Omit<Trip, 'id' | 'createdAt'>;

interface TripFormProps {
  trip?: Trip; // For editing
  onSave: (data: TripFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function TripForm({ trip, onSave, onCancel, isSubmitting }: TripFormProps) {
  const form = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: trip ? { name: trip.name, description: trip.description || "" } : { name: "", description: "" },
  });

  useEffect(() => {
    if (trip) {
      form.reset({ name: trip.name, description: trip.description || "" });
    } else {
      form.reset({ name: "", description: "" });
    }
  }, [trip, form]);

  function onSubmit(data: TripFormValues) {
    onSave(data);
    if (!trip) { 
      form.reset({ name: "", description: "" });
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
              <FormLabel>Trip Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Summer Vacation, Ski Trip 2024" {...field} />
              </FormControl>
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
                <Textarea placeholder="Add a brief description for your trip..." {...field} />
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
            {isSubmitting ? (trip ? "Saving..." : "Creating...") : (trip ? "Save Changes" : "Create Trip")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
