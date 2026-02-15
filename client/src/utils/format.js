/**
 * South African locale formatting utilities
 * Currency: ZAR (R), Locale: en-ZA
 */

const LOCALE = 'en-ZA';
const CURRENCY = 'ZAR';

/**
 * Format a number as South African Rands (R)
 * e.g. formatCurrency(1234.5) => "R 1 234,50"
 */
export const formatCurrency = (value) => {
  const num = parseFloat(value) || 0;
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

/**
 * Format a date string to SA locale date
 * e.g. "2026-02-09" => "09/02/2026" (dd/mm/yyyy)
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString(LOCALE);
};

/**
 * Format a date string to SA locale date+time
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString(LOCALE);
};

/**
 * Format a date string to SA locale time
 */
export const formatTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
};

/**
 * Get the SA locale string (for chart/date pickers)
 */
export const SA_LOCALE = LOCALE;
