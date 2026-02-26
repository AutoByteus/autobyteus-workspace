import { AgentPromptMapping } from "../domain/models.js";
import {
  nextNumericStringId,
  readJsonArrayFile,
  resolvePersistencePath,
  updateJsonArrayFile,
} from "../../persistence/file/store-utils.js";

type AgentPromptMappingRecord = {
  id: string;
  agentDefinitionId: string;
  promptName: string;
  promptCategory: string;
  updatedAt: string;
};

const mappingFilePath = resolvePersistencePath("agent-definition", "prompt-mappings.json");

const toDomain = (record: AgentPromptMappingRecord): AgentPromptMapping =>
  new AgentPromptMapping({
    id: record.id,
    agentDefinitionId: record.agentDefinitionId,
    promptName: record.promptName,
    promptCategory: record.promptCategory,
  });

export class FileAgentPromptMappingProvider {
  async getByAgentDefinitionId(agentDefinitionId: string): Promise<AgentPromptMapping | null> {
    const rows = await readJsonArrayFile<AgentPromptMappingRecord>(mappingFilePath);
    const found = rows.find((row) => row.agentDefinitionId === agentDefinitionId);
    return found ? toDomain(found) : null;
  }

  async getByAgentDefinitionIds(agentDefinitionIds: string[]): Promise<Map<string, AgentPromptMapping>> {
    const wanted = new Set(agentDefinitionIds);
    const rows = await readJsonArrayFile<AgentPromptMappingRecord>(mappingFilePath);
    const result = new Map<string, AgentPromptMapping>();
    for (const row of rows) {
      if (!wanted.has(row.agentDefinitionId)) {
        continue;
      }
      result.set(row.agentDefinitionId, toDomain(row));
    }
    return result;
  }

  async upsert(domainObj: AgentPromptMapping): Promise<AgentPromptMapping> {
    const now = new Date().toISOString();
    let saved: AgentPromptMappingRecord | null = null;

    await updateJsonArrayFile<AgentPromptMappingRecord>(mappingFilePath, (rows) => {
      const index = rows.findIndex((row) => row.agentDefinitionId === domainObj.agentDefinitionId);
      if (index >= 0) {
        const current = rows[index] as AgentPromptMappingRecord;
        const savedRecord: AgentPromptMappingRecord = {
          ...current,
          promptName: domainObj.promptName,
          promptCategory: domainObj.promptCategory,
          updatedAt: now,
        };
        const next = [...rows];
        saved = savedRecord;
        next[index] = savedRecord;
        return next;
      }

      const id = domainObj.id ?? nextNumericStringId(rows);
      const savedRecord: AgentPromptMappingRecord = {
        id,
        agentDefinitionId: domainObj.agentDefinitionId,
        promptName: domainObj.promptName,
        promptCategory: domainObj.promptCategory,
        updatedAt: now,
      };
      saved = savedRecord;
      return [...rows, savedRecord];
    });

    if (!saved) {
      throw new Error("Failed to upsert agent prompt mapping record.");
    }
    return toDomain(saved);
  }

  async deleteByAgentDefinitionId(agentDefinitionId: string): Promise<boolean> {
    let deleted = false;
    await updateJsonArrayFile<AgentPromptMappingRecord>(mappingFilePath, (rows) => {
      const next = rows.filter((row) => row.agentDefinitionId !== agentDefinitionId);
      deleted = next.length !== rows.length;
      return next;
    });
    return deleted;
  }
}
