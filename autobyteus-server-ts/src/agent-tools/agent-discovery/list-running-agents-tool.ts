import { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import type { ToolConfig } from "autobyteus-ts/tools/tool-config.js";
import { ToolCategory } from "autobyteus-ts/tools/tool-category.js";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import type { MemberExecutionContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import {
  LIST_RUNNING_AGENTS_TOOL_DESCRIPTION,
  LIST_RUNNING_AGENTS_TOOL_NAME,
  buildListRunningAgentsParameterSchema,
  listRunningAgentsFor,
} from "./list-running-agents-contract.js";
import { agentDiscoveryToolText } from "./agent-discovery-refusal.js";

const OWNER = "server-owned-agent-discovery";

/**
 * The opt-in `list_running_agents` tool (autobyteus-492 REQ-001) on the AutoByteus runtime, bound to the sender's member
 * context. Registered in the tool registry so it appears in the tool picker; an agent gets it only when its definition
 * selects it.
 */
export class AutoByteusListRunningAgentsTool extends BaseTool<unknown, Record<string, unknown>, string> {
  static CATEGORY = ToolCategory.AGENT_COMMUNICATION;

  constructor(
    config?: ToolConfig,
    private readonly memberExecutionContext: MemberExecutionContext | null = null,
  ) { super(config); }

  static getName() { return LIST_RUNNING_AGENTS_TOOL_NAME; }
  static getDescription() { return LIST_RUNNING_AGENTS_TOOL_DESCRIPTION; }
  static getArgumentSchema() { return buildListRunningAgentsParameterSchema(); }

  protected async _execute(_context: unknown, args: Record<string, unknown> = {}): Promise<string> {
    return agentDiscoveryToolText(await listRunningAgentsFor(this.memberExecutionContext, args));
  }
}

export const ensureListRunningAgentsToolRegistered = (): ToolDefinition => {
  const existing = defaultToolRegistry.getToolDefinition(LIST_RUNNING_AGENTS_TOOL_NAME);
  if (existing?.metadata?.owner === OWNER) return existing;
  const definition = new ToolDefinition(
    LIST_RUNNING_AGENTS_TOOL_NAME,
    LIST_RUNNING_AGENTS_TOOL_DESCRIPTION,
    ToolOrigin.LOCAL,
    ToolCategory.AGENT_COMMUNICATION,
    buildListRunningAgentsParameterSchema,
    () => null,
    { toolClass: AutoByteusListRunningAgentsTool, metadata: { owner: OWNER } },
  );
  defaultToolRegistry.registerTool(definition);
  return definition;
};

export const createBoundListRunningAgentsTool = (
  memberExecutionContext: MemberExecutionContext,
): AutoByteusListRunningAgentsTool => {
  const definition = ensureListRunningAgentsToolRegistered();
  const tool = new AutoByteusListRunningAgentsTool(undefined, memberExecutionContext);
  tool.definition = definition;
  return tool;
};
