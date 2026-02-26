import { WorkspaceConfig } from 'autobyteus-ts';
import { FileSystemWorkspace } from './filesystem-workspace.js';

const logger = {
  info: (...args: unknown[]) => console.info(...args),
};

export class SkillWorkspace extends FileSystemWorkspace {
  readonly skillName: string;

  private constructor(skillName: string, config: WorkspaceConfig) {
    super(config);
    this.skillName = skillName;
  }

  static async create(skillName: string): Promise<SkillWorkspace> {
    try {
      const module = await import('../skills/services/skill-service.js');
      const SkillService = module.SkillService as new () => {
        getSkill: (name: string) => { rootPath: string } | null;
      };
      const skillService = new SkillService();
      const skill = skillService.getSkill(skillName);

      if (!skill) {
        throw new Error(`Skill '${skillName}' not found`);
      }

      const workspaceId = `skill_ws_${skillName}`;
      const config = new WorkspaceConfig({
        rootPath: skill.rootPath,
        workspaceId,
      });

      const workspace = new SkillWorkspace(skillName, config);
      logger.info(`Initialized SkillWorkspace for skill '${skillName}' at ${skill.rootPath}`);
      return workspace;
    } catch (error) {
      throw new Error(`SkillWorkspace creation failed for '${skillName}': ${String(error)}`);
    }
  }
}
