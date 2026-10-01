import { parseCollaboratorMentionNote } from '@autobyteus/agent-presentation-contracts'
import { skillRequestInstruction } from '~/utils/skills/skillRequestInstruction'

/** One `@` mention chosen in a live-run composer; the server re-validates it on send. */
export interface RequestedCollaboratorMention {
  kind: 'agent' | 'agent_team'
  definitionId: string
  name: string
}

export type CollaboratorMentionDto = Readonly<{ kind: 'agent' | 'agent_team'; definition_id: string }>

export const mentionToken = (name: string): string => `@${name}`

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** True when `@Name` appears in the text as a whole mention (not a prefix of a longer word). */
export const textHasMention = (text: string, name: string): boolean =>
  new RegExp(`(^|\\s)${escapeRegExp(mentionToken(name))}(?![\\w-])`).test(text)

/** The chosen mentions whose `@Name` is still in the text; deleting the text drops the mention. */
export const mentionsPresentInText = (
  text: string,
  mentions: readonly RequestedCollaboratorMention[] | undefined,
): RequestedCollaboratorMention[] => (mentions ?? []).filter((mention) => textHasMention(text, mention.name))

/** The optional SEND_MESSAGE `mentions` field; `undefined` when the message mentions nobody. */
export const toCollaboratorMentionDtos = (
  text: string,
  mentions: readonly RequestedCollaboratorMention[],
): CollaboratorMentionDto[] | undefined => {
  const present = mentionsPresentInText(text, mentions)
  return present.length
    ? present.map((mention) => Object.freeze({ kind: mention.kind, definition_id: mention.definitionId }))
    : undefined
}

/** Removing a chip keeps the words and drops the mention: `@Name` becomes `Name`. */
export const removeMentionFromText = (text: string, name: string): string =>
  text.split(mentionToken(name)).join(name)

export type MentionTextPart = Readonly<{ kind: 'text' | 'mention'; value: string }>

/** Splits text into plain parts and the known `@Name` mentions it contains. */
export const splitMentionText = (text: string, names: readonly string[]): MentionTextPart[] => {
  const known = [...new Set(names.filter(Boolean))].sort((left, right) => right.length - left.length)
  if (!known.length || !text.includes('@')) return [{ kind: 'text', value: text }]
  const pattern = new RegExp(`(^|\\s)(${known.map((name) => escapeRegExp(mentionToken(name))).join('|')})(?![\\w-])`, 'g')
  const parts: MentionTextPart[] = []
  let cursor = 0
  for (const match of text.matchAll(pattern)) {
    const start = (match.index ?? 0) + match[1]!.length
    if (start > cursor) parts.push({ kind: 'text', value: text.slice(cursor, start) })
    parts.push({ kind: 'mention', value: match[2]!.slice(1) })
    cursor = start + match[2]!.length
  }
  if (cursor < text.length) parts.push({ kind: 'text', value: text.slice(cursor) })
  return parts
}

export type SentUserMessagePresentation = Readonly<{
  skillNames: readonly string[]
  /** The user's own words, without the skill instruction or the server's mention note. */
  text: string
  mentionNames: readonly string[]
}>

/**
 * How a sent user message reads: the skill instruction prefix and the server-composed
 * `[Mentioned collaborators]` note are wrapper text, not the user's words.
 */
export const presentSentUserMessage = (
  content: string,
  localMentionNames: readonly string[] = [],
): SentUserMessagePresentation => {
  const skill = skillRequestInstruction.parse(content)
  const afterSkill = skill ? skill.text : content
  const note = parseCollaboratorMentionNote(afterSkill)
  return Object.freeze({
    skillNames: skill?.skillNames ?? [],
    text: note ? note.text : afterSkill,
    mentionNames: [...new Set([...(note?.collaborators.map((entry) => entry.name) ?? []), ...localMentionNames])],
  })
}
