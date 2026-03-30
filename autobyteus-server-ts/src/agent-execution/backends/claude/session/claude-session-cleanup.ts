import type { ClaudeSessionToolUseCoordinator } from "./claude-session-tool-use-coordinator.js";
import type { ClaudeSession } from "./claude-session.js";
import {
  getClaudeWorkspaceSkillMaterializer,
  type ClaudeWorkspaceSkillMaterializer,
} from "../claude-workspace-skill-materializer.js";
import type { ClaudeSdkQueryLike } from "../../../../runtime-management/claude/client/claude-sdk-client.js";

export type ClaudeSessionCleanupTarget = {
  runId: string;
  session: ClaudeSession;
  activeQueriesByRunId: Map<string, ClaudeSdkQueryLike>;
  cancelPendingToolApprovalsReason?: string;
};

export class ClaudeSessionCleanup {
  constructor(
    private readonly toolUseCoordinator: ClaudeSessionToolUseCoordinator,
    private readonly workspaceSkillMaterializer: ClaudeWorkspaceSkillMaterializer = getClaudeWorkspaceSkillMaterializer(),
  ) {}

  async cleanupSessionResources(input: ClaudeSessionCleanupTarget): Promise<void> {
    input.session.activeAbortController?.abort();
    this.toolUseCoordinator.clearPendingToolApprovals(
      input.runId,
      input.cancelPendingToolApprovalsReason ?? "Tool approval cancelled because run was closed.",
    );
    // Let any resumed canUseTool callbacks flush their deny response before the SDK transport closes.
    await Promise.resolve();
    input.session.clearRuntimeListeners();
    await this.workspaceSkillMaterializer.cleanupMaterializedClaudeWorkspaceSkills(
      input.session.runContext.runtimeContext.materializedConfiguredSkills,
    );
    const query = input.activeQueriesByRunId.get(input.runId);
    try {
      query?.close();
    } catch {
      // best-effort cleanup
    } finally {
      input.activeQueriesByRunId.delete(input.runId);
    }
  }
}
