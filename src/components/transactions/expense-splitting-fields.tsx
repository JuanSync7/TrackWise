
"use client";

import React from 'react'; // Ensure React is imported
import type { Control, UseFormSetValue, UseFormGetValues, FieldErrors } from "react-hook-form";
import { Controller, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Check, CheckSquare, CircleDollarSign, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TransactionFormValues } from "./transaction-form"; // Assuming this type is exported
import type { Member, TripMember, CustomSplitAmount } from '@/lib/types';
import { POT_PAYER_ID, DEFAULT_CURRENCY } from '@/lib/constants';

type MemberLike = { id: string; name: string };

interface ExpenseSplittingFieldsProps {
  control: Control<TransactionFormValues>;
  setValue: UseFormSetValue<TransactionFormValues>;
  getValues: UseFormGetValues<TransactionFormValues>;
  errors: FieldErrors<TransactionFormValues>;
  watchedIsSplit: boolean;
  watchedSplitType?: 'even' | 'custom';
  watchedAmount: number;
  watchedCustomSplitAmounts?: CustomSplitAmount[];
  watchedSplitWithMemberIds: string[];
  availableMembersForSplitting: MemberLike[];
  allowPotPayer: boolean;
  currentUserIdForDefaultPayer?: string;
}

export function ExpenseSplittingFields({
  control,
  setValue,
  getValues,
  errors,
  watchedIsSplit,
  watchedSplitType,
  watchedAmount,
  watchedCustomSplitAmounts,
  watchedSplitWithMemberIds,
  availableMembersForSplitting,
  allowPotPayer,
  currentUserIdForDefaultPayer,
}: ExpenseSplittingFieldsProps) {

  const { fields: customSplitFields, replace: replaceCustomSplits } = useFieldArray({
    control: control,
    name: "customSplitAmounts",
    keyName: "fieldId"
  });

  React.useEffect(() => {
    if (watchedIsSplit) {
        if (!getValues("splitType")) {
            setValue("splitType", "even");
        }
         const currentPaidBy = getValues("paidByMemberId");
        if (!currentPaidBy) {
            if (allowPotPayer) {
                setValue("paidByMemberId", POT_PAYER_ID, {shouldValidate: true});
            } else if (currentUserIdForDefaultPayer && availableMembersForSplitting.some(m => m.id === currentUserIdForDefaultPayer)) {
                setValue("paidByMemberId", currentUserIdForDefaultPayer, { shouldValidate: true });
            } else if (availableMembersForSplitting.length > 0) {
                setValue("paidByMemberId", availableMembersForSplitting[0].id, { shouldValidate: true });
            }
        }
        const currentSplitIds = getValues("splitWithMemberIds");
        if ((!currentSplitIds || currentSplitIds.length === 0) && availableMembersForSplitting.length > 0) {
            setValue("splitWithMemberIds", availableMembersForSplitting.map(m => m.id), { shouldValidate: true });
        }
    } else {
        setValue("splitType", undefined);
        setValue("customSplitAmounts", []);
        setValue("paidByMemberId", undefined);
        setValue("splitWithMemberIds", []);
    }
  }, [watchedIsSplit, setValue, getValues, allowPotPayer, currentUserIdForDefaultPayer, availableMembersForSplitting]);


  React.useEffect(() => {
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
      
      const currentCustomSplitMembers = getValues("customSplitAmounts")?.map(cs => cs.memberId).sort().join(',') || "";
      const newCustomSplitMembers = newCustomSplits.map(cs => cs.memberId).sort().join(',');

      if (newCustomSplitMembers !== currentCustomSplitMembers || newCustomSplits.length !== getValues("customSplitAmounts")?.length) {
        replaceCustomSplits(newCustomSplits);
      }

    } else if (watchedIsSplit && watchedSplitType === 'even') {
      if (getValues("customSplitAmounts")?.length > 0) {
        replaceCustomSplits([]);
      }
    }
  }, [watchedSplitWithMemberIds, watchedSplitType, watchedIsSplit, replaceCustomSplits, getValues, availableMembersForSplitting, watchedCustomSplitAmounts]);

  const sumOfCustomSplits = React.useMemo(() => {
    if (watchedSplitType === 'custom' && watchedCustomSplitAmounts) {
      return watchedCustomSplitAmounts.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    }
    return 0;
  }, [watchedCustomSplitAmounts, watchedSplitType]);

  const customSplitDifference = React.useMemo(() => {
    if (watchedSplitType === 'custom') {
      return parseFloat((watchedAmount - sumOfCustomSplits).toFixed(2));
    }
    return 0;
  }, [watchedAmount, sumOfCustomSplits, watchedSplitType]);

  const handleSelectAllSplitMembers = (checked: boolean) => {
    setValue("splitWithMemberIds", checked ? availableMembersForSplitting.map(m => m.id) : [], { shouldValidate: true });
  };
  const areAllMembersSelected = availableMembersForSplitting.length > 0 && watchedSplitWithMemberIds?.length === availableMembersForSplitting.length;


  if (!watchedIsSplit || availableMembersForSplitting.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 p-4 border rounded-md bg-muted/40">
      <FormField
        control={control}
        name="paidByMemberId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Who Paid?</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || ""}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select payer" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {allowPotPayer && (
                  <SelectItem value={POT_PAYER_ID}>
                    <div className="flex items-center gap-2">
                      <CircleDollarSign className="h-4 w-4 text-primary"/>Paid from Pot / Communal Fund
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

      <FormField
        control={control}
        name="splitType"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel>Split Method</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="flex space-x-4"
              >
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <RadioGroupItem value="even" id="split-even-radio"/>
                  <FormLabel htmlFor="split-even-radio" className="font-normal cursor-pointer">Split Evenly</FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <RadioGroupItem value="custom" id="split-custom-radio"/>
                  <FormLabel htmlFor="split-custom-radio" className="font-normal cursor-pointer">Custom Amounts</FormLabel>
                </FormItem>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <Controller
        control={control}
        name="splitWithMemberIds"
        render={({ field }) => (
          <FormItem>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <FormLabel>Split With Whom?</FormLabel>
                <FormDescription>Select members sharing this expense.</FormDescription>
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
            <ScrollArea className="h-32 w-full rounded-md border p-2 bg-background">
              {availableMembersForSplitting.map((member) => (
                <FormField
                  key={member.id}
                  control={control}
                  name="splitWithMemberIds"
                  render={({ field: checkboxField }) => (
                    <FormItem
                      key={member.id}
                      className="flex flex-row items-start space-x-3 space-y-0 py-2"
                    >
                      <FormControl>
                        <Checkbox
                          id={`split-member-${member.id}`}
                          checked={checkboxField.value?.includes(member.id)}
                          onCheckedChange={(checked) =>
                            checkboxField.onChange(
                              checked
                                ? [...(checkboxField.value || []), member.id]
                                : (checkboxField.value || []).filter((id) => id !== member.id)
                            )
                          }
                        />
                      </FormControl>
                      <FormLabel htmlFor={`split-member-${member.id}`} className="text-sm font-normal cursor-pointer">
                        {member.name}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </ScrollArea>
            <FormMessage />
            {errors.splitWithMemberIds?.message && (
              <p className="text-sm font-medium text-destructive">{errors.splitWithMemberIds?.message}</p>
            )}
          </FormItem>
        )}
      />

      {watchedSplitType === 'custom' && customSplitFields.map((item, index) => (
        <FormField
          key={item.fieldId}
          control={control}
          name={`customSplitAmounts.${index}.amount`}
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormLabel className="w-1/3 text-sm truncate" title={item.memberName || item.memberId}>
                {item.memberName || item.memberId}:
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0.00"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  step="0.01"
                  className="flex-grow"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
      
      {watchedSplitType === 'custom' && watchedCustomSplitAmounts && watchedCustomSplitAmounts.length > 0 && (
        <div
          className={cn(
            "text-sm p-2 rounded-md mt-2 border",
            Math.abs(customSplitDifference) > 0.005
              ? "bg-destructive/10 border-destructive text-destructive-foreground"
              : "bg-accent/10 border-accent text-accent-foreground"
          )}
        >
          <div className="flex justify-between">
            <span>Total Custom Split:</span>
            <span className="font-semibold">{DEFAULT_CURRENCY}{sumOfCustomSplits.toFixed(2)}</span>
          </div>
          {Math.abs(customSplitDifference) > 0.005 && (
            <div className="flex justify-between items-center mt-1">
              <span className="flex items-center">
                <AlertCircle className="h-4 w-4 mr-1"/> 
                {customSplitDifference > 0 ? "Remaining to allocate:" : "Over-allocated by:"}
              </span>
              <span className="font-semibold">{DEFAULT_CURRENCY}{Math.abs(customSplitDifference).toFixed(2)}</span>
            </div>
          )}
          {Math.abs(customSplitDifference) <= 0.005 && (
            <div className="flex justify-between items-center mt-1 font-medium text-accent-foreground">
                <span className="flex items-center"><Check className="h-4 w-4 mr-1 text-green-600"/> Total matches transaction amount.</span>
            </div>
          )}
        </div>
      )}
       {errors.customSplitAmounts?.message && (
          <p className="text-sm font-medium text-destructive">{errors.customSplitAmounts?.message}</p>
        )}
    </div>
  );
}
