import type { ChatTarget } from '~/stores/chatDraftStore'

export interface ChatSkillOption {
  name: string
  description: string
}

export interface ChatTargetOption {
  key: string
  kind: 'agent' | 'team'
  id: string
  name: string
  initials: string
  description: string
}

export const toChatTarget = (option: ChatTargetOption): ChatTarget =>
  option.kind === 'team'
    ? { kind: 'team', teamDefinitionId: option.id }
    : { kind: 'agent', agentDefinitionId: option.id }

export const initialsFor = (name: string): string =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'AI'

/** Rank skills for `/q`: name prefix, then name contains, then description contains. */
export const rankSkills = (skills: readonly ChatSkillOption[], query: string): ChatSkillOption[] => {
  const q = query.trim().toLowerCase()
  if (!q) return [...skills]
  const rank = (skill: ChatSkillOption): number => {
    const name = skill.name.toLowerCase()
    if (name.startsWith(q)) return 0
    if (name.includes(q)) return 1
    return skill.description.toLowerCase().includes(q) ? 2 : 3
  }
  return skills
    .map((skill, index) => ({ skill, index, score: rank(skill) }))
    .filter((item) => item.score < 3)
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .map((item) => item.skill)
}

export const filterTargets = (targets: readonly ChatTargetOption[], query: string): ChatTargetOption[] => {
  const q = query.trim().toLowerCase()
  if (!q) return [...targets]
  return targets.filter((target) => target.name.toLowerCase().includes(q) || target.id.toLowerCase().includes(q))
}

/** Detect a `/` or `@` trigger at the start of the word before the caret. */
export const detectMenuTrigger = (
  textBeforeCaret: string,
  options: { mentions: boolean; skills: boolean },
): { kind: 'skill' | 'target'; query: string; start: number } | null => {
  const match = /(^|\s)([/@])([\w.-]*)$/.exec(textBeforeCaret)
  if (!match) return null
  const kind = match[2] === '@' ? 'target' : 'skill'
  if (kind === 'target' && !options.mentions) return null
  if (kind === 'skill' && !options.skills) return null
  return { kind, query: match[3]!, start: textBeforeCaret.length - match[3]!.length - 1 }
}
