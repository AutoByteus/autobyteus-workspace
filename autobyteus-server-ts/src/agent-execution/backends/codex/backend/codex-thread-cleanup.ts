import {
  getCodexAppServerClientManager,
  type CodexAppServerClientManager,
} from "../../../../runtime-management/codex/client/codex-app-server-client-manager.js";
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
  private readonly clientManager: CodexAppServerClientManager;

  constructor(
    workspaceSkillMaterializer: WorkspaceSkillMaterializer = getCodexWorkspaceSkillMaterializer(),
    clientManager: CodexAppServerClientManager = getCodexAppServerClientManager(),
  ) {
    this.workspaceSkillMaterializer = workspaceSkillMaterializer;
    this.clientManager = clientManager;
  }

  async cleanupPreparedWorkspaceSkills(
    materializedConfiguredSkills: MaterializedWorkspaceSkill[] | null | undefined,
  ): Promise<void> {
    await this.cleanupMaterializedWorkspaceSkills(materializedConfiguredSkills);
  }

  async cleanupThreadResources(input: CodexThreadCleanupTarget): Promise<void> {
    await this.cleanupMaterializedWorkspaceSkills(input.materializedConfiguredSkills);
    await this.releaseWorkspaceClient(input.workingDirectory);
  }

  private async cleanupMaterializedWorkspaceSkills(
    materializedConfiguredSkills: MaterializedWorkspaceSkill[] | null | undefined,
  ): Promise<void> {
    await this.workspaceSkillMaterializer.cleanupMaterializedWorkspaceSkills(
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
