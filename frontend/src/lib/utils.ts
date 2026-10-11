export function money(value: number) {
  const currency = process.env.NEXT_PUBLIC_CURRENCY;
  if (currency) return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export function shortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

export function monthLabel(year: number, month: number, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(undefined, { month: options?.month ?? 'short', ...(options || {}), timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

export function currentMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}
