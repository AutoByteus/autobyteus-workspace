import type { MaterializedCodexWorkspaceSkill } from "../codex-workspace-skill-materializer.js";
import type { CodexThreadConfig } from "../thread/codex-thread-config.js";
import type { CodexThreadCleanupTarget } from "./codex-thread-cleanup.js";
import type { AgentRunContext as SharedAgentRunContext } from "../../../domain/agent-run-context.js";
import type { CodexDynamicToolHandlerMap } from "../codex-dynamic-tool.js";

export class CodexAgentRunContext {
  readonly codexThreadConfig: CodexThreadConfig;
  readonly materializedConfiguredSkills: MaterializedCodexWorkspaceSkill[];
  readonly dynamicToolHandlers: CodexDynamicToolHandlerMap;
  threadId: string | null;
  activeTurnId: string | null;

  constructor(input: {
    codexThreadConfig: CodexThreadConfig;
    materializedConfiguredSkills?: MaterializedCodexWorkspaceSkill[] | null;
    dynamicToolHandlers?: CodexDynamicToolHandlerMap | null;
    threadId?: string | null;
    activeTurnId?: string | null;
  }) {
    this.codexThreadConfig = input.codexThreadConfig;
    this.materializedConfiguredSkills = input.materializedConfiguredSkills ?? [];
    this.dynamicToolHandlers = { ...(input.dynamicToolHandlers ?? {}) };
    this.threadId = input.threadId ?? null;
    this.activeTurnId = input.activeTurnId ?? null;
  }

  toCleanupTarget(): CodexThreadCleanupTarget {
    return {
      workingDirectory: this.codexThreadConfig.workingDirectory,
      materializedConfiguredSkills: this.materializedConfiguredSkills,
    };
  }
}

export type CodexRunContext = SharedAgentRunContext<CodexAgentRunContext>;
