const normalizeSegment = (value: string | null | undefined, fallback: string): string => {
  const normalized = typeof value === "string" ? value.trim() : "";
  const source = normalized.length > 0 ? normalized : fallback;
  const ascii = source.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const slug = ascii
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug.length > 0 ? slug : fallback.toLowerCase();
};

export const buildReadableAgentIdStem = (
  name: string | null | undefined,
  role: string | null | undefined,
): string => {
  const normalizedName = normalizeSegment(name, "Agent");
  const normalizedRole = normalizeSegment(role, "Agent");
  if (normalizedName === normalizedRole) {
    return normalizedName;
  }
  return `${normalizedName}_${normalizedRole}`;
};

export const generateReadableAgentId = (
  name: string | null | undefined,
  role: string | null | undefined,
): string => `${buildReadableAgentIdStem(name, role)}_${Math.floor(Math.random() * 9000) + 1000}`;
