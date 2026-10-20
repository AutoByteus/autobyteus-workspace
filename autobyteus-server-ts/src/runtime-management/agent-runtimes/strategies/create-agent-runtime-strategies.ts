import type { CodexAppServerClientManager } from "../../codex/client/codex-app-server-client-manager.js";
import type { AgentRuntimeStrategy } from "../agent-runtime-strategy.js";
import { createAntigravityAgentRuntimeStrategy } from "./antigravity-agent-runtime-strategy.js";
import { createClaudeAgentRuntimeStrategy } from "./claude-agent-runtime-strategy.js";
import { createCodexAgentRuntimeStrategy } from "./codex-agent-runtime-strategy.js";
import { createGrokAgentRuntimeStrategy } from "./grok-agent-runtime-strategy.js";

/** The four runtimes in page order: Codex, Claude, Antigravity, Grok. */
export const createAgentRuntimeStrategies = (dependencies: Readonly<{
  codexClientManager: Pick<CodexAppServerClientManager, "beginAcquire">;
}>): readonly AgentRuntimeStrategy[] => Object.freeze([
  createCodexAgentRuntimeStrategy(dependencies),
  createClaudeAgentRuntimeStrategy(),
  createAntigravityAgentRuntimeStrategy(),
  createGrokAgentRuntimeStrategy(),
]);
