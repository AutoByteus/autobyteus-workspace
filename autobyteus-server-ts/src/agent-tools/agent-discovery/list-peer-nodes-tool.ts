import { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import type { ToolConfig } from "autobyteus-ts/tools/tool-config.js";
import { ToolCategory } from "autobyteus-ts/tools/tool-category.js";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import type { MemberExecutionContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import {
  LIST_PEER_NODES_TOOL_DESCRIPTION,
  LIST_PEER_NODES_TOOL_NAME,
  buildListPeerNodesParameterSchema,
  listPeerNodesFor,
} from "./list-peer-nodes-contract.js";
import { agentDiscoveryToolText } from "./agent-discovery-refusal.js";

const OWNER = "server-owned-agent-discovery";

/**
 * The opt-in `list_peer_nodes` tool (autobyteus-261 DEC-401) on the AutoByteus runtime, bound to the
 * sender's member context. Registered in the tool registry so it appears in the tool picker;
 * an agent gets it only when its definition selects it.
 */
export class AutoByteusListPeerNodesTool extends BaseTool<unknown, Record<string, unknown>, string> {
  static CATEGORY = ToolCategory.AGENT_COMMUNICATION;

  constructor(
    config?: ToolConfig,
    private readonly memberExecutionContext: MemberExecutionContext | null = null,
  ) { super(config); }

  static getName() { return LIST_PEER_NODES_TOOL_NAME; }
  static getDescription() { return LIST_PEER_NODES_TOOL_DESCRIPTION; }
  static getArgumentSchema() { return buildListPeerNodesParameterSchema(); }

  protected async _execute(): Promise<string> {
    return agentDiscoveryToolText(await listPeerNodesFor(this.memberExecutionContext?.collaboration));
  }
}

export const ensureListPeerNodesToolRegistered = (): ToolDefinition => {
  const existing = defaultToolRegistry.getToolDefinition(LIST_PEER_NODES_TOOL_NAME);
  if (existing?.metadata?.owner === OWNER) return existing;
  const definition = new ToolDefinition(
    LIST_PEER_NODES_TOOL_NAME,
    LIST_PEER_NODES_TOOL_DESCRIPTION,
    ToolOrigin.LOCAL,
    ToolCategory.AGENT_COMMUNICATION,
    buildListPeerNodesParameterSchema,
    () => null,
    { toolClass: AutoByteusListPeerNodesTool, metadata: { owner: OWNER } },
  );
  defaultToolRegistry.registerTool(definition);
  return definition;
};

export const createBoundListPeerNodesTool = (
  memberExecutionContext: MemberExecutionContext,
): AutoByteusListPeerNodesTool => {
  const definition = ensureListPeerNodesToolRegistered();
  const tool = new AutoByteusListPeerNodesTool(undefined, memberExecutionContext);
  tool.definition = definition;
  return tool;
};
