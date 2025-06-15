
'use server';

/**
 * @fileOverview An AI agent that suggests notes for an expense based on its description.
 *
 * - suggestExpenseNotes - A function that suggests notes for an expense.
 * - SuggestExpenseNotesInput - The input type for the suggestExpenseNotes function.
 * - SuggestExpenseNotesOutput - The return type for the suggestExpenseNotes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestExpenseNotesInputSchema = z.object({
  description: z.string().describe('The description of the expense.'),
  currentNotes: z.string().optional().describe('Any existing notes for the expense.'),
});
export type SuggestExpenseNotesInput = z.infer<
  typeof SuggestExpenseNotesInputSchema
>;

const SuggestExpenseNotesOutputSchema = z.object({
  suggestedNote: z
    .string()
    .describe('The suggested note for the expense.'),
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
  prompt: `You are an intelligent assistant helping a user add notes to their expenses.
Given the expense description, suggest a concise and relevant note.

Expense Description: {{{description}}}

{{#if currentNotes}}
The user has already started writing these notes: {{{currentNotes}}}
Based on the description and existing notes, either refine or add to them, or suggest an alternative if the description implies something more specific.
{{else}}
Suggest a new note based on the description.
{{/if}}

Keep the suggested note brief, typically a few words to a short sentence.
Example: If description is "Coffee with Sarah", suggested note could be "Networking meeting" or "Catch up with friend".
If description is "Monthly Metro Pass", suggested note could be "Public transport subscription".
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
