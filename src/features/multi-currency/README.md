# Feature: Multi-Currency Support (`/src/features/multi-currency`)

This feature module will add support for handling financial data in multiple currencies within the Trackwise application.

## Purpose

- Allow users to record transactions in different currencies.
- Enable users to set a primary/default currency for overview reporting.
- Store exchange rates (manually entered or fetched from an API) for conversion.
- Convert amounts to the primary currency for consolidated reports and summaries.

## Planned Components/Services (Placeholders)

- **`/contexts`**:
  - `currency-context.tsx`: A React Context to manage:
    - User's primary currency.
    - A list of available currencies.
    - Exchange rates (potentially with historical data).
    - Functions to fetch/update exchange rates.
- **`/components`**:
  - `CurrencySelector.tsx`: A dropdown or selection component for choosing currencies in forms or settings.
  - `CurrencyInput.tsx`: An input component that can handle amount input along with currency selection.
- **`/utils`**:
  - `currency-converter.ts`: Utility functions for converting amounts between currencies based on stored exchange rates.
- **`/services`**:
  - `exchange-rate-service.ts` (Optional): If fetching rates from an external API, this service would handle those calls.

## Challenges

- Managing historical exchange rates for accurate reporting of past transactions.
- UI/UX for inputting amounts in different currencies.
- Clear display of converted amounts vs. original currency amounts.
```

