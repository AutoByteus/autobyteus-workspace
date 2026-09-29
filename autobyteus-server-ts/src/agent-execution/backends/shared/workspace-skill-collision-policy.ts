import type { AgentSkillScope } from "../../../agent-definition/domain/models.js";

/**
 * What a run does when a user-owned entry already occupies one of its workspace skill paths
 * (D-15 Rule 1, kept by D-19):
 * - `fail`: the agent names this skill; the path collision error stands.
 * - `prefer_workspace`: the agent takes every installed skill; it leaves the user's entry in
 *   place and the runtime discovers that workspace skill natively.
 */
export type WorkspaceCollisionPolicy = "fail" | "prefer_workspace";

/** Maps the scope resolved by `SkillService.resolveSkillScope` to a collision policy. */
export const workspaceCollisionPolicyForScope = (scope: AgentSkillScope): WorkspaceCollisionPolicy =>
  scope === "ALL_INSTALLED" ? "prefer_workspace" : "fail";
