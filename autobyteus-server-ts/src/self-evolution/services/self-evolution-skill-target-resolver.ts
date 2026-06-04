import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import { SkillService } from "../../skills/services/skill-service.js";
import type { SelfEvolutionSkillTarget } from "../domain/models.js";

const execFileAsync = promisify(execFile);

export class SelfEvolutionSkillTargetResolver {
  constructor(private readonly skillService: Pick<SkillService, "resolveConfiguredSkillsForAgent"> = SkillService.getInstance()) {}

  async resolveForAgentDefinition(agentDefinition: AgentDefinition): Promise<SelfEvolutionSkillTarget[]> {
    const skills = this.skillService.resolveConfiguredSkillsForAgent(agentDefinition);
    return Promise.all(skills.map(async (skill): Promise<SelfEvolutionSkillTarget> => {
      const skillRootPath = path.resolve(skill.rootPath);
      const skillMdPath = path.join(skillRootPath, "SKILL.md");
      const gitRootPath = await this.resolveGitRoot(skillRootPath);
      const isWritable = !skill.isReadonly && await this.isWritableFile(skillMdPath);
      return {
        skillName: skill.name,
        skillRootPath,
        skillMdPath,
        sourceLabel: skill.isReadonly ? "read_only" : null,
        isWritable,
        gitRootPath,
        rollbackMode: gitRootPath ? "git" : isWritable ? "unversioned" : "none",
      };
    }));
  }

  private async isWritableFile(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath, fsConstants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  private async resolveGitRoot(directoryPath: string): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync(
        "git",
        ["-C", directoryPath, "rev-parse", "--show-toplevel"],
        { timeout: 2_000, maxBuffer: 1024 * 64 },
      );
      const normalized = stdout.trim();
      return normalized ? path.resolve(normalized) : null;
    } catch {
      return null;
    }
  }
}
