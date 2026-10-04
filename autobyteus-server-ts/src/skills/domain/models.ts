export class Skill {
  managedSource: { sourceId: string; generation: string } | null = null;
  name: string;
  description: string;
  content: string;
  rootPath: string;
  fileCount: number;
  isReadonly: boolean;
  isDisabled: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;

  constructor(options: {
    name: string;
    description: string;
    content: string;
    rootPath: string;
    fileCount?: number;
    isReadonly?: boolean;
    isDisabled?: boolean;
    createdAt?: Date | null;
    updatedAt?: Date | null;
  }) {
    this.name = options.name;
    this.description = options.description;
    this.content = options.content;
    this.rootPath = options.rootPath;
    this.fileCount = options.fileCount ?? 0;
    this.isReadonly = options.isReadonly ?? false;
    this.isDisabled = options.isDisabled ?? false;
    this.createdAt = options.createdAt ?? null;
    this.updatedAt = options.updatedAt ?? null;
  }
}
