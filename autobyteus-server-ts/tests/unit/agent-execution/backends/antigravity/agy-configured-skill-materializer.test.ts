import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { existsSync, realpathSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../../../src/agent-definition/domain/models.js";
import { createAgyRunCapsule, restoreAgyRunCapsule } from "../../../../../src/agent-execution/backends/antigravity/capsule/agy-run-capsule.js";
import type { ConfiguredAgentSkillBinding, DetailedConfiguredSkillResolution } from "../../../../../src/skills/domain/configured-agent-skill-binding.js";
import { Skill } from "../../../../../src/skills/domain/models.js";
import { ConfiguredAgentSkillResolver } from "../../../../../src/skills/services/configured-agent-skill-resolver.js";
import { SkillLoader } from "../../../../../src/skills/loader.js";

const tempRoots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const root of tempRoots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});
const fixture = async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "agy-linked-skill-"));
  tempRoots.push(base);
  const team = path.join(base, "team");
  const agent = path.join(team, "agents", "solution-designer");
  const skill = path.join(agent, "skills", "solution-designer");
  const shared = path.join(team, "shared");
  const workspace = path.join(base, "workspace");
  await fs.mkdir(skill, { recursive: true });
  await Promise.all([fs.mkdir(shared), fs.mkdir(workspace)]);
  await fs.writeFile(path.join(skill, "SKILL.md"), "---\nname: solution-designer\ndescription: Design solutions\n---\n\nUse the shared references.\n");
  await fs.writeFile(path.join(shared, "design-examples.md"), "EXAMPLES-ORIGINAL");
  await fs.writeFile(path.join(shared, "design-principles.md"), "PRINCIPLES-ORIGINAL");
  await fs.symlink("../../../../shared/design-examples.md", path.join(skill, "design-examples.md"));
  await fs.symlink("../../../../shared/design-principles.md", path.join(skill, "design-principles.md"));
  return { base, team, agent, skill, shared, workspace };
};
const binding = (skill: string, trustedRoot: string, origin: "agent_private" | "team_shared" | "global" = "agent_private"): ConfiguredAgentSkillBinding => ({
  kind: "resolved", skill: new Skill({ name: "solution-designer", description: "Design", content: "", rootPath: skill }),
  source: { origin, sourceRoot: realpathSync(skill), trustedRoot: realpathSync(trustedRoot) },
});
const detailed = (binding: ConfiguredAgentSkillBinding): DetailedConfiguredSkillResolution => binding.kind === "resolved"
  ? { ...binding, manifestSha256: createHash("sha256").update(readFileSync(path.join(binding.skill.rootPath, "SKILL.md"))).digest("hex") }
  : { kind: "certified_absent", name: binding.name };
const create = (root: Awaited<ReturnType<typeof fixture>>, configuredSkillBindings: ConfiguredAgentSkillBinding[],
  mode: "PRELOADED_ONLY" | "NONE" = "PRELOADED_ONLY", runId = "linked") => createAgyRunCapsule({ agentDefinitionId: "test-agent", nativeToolProfile: { cliVersion: "1.2.11", permittedNativeToolNames: ["generate_image", "view_file"] },
  runId, memoryDir: path.join(root.base, `memory-${runId}`), workspacePath: root.workspace,
  identity: "Identity", configuredSkillBindings: configuredSkillBindings.map(detailed), skillAccessMode: mode, mcpDescriptor: null,
});
const resolver = new ConfiguredAgentSkillResolver({ loader: new SkillLoader(), isReadonlyPath: () => true,
  resolveGlobalSkill: () => null, isSkillDisabled: () => false, logger: { warn: () => undefined } });

describe("AGY configured skill checked snapshot", () => {
  it("copies both in-team file links as ordinary capsule bytes and keeps exact restore immutable", async () => {
    const root = await fixture();
    const definition = new AgentDefinition({ name: "Solution Designer", description: "Design", instructions: "",
      skillNames: ["solution-designer"], sourceInfo: { agentDirPath: root.agent, teamDirPath: root.team } });
    const bindings = resolver.resolveForAgent(definition);
    expect(bindings[0]).toMatchObject({ kind: "resolved", source: { origin: "agent_private",
      sourceRoot: realpathSync(root.skill), trustedRoot: realpathSync(root.team) } });
    const capsule = await create(root, bindings);
    const copied = path.join(capsule.path, ".agents", "skills", "solution-designer");
    for (const [name, expected] of [["design-examples.md", "EXAMPLES-ORIGINAL"],
      ["design-principles.md", "PRINCIPLES-ORIGINAL"]] as const) {
      expect((await fs.lstat(path.join(copied, name))).isFile()).toBe(true);
      expect((await fs.lstat(path.join(copied, name))).isSymbolicLink()).toBe(false);
      expect(await fs.readFile(path.join(copied, name), "utf8")).toBe(expected);
    }
    await fs.writeFile(path.join(root.shared, "design-examples.md"), "EXAMPLES-EDITED");
    const restored = await restoreAgyRunCapsule({ runId: "linked", memoryDir: path.join(root.base, "memory-linked"),
      selectedWorkspacePath: root.workspace, mcpDescriptor: null });
    expect(restored.manifest.skills).toEqual([{ name: "solution-designer", relativePath: path.join(".agents", "skills", "solution-designer") }]);
    expect(await fs.readFile(path.join(copied, "design-examples.md"), "utf8")).toBe("EXAMPLES-ORIGINAL");
    expect(await fs.readdir(root.workspace)).toEqual([]);
  });

  it("keeps owner execute permission for regular skill scripts without exposing group or world access", async () => {
    const root = await fixture();
    const script = path.join(root.skill, "run.sh");
    await fs.writeFile(script, "#!/bin/sh\nexit 0\n");
    await fs.chmod(script, 0o755);
    const capsule = await create(root, [binding(root.skill, root.team)]);
    const copied = await fs.stat(path.join(capsule.path, ".agents", "skills", "solution-designer", "run.sh"));
    expect(copied.mode & 0o777).toBe(0o700);
  });

  it("bounds a standalone private skill to its agent root", async () => {
    const root = await fixture();
    await fs.rm(path.join(root.skill, "design-examples.md"));
    await fs.rm(path.join(root.skill, "design-principles.md"));
    await fs.writeFile(path.join(root.agent, "reference.md"), "AGENT-REFERENCE");
    await fs.symlink("../../reference.md", path.join(root.skill, "reference.md"));
    const definition = new AgentDefinition({ name: "Standalone", description: "Design", instructions: "",
      skillNames: ["solution-designer"], sourceInfo: { agentDirPath: root.agent } });
    const bindings = resolver.resolveForAgent(definition);
    expect(bindings[0]).toMatchObject({ kind: "resolved", source: { origin: "agent_private",
      trustedRoot: realpathSync(root.agent) } });
    const capsule = await create(root, bindings);
    expect(await fs.readFile(path.join(capsule.path, ".agents", "skills", "solution-designer", "reference.md"), "utf8"))
      .toBe("AGENT-REFERENCE");
  });

  it("accepts a team-shared skill's file link only inside its owning team", async () => {
    const root = await fixture();
    const sharedSkill = path.join(root.team, "skills", "solution-designer");
    await fs.mkdir(sharedSkill, { recursive: true });
    await fs.writeFile(path.join(sharedSkill, "SKILL.md"), "# Shared skill");
    await fs.symlink("../../shared/design-examples.md", path.join(sharedSkill, "design-examples.md"));
    const capsule = await create(root, [binding(sharedSkill, root.team, "team_shared")]);
    expect(await fs.readFile(path.join(capsule.path, ".agents", "skills", "solution-designer", "design-examples.md"), "utf8"))
      .toBe("EXAMPLES-ORIGINAL");
  });

  it.each(["outside", "dangling", "directory", "cyclic"])("rejects %s links and cleans the candidate", async (kind) => {
    const root = await fixture();
    const link = path.join(root.skill, "design-examples.md");
    await fs.rm(link);
    if (kind === "outside") {
      const secret = path.join(root.base, "outside-secret");
      await fs.writeFile(secret, "DO-NOT-COPY");
      await fs.symlink(secret, link);
    } else if (kind === "dangling") await fs.symlink(path.join(root.shared, "missing.md"), link);
    else if (kind === "directory") await fs.symlink(root.shared, link);
    else await fs.symlink("design-examples.md", link);
    await expect(create(root, [binding(root.skill, root.team)])).rejects.toThrow(/AGY_SKILL_SOURCE_/);
    await expect(fs.stat(path.join(root.base, "memory-linked", "agy-project"))).rejects.toMatchObject({ code: "ENOENT" });
    expect(await fs.readdir(root.workspace)).toEqual([]);
  });

  it("never lets a global fallback borrow its caller's team boundary", async () => {
    const root = await fixture();
    await expect(create(root, [binding(root.skill, root.skill, "global")])).rejects.toThrow("AGY_SKILL_SOURCE_OUT_OF_BOUNDS");
    await expect(fs.stat(path.join(root.base, "memory-linked", "agy-project"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects case-folded configured names before retaining any candidate", async () => {
    const root = await fixture();
    const other = path.join(root.team, "skills", "Solution-Designer");
    await fs.mkdir(other, { recursive: true });
    await fs.writeFile(path.join(other, "SKILL.md"), "# Second");
    const second: ConfiguredAgentSkillBinding = { kind: "resolved",
      skill: new Skill({ name: "Solution-Designer", description: "Second", content: "", rootPath: other }),
      source: { origin: "team_shared", sourceRoot: realpathSync(other), trustedRoot: realpathSync(root.team) } };
    await expect(create(root, [binding(root.skill, root.team), second])).rejects.toThrow("AGY_SKILL_NAME_COLLISION");
    await expect(fs.stat(path.join(root.base, "memory-linked", "agy-project"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("fails closed for missing or inconsistent source provenance", async () => {
    const root = await fixture();
    await expect(create(root, [{ kind: "resolved", skill: new Skill({ name: "solution-designer", description: "Design",
      content: "", rootPath: root.skill }) } as ConfiguredAgentSkillBinding])).rejects.toThrow("AGY_SKILL_SOURCE_PROVENANCE_INVALID");
    await expect(create(root, [binding(root.skill, root.workspace)])).rejects.toThrow("AGY_SKILL_SOURCE_PROVENANCE_INVALID");
    await expect(create(root, [binding(root.skill, root.base)])).rejects.toThrow("AGY_SKILL_SOURCE_PROVENANCE_INVALID");
  });

  it("does not inspect or expose configured source links in NONE mode", async () => {
    const root = await fixture();
    const capsule = await create(root, [binding(root.skill, root.skill, "global")], "NONE");
    expect(capsule.manifest.skills).toEqual([]);
    await expect(fs.stat(path.join(capsule.path, ".agents", "skills"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("detects a source changed during copy and removes every candidate byte", async () => {
    const root = await fixture();
    const writeFile = fs.writeFile.bind(fs);
    vi.spyOn(fs, "writeFile").mockImplementation(async (...args: Parameters<typeof fs.writeFile>) => {
      await writeFile(...args);
      if (String(args[0]).endsWith(path.join("solution-designer", "design-examples.md")))
        await writeFile(path.join(root.shared, "design-examples.md"), "CHANGED-DURING-COPY");
    });
    await expect(create(root, [binding(root.skill, root.team)])).rejects.toThrow("AGY_SKILL_SOURCE_CHANGED");
    await expect(fs.stat(path.join(root.base, "memory-linked", "agy-project"))).rejects.toMatchObject({ code: "ENOENT" });
  });
});

const actualTeam = "/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team";
it.skipIf(!existsSync(path.join(actualTeam, "agents", "solution-designer", "skills", "solution-designer", "SKILL.md")))(
  "snapshots both actual mounted Solution Designer shared references without changing their sources", async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "agy-actual-skill-"));
    tempRoots.push(base);
    const workspace = path.join(base, "workspace");
    await fs.mkdir(workspace);
    const agent = path.join(actualTeam, "agents", "solution-designer");
    const actual = path.join(agent, "skills", "solution-designer");
    const definition = new AgentDefinition({ name: "Solution Designer", description: "Design", instructions: "",
      skillNames: ["solution-designer"], sourceInfo: { agentDirPath: agent, teamDirPath: actualTeam } });
    const bindings = resolver.resolveForAgent(definition);
    const capsule = await createAgyRunCapsule({ agentDefinitionId: "test-agent", nativeToolProfile: { cliVersion: "1.2.11", permittedNativeToolNames: ["generate_image", "view_file"] }, runId: "actual", memoryDir: path.join(base, "memory"), workspacePath: workspace,
      identity: "Identity", configuredSkillBindings: bindings.map(detailed), skillAccessMode: "PRELOADED_ONLY", mcpDescriptor: null });
    for (const name of ["design-examples.md", "design-principles.md"]) {
      const target = path.join(capsule.path, ".agents", "skills", "solution-designer", name);
      expect((await fs.lstat(target)).isFile()).toBe(true);
      expect(await fs.readFile(target)).toEqual(await fs.readFile(path.join(actual, name)));
      expect((await fs.lstat(path.join(actual, name))).isSymbolicLink()).toBe(true);
    }
    expect(await fs.readdir(workspace)).toEqual([]);
  },
);
