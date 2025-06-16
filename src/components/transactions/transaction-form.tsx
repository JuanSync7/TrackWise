
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form"; // Removed useFieldArray
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
import { CalendarIcon, Check, ChevronsUpDown, Sparkles as AiSparklesIcon, TrendingUp, TrendingDown, Repeat } from "lucide-react"; // Removed unused icons
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { Transaction, SharedBudget, Member, TripMember, HouseholdTransaction, TripTransaction, TransactionType, RecurrencePeriod, SplitType, CustomSplitAmount } from '@/lib/types';
import { usePersonalFinance } from '@/contexts/personal-finance-context';
import { useHousehold } from '@/contexts/household-context';
import { format } from "date-fns";
import { useEffect, useState, useCallback, useMemo }  from "react";
import { suggestExpenseCategory, type SuggestExpenseCategoryInput, type SuggestExpenseCategoryOutput } from "@/ai/flows/suggest-expense-category";
import { suggestExpenseNotes, type SuggestExpenseNotesInput, type SuggestExpenseNotesOutput } from "@/ai/flows/suggest-expense-notes";
import { useToast } from "@/hooks/use-toast";
import { CategoryIcon } from '@/components/shared/category-icon';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// Removed ScrollArea, POT_PAYER_ID, DEFAULT_CURRENCY if not directly used by this main form component
// Those might be used by the sub-component
import { ExpenseSplittingFields } from "./expense-splitting-fields"; // Import the new component

const recurrencePeriodEnum = z.enum(['daily', 'weekly', 'monthly', 'yearly']);
const splitTypeEnum = z.enum(['even', 'custom']);

const customSplitAmountSchema = z.object({
  memberId: z.string(),
  amount: z.coerce.number().nonnegative({ message: "Split amount cannot be negative." }),
  memberName: z.string().optional(),
});

const transactionFormSchemaBase = z.object({
  transactionType: z.enum(['expense', 'income'], { required_error: "Please select a transaction type." }),
  description: z.string().min(2, { message: "Description must be at least 2 characters." }).max(100),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  date: z.date({ required_error: "A date is required." }),
  categoryId: z.string({ required_error: "Please select a category." }),
  notes: z.string().max(200).optional(),
  isRecurring: z.boolean().optional().default(false),
  recurrencePeriod: recurrencePeriodEnum.optional(),
  recurrenceEndDate: z.date().optional().nullable(),
  sharedBudgetId: z.string().optional(),
  isSplit: z.boolean().optional().default(false),
  paidByMemberId: z.string().optional(),
  splitWithMemberIds: z.array(z.string()).optional().default([]),
  splitType: splitTypeEnum.optional(),
  customSplitAmounts: z.array(customSplitAmountSchema).optional().default([]),
});

const transactionFormSchema = transactionFormSchemaBase.superRefine((data, ctx) => {
  if (data.isRecurring) {
    if (!data.recurrencePeriod) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Recurrence period is required.", path: ["recurrencePeriod"] });
    }
    if (data.recurrenceEndDate && data.recurrenceEndDate < data.date) {
       ctx.addIssue({ code: z.ZodIssueCode.custom, message: "End date cannot be before transaction date.", path: ["recurrenceEndDate"] });
    }
  }

  if (data.transactionType === 'expense' && data.isSplit) {
    if (!data.paidByMemberId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Payer is required.", path: ["paidByMemberId"] });
    }
    if (!data.splitWithMemberIds || data.splitWithMemberIds.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select at least one member to split with.", path: ["splitWithMemberIds"] });
    } else if (data.paidByMemberId && data.paidByMemberId !== 'pot_payer_id' && !data.splitWithMemberIds.includes(data.paidByMemberId)) { // Use constant for pot_payer_id if available
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Payer must be in the split list.", path: ["splitWithMemberIds"] });
    }

    if (data.splitType === 'custom') {
      if (!data.customSplitAmounts || data.customSplitAmounts.length === 0) {
        // This validation might be too strict if customSplitAmounts are dynamically built.
        // Consider if it should only apply if members ARE selected for splitWithMemberIds.
        // ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Custom split amounts are required.", path: ["customSplitAmounts"] });
      } else {
        const sumOfCustomSplits = data.customSplitAmounts.reduce((sum, item) => sum + (item.amount || 0), 0);
        if (Math.abs(sumOfCustomSplits - data.amount) > 0.005) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Sum of custom splits (${sumOfCustomSplits.toFixed(2)}) must equal total amount (${data.amount.toFixed(2)}). Diff: ${Math.abs(sumOfCustomSplits - data.amount).toFixed(2)}`, path: ["customSplitAmounts"] });
        }
        const customSplitMemberIds = new Set(data.customSplitAmounts.map(s => s.memberId));
        const splitWithMemberIdsSet = new Set(data.splitWithMemberIds);
        if (customSplitMemberIds.size !== splitWithMemberIdsSet.size || !Array.from(splitWithMemberIdsSet).every(id => customSplitMemberIds.has(id))) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Custom split members must match the 'Split With Whom' list.", path: ["customSplitAmounts"]});
        }
      }
    }
  }
  if (data.transactionType === 'income' && data.isSplit) {
     ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Income transactions cannot be split.", path: ["isSplit"] });
  }
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
type MemberLike = { id: string; name: string };

interface TransactionFormProps {
  transaction?: Transaction | HouseholdTransaction | TripTransaction;
  onSave: (data: TransactionFormValues & { nextRecurrenceDate?: string }) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  showSharedBudgetLink?: boolean;
  showSplittingFeature?: boolean;
  availableMembersForSplitting?: MemberLike[];
  currentUserIdForDefaultPayer?: string;
  allowPotPayer?: boolean;
}

const NONE_SHARED_BUDGET_VALUE = "__NONE__";

const useFormInitialValues = (
  transaction?: Transaction | HouseholdTransaction | TripTransaction,
  showSplittingFeatureProp?: boolean,
  allowPotPayerProp?: boolean,
  currentUserIdForDefaultPayerProp?: string,
  availableMembersForSplittingProp: MemberLike[] = []
): TransactionFormValues => {
  return useMemo(() => {
    if (transaction) {
      const typedTransaction = transaction as (HouseholdTransaction | TripTransaction);
      const initialSplitType = typedTransaction.splitType || (typedTransaction.isSplit ? 'even' : undefined);
      
      const initialCustomSplits = typedTransaction.customSplitAmounts?.map(s => ({
        ...s,
        memberName: availableMembersForSplittingProp.find(m => m.id === s.memberId)?.name || 'Unknown'
      })) || [];

      return {
        transactionType: transaction.transactionType,
        description: transaction.description,
        amount: transaction.amount,
        date: new Date(transaction.date),
        categoryId: transaction.categoryId,
        notes: transaction.notes || "",
        isRecurring: transaction.isRecurring || false,
        recurrencePeriod: transaction.recurrencePeriod,
        recurrenceEndDate: transaction.recurrenceEndDate ? new Date(transaction.recurrenceEndDate) : null,
        sharedBudgetId: typedTransaction.sharedBudgetId || NONE_SHARED_BUDGET_VALUE,
        isSplit: typedTransaction.isSplit || false,
        paidByMemberId: typedTransaction.paidByMemberId || (allowPotPayerProp ? 'pot_payer_id' : (currentUserIdForDefaultPayerProp || "")),
        splitWithMemberIds: typedTransaction.splitWithMemberIds || [],
        splitType: initialSplitType,
        customSplitAmounts: initialCustomSplits,
      };
    }
    return {
      transactionType: 'expense' as TransactionType,
      description: "",
      amount: 0,
      date: new Date(),
      categoryId: "",
      notes: "",
      isRecurring: false,
      recurrencePeriod: undefined,
      recurrenceEndDate: null,
      sharedBudgetId: NONE_SHARED_BUDGET_VALUE,
      isSplit: !!showSplittingFeatureProp,
      paidByMemberId: allowPotPayerProp
        ? 'pot_payer_id'
        : (currentUserIdForDefaultPayerProp && availableMembersForSplittingProp.some(m => m.id === currentUserIdForDefaultPayerProp)
            ? currentUserIdForDefaultPayerProp
            : (availableMembersForSplittingProp.length > 0 ? availableMembersForSplittingProp[0].id : "")),
      splitWithMemberIds: showSplittingFeatureProp ? availableMembersForSplittingProp.map(m => m.id) : [],
      splitType: showSplittingFeatureProp ? 'even' : undefined,
      customSplitAmounts: [],
    };
  }, [transaction, showSplittingFeatureProp, allowPotPayerProp, currentUserIdForDefaultPayerProp, availableMembersForSplittingProp]);
};


export function TransactionForm({
    transaction,
    onSave,
    onCancel,
    isSubmitting,
    showSharedBudgetLink = false,
    showSplittingFeature = false,
    availableMembersForSplitting = [],
    currentUserIdForDefaultPayer,
    allowPotPayer = false,
}: TransactionFormProps) {
  const { categories, getCategoryById } = usePersonalFinance();
  const { sharedBudgets: householdSharedBudgets } = useHousehold();
  const { toast } = useToast();

  const [aiCategorySuggestion, setAiCategorySuggestion] = useState<SuggestExpenseCategoryOutput | null>(null);
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);
  const [aiNoteSuggestion, setAiNoteSuggestion] = useState<SuggestExpenseNotesOutput | null>(null);
  const [isSuggestingNote, setIsSuggestingNote] = useState(false);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);

  const initialValues = useFormInitialValues(
    transaction,
    showSplittingFeature,
    allowPotPayer,
    currentUserIdForDefaultPayer,
    availableMembersForSplitting
  );

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: initialValues,
  });
  
  useEffect(() => {
    form.reset(initialValues);
  }, [initialValues, form]);

  const watchedTransactionType = form.watch("transactionType");
  const watchedDescription = form.watch("description");
  const watchedNotes = form.watch("notes");
  const watchedCategoryId = form.watch("categoryId");
  const watchedIsSplit = form.watch("isSplit");
  const watchedSplitWithMemberIds = form.watch("splitWithMemberIds") || [];
  const watchedIsRecurring = form.watch("isRecurring");
  const watchedSplitType = form.watch("splitType");
  const watchedAmount = form.watch("amount");
  const watchedCustomSplitAmounts = form.watch("customSplitAmounts");

  const filteredCategories = useMemo(() => {
    return categories.filter(cat => cat.appliesTo === watchedTransactionType || cat.appliesTo === 'both');
  }, [categories, watchedTransactionType]);

  useEffect(() => {
    const currentCategoryIdVal = form.getValues("categoryId");
    if (currentCategoryIdVal && !filteredCategories.some(cat => cat.id === currentCategoryIdVal)) {
        form.setValue("categoryId", "");
    }
    setAiCategorySuggestion(null);
  }, [watchedTransactionType, form, filteredCategories]);

  useEffect(() => {
    if (watchedTransactionType === 'income') {
      form.setValue('isSplit', false);
    }
  }, [watchedTransactionType, form]);

  const handleSuggestCategory = useCallback(async () => {
    if (!watchedDescription || watchedDescription.length < 3 || watchedCategoryId || watchedTransactionType !== 'expense') return;
    setIsSuggestingCategory(true); setAiCategorySuggestion(null);
    try {
      const suggestion = await suggestExpenseCategory({ description: watchedDescription, availableCategories: filteredCategories.map(c => c.name) });
      setAiCategorySuggestion(suggestion);
      const suggestedCat = filteredCategories.find(c => c.name.toLowerCase() === suggestion.category.toLowerCase());
      if (suggestedCat && !form.getValues("categoryId")) form.setValue("categoryId", suggestedCat.id, { shouldValidate: true });
    } catch (error) { console.error("Error suggesting category:", error); toast({ variant: "destructive", title: "AI Category Suggestion Failed" }); }
    finally { setIsSuggestingCategory(false); }
  }, [watchedDescription, filteredCategories, toast, form, watchedCategoryId, watchedTransactionType]);

  useEffect(() => {
    const timer = setTimeout(() => { if (watchedDescription && watchedDescription.length >= 5 && !watchedCategoryId && watchedTransactionType === 'expense') handleSuggestCategory(); }, 1000);
    return () => clearTimeout(timer);
  }, [watchedDescription, handleSuggestCategory, watchedCategoryId, watchedTransactionType]);

  const handleSuggestNotes = useCallback(async () => {
    if (!watchedDescription || watchedDescription.length < 5 || (watchedNotes && watchedNotes.length > 10)) return;
    setIsSuggestingNote(true); setAiNoteSuggestion(null);
    try {
      const suggestion = await suggestExpenseNotes({ description: watchedDescription, currentNotes: watchedNotes });
      setAiNoteSuggestion(suggestion);
    } catch (error) { console.error("Error suggesting notes:", error); toast({ variant: "destructive", title: "AI Note Suggestion Failed" }); }
    finally { setIsSuggestingNote(false); }
  }, [watchedDescription, watchedNotes, toast]);

  useEffect(() => {
    const timer = setTimeout(() => { if (watchedDescription && watchedDescription.length >= 5 && (!watchedNotes || watchedNotes.length < 20)) handleSuggestNotes(); }, 1200);
    return () => clearTimeout(timer);
  }, [watchedDescription, watchedNotes, handleSuggestNotes]);

  function onSubmit(data: TransactionFormValues) {
    const dataToSave: TransactionFormValues & { nextRecurrenceDate?: string } = {
      ...data,
      recurrenceEndDate: data.recurrenceEndDate ? format(data.recurrenceEndDate, "yyyy-MM-dd") : undefined,
      sharedBudgetId: (data.sharedBudgetId === NONE_SHARED_BUDGET_VALUE) ? undefined : data.sharedBudgetId,
      isSplit: data.transactionType === 'expense' ? data.isSplit : false,
      splitType: data.transactionType === 'expense' && data.isSplit ? data.splitType : undefined,
      customSplitAmounts: data.transactionType === 'expense' && data.isSplit && data.splitType === 'custom' ? data.customSplitAmounts?.map(s => ({ memberId: s.memberId, amount: s.amount })) : [],
      paidByMemberId: data.transactionType === 'expense' && data.isSplit ? data.paidByMemberId : undefined,
      splitWithMemberIds: data.transactionType === 'expense' && data.isSplit ? data.splitWithMemberIds : [],
    };
    onSave(dataToSave);
    if (!transaction) {
        form.reset(initialValues);
        setAiCategorySuggestion(null); setAiNoteSuggestion(null);
    }
  }

  const selectedCategoryObj = getCategoryById(form.watch("categoryId"));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="transactionType"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Transaction Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex space-x-4"
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                        <RadioGroupItem value="expense" id="type-expense"/>
                    </FormControl>
                    <FormLabel htmlFor="type-expense" className="font-normal flex items-center gap-1 cursor-pointer">
                      <TrendingDown className="h-4 w-4 text-destructive"/>Expense
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                        <RadioGroupItem value="income" id="type-income"/>
                    </FormControl>
                    <FormLabel htmlFor="type-income" className="font-normal flex items-center gap-1 cursor-pointer">
                      <TrendingUp className="h-4 w-4 text-accent"/>Income
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Input placeholder={watchedTransactionType === 'income' ? "e.g., Monthly Salary" : "e.g., Coffee run"} {...field} /></FormControl> <FormMessage /> </FormItem> )} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField control={form.control} name="amount" render={({ field }) => ( <FormItem> <FormLabel>Amount</FormLabel> <FormControl><Input type="number" placeholder="0.00" {...field} step="0.01" /></FormControl> <FormMessage /> </FormItem> )} />
          <FormField control={form.control} name="date" render={({ field }) => ( <FormItem className="flex flex-col"> <FormLabel>Date</FormLabel> <Popover> <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger> <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus /></PopoverContent> </Popover> <FormMessage /> </FormItem> )} />
        </div>
        <FormField control={form.control} name="categoryId" render={({ field }) => ( <FormItem className="flex flex-col"> <FormLabel>Category</FormLabel> <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}> <PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" aria-expanded={categoryPopoverOpen} className={cn("w-full justify-between",!field.value && "text-muted-foreground")} disabled={filteredCategories.length === 0}>{selectedCategoryObj ? <div className="flex items-center gap-2"><CategoryIcon category={selectedCategoryObj} size="sm" />{selectedCategoryObj.name}</div> : (filteredCategories.length === 0 ? `No ${watchedTransactionType} categories` : "Select category")}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></FormControl></PopoverTrigger> <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Search category..." /><CommandList><CommandEmpty>No category found.</CommandEmpty><CommandGroup>{filteredCategories.map((category) => ( <CommandItem value={category.name} key={category.id} onSelect={() => {form.setValue("categoryId", category.id, { shouldValidate: true }); setAiCategorySuggestion(null); setCategoryPopoverOpen(false);}}><Check className={cn("mr-2 h-4 w-4",category.id === field.value ? "opacity-100" : "opacity-0")}/><div className="flex items-center gap-2"><CategoryIcon category={category} size="sm" />{category.name}</div></CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent> </Popover> <FormMessage /> </FormItem> )} />
        {watchedTransactionType === 'expense' && isSuggestingCategory && <div className="flex items-center text-sm text-muted-foreground"><AiSparklesIcon className="mr-2 h-4 w-4 animate-spin" />Getting AI category suggestion...</div>}
        {watchedTransactionType === 'expense' && aiCategorySuggestion && !form.getValues("categoryId") && <Alert variant="default" className="bg-primary/10 border-primary/30"><AiSparklesIcon className="h-5 w-5 text-primary" /><AlertTitle className="text-primary font-semibold">AI Category Suggestion</AlertTitle><AlertDescription className="text-primary/80">We think this might be <span className="font-semibold">{aiCategorySuggestion.category}</span>.<br /><span className="text-xs italic">Reasoning: {aiCategorySuggestion.reasoning}</span></AlertDescription><Button type="button" size="sm" variant="ghost" className="mt-2 text-primary hover:bg-primary/20" onClick={() => { const suggestedCat = filteredCategories.find(c => c.name.toLowerCase() === aiCategorySuggestion.category.toLowerCase()); if (suggestedCat) {form.setValue("categoryId", suggestedCat.id, { shouldValidate: true }); setAiCategorySuggestion(null);} else {toast({variant: "destructive", title: "Category not found"})}}}>Apply Suggestion</Button></Alert>}
        
        <FormField control={form.control} name="isRecurring" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm bg-muted/30"> <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl> <div className="space-y-1 leading-none"> <FormLabel className="flex items-center gap-1.5 cursor-pointer"><Repeat className="h-4 w-4 text-primary" /> Is this a recurring transaction?</FormLabel> <FormDescription className="text-xs">Check if this transaction repeats.</FormDescription> </div> </FormItem> )} />
        {watchedIsRecurring && <div className="space-y-4 p-4 border rounded-md bg-muted/50"> <FormField control={form.control} name="recurrencePeriod" render={({ field }) => ( <FormItem><FormLabel>Repeats</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger></FormControl><SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} /><FormField control={form.control} name="recurrenceEndDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Ends On (Optional)</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal bg-background",!field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick end date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} disabled={(date) => date < form.getValues("date") || date < new Date("1900-01-01")} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} /></div>}
        
        {showSharedBudgetLink && watchedTransactionType === 'expense' && householdSharedBudgets.length > 0 && <FormField control={form.control} name="sharedBudgetId" render={({ field }) => ( <FormItem> <FormLabel>Link to Household Shared Budget (Optional)</FormLabel> <Select onValueChange={(value) => field.onChange(value === NONE_SHARED_BUDGET_VALUE ? undefined : value)} value={field.value || NONE_SHARED_BUDGET_VALUE}> <FormControl><SelectTrigger><SelectValue placeholder="Select budget" /></SelectTrigger></FormControl> <SelectContent><SelectItem value={NONE_SHARED_BUDGET_VALUE}>None</SelectItem>{householdSharedBudgets.map((budget: SharedBudget) => ( <SelectItem key={budget.id} value={budget.id}>{budget.name}</SelectItem>))}</SelectContent> </Select> <FormDescription>Link to a shared household budget.</FormDescription> <FormMessage /> </FormItem> )} />}
        
        {showSplittingFeature && watchedTransactionType === 'expense' && availableMembersForSplitting.length > 0 && (
            <FormField
                control={form.control}
                name="isSplit" // This field controls the visibility of the SplittingFields
                render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm bg-muted/30">
                    <FormControl>
                    <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                            field.onChange(checked);
                            // Reset split specific fields if unchecked
                            if (!checked) {
                                form.setValue("splitType", undefined);
                                form.setValue("customSplitAmounts", []);
                                form.setValue("paidByMemberId", undefined);
                                form.setValue("splitWithMemberIds", []);
                            } else {
                               // Default to even split when checked, if not already set
                               if(!form.getValues("splitType")) form.setValue("splitType", "even");
                            }
                        }}
                    />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer">Split this expense?</FormLabel>
                    </div>
                </FormItem>
                )}
            />
        )}

        {showSplittingFeature && watchedTransactionType === 'expense' && (
           <ExpenseSplittingFields
                control={form.control}
                setValue={form.setValue}
                getValues={form.getValues}
                errors={form.formState.errors}
                watchedIsSplit={watchedIsSplit}
                watchedSplitType={watchedSplitType}
                watchedAmount={watchedAmount}
                watchedCustomSplitAmounts={watchedCustomSplitAmounts}
                watchedSplitWithMemberIds={watchedSplitWithMemberIds}
                availableMembersForSplitting={availableMembersForSplitting}
                allowPotPayer={allowPotPayer}
                currentUserIdForDefaultPayer={currentUserIdForDefaultPayer}
            />
        )}


        <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem> <FormLabel>Notes (Optional)</FormLabel> <FormControl><Textarea placeholder="Add relevant notes..." {...field} /></FormControl> <FormMessage /> </FormItem> )} />
        {isSuggestingNote && <div className="flex items-center text-sm text-muted-foreground"><AiSparklesIcon className="mr-2 h-4 w-4 animate-pulse" />Getting AI note suggestion...</div>}
        {aiNoteSuggestion && <Alert variant="default" className="bg-accent/20 border-accent/50"><AiSparklesIcon className="h-5 w-5 text-accent-foreground/80" /><AlertTitle className="text-accent-foreground/90 font-semibold">AI Note Suggestion</AlertTitle><AlertDescription className="text-accent-foreground/70">"{aiNoteSuggestion.suggestedNote}"{aiNoteSuggestion.reasoning && <span className="text-xs italic block mt-1">Reasoning: {aiNoteSuggestion.reasoning}</span>}</AlertDescription><Button type="button" size="sm" variant="ghost" className="mt-2 text-accent-foreground/80 hover:bg-accent/30" onClick={() => {form.setValue("notes", aiNoteSuggestion.suggestedNote, { shouldValidate: true }); setAiNoteSuggestion(null);}}>Apply Suggestion</Button></Alert>}
        
        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>}
          <Button type="submit" disabled={isSubmitting || isSuggestingCategory || isSuggestingNote}>{isSubmitting ? (transaction ? "Saving..." : "Adding...") : (transaction ? "Save Changes" : "Add Transaction")}</Button>
        </div>
      </form>
    </Form>
  );
}
