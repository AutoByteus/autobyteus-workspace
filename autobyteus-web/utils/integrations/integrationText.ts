/** A piece of a sentence: plain text, or the integration's skill name (shown as code). */
export type SkillNamePart = { text: string; skill: boolean }

/** Splits a sentence so the integration's skill name stands out wherever it appears. */
export const withSkillName = (text: string, skillName: string): SkillNamePart[] => (skillName
  ? text.split(skillName).flatMap((piece, index, all) => (index < all.length - 1
    ? [{ text: piece, skill: false }, { text: skillName, skill: true }]
    : [{ text: piece, skill: false }]))
  : [{ text, skill: false }])
  .filter(part => part.text !== '')

/** A piece of an integration's help text: plain text, or an `https:` link. */
export type HelpTextPart = { text: string; href: string | null }

const HTTPS_URL = /https:\/\/[^\s<>"')]+[^\s<>"').,;:!?]/g

/**
 * Splits an integration's own help text (repository content) into text and links. Only `https:` web addresses become
 * links; `http:`, `javascript:`, `data:` and anything else stay plain text. The result is rendered as text nodes and
 * link elements, never as HTML.
 */
export const helpTextParts = (text: string): HelpTextPart[] => {
  const parts: HelpTextPart[] = []
  let last = 0
  for (const match of text.matchAll(HTTPS_URL)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), href: null })
    parts.push({ text: match[0], href: match[0] })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), href: null })
  return parts
}
