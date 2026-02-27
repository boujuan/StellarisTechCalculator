/** Format a number as a percentage with one decimal place */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/** Format a weight value (round to nearest integer) */
export function formatWeight(value: number): string {
  return Math.round(value).toString();
}

/** Format a delta weight with sign */
export function formatDelta(value: number): string {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded}`;
  return rounded.toString();
}
