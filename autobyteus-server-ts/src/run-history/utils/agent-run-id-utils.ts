const normalizeSegment = (value: string | null | undefined, fallback: string): string => {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
};

export const generateStandaloneAgentRunId = (
  agentName: string | null | undefined,
  agentRole: string | null | undefined,
): string =>
  `${normalizeSegment(agentName, "Agent")}_${normalizeSegment(agentRole, "Agent")}_${Math.floor(Math.random() * 9000) + 1000}`;
