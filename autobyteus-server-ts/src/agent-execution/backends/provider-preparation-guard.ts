import type { RunWorkspaceSkills } from "./shared/run-workspace-skills.js";
import type { CodexAppServerClientLease } from "../../runtime-management/codex/client/codex-app-server-client-manager.js";

/** Bootstrap resources belong to the enclosing concrete factory from acquisition onward. */
export interface ProviderPreparationGuard {
  assertAccepting(): void;
  /** The run's workspace skill holder, created by the factory; the preparation acquires through it. */
  readonly workspaceSkills: RunWorkspaceSkills;
  ownCodexClient?(lease: CodexAppServerClientLease): void;
}
