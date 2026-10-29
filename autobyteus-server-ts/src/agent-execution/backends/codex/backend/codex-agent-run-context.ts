import type { MaterializedWorkspaceSkill } from "../../shared/workspace-skill-materializer.js";
import type { CodexThreadConfig } from "../thread/codex-thread-config.js";
import type { CodexThreadCleanupTarget } from "./codex-thread-cleanup.js";
import type { AgentRunContext as SharedAgentRunContext } from "../../../domain/agent-run-context.js";
import type { CodexDynamicToolHandlerMap } from "../codex-dynamic-tool.js";
import {
  buildRuntimeAgentToolExposure,
  type RuntimeAgentToolExposure,
} from "../../../shared/runtime-agent-tool-exposure.js";

export class CodexAgentRunContext {
  readonly codexThreadConfig: CodexThreadConfig;
  readonly materializedConfiguredSkills: MaterializedWorkspaceSkill[];
  readonly dynamicToolHandlers: CodexDynamicToolHandlerMap;
  /** The Agent Tools exposure the run was last given (its definition's tools). */
  runtimeToolExposure: RuntimeAgentToolExposure;
  threadId: string | null;
  activeTurnId: string | null;
  /**
   * The thread has a conversation to resume: it was restored, or a turn was started on it. A
   * thread without one has no rollout yet, so a reopen starts a new thread instead.
   */
  hasConversationHistory: boolean;

  constructor(input: {
    codexThreadConfig: CodexThreadConfig;
    materializedConfiguredSkills?: MaterializedWorkspaceSkill[] | null;
    dynamicToolHandlers?: CodexDynamicToolHandlerMap | null;
    runtimeToolExposure?: RuntimeAgentToolExposure | null;
    threadId?: string | null;
    activeTurnId?: string | null;
  }) {
    this.codexThreadConfig = input.codexThreadConfig;
    this.materializedConfiguredSkills = input.materializedConfiguredSkills ?? [];
    this.dynamicToolHandlers = { ...(input.dynamicToolHandlers ?? {}) };
    this.runtimeToolExposure = input.runtimeToolExposure ?? buildRuntimeAgentToolExposure([]);
    this.threadId = input.threadId ?? null;
    this.activeTurnId = input.activeTurnId ?? null;
    this.hasConversationHistory = this.threadId !== null;
  }

  toCleanupTarget(): CodexThreadCleanupTarget {
    return {
      workingDirectory: this.codexThreadConfig.workingDirectory,
      materializedConfiguredSkills: this.materializedConfiguredSkills,
    };
  }
}

export type CodexRunContext = SharedAgentRunContext<CodexAgentRunContext>;
