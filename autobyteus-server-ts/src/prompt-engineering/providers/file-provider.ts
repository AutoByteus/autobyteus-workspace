import { Prompt } from "../domain/models.js";
import {
  nextNumericStringId,
  parseDate,
  readJsonArrayFile,
  resolvePersistencePath,
  updateJsonArrayFile,
} from "../../persistence/file/store-utils.js";

type PromptRecord = {
  id: string;
  name: string;
  category: string;
  promptContent: string;
  description: string | null;
  suitableForModels: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  parentId: string | null;
  isActive: boolean;
};

const promptFilePath = resolvePersistencePath("prompt-engineering", "prompts.json");

const toDomain = (record: PromptRecord): Prompt =>
  new Prompt({
    id: record.id,
    name: record.name,
    category: record.category,
    promptContent: record.promptContent,
    description: record.description,
    suitableForModels: record.suitableForModels,
    version: record.version,
    createdAt: parseDate(record.createdAt),
    updatedAt: parseDate(record.updatedAt),
    parentId: record.parentId,
    isActive: record.isActive,
  });

const toRecord = (prompt: Prompt, now: Date, fallbackId: string): PromptRecord => ({
  id: prompt.id ?? fallbackId,
  name: prompt.name,
  category: prompt.category,
  promptContent: prompt.promptContent,
  description: prompt.description ?? null,
  suitableForModels: prompt.suitableForModels ?? null,
  version: prompt.version ?? 1,
  createdAt: (prompt.createdAt ?? now).toISOString(),
  updatedAt: (prompt.updatedAt ?? now).toISOString(),
  parentId: prompt.parentId ?? null,
  isActive: prompt.isActive,
});

const filterPrompts = (
  rows: PromptRecord[],
  options: {
    name?: string;
    category?: string;
    isActive?: boolean;
  },
): PromptRecord[] => {
  let filtered = rows;
  if (options.name) {
    const lower = options.name.toLowerCase();
    filtered = filtered.filter((row) => row.name.toLowerCase().includes(lower));
  }
  if (options.category) {
    const lower = options.category.toLowerCase();
    filtered = filtered.filter((row) => row.category.toLowerCase().includes(lower));
  }
  if (options.isActive !== undefined) {
    filtered = filtered.filter((row) => row.isActive === options.isActive);
  }

  return filtered.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    if (a.name !== b.name) {
      return a.name.localeCompare(b.name);
    }
    return b.version - a.version;
  });
};

export class FilePromptProvider {
  async createPrompt(prompt: Prompt): Promise<Prompt> {
    const now = new Date();
    let created: PromptRecord | null = null;

    await updateJsonArrayFile<PromptRecord>(promptFilePath, (rows) => {
      const id = prompt.id ?? nextNumericStringId(rows);
      const createdRecord = toRecord(new Prompt({ ...prompt, id }), now, id);
      created = createdRecord;
      return [...rows, createdRecord];
    });

    if (!created) {
      throw new Error("Failed to create prompt record.");
    }
    return toDomain(created);
  }

  async findPrompts(options: {
    name?: string;
    category?: string;
    isActive?: boolean;
  } = {}): Promise<Prompt[]> {
    const rows = await readJsonArrayFile<PromptRecord>(promptFilePath);
    return filterPrompts(rows, options).map((row) => toDomain(row));
  }

  async getAllActivePrompts(): Promise<Prompt[]> {
    const rows = await readJsonArrayFile<PromptRecord>(promptFilePath);
    return filterPrompts(rows, { isActive: true }).map((row) => toDomain(row));
  }

  async findAllByNameAndCategory(
    name: string,
    category: string,
    suitableForModels?: string | null,
  ): Promise<Prompt[]> {
    const rows = await readJsonArrayFile<PromptRecord>(promptFilePath);
    const filtered = rows.filter((row) => {
      if (row.name !== name || row.category !== category) {
        return false;
      }
      if (suitableForModels === undefined || suitableForModels === null) {
        return true;
      }
      return row.suitableForModels === suitableForModels;
    });
    return filtered.map((row) => toDomain(row));
  }

  async getActivePromptsByContext(name: string, category: string): Promise<Prompt[]> {
    const rows = await readJsonArrayFile<PromptRecord>(promptFilePath);
    return rows
      .filter((row) => row.isActive && row.name === name && row.category === category)
      .map((row) => toDomain(row));
  }

  async updatePrompt(prompt: Prompt): Promise<Prompt> {
    if (!prompt.id) {
      throw new Error("Prompt id is required for update.");
    }

    const now = new Date();
    let updated: PromptRecord | null = null;

    await updateJsonArrayFile<PromptRecord>(promptFilePath, (rows) => {
      const index = rows.findIndex((row) => row.id === prompt.id);
      if (index < 0) {
        throw new Error("Prompt not found");
      }
      const current = rows[index] as PromptRecord;
      const updatedRecord: PromptRecord = {
        ...toRecord(prompt, now, current.id),
        id: current.id,
        createdAt: current.createdAt,
        updatedAt: now.toISOString(),
      };
      const next = [...rows];
      updated = updatedRecord;
      next[index] = updatedRecord;
      return next;
    });

    if (!updated) {
      throw new Error(`Failed to update prompt ${prompt.id}.`);
    }
    return toDomain(updated);
  }

  async getPromptById(promptId: string): Promise<Prompt> {
    const rows = await readJsonArrayFile<PromptRecord>(promptFilePath);
    const found = rows.find((row) => row.id === promptId);
    if (!found) {
      throw new Error("Prompt not found");
    }
    return toDomain(found);
  }

  async deletePrompt(promptId: string): Promise<boolean> {
    let removed = false;
    await updateJsonArrayFile<PromptRecord>(promptFilePath, (rows) => {
      const next = rows.filter((row) => row.id !== promptId);
      removed = next.length !== rows.length;
      return next;
    });
    return removed;
  }
}
