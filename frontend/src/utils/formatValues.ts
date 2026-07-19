const CURRENCY_FORMATTER = new Intl.NumberFormat(undefined, {
  currency: "PHP",
  style: "currency",
});

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US");

export function formatCurrency(value: number) {
  return CURRENCY_FORMATTER.format(value);
}

export function formatKilometers(value: number | null) {
  return value === null ? "No reading" : `${NUMBER_FORMATTER.format(value)} km`;
}

export function formatCount(value: number) {
  return NUMBER_FORMATTER.format(value);
}
