import { buildTeamRuntimeCohortIdentity } from "../../../domain/team-runtime-cohort-identity.js";
import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";

export type ClaudeTeamSessionCohortRegistration = {
  runId: string;
  cohortKey: string;
  teamRunId: string | null;
};

export class ClaudeTeamSessionCohortCoordinator {
  private readonly registrationsByRunId = new Map<string, ClaudeTeamSessionCohortRegistration>();

  registerSession(runContext: ClaudeRunContext): ClaudeTeamSessionCohortRegistration {
    const identity = buildTeamRuntimeCohortIdentity({
      provider: "claude",
      runId: runContext.runId,
      config: runContext.config,
      workingDirectory: runContext.runtimeContext.sessionConfig.workingDirectory,
    });
    const registration: ClaudeTeamSessionCohortRegistration = {
      runId: runContext.runId,
      cohortKey: identity.scopeKey,
      teamRunId: identity.teamRunId,
    };
    this.registrationsByRunId.set(runContext.runId, registration);
    return registration;
  }

  unregisterSession(runId: string): void {
    this.registrationsByRunId.delete(runId.trim());
  }

  listCohortRunIds(cohortKey: string): string[] {
    const normalized = cohortKey.trim();
    return [...this.registrationsByRunId.values()]
      .filter((registration) => registration.cohortKey === normalized)
      .map((registration) => registration.runId);
  }

  resolveCohortKey(runId: string): string | null {
    return this.registrationsByRunId.get(runId.trim())?.cohortKey ?? null;
  }
}

let cachedCoordinator: ClaudeTeamSessionCohortCoordinator | null = null;

export const getClaudeTeamSessionCohortCoordinator = (): ClaudeTeamSessionCohortCoordinator => {
  if (!cachedCoordinator) {
    cachedCoordinator = new ClaudeTeamSessionCohortCoordinator();
  }
  return cachedCoordinator;
};
