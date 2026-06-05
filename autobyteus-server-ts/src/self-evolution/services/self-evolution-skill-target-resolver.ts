import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import { SkillService } from "../../skills/services/skill-service.js";
import type { SelfEvolutionSkillTarget } from "../domain/models.js";

export class SelfEvolutionSkillTargetResolver {
  constructor(private readonly skillService: Pick<SkillService, "resolveConfiguredSkillsForAgent"> = SkillService.getInstance()) {}

  async resolveForAgentDefinition(agentDefinition: AgentDefinition): Promise<SelfEvolutionSkillTarget[]> {
    const skills = this.skillService.resolveConfiguredSkillsForAgent(agentDefinition);
    return Promise.all(skills.map(async (skill): Promise<SelfEvolutionSkillTarget> => {
      const skillRootPath = path.resolve(skill.rootPath);
      const skillMdPath = path.join(skillRootPath, "SKILL.md");
      const isWritable = !skill.isReadonly &&
        await this.isWritableDirectory(skillRootPath) &&
        await this.isWritableFile(skillMdPath);
      return {
        skillName: skill.name,
        skillRootPath,
        skillMdPath,
        sourceLabel: skill.isReadonly ? "read_only" : null,
        isWritable,
      };
    }));
  }

  private async isWritableDirectory(directoryPath: string): Promise<boolean> {
    try {
      await fs.access(directoryPath, fsConstants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  private async isWritableFile(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath, fsConstants.W_OK);
      return true;
    } catch {
      return false;
    }
  }
}
