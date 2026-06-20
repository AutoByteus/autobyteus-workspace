import { formatSkillContentForPrompt } from "autobyteus-ts/skills/format-skill-content-for-prompt.js";
import type { Skill } from "../../skills/domain/models.js";

export const formatSkillPathResolutionGuidance = (skillRootPath: string): string => `> **CRITICAL: Path Resolution When Using Tools**
>
> Resolvable Markdown links in this skill are already rewritten to absolute filesystem paths below.
> If the skill refers to a remaining plain-text relative path, you MUST construct the full absolute path by combining the Skill Base Path above
> with that relative path from the skill instructions.
>
> **Example:** Skill Base Path + \`./scripts/format.sh\` = \`${skillRootPath}/scripts/format.sh\``;

export const formatSkillInstructionsForPrompt = (skill: Skill): string =>
  formatSkillContentForPrompt(skill);
