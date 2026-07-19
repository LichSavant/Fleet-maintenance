export function normalizeFilterValue(
  value: string | number | null | undefined,
) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase();
}

export function matchesSearch(
  search: string,
  values: readonly (string | number | null | undefined)[],
) {
  const query = normalizeFilterValue(search);
  return (
    !query ||
    values.some((value) => normalizeFilterValue(value).includes(query))
  );
}

export function matchesDateRange(value: string, from: string, to: string) {
  return (!from || value >= from) && (!to || value <= to);
}

function optionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function matchesNumberRange(value: number, from: string, to: string) {
  const minimum = optionalNumber(from);
  const maximum = optionalNumber(to);
  return (
    (minimum === undefined || value >= minimum) &&
    (maximum === undefined || value <= maximum)
  );
}
