import { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import type { ToolConfig } from "autobyteus-ts/tools/tool-config.js";
import { ToolCategory } from "autobyteus-ts/tools/tool-category.js";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import type { MemberTeamContext } from "../../agent-team-execution/domain/member-team-context.js";
import {
  getGetHandoffRulesService,
  type GetHandoffRulesService,
} from "../../agent-communication/services/get-handoff-rules-service.js";
import {
  GET_HANDOFF_RULES_TOOL_DESCRIPTION,
  GET_HANDOFF_RULES_TOOL_NAME,
} from "../../agent-communication/services/get-handoff-rules-tool-contract.js";
import { serializeAgentCommunicationToolResult } from "../../agent-communication/services/agent-communication-tool-result.js";
import { buildGetHandoffRulesParameterSchema } from "./get-handoff-rules-parameter-schema.js";

const OWNER = "server-owned-agent-communication";

export class AutoByteusGetHandoffRulesTool extends BaseTool<unknown, Record<string, unknown>, string> {
  static CATEGORY = ToolCategory.AGENT_COMMUNICATION;

  constructor(
    config?: ToolConfig,
    private readonly options: {
      memberTeamContext?: MemberTeamContext | null;
      service?: GetHandoffRulesService;
    } = {},
  ) { super(config); }

  static getName() { return GET_HANDOFF_RULES_TOOL_NAME; }
  static getDescription() { return GET_HANDOFF_RULES_TOOL_DESCRIPTION; }
  static getArgumentSchema() { return buildGetHandoffRulesParameterSchema(); }

  protected async _execute(): Promise<string> {
    const envelope = (this.options.service ?? getGetHandoffRulesService())
      .getRules(this.options.memberTeamContext?.collaboration);
    return serializeAgentCommunicationToolResult(envelope);
  }
}

export const ensureAutoByteusGetHandoffRulesToolRegistered = (): ToolDefinition => {
  const existing = defaultToolRegistry.getToolDefinition(GET_HANDOFF_RULES_TOOL_NAME);
  if (existing?.metadata?.owner === OWNER) return existing;
  const definition = new ToolDefinition(
    GET_HANDOFF_RULES_TOOL_NAME,
    GET_HANDOFF_RULES_TOOL_DESCRIPTION,
    ToolOrigin.LOCAL,
    ToolCategory.AGENT_COMMUNICATION,
    buildGetHandoffRulesParameterSchema,
    () => null,
    { toolClass: AutoByteusGetHandoffRulesTool, metadata: { owner: OWNER } },
  );
  defaultToolRegistry.registerTool(definition);
  return definition;
};

export const createBoundAutoByteusGetHandoffRulesTool = (
  memberTeamContext: MemberTeamContext,
): AutoByteusGetHandoffRulesTool => {
  const definition = ensureAutoByteusGetHandoffRulesToolRegistered();
  const tool = new AutoByteusGetHandoffRulesTool(undefined, { memberTeamContext });
  tool.definition = definition;
  return tool;
};
