'use server';

/**
 * @fileOverview An AI agent that suggests notes for a transaction based on its description.
 *
 * - suggestExpenseNotes - A function that suggests notes for a transaction.
 * - SuggestExpenseNotesInput - The input type for the suggestExpenseNotes function.
 * - SuggestExpenseNotesOutput - The return type for the suggestExpenseNotes function.
 */
// Note: "Expense" is kept in function/type names for now as it's specifically about expense-like details.
// If income notes were different, a separate flow might be better.

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestExpenseNotesInputSchema = z.object({
  description: z.string().describe('The description of the transaction.'),
  currentNotes: z.string().optional().describe('Any existing notes for the transaction.'),
});
export type SuggestExpenseNotesInput = z.infer<
  typeof SuggestExpenseNotesInputSchema
>;

const SuggestExpenseNotesOutputSchema = z.object({
  suggestedNote: z
    .string()
    .describe('The suggested note for the transaction.'),
  reasoning: z
    .string()
    .optional()
    .describe('The reasoning behind the note suggestion.'),
});
export type SuggestExpenseNotesOutput = z.infer<
  typeof SuggestExpenseNotesOutputSchema
>;

export async function suggestExpenseNotes(
  input: SuggestExpenseNotesInput
): Promise<SuggestExpenseNotesOutput> {
  return suggestExpenseNotesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestExpenseNotesPrompt',
  input: {schema: SuggestExpenseNotesInputSchema},
  output: {schema: SuggestExpenseNotesOutputSchema},
  prompt: `You are an intelligent assistant helping a user add notes to their financial transactions.
Given the transaction description, suggest a concise and relevant note.

Transaction Description: {{{description}}}

{{#if currentNotes}}
The user has already started writing these notes: {{{currentNotes}}}
Based on the description and existing notes, either refine or add to them, or suggest an alternative if the description implies something more specific.
{{else}}
Suggest a new note based on the description.
{{/if}}

Keep the suggested note brief, typically a few words to a short sentence.
Example: If description is "Coffee with Sarah", suggested note could be "Networking meeting" or "Catch up with friend".
If description is "Monthly Metro Pass", suggested note could be "Public transport subscription".
If description is "Client Payment - Project X", suggested note could be "Invoice #123 paid".
`,
});

const suggestExpenseNotesFlow = ai.defineFlow(
  {
    name: 'suggestExpenseNotesFlow',
    inputSchema: SuggestExpenseNotesInputSchema,
    outputSchema: SuggestExpenseNotesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);