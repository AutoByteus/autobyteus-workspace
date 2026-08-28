import { AgentRunMemoryRecorder } from "../../src/agent-memory/services/agent-run-memory-recorder.js";
import { AgentRunActivationRegistry } from "../../src/agent-execution/runtime/agent-run-activation-registry.js";
import { AgentRunResourceManager } from "../../src/agent-execution/services/agent-run-resource-manager.js";
import type { AgentToolMcpRunSessionDeactivator } from "../../src/agent-tools/mcp/agent-tool-mcp-session-authority.js";

export const createAgentRunManagerInfrastructureFixture = (input: Readonly<{
  agentToolMcpRunSessionDeactivator: AgentToolMcpRunSessionDeactivator;
}>) => {
  const memoryRecorder = new AgentRunMemoryRecorder();
  const resourceManager = new AgentRunResourceManager({
    runSessions: input.agentToolMcpRunSessionDeactivator,
    runFileChangeService: { attachToRun: () => () => undefined },
    publishedArtifactRelayService: { attachToRun: () => () => undefined },
    memoryRecorder,
  });
  return Object.freeze({
    activationRegistry: new AgentRunActivationRegistry(resourceManager),
    memoryRecorder,
    providerInputNormalizer: Object.freeze({
      normalizeForProvider: <T>(dispatch: T): T => dispatch,
    }),
  });
};
