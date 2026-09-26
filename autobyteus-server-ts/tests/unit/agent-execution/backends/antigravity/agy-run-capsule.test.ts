import fs from "node:fs/promises";
import { fingerprintConfiguredSkillSource } from "../../../../../src/skills/services/configured-skill-source-fingerprint.js";
import os from "node:os";
import path from "node:path";
import { realpathSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAgyRunCapsule, restoreAgyRunCapsule } from "../../../../../src/agent-execution/backends/antigravity/capsule/agy-run-capsule.js";
import { Skill } from "../../../../../src/skills/domain/models.js";
import type { DetailedConfiguredSkillResolution } from "../../../../../src/skills/domain/configured-agent-skill-binding.js";

const roots = async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "agy-capsule-test-"));
  const workspacePath = path.join(base, "workspace");
  const memoryDir = path.join(base, "memory");
  await fs.mkdir(workspacePath);
  return { base, workspacePath, memoryDir };
};
const globalBinding = (source: string, name = "example-skill"): DetailedConfiguredSkillResolution => ({
  kind: "resolved", skill: new Skill({ name, description: "test", content: "", rootPath: source }),
  source: { origin: "global", sourceRoot: realpathSync(source), trustedRoot: realpathSync(source) },
  sourceTreeSha256: fingerprintConfiguredSkillSource(source, source),
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
    createAgyRunCapsule({ agentDefinitionId: "test-agent", nativeToolProfile: { cliVersion: "1.2.11", permittedNativeToolNames: ["generate_image", "view_file"] }, runId, memoryDir: root.memoryDir, workspacePath: root.workspacePath,
      identity: "Identity", configuredSkillBindings: [], skillAccessMode: "NONE", mcpDescriptor });
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
    const capsule = await createAgyRunCapsule({ agentDefinitionId: "test-agent", nativeToolProfile: { cliVersion: "1.2.11", permittedNativeToolNames: ["generate_image", "view_file"] }, runId: "run-1", memoryDir: root.memoryDir,
      workspacePath: root.workspacePath, identity: "IDENTITY-SENTINEL and enclosing team instructions",
      configuredSkillBindings: [], skillAccessMode: "NONE", mcpDescriptor: null });
    const markdown = await fs.readFile(path.join(capsule.path, ".agents", "agents", capsule.manifest.agentName, "agent.md"), "utf8");
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

  it("materializes configured PRELOADED_ONLY package and NONE omits it", async () => {
    const root = await roots();
    const source = path.join(root.base, "skill-source");
    await fs.mkdir(source);
    await fs.writeFile(path.join(source, "SKILL.md"), "# Example skill");
    const binding = globalBinding(source);
    const preloaded = await createAgyRunCapsule({ agentDefinitionId: "test-agent", nativeToolProfile: { cliVersion: "1.2.11", permittedNativeToolNames: ["generate_image", "view_file"] }, runId: "preload", memoryDir: root.memoryDir,
      workspacePath: root.workspacePath, identity: "Identity", configuredSkillBindings: [binding],
      skillAccessMode: "PRELOADED_ONLY", mcpDescriptor: null });
    expect(await fs.readFile(path.join(preloaded.path, ".agents", "skills", "example-skill", "SKILL.md"), "utf8")).toBe("# Example skill");
    const none = await createAgyRunCapsule({ agentDefinitionId: "test-agent", nativeToolProfile: { cliVersion: "1.2.11", permittedNativeToolNames: ["generate_image", "view_file"] }, runId: "none", memoryDir: path.join(root.base, "none-memory"),
      workspacePath: root.workspacePath, identity: "Identity", configuredSkillBindings: [binding],
      skillAccessMode: "NONE", mcpDescriptor: null });
    expect(none.manifest.skills).toEqual([]);
    await expect(fs.stat(path.join(none.path, ".agents", "skills", "example-skill"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("warns and omits only certified absence while retaining resolved snapshots", async () => {
    const root = await roots();
    const source = path.join(root.base, "skill-source");
    await fs.mkdir(source);
    await fs.writeFile(path.join(source, "SKILL.md"), "# Example skill");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const capsule = await createAgyRunCapsule({ agentDefinitionId: "codex", nativeToolProfile: { cliVersion: "1.2.11", permittedNativeToolNames: ["generate_image"] },
      runId: "missing-mixed", memoryDir: root.memoryDir, workspacePath: root.workspacePath,
      identity: "Identity", configuredSkillBindings: [{ kind: "certified_absent", name: "missing" }, globalBinding(source)],
      skillAccessMode: "PRELOADED_ONLY", mcpDescriptor: null });
    expect(capsule.manifest.skills).toEqual([{ name: "example-skill", relativePath: path.join(".agents", "skills", "example-skill") }]);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("run=missing-mixed, agent=codex, skill=missing, disposition=skipped-missing"));
  });

  it("warns/omits semantic invalidity but rejects source removed after resolution", async () => {
    const root = await roots();
    const source = path.join(root.base, "skill-source");
    await fs.mkdir(source);
    await fs.writeFile(path.join(source, "SKILL.md"), "# Example skill");
    const common = { agentDefinitionId: "codex", nativeToolProfile: { cliVersion: "1.2.11", permittedNativeToolNames: ["generate_image"] },
      memoryDir: root.memoryDir, workspacePath: root.workspacePath, identity: "Identity",
      skillAccessMode: "PRELOADED_ONLY" as const, mcpDescriptor: null };
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const invalid = await createAgyRunCapsule({ ...common, runId: "invalid", configuredSkillBindings: [
      { kind: "invalid_candidate", name: "example-skill", reason: "malformed_manifest" }],
    });
    expect(invalid.manifest.skills).toEqual([]);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("disposition=skipped-invalid, reason=malformed_manifest"));
    const resolved = globalBinding(source);
    const mixed = await createAgyRunCapsule({ ...common, runId: "invalid-mixed", memoryDir: path.join(root.base, "mixed-memory"), configuredSkillBindings: [
      { kind: "invalid_candidate", name: "bad-skill", reason: "name_mismatch" }, resolved,
    ] });
    expect(mixed.manifest.skills.map((entry) => entry.name)).toEqual(["example-skill"]);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("skill=bad-skill, disposition=skipped-invalid, reason=name_mismatch"));
    await fs.rm(source, { recursive: true });
    await expect(createAgyRunCapsule({ ...common, runId: "changed", memoryDir: path.join(root.base, "changed-memory"), configuredSkillBindings: [resolved] }))
      .rejects.toThrow("AGY_SKILL_SOURCE_CHANGED");
  });

  it("does not resolve or warn about configured skills in NONE mode", async () => {
    const root = await roots();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const capsule = await createAgyRunCapsule({ agentDefinitionId: "codex", nativeToolProfile: { cliVersion: "1.2.11", permittedNativeToolNames: ["generate_image"] },
      runId: "none-invalid", memoryDir: root.memoryDir, workspacePath: root.workspacePath,
      identity: "Identity", configuredSkillBindings: [{ kind: "invalid_candidate", name: "broken", reason: "malformed_manifest" }],
      skillAccessMode: "NONE", mcpDescriptor: null });
    expect(capsule.manifest.skills).toEqual([]);
    expect(warning).not.toHaveBeenCalled();
  });

  it("never prints an unsafe configured name or unsafe run identity in skip warnings", async () => {
    const root = await roots();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const capsule = await createAgyRunCapsule({ agentDefinitionId: "codex\nTOKEN=secret", nativeToolProfile: { cliVersion: "1.2.11", permittedNativeToolNames: ["generate_image"] },
      runId: "unsafe-log-run", memoryDir: root.memoryDir, workspacePath: root.workspacePath,
      identity: "Identity", configuredSkillBindings: [{ kind: "invalid_candidate", name: "../../TOKEN=secret", reason: "unsafe_name" }],
      skillAccessMode: "PRELOADED_ONLY", mcpDescriptor: null });
    expect(capsule.manifest.skills).toEqual([]);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("skill=[invalid-name], disposition=skipped-invalid, reason=unsafe_name"));
    expect(warning.mock.calls.flat().join(" ")).not.toContain("TOKEN=secret");
  });

  it("rejects non-manifest source content changed after detailed resolution", async () => {
    const root = await roots();
    const source = path.join(root.base, "skill-source");
    await fs.mkdir(source);
    await fs.writeFile(path.join(source, "SKILL.md"), "# Example skill");
    await fs.writeFile(path.join(source, "reference.md"), "before");
    const resolved = globalBinding(source);
    await fs.writeFile(path.join(source, "reference.md"), "after");
    await expect(createAgyRunCapsule({ agentDefinitionId: "codex", nativeToolProfile: { cliVersion: "1.2.11", permittedNativeToolNames: ["generate_image"] },
      runId: "changed-content", memoryDir: root.memoryDir, workspacePath: root.workspacePath,
      identity: "Identity", configuredSkillBindings: [resolved], skillAccessMode: "PRELOADED_ONLY", mcpDescriptor: null }))
      .rejects.toThrow("AGY_SKILL_SOURCE_CHANGED");
  });

  it("rejects configured skill collisions without overwriting the selected workspace", async () => {
    const root = await roots();
    const source = path.join(root.base, "skill-source");
    const userSkill = path.join(root.workspacePath, ".agents", "skills", "example-skill");
    await fs.mkdir(source); await fs.mkdir(userSkill, { recursive: true });
    await fs.writeFile(path.join(source, "SKILL.md"), "# Configured");
    await fs.writeFile(path.join(userSkill, "SKILL.md"), "# User owned");
    const binding = globalBinding(source);
    await expect(createAgyRunCapsule({ agentDefinitionId: "test-agent", nativeToolProfile: { cliVersion: "1.2.11", permittedNativeToolNames: ["generate_image", "view_file"] }, runId: "collision", memoryDir: root.memoryDir,
      workspacePath: root.workspacePath, identity: "Identity", configuredSkillBindings: [binding],
      skillAccessMode: "PRELOADED_ONLY", mcpDescriptor: null })).rejects.toThrow("AGY_SKILL_NAME_COLLISION");
    expect(await fs.readFile(path.join(userSkill, "SKILL.md"), "utf8")).toBe("# User owned");
    await expect(fs.stat(path.join(root.memoryDir, "agy-project"))).rejects.toMatchObject({ code: "ENOENT" });
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
    const one = await createAgyRunCapsule({ agentDefinitionId: "test-agent", nativeToolProfile: { cliVersion: "1.2.11", permittedNativeToolNames: ["generate_image", "view_file"] }, runId: "one", memoryDir: root.memoryDir,
      workspacePath: root.workspacePath, identity: "ONE-IDENTITY", configuredSkillBindings: [],
      skillAccessMode: "NONE", mcpDescriptor: null });
    const two = await createAgyRunCapsule({ agentDefinitionId: "test-agent", nativeToolProfile: { cliVersion: "1.2.11", permittedNativeToolNames: ["generate_image", "view_file"] }, runId: "two", memoryDir: path.join(root.base, "memory-two"),
      workspacePath: root.workspacePath, identity: "TWO-IDENTITY", configuredSkillBindings: [],
      skillAccessMode: "NONE", mcpDescriptor: null });
    expect(one.path).not.toBe(two.path);
    expect(one.manifest.agentName).not.toBe(two.manifest.agentName);
    expect(one.manifest.workspacePath).toBe(two.manifest.workspacePath);
    expect(await fs.readdir(root.workspacePath)).toEqual([]);
  });
});
