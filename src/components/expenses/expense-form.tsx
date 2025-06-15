
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
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
import { CalendarIcon, Check, ChevronsUpDown, Sparkles as AiSparklesIcon, Users, Landmark, CheckSquare, Square, MessageSquarePlus, Edit, CircleDollarSign } from "lucide-react"; // Added CircleDollarSign
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Expense, SharedBudget, Member, TripMember } from "@/lib/types";
import { useAppContext } from "@/contexts/app-context";
import { format } from "date-fns";
import { useEffect, useState, useCallback, useMemo }  from "react";
import { suggestExpenseCategory, type SuggestExpenseCategoryInput, type SuggestExpenseCategoryOutput } from "@/ai/flows/suggest-expense-category";
import { suggestExpenseNotes, type SuggestExpenseNotesInput, type SuggestExpenseNotesOutput } from "@/ai/flows/suggest-expense-notes";
import { useToast } from "@/hooks/use-toast";
import { CategoryIcon } from '@/components/shared/category-icon';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { POT_PAYER_ID } from "@/lib/constants"; // Import POT_PAYER_ID

const expenseFormSchemaBase = z.object({
  description: z.string().min(2, { message: "Description must be at least 2 characters." }).max(100),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  date: z.date({ required_error: "A date is required." }),
  categoryId: z.string({ required_error: "Please select a category." }),
  notes: z.string().max(200).optional(),
  sharedBudgetId: z.string().optional(),
  isSplit: z.boolean().optional().default(false),
  paidByMemberId: z.string().optional(),
  splitWithMemberIds: z.array(z.string()).optional().default([]),
});

const expenseFormSchema = expenseFormSchemaBase.superRefine((data, ctx) => {
  if (data.isSplit) {
    if (!data.paidByMemberId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select who paid or if it was paid from the pot.",
        path: ["paidByMemberId"],
      });
    }
    if (!data.splitWithMemberIds || data.splitWithMemberIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select at least one member to split with.",
        path: ["splitWithMemberIds"],
      });
    } else if (data.paidByMemberId && data.paidByMemberId !== POT_PAYER_ID && !data.splitWithMemberIds.includes(data.paidByMemberId)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "The individual payer must be included in the list of members to split with.",
            path: ["splitWithMemberIds"],
        });
    }
  }
});


export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

type MemberLike = { id: string; name: string };

interface ExpenseFormProps {
  expense?: Expense | TripExpense;
  onSave: (data: ExpenseFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  hideSharedBudgetLink?: boolean;
  hideSplittingFeature?: boolean;
  availableMembersForSplitting?: MemberLike[];
  currentUserIdForDefaultPayer?: string;
  allowPotPayer?: boolean; // New prop to enable "Paid from Pot"
}

const NONE_SHARED_BUDGET_VALUE = "__NONE__";

export function ExpenseForm({
    expense,
    onSave,
    onCancel,
    isSubmitting,
    hideSharedBudgetLink = false,
    hideSplittingFeature = false,
    availableMembersForSplitting = [],
    currentUserIdForDefaultPayer,
    allowPotPayer = false, // Default to false for general expenses, true for household/trip
}: ExpenseFormProps) {
  const { categories, getCategoryById, sharedBudgets: householdSharedBudgets } = useAppContext();
  const { toast } = useToast();
  const [aiCategorySuggestion, setAiCategorySuggestion] = useState<SuggestExpenseCategoryOutput | null>(null);
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);
  const [aiNoteSuggestion, setAiNoteSuggestion] = useState<SuggestExpenseNotesOutput | null>(null);
  const [isSuggestingNote, setIsSuggestingNote] = useState(false);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);


  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: expense
      ? {
          ...expense,
          date: new Date(expense.date),
          sharedBudgetId: (expense as Expense).sharedBudgetId || NONE_SHARED_BUDGET_VALUE,
          isSplit: expense.isSplit || false,
          paidByMemberId: (expense as Expense).paidByMemberId || (expense as TripExpense).paidByTripMemberId || (allowPotPayer ? POT_PAYER_ID : ""),
          splitWithMemberIds: (expense as Expense).splitWithMemberIds || (expense as TripExpense).splitWithTripMemberIds || [],
        }
      : {
          description: "",
          amount: 0,
          date: new Date(),
          categoryId: "",
          notes: "",
          sharedBudgetId: NONE_SHARED_BUDGET_VALUE,
          isSplit: true,
          paidByMemberId: allowPotPayer ? POT_PAYER_ID : (currentUserIdForDefaultPayer || ""),
          splitWithMemberIds: availableMembersForSplitting.map(m => m.id),
        },
  });

  const watchedDescription = form.watch("description");
  const watchedNotes = form.watch("notes");
  const watchedCategoryId = form.watch("categoryId");
  const watchedIsSplit = form.watch("isSplit");
  const watchedPaidByMemberId = form.watch("paidByMemberId");
  const watchedSplitWithMemberIds = form.watch("splitWithMemberIds");


  useEffect(() => {
    if (watchedIsSplit && !watchedPaidByMemberId && !allowPotPayer && currentUserIdForDefaultPayer) {
        const isCurrentUserInList = availableMembersForSplitting.some(m => m.id === currentUserIdForDefaultPayer);
        if (isCurrentUserInList) {
            form.setValue("paidByMemberId", currentUserIdForDefaultPayer, { shouldValidate: true });
        }
    } else if (watchedIsSplit && !watchedPaidByMemberId && allowPotPayer) {
        form.setValue("paidByMemberId", POT_PAYER_ID, { shouldValidate: true });
    }
  }, [watchedIsSplit, watchedPaidByMemberId, currentUserIdForDefaultPayer, allowPotPayer, form, availableMembersForSplitting]);

  useEffect(() => {
    if (!expense && watchedIsSplit && availableMembersForSplitting.length > 0 ) {
        const currentSplitIds = form.getValues("splitWithMemberIds");
        if (!currentSplitIds || currentSplitIds.length === 0) {
             form.setValue("splitWithMemberIds", availableMembersForSplitting.map(m => m.id), { shouldValidate: true });
        }
    }
  }, [expense, watchedIsSplit, availableMembersForSplitting, form]);


  const handleSuggestCategory = useCallback(async () => {
    if (!watchedDescription || watchedDescription.length < 3 || watchedCategoryId) return;
    setIsSuggestingCategory(true);
    setAiCategorySuggestion(null);
    try {
      const input: SuggestExpenseCategoryInput = {
        description: watchedDescription,
        availableCategories: categories.map(c => c.name),
      };
      const suggestion = await suggestExpenseCategory(input);
      setAiCategorySuggestion(suggestion);
      const suggestedCat = categories.find(c => c.name.toLowerCase() === suggestion.category.toLowerCase());
      if (suggestedCat && !form.getValues("categoryId")) {
         form.setValue("categoryId", suggestedCat.id, { shouldValidate: true });
      }
    } catch (error) {
      console.error("Error suggesting category:", error);
      toast({ variant: "destructive", title: "AI Category Suggestion Failed", description: "Could not get category suggestion." });
    } finally {
      setIsSuggestingCategory(false);
    }
  }, [watchedDescription, categories, toast, form, watchedCategoryId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (watchedDescription && watchedDescription.length >= 5 && !watchedCategoryId) {
        handleSuggestCategory();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [watchedDescription, handleSuggestCategory, watchedCategoryId]);

  const handleSuggestNotes = useCallback(async () => {
    if (!watchedDescription || watchedDescription.length < 5 || (watchedNotes && watchedNotes.length > 10)) return;
    setIsSuggestingNote(true);
    setAiNoteSuggestion(null);
    try {
      const input: SuggestExpenseNotesInput = {
        description: watchedDescription,
        currentNotes: watchedNotes,
      };
      const suggestion = await suggestExpenseNotes(input);
      setAiNoteSuggestion(suggestion);
    } catch (error) {
      console.error("Error suggesting notes:", error);
      toast({ variant: "destructive", title: "AI Note Suggestion Failed", description: "Could not get note suggestion." });
    } finally {
      setIsSuggestingNote(false);
    }
  }, [watchedDescription, watchedNotes, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (watchedDescription && watchedDescription.length >= 5 && (!watchedNotes || watchedNotes.length < 20)) {
        handleSuggestNotes();
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [watchedDescription, watchedNotes, handleSuggestNotes]);


  function onSubmit(data: ExpenseFormValues) {
    const dataToSave: ExpenseFormValues = {
      ...data,
      sharedBudgetId: (hideSharedBudgetLink || data.sharedBudgetId === NONE_SHARED_BUDGET_VALUE) ? undefined : data.sharedBudgetId,
    };
    onSave(dataToSave);
    if (!expense) {
        form.reset({
            description: "",
            amount: 0,
            date: new Date(),
            categoryId: "",
            notes: "",
            sharedBudgetId: NONE_SHARED_BUDGET_VALUE,
            isSplit: true,
            paidByMemberId: allowPotPayer ? POT_PAYER_ID : (currentUserIdForDefaultPayer && availableMembersForSplitting.some(m => m.id === currentUserIdForDefaultPayer) ? currentUserIdForDefaultPayer : ""),
            splitWithMemberIds: availableMembersForSplitting.map(m => m.id),
        });
        setAiCategorySuggestion(null);
        setAiNoteSuggestion(null);
    }
  }

  const selectedCategory = getCategoryById(form.watch("categoryId"));

  const handleSelectAllSplitMembers = (checked: boolean) => {
    if (checked) {
      form.setValue("splitWithMemberIds", availableMembersForSplitting.map(m => m.id), { shouldValidate: true });
    } else {
      form.setValue("splitWithMemberIds", [], { shouldValidate: true });
    }
  };

  const areAllMembersSelected = availableMembersForSplitting.length > 0 && watchedSplitWithMemberIds?.length === availableMembersForSplitting.length;


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
                  <Input type="number" placeholder="0.00" {...field} step="0.01" />
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
                              form.setValue("categoryId", category.id);
                              setAiCategorySuggestion(null);
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

        {isSuggestingCategory && (
          <div className="flex items-center text-sm text-muted-foreground">
            <AiSparklesIcon className="mr-2 h-4 w-4 animate-spin" />
            Getting AI category suggestion...
          </div>
        )}

        {aiCategorySuggestion && !form.getValues("categoryId") && (
          <Alert variant="default" className="bg-primary/10 border-primary/30">
            <AiSparklesIcon className="h-5 w-5 text-primary" />
            <AlertTitle className="text-primary font-semibold">AI Category Suggestion</AlertTitle>
            <AlertDescription className="text-primary/80">
              We think this might be <span className="font-semibold">{aiCategorySuggestion.category}</span>.
              <br />
              <span className="text-xs italic">Reasoning: {aiCategorySuggestion.reasoning}</span>
            </AlertDescription>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-2 text-primary hover:bg-primary/20"
              onClick={() => {
                const suggestedCat = categories.find(c => c.name.toLowerCase() === aiCategorySuggestion.category.toLowerCase());
                if (suggestedCat) {
                  form.setValue("categoryId", suggestedCat.id, { shouldValidate: true });
                  setAiCategorySuggestion(null);
                } else {
                  toast({variant: "destructive", title: "Category not found", description: `AI suggested "${aiCategorySuggestion.category}" which is not an available category.`})
                }
              }}
            >
              Apply Suggestion
            </Button>
          </Alert>
        )}

        {!hideSharedBudgetLink && householdSharedBudgets.length > 0 && (
          <FormField
            control={form.control}
            name="sharedBudgetId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Link to Household Shared Budget (Optional)</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value === NONE_SHARED_BUDGET_VALUE ? undefined : value);
                  }}
                  value={field.value || NONE_SHARED_BUDGET_VALUE}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a household shared budget" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE_SHARED_BUDGET_VALUE}>None</SelectItem>
                    {householdSharedBudgets.map((budget: SharedBudget) => (
                      <SelectItem key={budget.id} value={budget.id}>
                        {budget.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Link this expense to a shared household budget.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {!hideSplittingFeature && availableMembersForSplitting.length > 0 && (
          <div className="space-y-4 p-4 border rounded-md">
            <FormField
              control={form.control}
              name="isSplit"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (!checked) {
                          form.setValue("paidByMemberId", undefined);
                          form.setValue("splitWithMemberIds", []);
                        } else {
                           if (!form.getValues("paidByMemberId")) {
                                if (allowPotPayer) {
                                    form.setValue("paidByMemberId", POT_PAYER_ID, {shouldValidate: true});
                                } else if (currentUserIdForDefaultPayer && availableMembersForSplitting.some(m => m.id === currentUserIdForDefaultPayer)) {
                                    form.setValue("paidByMemberId", currentUserIdForDefaultPayer, { shouldValidate: true });
                                }
                           }
                           const currentSplitIds = form.getValues("splitWithMemberIds");
                           if ((!currentSplitIds || currentSplitIds.length === 0) && availableMembersForSplitting.length > 0) {
                               form.setValue("splitWithMemberIds", availableMembersForSplitting.map(m => m.id), { shouldValidate: true });
                           }
                        }
                      }}
                    />
                  </FormControl>
                  <FormLabel className="font-normal text-sm">Split this expense?</FormLabel>
                </FormItem>
              )}
            />

            {watchedIsSplit && (
              <>
                <FormField
                  control={form.control}
                  name="paidByMemberId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Who Paid?</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select who paid or if from Pot" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allowPotPayer && (
                            <SelectItem value={POT_PAYER_ID}>
                              <div className="flex items-center gap-2">
                                <CircleDollarSign className="h-4 w-4 text-primary"/> Paid from Pot / Communal Fund
                              </div>
                            </SelectItem>
                          )}
                          {availableMembersForSplitting.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Controller
                  control={form.control}
                  name="splitWithMemberIds"
                  render={({ field }) => (
                    <FormItem>
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                            <FormLabel>Split With Whom?</FormLabel>
                            <FormDescription>Select all members sharing this expense (including payer if applicable).</FormDescription>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectAllSplitMembers(!areAllMembersSelected)}
                            disabled={availableMembersForSplitting.length === 0}
                            className="ml-auto"
                        >
                            {areAllMembersSelected ? <CheckSquare className="mr-2 h-4 w-4" /> : <Square className="mr-2 h-4 w-4" />}
                            {areAllMembersSelected ? 'Deselect All' : 'Select All'}
                        </Button>
                      </div>
                      <ScrollArea className="h-32 w-full rounded-md border p-2">
                        {availableMembersForSplitting.map((member) => (
                          <FormField
                            key={member.id}
                            control={form.control}
                            name="splitWithMemberIds"
                            render={({ field: checkboxField }) => {
                              return (
                                <FormItem
                                  key={member.id}
                                  className="flex flex-row items-start space-x-3 space-y-0 py-2"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={checkboxField.value?.includes(member.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? checkboxField.onChange([...(checkboxField.value || []), member.id])
                                          : checkboxField.onChange(
                                            (checkboxField.value || []).filter(
                                                (value) => value !== member.id
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">
                                    {member.name}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </ScrollArea>
                      <FormMessage />
                       {form.formState.errors.splitWithMemberIds?.message && <p className="text-sm font-medium text-destructive">{form.formState.errors.splitWithMemberIds?.message}</p>}
                    </FormItem>
                  )}
                />
              </>
            )}
          </div>
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

        {isSuggestingNote && (
          <div className="flex items-center text-sm text-muted-foreground">
            <MessageSquarePlus className="mr-2 h-4 w-4 animate-pulse" />
            Getting AI note suggestion...
          </div>
        )}

        {aiNoteSuggestion && (
          <Alert variant="default" className="bg-accent/20 border-accent/50">
            <MessageSquarePlus className="h-5 w-5 text-accent-foreground/80" />
            <AlertTitle className="text-accent-foreground/90 font-semibold">AI Note Suggestion</AlertTitle>
            <AlertDescription className="text-accent-foreground/70">
              "{aiNoteSuggestion.suggestedNote}"
              {aiNoteSuggestion.reasoning && <span className="text-xs italic block mt-1">Reasoning: {aiNoteSuggestion.reasoning}</span>}
            </AlertDescription>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-2 text-accent-foreground/80 hover:bg-accent/30"
              onClick={() => {
                form.setValue("notes", aiNoteSuggestion.suggestedNote, { shouldValidate: true });
                setAiNoteSuggestion(null);
              }}
            >
              <Edit className="mr-2 h-3 w-3" /> Apply Suggestion
            </Button>
          </Alert>
        )}


        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting || isSuggestingCategory || isSuggestingNote}>
            {isSubmitting ? (expense ? "Saving..." : "Adding...") : (expense ? "Save Changes" : "Add Expense")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
