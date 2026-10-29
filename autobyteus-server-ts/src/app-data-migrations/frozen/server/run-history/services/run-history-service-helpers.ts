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
  compactSummary,
  extractSummaryFromRawTraces,

};
