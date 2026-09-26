import type { ClaudeSession } from "./claude-session.js";
import {
  getClaudeWorkspaceSkillMaterializer,
} from "../claude-workspace-skill-materializer.js";
import type { WorkspaceSkillMaterializer } from "../../shared/workspace-skill-materializer.js";

export type ClaudeSessionCleanupTarget = {
  session: ClaudeSession;
  cancelPendingToolApprovalsReason?: string;
};

export class ClaudeSessionCleanup {
  constructor(
    private readonly workspaceSkillMaterializer: WorkspaceSkillMaterializer = getClaudeWorkspaceSkillMaterializer(),
  ) {}

  /** Closes the run's Claude process (and its background tasks), then releases run resources. */
  async cleanupSessionResources(input: ClaudeSessionCleanupTarget): Promise<void> {
    await input.session.closeProcess(
      input.cancelPendingToolApprovalsReason ?? "Tool approval cancelled because run was closed.",
    );
    input.session.clearRuntimeListeners();
    await this.workspaceSkillMaterializer.cleanupMaterializedWorkspaceSkills(
      input.session.runContext.runtimeContext.materializedConfiguredSkills,
    );
  }
}
