const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

export function formatDate(value: string) {
  return DATE_FORMATTER.format(new Date(value));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
