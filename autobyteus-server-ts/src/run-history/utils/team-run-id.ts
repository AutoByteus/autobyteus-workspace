import { randomUUID } from "node:crypto";

export function normalizeTeamRunLabel(teamLabel: string | null | undefined): string {
  const rawLabel =
    typeof teamLabel === "string" && teamLabel.trim().length > 0 ? teamLabel.trim() : "unnamed-team";
  const slug = rawLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug.length > 0 ? slug : "unnamed-team";
}

export function generateTeamRunId(teamLabel: string | null | undefined): string {
  return `team_${normalizeTeamRunLabel(teamLabel)}_${randomUUID().replace(/-/g, "").slice(0, 8)}`;
}
