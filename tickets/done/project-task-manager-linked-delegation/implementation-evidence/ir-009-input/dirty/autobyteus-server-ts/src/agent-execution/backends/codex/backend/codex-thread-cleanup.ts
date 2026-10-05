import {
  getCodexWorkspaceSkillMaterializer,
} from "../codex-workspace-skill-materializer.js";
import type {
  MaterializedWorkspaceSkill,
  WorkspaceSkillMaterializer,
} from "../../shared/workspace-skill-materializer.js";

export type CodexThreadCleanupTarget = {
  workingDirectory: string;
  materializedConfiguredSkills?: MaterializedWorkspaceSkill[] | null;
};

export class CodexThreadCleanup {
  private readonly workspaceSkillMaterializer: WorkspaceSkillMaterializer;

  constructor(
    workspaceSkillMaterializer: WorkspaceSkillMaterializer = getCodexWorkspaceSkillMaterializer(),
  ) {
    this.workspaceSkillMaterializer = workspaceSkillMaterializer;
  }

  async cleanupPreparedWorkspaceSkills(
    materializedConfiguredSkills: MaterializedWorkspaceSkill[] | null | undefined,
  ): Promise<void> {
    await this.cleanupMaterializedWorkspaceSkills(materializedConfiguredSkills);
  }

  private async cleanupMaterializedWorkspaceSkills(
    materializedConfiguredSkills: MaterializedWorkspaceSkill[] | null | undefined,
  ): Promise<void> {
    await this.workspaceSkillMaterializer.cleanupMaterializedWorkspaceSkills(
      materializedConfiguredSkills,
    );
  }


}

let cachedCodexThreadCleanup: CodexThreadCleanup | null = null;

export const getCodexThreadCleanup = (): CodexThreadCleanup => {
  if (!cachedCodexThreadCleanup) {
    cachedCodexThreadCleanup = new CodexThreadCleanup();
  }
  return cachedCodexThreadCleanup;
};
