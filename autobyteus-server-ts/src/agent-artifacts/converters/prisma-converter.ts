import type { AgentArtifact as PrismaAgentArtifact, Prisma } from "@prisma/client";
import { AgentArtifact } from "../domain/models.js";

export class PrismaAgentArtifactConverter {
  static toDomain(prismaObj: PrismaAgentArtifact): AgentArtifact {
    return new AgentArtifact({
      id: prismaObj.id?.toString(),
      runId: prismaObj.runId,
      path: prismaObj.path,
      type: prismaObj.type,
      workspaceRoot: prismaObj.workspaceRoot ?? null,
      url: prismaObj.url ?? null,
      createdAt: prismaObj.createdAt,
      updatedAt: prismaObj.updatedAt,
    });
  }

  static toCreateInput(domainObj: AgentArtifact): Prisma.AgentArtifactCreateInput {
    return {
      runId: domainObj.runId,
      path: domainObj.path,
      type: domainObj.type,
      workspaceRoot: domainObj.workspaceRoot ?? undefined,
      url: domainObj.url ?? undefined,
      createdAt: domainObj.createdAt,
      updatedAt: domainObj.updatedAt,
    };
  }
}
