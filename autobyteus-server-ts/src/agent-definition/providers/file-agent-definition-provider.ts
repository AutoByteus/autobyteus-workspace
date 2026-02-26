import { AgentDefinition } from "../domain/models.js";
import {
  nextNumericStringId,
  normalizeNullableString,
  parseDate,
  readJsonArrayFile,
  resolvePersistencePath,
  updateJsonArrayFile,
} from "../../persistence/file/store-utils.js";

type AgentDefinitionRecord = {
  id: string;
  name: string;
  role: string;
  description: string;
  avatarUrl: string | null;
  toolNames: string[];
  inputProcessorNames: string[];
  llmResponseProcessorNames: string[];
  systemPromptProcessorNames: string[];
  toolExecutionResultProcessorNames: string[];
  toolInvocationPreprocessorNames: string[];
  lifecycleProcessorNames: string[];
  skillNames: string[];
  systemPromptCategory: string | null;
  systemPromptName: string | null;
  createdAt: string;
  updatedAt: string;
};

const definitionFilePath = resolvePersistencePath("agent-definition", "definitions.json");

const toDomain = (record: AgentDefinitionRecord): AgentDefinition =>
  new AgentDefinition({
    id: record.id,
    name: record.name,
    role: record.role,
    description: record.description,
    avatarUrl: record.avatarUrl,
    toolNames: record.toolNames,
    inputProcessorNames: record.inputProcessorNames,
    llmResponseProcessorNames: record.llmResponseProcessorNames,
    systemPromptProcessorNames: record.systemPromptProcessorNames,
    toolExecutionResultProcessorNames: record.toolExecutionResultProcessorNames,
    toolInvocationPreprocessorNames: record.toolInvocationPreprocessorNames,
    lifecycleProcessorNames: record.lifecycleProcessorNames,
    skillNames: record.skillNames,
    systemPromptCategory: record.systemPromptCategory,
    systemPromptName: record.systemPromptName,
  });

const toRecord = (
  definition: AgentDefinition,
  now: Date,
  fallbackId: string,
  createdAtOverride?: string,
): AgentDefinitionRecord => ({
  id: definition.id ?? fallbackId,
  name: definition.name,
  role: definition.role,
  description: definition.description,
  avatarUrl: normalizeNullableString(definition.avatarUrl ?? null),
  toolNames: [...definition.toolNames],
  inputProcessorNames: [...definition.inputProcessorNames],
  llmResponseProcessorNames: [...definition.llmResponseProcessorNames],
  systemPromptProcessorNames: [...definition.systemPromptProcessorNames],
  toolExecutionResultProcessorNames: [...definition.toolExecutionResultProcessorNames],
  toolInvocationPreprocessorNames: [...definition.toolInvocationPreprocessorNames],
  lifecycleProcessorNames: [...definition.lifecycleProcessorNames],
  skillNames: [...definition.skillNames],
  systemPromptCategory: normalizeNullableString(definition.systemPromptCategory ?? null),
  systemPromptName: normalizeNullableString(definition.systemPromptName ?? null),
  createdAt: createdAtOverride ?? now.toISOString(),
  updatedAt: now.toISOString(),
});

export class FileAgentDefinitionProvider {
  async create(domainObj: AgentDefinition): Promise<AgentDefinition> {
    const now = new Date();
    let created: AgentDefinitionRecord | null = null;

    await updateJsonArrayFile<AgentDefinitionRecord>(definitionFilePath, (rows) => {
      const id = domainObj.id ?? nextNumericStringId(rows);
      const createdRecord: AgentDefinitionRecord = {
        ...toRecord(new AgentDefinition({ ...domainObj, id }), now, id),
        createdAt: now.toISOString(),
      };
      created = createdRecord;
      return [...rows, createdRecord];
    });

    if (!created) {
      throw new Error("Failed to create agent definition record.");
    }
    return toDomain(created);
  }

  async getById(id: string): Promise<AgentDefinition | null> {
    const rows = await readJsonArrayFile<AgentDefinitionRecord>(definitionFilePath);
    const found = rows.find((row) => row.id === id);
    return found ? toDomain(found) : null;
  }

  async getAll(): Promise<AgentDefinition[]> {
    const rows = await readJsonArrayFile<AgentDefinitionRecord>(definitionFilePath);
    return rows.map((row) => toDomain(row));
  }

  async update(domainObj: AgentDefinition): Promise<AgentDefinition> {
    if (!domainObj.id) {
      throw new Error("Agent definition id is required for update.");
    }

    const now = new Date();
    let updated: AgentDefinitionRecord | null = null;

    await updateJsonArrayFile<AgentDefinitionRecord>(definitionFilePath, (rows) => {
      const index = rows.findIndex((row) => row.id === domainObj.id);
      if (index < 0) {
        throw new Error("Agent definition not found.");
      }
      const current = rows[index] as AgentDefinitionRecord;
      const updatedRecord: AgentDefinitionRecord = {
        ...toRecord(domainObj, now, current.id, current.createdAt),
        id: current.id,
      };
      const next = [...rows];
      updated = updatedRecord;
      next[index] = updatedRecord;
      return next;
    });

    if (!updated) {
      throw new Error("Failed to update agent definition record.");
    }
    return toDomain(updated);
  }

  async delete(id: string): Promise<boolean> {
    let deleted = false;
    await updateJsonArrayFile<AgentDefinitionRecord>(definitionFilePath, (rows) => {
      const next = rows.filter((row) => row.id !== id);
      deleted = next.length !== rows.length;
      return next;
    });
    return deleted;
  }
}
