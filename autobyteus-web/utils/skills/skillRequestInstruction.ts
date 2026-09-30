/**
 * The one owner of the "use these skills" instruction wording (REQ-008, DEC-012).
 *
 * Skill tags are carried inside the message content as a canonical sentence prefix,
 * so live and reloaded messages render identically on every runtime:
 *
 *   compose(['skill-optimizer'], 'Help me…') === 'Use the skill-optimizer skill for this request.\n\nHelp me…'
 *   compose(['a', 'b'], 'x')                 === 'Use these skills for this request: a, b.\n\nx'
 *   compose(['a'], '')                       === 'Use the a skill for this request.'
 *
 * `parse` recognizes only content that starts with exactly one of these sentence forms,
 * followed by a blank line or the end of the content.
 */

const SINGLE_SKILL_PATTERN = /^Use the (.+?) skill for this request\.(?:\n\n([\s\S]*))?$/;
const MULTIPLE_SKILLS_PATTERN = /^Use these skills for this request: ([^\n]+?)\.(?:\n\n([\s\S]*))?$/;

export interface ParsedSkillRequest {
  skillNames: string[];
  /** The user's own text after the instruction; empty for a tags-only message. */
  text: string;
}

const buildInstruction = (skillNames: readonly string[]): string =>
  skillNames.length === 1
    ? `Use the ${skillNames[0]} skill for this request.`
    : `Use these skills for this request: ${skillNames.join(', ')}.`;

export const compose = (skillNames: readonly string[], text: string): string => {
  const names = skillNames.map((name) => name.trim()).filter(Boolean);
  if (names.length === 0) {
    return text;
  }
  const instruction = buildInstruction(names);
  return text.trim() ? `${instruction}\n\n${text}` : instruction;
};

export const parse = (content: string): ParsedSkillRequest | null => {
  const single = SINGLE_SKILL_PATTERN.exec(content);
  if (single) {
    return { skillNames: [single[1]!], text: single[2] ?? '' };
  }
  const multiple = MULTIPLE_SKILLS_PATTERN.exec(content);
  if (multiple) {
    const skillNames = multiple[1]!.split(', ').map((name) => name.trim()).filter(Boolean);
    if (skillNames.length < 2) {
      return null;
    }
    return { skillNames, text: multiple[2] ?? '' };
  }
  return null;
};

export const skillRequestInstruction = { compose, parse };
