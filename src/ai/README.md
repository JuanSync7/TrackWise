# AI Integration (`/src/ai`)

This directory is responsible for all Artificial Intelligence (AI) related functionalities within the Trackwise application, primarily utilizing the Genkit framework.

## Structure

- **`/flows`**:
  - Contains individual Genkit flow definitions. Each flow typically encapsulates a specific AI-driven task.
  - Examples:
    - `suggest-expense-category.ts`: A flow that suggests an appropriate expense category based on a transaction description.
    - `suggest-expense-notes.ts`: A flow that suggests relevant notes for a transaction.
  - See `/src/ai/flows/README.md` for more details on how flows are structured.

- **`genkit.ts`**:
  - This is the main configuration file for Genkit.
  - It initializes the Genkit instance, configures plugins (e.g., `googleAI`), and sets the default model (e.g., `googleai/gemini-2.0-flash`).
  - The exported `ai` object is used throughout the AI flows to define prompts, flows, tools, etc.

- **`dev.ts`**:
  - This file is the entry point for the Genkit development server.
  - It imports all the defined flows so that they are registered with Genkit when the development server starts.
  - The Genkit CLI uses this file (e.g., `genkit start -- tsx src/ai/dev.ts`).

## Genkit Usage

Trackwise uses Genkit to interact with Large Language Models (LLMs) for features like:
- Suggesting expense categories.
- Suggesting transaction notes.
- Potentially other future features like financial advice, spending pattern analysis, etc.

**Key Genkit Concepts Used:**

- **`ai.defineFlow(...)`**: Defines a sequence of operations, often including calls to LLMs.
- **`ai.definePrompt(...)`**: Defines a reusable prompt template that can be fed to an LLM. Prompts use Handlebars templating.
- **`ai.defineTool(...)`**: Defines functions (tools) that the LLM can choose to call to get more information or perform actions.
- **Zod Schemas (`zod`)**: Used to define the expected input and output structures for flows and prompts, ensuring type safety and providing structure for the LLM.
- **Plugins (e.g., `@genkit-ai/googleai`)**: Connect Genkit to specific AI model providers.

For detailed instructions on Genkit usage and syntax specific to this project (especially v1.x changes), refer to the main guidelines provided to the AI Prototyper.
```

