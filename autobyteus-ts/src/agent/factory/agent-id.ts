const normalizeSegment = (value: string | null | undefined, fallback: string): string => {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
};

export const generateReadableAgentId = (
  name: string | null | undefined,
  role: string | null | undefined,
): string =>
  `${normalizeSegment(name, "Agent")}_${normalizeSegment(role, "Agent")}_${Math.floor(Math.random() * 9000) + 1000}`;
