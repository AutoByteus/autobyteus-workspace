import { AgentDefinitionService } from "../agent-definition/services/agent-definition-service.js";
import { PromptLoader, promptLoader } from "../agent-definition/utils/prompt-loader.js";

type AgentDefinitionServiceLike = Pick<AgentDefinitionService, "getAgentDefinitionById">;

const asTrimmedString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export const resolveSingleAgentInstructionRuntimeMetadata = async (
  agentDefinitionId: string,
  options: {
    promptLoader?: PromptLoader;
    agentDefinitionService?: AgentDefinitionServiceLike;
  } = {},
): Promise<Record<string, unknown>> => {
  const loader = options.promptLoader ?? promptLoader;
  const agentDefinitionService =
    options.agentDefinitionService ?? AgentDefinitionService.getInstance();

  const promptInstructions = asTrimmedString(
    await loader.getPromptTemplateForAgent(agentDefinitionId),
  );
  if (promptInstructions) {
    return {
      agentInstructions: promptInstructions,
      memberInstructionSources: {
        agentInstructions: promptInstructions,
      },
    };
  }

  const agentDefinition = await agentDefinitionService.getAgentDefinitionById(agentDefinitionId);
  const fallbackInstructions = asTrimmedString(agentDefinition?.description);
  if (!fallbackInstructions) {
    return {};
  }

  return {
    agentInstructions: fallbackInstructions,
    memberInstructionSources: {
      agentInstructions: fallbackInstructions,
    },
  };
};
