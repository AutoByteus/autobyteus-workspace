import type { MaterializedWorkspaceSkill } from "./shared/workspace-skill-materializer.js";
import type { CodexAppServerClientLease } from "../../runtime-management/codex/client/codex-app-server-client-manager.js";

/** Bootstrap resources belong to the enclosing concrete factory from acquisition onward. */
export interface ProviderPreparationGuard {
  assertAccepting(): void;
  ownSkill(skill: MaterializedWorkspaceSkill): void;
  ownCodexClient?(lease: CodexAppServerClientLease): void;
}
