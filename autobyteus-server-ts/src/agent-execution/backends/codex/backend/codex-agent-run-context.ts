import type { RuntimeSkillProfile } from "../../shared/runtime-skill-profile.js";
import type { CodexThreadConfig } from "../thread/codex-thread-config.js";
import type { AgentRunContext as SharedAgentRunContext } from "../../../domain/agent-run-context.js";
import type { CodexDynamicToolHandlerMap } from "../codex-dynamic-tool.js";

export class CodexAgentRunContext {
  readonly privateSkillProfile: RuntimeSkillProfile | null;
  readonly codexThreadConfig: CodexThreadConfig;
  readonly dynamicToolHandlers: CodexDynamicToolHandlerMap;
  threadId: string | null;
  activeTurnId: string | null;

  constructor(input: {
    codexThreadConfig: CodexThreadConfig;
    privateSkillProfile?: RuntimeSkillProfile | null;
    dynamicToolHandlers?: CodexDynamicToolHandlerMap | null;
    threadId?: string | null;
    activeTurnId?: string | null;
  }) {
    this.privateSkillProfile = input.privateSkillProfile ?? null;
    this.codexThreadConfig = input.codexThreadConfig;
    this.dynamicToolHandlers = { ...(input.dynamicToolHandlers ?? {}) };
    this.threadId = input.threadId ?? null;
    this.activeTurnId = input.activeTurnId ?? null;
  }


}

export type CodexRunContext = SharedAgentRunContext<CodexAgentRunContext>;
