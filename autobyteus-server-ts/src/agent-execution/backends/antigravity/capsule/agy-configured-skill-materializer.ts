import fs from "node:fs/promises";
import path from "node:path";
import type { ConfiguredAgentSkillBinding } from "../../../../skills/domain/configured-agent-skill-binding.js";

export type AgySkillSnapshot = { name: string; relativePath: string };

const safeName = (value: string): string => {
  const name = value.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(name)) throw new Error(`Unsafe AGY skill name '${value}'.`);
  return name;
};

const rejectSymlinks = async (root: string): Promise<void> => {
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error(`AGY_SKILL_SOURCE_SYMLINK: ${path.join(root, entry.name)}`);
    if (entry.isDirectory()) await rejectSymlinks(path.join(root, entry.name));
  }
};

export const materializeAgyConfiguredSkills = async (input: {
  capsulePath: string;
  workspacePath: string;
  bindings: readonly ConfiguredAgentSkillBinding[];
  enabled: boolean;
}): Promise<AgySkillSnapshot[]> => {
  if (!input.enabled) return [];
  const names = new Set<string>();
  const snapshots: AgySkillSnapshot[] = [];
  const targetRoot = path.join(input.capsulePath, ".agents", "skills");
  await fs.mkdir(targetRoot, { recursive: true, mode: 0o700 });
  for (const binding of input.bindings) {
    if (binding.kind !== "resolved") throw new Error(`AGY_CONFIGURED_SKILL_UNRESOLVED: ${binding.name}`);
    const name = safeName(binding.skill.name);
    if (names.has(name.toLowerCase())) throw new Error(`AGY_SKILL_NAME_COLLISION: ${name}`);
    names.add(name.toLowerCase());
    const workspaceSkill = path.join(input.workspacePath, ".agents", "skills", name);
    try { await fs.lstat(workspaceSkill); throw new Error(`AGY_SKILL_NAME_COLLISION: ${workspaceSkill}`); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    const source = await fs.realpath(binding.skill.rootPath);
    if (!(await fs.stat(path.join(source, "SKILL.md"))).isFile()) throw new Error(`AGY_SKILL_SOURCE_INVALID: ${name}`);
    await rejectSymlinks(source);
    const relativePath = path.join(".agents", "skills", name);
    await fs.cp(source, path.join(input.capsulePath, relativePath), { recursive: true, errorOnExist: true, force: false });
    snapshots.push({ name, relativePath });
  }
  return snapshots;
};
