import {
  getCodexAppServerClientManager,
  type CodexAppServerClientManager,
} from "../../../../runtime-management/codex/client/codex-app-server-client-manager.js";
import {
  getCodexWorkspaceSkillMaterializer,
  type CodexWorkspaceSkillMaterializer,
  type MaterializedCodexWorkspaceSkill,
} from "../codex-workspace-skill-materializer.js";

export type CodexThreadCleanupTarget = {
  workingDirectory: string;
  materializedConfiguredSkills?: MaterializedCodexWorkspaceSkill[] | null;
};

export class CodexThreadCleanup {
  private readonly workspaceSkillMaterializer: CodexWorkspaceSkillMaterializer;
  private readonly clientManager: CodexAppServerClientManager;

  constructor(
    workspaceSkillMaterializer: CodexWorkspaceSkillMaterializer = getCodexWorkspaceSkillMaterializer(),
    clientManager: CodexAppServerClientManager = getCodexAppServerClientManager(),
  ) {
    this.workspaceSkillMaterializer = workspaceSkillMaterializer;
    this.clientManager = clientManager;
  }

  async cleanupPreparedWorkspaceSkills(
    materializedConfiguredSkills: MaterializedCodexWorkspaceSkill[] | null | undefined,
  ): Promise<void> {
    await this.cleanupMaterializedWorkspaceSkills(materializedConfiguredSkills);
  }

  async cleanupThreadResources(input: CodexThreadCleanupTarget): Promise<void> {
    await this.cleanupMaterializedWorkspaceSkills(input.materializedConfiguredSkills);
    await this.releaseWorkspaceClient(input.workingDirectory);
  }

  private async cleanupMaterializedWorkspaceSkills(
    materializedConfiguredSkills: MaterializedCodexWorkspaceSkill[] | null | undefined,
  ): Promise<void> {
    await this.workspaceSkillMaterializer.cleanupMaterializedCodexWorkspaceSkills(
      materializedConfiguredSkills,
    );
  }

  private async releaseWorkspaceClient(workingDirectory: string): Promise<void> {
    await this.clientManager.releaseClient(workingDirectory);
  }
}

let cachedCodexThreadCleanup: CodexThreadCleanup | null = null;

export const getCodexThreadCleanup = (): CodexThreadCleanup => {
  if (!cachedCodexThreadCleanup) {
    cachedCodexThreadCleanup = new CodexThreadCleanup();
  }
  return cachedCodexThreadCleanup;
};
