import type {
  AgentToolMcpRunSessionDeactivator,
} from "../../src/agent-tools/mcp/agent-tool-mcp-session-authority.js";

export function createNoopAgentToolMcpRunSessionDeactivator():
AgentToolMcpRunSessionDeactivator {
  return Object.freeze({
    deactivateForRun: (_runId: string) => 0,
  });
}

export function createRecordingAgentToolMcpRunSessionDeactivator(): Readonly<{
  deactivator: AgentToolMcpRunSessionDeactivator;
  getDeactivatedRunIds(): readonly string[];
}> {
  const deactivatedRunIds: string[] = [];
  const deactivator = Object.freeze<AgentToolMcpRunSessionDeactivator>({
    deactivateForRun: (runId) => {
      deactivatedRunIds.push(runId);
      return 0;
    },
  });
  return Object.freeze({
    deactivator,
    getDeactivatedRunIds: () => Object.freeze([...deactivatedRunIds]),
  });
}
