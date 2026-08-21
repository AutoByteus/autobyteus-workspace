import {
  WorkspaceSkillMaterializer,
  type WorkspaceSkillMaterializationProfile,
} from "../shared/workspace-skill-materializer.js";

export const CODEX_WORKSPACE_SKILL_MATERIALIZATION_PROFILE: WorkspaceSkillMaterializationProfile = {
  runtimeLabel: "Codex",
  workspaceSkillsRootSegments: [".codex", "skills"],
};

let cachedCodexWorkspaceSkillMaterializer: WorkspaceSkillMaterializer | null = null;

export const getCodexWorkspaceSkillMaterializer = (): WorkspaceSkillMaterializer => {
  if (!cachedCodexWorkspaceSkillMaterializer) {
    cachedCodexWorkspaceSkillMaterializer = new WorkspaceSkillMaterializer(
      CODEX_WORKSPACE_SKILL_MATERIALIZATION_PROFILE,
    );
  }
  return cachedCodexWorkspaceSkillMaterializer;
};
