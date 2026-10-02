import fs from "node:fs/promises";
import path from "node:path";
import type { ConfiguredAgentSkillBinding } from "../../../../skills/domain/configured-agent-skill-binding.js";
import type { WorkspaceCollisionPolicy } from "../../shared/workspace-skill-collision-policy.js";
import { AgentCreationError } from "../../../errors.js";

/** One manifest entry: `<capsule>/<relativePath>` is a directory link to the skill's real folder. */
export type AgySkillLink = { name: string; relativePath: string };

/** Why one resolved skill cannot be exposed to this run. */
type UnusableSkillReason =
  | "unsafe_name"
  | "duplicate_name"
  | "workspace_owned"
  | "source_unavailable"
  | "missing_manifest"
  | "link_failed";

const REASON_TEXT: Record<UnusableSkillReason, string> = {
  unsafe_name: "its name is not a valid skill folder name",
  duplicate_name: "another selected skill has the same name",
  workspace_owned: "the selected workspace already has a skill with this name",
  source_unavailable: "its folder no longer exists",
  missing_manifest: "its folder has no SKILL.md",
  link_failed: "its folder could not be linked into the run",
};

const SAFE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
const logIdentity = (value: string): string => /^[a-zA-Z0-9._-]{1,80}$/.test(value) ? value : "[redacted]";
const displayName = (value: string): string =>
  value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 80) || "[unnamed]";

const entryExists = async (entry: string): Promise<boolean> => {
  try { await fs.lstat(entry); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return false; throw error; }
};

/** The skill folder's real path when it is a directory holding a `SKILL.md` file. Nothing else is read. */
const usableSource = async (
  rootPath: string,
): Promise<{ realPath: string } | { reason: "source_unavailable" | "missing_manifest" }> => {
  let realPath: string;
  try {
    realPath = await fs.realpath(rootPath);
    if (!(await fs.stat(realPath)).isDirectory()) return { reason: "source_unavailable" };
  } catch { return { reason: "source_unavailable" }; }
  try {
    if (!(await fs.stat(path.join(realPath, "SKILL.md"))).isFile()) return { reason: "missing_manifest" };
  } catch { return { reason: "missing_manifest" }; }
  return { realPath };
};

/**
 * Exposes each resolved skill as one directory link `<capsule>/.agents/skills/<name>` to its real
 * folder. Folder contents are never walked, copied or inspected beyond `SKILL.md`.
 *
 * Request strength comes from the definition's skill scope (D-15): a skill that cannot be exposed is
 * skipped with a warning when the agent takes every installed skill (`prefer_workspace`), and fails
 * the run with an `AgentCreationError` naming the skill and reason when the agent names it (`fail`).
 * Unresolved bindings are always skipped with a warning.
 */
export const linkAgyConfiguredSkills = async (input: {
  capsulePath: string;
  workspacePath: string;
  bindings: readonly ConfiguredAgentSkillBinding[];
  runId: string;
  agentDefinitionId: string;
  /** From `SkillService.resolveSkillScope` via `workspaceCollisionPolicyForScope` (D-15 Rule 1). */
  workspaceCollisionPolicy: WorkspaceCollisionPolicy;
}): Promise<AgySkillLink[]> => {
  const run = logIdentity(input.runId);
  const agent = logIdentity(input.agentDefinitionId);
  const skip = (skill: string, disposition: string, reason?: UnusableSkillReason): void => {
    console.warn(`AGY configured skill skipped: run=${run}, agent=${agent}, skill=${skill}, disposition=${disposition}${reason ? `, reason=${reason}` : ""}`);
  };
  const unusable = (name: string, reason: UnusableSkillReason): void => {
    if (input.workspaceCollisionPolicy === "fail")
      throw new AgentCreationError(`Antigravity could not use skill '${displayName(name)}': ${REASON_TEXT[reason]}.`);
    const skill = reason === "unsafe_name" ? "[invalid-name]" : logIdentity(name);
    skip(skill, reason === "workspace_owned" ? "skipped-workspace-owned" : "skipped-unusable", reason);
  };

  const names = new Set<string>();
  const links: AgySkillLink[] = [];
  const targetRoot = path.join(input.capsulePath, ".agents", "skills");
  await fs.mkdir(targetRoot, { recursive: true, mode: 0o700 });
  for (const binding of input.bindings) {
    if (binding.kind === "unresolved") {
      skip(logIdentity(binding.name), "skipped-missing");
      continue;
    }
    const name = binding.skill.name.trim();
    if (!SAFE_NAME.test(name)) { unusable(binding.skill.name, "unsafe_name"); continue; }
    if (names.has(name.toLowerCase())) { unusable(name, "duplicate_name"); continue; }
    names.add(name.toLowerCase());
    // The workspace owns this name: AGY discovers it natively.
    if (await entryExists(path.join(input.workspacePath, ".agents", "skills", name))) {
      unusable(name, "workspace_owned");
      continue;
    }
    const source = await usableSource(binding.skill.rootPath);
    if ("reason" in source) { unusable(name, source.reason); continue; }
    const relativePath = path.join(".agents", "skills", name);
    try { await fs.symlink(source.realPath, path.join(input.capsulePath, relativePath), "dir"); }
    catch (error) {
      unusable(name, (error as NodeJS.ErrnoException).code === "EEXIST" ? "duplicate_name" : "link_failed");
      continue;
    }
    links.push({ name, relativePath });
  }
  return links;
};
