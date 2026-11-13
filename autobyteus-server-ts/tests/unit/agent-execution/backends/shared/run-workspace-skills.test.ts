/**
 * `RunWorkspaceSkills` (autobyteus-460, design DS-003): the single holder of one run's workspace skill links from
 * preparation to release, with mid-run adds. Driven against the real `WorkspaceSkillMaterializer` and real links in a
 * test-owned workspace; a gate on the materializer's `symlink` holds an add in flight.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentDefinition } from "../../../../../src/agent-definition/domain/models.js";
import {
  exposedWorkspaceSkillRequests,
  planExposedWorkspaceSkillRequests,
  RunWorkspaceSkills,
  type WorkspaceSkillRequestPlanner,
} from "../../../../../src/agent-execution/backends/shared/run-workspace-skills.js";
import { WorkspaceSkillMaterializer } from "../../../../../src/agent-execution/backends/shared/workspace-skill-materializer.js";
import type { ConfiguredAgentSkillBinding } from "../../../../../src/skills/domain/configured-agent-skill-binding.js";
import { Skill } from "../../../../../src/skills/domain/models.js";

const PROFILE = { runtimeLabel: "Test runtime", workspaceSkillsRootSegments: [".test", "skills"] };

let root: string;
let workspace: string;
const catalog = new Map<string, Skill>();

beforeEach(async () => {
  root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "run-workspace-skills-")));
  workspace = path.join(root, "workspace");
  await fs.mkdir(workspace);
  catalog.clear();
  for (const name of ["code-review", "deep-research", "reflection"]) {
    const rootPath = path.join(root, "catalog", name);
    await fs.mkdir(rootPath, { recursive: true });
    await fs.writeFile(path.join(rootPath, "SKILL.md"), `---\nname: ${name}\ndescription: ${name}\n---\n`);
    catalog.set(name, new Skill({ name, description: name, content: name, rootPath }));
  }
});
afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(root, { recursive: true, force: true });
});

const definition = (...skillNames: string[]) => ({ id: "def", skillNames }) as unknown as AgentDefinition;
const skillService = {
  resolveConfiguredSkillBindingsForAgent: (value: AgentDefinition | null | undefined): ConfiguredAgentSkillBinding[] =>
    ((value?.skillNames ?? []) as string[]).map((name) => {
      const skill = catalog.get(name);
      return skill ? { kind: "resolved" as const, skill } : { kind: "unresolved" as const, name };
    }),
  resolveSkillScope: () => "CONFIGURED" as const,
};
const link = (name: string) => path.join(workspace, ".test", "skills", name);
const exists = async (target: string) => fs.lstat(target).then(() => true, () => false);

/** A materializer whose `symlink` waits while the gate is closed (an add held in flight). */
const createMaterializer = () => {
  let release: (() => void) | null = null;
  let gate: Promise<void> | null = null;
  const waiting = vi.fn();
  const materializer = new WorkspaceSkillMaterializer(PROFILE, {
    logger: { warn: () => undefined },
    fileSystem: {
      symlink: async (...args: Parameters<typeof fs.symlink>) => {
        if (gate) { waiting(); await gate; }
        return fs.symlink(...args);
      },
    },
  });
  return {
    materializer,
    waiting,
    close: () => { gate = new Promise<void>((resolve) => { release = resolve; }); },
    open: () => { gate = null; release?.(); },
  };
};

const createHolder = (input: {
  materializer: WorkspaceSkillMaterializer;
  runId?: string;
  planRequests?: WorkspaceSkillRequestPlanner;
  logger?: { warn: (...args: unknown[]) => void };
}) => new RunWorkspaceSkills({
  runId: input.runId ?? "run-a",
  materializer: input.materializer,
  skillService,
  planRequests: input.planRequests ?? planExposedWorkspaceSkillRequests,
  logger: input.logger ?? { warn: () => undefined },
});

const prepare = async (holder: RunWorkspaceSkills, ...skillNames: string[]) =>
  holder.acquire({
    workingDirectory: workspace,
    requests: exposedWorkspaceSkillRequests(skillService.resolveConfiguredSkillBindingsForAgent(definition(...skillNames))),
    workspaceCollisionPolicy: "fail",
    assertPreparing: () => undefined,
  });

describe("RunWorkspaceSkills", () => {
  it("holds the preparation's links; an add for the definition it was prepared with does nothing", async () => {
    const { materializer } = createMaterializer();
    const materialize = vi.spyOn(materializer, "materializeConfiguredWorkspaceSkills");
    const holder = createHolder({ materializer });

    await prepare(holder, "code-review");
    expect(holder.hasSkills()).toBe(true);
    expect(await fs.realpath(link("code-review"))).toBe(catalog.get("code-review")!.rootPath);

    await holder.addFrom(definition("code-review"));
    expect(materialize).toHaveBeenCalledOnce();
    await holder.release();
    expect(await exists(link("code-review"))).toBe(false);
  });

  it("AC-011/AC-012: links a skill added mid-run, one name per acquisition, and releases it with the run", async () => {
    const { materializer } = createMaterializer();
    const materialize = vi.spyOn(materializer, "materializeConfiguredWorkspaceSkills");
    const holder = createHolder({ materializer });
    await prepare(holder);
    expect(holder.hasSkills()).toBe(false); // a run that started with no skills (AR-003)

    await holder.addFrom(definition("deep-research", "reflection", "not-installed"));

    expect(await fs.realpath(link("deep-research"))).toBe(catalog.get("deep-research")!.rootPath);
    expect(await fs.realpath(link("reflection"))).toBe(catalog.get("reflection")!.rootPath);
    expect(holder.hasSkills()).toBe(true);
    // One call per added name after the preparation's; an unresolved name is not reconciled mid-run.
    expect(materialize.mock.calls.slice(1).map(([request]) => request.requests)).toEqual([
      [{ kind: "expose-resolved", skill: catalog.get("deep-research") }],
      [{ kind: "expose-resolved", skill: catalog.get("reflection") }],
    ]);

    await holder.addFrom(definition("deep-research", "reflection"));
    expect(materialize).toHaveBeenCalledTimes(3); // applied: nothing again
    await holder.release();
    expect(await exists(link("deep-research"))).toBe(false);
    expect(await exists(link("reflection"))).toBe(false);
  });

  it("AR-002: a name that cannot be linked is logged and does not stop the others; the next add tries it again", async () => {
    const { materializer } = createMaterializer();
    const warn = vi.fn();
    const holder = createHolder({ materializer, logger: { warn } });
    await prepare(holder);
    // A user-owned folder with the name of a configured skill (Rule 1: a configured skill refuses it).
    await fs.mkdir(link("deep-research"), { recursive: true });
    await fs.writeFile(path.join(link("deep-research"), "SKILL.md"), "the user's own");

    await holder.addFrom(definition("deep-research", "reflection"));

    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0]![0])).toMatch(/^RUN_WORKSPACE_SKILL_ADD_FAILED: run=run-a, skill=deep-research: .*collision/);
    expect(await fs.realpath(link("reflection"))).toBe(catalog.get("reflection")!.rootPath);
    expect(await fs.readFile(path.join(link("deep-research"), "SKILL.md"), "utf8")).toBe("the user's own");

    // The user removes their folder; the next add for this run links it.
    await fs.rm(link("deep-research"), { recursive: true });
    await holder.addFrom(definition("deep-research", "reflection"));
    expect(await fs.realpath(link("deep-research"))).toBe(catalog.get("deep-research")!.rootPath);
    await holder.release();
    expect(await exists(link("deep-research"))).toBe(false);
  });

  it("AR-001: a release during an add in flight waits for it; the add's link and holder are rolled back", async () => {
    const gated = createMaterializer();
    const holder = createHolder({ materializer: gated.materializer });
    await prepare(holder, "code-review");
    gated.close();

    const adding = holder.addFrom(definition("code-review", "deep-research"));
    await vi.waitFor(() => expect(gated.waiting).toHaveBeenCalledOnce()); // the holder is registered, the link not yet made
    let released = false;
    const releasing = holder.release().then(() => { released = true; });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(released).toBe(false); // waits for the add in flight
    gated.open();
    await Promise.all([adding, releasing]);

    expect(await exists(link("deep-research"))).toBe(false);
    expect(await exists(link("code-review"))).toBe(false);
    // No holder was left behind: another run's link of the same skill is removed at its own release.
    const other = createHolder({ materializer: gated.materializer, runId: "run-b" });
    await prepare(other, "deep-research");
    expect(await exists(link("deep-research"))).toBe(true);
    await other.release();
    expect(await exists(link("deep-research"))).toBe(false);
  });

  it("AR-001: a managed (GitHub source) skill whose holder is published after the release began is never left linked", async () => {
    // The managed path checks the source's SKILL.md before it swaps the link and publishes its holder: the window in
    // which a guard on "the run is active" let a link outlive its run.
    const managed = new Skill({ name: "github-integration", description: "managed", content: "", rootPath: path.join(root, "generations", "g1") });
    managed.managedSource = { sourceId: "github:source", generation: "g1" };
    await fs.mkdir(managed.rootPath, { recursive: true });
    await fs.writeFile(path.join(managed.rootPath, "SKILL.md"), "---\nname: github-integration\ndescription: managed\n---\n");
    catalog.set("github-integration", managed);
    let gate: Promise<void> | null = null;
    let openGate!: () => void;
    const checking = vi.fn();
    const materializer = new WorkspaceSkillMaterializer(PROFILE, {
      logger: { warn: () => undefined },
      resolveManagedSkill: (sourceId, name) => (sourceId === "github:source" && name === "github-integration" ? managed : null),
      fileSystem: {
        stat: (async (target: Parameters<typeof fs.stat>[0]) => {
          if (gate && String(target) === path.join(managed.rootPath, "SKILL.md")) { checking(); await gate; }
          return fs.stat(target);
        }) as typeof fs.stat,
      },
    });
    const holder = createHolder({ materializer });
    await prepare(holder);
    gate = new Promise<void>((resolve) => { openGate = resolve; });

    const adding = holder.addFrom(definition("github-integration"));
    await vi.waitFor(() => expect(checking).toHaveBeenCalledOnce());
    const releasing = holder.release();
    gate = null;
    openGate();
    await Promise.all([adding, releasing]);

    expect(await exists(link("github-integration"))).toBe(false);
  });

  it("adds run one after another, and an add queued behind a release does nothing", async () => {
    const gated = createMaterializer();
    const materialize = vi.spyOn(gated.materializer, "materializeConfiguredWorkspaceSkills");
    const holder = createHolder({ materializer: gated.materializer });
    await prepare(holder);
    gated.close();

    const first = holder.addFrom(definition("deep-research"));
    const second = holder.addFrom(definition("deep-research", "reflection"));
    await vi.waitFor(() => expect(gated.waiting).toHaveBeenCalledOnce());
    expect(materialize).toHaveBeenCalledTimes(2); // the preparation's and the first add's only
    gated.open();
    await Promise.all([first, second]);
    expect(materialize).toHaveBeenCalledTimes(3); // the second add linked only the name the first did not
    expect(await exists(link("reflection"))).toBe(true);

    const releasing = holder.release();
    const late = holder.addFrom(definition("deep-research", "reflection", "code-review"));
    await Promise.all([releasing, late]);
    expect(materialize).toHaveBeenCalledTimes(3);
    expect(await exists(link("code-review"))).toBe(false);
  });

  it("a release during the planning request (Codex `skills/list`) links nothing", async () => {
    const { materializer } = createMaterializer();
    const materialize = vi.spyOn(materializer, "materializeConfiguredWorkspaceSkills");
    let answer!: () => void;
    const planned = new Promise<void>((resolve) => { answer = resolve; });
    const planRequests: WorkspaceSkillRequestPlanner = async (input) => {
      await planned; // the app server answers after the release started
      input.assertAccepting();
      return exposedWorkspaceSkillRequests(input.bindings);
    };
    const holder = createHolder({ materializer, planRequests });
    await prepare(holder);

    const adding = holder.addFrom(definition("deep-research"));
    const releasing = holder.release();
    answer();
    await Promise.all([adding, releasing]);

    expect(materialize).toHaveBeenCalledOnce(); // the preparation's only
    expect(await exists(link("deep-research"))).toBe(false);
  });

  it("a failed release can be retried; the run stays closed to new links", async () => {
    const { materializer } = createMaterializer();
    const holder = createHolder({ materializer });
    await prepare(holder, "code-review");
    const cleanup = vi.spyOn(materializer, "cleanupMaterializedWorkspaceSkills")
      .mockRejectedValueOnce(new Error("release failed"));

    await expect(holder.release()).rejects.toThrow("release failed");
    await holder.addFrom(definition("code-review", "deep-research"));
    expect(await exists(link("deep-research"))).toBe(false);

    await holder.release();
    expect(cleanup).toHaveBeenCalledTimes(2);
    expect(await exists(link("code-review"))).toBe(false);
    await holder.release(); // idempotent once released
    expect(cleanup).toHaveBeenCalledTimes(2);
  });

  it("a preparation of a released holder is refused", async () => {
    const { materializer } = createMaterializer();
    const holder = createHolder({ materializer });
    await holder.release();
    await expect(prepare(holder, "code-review")).rejects.toThrow("The run's workspace skills were released.");
    expect(await exists(link("code-review"))).toBe(false);
  });
});
