import path from 'path';
import { BaseSystemPromptProcessor } from './base-processor.js';
import { SkillRegistry } from '../../skills/registry.js';
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
    const configuredSkills = context?.config?.skills ?? [];
    const skillAccessMode = resolveSkillAccessMode(
      context?.config?.skillAccessMode,
      configuredSkills.length
    );

    if (skillAccessMode === SkillAccessMode.NONE) {
      console.info(`Agent '${agentId}': Skill access mode is NONE. Skipping skill catalog.`);
      return systemPrompt;
    }

    if (configuredSkills.length === 0) {
      console.info(`Agent '${agentId}': No configured skills. Skipping skill catalog.`);
      return systemPrompt;
    }

    const catalogSkills = configuredSkills
      .map((skillName) => registry.getSkill(skillName))
      .filter((skill): skill is NonNullable<typeof skill> => Boolean(skill));

    if (!catalogSkills.length) {
      console.info(
        `Agent '${agentId}': Configured skills produced no catalog entries. Skipping skill catalog.`
      );
      return systemPrompt;
    }

    const catalogEntries = catalogSkills.map(
      (skill) =>
        `- **${skill.name}**: ${skill.description}\n` +
        `  - **SKILL.md:** \`${path.resolve(skill.rootPath, 'SKILL.md')}\``
    );

    const skillsBlock = `\n\n## Agent Skills

### Skill Catalog

${catalogEntries.join('\n')}

### Rules for Using Skills

- Use a configured skill whenever it applies to the task.
- When no configured skill applies, use the best available general approach.
- When an applicable configured skill covers only part of the task, follow it for the covered part and use another available technique for the uncovered part.
- Before beginning work governed by a skill, read its \`SKILL.md\` from the exact path listed above.
- Resolve every relative path mentioned by a skill from the directory containing that skill's \`SKILL.md\`.
`;

    console.info(
      `Agent '${agentId}': Added ${catalogEntries.length} configured skill catalog entries with paths. mode='${skillAccessMode}'.`
    );
    return systemPrompt + skillsBlock;
  }
}
