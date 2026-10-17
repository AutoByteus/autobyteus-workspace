import path from "node:path";
import type { SkillService } from "../../../skills/services/skill-service.js";
import type { ConfiguredAgentSkillBinding } from "../../../skills/domain/configured-agent-skill-binding.js";
import type { WorkspaceCollisionPolicy } from "./workspace-skill-collision-policy.js";
import { configuredSharedWorkspace, isWithinSharedRoot } from "../../../workspaces/shared-workspace-binding.js";
import { RuntimeSkillProfile, type PrivateSkillRuntime } from "./runtime-skill-profile.js";

/** Runtime preparation follows the common activation's binding admission. */
export async function preparePrivateRuntimeSkills(input: {
  runtime: PrivateSkillRuntime;
  workingDirectory: string;
  memoryDir: string | null | undefined;
  bindings: readonly ConfiguredAgentSkillBinding[];
  collisionPolicy: WorkspaceCollisionPolicy;
  skills: Pick<SkillService, "resolveManagedSkillForMaterialization">;
  guard: { assertAccepting(): void; ownSkillProfile?(profile: RuntimeSkillProfile): void };
}): Promise<RuntimeSkillProfile | null> {
  const binding = await configuredSharedWorkspace(input.workingDirectory);
  if (!binding) return null;
  if (!input.memoryDir || isWithinSharedRoot(binding.mountRoot, input.memoryDir)) {
    throw new Error("Shared runtime skills require node-private execution storage.");
  }
  if (!input.guard.ownSkillProfile) throw new Error("Private runtime profile requires its exact preparation owner.");
  const profile = new RuntimeSkillProfile({
    runtime: input.runtime, privateParent: path.join(input.memoryDir, "runtime-skill-profiles"),
    workingDirectory: input.workingDirectory, bindings: input.bindings, collisionPolicy: input.collisionPolicy,
    resolveManagedSkill: (id, name) => input.skills.resolveManagedSkillForMaterialization(id, name),
    assertAccepting: input.guard.assertAccepting,
  });
  input.guard.ownSkillProfile(profile); // receipt exists before staging/native awaits
  await profile.prepare();
  input.guard.assertAccepting();
  return profile;
}

export function privateSkillInstructions(profile: RuntimeSkillProfile): string {
  return profile.exposures.length ? "\n\n## Configured private skills\n" + profile.exposures.map(entry =>
    `- ${entry.skill.name}: native skill ${profile.runtime === "claude" ? `autobyteus-configured:${entry.skill.name}` : entry.skill.name}; manifest ${path.join(entry.sourceRoot, "SKILL.md")}.`,
  ).join("\n") : "";
}
