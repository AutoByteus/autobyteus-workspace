import { agentRuntimeName } from "@autobyteus/agent-presentation-contracts";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import { SkillService } from "../../../skills/services/skill-service.js";
import {
  WorkspaceSkillMaterializer,
  type WorkspaceSkillMaterializationProfile,
} from "../shared/workspace-skill-materializer.js";

/** Grok discovers workspace skills under `.grok/skills`. */
export const GROK_WORKSPACE_SKILL_MATERIALIZATION_PROFILE: WorkspaceSkillMaterializationProfile = {
  runtimeLabel: agentRuntimeName(RuntimeKind.GROK_BUILD),
  workspaceSkillsRootSegments: [".grok", "skills"],
};

let cachedGrokWorkspaceSkillMaterializer: WorkspaceSkillMaterializer | null = null;

export const getGrokWorkspaceSkillMaterializer = (): WorkspaceSkillMaterializer => {
  cachedGrokWorkspaceSkillMaterializer ??= new WorkspaceSkillMaterializer(GROK_WORKSPACE_SKILL_MATERIALIZATION_PROFILE, { resolveManagedSkill: (sourceId, name) => SkillService.getInstance().resolveManagedSkillForMaterialization(sourceId, name) });
  return cachedGrokWorkspaceSkillMaterializer;
};
