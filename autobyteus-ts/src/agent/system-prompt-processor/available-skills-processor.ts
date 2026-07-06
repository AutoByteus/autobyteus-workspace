import { BaseSystemPromptProcessor } from './base-processor.js';
import { SkillRegistry } from '../../skills/registry.js';
import { formatSkillContentForPrompt } from '../../skills/format-skill-content-for-prompt.js';
import { SkillAccessMode, resolveSkillAccessMode } from '../context/skill-access-mode.js';
import type { BaseTool } from '../../tools/base-tool.js';
import type { AgentContextLike } from '../context/agent-context-like.js';

export class AvailableSkillsProcessor extends BaseSystemPromptProcessor {
  static getName(): string {
    return 'AvailableSkillsProcessor';
  }

  static isMandatory(): boolean {
    return true;
  }

  process(
    systemPrompt: string,
    toolInstances: Record<string, BaseTool>,
    agentId: string,
    context: AgentContextLike
  ): string {
    void toolInstances;

    const registry = new SkillRegistry();
    const preloadedSkills = context?.config?.skills ?? [];
    const skillAccessMode = resolveSkillAccessMode(
      context?.config?.skillAccessMode,
      preloadedSkills.length
    );

    if (skillAccessMode === SkillAccessMode.NONE) {
      console.info(`Agent '${agentId}': Skill access mode is NONE. Skipping injection.`);
      return systemPrompt;
    }

    if (preloadedSkills.length === 0) {
      console.info(`Agent '${agentId}': No configured skills. Skipping injection.`);
      return systemPrompt;
    }

    const catalogSkills = preloadedSkills
      .map((skillName) => registry.getSkill(skillName))
      .filter((skill): skill is NonNullable<typeof skill> => Boolean(skill));

    if (!catalogSkills.length) {
      console.info(
        `Agent '${agentId}': Configured skills produced no catalog entries. Skipping injection.`
      );
      return systemPrompt;
    }

    const catalogEntries: string[] = [];
    const detailedSections: string[] = [];

    for (const skill of catalogSkills) {
      catalogEntries.push(`- **${skill.name}**: ${skill.description}`);
      detailedSections.push(
        `#### ${skill.name}\n**Skill Base Path:** \`${skill.rootPath}\`\n\n${formatSkillContentForPrompt(skill)}`
      );
    }

    let skillsBlock = '\n\n## Agent Skills\n';
    skillsBlock += '### Skill Catalog\n';
    skillsBlock += `${catalogEntries.join('\n')}\n`;

    if (detailedSections.length) {
      skillsBlock += `
### Critical Rules for Using Skills

> **Path Resolution Required for Remaining Relative Skill References**
> 
> Resolvable Markdown links are already rewritten to absolute filesystem paths before injection.
> However, plain-text relative references or unresolved targets may still appear in skill instructions.
> 
> When a skill refers to a file by a remaining relative path, you MUST convert it to ABSOLUTE:
> \`Skill Base Path\` + \`Relative Path\` = \`Absolute Path\`
> 
> **Examples:**
> 1. Skill Base Path: \`/path/to/skill\`
>    Relative: \`./scripts/run.sh\`
>    Result: \`/path/to/skill/scripts/run.sh\`
> 
> 2. Skill Base Path: \`/path/to/skill\`
>    Relative: \`scripts/run.sh\`
>    Result: \`/path/to/skill/scripts/run.sh\`

`;
      skillsBlock += '### Skill Details\n';
      skillsBlock += `${detailedSections.join('\n')}\n`;
    }

    console.info(
      `Agent '${agentId}': Injected ${catalogEntries.length} skills in catalog, ${detailedSections.length} with details. mode='${skillAccessMode}'.`
    );
    return systemPrompt + skillsBlock;
  }
}
