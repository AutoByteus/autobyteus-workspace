import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAgyRunCapsule, restoreAgyRunCapsule } from "../../../../../src/agent-execution/backends/antigravity/capsule/agy-run-capsule.js";
import { Skill } from "../../../../../src/skills/domain/models.js";
import type { ConfiguredAgentSkillBinding } from "../../../../../src/skills/domain/configured-agent-skill-binding.js";

const roots = async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "agy-capsule-test-"));
  const workspacePath = path.join(base, "workspace");
  const memoryDir = path.join(base, "memory");
  await fs.mkdir(workspacePath);
  return { base, workspacePath, memoryDir };
};
const globalBinding = (source: string, name = "example-skill"): ConfiguredAgentSkillBinding => ({
  kind: "resolved", skill: new Skill({ name, description: "test", content: "", rootPath: source }),
});

const mcpDescriptor = { name: "autobyteus_agent_tools", transport: "streamable_http" as const,
  serverUrl: "http://127.0.0.1:12345/mcp/agent-tools/session", enabledTools: ["send_message_to"] };

describe("AGY run capsule", () => {
  let isolatedHome: string;
  beforeEach(async () => {
    // Isolate ~/.gemini/config/mcp_config.json so results never depend on the developer machine.
    isolatedHome = await fs.mkdtemp(path.join(os.tmpdir(), "agy-capsule-home-"));
    vi.spyOn(os, "homedir").mockReturnValue(isolatedHome);
  });
  afterEach(() => { vi.restoreAllMocks(); });

  const writeUserMcpConfig = async (configPath: string, content: string) => {
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, content);
  };
  const createWithDescriptor = (root: Awaited<ReturnType<typeof roots>>, runId: string) =>
    createAgyRunCapsule({ agentDefinitionId: "test-agent", runId, memoryDir: root.memoryDir, workspacePath: root.workspacePath,
      identity: "Identity", configuredSkillBindings: [], mcpDescriptor });
  const expectCapsuleHasAgentTools = async (capsulePath: string) => {
    const generated = JSON.parse(await fs.readFile(path.join(capsulePath, ".agents", "mcp_config.json"), "utf8"));
    expect(generated.mcpServers.autobyteus_agent_tools.serverUrl).toBe(mcpDescriptor.serverUrl);
  };

  it("treats an empty workspace MCP config as no servers and leaves it untouched", async () => {
    const root = await roots();
    const userConfig = path.join(root.workspacePath, ".agents", "mcp_config.json");
    await writeUserMcpConfig(userConfig, "");
    const capsule = await createWithDescriptor(root, "empty-workspace-mcp");
    await expectCapsuleHasAgentTools(capsule.path);
    expect(await fs.readFile(userConfig, "utf8")).toBe("");
  });

  it("treats an empty global ~/.gemini MCP config as no servers and leaves it untouched", async () => {
    const root = await roots();
    const globalConfig = path.join(isolatedHome, ".gemini", "config", "mcp_config.json");
    await writeUserMcpConfig(globalConfig, "");
    const capsule = await createWithDescriptor(root, "empty-global-mcp");
    await expectCapsuleHasAgentTools(capsule.path);
    expect(await fs.readFile(globalConfig, "utf8")).toBe("");
    const restored = await restoreAgyRunCapsule({ runId: "empty-global-mcp", memoryDir: root.memoryDir,
      selectedWorkspacePath: root.workspacePath, mcpDescriptor });
    await expectCapsuleHasAgentTools(restored.path);
  });

  it("treats a whitespace-only MCP config as no servers", async () => {
    const root = await roots();
    const userConfig = path.join(root.workspacePath, ".agents", "mcp_config.json");
    await writeUserMcpConfig(userConfig, "  \n\t\r\n");
    const capsule = await createWithDescriptor(root, "whitespace-mcp");
    await expectCapsuleHasAgentTools(capsule.path);
    expect(await fs.readFile(userConfig, "utf8")).toBe("  \n\t\r\n");
  });

  it("still rejects malformed non-empty MCP config", async () => {
    const root = await roots();
    const userConfig = path.join(root.workspacePath, ".agents", "mcp_config.json");
    await writeUserMcpConfig(userConfig, "{ not json");
    await expect(createWithDescriptor(root, "malformed-mcp")).rejects.toThrow("Cannot inspect AGY MCP collision");
    expect(await fs.readFile(userConfig, "utf8")).toBe("{ not json");
  });

  it("still rejects a global MCP config that defines the AutoByteus server name", async () => {
    const root = await roots();
    const globalConfig = path.join(isolatedHome, ".gemini", "config", "mcp_config.json");
    const original = '{"mcpServers":{"autobyteus_agent_tools":{"command":"user-tool"}}}';
    await writeUserMcpConfig(globalConfig, original);
    await expect(createWithDescriptor(root, "global-collision")).rejects.toThrow("AGY_MCP_NAME_COLLISION");
    expect(await fs.readFile(globalConfig, "utf8")).toBe(original);
  });

  it("snapshots full identity and selected workspace without writing user .agents", async () => {
    const root = await roots();
    const capsule = await createAgyRunCapsule({ agentDefinitionId: "test-agent", runId: "run-1", memoryDir: root.memoryDir,
      workspacePath: root.workspacePath, identity: "IDENTITY-SENTINEL and enclosing team instructions",
      configuredSkillBindings: [], mcpDescriptor: null });
    const markdown = await fs.readFile(path.join(capsule.path, ".agents", "agents", capsule.manifest.agentName, "agent.md"), "utf8");
    expect(markdown).toContain("tools: [view_file, write_to_file, replace_file_content, grep_search, list_dir, find_by_name, run_command, generate_image]");
    expect(markdown).toContain("IDENTITY-SENTINEL and enclosing team instructions");
    expect(markdown).toContain(`- Agent workspace: \`${await fs.realpath(root.workspacePath)}\``);
    expect(await fs.readdir(root.workspacePath)).toEqual([]);
    const restored = await restoreAgyRunCapsule({ runId: "run-1", memoryDir: root.memoryDir,
      selectedWorkspacePath: root.workspacePath, mcpDescriptor: null });
    expect(restored.manifest.agentMarkdownHash).toBe(capsule.manifest.agentMarkdownHash);
    await fs.writeFile(path.join(capsule.path, ".agents", "agents", capsule.manifest.agentName, "agent.md"), "changed");
    await expect(restoreAgyRunCapsule({ runId: "run-1", memoryDir: root.memoryDir,
      selectedWorkspacePath: root.workspacePath, mcpDescriptor: null })).rejects.toThrow("snapshot changed");
  });

  it("writes a manifest without the removed skillAccessMode and restores a capsule whose manifest still stores it", async () => {
    const root = await roots();
    const capsule = await createAgyRunCapsule({ agentDefinitionId: "test-agent", runId: "stored-mode", memoryDir: root.memoryDir,
      workspacePath: root.workspacePath, identity: "Identity", configuredSkillBindings: [], mcpDescriptor: null });
    const manifestPath = path.join(capsule.path, "manifest.json");
    const written = JSON.parse(await fs.readFile(manifestPath, "utf8")) as Record<string, unknown>;
    expect(Object.keys(written).sort()).toEqual(["agentMarkdownHash", "agentName", "runId", "skills", "version", "workspacePath"]);

    for (const mode of ["PRELOADED_ONLY", "NONE"]) {
      await fs.chmod(manifestPath, 0o600);
      await fs.writeFile(manifestPath, JSON.stringify({ ...written, skillAccessMode: mode }));
      const restored = await restoreAgyRunCapsule({ runId: "stored-mode", memoryDir: root.memoryDir,
        selectedWorkspacePath: root.workspacePath, mcpDescriptor: null });
      expect(restored.manifest.runId).toBe("stored-mode");
    }
  });

  it("links the configured package and exposes nothing for a definition without skills", async () => {
    const root = await roots();
    const source = path.join(root.base, "skill-source");
    await fs.mkdir(source);
    await fs.writeFile(path.join(source, "SKILL.md"), "# Example skill");
    const binding = globalBinding(source);
    const preloaded = await createAgyRunCapsule({ agentDefinitionId: "test-agent", runId: "preload", memoryDir: root.memoryDir,
      workspacePath: root.workspacePath, identity: "Identity", configuredSkillBindings: [binding],
      workspaceCollisionPolicy: "fail", mcpDescriptor: null });
    expect((await fs.lstat(path.join(preloaded.path, ".agents", "skills", "example-skill"))).isSymbolicLink()).toBe(true);
    expect(await fs.readFile(path.join(preloaded.path, ".agents", "skills", "example-skill", "SKILL.md"), "utf8")).toBe("# Example skill");
    const none = await createAgyRunCapsule({ agentDefinitionId: "test-agent", runId: "none", memoryDir: path.join(root.base, "none-memory"),
      workspacePath: root.workspacePath, identity: "Identity", configuredSkillBindings: [],
      mcpDescriptor: null });
    expect(none.manifest.skills).toEqual([]);
    await expect(fs.stat(path.join(none.path, ".agents", "skills", "example-skill"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("warns and omits an unresolved named skill while linking resolved skills", async () => {
    const root = await roots();
    const source = path.join(root.base, "skill-source");
    await fs.mkdir(source);
    await fs.writeFile(path.join(source, "SKILL.md"), "# Example skill");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const capsule = await createAgyRunCapsule({ agentDefinitionId: "codex",
      runId: "missing-mixed", memoryDir: root.memoryDir, workspacePath: root.workspacePath,
      identity: "Identity", configuredSkillBindings: [{ kind: "unresolved", name: "missing" }, globalBinding(source)],
      workspaceCollisionPolicy: "fail", mcpDescriptor: null });
    expect(capsule.manifest.skills).toEqual([{ name: "example-skill", relativePath: path.join(".agents", "skills", "example-skill") }]);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("run=missing-mixed, agent=codex, skill=missing, disposition=skipped-missing"));
  });

  it("never prints an unsafe configured name or unsafe run identity in skip warnings", async () => {
    const root = await roots();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const capsule = await createAgyRunCapsule({ agentDefinitionId: "codex\nTOKEN=secret",
      runId: "unsafe-log-run", memoryDir: root.memoryDir, workspacePath: root.workspacePath,
      identity: "Identity", configuredSkillBindings: [{ kind: "unresolved", name: "../../TOKEN=secret" }],
      workspaceCollisionPolicy: "fail", mcpDescriptor: null });
    expect(capsule.manifest.skills).toEqual([]);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("agent=[redacted], skill=[redacted], disposition=skipped-missing"));
    expect(warning.mock.calls.flat().join(" ")).not.toContain("TOKEN=secret");
  });

  it("rejects configured skill collisions without overwriting the selected workspace", async () => {
    const root = await roots();
    const source = path.join(root.base, "skill-source");
    const userSkill = path.join(root.workspacePath, ".agents", "skills", "example-skill");
    await fs.mkdir(source); await fs.mkdir(userSkill, { recursive: true });
    await fs.writeFile(path.join(source, "SKILL.md"), "# Configured");
    await fs.writeFile(path.join(userSkill, "SKILL.md"), "# User owned");
    const binding = globalBinding(source);
    await expect(createAgyRunCapsule({ agentDefinitionId: "test-agent", runId: "collision", memoryDir: root.memoryDir,
      workspacePath: root.workspacePath, identity: "Identity", configuredSkillBindings: [binding],
      workspaceCollisionPolicy: "fail", mcpDescriptor: null }))
      .rejects.toThrow("Antigravity could not use skill 'example-skill': the selected workspace already has a skill with this name.");
    expect(await fs.readFile(path.join(userSkill, "SKILL.md"), "utf8")).toBe("# User owned");
    await expect(fs.stat(path.join(root.memoryDir, "agy-project"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("lets a user-owned workspace skill win over an all-installed skill of the same name (D-15 Rule 1)", async () => {
    const root = await roots();
    const source = path.join(root.base, "skill-source");
    const otherSource = path.join(root.base, "other-source");
    const userSkill = path.join(root.workspacePath, ".agents", "skills", "example-skill");
    await fs.mkdir(source); await fs.mkdir(otherSource); await fs.mkdir(userSkill, { recursive: true });
    await fs.writeFile(path.join(source, "SKILL.md"), "# Installed");
    await fs.writeFile(path.join(otherSource, "SKILL.md"), "# Other installed");
    await fs.writeFile(path.join(userSkill, "SKILL.md"), "# User owned");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const capsule = await createAgyRunCapsule({ agentDefinitionId: "autobyteus-daily-assistant", runId: "chat-run",
      memoryDir: root.memoryDir, workspacePath: root.workspacePath, identity: "Identity",
      configuredSkillBindings: [globalBinding(source), globalBinding(otherSource, "other-skill")],
      workspaceCollisionPolicy: "prefer_workspace", mcpDescriptor: null });

    expect(capsule.manifest.skills.map((entry) => entry.name)).toEqual(["other-skill"]);
    await expect(fs.stat(path.join(capsule.path, ".agents", "skills", "example-skill"))).rejects.toMatchObject({ code: "ENOENT" });
    expect(await fs.readFile(path.join(userSkill, "SKILL.md"), "utf8")).toBe("# User owned");
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("run=chat-run, agent=autobyteus-daily-assistant, skill=example-skill, disposition=skipped-workspace-owned"));
  });

  it("resumes a linked run whose skill source was removed, without that skill", async () => {
    const root = await roots();
    const kept = path.join(root.base, "kept-skill");
    const removed = path.join(root.base, "removed-skill");
    await fs.mkdir(kept); await fs.mkdir(removed);
    await fs.writeFile(path.join(kept, "SKILL.md"), "# Kept");
    await fs.writeFile(path.join(removed, "SKILL.md"), "# Removed");
    const capsule = await createAgyRunCapsule({ agentDefinitionId: "test-agent", runId: "linked-resume", memoryDir: root.memoryDir,
      workspacePath: root.workspacePath, identity: "Identity",
      configuredSkillBindings: [globalBinding(kept, "kept-skill"), globalBinding(removed, "removed-skill")],
      workspaceCollisionPolicy: "fail", mcpDescriptor: null });
    await fs.rm(removed, { recursive: true });
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const restored = await restoreAgyRunCapsule({ runId: "linked-resume", memoryDir: root.memoryDir,
      selectedWorkspacePath: root.workspacePath, mcpDescriptor: null });

    expect(restored.manifest.skills.map((entry) => entry.name)).toEqual(["kept-skill", "removed-skill"]);
    expect(await fs.readFile(path.join(capsule.path, ".agents", "skills", "kept-skill", "SKILL.md"), "utf8")).toBe("# Kept");
    await expect(fs.lstat(path.join(capsule.path, ".agents", "skills", "removed-skill"))).rejects.toMatchObject({ code: "ENOENT" });
    expect(warning).toHaveBeenCalledWith("AGY configured skill skipped on restore: run=linked-resume, skill=removed-skill, disposition=skipped-missing-source");
  });

  it("resumes a run created with copied skill folders", async () => {
    const root = await roots();
    const capsule = await createAgyRunCapsule({ agentDefinitionId: "test-agent", runId: "copied-run", memoryDir: root.memoryDir,
      workspacePath: root.workspacePath, identity: "Identity", configuredSkillBindings: [], mcpDescriptor: null });
    // Shape written before skills were linked: a real folder holding copied files.
    const copied = path.join(capsule.path, ".agents", "skills", "copied-skill");
    await fs.mkdir(copied, { recursive: true });
    await fs.writeFile(path.join(copied, "SKILL.md"), "# Copied");
    const manifestPath = path.join(capsule.path, "manifest.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    await fs.chmod(manifestPath, 0o600);
    await fs.writeFile(manifestPath, JSON.stringify({ ...manifest,
      skills: [{ name: "copied-skill", relativePath: path.join(".agents", "skills", "copied-skill") }] }));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const restored = await restoreAgyRunCapsule({ runId: "copied-run", memoryDir: root.memoryDir,
      selectedWorkspacePath: root.workspacePath, mcpDescriptor: null });

    expect(restored.manifest.skills.map((entry) => entry.name)).toEqual(["copied-skill"]);
    expect(await fs.readFile(path.join(copied, "SKILL.md"), "utf8")).toBe("# Copied");
    expect(warning).not.toHaveBeenCalled();
  });

  it("rejects user-owned AutoByteus MCP key collisions before generating run config", async () => {
    const root = await roots();
    const userConfig = path.join(root.workspacePath, ".agents", "mcp_config.json");
    await fs.mkdir(path.dirname(userConfig), { recursive: true });
    const original = '{"mcpServers":{"autobyteus_agent_tools":{"command":"user-tool"}}}';
    await fs.writeFile(userConfig, original);
    await expect(createWithDescriptor(root, "mcp-collision")).rejects.toThrow("AGY_MCP_NAME_COLLISION");
    expect(await fs.readFile(userConfig, "utf8")).toBe(original);
  });

  it("isolates two run capsules sharing one selected workspace", async () => {
    const root = await roots();
    const one = await createAgyRunCapsule({ agentDefinitionId: "test-agent", runId: "one", memoryDir: root.memoryDir,
      workspacePath: root.workspacePath, identity: "ONE-IDENTITY", configuredSkillBindings: [],
      mcpDescriptor: null });
    const two = await createAgyRunCapsule({ agentDefinitionId: "test-agent", runId: "two", memoryDir: path.join(root.base, "memory-two"),
      workspacePath: root.workspacePath, identity: "TWO-IDENTITY", configuredSkillBindings: [],
      mcpDescriptor: null });
    expect(one.path).not.toBe(two.path);
    expect(one.manifest.agentName).not.toBe(two.manifest.agentName);
    expect(one.manifest.workspacePath).toBe(two.manifest.workspacePath);
    expect(await fs.readdir(root.workspacePath)).toEqual([]);
  });
});
