import { buildTeamRuntimeCohortIdentity } from "../../../domain/team-runtime-cohort-identity.js";
import type { CodexRunContext } from "../backend/codex-agent-run-context.js";

export class CodexTeamThreadCohortCoordinator {
  resolveClientScopeKey(runContext: CodexRunContext): string {
    return buildTeamRuntimeCohortIdentity({
      provider: "codex",
      runId: runContext.runId,
      config: runContext.config,
      workingDirectory: runContext.runtimeContext.codexThreadConfig.workingDirectory,
    }).scopeKey;
  }
}

let cachedCoordinator: CodexTeamThreadCohortCoordinator | null = null;

export const getCodexTeamThreadCohortCoordinator = (): CodexTeamThreadCohortCoordinator => {
  if (!cachedCoordinator) {
    cachedCoordinator = new CodexTeamThreadCohortCoordinator();
  }
  return cachedCoordinator;
};
