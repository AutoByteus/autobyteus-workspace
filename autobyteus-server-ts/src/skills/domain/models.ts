export class Skill {
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

export class SkillSourceInfo {
  path: string;
  skillCount: number;
  isDefault: boolean;

  constructor(options: { path: string; skillCount?: number; isDefault?: boolean }) {
    this.path = options.path;
    this.skillCount = options.skillCount ?? 0;
    this.isDefault = options.isDefault ?? false;
  }
}
