import type { Prompt as PrismaPrompt, Prisma } from "@prisma/client";
import { Prompt } from "../domain/models.js";

export class PrismaPromptConverter {
  static toDomain(prismaObj: PrismaPrompt): Prompt {
    return new Prompt({
      id: prismaObj.id?.toString(),
      name: prismaObj.name,
      category: prismaObj.category,
      promptContent: prismaObj.promptContent,
      description: prismaObj.description ?? null,
      suitableForModels: prismaObj.suitableForModels ?? null,
      version: prismaObj.version ?? 1,
      createdAt: prismaObj.createdAt ?? null,
      updatedAt: prismaObj.updatedAt ?? null,
      parentId: prismaObj.parentId ? prismaObj.parentId.toString() : null,
      isActive: prismaObj.isActive,
    });
  }

  static toCreateInput(domainObj: Prompt): Prisma.PromptCreateInput {
    return {
      name: domainObj.name,
      category: domainObj.category,
      promptContent: domainObj.promptContent,
      description: domainObj.description ?? undefined,
      suitableForModels: domainObj.suitableForModels ?? undefined,
      version: domainObj.version ?? 1,
      isActive: domainObj.isActive,
      parentId: domainObj.parentId ? Number(domainObj.parentId) : undefined,
    };
  }

  static toUpdateInput(domainObj: Prompt): { id: number; data: Prisma.PromptUpdateInput } {
    if (!domainObj.id) {
      throw new Error("Prompt id is required for update");
    }

    return {
      id: Number(domainObj.id),
      data: {
        name: domainObj.name,
        category: domainObj.category,
        promptContent: domainObj.promptContent,
        description: domainObj.description ?? undefined,
        suitableForModels: domainObj.suitableForModels ?? undefined,
        isActive: domainObj.isActive,
      },
    };
  }
}
