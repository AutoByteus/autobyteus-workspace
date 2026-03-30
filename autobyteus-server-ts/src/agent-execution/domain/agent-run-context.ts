import type { AgentRunConfig } from "./agent-run-config.js";
import type { AgentContext } from "autobyteus-ts/agent/context/agent-context.js";
import type { ClaudeAgentRunContext } from "../backends/claude/backend/claude-agent-run-context.js";
import type { CodexAgentRunContext } from "../backends/codex/backend/codex-agent-run-context.js";

export type RuntimeAgentRunContext =
  | AgentContext
  | ClaudeAgentRunContext
  | CodexAgentRunContext
  | null;

export class AgentRunContext<TRuntimeContext> {
  readonly runId: string;
  readonly config: AgentRunConfig;
  readonly runtimeContext: TRuntimeContext;

  constructor(input: {
    runId: string;
    config: AgentRunConfig;
    runtimeContext: TRuntimeContext;
  }) {
    this.runId = input.runId;
    this.config = input.config;
    this.runtimeContext = input.runtimeContext;
  }
}
