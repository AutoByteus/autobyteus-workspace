export type DistinctValueSummary<T extends string | number = string> =
  | Readonly<{ status: "unknown" }>
  | Readonly<{ status: "single"; value: T }>
  | Readonly<{ status: "mixed" }>;

export const unknownDistinctValue = <T extends string | number>(): DistinctValueSummary<T> => ({
  status: "unknown",
});

export const distinctValueFrom = <T extends string | number>(
  value: T | null | undefined,
): DistinctValueSummary<T> => value === null || value === undefined || value === ""
  ? unknownDistinctValue<T>()
  : { status: "single", value };

export const mergeDistinctValue = <T extends string | number>(
  left: DistinctValueSummary<T>,
  right: DistinctValueSummary<T>,
): DistinctValueSummary<T> => {
  if (left.status === "mixed" || right.status === "mixed") return { status: "mixed" };
  if (left.status === "unknown") return right;
  if (right.status === "unknown") return left;
  return left.value === right.value ? left : { status: "mixed" };
};

export const mergeDistinctValueWith = <T extends string | number>(
  current: DistinctValueSummary<T>,
  value: T | null | undefined,
): DistinctValueSummary<T> => mergeDistinctValue(current, distinctValueFrom(value));

export const distinctValueOrNull = <T extends string | number>(
  summary: DistinctValueSummary<T>,
): T | null => summary.status === "single" ? summary.value : null;

export const distinctValueLabel = (
  summary: DistinctValueSummary<string>,
  fallback = "Unknown",
): string => summary.status === "single" ? summary.value : summary.status === "mixed" ? "Mixed" : fallback;

