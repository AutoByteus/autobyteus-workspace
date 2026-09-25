import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { ConfiguredAgentSkillBinding } from "../../../../skills/domain/configured-agent-skill-binding.js";
import type { AgentToolMcpDescriptor } from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import { materializeAgyMcpConfig } from "./agy-mcp-config-materializer.js";
import { materializeAgyConfiguredSkills, type AgySkillSnapshot } from "./agy-configured-skill-materializer.js";

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");
const codingTools = "view_file, write_to_file, replace_file_content, multi_replace_file_content, grep_search, list_dir, find_by_name, run_command";

export type AgyCapsuleManifest = {
  version: 1;
  runId: string;
  agentName: string;
  workspacePath: string;
  agentMarkdownHash: string;
  skillAccessMode: "PRELOADED_ONLY" | "NONE";
  skills: AgySkillSnapshot[];
};

export type AgyRunCapsule = { path: string; manifest: AgyCapsuleManifest };

const capsulePath = (memoryDir: string): string => path.join(memoryDir, "agy-project");
const agentPath = (root: string, name: string): string => path.join(root, ".agents", "agents", name, "agent.md");

export const createAgyRunCapsule = async (input: {
  runId: string;
  memoryDir: string;
  workspacePath: string;
  identity: string;
  configuredSkillBindings: readonly ConfiguredAgentSkillBinding[];
  skillAccessMode: "PRELOADED_ONLY" | "NONE";
  mcpDescriptor: AgentToolMcpDescriptor | null;
}): Promise<AgyRunCapsule> => {
  const workspacePath = await fs.realpath(input.workspacePath);
  if (!(await fs.stat(workspacePath)).isDirectory()) throw new Error("AGY_WORKSPACE_INVALID: selected workspace is not a directory.");
  const root = capsulePath(input.memoryDir);
  await fs.mkdir(input.memoryDir, { recursive: true, mode: 0o700 });
  await fs.mkdir(root, { recursive: false, mode: 0o700 });
  try {
    const agentName = `autobyteus-${sha256(input.runId).slice(0, 16)}`;
    const markdown = [
      "---", `name: ${agentName}`, "description: Run-specific AutoByteus main agent.", "mainAgent: true", `tools: [${codingTools}]`, "---", "",
      input.identity,
      "", "## Working Environment", `- Agent workspace: \`${workspacePath}\``,
      "- Resolve task and project locations from the agent workspace unless an explicit target says otherwise.", "",
    ].join("\n");
    await fs.mkdir(path.dirname(agentPath(root, agentName)), { recursive: true, mode: 0o700 });
    await fs.writeFile(agentPath(root, agentName), markdown, { mode: 0o600, flag: "wx" });
    const skills = await materializeAgyConfiguredSkills({
      capsulePath: root, workspacePath, bindings: input.configuredSkillBindings,
      enabled: input.skillAccessMode === "PRELOADED_ONLY",
    });
    await materializeAgyMcpConfig({ capsulePath: root, workspacePath, descriptor: input.mcpDescriptor });
    const manifest: AgyCapsuleManifest = {
      version: 1, runId: input.runId, agentName, workspacePath,
      agentMarkdownHash: sha256(markdown), skillAccessMode: input.skillAccessMode, skills,
    };
    await fs.writeFile(path.join(root, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600, flag: "wx" });
    return { path: root, manifest };
  } catch (error) {
    await fs.rm(root, { recursive: true, force: true });
    throw error;
  }
};

export const restoreAgyRunCapsule = async (input: {
  runId: string;
  memoryDir: string;
  selectedWorkspacePath: string | null;
  mcpDescriptor: AgentToolMcpDescriptor | null;
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
    if (!(await fs.stat(path.join(root, skill.relativePath, "SKILL.md"))).isFile())
      throw new Error("AGY_CAPSULE_INVALID: configured skill missing.");
  }
  await materializeAgyMcpConfig({ capsulePath: root, workspacePath, descriptor: input.mcpDescriptor });
  return { path: root, manifest };
};
