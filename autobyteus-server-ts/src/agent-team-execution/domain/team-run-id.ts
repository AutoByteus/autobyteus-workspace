import { randomUUID } from "node:crypto";

const TEAM_RUN_SLUG_MAX_LENGTH = 48;

const normalizeTeamDefinitionNameSlug = (value: string | null | undefined): string => {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, TEAM_RUN_SLUG_MAX_LENGTH)
    .replace(/_+$/g, "");
  return slug || "team";
};

export const generateTeamRunIdForDefinitionName = (
  teamDefinitionName: string | null | undefined,
  token: string = randomUUID().replace(/-/g, ""),
): string => {
  const normalizedToken = token.trim().replace(/-/g, "").toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(normalizedToken)) {
    throw new Error("Team run identity token must be a 32-character hexadecimal UUID token.");
  }
  return `${normalizeTeamDefinitionNameSlug(teamDefinitionName)}_${normalizedToken}`;
};
