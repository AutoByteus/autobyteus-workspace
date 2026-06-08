import type { AgentRunConfig } from "./agent-run-config.js";

const normalizePart = (value: string | null | undefined, fallback: string): string => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized.replace(/[^A-Za-z0-9_.:/-]+/g, "_") : fallback;
};

export type TeamRuntimeCohortIdentity = {
  provider: "codex" | "claude";
  teamRunId: string | null;
  memberRunId: string;
  workspaceKey: string;
  scopeKey: string;
};

export const buildTeamRuntimeCohortIdentity = (input: {
  provider: TeamRuntimeCohortIdentity["provider"];
  runId: string;
  config: AgentRunConfig;
  workingDirectory?: string | null;
}): TeamRuntimeCohortIdentity => {
  const memberTeamContext = input.config.memberTeamContext ?? null;
  const teamRunId = memberTeamContext?.teamRunId?.trim() || null;
  const memberRunId = normalizePart(memberTeamContext?.memberRunId ?? input.runId, input.runId);
  const workspaceKey = normalizePart(input.workingDirectory ?? input.config.workspaceId ?? "default", "default");
  const scopeKey = teamRunId
    ? `${input.provider}:team:${normalizePart(teamRunId, "team")}:workspace:${workspaceKey}`
    : `${input.provider}:agent-run:${normalizePart(input.runId, "run")}`;
  return {
    provider: input.provider,
    teamRunId,
    memberRunId,
    workspaceKey,
    scopeKey,
  };
};
