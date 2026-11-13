import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import type { ConfiguredAgentSkillBinding } from "../../../../skills/domain/configured-agent-skill-binding.js";
import type { AgentToolMcpDescriptor } from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import { materializeAgyMcpConfig } from "./agy-mcp-config-materializer.js";
import { linkAgyConfiguredSkills, type AgySkillLink } from "./agy-configured-skill-linker.js";
import type { WorkspaceCollisionPolicy } from "../../shared/workspace-skill-collision-policy.js";
import { AGY_NATIVE_TOOL_NAMES } from "./agy-native-tool-policy.js";

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");
const logIdentity = (value: string): string => /^[a-zA-Z0-9._-]{1,80}$/.test(value) ? value : "[redacted]";

export type AgyCapsuleManifest = {
  version: 1;
  runId: string;
  agentName: string;
  workspacePath: string;
  agentMarkdownHash: string;
  skills: AgySkillLink[];
};

export type AgyRunCapsule = { path: string; manifest: AgyCapsuleManifest };

const capsulePath = (memoryDir: string): string => path.join(memoryDir, "agy-project");
const agentPath = (root: string, name: string): string => path.join(root, ".agents", "agents", name, "agent.md");

/**
 * A new start replaces the capsule of any earlier era or failed start of this run (a run can return to Antigravity after another
 * agent runtime, autobyteus-440), so it always begins on an empty capsule; the exclusive writes below stay as a correctness guard.
 * Only the capsule folder goes: a skill link in it is removed without following it, and nothing outside it is touched.
 * A restore never calls this; it reads its own era's capsule (`restoreAgyRunCapsule`).
 */
export const createAgyRunCapsule = async (input: {
  runId: string;
  memoryDir: string;
  workspacePath: string;
  identity: string;
  agentDefinitionId: string;
  configuredSkillBindings: readonly ConfiguredAgentSkillBinding[];
  workspaceCollisionPolicy: WorkspaceCollisionPolicy;
  mcpDescriptor: AgentToolMcpDescriptor;
}): Promise<AgyRunCapsule> => {
  const workspacePath = await fs.realpath(input.workspacePath);
  if (!(await fs.stat(workspacePath)).isDirectory()) throw new Error("AGY_WORKSPACE_INVALID: selected workspace is not a directory.");
  const root = capsulePath(input.memoryDir);
  await fs.mkdir(input.memoryDir, { recursive: true, mode: 0o700 });
  await fs.rm(root, { recursive: true, force: true });
  await fs.mkdir(root, { recursive: false, mode: 0o700 });
  try {
    const agentName = `autobyteus-${sha256(input.runId).slice(0, 16)}`;
    const markdown = [
      "---", `name: ${agentName}`, "description: Run-specific AutoByteus main agent.", "mainAgent: true", `tools: [${AGY_NATIVE_TOOL_NAMES.join(", ")}]`, "---", "",
      input.identity,
      "", "## Working Environment", `- Agent workspace: \`${workspacePath}\``,
      "- Resolve task and project locations from the agent workspace unless an explicit target says otherwise.", "",
    ].join("\n");
    await fs.mkdir(path.dirname(agentPath(root, agentName)), { recursive: true, mode: 0o700 });
    await fs.writeFile(agentPath(root, agentName), markdown, { mode: 0o600, flag: "wx" });
    const skills = await linkAgyConfiguredSkills({
      capsulePath: root, workspacePath, bindings: input.configuredSkillBindings,
      runId: input.runId, agentDefinitionId: input.agentDefinitionId,
      workspaceCollisionPolicy: input.workspaceCollisionPolicy,
    });
    await materializeAgyMcpConfig({ capsulePath: root, workspacePath, descriptor: input.mcpDescriptor });
    const manifest: AgyCapsuleManifest = {
      version: 1, runId: input.runId, agentName, workspacePath,
      agentMarkdownHash: sha256(markdown), skills,
    };
    await fs.writeFile(path.join(root, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600, flag: "wx" });
    return { path: root, manifest };
  } catch (error) {
    await fs.rm(root, { recursive: true, force: true });
    throw error;
  }
};

/**
 * Links skills added to the run's definition while it runs into its capsule, one binding per linker call (a name
 * that cannot be linked is logged and never stops the others), then rewrites the manifest with the names that were
 * linked, so a resume keeps them. Names the manifest already lists are skipped; a name that failed is tried again by
 * the next add. The capsule is this run's own and kept for resume, so a link written while the run stops is still
 * its own.
 */
export const addAgyRunCapsuleSkills = async (input: {
  capsule: AgyRunCapsule;
  runId: string;
  agentDefinitionId: string;
  bindings: readonly ConfiguredAgentSkillBinding[];
  workspaceCollisionPolicy: WorkspaceCollisionPolicy;
}): Promise<void> => {
  const { capsule } = input;
  const listed = new Set(capsule.manifest.skills.map((skill) => skill.name.toLowerCase()));
  const added: AgySkillLink[] = [];
  for (const binding of input.bindings) {
    if (binding.kind !== "resolved" || listed.has(binding.skill.name.trim().toLowerCase())) continue;
    try {
      const links = await linkAgyConfiguredSkills({
        capsulePath: capsule.path, workspacePath: capsule.manifest.workspacePath, bindings: [binding],
        runId: input.runId, agentDefinitionId: input.agentDefinitionId,
        workspaceCollisionPolicy: input.workspaceCollisionPolicy,
      });
      for (const link of links) { added.push(link); listed.add(link.name.toLowerCase()); }
    } catch (error) {
      console.warn(`AGY configured skill not added: run=${logIdentity(input.runId)}, skill=${logIdentity(binding.skill.name)}: ${String(error)}`);
    }
  }
  if (added.length === 0) return;
  const manifest: AgyCapsuleManifest = { ...capsule.manifest, skills: [...capsule.manifest.skills, ...added] };
  await rewriteAgyCapsuleManifest(capsule.path, manifest);
  capsule.manifest = manifest;
};

/** Replaces `manifest.json` in one step (a temporary file renamed over it), so a resume never reads half of it. */
const rewriteAgyCapsuleManifest = async (root: string, manifest: AgyCapsuleManifest): Promise<void> => {
  const target = path.join(root, "manifest.json");
  const temporary = path.join(root, `.manifest-${randomUUID()}.json`);
  try {
    await fs.writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600, flag: "wx" });
    await fs.rename(temporary, target);
  } catch (error) {
    await fs.rm(temporary, { force: true });
    throw error;
  }
};

const isMissing = (error: unknown): boolean =>
  ["ENOENT", "ENOTDIR"].includes((error as NodeJS.ErrnoException).code ?? "");

/** Follows a skill link (or reads an older copied skill folder) to its `SKILL.md`. */
const skillManifestExists = async (skillEntry: string): Promise<boolean> => {
  try { return (await fs.stat(path.join(skillEntry, "SKILL.md"))).isFile(); }
  catch (error) { if (isMissing(error)) return false; throw error; }
};

const removeDanglingSkillLink = async (skillEntry: string): Promise<void> => {
  try { if ((await fs.lstat(skillEntry)).isSymbolicLink()) await fs.unlink(skillEntry); }
  catch (error) { if (!isMissing(error)) throw error; }
};

export const restoreAgyRunCapsule = async (input: {
  runId: string;
  memoryDir: string;
  selectedWorkspacePath: string | null;
  mcpDescriptor: AgentToolMcpDescriptor;
}): Promise<AgyRunCapsule> => {
  const root = capsulePath(input.memoryDir);
  const manifest = JSON.parse(await fs.readFile(path.join(root, "manifest.json"), "utf8")) as AgyCapsuleManifest;
  if (manifest.version !== 1 || manifest.runId !== input.runId || !/^[a-zA-Z0-9-]+$/.test(manifest.agentName))
    throw new Error("AGY_CAPSULE_INVALID: manifest identity mismatch.");
  const workspacePath = await fs.realpath(manifest.workspacePath);
  if (workspacePath !== manifest.workspacePath || (input.selectedWorkspacePath && await fs.realpath(input.selectedWorkspacePath) !== workspacePath))
    throw new Error("AGY_WORKSPACE_CHANGED: selected workspace no longer matches the run-start binding.");
  const markdown = await fs.readFile(agentPath(root, manifest.agentName), "utf8");
  if (sha256(markdown) !== manifest.agentMarkdownHash) throw new Error("AGY_CAPSULE_INVALID: agent identity snapshot changed.");
  for (const skill of manifest.skills) {
    if (path.join(".agents", "skills", skill.name) !== skill.relativePath)
      throw new Error("AGY_CAPSULE_INVALID: skill path mismatch.");
    if (!(await skillManifestExists(path.join(root, skill.relativePath)))) {
      // The skill's source was removed or moved since run start: resume without it.
      await removeDanglingSkillLink(path.join(root, skill.relativePath));
      console.warn(`AGY configured skill skipped on restore: run=${logIdentity(input.runId)}, skill=${logIdentity(skill.name)}, disposition=skipped-missing-source`);
    }
  }
  await materializeAgyMcpConfig({ capsulePath: root, workspacePath, descriptor: input.mcpDescriptor });
  return { path: root, manifest };
};
