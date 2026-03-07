const compactSummary = (value: string | null): string => {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  if (normalized.length <= 100) {
    return normalized;
  }
  return `${normalized.slice(0, 97)}...`;
};

const parseStatus = (value: unknown): "ACTIVE" | "IDLE" | "ERROR" | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.toUpperCase();
  if (normalized.includes("IDLE") || normalized.includes("SHUTDOWN")) {
    return "IDLE";
  }
  if (normalized.includes("ERROR") || normalized.includes("FAIL")) {
    return "ERROR";
  }
  if (normalized.includes("UNINITIALIZED")) {
    return "IDLE";
  }
  if (normalized.includes("RUN") || normalized.includes("ACTIVE") || normalized.includes("THINK")) {
    return "ACTIVE";
  }
  if (normalized.length > 0) {
    return "ACTIVE";
  }
  return null;
};

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const extractSummaryFromRawTraces = (
  active: Array<Record<string, unknown>>,
  archive: Array<Record<string, unknown>>,
): string => {
  const traces = [...archive, ...active].sort((a, b) => {
    const tsA = Number(a.ts ?? 0);
    const tsB = Number(b.ts ?? 0);
    return tsA - tsB;
  });
  for (const trace of traces) {
    if (trace.trace_type !== "user") {
      continue;
    }
    if (typeof trace.content === "string" && trace.content.trim()) {
      return compactSummary(trace.content);
    }
  }
  return "";
};

export {
  asObject,
  compactSummary,
  extractSummaryFromRawTraces,
  parseStatus,
};
