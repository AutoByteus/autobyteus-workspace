import type { AgentTeamDefinition as PrismaAgentTeamDefinition, Prisma } from "@prisma/client";
import { AgentTeamDefinition, TeamMember } from "../domain/models.js";
import { NodeType } from "../domain/enums.js";

const parseNodeType = (value: unknown): NodeType | null => {
  if (value === NodeType.AGENT || value === NodeType.AGENT_TEAM) {
    return value;
  }
  if (typeof value === "string") {
    if (value === NodeType.AGENT || value === NodeType.AGENT_TEAM) {
      return value as NodeType;
    }
  }
  return null;
};

const parseNodes = (value: unknown): TeamMember[] => {
  let rawNodes: unknown[] = [];
  if (Array.isArray(value)) {
    rawNodes = value;
  } else if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        rawNodes = parsed;
      }
    } catch {
      return [];
    }
  } else {
    return [];
  }

  return rawNodes
    .map((node) => {
      if (!node || typeof node !== "object") {
        return null;
      }
      const record = node as Record<string, unknown>;
      const memberName = (record.memberName ?? record.member_name) as string | undefined;
      const referenceId = (record.referenceId ?? record.reference_id) as string | undefined;
      const referenceTypeRaw = record.referenceType ?? record.reference_type;
      const referenceType = parseNodeType(referenceTypeRaw);

      if (!memberName || !referenceId || !referenceType) {
        return null;
      }

      return new TeamMember({
        memberName,
        referenceId,
        referenceType,
      });
    })
    .filter((node): node is TeamMember => node !== null);
};

const toNodePayload = (node: TeamMember): Record<string, unknown> => ({
  member_name: node.memberName,
  reference_id: node.referenceId,
  reference_type: node.referenceType,
});

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

export class PrismaAgentTeamDefinitionConverter {
  static toDomain(prismaObj: PrismaAgentTeamDefinition): AgentTeamDefinition {
    return new AgentTeamDefinition({
      id: prismaObj.id?.toString(),
      name: prismaObj.name,
      description: prismaObj.description,
      role: prismaObj.role ?? null,
      avatarUrl: normalizeOptionalString(prismaObj.avatarUrl),
      nodes: parseNodes(prismaObj.nodes),
      coordinatorMemberName: prismaObj.coordinatorMemberName,
    });
  }

  static toCreateInput(domainObj: AgentTeamDefinition): Prisma.AgentTeamDefinitionCreateInput {
    return {
      name: domainObj.name,
      description: domainObj.description,
      role: domainObj.role ?? undefined,
      avatarUrl: normalizeOptionalString(domainObj.avatarUrl),
      nodes: JSON.stringify(domainObj.nodes.map(toNodePayload)),
      coordinatorMemberName: domainObj.coordinatorMemberName,
    };
  }

  static toUpdateInput(domainObj: AgentTeamDefinition): { id: number; data: Prisma.AgentTeamDefinitionUpdateInput } {
    if (!domainObj.id) {
      throw new Error("AgentTeamDefinition id is required for update");
    }

    return {
      id: Number(domainObj.id),
      data: {
        name: domainObj.name,
        description: domainObj.description,
        role: domainObj.role ?? undefined,
        avatarUrl: normalizeOptionalString(domainObj.avatarUrl),
        nodes: JSON.stringify(domainObj.nodes.map(toNodePayload)),
        coordinatorMemberName: domainObj.coordinatorMemberName,
      },
    };
  }
}
