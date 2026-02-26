import { AgentTeamDefinition } from "../domain/models.js";
import {
  nextNumericStringId,
  normalizeNullableString,
  readJsonArrayFile,
  resolvePersistencePath,
  updateJsonArrayFile,
} from "../../persistence/file/store-utils.js";
import { NodeType } from "../domain/enums.js";

type TeamMemberRecord = {
  memberName: string;
  referenceId: string;
  referenceType: NodeType;
};

type AgentTeamDefinitionRecord = {
  id: string;
  name: string;
  description: string;
  nodes: TeamMemberRecord[];
  coordinatorMemberName: string;
  role: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

const definitionFilePath = resolvePersistencePath("agent-team-definition", "definitions.json");

const toDomain = (record: AgentTeamDefinitionRecord): AgentTeamDefinition =>
  new AgentTeamDefinition({
    id: record.id,
    name: record.name,
    description: record.description,
    nodes: record.nodes.map((node) => ({
      memberName: node.memberName,
      referenceId: node.referenceId,
      referenceType: node.referenceType,
    })),
    coordinatorMemberName: record.coordinatorMemberName,
    role: record.role,
    avatarUrl: record.avatarUrl,
  });

const toRecord = (
  definition: AgentTeamDefinition,
  now: Date,
  fallbackId: string,
  createdAtOverride?: string,
): AgentTeamDefinitionRecord => ({
  id: definition.id ?? fallbackId,
  name: definition.name,
  description: definition.description,
  nodes: definition.nodes.map((node) => ({
    memberName: node.memberName,
    referenceId: node.referenceId,
    referenceType: node.referenceType,
  })),
  coordinatorMemberName: definition.coordinatorMemberName,
  role: normalizeNullableString(definition.role ?? null),
  avatarUrl: normalizeNullableString(definition.avatarUrl ?? null),
  createdAt: createdAtOverride ?? now.toISOString(),
  updatedAt: now.toISOString(),
});

export class FileAgentTeamDefinitionProvider {
  async create(domainObj: AgentTeamDefinition): Promise<AgentTeamDefinition> {
    const now = new Date();
    let created: AgentTeamDefinitionRecord | null = null;

    await updateJsonArrayFile<AgentTeamDefinitionRecord>(definitionFilePath, (rows) => {
      const id = domainObj.id ?? nextNumericStringId(rows);
      const createdRecord = toRecord(new AgentTeamDefinition({ ...domainObj, id }), now, id, now.toISOString());
      created = createdRecord;
      return [...rows, createdRecord];
    });

    if (!created) {
      throw new Error("Failed to create agent team definition record.");
    }
    return toDomain(created);
  }

  async getById(id: string): Promise<AgentTeamDefinition | null> {
    const rows = await readJsonArrayFile<AgentTeamDefinitionRecord>(definitionFilePath);
    const found = rows.find((row) => row.id === id);
    return found ? toDomain(found) : null;
  }

  async getAll(): Promise<AgentTeamDefinition[]> {
    const rows = await readJsonArrayFile<AgentTeamDefinitionRecord>(definitionFilePath);
    return rows.map((row) => toDomain(row));
  }

  async update(domainObj: AgentTeamDefinition): Promise<AgentTeamDefinition> {
    if (!domainObj.id) {
      throw new Error("Agent team definition id is required for update.");
    }

    const now = new Date();
    let updated: AgentTeamDefinitionRecord | null = null;

    await updateJsonArrayFile<AgentTeamDefinitionRecord>(definitionFilePath, (rows) => {
      const index = rows.findIndex((row) => row.id === domainObj.id);
      if (index < 0) {
        throw new Error("Agent team definition not found.");
      }
      const current = rows[index] as AgentTeamDefinitionRecord;
      const updatedRecord = toRecord(domainObj, now, current.id, current.createdAt);
      const next = [...rows];
      updated = updatedRecord;
      next[index] = updatedRecord;
      return next;
    });

    if (!updated) {
      throw new Error("Failed to update agent team definition record.");
    }
    return toDomain(updated);
  }

  async delete(id: string): Promise<boolean> {
    let deleted = false;
    await updateJsonArrayFile<AgentTeamDefinitionRecord>(definitionFilePath, (rows) => {
      const next = rows.filter((row) => row.id !== id);
      deleted = next.length !== rows.length;
      return next;
    });
    return deleted;
  }
}
