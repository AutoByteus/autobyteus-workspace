import type {
  AgentToolMcpRunSessionReleaser,
} from "../../src/agent-tools/mcp/agent-tool-mcp-session-authority.js";
import type {
  AgentToolMcpSessionOwnerIdentity,
} from "../../src/agent-tools/mcp/agent-tool-mcp-session.js";

export function createNoopAgentToolMcpRunSessionReleaser():
AgentToolMcpRunSessionReleaser {
  return Object.freeze({
    revokeForRun: (_runId: string) => 0,
    revokeForOwner: (_owner: Partial<AgentToolMcpSessionOwnerIdentity>) => 0,
  });
}

export function createRecordingAgentToolMcpRunSessionReleaser(): Readonly<{
  releaser: AgentToolMcpRunSessionReleaser;
  getRevokedRunIds(): readonly string[];
  getRevokedOwners(): readonly Readonly<Partial<AgentToolMcpSessionOwnerIdentity>>[];
}> {
  const revokedRunIds: string[] = [];
  const revokedOwners: Readonly<Partial<AgentToolMcpSessionOwnerIdentity>>[] = [];
  const releaser = Object.freeze<AgentToolMcpRunSessionReleaser>({
    revokeForRun: (runId) => {
      revokedRunIds.push(runId);
      return 0;
    },
    revokeForOwner: (owner) => {
      revokedOwners.push(Object.freeze({ ...owner }));
      return 0;
    },
  });
  return Object.freeze({
    releaser,
    getRevokedRunIds: () => Object.freeze([...revokedRunIds]),
    getRevokedOwners: () => Object.freeze([...revokedOwners]),
  });
}
