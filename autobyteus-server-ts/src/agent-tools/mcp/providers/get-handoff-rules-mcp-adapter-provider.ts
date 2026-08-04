import {
  getGetHandoffRulesService,
  type GetHandoffRulesService,
} from "../../../agent-communication/services/get-handoff-rules-service.js";
import {
  GET_HANDOFF_RULES_TOOL_DESCRIPTION,
  GET_HANDOFF_RULES_TOOL_NAME,
} from "../../../agent-communication/services/get-handoff-rules-tool-contract.js";
import { buildGetHandoffRulesParameterSchema } from "../../agent-communication/get-handoff-rules-parameter-schema.js";
import {
  toAgentToolMcpToolResult,
  type AgentToolMcpAdapterProvider,
  type AgentToolMcpToolAdapter,
} from "../agent-tool-mcp-adapter.js";

export class GetHandoffRulesMcpAdapterProvider implements AgentToolMcpAdapterProvider {
  constructor(private readonly service: GetHandoffRulesService = getGetHandoffRulesService()) {}

  getAdapters(): AgentToolMcpToolAdapter[] {
    return [{
      definition: {
        name: GET_HANDOFF_RULES_TOOL_NAME,
        description: GET_HANDOFF_RULES_TOOL_DESCRIPTION,
        inputSchema: buildGetHandoffRulesParameterSchema(),
      },
      configuredMcpCollisionPolicy: "protect_static_adapter" as const,
      isAvailable: ({ sender }) => Boolean(sender?.memberTeamContext?.collaboration),
      execute: async ({ session }) => {
        const result = this.service.getRules(session.sender.memberTeamContext?.collaboration);
        return toAgentToolMcpToolResult({
          content: [{ type: "text", text: JSON.stringify(result) }],
          structuredContent: result,
        });
      },
    }];
  }
}
