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
    _toolInstances: Record<string, BaseTool>,
    agentId: string,
    context: AgentContextLike
  ): string {
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

    const allSkills = registry.listSkills();
    const preloadedSkillSet = new Set(preloadedSkills);

    if (!allSkills.length) {
      console.info(`Agent '${agentId}': No skills found in registry. Skipping injection.`);
      return systemPrompt;
    }

    const catalogSkills =
      skillAccessMode === SkillAccessMode.PRELOADED_ONLY
        ? preloadedSkills
            .map((skillName) => registry.getSkill(skillName))
            .filter((skill): skill is NonNullable<typeof skill> => Boolean(skill))
        : allSkills;

    if (!catalogSkills.length) {
      console.info(
        `Agent '${agentId}': Skill access mode '${skillAccessMode}' produced no catalog entries. Skipping injection.`
      );
      return systemPrompt;
    }

    const catalogEntries: string[] = [];
    const detailedSections: string[] = [];

    for (const skill of catalogSkills) {
      catalogEntries.push(`- **${skill.name}**: ${skill.description}`);
      if (
        skillAccessMode === SkillAccessMode.PRELOADED_ONLY ||
        preloadedSkillSet.has(skill.name)
      ) {
        detailedSections.push(
          `#### ${skill.name}\n**Skill Base Path:** \`${skill.rootPath}\`\n\n${formatSkillContentForPrompt(skill)}`
        );
      }
    }

    let skillsBlock = '\n\n## Agent Skills\n';
    skillsBlock += '### Skill Catalog\n';
    skillsBlock += `${catalogEntries.join('\n')}\n`;
    if (skillAccessMode === SkillAccessMode.GLOBAL_DISCOVERY) {
      skillsBlock += '\nTo load a skill not shown in detail below, use the `load_skill` tool.\n';
    }

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
