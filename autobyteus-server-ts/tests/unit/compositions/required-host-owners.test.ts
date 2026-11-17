import { describe, expect, it } from "vitest";
import { requireGeneralProcessRunSupervisorInput } from "../../../src/agent-execution/runtime/general-process-run-supervisor-input.js";
import { createAgentToolsMcpHost } from "../../../src/agent-tools/mcp/agent-tools-mcp-host.js";
import { AgentToolMcpCatalog } from "../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { AgentRunService } from "../../../src/agent-execution/services/agent-run-service.js";
import { getProjectTaskService } from "../../../src/projects/services/project-task-service.js";
import { REMOTE_COLLABORATION_OFF_DISCOVERY } from "../../../src/agent-tools/agent-discovery/agent-discovery-refusal.js";
import { APPLICATION_HOST_STANDALONE_RUNS } from "../../../src/agent-execution/services/standalone-run-ports.js";
import { NO_PEER_CHANNEL, OFF_DISCOVERY } from "../../helpers/explicit-host-collaborators.js";

/**
 * autobyteus-500 FU-011, FU-018 (REQ-004, REQ-005, AC-002): a host's owners are passed in, and a composition with one
 * missing fails at start with the owner named. "Off" and "not eligible" are explicit values a host passes.
 */
describe("required host owners", () => {
  it("the run supervisor names a missing remoteChannel or peerDiscovery", () => {
    expect(() => requireGeneralProcessRunSupervisorInput({ peerDiscovery: OFF_DISCOVERY } as never)).toThrow("remoteChannel");
    expect(() => requireGeneralProcessRunSupervisorInput({ remoteChannel: NO_PEER_CHANNEL } as never)).toThrow("peerDiscovery");
  });

  it("the Agent Tools MCP host and its catalog need the host's discovery and adapters", () => {
    expect(() => createAgentToolsMcpHost({ loggingConfig: {} as never } as never)).toThrow("peer discovery");
    expect(() => new AgentToolMcpCatalog({})).toThrow("adapters or providers");
  });

  it("AgentRunService needs its standalone runs; an application scope passes its explicit 'not eligible' port", async () => {
    expect(() => new AgentRunService("/tmp/none", { lifecycleService: {} as never, agentRunManager: {} as never } as never)).toThrow("standaloneRuns");
    await expect(APPLICATION_HOST_STANDALONE_RUNS.stopRoot("run")).resolves.toBeNull();
    await expect(APPLICATION_HOST_STANDALONE_RUNS.postUserMessage({} as never)).resolves.toBeNull();
  });

  it("the Task service is the composition's: asked before it, it fails instead of answering unbound", () => {
    expect(() => getProjectTaskService()).toThrow("created by the composition");
  });

  it("a host without remote collaboration answers the discovery tools with the 'turned off' refusal", async () => {
    await expect(REMOTE_COLLABORATION_OFF_DISCOVERY.listPeerNodes()).resolves.toMatchObject({ accepted: false, code: "REMOTE_COLLABORATION_OFF" });
    await expect(REMOTE_COLLABORATION_OFF_DISCOVERY.listAvailableAgents("beta")).resolves.toMatchObject({ code: "REMOTE_COLLABORATION_OFF" });
  });
});
