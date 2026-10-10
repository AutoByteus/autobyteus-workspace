import fs from "node:fs/promises";
import { existsSync, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../../../src/agent-definition/domain/models.js";
import { AgentCreationError } from "../../../../../src/agent-execution/errors.js";
import { createAgyRunCapsule } from "../../../../../src/agent-execution/backends/antigravity/capsule/agy-run-capsule.js";
import type { WorkspaceCollisionPolicy } from "../../../../../src/agent-execution/backends/shared/workspace-skill-collision-policy.js";
import type { ConfiguredAgentSkillBinding } from "../../../../../src/skills/domain/configured-agent-skill-binding.js";
import type { InstalledSkillRecord } from "../../../../../src/skills/domain/installed-skill-record.js";
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
  const workspace = path.join(base, "workspace");
  const installed = path.join(base, "installed");
  await fs.mkdir(workspace);
  await fs.mkdir(installed);
  return { base, workspace, installed };
};
type Root = Awaited<ReturnType<typeof fixture>>;

const writeSkill = async (dir: string, name: string, body = `# ${name}`): Promise<string> => {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "SKILL.md"), `---\nname: ${name}\ndescription: ${name}\n---\n\n${body}\n`);
  return dir;
};
const resolved = (name: string, rootPath: string): ConfiguredAgentSkillBinding =>
  ({ kind: "resolved", skill: new Skill({ name, description: name, content: "", rootPath }) });
const memoryDir = (root: Root, runId: string): string => path.join(root.base, `memory-${runId}`);
const create = (root: Root, bindings: ConfiguredAgentSkillBinding[], policy: WorkspaceCollisionPolicy, runId = "run") =>
  createAgyRunCapsule({ agentDefinitionId: "test-agent", runId, memoryDir: memoryDir(root, runId),
    workspacePath: root.workspace, identity: "Identity", configuredSkillBindings: bindings,
    workspaceCollisionPolicy: policy, mcpDescriptor: null });
const capsuleSkill = (capsulePath: string, name: string): string => path.join(capsulePath, ".agents", "skills", name);

describe("AGY configured skill linker", () => {
  it.each(["fail", "prefer_workspace"] as const)(
    "links a skill whose folder holds an environment with outside links and a large file (%s)", async (policy) => {
      const root = await fixture();
      const skill = await writeSkill(path.join(root.installed, "browser-automation"), "browser-automation");
      const outsidePython = path.join(root.base, "uv-python", "python3.13");
      await fs.mkdir(path.dirname(outsidePython), { recursive: true });
      await fs.writeFile(outsidePython, "OUTSIDE-INTERPRETER");
      await fs.mkdir(path.join(skill, ".venv", "bin"), { recursive: true });
      await fs.symlink(outsidePython, path.join(skill, ".venv", "bin", "python"));
      await fs.symlink(path.join(root.base, "missing-target"), path.join(skill, ".venv", "bin", "dangling"));
      const large = await fs.open(path.join(skill, ".venv", "node"), "w");
      await large.truncate(40 * 1024 * 1024); // sparse; larger than the removed 32 MiB copy limit
      await large.close();
      await fs.writeFile(path.join(skill, "details.md"), "SIBLING");
      const readFile = vi.spyOn(fs, "readFile");

      const capsule = await create(root, [resolved("browser-automation", skill)], policy);

      const link = capsuleSkill(capsule.path, "browser-automation");
      expect((await fs.lstat(link)).isSymbolicLink()).toBe(true);
      expect(await fs.readlink(link)).toBe(realpathSync(skill));
      expect(capsule.manifest.skills).toEqual([{ name: "browser-automation", relativePath: path.join(".agents", "skills", "browser-automation") }]);
      expect(readFile.mock.calls.some(([file]) => String(file).startsWith(realpathSync(skill)))).toBe(false);
      expect(await fs.readFile(path.join(link, "SKILL.md"), "utf8")).toContain("# browser-automation");
      expect(await fs.readFile(path.join(link, "details.md"), "utf8")).toBe("SIBLING");
      expect(await fs.readFile(path.join(link, ".venv", "bin", "python"), "utf8")).toBe("OUTSIDE-INTERPRETER");
      expect(await fs.readdir(root.workspace)).toEqual([]);
    });

  it("reaches a team-private skill's relative links into the team shared folder through the capsule link", async () => {
    const root = await fixture();
    const team = path.join(root.base, "team");
    const agent = path.join(team, "agents", "solution-designer");
    const skill = await writeSkill(path.join(agent, "skills", "solution-designer"), "solution-designer");
    await fs.mkdir(path.join(team, "shared"), { recursive: true });
    await fs.writeFile(path.join(team, "shared", "design-principles.md"), "PRINCIPLES-ORIGINAL");
    await fs.symlink("../../../../shared/design-principles.md", path.join(skill, "design-principles.md"));
    const resolver = new ConfiguredAgentSkillResolver({ loader: new SkillLoader(), isReadonlyPath: () => true,
      isSkillDisabled: () => false, logger: { warn: () => undefined } });
    const record: InstalledSkillRecord = { skill: new SkillLoader().loadSkill(skill, true), tier: 2, sourcePath: team };
    const bindings = resolver.resolveForAgent(new AgentDefinition({ name: "Solution Designer", description: "Design",
      instructions: "", skillNames: ["solution-designer"] }), (name) => name === "solution-designer" ? record : null);

    const capsule = await create(root, bindings, "fail");

    const linked = path.join(capsuleSkill(capsule.path, "solution-designer"), "design-principles.md");
    expect(await fs.readFile(linked, "utf8")).toBe("PRINCIPLES-ORIGINAL");
    // Linked, not snapshotted: the run sees later edits like Codex/Claude runs do.
    await fs.writeFile(path.join(team, "shared", "design-principles.md"), "PRINCIPLES-EDITED");
    expect(await fs.readFile(linked, "utf8")).toBe("PRINCIPLES-EDITED");
  });

  it("skips every unusable skill with a warning for an all-installed agent and links the rest", async () => {
    const root = await fixture();
    const good = await writeSkill(path.join(root.installed, "good-skill"), "good-skill");
    const vanished = path.join(root.installed, "vanished-skill");
    const noManifest = path.join(root.installed, "no-manifest");
    await fs.mkdir(noManifest);
    const owned = await writeSkill(path.join(root.installed, "owned-skill"), "owned-skill");
    await writeSkill(path.join(root.workspace, ".agents", "skills", "owned-skill"), "owned-skill");
    const caseCopy = await writeSkill(path.join(root.installed, "Good-Skill"), "Good-Skill");
    const unsafe = await writeSkill(path.join(root.installed, "unsafe"), "unsafe");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const capsule = await create(root, [
      resolved("good-skill", good), resolved("vanished-skill", vanished), resolved("no-manifest", noManifest),
      resolved("owned-skill", owned), resolved("Good-Skill", caseCopy), resolved("bad name TOKEN=secret", unsafe),
      { kind: "unresolved", name: "missing-skill" },
    ], "prefer_workspace", "chat-run");

    expect(capsule.manifest.skills.map((entry) => entry.name)).toEqual(["good-skill"]);
    expect(await fs.readdir(path.join(capsule.path, ".agents", "skills"))).toEqual(["good-skill"]);
    const lines = warning.mock.calls.map((call) => String(call[0]));
    const prefix = "AGY configured skill skipped: run=chat-run, agent=test-agent, skill=";
    expect(lines).toEqual([
      `${prefix}vanished-skill, disposition=skipped-unusable, reason=source_unavailable`,
      `${prefix}no-manifest, disposition=skipped-unusable, reason=missing_manifest`,
      `${prefix}owned-skill, disposition=skipped-workspace-owned, reason=workspace_owned`,
      `${prefix}Good-Skill, disposition=skipped-unusable, reason=duplicate_name`,
      `${prefix}[invalid-name], disposition=skipped-unusable, reason=unsafe_name`,
      `${prefix}missing-skill, disposition=skipped-missing`,
    ]);
    expect(lines.join(" ")).not.toContain(root.base);
    expect(lines.join(" ")).not.toContain("TOKEN=secret");
  });

  it.each([
    ["source_unavailable", "its folder no longer exists"],
    ["missing_manifest", "its folder has no SKILL.md"],
    ["workspace_owned", "the selected workspace already has a skill with this name"],
    ["duplicate_name", "another selected skill has the same name"],
    ["unsafe_name", "its name is not a valid skill folder name"],
  ] as const)("fails a named-skill run for %s with the skill and reason and removes the capsule", async (reason, text) => {
    const root = await fixture();
    const skill = await writeSkill(path.join(root.installed, "named-skill"), "named-skill");
    const bindings: ConfiguredAgentSkillBinding[] = [];
    let expectedName = "named-skill";
    if (reason === "source_unavailable") bindings.push(resolved("named-skill", path.join(root.installed, "gone")));
    if (reason === "missing_manifest") {
      await fs.rm(path.join(skill, "SKILL.md"));
      bindings.push(resolved("named-skill", skill));
    }
    if (reason === "workspace_owned") {
      await writeSkill(path.join(root.workspace, ".agents", "skills", "named-skill"), "named-skill");
      bindings.push(resolved("named-skill", skill));
    }
    if (reason === "duplicate_name") {
      const other = await writeSkill(path.join(root.installed, "Named-Skill"), "Named-Skill");
      bindings.push(resolved("named-skill", skill), resolved("Named-Skill", other));
      expectedName = "Named-Skill";
    }
    if (reason === "unsafe_name") {
      bindings.push(resolved("named skill", skill));
      expectedName = "named skill";
    }

    const failure = await create(root, bindings, "fail").catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(AgentCreationError);
    expect((failure as Error).message).toBe(`Antigravity could not use skill '${expectedName}': ${text}.`);
    expect((failure as Error).message).not.toContain(root.base);
    await expect(fs.stat(path.join(memoryDir(root, "run"), "agy-project"))).rejects.toMatchObject({ code: "ENOENT" });
    expect((await fs.stat(skill)).isDirectory()).toBe(true);
  });

  it("keeps the named-skill semantic skip for an unresolved binding", async () => {
    const root = await fixture();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const capsule = await create(root, [{ kind: "unresolved", name: "missing-skill" }], "fail");
    expect(capsule.manifest.skills).toEqual([]);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("skill=missing-skill, disposition=skipped-missing"));
  });

  it("leaves the skill source in place when capsule creation fails after linking", async () => {
    const root = await fixture();
    const skill = await writeSkill(path.join(root.installed, "linked-first"), "linked-first");
    await fs.writeFile(path.join(skill, "reference.md"), "KEEP");
    const failure = create(root, [resolved("linked-first", skill), resolved("gone", path.join(root.installed, "gone"))], "fail");
    await expect(failure).rejects.toBeInstanceOf(AgentCreationError);
    await expect(fs.stat(path.join(memoryDir(root, "run"), "agy-project"))).rejects.toMatchObject({ code: "ENOENT" });
    expect(await fs.readFile(path.join(skill, "reference.md"), "utf8")).toBe("KEEP");
    expect(await fs.readFile(path.join(skill, "SKILL.md"), "utf8")).toContain("# linked-first");
  });
});

const actualTeam = "/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team";
it.skipIf(!existsSync(path.join(actualTeam, "agents", "solution-designer", "skills", "solution-designer", "SKILL.md")))(
  "links the actual Solution Designer skill so its shared references stay readable", async () => {
    const root = await fixture();
    const actual = path.join(actualTeam, "agents", "solution-designer", "skills", "solution-designer");
    const capsule = await create(root, [resolved("solution-designer", actual)], "fail", "actual");
    // The shared design files are symlinks under the skill's references/ folder.
    for (const name of ["references/design-examples.md", "references/design-principles.md"]) {
      const target = path.join(capsuleSkill(capsule.path, "solution-designer"), name);
      expect(await fs.readFile(target)).toEqual(await fs.readFile(path.join(actual, name)));
    }
    expect(await fs.readdir(root.workspace)).toEqual([]);
  },
);
