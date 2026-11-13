import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addAgyRunCapsuleSkills, createAgyRunCapsule, restoreAgyRunCapsule } from "../../../../../src/agent-execution/backends/antigravity/capsule/agy-run-capsule.js";
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

  const agentToolsDescriptor = { ...mcpDescriptor, name: "autobyteus_agent_tools" as const };

  it("AC-012: a skill added mid-run is linked into the capsule; an unusable one is skipped; the manifest lists the linked ones and survives a resume", async () => {
    const root = await roots();
    const skillDir = async (name: string, withManifest = true) => {
      const dir = path.join(root.base, "catalog", name);
      await fs.mkdir(dir, { recursive: true });
      if (withManifest) await fs.writeFile(path.join(dir, "SKILL.md"), `---\nname: ${name}\n---\n`);
      return fs.realpath(dir);
    };
    const first = await skillDir("first-skill");
    const capsule = await createAgyRunCapsule({ agentDefinitionId: "test-agent", runId: "add-mid-run", memoryDir: root.memoryDir,
      workspacePath: root.workspacePath, identity: "Identity", configuredSkillBindings: [globalBinding(first, "first-skill")],
      workspaceCollisionPolicy: "fail", mcpDescriptor: agentToolsDescriptor });
    const added = await skillDir("added-skill");
    const broken = await skillDir("broken-skill", false); // no SKILL.md: cannot be linked
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await addAgyRunCapsuleSkills({ capsule, runId: "add-mid-run", agentDefinitionId: "test-agent", workspaceCollisionPolicy: "fail",
      bindings: [globalBinding(first, "first-skill"), globalBinding(broken, "broken-skill"), globalBinding(added, "added-skill"),
        { kind: "unresolved", name: "missing-skill" }] });

    expect(await fs.realpath(path.join(capsule.path, ".agents", "skills", "added-skill"))).toBe(added);
    await expect(fs.lstat(path.join(capsule.path, ".agents", "skills", "broken-skill"))).rejects.toMatchObject({ code: "ENOENT" });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("AGY configured skill not added: run=add-mid-run, skill=broken-skill"));
    const names = (manifest: { skills: Array<{ name: string }> }) => manifest.skills.map((skill) => skill.name);
    expect(names(capsule.manifest)).toEqual(["first-skill", "added-skill"]);
    const written = JSON.parse(await fs.readFile(path.join(capsule.path, "manifest.json"), "utf8"));
    expect(names(written)).toEqual(["first-skill", "added-skill"]);
    expect((await fs.readdir(capsule.path)).filter((entry) => entry.startsWith(".manifest-"))).toEqual([]);

    // Resumed (stop, then a message): the capsule keeps the link and the manifest names it.
    const restored = await restoreAgyRunCapsule({ runId: "add-mid-run", memoryDir: root.memoryDir,
      selectedWorkspacePath: root.workspacePath, mcpDescriptor: agentToolsDescriptor });
    expect(names(restored.manifest)).toEqual(["first-skill", "added-skill"]);
    expect(await fs.realpath(path.join(restored.path, ".agents", "skills", "added-skill"))).toBe(added);

    // Once the broken skill gets its SKILL.md, the next add links it; listed names are not linked again.
    await fs.writeFile(path.join(broken, "SKILL.md"), "---\nname: broken-skill\n---\n");
    await addAgyRunCapsuleSkills({ capsule: restored, runId: "add-mid-run", agentDefinitionId: "test-agent", workspaceCollisionPolicy: "fail",
      bindings: [globalBinding(added, "added-skill"), globalBinding(broken, "broken-skill")] });
    expect(names(restored.manifest)).toEqual(["first-skill", "added-skill", "broken-skill"]);
    warn.mockRestore();
  });

  it("always configures the Agent Tools server, without a transport header", async () => {
    const root = await roots();
    const capsule = await createAgyRunCapsule({ agentDefinitionId: "test-agent", runId: "always", memoryDir: root.memoryDir,
      workspacePath: root.workspacePath, identity: "Identity", configuredSkillBindings: [],
      mcpDescriptor: { ...mcpDescriptor, enabledTools: [] } });
    const generated = JSON.parse(await fs.readFile(path.join(capsule.path, ".agents", "mcp_config.json"), "utf8"));
    expect(generated).toEqual({
      mcpServers: { autobyteus_agent_tools: { disabled: false, serverUrl: mcpDescriptor.serverUrl } },
    });
  });

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
      configuredSkillBindings: [], mcpDescriptor });
    const markdown = await fs.readFile(path.join(capsule.path, ".agents", "agents", capsule.manifest.agentName, "agent.md"), "utf8");
    expect(markdown).toContain("tools: [view_file, write_to_file, replace_file_content, grep_search, list_dir, find_by_name, run_command, generate_image]");
    expect(markdown).toContain("IDENTITY-SENTINEL and enclosing team instructions");
    expect(markdown).toContain(`- Agent workspace: \`${await fs.realpath(root.workspacePath)}\``);
    expect(await fs.readdir(root.workspacePath)).toEqual([]);
    const restored = await restoreAgyRunCapsule({ runId: "run-1", memoryDir: root.memoryDir,
      selectedWorkspacePath: root.workspacePath, mcpDescriptor });
    expect(restored.manifest.agentMarkdownHash).toBe(capsule.manifest.agentMarkdownHash);
    await fs.writeFile(path.join(capsule.path, ".agents", "agents", capsule.manifest.agentName, "agent.md"), "changed");
    await expect(restoreAgyRunCapsule({ runId: "run-1", memoryDir: root.memoryDir,
      selectedWorkspacePath: root.workspacePath, mcpDescriptor })).rejects.toThrow("snapshot changed");
  });

  it("writes a manifest without the removed skillAccessMode and restores a capsule whose manifest still stores it", async () => {
    const root = await roots();
    const capsule = await createAgyRunCapsule({ agentDefinitionId: "test-agent", runId: "stored-mode", memoryDir: root.memoryDir,
      workspacePath: root.workspacePath, identity: "Identity", configuredSkillBindings: [], mcpDescriptor });
    const manifestPath = path.join(capsule.path, "manifest.json");
    const written = JSON.parse(await fs.readFile(manifestPath, "utf8")) as Record<string, unknown>;
    expect(Object.keys(written).sort()).toEqual(["agentMarkdownHash", "agentName", "runId", "skills", "version", "workspacePath"]);

    for (const mode of ["PRELOADED_ONLY", "NONE"]) {
      await fs.chmod(manifestPath, 0o600);
      await fs.writeFile(manifestPath, JSON.stringify({ ...written, skillAccessMode: mode }));
      const restored = await restoreAgyRunCapsule({ runId: "stored-mode", memoryDir: root.memoryDir,
        selectedWorkspacePath: root.workspacePath, mcpDescriptor });
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
      workspaceCollisionPolicy: "fail", mcpDescriptor });
    expect((await fs.lstat(path.join(preloaded.path, ".agents", "skills", "example-skill"))).isSymbolicLink()).toBe(true);
    expect(await fs.readFile(path.join(preloaded.path, ".agents", "skills", "example-skill", "SKILL.md"), "utf8")).toBe("# Example skill");
    const none = await createAgyRunCapsule({ agentDefinitionId: "test-agent", runId: "none", memoryDir: path.join(root.base, "none-memory"),
      workspacePath: root.workspacePath, identity: "Identity", configuredSkillBindings: [],
      mcpDescriptor });
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
      workspaceCollisionPolicy: "fail", mcpDescriptor });
    expect(capsule.manifest.skills).toEqual([{ name: "example-skill", relativePath: path.join(".agents", "skills", "example-skill") }]);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("run=missing-mixed, agent=codex, skill=missing, disposition=skipped-missing"));
  });

  it("never prints an unsafe configured name or unsafe run identity in skip warnings", async () => {
    const root = await roots();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const capsule = await createAgyRunCapsule({ agentDefinitionId: "codex\nTOKEN=secret",
      runId: "unsafe-log-run", memoryDir: root.memoryDir, workspacePath: root.workspacePath,
      identity: "Identity", configuredSkillBindings: [{ kind: "unresolved", name: "../../TOKEN=secret" }],
      workspaceCollisionPolicy: "fail", mcpDescriptor });
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
      workspaceCollisionPolicy: "fail", mcpDescriptor }))
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
      workspaceCollisionPolicy: "prefer_workspace", mcpDescriptor });

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
      workspaceCollisionPolicy: "fail", mcpDescriptor });
    await fs.rm(removed, { recursive: true });
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const restored = await restoreAgyRunCapsule({ runId: "linked-resume", memoryDir: root.memoryDir,
      selectedWorkspacePath: root.workspacePath, mcpDescriptor });

    expect(restored.manifest.skills.map((entry) => entry.name)).toEqual(["kept-skill", "removed-skill"]);
    expect(await fs.readFile(path.join(capsule.path, ".agents", "skills", "kept-skill", "SKILL.md"), "utf8")).toBe("# Kept");
    await expect(fs.lstat(path.join(capsule.path, ".agents", "skills", "removed-skill"))).rejects.toMatchObject({ code: "ENOENT" });
    expect(warning).toHaveBeenCalledWith("AGY configured skill skipped on restore: run=linked-resume, skill=removed-skill, disposition=skipped-missing-source");
  });

  it("resumes a run created with copied skill folders", async () => {
    const root = await roots();
    const capsule = await createAgyRunCapsule({ agentDefinitionId: "test-agent", runId: "copied-run", memoryDir: root.memoryDir,
      workspacePath: root.workspacePath, identity: "Identity", configuredSkillBindings: [], mcpDescriptor });
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
      selectedWorkspacePath: root.workspacePath, mcpDescriptor });

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
      mcpDescriptor });
    const two = await createAgyRunCapsule({ agentDefinitionId: "test-agent", runId: "two", memoryDir: path.join(root.base, "memory-two"),
      workspacePath: root.workspacePath, identity: "TWO-IDENTITY", configuredSkillBindings: [],
      mcpDescriptor });
    expect(one.path).not.toBe(two.path);
    expect(one.manifest.agentName).not.toBe(two.manifest.agentName);
    expect(one.manifest.workspacePath).toBe(two.manifest.workspacePath);
    expect(await fs.readdir(root.workspacePath)).toEqual([]);
  });

  describe("a leftover capsule of an earlier era or a failed start (autobyteus-440)", () => {
    const create = (root: Awaited<ReturnType<typeof roots>>, runId: string, identity: string, bindings: ConfiguredAgentSkillBinding[] = []) =>
      createAgyRunCapsule({ agentDefinitionId: "test-agent", runId, memoryDir: root.memoryDir, workspacePath: root.workspacePath,
        identity, configuredSkillBindings: bindings, workspaceCollisionPolicy: "fail", mcpDescriptor: mcpDescriptor as never });

    it("replaces the capsule of an earlier era: the new start is on fresh files, nothing of the old one stays", async () => {
      const root = await roots();
      const first = await create(root, "run", "FIRST-IDENTITY");
      await fs.writeFile(path.join(first.path, "stale-note.txt"), "left by the first era");
      const second = await create(root, "run", "SECOND-IDENTITY");
      expect(second.path).toBe(first.path);
      expect(await fs.readdir(second.path)).not.toContain("stale-note.txt");
      const markdown = await fs.readFile(path.join(second.path, ".agents", "agents", second.manifest.agentName, "agent.md"), "utf8");
      expect(markdown).toContain("SECOND-IDENTITY");
      expect(markdown).not.toContain("FIRST-IDENTITY");
      expect(JSON.parse(await fs.readFile(path.join(second.path, "manifest.json"), "utf8"))).toEqual(second.manifest);
    });

    it("replaces a leftover from a failed start that stopped halfway (no manifest)", async () => {
      const root = await roots();
      const leftover = path.join(root.memoryDir, "agy-project");
      await fs.mkdir(path.join(leftover, ".agents", "agents", "half"), { recursive: true });
      await fs.writeFile(path.join(leftover, ".agents", "agents", "half", "agent.md"), "half written");
      const capsule = await create(root, "run", "IDENTITY");
      expect(capsule.path).toBe(leftover);
      await expect(fs.stat(path.join(leftover, ".agents", "agents", "half"))).rejects.toMatchObject({ code: "ENOENT" });
      expect(JSON.parse(await fs.readFile(path.join(leftover, "manifest.json"), "utf8")).runId).toBe("run");
    });

    it("removes a skill link without touching the skill folder it points to, and links it again", async () => {
      const root = await roots();
      const source = path.join(root.base, "skill-source");
      await fs.mkdir(source);
      await fs.writeFile(path.join(source, "SKILL.md"), "# Example skill");
      await fs.writeFile(path.join(source, "extra.md"), "an extra file");
      const binding = globalBinding(source);
      await create(root, "run", "ONE", [binding]);
      const second = await create(root, "run", "TWO", [binding]);
      expect(await fs.readFile(path.join(source, "SKILL.md"), "utf8")).toBe("# Example skill");
      expect(await fs.readFile(path.join(source, "extra.md"), "utf8")).toBe("an extra file");
      expect(await fs.readdir(source)).toEqual(["SKILL.md", "extra.md"]);
      expect((await fs.lstat(path.join(second.path, ".agents", "skills", "example-skill"))).isSymbolicLink()).toBe(true);
      expect(await fs.readFile(path.join(second.path, ".agents", "skills", "example-skill", "SKILL.md"), "utf8")).toBe("# Example skill");
    });

    it("never touches the selected workspace, its own .agents folder included", async () => {
      const root = await roots();
      const userAgents = path.join(root.workspacePath, ".agents", "skills", "user-skill");
      await fs.mkdir(userAgents, { recursive: true });
      await fs.writeFile(path.join(userAgents, "SKILL.md"), "# user's");
      const before = await fs.readdir(root.workspacePath, { recursive: true });
      await create(root, "run", "ONE");
      await create(root, "run", "TWO");
      expect(await fs.readdir(root.workspacePath, { recursive: true })).toEqual(before);
      expect(await fs.readFile(path.join(userAgents, "SKILL.md"), "utf8")).toBe("# user's");
    });

    it("keeps its failure clean: a start that fails after the replacement leaves no capsule behind", async () => {
      const root = await roots();
      await create(root, "run", "ONE");
      const source = path.join(root.base, "skill-source");
      await fs.mkdir(source);
      await fs.writeFile(path.join(source, "SKILL.md"), "# s");
      await fs.mkdir(path.join(root.workspacePath, ".agents", "skills", "example-skill"), { recursive: true });
      await expect(create(root, "run", "TWO", [globalBinding(source)])).rejects.toThrow();
      await expect(fs.stat(path.join(root.memoryDir, "agy-project"))).rejects.toMatchObject({ code: "ENOENT" });
    });

    it("a restore still reads the capsule of its own era and never replaces it", async () => {
      const root = await roots();
      const created = await create(root, "run", "OWN-ERA");
      const bytes = await fs.readFile(path.join(created.path, "manifest.json"), "utf8");
      const restored = await restoreAgyRunCapsule({ runId: "run", memoryDir: root.memoryDir, selectedWorkspacePath: root.workspacePath, mcpDescriptor: mcpDescriptor as never });
      expect(restored.path).toBe(created.path);
      expect(await fs.readFile(path.join(created.path, "manifest.json"), "utf8")).toBe(bytes);
    });
  });
});
