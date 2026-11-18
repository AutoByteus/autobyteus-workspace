import { agentRuntimeName } from "@autobyteus/agent-presentation-contracts";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import { SkillService } from "../../../skills/services/skill-service.js";
import {
  WorkspaceSkillMaterializer,
  type WorkspaceSkillMaterializationProfile,
} from "../shared/workspace-skill-materializer.js";

export const CODEX_WORKSPACE_SKILL_MATERIALIZATION_PROFILE: WorkspaceSkillMaterializationProfile = {
  runtimeLabel: agentRuntimeName(RuntimeKind.CODEX_APP_SERVER),
  workspaceSkillsRootSegments: [".codex", "skills"],
};

let cachedCodexWorkspaceSkillMaterializer: WorkspaceSkillMaterializer | null = null;

export const getCodexWorkspaceSkillMaterializer = (): WorkspaceSkillMaterializer => {
  if (!cachedCodexWorkspaceSkillMaterializer) {
    cachedCodexWorkspaceSkillMaterializer = new WorkspaceSkillMaterializer(
      CODEX_WORKSPACE_SKILL_MATERIALIZATION_PROFILE,
      { resolveManagedSkill: (sourceId, name) => SkillService.getInstance().resolveManagedSkillForMaterialization(sourceId, name) },
    );
  }
  return cachedCodexWorkspaceSkillMaterializer;
};
