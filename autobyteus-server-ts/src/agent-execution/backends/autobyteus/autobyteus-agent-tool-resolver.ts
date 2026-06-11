import type { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import type { AgentDefinition } from "../../../agent-definition/domain/models.js";
import type { MemberTeamContext } from "../../../agent-team-execution/domain/member-team-context.js";
import { ensureAutoByteusSendMessageToToolRegistered } from "../../../agent-tools/team-communication/send-message-to.js";
import { resolveAutoByteusStandaloneToolNames } from "./autobyteus-mixed-tool-exposure.js";
import {
  canCreateBoundAutoByteusSendMessageToTool,
  createAutoByteusSendMessageToToolForMember,
  isSendMessageToToolName,
} from "./team-communication/autobyteus-send-message-tool-factory.js";

type ToolResolutionLogger = {
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

export type AutoByteusAgentToolResolution = {
  tools: BaseTool[];
  actualToolNames: string[];
};

const defaultLogger: ToolResolutionLogger = {
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export const resolveAutoByteusAgentTools = (input: {
  agentDefinition: AgentDefinition;
  memberTeamContext?: MemberTeamContext | null;
  logger?: ToolResolutionLogger | null;
}): AutoByteusAgentToolResolution => {
  const { agentDefinition, memberTeamContext = null } = input;
  const logger = input.logger ?? defaultLogger;
  const resolvedToolNames = resolveAutoByteusStandaloneToolNames({
    toolNames: agentDefinition.toolNames,
    memberTeamContext,
  });
  const tools: BaseTool[] = [];
  const actualToolNames: string[] = [];

  for (const name of resolvedToolNames) {
    if (isSendMessageToToolName(name)) {
      if (memberTeamContext) {
        if (!canCreateBoundAutoByteusSendMessageToTool(memberTeamContext)) {
          continue;
        }
        try {
          tools.push(createAutoByteusSendMessageToToolForMember(memberTeamContext));
          actualToolNames.push(name);
        } catch (error) {
          logger.error(
            `Failed to create tool instance for '${name}' from agent definition '${agentDefinition.name}': ${String(error)}`,
          );
        }
        continue;
      }
      ensureAutoByteusSendMessageToToolRegistered();
    }

    if (!defaultToolRegistry.getToolDefinition(name)) {
      logger.warn(
        `Tool '${name}' defined in agent definition '${agentDefinition.name}' not found in registry. Skipping.`,
      );
      continue;
    }
    try {
      tools.push(defaultToolRegistry.createTool(name));
      actualToolNames.push(name);
    } catch (error) {
      logger.error(
        `Failed to create tool instance for '${name}' from agent definition '${agentDefinition.name}': ${String(error)}`,
      );
    }
  }

  return { tools, actualToolNames };
};
