import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function exportToCsv(filename: string, rows: (string | number | boolean | undefined)[][]) {
  const processCell = (cellValue: string | number | boolean | undefined): string => {
    const value = cellValue === undefined || cellValue === null ? '' : String(cellValue);
    // If the value contains a comma, newline, or double quote, enclose it in double quotes.
    // Also, any double quotes within the value must be escaped by another double quote.
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const processRow = (row: (string | number | boolean | undefined)[]): string => {
    return row.map(processCell).join(',');
  };

  // Add BOM for UTF-8 to ensure Excel opens it correctly with special characters
  const BOM = '\uFEFF';
  const csvContent = BOM + rows.map(processRow).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-char_set_8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
