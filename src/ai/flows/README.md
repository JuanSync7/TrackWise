# Genkit AI Flows (`/src/ai/flows`)

This directory contains the specific AI-driven workflows (flows) built using Genkit. Each file typically represents a distinct AI capability within the Trackwise application.

## Flow Structure

Each flow file (e.g., `suggest-expense-category.ts`) generally follows this pattern:

1.  **`'use server';` Directive**: Indicates that the module can be used in Next.js Server Components or Server Actions.
2.  **File Overview Docblock**: A JSDoc comment at the top explaining the purpose of the flow and its exported members.
3.  **Imports**:
    - `ai` from `../../genkit` (the initialized Genkit instance).
    - `z` from `genkit` (or `zod`) for schema definitions.
4.  **Input Schema Definition**:
    - A Zod schema defining the expected input structure for the flow.
    - An exported TypeScript type inferred from this schema (e.g., `SuggestExpenseCategoryInput`).
5.  **Output Schema Definition**:
    - A Zod schema defining the expected output structure from the flow.
    - An exported TypeScript type inferred from this schema (e.g., `SuggestExpenseCategoryOutput`).
6.  **Exported Wrapper Function**:
    - An `async` function that serves as the public interface to the flow. This function typically takes the input type and returns a Promise of the output type. It calls the Genkit flow internally.
7.  **Genkit Prompt Definition (`ai.definePrompt`)**:
    - Defines the prompt template that will be sent to the LLM.
    - Specifies its `name`, `input` schema, `output` schema, and the `prompt` string (using Handlebars templating).
    - May include `tools` if the prompt is designed to use function calling.
8.  **Genkit Flow Definition (`ai.defineFlow`)**:
    - Defines the main Genkit flow logic.
    - Specifies its `name`, `inputSchema`, and `outputSchema`.
    - The flow function itself (an `async` function) usually involves:
        - Calling the defined prompt.
        - Potentially performing pre-processing or post-processing steps.
        - Returning the output that matches the `outputSchema`.

## Current Flows

- **`suggest-expense-category.ts`**:
  - **Purpose**: Suggests an appropriate expense category for a given transaction description.
  - **Input**: Transaction description and a list of available categories.
  - **Output**: The suggested category name and the reasoning behind the suggestion.

- **`suggest-expense-notes.ts`**:
  - **Purpose**: Suggests relevant notes for a financial transaction based on its description and any existing notes.
  - **Input**: Transaction description and optional current notes.
  - **Output**: The suggested note and optional reasoning.

## Adding New Flows

To add a new AI capability:
1. Create a new `.ts` file in this directory (e.g., `analyze-spending-pattern.ts`).
2. Follow the structure outlined above.
3. Define your input/output schemas, prompt(s), and flow logic.
4. Export the main wrapper function and its input/output types.
5. Import the new flow file in `/src/ai/dev.ts` so it's registered with the Genkit development server.
```

