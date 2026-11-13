import type { RunWorkspaceSkills } from "../../shared/run-workspace-skills.js";
import type { CodexThreadConfig } from "../thread/codex-thread-config.js";
import type { AgentRunContext as SharedAgentRunContext } from "../../../domain/agent-run-context.js";
import type { CodexDynamicToolHandlerMap } from "../codex-dynamic-tool.js";
import {
  buildRuntimeAgentToolExposure,
  type RuntimeAgentToolExposure,
} from "../../../shared/runtime-agent-tool-exposure.js";

export class CodexAgentRunContext {
  readonly codexThreadConfig: CodexThreadConfig;
  /**
   * The run's workspace skill links, held from preparation to release (released only through it). Null only in a
   * restore binding that was not prepared yet: it holds no links.
   */
  readonly workspaceSkills: RunWorkspaceSkills | null;
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
    workspaceSkills: RunWorkspaceSkills | null;
    dynamicToolHandlers?: CodexDynamicToolHandlerMap | null;
    runtimeToolExposure?: RuntimeAgentToolExposure | null;
    threadId?: string | null;
    activeTurnId?: string | null;
  }) {
    this.codexThreadConfig = input.codexThreadConfig;
    this.workspaceSkills = input.workspaceSkills;
    this.dynamicToolHandlers = { ...(input.dynamicToolHandlers ?? {}) };
    this.runtimeToolExposure = input.runtimeToolExposure ?? buildRuntimeAgentToolExposure([]);
    this.threadId = input.threadId ?? null;
    this.activeTurnId = input.activeTurnId ?? null;
    this.hasConversationHistory = this.threadId !== null;
  }

  /** The holder of a prepared run's links; a restore binding that was not prepared has none. */
  requireWorkspaceSkills(): RunWorkspaceSkills {
    if (!this.workspaceSkills) throw new Error("Codex run context has no workspace skills: it was not prepared.");
    return this.workspaceSkills;
  }
}

export type CodexRunContext = SharedAgentRunContext<CodexAgentRunContext>;
