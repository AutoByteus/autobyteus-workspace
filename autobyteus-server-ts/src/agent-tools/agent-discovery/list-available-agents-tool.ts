import { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import type { ToolConfig } from "autobyteus-ts/tools/tool-config.js";
import { ToolCategory } from "autobyteus-ts/tools/tool-category.js";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import type { MemberExecutionContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import {
  LIST_AVAILABLE_AGENTS_TOOL_DESCRIPTION,
  LIST_AVAILABLE_AGENTS_TOOL_NAME,
  buildListAvailableAgentsParameterSchema,
  listAvailableAgentsFor,
} from "./list-available-agents-contract.js";

const OWNER = "server-owned-agent-discovery";

/**
 * The opt-in `list_available_agents` tool (REQ-001) on the AutoByteus runtime, bound to the
 * sender's member context. Registered in the tool registry so it appears in the tool picker;
 * an agent gets it only when its definition selects it.
 */
export class AutoByteusListAvailableAgentsTool extends BaseTool<unknown, Record<string, unknown>, string> {
  static CATEGORY = ToolCategory.AGENT_COMMUNICATION;

  constructor(
    config?: ToolConfig,
    private readonly memberExecutionContext: MemberExecutionContext | null = null,
  ) { super(config); }

  static getName() { return LIST_AVAILABLE_AGENTS_TOOL_NAME; }
  static getDescription() { return LIST_AVAILABLE_AGENTS_TOOL_DESCRIPTION; }
  static getArgumentSchema() { return buildListAvailableAgentsParameterSchema(); }

  protected async _execute(): Promise<string> {
    return JSON.stringify(await listAvailableAgentsFor(this.memberExecutionContext?.collaboration));
  }
}

export const ensureListAvailableAgentsToolRegistered = (): ToolDefinition => {
  const existing = defaultToolRegistry.getToolDefinition(LIST_AVAILABLE_AGENTS_TOOL_NAME);
  if (existing?.metadata?.owner === OWNER) return existing;
  const definition = new ToolDefinition(
    LIST_AVAILABLE_AGENTS_TOOL_NAME,
    LIST_AVAILABLE_AGENTS_TOOL_DESCRIPTION,
    ToolOrigin.LOCAL,
    ToolCategory.AGENT_COMMUNICATION,
    buildListAvailableAgentsParameterSchema,
    () => null,
    { toolClass: AutoByteusListAvailableAgentsTool, metadata: { owner: OWNER } },
  );
  defaultToolRegistry.registerTool(definition);
  return definition;
};

export const createBoundListAvailableAgentsTool = (
  memberExecutionContext: MemberExecutionContext,
): AutoByteusListAvailableAgentsTool => {
  const definition = ensureListAvailableAgentsToolRegistered();
  const tool = new AutoByteusListAvailableAgentsTool(undefined, memberExecutionContext);
  tool.definition = definition;
  return tool;
};

export function registerAgentDiscoveryTools(): void {
  ensureListAvailableAgentsToolRegistered();
}
