/**
 * Skill-tag menu helpers shared by the Chat box and the product message box (`/` skill tags):
 * the skill option shape, ranking for `/q`, and detection of the `/` (or Chat's `@`) trigger.
 */
export interface SkillTagOption {
  name: string
  description: string
}

/** Rank skills for `/q`: name prefix, then name contains, then description contains. */
export const rankSkills = (skills: readonly SkillTagOption[], query: string): SkillTagOption[] => {
  const q = query.trim().toLowerCase()
  if (!q) return [...skills]
  const rank = (skill: SkillTagOption): number => {
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
