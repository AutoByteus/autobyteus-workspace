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
