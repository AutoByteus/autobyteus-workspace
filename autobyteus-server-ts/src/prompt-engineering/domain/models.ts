export class Prompt {
  id?: string | null;
  name: string;
  category: string;
  promptContent: string;
  description?: string | null;
  suitableForModels?: string | null;
  version?: number | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  parentId?: string | null;
  isActive: boolean;

  constructor(options: {
    name: string;
    category: string;
    promptContent: string;
    description?: string | null;
    suitableForModels?: string | null;
    id?: string | null;
    version?: number | null;
    createdAt?: Date | null;
    updatedAt?: Date | null;
    parentId?: string | null;
    isActive?: boolean;
  }) {
    this.name = options.name;
    this.category = options.category;
    this.promptContent = options.promptContent;
    this.description = options.description ?? null;
    this.suitableForModels = options.suitableForModels ?? null;
    this.id = options.id ?? null;
    this.version = options.version ?? 1;
    this.createdAt = options.createdAt ?? null;
    this.updatedAt = options.updatedAt ?? null;
    this.parentId = options.parentId ?? null;
    this.isActive = options.isActive ?? true;
  }
}
