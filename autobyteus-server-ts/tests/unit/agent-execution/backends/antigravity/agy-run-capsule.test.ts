import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createAgyRunCapsule, restoreAgyRunCapsule } from "../../../../../src/agent-execution/backends/antigravity/capsule/agy-run-capsule.js";
import { Skill } from "../../../../../src/skills/domain/models.js";

const roots = async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "agy-capsule-test-"));
  const workspacePath = path.join(base, "workspace");
  const memoryDir = path.join(base, "memory");
  await fs.mkdir(workspacePath);
  return { base, workspacePath, memoryDir };
};

describe("AGY run capsule", () => {
  it("snapshots full identity and selected workspace without writing user .agents", async () => {
    const root = await roots();
    const capsule = await createAgyRunCapsule({ runId: "run-1", memoryDir: root.memoryDir,
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
    const binding = { kind: "resolved" as const, skill: new Skill({ name: "example-skill", description: "test", content: "", rootPath: source }) };
    const preloaded = await createAgyRunCapsule({ runId: "preload", memoryDir: root.memoryDir,
      workspacePath: root.workspacePath, identity: "Identity", configuredSkillBindings: [binding],
      skillAccessMode: "PRELOADED_ONLY", mcpDescriptor: null });
    expect(await fs.readFile(path.join(preloaded.path, ".agents", "skills", "example-skill", "SKILL.md"), "utf8")).toBe("# Example skill");
    const none = await createAgyRunCapsule({ runId: "none", memoryDir: path.join(root.base, "none-memory"),
      workspacePath: root.workspacePath, identity: "Identity", configuredSkillBindings: [binding],
      skillAccessMode: "NONE", mcpDescriptor: null });
    expect(none.manifest.skills).toEqual([]);
    await expect(fs.stat(path.join(none.path, ".agents", "skills", "example-skill"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects configured skill collisions without overwriting the selected workspace", async () => {
    const root = await roots();
    const source = path.join(root.base, "skill-source");
    const userSkill = path.join(root.workspacePath, ".agents", "skills", "example-skill");
    await fs.mkdir(source); await fs.mkdir(userSkill, { recursive: true });
    await fs.writeFile(path.join(source, "SKILL.md"), "# Configured");
    await fs.writeFile(path.join(userSkill, "SKILL.md"), "# User owned");
    const binding = { kind: "resolved" as const, skill: new Skill({ name: "example-skill", description: "test", content: "", rootPath: source }) };
    await expect(createAgyRunCapsule({ runId: "collision", memoryDir: root.memoryDir,
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
    await expect(createAgyRunCapsule({ runId: "mcp-collision", memoryDir: root.memoryDir,
      workspacePath: root.workspacePath, identity: "Identity", configuredSkillBindings: [],
      skillAccessMode: "NONE", mcpDescriptor: { name: "autobyteus_agent_tools", transport: "streamable_http",
        serverUrl: "http://127.0.0.1:12345/mcp/agent-tools/session", enabledTools: ["send_message_to"] } }))
      .rejects.toThrow("AGY_MCP_NAME_COLLISION");
    expect(await fs.readFile(userConfig, "utf8")).toBe(original);
  });

  it("isolates two run capsules sharing one selected workspace", async () => {
    const root = await roots();
    const one = await createAgyRunCapsule({ runId: "one", memoryDir: root.memoryDir,
      workspacePath: root.workspacePath, identity: "ONE-IDENTITY", configuredSkillBindings: [],
      skillAccessMode: "NONE", mcpDescriptor: null });
    const two = await createAgyRunCapsule({ runId: "two", memoryDir: path.join(root.base, "memory-two"),
      workspacePath: root.workspacePath, identity: "TWO-IDENTITY", configuredSkillBindings: [],
      skillAccessMode: "NONE", mcpDescriptor: null });
    expect(one.path).not.toBe(two.path);
    expect(one.manifest.agentName).not.toBe(two.manifest.agentName);
    expect(one.manifest.workspacePath).toBe(two.manifest.workspacePath);
    expect(await fs.readdir(root.workspacePath)).toEqual([]);
  });
});
