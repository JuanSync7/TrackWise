
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, useFieldArray } from "react-hook-form";
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
import { CalendarIcon, Check, ChevronsUpDown, Sparkles as AiSparklesIcon, Users, Landmark, CheckSquare, Square, MessageSquarePlus, Edit, CircleDollarSign, TrendingUp, TrendingDown, Repeat, AlertCircle } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { POT_PAYER_ID, DEFAULT_CURRENCY } from "@/lib/constants";

const recurrencePeriodEnum = z.enum(['daily', 'weekly', 'monthly', 'yearly']);
const splitTypeEnum = z.enum(['even', 'custom']);

const customSplitAmountSchema = z.object({
  memberId: z.string(),
  amount: z.coerce.number().nonnegative({ message: "Split amount cannot be negative." }),
  memberName: z.string().optional(), // For UI display only
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
  recurrenceEndDate: z.date().optional().nullable(), // Allow null for easier reset
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
    } else if (data.paidByMemberId && data.paidByMemberId !== POT_PAYER_ID && !data.splitWithMemberIds.includes(data.paidByMemberId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Payer must be in the split list.", path: ["splitWithMemberIds"] });
    }

    if (data.splitType === 'custom') {
      if (!data.customSplitAmounts || data.customSplitAmounts.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Custom split amounts are required.", path: ["customSplitAmounts"] });
      } else {
        const sumOfCustomSplits = data.customSplitAmounts.reduce((sum, item) => sum + (item.amount || 0), 0);
        if (Math.abs(sumOfCustomSplits - data.amount) > 0.005) { // Using a small epsilon for float comparison
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Sum of custom splits (${DEFAULT_CURRENCY}${sumOfCustomSplits.toFixed(2)}) must equal total amount (${DEFAULT_CURRENCY}${data.amount.toFixed(2)}). Difference: ${DEFAULT_CURRENCY}${Math.abs(sumOfCustomSplits - data.amount).toFixed(2)}`, path: ["customSplitAmounts"] });
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
        paidByMemberId: typedTransaction.paidByMemberId || (allowPotPayerProp ? POT_PAYER_ID : (currentUserIdForDefaultPayerProp || "")),
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
        ? POT_PAYER_ID
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


  const { fields: customSplitFields, replace: replaceCustomSplits } = useFieldArray({
    control: form.control,
    name: "customSplitAmounts",
    keyName: "fieldId"
  });

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

  useEffect(() => {
    if (watchedIsSplit) {
        if (!form.getValues("splitType")) {
            form.setValue("splitType", "even");
        }
        if (!form.getValues("paidByMemberId")) {
            if (allowPotPayer) {
                form.setValue("paidByMemberId", POT_PAYER_ID, {shouldValidate: true});
            } else if (currentUserIdForDefaultPayer && availableMembersForSplitting.some(m => m.id === currentUserIdForDefaultPayer)) {
                form.setValue("paidByMemberId", currentUserIdForDefaultPayer, { shouldValidate: true });
            } else if (availableMembersForSplitting.length > 0) {
                form.setValue("paidByMemberId", availableMembersForSplitting[0].id, { shouldValidate: true });
            }
        }
        const currentSplitIds = form.getValues("splitWithMemberIds");
        if ((!currentSplitIds || currentSplitIds.length === 0) && availableMembersForSplitting.length > 0) {
            form.setValue("splitWithMemberIds", availableMembersForSplitting.map(m => m.id), { shouldValidate: true });
        }
    } else {
        form.setValue("splitType", undefined);
        form.setValue("customSplitAmounts", []);
        form.setValue("paidByMemberId", undefined);
        form.setValue("splitWithMemberIds", []);
    }
  }, [watchedIsSplit, form, allowPotPayer, currentUserIdForDefaultPayer, availableMembersForSplitting]);


  useEffect(() => {
    if (watchedIsSplit && watchedSplitType === 'custom') {
      const newCustomSplits = watchedSplitWithMemberIds.map(memberId => {
        const existing = watchedCustomSplitAmounts?.find(s => s.memberId === memberId);
        const member = availableMembersForSplitting.find(m => m.id === memberId);
        return {
          memberId,
          amount: existing?.amount ?? 0,
          memberName: member?.name || 'Unknown Member'
        };
      });
      const currentCustomSplitMembers = form.getValues("customSplitAmounts")?.map(cs => cs.memberId).sort().join(',') || "";
      const newCustomSplitMembers = newCustomSplits.map(cs => cs.memberId).sort().join(',');

      if (newCustomSplitMembers !== currentCustomSplitMembers) {
        replaceCustomSplits(newCustomSplits);
      }
    } else if (watchedIsSplit && watchedSplitType === 'even') {
      if (form.getValues("customSplitAmounts")?.length > 0) {
        replaceCustomSplits([]);
      }
    }
  }, [watchedSplitWithMemberIds, watchedSplitType, watchedIsSplit, replaceCustomSplits, form, availableMembersForSplitting, watchedCustomSplitAmounts]);


  const sumOfCustomSplits = useMemo(() => {
    if (watchedSplitType === 'custom' && watchedCustomSplitAmounts) {
      return watchedCustomSplitAmounts.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    }
    return 0;
  }, [watchedCustomSplitAmounts, watchedSplitType]);

  const customSplitDifference = useMemo(() => {
    if (watchedSplitType === 'custom') {
      // Round to avoid floating point precision issues for display
      return parseFloat((watchedAmount - sumOfCustomSplits).toFixed(2));
    }
    return 0;
  }, [watchedAmount, sumOfCustomSplits, watchedSplitType]);

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
  const handleSelectAllSplitMembers = (checked: boolean) => form.setValue("splitWithMemberIds", checked ? availableMembersForSplitting.map(m => m.id) : [], { shouldValidate: true });
  const areAllMembersSelected = availableMembersForSplitting.length > 0 && watchedSplitWithMemberIds?.length === availableMembersForSplitting.length;

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
        {watchedIsRecurring && <div className="space-y-4 p-4 border rounded-md bg-muted/50"> <FormField control={form.control} name="recurrencePeriod" render={({ field }) => ( <FormItem><FormLabel>Repeats</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger></FormControl><SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} /><FormField control={form.control} name="recurrenceEndDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Ends On (Optional)</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal bg-background",!field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick end date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < form.getValues("date") || date < new Date("1900-01-01")} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} /></div>}
        
        {showSharedBudgetLink && watchedTransactionType === 'expense' && householdSharedBudgets.length > 0 && <FormField control={form.control} name="sharedBudgetId" render={({ field }) => ( <FormItem> <FormLabel>Link to Household Shared Budget (Optional)</FormLabel> <Select onValueChange={(value) => field.onChange(value === NONE_SHARED_BUDGET_VALUE ? undefined : value)} value={field.value || NONE_SHARED_BUDGET_VALUE}> <FormControl><SelectTrigger><SelectValue placeholder="Select budget" /></SelectTrigger></FormControl> <SelectContent><SelectItem value={NONE_SHARED_BUDGET_VALUE}>None</SelectItem>{householdSharedBudgets.map((budget: SharedBudget) => ( <SelectItem key={budget.id} value={budget.id}>{budget.name}</SelectItem>))}</SelectContent> </Select> <FormDescription>Link to a shared household budget.</FormDescription> <FormMessage /> </FormItem> )} />}
        
        {showSplittingFeature && watchedTransactionType === 'expense' && availableMembersForSplitting.length > 0 && (
          <div className="space-y-4 p-4 border rounded-md">
            <FormField control={form.control} name="isSplit" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-3 space-y-0"> <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => { field.onChange(checked); if (!checked) { form.setValue("splitType", undefined); form.setValue("customSplitAmounts", []); form.setValue("paidByMemberId", undefined); form.setValue("splitWithMemberIds", []); } else { if(!form.getValues("splitType")) form.setValue("splitType", "even"); } }} /></FormControl> <FormLabel className="font-normal text-sm cursor-pointer">Split this expense?</FormLabel> </FormItem> )} />
            {watchedIsSplit && (
              <>
                <FormField control={form.control} name="paidByMemberId" render={({ field }) => ( <FormItem> <FormLabel>Who Paid?</FormLabel> <Select onValueChange={field.onChange} value={field.value || ""}> <FormControl><SelectTrigger><SelectValue placeholder="Select payer" /></SelectTrigger></FormControl> <SelectContent>{allowPotPayer && <SelectItem value={POT_PAYER_ID}><div className="flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-primary"/>Paid from Pot</div></SelectItem>}{availableMembersForSplitting.map((member) => ( <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>))}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="splitType" render={({ field }) => ( <FormItem className="space-y-2"><FormLabel>Split Method</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><RadioGroupItem value="even" id="split-even"/><FormLabel htmlFor="split-even" className="font-normal cursor-pointer">Split Evenly</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><RadioGroupItem value="custom" id="split-custom"/><FormLabel htmlFor="split-custom" className="font-normal cursor-pointer">Custom Amounts</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem> )} />
                <Controller control={form.control} name="splitWithMemberIds" render={({ field }) => ( <FormItem> <div className="mb-2 flex items-center justify-between"><div><FormLabel>Split With Whom?</FormLabel><FormDescription>Select members sharing this expense.</FormDescription></div><Button type="button" variant="outline" size="sm" onClick={() => handleSelectAllSplitMembers(!areAllMembersSelected)} disabled={availableMembersForSplitting.length === 0} className="ml-auto">{areAllMembersSelected ? <CheckSquare className="mr-2 h-4 w-4" /> : <Square className="mr-2 h-4 w-4" />}{areAllMembersSelected ? 'Deselect All' : 'Select All'}</Button></div> <ScrollArea className="h-32 w-full rounded-md border p-2">{availableMembersForSplitting.map((member) => ( <FormField key={member.id} control={form.control} name="splitWithMemberIds" render={({ field: checkboxField }) => ( <FormItem key={member.id} className="flex flex-row items-start space-x-3 space-y-0 py-2"><FormControl><Checkbox id={`split-${member.id}`} checked={checkboxField.value?.includes(member.id)} onCheckedChange={(checked) => checkboxField.onChange(checked ? [...(checkboxField.value || []), member.id] : (checkboxField.value || []).filter(id => id !== member.id))} /></FormControl><FormLabel htmlFor={`split-${member.id}`} className="text-sm font-normal cursor-pointer">{member.name}</FormLabel></FormItem> )} /> ))}</ScrollArea> <FormMessage /> {form.formState.errors.splitWithMemberIds?.message && <p className="text-sm font-medium text-destructive">{form.formState.errors.splitWithMemberIds?.message}</p>} </FormItem> )} />
                
                {watchedSplitType === 'custom' && customSplitFields.map((item, index) => (
                  <FormField key={item.fieldId} control={form.control} name={`customSplitAmounts.${index}.amount`} render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormLabel className="w-1/3 text-sm truncate" title={item.memberName || item.memberId}>{item.memberName || item.memberId}:</FormLabel>
                      <FormControl><Input type="number" placeholder="0.00" {...field} value={field.value ?? ""} step="0.01" className="flex-grow" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                ))}
                {watchedSplitType === 'custom' && watchedCustomSplitAmounts && watchedCustomSplitAmounts.length > 0 && (
                  <div className={cn(
                      "text-sm p-2 rounded-md mt-2 border",
                      Math.abs(customSplitDifference) > 0.005 ? "bg-destructive/10 border-destructive text-destructive" : "bg-accent/10 border-accent text-accent-foreground"
                    )}
                  >
                    <div className="flex justify-between">
                      <span>Total Custom Split:</span>
                      <span className="font-semibold">{DEFAULT_CURRENCY}{sumOfCustomSplits.toFixed(2)}</span>
                    </div>
                    {Math.abs(customSplitDifference) > 0.005 && (
                      <div className="flex justify-between items-center mt-1">
                        <span className="flex items-center"><AlertCircle className="h-4 w-4 mr-1"/> 
                          {customSplitDifference > 0 ? "Remaining to allocate:" : "Over-allocated by:"}
                        </span>
                        <span className="font-semibold">{DEFAULT_CURRENCY}{Math.abs(customSplitDifference).toFixed(2)}</span>
                      </div>
                    )}
                    {Math.abs(customSplitDifference) <= 0.005 && (
                       <div className="flex justify-between items-center mt-1 text-accent-foreground font-medium">
                        <span className="flex items-center"><Check className="h-4 w-4 mr-1 text-green-600"/> Total matches transaction amount.</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem> <FormLabel>Notes (Optional)</FormLabel> <FormControl><Textarea placeholder="Add relevant notes..." {...field} /></FormControl> <FormMessage /> </FormItem> )} />
        {isSuggestingNote && <div className="flex items-center text-sm text-muted-foreground"><MessageSquarePlus className="mr-2 h-4 w-4 animate-pulse" />Getting AI note suggestion...</div>}
        {aiNoteSuggestion && <Alert variant="default" className="bg-accent/20 border-accent/50"><MessageSquarePlus className="h-5 w-5 text-accent-foreground/80" /><AlertTitle className="text-accent-foreground/90 font-semibold">AI Note Suggestion</AlertTitle><AlertDescription className="text-accent-foreground/70">"{aiNoteSuggestion.suggestedNote}"{aiNoteSuggestion.reasoning && <span className="text-xs italic block mt-1">Reasoning: {aiNoteSuggestion.reasoning}</span>}</AlertDescription><Button type="button" size="sm" variant="ghost" className="mt-2 text-accent-foreground/80 hover:bg-accent/30" onClick={() => {form.setValue("notes", aiNoteSuggestion.suggestedNote, { shouldValidate: true }); setAiNoteSuggestion(null);}}><Edit className="mr-2 h-3 w-3" /> Apply Suggestion</Button></Alert>}
        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>}
          <Button type="submit" disabled={isSubmitting || isSuggestingCategory || isSuggestingNote}>{isSubmitting ? (transaction ? "Saving..." : "Adding...") : (transaction ? "Save Changes" : "Add Transaction")}</Button>
        </div>
      </form>
    </Form>
  );
}
    
