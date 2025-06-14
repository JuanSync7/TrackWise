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
import { CalendarIcon, Check, ChevronsUpDown, Sparkles as AiSparklesIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { Expense } from "@/lib/types";
import { useAppContext } from "@/contexts/app-context";
import { format } from "date-fns";
import { useEffect, useState, useCallback }  from "react";
import { suggestExpenseCategory, type SuggestExpenseCategoryInput, type SuggestExpenseCategoryOutput } from "@/ai/flows/suggest-expense-category";
import { useToast } from "@/hooks/use-toast";
import { CategoryIcon } from "@/components/shared/category-icon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const expenseFormSchema = z.object({
  description: z.string().min(2, { message: "Description must be at least 2 characters." }).max(100),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  date: z.date({ required_error: "A date is required." }),
  categoryId: z.string({ required_error: "Please select a category." }),
  notes: z.string().max(200).optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  expense?: Expense;
  onSave: (data: ExpenseFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function ExpenseForm({ expense, onSave, onCancel, isSubmitting }: ExpenseFormProps) {
  const { categories, getCategoryById } = useAppContext();
  const { toast } = useToast();
  const [aiSuggestion, setAiSuggestion] = useState<SuggestExpenseCategoryOutput | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: expense
      ? { ...expense, date: new Date(expense.date) }
      : { description: "", amount: 0, date: new Date(), categoryId: "", notes: "" },
  });

  const watchedDescription = form.watch("description");

  const handleSuggestCategory = useCallback(async () => {
    if (!watchedDescription || watchedDescription.length < 3) return;
    setIsSuggesting(true);
    setAiSuggestion(null);
    try {
      const input: SuggestExpenseCategoryInput = {
        description: watchedDescription,
        availableCategories: categories.map(c => c.name),
      };
      const suggestion = await suggestExpenseCategory(input);
      setAiSuggestion(suggestion);
      const suggestedCat = categories.find(c => c.name.toLowerCase() === suggestion.category.toLowerCase());
      if (suggestedCat) {
         form.setValue("categoryId", suggestedCat.id, { shouldValidate: true });
      }
    } catch (error) {
      console.error("Error suggesting category:", error);
      toast({ variant: "destructive", title: "AI Suggestion Failed", description: "Could not get category suggestion." });
    } finally {
      setIsSuggesting(false);
    }
  }, [watchedDescription, categories, toast, form]);
  
  // Debounce AI suggestion
  useEffect(() => {
    const timer = setTimeout(() => {
      if (watchedDescription && watchedDescription.length >= 5 && !form.getValues("categoryId")) { // Only suggest if category is not set
        handleSuggestCategory();
      }
    }, 1000); // Suggest after 1s of inactivity
    return () => clearTimeout(timer);
  }, [watchedDescription, handleSuggestCategory, form]);


  function onSubmit(data: ExpenseFormValues) {
    onSave(data);
    form.reset();
    setAiSuggestion(null);
  }
  
  const selectedCategory = getCategoryById(form.watch("categoryId"));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Coffee with colleagues" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
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
                <FormLabel>Date</FormLabel>
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
        </div>
        
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Category</FormLabel>
              <Popover>
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
                              form.setValue("categoryId", category.id);
                              setAiSuggestion(null); // Clear AI suggestion when manually selecting
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

        {isSuggesting && (
          <div className="flex items-center text-sm text-muted-foreground">
            <AiSparklesIcon className="mr-2 h-4 w-4 animate-spin" />
            Getting AI category suggestion...
          </div>
        )}

        {aiSuggestion && !form.getValues("categoryId") && (
          <Alert variant="default" className="bg-primary/10 border-primary/30">
            <AiSparklesIcon className="h-5 w-5 text-primary" />
            <AlertTitle className="text-primary font-semibold">AI Suggestion</AlertTitle>
            <AlertDescription className="text-primary/80">
              We think this might be <span className="font-semibold">{aiSuggestion.category}</span>.
              <br />
              <span className="text-xs italic">Reasoning: {aiSuggestion.reasoning}</span>
            </AlertDescription>
            <Button 
              type="button" 
              size="sm" 
              variant="ghost"
              className="mt-2 text-primary hover:bg-primary/20"
              onClick={() => {
                const suggestedCat = categories.find(c => c.name.toLowerCase() === aiSuggestion.category.toLowerCase());
                if (suggestedCat) {
                  form.setValue("categoryId", suggestedCat.id, { shouldValidate: true });
                  setAiSuggestion(null); // Clear after applying
                } else {
                  toast({variant: "destructive", title: "Category not found", description: `AI suggested "${aiSuggestion.category}" which is not an available category.`})
                }
              }}
            >
              Apply Suggestion
            </Button>
          </Alert>
        )}


        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Add any relevant notes..." {...field} />
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
            {isSubmitting ? (expense ? "Saving..." : "Adding...") : (expense ? "Save Changes" : "Add Expense")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
