import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceSkillMaterializer } from "../../../../../src/agent-execution/backends/shared/workspace-skill-materializer.js";
import type { WorkspaceCollisionPolicy } from "../../../../../src/agent-execution/backends/shared/workspace-skill-collision-policy.js";
import { Skill } from "../../../../../src/skills/domain/models.js";

// D-15 Rule 1 (kept by D-19): ALL_INSTALLED runs prefer a user-owned workspace entry; configured runs fail.
const tempRoots: string[] = [];
const profile = { runtimeLabel: "Test", workspaceSkillsRootSegments: [".test", "skills"] };

const tempDir = async (prefix: string): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempRoots.push(root);
  return root;
};

const makeSkill = async (root: string, folder: string, name = "desk-alpha"): Promise<Skill> => {
  const skillRoot = path.join(root, folder, name);
  await fs.mkdir(skillRoot, { recursive: true });
  await fs.writeFile(path.join(skillRoot, "SKILL.md"), `---\nname: ${name}\n---\n# ${folder}\n`, "utf8");
  return new Skill({ name, description: folder, content: `# ${folder}`, rootPath: skillRoot, fileCount: 1 });
};

const linkPath = (workspace: string, name: string): string => path.join(workspace, ".test", "skills", name);
const linkTarget = async (link: string): Promise<string> => path.resolve(path.dirname(link), await fs.readlink(link));
const isAbsent = async (target: string): Promise<boolean> => {
  try { await fs.lstat(target); return false; } catch (error) { return (error as NodeJS.ErrnoException).code === "ENOENT"; }
};
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};

const acquire = (materializer: WorkspaceSkillMaterializer, workspace: string, skill: Skill,
  workspaceCollisionPolicy: WorkspaceCollisionPolicy, runId: string) =>
  materializer.materializeConfiguredWorkspaceSkills({ runId, workingDirectory: workspace,
    requests: [{ kind: "expose-resolved", skill }], workspaceCollisionPolicy });

const dispositions = (warn: ReturnType<typeof vi.fn>): string[] =>
  warn.mock.calls.map(([message]) => /disposition='([^']+)'/.exec(String(message))?.[1] ?? "");

describe("WorkspaceSkillMaterializer workspace collision policy", () => {
  afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  describe("Rule 1: a user-owned workspace entry", () => {
    it.each(["file", "directory", "foreign-symlink"] as const)("prefer_workspace skips a %s and leaves it untouched", async (kind) => {
      const sources = await tempDir("skill-policy-sources-");
      const installed = await makeSkill(sources, "installed");
      const other = await makeSkill(sources, "other");
      const workspace = await tempDir("skill-policy-ws-");
      const owned = linkPath(workspace, installed.name);
      await fs.mkdir(path.dirname(owned), { recursive: true });
      if (kind === "file") await fs.writeFile(owned, "mine", "utf8");
      if (kind === "directory") await fs.mkdir(owned);
      if (kind === "foreign-symlink") await fs.symlink(other.rootPath, owned, "dir");
      const warn = vi.fn();
      const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn } });

      await expect(acquire(materializer, workspace, installed, "prefer_workspace", "chat-1")).resolves.toEqual([]);
      expect(dispositions(warn)).toEqual(["skipped-workspace-owned"]);
      expect(await isAbsent(owned)).toBe(false);
      if (kind === "file") expect(await fs.readFile(owned, "utf8")).toBe("mine");
      if (kind === "foreign-symlink") expect(await linkTarget(owned)).toBe(path.resolve(other.rootPath));
    });

    it("fail keeps the path collision error on a user-owned entry (V-D)", async () => {
      const configured = await makeSkill(await tempDir("skill-policy-sources-"), "configured");
      const workspace = await tempDir("skill-policy-ws-");
      await fs.mkdir(linkPath(workspace, configured.name), { recursive: true });
      const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn: vi.fn() } });

      await expect(acquire(materializer, workspace, configured, "fail", "agent-1")).rejects.toThrow(/already exists as a directory/);
    });

    it("joiners of one acquisition each apply their own policy", async () => {
      const installed = await makeSkill(await tempDir("skill-policy-sources-"), "installed");
      const workspace = await tempDir("skill-policy-ws-");
      await fs.mkdir(linkPath(workspace, installed.name), { recursive: true });
      const gate = deferred();
      const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn: vi.fn() }, fileSystem: {
        stat: async (...args: Parameters<typeof fs.stat>) => { await gate.promise; return fs.stat(...args); },
      } });

      const preferring = acquire(materializer, workspace, installed, "prefer_workspace", "chat-1");
      const failing = acquire(materializer, workspace, installed, "fail", "agent-1");
      gate.resolve();
      await expect(preferring).resolves.toEqual([]);
      await expect(failing).rejects.toThrow(/Workspace skill path collision/);
    });
  });

  describe("one skill per name (D-19)", () => {
    it("an all-installed chat and a configured agent share the catalog copy; the link goes after both release", async () => {
      const catalogCopy = await makeSkill(await tempDir("skill-policy-sources-"), "desk-helper");
      const workspace = await tempDir("skill-policy-ws-");
      const warn = vi.fn();
      const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn } });

      const chat = await acquire(materializer, workspace, catalogCopy, "prefer_workspace", "daily-assistant");
      const lead = await acquire(materializer, workspace, catalogCopy, "fail", "desk-lead");
      expect(await linkTarget(linkPath(workspace, catalogCopy.name))).toBe(path.resolve(catalogCopy.rootPath));
      expect(warn).not.toHaveBeenCalled();

      await materializer.cleanupMaterializedWorkspaceSkills(chat);
      expect(await isAbsent(linkPath(workspace, catalogCopy.name))).toBe(false);
      await materializer.cleanupMaterializedWorkspaceSkills(lead);
      await materializer.cleanupMaterializedWorkspaceSkills(lead);
      expect(await isAbsent(linkPath(workspace, catalogCopy.name))).toBe(true);
    });

    it.each(["prefer_workspace", "fail"] as const)("a different source for a live path fails fast (%s; out-of-band catalog change)", async (policy) => {
      const sources = await tempDir("skill-policy-sources-");
      const before = await makeSkill(sources, "before");
      const after = await makeSkill(sources, "after");
      const workspace = await tempDir("skill-policy-ws-");
      const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn: vi.fn() } });
      await acquire(materializer, workspace, before, "prefer_workspace", "chat-1");

      await expect(acquire(materializer, workspace, after, policy, "agent-1"))
        .rejects.toThrow(/is being materialized from '.*before.*' instead of '.*after.*'/);
      expect(await linkTarget(linkPath(workspace, before.name))).toBe(path.resolve(before.rootPath));
    });
  });
});
