import { SkillService } from "../../../skills/services/skill-service.js";
import {
  WorkspaceSkillMaterializer,
  type WorkspaceSkillMaterializationProfile,
} from "../shared/workspace-skill-materializer.js";

export const CLAUDE_WORKSPACE_SKILL_MATERIALIZATION_PROFILE: WorkspaceSkillMaterializationProfile = {
  runtimeLabel: "Claude",
  workspaceSkillsRootSegments: [".claude", "skills"],
};

let cachedClaudeWorkspaceSkillMaterializer: WorkspaceSkillMaterializer | null = null;

export const getClaudeWorkspaceSkillMaterializer = (): WorkspaceSkillMaterializer => {
  if (!cachedClaudeWorkspaceSkillMaterializer) {
    cachedClaudeWorkspaceSkillMaterializer = new WorkspaceSkillMaterializer(
      CLAUDE_WORKSPACE_SKILL_MATERIALIZATION_PROFILE,
      { resolveManagedSkill: (sourceId, name) => SkillService.getInstance().resolveManagedSkillForMaterialization(sourceId, name) },
    );
  }
  return cachedClaudeWorkspaceSkillMaterializer;
};
