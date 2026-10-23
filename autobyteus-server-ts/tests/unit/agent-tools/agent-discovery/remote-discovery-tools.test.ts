import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { availableCollaboratorEntry } from "../../../../src/agent-collaboration/collaborators/available-collaborator-entry.js";
import {
  bindProcessRemoteDiscoveryChannel,
  releaseProcessRemoteDiscoveryChannel,
  type RemoteDiscoveryChannel,
} from "../../../../src/agent-collaboration/execution/remote/remote-discovery-channel.js";
import {
  LIST_AVAILABLE_AGENTS_NODE_DESCRIPTION,
  LIST_AVAILABLE_AGENTS_TOOL_DESCRIPTION,
  LIST_AVAILABLE_AGENTS_TOOL_NAME,
  buildListAvailableAgentsParameterSchema,
  listAvailableAgentsFor,
} from "../../../../src/agent-tools/agent-discovery/list-available-agents-contract.js";
import {
  LIST_AVAILABLE_NODES_TOOL_DESCRIPTION,
  LIST_AVAILABLE_NODES_TOOL_NAME,
  listAvailableNodesFor,
} from "../../../../src/agent-tools/agent-discovery/list-available-nodes-contract.js";
import { registerAgentDiscoveryTools } from "../../../../src/agent-tools/agent-discovery/register-agent-discovery-tools.js";
import { ListAvailableAgentsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/list-available-agents-mcp-adapter-provider.js";
import { ListAvailableNodesMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/list-available-nodes-mcp-adapter-provider.js";
import { buildDefaultAgentToolMcpAdapterProviders } from "../../../../src/agent-tools/mcp/providers/default-agent-tool-mcp-adapter-providers.js";
import { automaticCollaborationToolNames, buildRuntimeAgentToolExposure } from "../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { resolveAutoByteusAgentTools } from "../../../../src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.js";
import { resolveClaudeSessionToolingOptions } from "../../../../src/agent-execution/backends/claude/session/claude-session-tooling-options.js";
import { testMemberExecutionContext } from "../../../fixtures/current-team-run-fixtures.js";

/**
 * autobyteus-261 on the asking node's tool edge: `list_available_agents` with `node`, the opt-in `list_available_nodes`,
 * the one entry builder, and their exposure on every runtime (AutoByteus native, Agent Tools MCP, Claude).
 */

const local = [
  { name: "Research Engineer", kind: "agent" as const, address: "/research_engineer" as never, description: "" },
  { name: "Product Team", kind: "agent_team" as const, address: "/product_team" as never, description: "Product" },
];
const remote = [{ name: "Publisher", kind: "agent" as const, address: "/publisher" },
  { name: "Studio Team", kind: "agent_team" as const, address: "/studio_team", description: "Writes and checks articles" }];
const off = { accepted: false as const, code: "REMOTE_COLLABORATION_OFF", message: "Remote collaboration is turned off on this node, so nothing was sent to another node." };
const unknownNode = { accepted: false as const, code: "PEER_NOT_REGISTERED", message: 'No peer node named "nas" is registered on this node, so nothing was sent.' };

const discovery = (): RemoteDiscoveryChannel & { listNodes: ReturnType<typeof vi.fn>; listAvailableAgents: ReturnType<typeof vi.fn> } => ({
  listNodes: vi.fn(async () => [{ name: "beta", status: "available" as const }, { name: "docker", status: "unavailable" as const }]),
  listAvailableAgents: vi.fn(async (node: string) => node === "beta" ? remote : unknownNode),
});
const withLister = () => testMemberExecutionContext({ listAvailableAgents: vi.fn(async () => local) });

const bound: RemoteDiscoveryChannel[] = [];
const bind = (channel: RemoteDiscoveryChannel) => { bindProcessRemoteDiscoveryChannel(channel); bound.push(channel); return channel; };
afterEach(() => { bound.splice(0).forEach(releaseProcessRemoteDiscoveryChannel); });

describe("the one entry builder (DEC-405)", () => {
  it("keeps name, kind and address, and a description only when it has one", () => {
    expect(availableCollaboratorEntry({ name: "A", kind: "agent", address: "/a", description: "" })).toEqual({ name: "A", kind: "agent", address: "/a" });
    expect(availableCollaboratorEntry({ name: "A", kind: "agent", address: "/a", description: "  " })).toEqual({ name: "A", kind: "agent", address: "/a" });
    expect(availableCollaboratorEntry({ name: "A", kind: "agent", address: "/a", description: null })).toEqual({ name: "A", kind: "agent", address: "/a" });
    expect(availableCollaboratorEntry({ name: "T", kind: "agent_team", address: "/t", description: "Does things" }))
      .toEqual({ name: "T", kind: "agent_team", address: "/t", description: "Does things" });
  });
});

describe("list_available_agents with node (BEH-402)", () => {
  it("without node: this node's list through the sender's root, as before but with no empty description (AC-407)", async () => {
    const d = discovery();
    await expect(listAvailableAgentsFor(withLister().collaboration, {}, d)).resolves.toEqual({ agents: [
      { name: "Research Engineer", kind: "agent", address: "/research_engineer" }, local[1] ] });
    expect(d.listAvailableAgents).not.toHaveBeenCalled();
  });

  it("with node: what that peer offers; a refusal with delegate_task's text; a blank node; nothing composed is 'turned off'", async () => {
    const d = discovery();
    const context = withLister();
    await expect(listAvailableAgentsFor(context.collaboration, { node: " beta " }, d)).resolves.toEqual({ agents: remote });
    expect(d.listAvailableAgents).toHaveBeenCalledWith("beta");
    await expect(listAvailableAgentsFor(context.collaboration, { node: "nas" }, d)).resolves.toEqual(unknownNode);
    await expect(listAvailableAgentsFor(context.collaboration, { node: " " }, d)).resolves.toMatchObject({ accepted: false, code: "VALIDATION_ERROR" });
    await expect(listAvailableAgentsFor(context.collaboration, { node: 3 }, d)).resolves.toMatchObject({ accepted: false, code: "VALIDATION_ERROR" });
    await expect(listAvailableAgentsFor(context.collaboration, { node: "beta" }, null)).resolves.toEqual(off);
    expect(context.collaboration.listAvailableAgents).not.toHaveBeenCalled();
  });

  it("has the optional node parameter and the DEC-406 wording", () => {
    const schema = buildListAvailableAgentsParameterSchema().toJsonSchemaDict() as { properties: Record<string, { description: string }>; required?: string[] };
    expect(Object.keys(schema.properties)).toEqual(["node"]);
    expect(schema.properties.node!.description).toBe(LIST_AVAILABLE_AGENTS_NODE_DESCRIPTION);
    expect(schema.required ?? []).not.toContain("node");
    expect(LIST_AVAILABLE_AGENTS_TOOL_DESCRIPTION).toBe("List the agents and agent teams you can work with, each with its name, kind (agent or agent_team), address and description (when it has one). With node, list what that peer node offers for delegation instead; use an address from that list as recipient_address in delegate_task with the same node. This tool is read-only.");
    expect(LIST_AVAILABLE_AGENTS_NODE_DESCRIPTION).toBe("Optional: the name of a peer node registered on this node. Without it, this node's agents and agent teams are listed.");
  });
});

describe("list_available_nodes (BEH-401, DEC-401)", () => {
  it("lists the peers with their status; 'turned off' when nothing is composed; needs a run that can delegate", async () => {
    const d = discovery();
    await expect(listAvailableNodesFor(withLister().collaboration, d)).resolves.toEqual({ nodes: [{ name: "beta", status: "available" }, { name: "docker", status: "unavailable" }] });
    await expect(listAvailableNodesFor(withLister().collaboration, null)).resolves.toEqual(off);
    d.listNodes.mockResolvedValueOnce(off);
    await expect(listAvailableNodesFor(withLister().collaboration, d)).resolves.toEqual(off);
    await expect(listAvailableNodesFor(testMemberExecutionContext().collaboration, d)).rejects.toMatchObject({ code: "COLLABORATION_CONTEXT_REQUIRED" });
    expect(LIST_AVAILABLE_NODES_TOOL_DESCRIPTION).toBe("List the peer nodes registered on this node, each with its name and status: available (it takes work from this node now) or unavailable. Use the name as node in list_available_agents and delegate_task; for an unavailable node, list_available_agents with that node says why. This read-only tool takes no arguments.");
  });

  it("is opt-in on every runtime: never automatic; native, MCP and Claude expose it only when selected and the run can delegate", async () => {
    const context = withLister();
    bind(discovery());
    expect(automaticCollaborationToolNames(context)).not.toContain(LIST_AVAILABLE_NODES_TOOL_NAME);
    expect(buildRuntimeAgentToolExposure(["list_available_agents"], context).listAvailableNodesEnabled).toBe(false);
    const exposure = buildRuntimeAgentToolExposure([" list_available_nodes ", "list_available_agents"], context);
    expect(exposure.listAvailableNodesEnabled).toBe(true);

    registerAgentDiscoveryTools();
    expect(defaultToolRegistry.getToolDefinition(LIST_AVAILABLE_NODES_TOOL_NAME)?.description).toBe(LIST_AVAILABLE_NODES_TOOL_DESCRIPTION);
    const resolved = resolveAutoByteusAgentTools({ agentDefinition: { name: "Assistant", toolNames: ["list_available_nodes", "list_available_agents"] } as never,
      runtimeToolExposure: exposure, senderRunId: "run-a", memberExecutionContext: context, logger: { warn: vi.fn(), error: vi.fn() } });
    expect(resolved.actualToolNames).toEqual(expect.arrayContaining([LIST_AVAILABLE_NODES_TOOL_NAME, LIST_AVAILABLE_AGENTS_TOOL_NAME]));
    const tool = (name: string) => resolved.tools.find((candidate) => (candidate.constructor as { getName?: () => string }).getName?.() === name)! as unknown as
      { _execute(context?: unknown, args?: Record<string, unknown>): Promise<string> };
    expect(JSON.parse(await tool(LIST_AVAILABLE_NODES_TOOL_NAME)._execute())).toEqual({ nodes: [{ name: "beta", status: "available" }, { name: "docker", status: "unavailable" }] });
    expect(JSON.parse(await tool(LIST_AVAILABLE_AGENTS_TOOL_NAME)._execute(null, { node: "beta" }))).toEqual({ agents: remote });
    // A refusal is the native tool's error, with its text.
    await expect(tool(LIST_AVAILABLE_AGENTS_TOOL_NAME)._execute(null, { node: "nas" })).rejects.toThrow(unknownNode.message);
    const skipped = resolveAutoByteusAgentTools({ agentDefinition: { name: "Assistant", toolNames: ["list_available_nodes"] } as never,
      runtimeToolExposure: exposure, senderRunId: "run-a", memberExecutionContext: testMemberExecutionContext(), logger: { warn: vi.fn(), error: vi.fn() } });
    expect(skipped.actualToolNames).not.toContain(LIST_AVAILABLE_NODES_TOOL_NAME);

    expect(buildDefaultAgentToolMcpAdapterProviders().some((provider) => provider instanceof ListAvailableNodesMcpAdapterProvider)).toBe(true);
    const [nodes] = new ListAvailableNodesMcpAdapterProvider().getAdapters();
    const [agents] = new ListAvailableAgentsMcpAdapterProvider().getAdapters();
    const availability = (memberExecutionContext: typeof context | null) => nodes!.isAvailable({ runtimeExposure: exposure,
      sender: memberExecutionContext ? { memberExecutionContext } as never : null, executionContext: {} as never, applicationAgentTools: null });
    expect([availability(context), availability(testMemberExecutionContext()), availability(null)]).toEqual([true, false, false]);
    const session = { sender: { memberExecutionContext: context } } as never;
    await expect(nodes!.execute({ session, rawArguments: {} })).resolves.toMatchObject({ kind: "mcp_tool_result",
      result: { structuredContent: { nodes: [{ name: "beta", status: "available" }, { name: "docker", status: "unavailable" }] } } });
    await expect(agents!.execute({ session, rawArguments: { node: "beta" } })).resolves.toMatchObject({ result: { structuredContent: { agents: remote } } });
    // Over MCP a refusal is an error result with its text (a thrown error would reach the agent only as an internal error).
    await expect(agents!.execute({ session, rawArguments: { node: "nas" } })).resolves.toEqual({ kind: "mcp_tool_result",
      result: { content: [{ type: "text", text: unknownNode.message }], isError: true } });

    const claude = resolveClaudeSessionToolingOptions({ runtimeToolExposure: exposure, hasMaterializedSkills: false, memberExecutionContext: context });
    expect(claude.listAvailableNodesToolingEnabled).toBe(true);
    expect(claude.agentToolsMcpEnabledToolNames).toContain(LIST_AVAILABLE_NODES_TOOL_NAME);
    expect(resolveClaudeSessionToolingOptions({ runtimeToolExposure: exposure, hasMaterializedSkills: false, memberExecutionContext: testMemberExecutionContext() })
      .listAvailableNodesToolingEnabled).toBe(false);
  });
});
