import { randomUUID } from "node:crypto";

const DEFAULT_IDENTITY_SLUG = "agent";
const IDENTITY_SLUG_MAX_LENGTH = 48;

export const normalizeIdentityNameSlug = (
  value: string | null | undefined,
  fallback = DEFAULT_IDENTITY_SLUG,
): string => {
  const normalizedFallback = fallback.trim() || DEFAULT_IDENTITY_SLUG;
  const slug = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, IDENTITY_SLUG_MAX_LENGTH)
    .replace(/_+$/g, "");
  return slug || normalizedFallback;
};

export const createUuidIdentityToken = (): string => randomUUID().replace(/-/g, "");

export const generateAgentRunIdForDefinitionName = (
  agentDefinitionName: string | null | undefined,
  token: string = createUuidIdentityToken(),
): string => {
  const normalizedToken = token.trim().replace(/-/g, "").toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(normalizedToken)) {
    throw new Error("Agent run identity token must be a 32-character hexadecimal UUID token.");
  }
  return `${normalizeIdentityNameSlug(agentDefinitionName)}_${normalizedToken}`;
};

export const normalizeStoredAgentRunId = (runId: string): string => {
  const normalized = runId.trim();
  if (!normalized) {
    throw new Error("agentRunId is required.");
  }
  if (normalized.includes("\0")) {
    throw new Error("agentRunId is invalid.");
  }
  return normalized;
};
