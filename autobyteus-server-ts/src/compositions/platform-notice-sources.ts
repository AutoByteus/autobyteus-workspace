import type { AgentDefinitionChangeSignal } from "../agent-definition/services/agent-definition-change-signal.js";
import type { AgentDefinitionService } from "../agent-definition/services/agent-definition-service.js";
import type { AgentRunPlatformNoticeSource } from "../agent-execution/domain/agent-run-platform-notices.js";
import { createBackgroundTaskNotices } from "../background-task-notices/background-task-notices.js";
import { createSkillUpdateNotices } from "../skill-update-notices/skill-update-notices.js";
import { createToolListUpdates } from "../tool-list-updates/tool-list-updates.js";

/** The platform notice subsystems both hosts run: tool list updates, skill notices and background task notices. */
export type PlatformNoticeSources = Readonly<{
  /** The notice sources in their slot order (one notice per input). */
  sources: readonly AgentRunPlatformNoticeSource[];
  /**
   * Stops them first at shutdown: tool list updates (no new passes, so no run is changed while runs stop), skill
   * notices (watcher, then service) and background task notices, so none go out while runs stop.
   */
  close(): Promise<void>;
}>;

export const createPlatformNoticeSources = (input: Readonly<{
  agentDefinitionService: Pick<AgentDefinitionService, "getAgentDefinitionById">;
  definitionChanges: Pick<AgentDefinitionChangeSignal, "subscribe">;
}>): PlatformNoticeSources => {
  const skillUpdateNotices = createSkillUpdateNotices({ agentDefinitionService: input.agentDefinitionService });
  const toolListUpdates = createToolListUpdates(input);
  const backgroundTaskNotices = createBackgroundTaskNotices();
  return Object.freeze({
    sources: Object.freeze([toolListUpdates.service, skillUpdateNotices.service, backgroundTaskNotices.service]),
    close: async () => {
      try { await toolListUpdates.close(); } catch (error) { console.warn("TOOL_LIST_UPDATES_CLOSE_FAILED", error); }
      try { await skillUpdateNotices.close(); } catch (error) { console.warn("SKILL_UPDATE_NOTICES_CLOSE_FAILED", error); }
      backgroundTaskNotices.close();
    },
  });
};
