import type { AgentDefinition as PrismaAgentDefinition, AgentPromptMapping as PrismaAgentPromptMapping, Prisma } from "@prisma/client";
import { AgentDefinition, AgentPromptMapping } from "../domain/models.js";

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export class PrismaAgentDefinitionConverter {
  static toDomain(prismaObj: PrismaAgentDefinition): AgentDefinition {
    return new AgentDefinition({
      id: prismaObj.id?.toString(),
      name: prismaObj.name,
      role: prismaObj.role,
      description: prismaObj.description,
      avatarUrl: normalizeOptionalString(prismaObj.avatarUrl),
      toolNames: toStringArray(prismaObj.toolNames),
      inputProcessorNames: toStringArray(prismaObj.inputProcessorNames),
      llmResponseProcessorNames: toStringArray(prismaObj.llmResponseProcessorNames),
      systemPromptProcessorNames: toStringArray(prismaObj.systemPromptProcessorNames),
      toolExecutionResultProcessorNames: toStringArray(prismaObj.toolExecutionResultProcessorNames),
      toolInvocationPreprocessorNames: toStringArray(prismaObj.toolInvocationPreprocessorNames),
      lifecycleProcessorNames: toStringArray(prismaObj.lifecycleProcessorNames),
      skillNames: toStringArray(prismaObj.skillNames),
    });
  }

  static toCreateInput(domainObj: AgentDefinition): Prisma.AgentDefinitionCreateInput {
    return {
      name: domainObj.name,
      role: domainObj.role,
      description: domainObj.description,
      avatarUrl: normalizeOptionalString(domainObj.avatarUrl),
      toolNames: JSON.stringify(domainObj.toolNames),
      inputProcessorNames: JSON.stringify(domainObj.inputProcessorNames),
      llmResponseProcessorNames: JSON.stringify(domainObj.llmResponseProcessorNames),
      systemPromptProcessorNames: JSON.stringify(domainObj.systemPromptProcessorNames),
      toolExecutionResultProcessorNames: JSON.stringify(domainObj.toolExecutionResultProcessorNames),
      toolInvocationPreprocessorNames: JSON.stringify(domainObj.toolInvocationPreprocessorNames),
      lifecycleProcessorNames: JSON.stringify(domainObj.lifecycleProcessorNames),
      skillNames: JSON.stringify(domainObj.skillNames),
    };
  }

  static toUpdateInput(domainObj: AgentDefinition): { id: number; data: Prisma.AgentDefinitionUpdateInput } {
    if (!domainObj.id) {
      throw new Error("AgentDefinition id is required for update");
    }

    return {
      id: Number(domainObj.id),
      data: {
        name: domainObj.name,
        role: domainObj.role,
        description: domainObj.description,
        avatarUrl: normalizeOptionalString(domainObj.avatarUrl),
        toolNames: JSON.stringify(domainObj.toolNames),
        inputProcessorNames: JSON.stringify(domainObj.inputProcessorNames),
        llmResponseProcessorNames: JSON.stringify(domainObj.llmResponseProcessorNames),
        systemPromptProcessorNames: JSON.stringify(domainObj.systemPromptProcessorNames),
        toolExecutionResultProcessorNames: JSON.stringify(domainObj.toolExecutionResultProcessorNames),
        toolInvocationPreprocessorNames: JSON.stringify(domainObj.toolInvocationPreprocessorNames),
        lifecycleProcessorNames: JSON.stringify(domainObj.lifecycleProcessorNames),
        skillNames: JSON.stringify(domainObj.skillNames),
      },
    };
  }
}

export class PrismaAgentPromptMappingConverter {
  static toDomain(prismaObj: PrismaAgentPromptMapping): AgentPromptMapping {
    return new AgentPromptMapping({
      id: prismaObj.id?.toString(),
      agentDefinitionId: prismaObj.agentDefinitionId.toString(),
      promptName: prismaObj.promptName,
      promptCategory: prismaObj.promptCategory,
    });
  }

  static toCreateInput(domainObj: AgentPromptMapping): Prisma.AgentPromptMappingCreateInput {
    return {
      agentDefinition: { connect: { id: Number(domainObj.agentDefinitionId) } },
      promptName: domainObj.promptName,
      promptCategory: domainObj.promptCategory,
    };
  }

  static toUpdateInput(domainObj: AgentPromptMapping): Prisma.AgentPromptMappingUpdateInput {
    return {
      promptName: domainObj.promptName,
      promptCategory: domainObj.promptCategory,
    };
  }
}
