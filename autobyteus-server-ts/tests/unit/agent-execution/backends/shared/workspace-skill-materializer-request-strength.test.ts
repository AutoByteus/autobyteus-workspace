import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceSkillMaterializer } from "../../../../../src/agent-execution/backends/shared/workspace-skill-materializer.js";
import type { SkillRequestStrength } from "../../../../../src/agent-execution/backends/shared/skill-request-strength.js";
import { Skill } from "../../../../../src/skills/domain/models.js";

// D-15: ALL_INSTALLED runs request workspace skill paths weakly; configured runs strongly.
const tempRoots: string[] = [];
const profile = { runtimeLabel: "Test", workspaceSkillsRootSegments: [".test", "skills"] };

const tempDir = async (prefix: string): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempRoots.push(root);
  return root;
};

/** Two sources of the same skill name, like an agent-private and a global `software-tutorial-video-maker`. */
const sameNamePair = async (name = "software-tutorial-video-maker") => {
  const root = await tempDir("skill-strength-sources-");
  const make = async (folder: string): Promise<Skill> => {
    const skillRoot = path.join(root, folder, name);
    await fs.mkdir(skillRoot, { recursive: true });
    await fs.writeFile(path.join(skillRoot, "SKILL.md"), `---\nname: ${name}\n---\n# ${folder}\n`, "utf8");
    return new Skill({ name, description: folder, content: `# ${folder}`, rootPath: skillRoot, fileCount: 1 });
  };
  return { configured: await make("agent-private"), installed: await make("global") };
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
  requestStrength: SkillRequestStrength, runId: string) =>
  materializer.materializeConfiguredWorkspaceSkills({ runId, workingDirectory: workspace,
    requests: [{ kind: "expose-resolved", skill }], skillAccessMode: SkillAccessMode.PRELOADED_ONLY, requestStrength });

const dispositions = (warn: ReturnType<typeof vi.fn>): string[] =>
  warn.mock.calls.map(([message]) => /disposition='([^']+)'/.exec(String(message))?.[1] ?? "");

describe("WorkspaceSkillMaterializer request strength (D-15)", () => {
  afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  describe("Rule 1: a user-owned workspace entry", () => {
    it.each(["file", "directory", "foreign-symlink"] as const)("an all-installed request skips a %s and leaves it untouched", async (kind) => {
      const { installed, configured } = await sameNamePair();
      const workspace = await tempDir("skill-strength-ws-");
      const owned = linkPath(workspace, installed.name);
      await fs.mkdir(path.dirname(owned), { recursive: true });
      if (kind === "file") await fs.writeFile(owned, "mine", "utf8");
      if (kind === "directory") await fs.mkdir(owned);
      if (kind === "foreign-symlink") await fs.symlink(configured.rootPath, owned, "dir");
      const warn = vi.fn();
      const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn } });

      await expect(acquire(materializer, workspace, installed, "all_installed", "chat-1")).resolves.toEqual([]);
      expect(dispositions(warn)).toEqual(["skipped-workspace-owned"]);
      expect(await isAbsent(owned)).toBe(false);
      if (kind === "file") expect(await fs.readFile(owned, "utf8")).toBe("mine");
      if (kind === "foreign-symlink") expect(await linkTarget(owned)).toBe(path.resolve(configured.rootPath));
    });

    it("a configured request still fails fast on a user-owned entry (V-D)", async () => {
      const { configured } = await sameNamePair();
      const workspace = await tempDir("skill-strength-ws-");
      await fs.mkdir(linkPath(workspace, configured.name), { recursive: true });
      const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn: vi.fn() } });

      await expect(acquire(materializer, workspace, configured, "configured", "agent-1")).rejects.toThrow(/already exists as a directory/);
    });

    it("joiners of one acquisition each apply their own strength", async () => {
      const { installed } = await sameNamePair();
      const workspace = await tempDir("skill-strength-ws-");
      await fs.mkdir(linkPath(workspace, installed.name), { recursive: true });
      const gate = deferred();
      const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn: vi.fn() }, fileSystem: {
        stat: async (...args: Parameters<typeof fs.stat>) => { await gate.promise; return fs.stat(...args); },
      } });

      const weak = acquire(materializer, workspace, installed, "all_installed", "chat-1");
      const strong = acquire(materializer, workspace, installed, "configured", "agent-1");
      gate.resolve();
      await expect(weak).resolves.toEqual([]);
      await expect(strong).rejects.toThrow(/Workspace skill path collision/);
    });
  });

  describe("Rule 2: a path held by another live run", () => {
    it("Direction A: an all-installed request skips a path a configured run holds (V-A)", async () => {
      const { configured, installed } = await sameNamePair();
      const workspace = await tempDir("skill-strength-ws-");
      const warn = vi.fn();
      const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn } });
      const held = await acquire(materializer, workspace, configured, "configured", "agent-1");

      await expect(acquire(materializer, workspace, installed, "all_installed", "chat-1")).resolves.toEqual([]);
      expect(dispositions(warn)).toEqual(["skipped-held-by-other-run"]);
      expect(String(warn.mock.calls[0]![0])).toContain(`previousTarget='${path.resolve(configured.rootPath)}'`);
      expect(await linkTarget(held[0]!.materializedRootPath)).toBe(path.resolve(configured.rootPath));
    });

    it("Direction A also applies between two all-installed runs with different sources", async () => {
      const { configured, installed } = await sameNamePair();
      const workspace = await tempDir("skill-strength-ws-");
      const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn: vi.fn() } });
      await acquire(materializer, workspace, installed, "all_installed", "chat-1");

      await expect(acquire(materializer, workspace, configured, "all_installed", "chat-2")).resolves.toEqual([]);
      expect(await linkTarget(linkPath(workspace, installed.name))).toBe(path.resolve(installed.rootPath));
    });

    it("Direction B: a configured request re-points a path held only by all-installed runs (V-B)", async () => {
      const { configured, installed } = await sameNamePair();
      const workspace = await tempDir("skill-strength-ws-");
      const warn = vi.fn();
      const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn } });
      await acquire(materializer, workspace, installed, "all_installed", "chat-1");
      await acquire(materializer, workspace, installed, "all_installed", "chat-2");

      const strong = await acquire(materializer, workspace, configured, "configured", "agent-1");

      expect(strong).toHaveLength(1);
      expect(await linkTarget(linkPath(workspace, configured.name))).toBe(path.resolve(configured.rootPath));
      const message = String(warn.mock.calls.find(([m]) => String(m).includes("yielded-to-configured"))?.[0]);
      expect(message).toContain(`previousTarget='${path.resolve(installed.rootPath)}'`);
      expect(message).toContain(`currentSource='${path.resolve(configured.rootPath)}'`);
      expect(message).toContain("yieldingRuns='chat-1,chat-2'");
      expect((await fs.readdir(path.dirname(linkPath(workspace, configured.name)))).sort()).toEqual([configured.name]);
    });

    it("Direction B waits for an all-installed acquisition in progress, then re-points", async () => {
      const { configured, installed } = await sameNamePair();
      const workspace = await tempDir("skill-strength-ws-");
      const gate = deferred();
      const entered = deferred();
      let gated = false;
      const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn: vi.fn() }, fileSystem: {
        symlink: async (...args: Parameters<typeof fs.symlink>) => {
          if (!gated) { gated = true; entered.resolve(); await gate.promise; }
          return fs.symlink(...args);
        },
      } });

      const weak = acquire(materializer, workspace, installed, "all_installed", "chat-1");
      await entered.promise;
      const strong = acquire(materializer, workspace, configured, "configured", "agent-1");
      gate.resolve();
      await expect(weak).resolves.toHaveLength(1);
      await expect(strong).resolves.toHaveLength(1);
      expect(await linkTarget(linkPath(workspace, configured.name))).toBe(path.resolve(configured.rootPath));
    });

    it("two configured runs with different sources still fail fast (V-C)", async () => {
      const { configured, installed } = await sameNamePair();
      const workspace = await tempDir("skill-strength-ws-");
      const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn: vi.fn() } });
      await acquire(materializer, workspace, configured, "configured", "agent-1");

      await expect(acquire(materializer, workspace, installed, "configured", "agent-2"))
        .rejects.toThrow(/is being materialized from/);
    });

    it("a configured request fails fast when the path also has a configured holder of the weak source", async () => {
      const { configured, installed } = await sameNamePair();
      const workspace = await tempDir("skill-strength-ws-");
      const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn: vi.fn() } });
      await acquire(materializer, workspace, installed, "all_installed", "chat-1");
      await acquire(materializer, workspace, installed, "configured", "agent-installed");

      await expect(acquire(materializer, workspace, configured, "configured", "agent-1"))
        .rejects.toThrow(/is being materialized from/);
      expect(await linkTarget(linkPath(workspace, installed.name))).toBe(path.resolve(installed.rootPath));
    });

    it("an unavailable configured source leaves the all-installed holders untouched", async () => {
      const { configured, installed } = await sameNamePair();
      const workspace = await tempDir("skill-strength-ws-");
      const warn = vi.fn();
      const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn } });
      const weak = await acquire(materializer, workspace, installed, "all_installed", "chat-1");
      await fs.rm(path.join(configured.rootPath, "SKILL.md"));

      await expect(acquire(materializer, workspace, configured, "configured", "agent-1")).resolves.toEqual([]);
      expect(await linkTarget(linkPath(workspace, installed.name))).toBe(path.resolve(installed.rootPath));
      await materializer.cleanupMaterializedWorkspaceSkills(weak);
      expect(await isAbsent(linkPath(workspace, installed.name))).toBe(true);
    });
  });

  describe("Rule 3: an unresolved request meets a link held by other runs", () => {
    const unresolved = (materializer: WorkspaceSkillMaterializer, workspace: string, name: string, runId: string) =>
      materializer.materializeConfiguredWorkspaceSkills({ runId, workingDirectory: workspace,
        requests: [{ kind: "reconcile-unresolved", name }], skillAccessMode: SkillAccessMode.PRELOADED_ONLY, requestStrength: "configured" })

    it("skips without joining a link held only by all-installed runs (V-F unit)", async () => {
      const { installed } = await sameNamePair()
      const workspace = await tempDir("skill-strength-ws-")
      const warn = vi.fn()
      const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn } })
      const weak = await acquire(materializer, workspace, installed, "all_installed", "chat-1")

      await expect(unresolved(materializer, workspace, installed.name, "team-member-1")).resolves.toEqual([])
      expect(dispositions(warn)).toEqual(["skipped-unresolved-held-by-weak"])
      expect(String(warn.mock.calls[0]![0])).toContain(`previousTarget='${path.resolve(installed.rootPath)}'`)
      const link = linkPath(workspace, installed.name)
      expect(await linkTarget(link)).toBe(path.resolve(installed.rootPath))

      // It did not join: the link goes with the last weak holder.
      await materializer.cleanupMaterializedWorkspaceSkills(weak)
      expect(await isAbsent(link)).toBe(true)
    })

    it("still fails fast next to a configured holder", async () => {
      const { configured } = await sameNamePair()
      const workspace = await tempDir("skill-strength-ws-")
      const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn: vi.fn() } })
      await acquire(materializer, workspace, configured, "configured", "agent-1")

      await expect(unresolved(materializer, workspace, configured.name, "agent-2")).rejects.toThrow(/Workspace skill path collision/)
    })
  })

  describe("IC-1: release after a re-point (V-E)", () => {
    it.each([["weak first"], ["configured first"]])("removes the link and empties the registry once every holder released (%s)", async (order) => {
      const { configured, installed } = await sameNamePair();
      const workspace = await tempDir("skill-strength-ws-");
      const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn: vi.fn() } });
      const weak = await acquire(materializer, workspace, installed, "all_installed", "chat-1");
      const strong = await acquire(materializer, workspace, configured, "configured", "agent-1");
      const link = linkPath(workspace, configured.name);
      // The weak holder's descriptor is stale: it still names the installed source.
      expect(weak[0]!.sourceRootPath).toBe(path.resolve(installed.rootPath));

      const [firstRelease, secondRelease] = order === "weak first" ? [weak, strong] : [strong, weak];
      await materializer.cleanupMaterializedWorkspaceSkills(firstRelease);
      expect(await linkTarget(link)).toBe(path.resolve(configured.rootPath));
      await materializer.cleanupMaterializedWorkspaceSkills(secondRelease);
      expect(await isAbsent(link)).toBe(true);

      // An empty registry: a fresh all-installed run claims the path instead of skipping it.
      await expect(acquire(materializer, workspace, installed, "all_installed", "chat-2")).resolves.toHaveLength(1);
      expect(await linkTarget(link)).toBe(path.resolve(installed.rootPath));
    });

    it("a repeated release of the same holder is a no-op", async () => {
      const { installed } = await sameNamePair();
      const workspace = await tempDir("skill-strength-ws-");
      const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn: vi.fn() } });
      const first = await acquire(materializer, workspace, installed, "all_installed", "chat-1");
      const second = await acquire(materializer, workspace, installed, "all_installed", "chat-2");

      await materializer.cleanupMaterializedWorkspaceSkills(first);
      await materializer.cleanupMaterializedWorkspaceSkills(first);
      expect(await isAbsent(linkPath(workspace, installed.name))).toBe(false);
      await materializer.cleanupMaterializedWorkspaceSkills(second);
      expect(await isAbsent(linkPath(workspace, installed.name))).toBe(true);
    });
  });

  describe("IC-2: re-point where rename over a directory link is unsupported", () => {
    it.each(["EPERM", "EEXIST"])("falls back to unlink + link on %s and leaves no temporary link", async (code) => {
      const { configured, installed } = await sameNamePair();
      const workspace = await tempDir("skill-strength-ws-");
      const rename = vi.fn(async () => { throw Object.assign(new Error(`simulated ${code}`), { code }); });
      const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn: vi.fn() }, fileSystem: { rename } });
      await acquire(materializer, workspace, installed, "all_installed", "chat-1");

      await expect(acquire(materializer, workspace, configured, "configured", "agent-1")).resolves.toHaveLength(1);
      expect(rename).toHaveBeenCalledTimes(1);
      const link = linkPath(workspace, configured.name);
      expect(await linkTarget(link)).toBe(path.resolve(configured.rootPath));
      expect((await fs.readdir(path.dirname(link))).sort()).toEqual([configured.name]);
    });

    it("keeps the previous source and rethrows when the rename fails for another reason", async () => {
      const { configured, installed } = await sameNamePair();
      const workspace = await tempDir("skill-strength-ws-");
      const rename = vi.fn(async () => { throw Object.assign(new Error("simulated EIO"), { code: "EIO" }); });
      const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn: vi.fn() }, fileSystem: { rename } });
      const weak = await acquire(materializer, workspace, installed, "all_installed", "chat-1");

      await expect(acquire(materializer, workspace, configured, "configured", "agent-1")).rejects.toThrow("simulated EIO");
      const link = linkPath(workspace, installed.name);
      expect(await linkTarget(link)).toBe(path.resolve(installed.rootPath));
      await materializer.cleanupMaterializedWorkspaceSkills(weak);
      expect(await isAbsent(link)).toBe(true);
    });
  });
});
