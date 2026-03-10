import { AgentDefinitionService } from "../agent-definition/services/agent-definition-service.js";

type AgentDefinitionServiceLike = Pick<
  AgentDefinitionService,
  "getAgentDefinitionById" | "getFreshAgentDefinitionById"
>;

const asTrimmedString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export const resolveSingleAgentInstructionRuntimeMetadata = async (
  agentDefinitionId: string,
  options: {
    agentDefinitionService?: AgentDefinitionServiceLike;
  } = {},
): Promise<Record<string, unknown>> => {
  const agentDefinitionService =
    options.agentDefinitionService ?? AgentDefinitionService.getInstance();

  const getFreshAgentDefinitionById = (
    agentDefinitionService as AgentDefinitionServiceLike & {
      getFreshAgentDefinitionById?: (definitionId: string) => ReturnType<
        AgentDefinitionService["getFreshAgentDefinitionById"]
      >;
    }
  ).getFreshAgentDefinitionById;
  const agentDefinition =
    typeof getFreshAgentDefinitionById === "function"
      ? await getFreshAgentDefinitionById.call(agentDefinitionService, agentDefinitionId)
      : await agentDefinitionService.getAgentDefinitionById(agentDefinitionId);
  const agentInstructions = asTrimmedString(agentDefinition?.instructions);
  if (agentInstructions) {
    return {
      agentInstructions,
      memberInstructionSources: {
        agentInstructions,
      },
    };
  }

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
