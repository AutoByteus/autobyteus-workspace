/**
 * TypeScript types for Skills
 */

export interface Skill {
  name: string
  description: string
  content: string
  rootPath: string
  fileCount: number
  isReadonly: boolean
  isDisabled: boolean
  isVersioned: boolean
  activeVersion?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CreateSkillInput {
  name: string
  description: string
  content: string
}

export interface UpdateSkillInput {
  name: string
  description?: string
  content?: string
}

export interface DeleteSkillResult {
  success: boolean
  message: string
}

export interface SkillVersion {
  tag: string
  commitHash: string
  message: string
  createdAt: string
  isActive: boolean
}

export interface SkillDiff {
  fromVersion: string
  toVersion: string
  diffContent: string
}
