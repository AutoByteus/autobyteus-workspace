import { existsSync, mkdirSync, readdirSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { readPlatformInputPreface } from "autobyteus-ts/agent/message/platform-input-preface-metadata.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentRunActivationKind } from "../../../src/agent-execution/domain/agent-run-lifecycle-observer.js";
import type { AgentRunInputPreface } from "../../../src/agent-execution/domain/agent-run-input-preface.js";
import type { AgentRunBackendInputDispatch, AgentRunInputLifecycle } from "../../../src/agent-execution/input/agent-run-input-contract.js";
import { SKILL_UPDATE_NOTICE_SENDER_ID } from "../../../src/agent-execution/domain/system-task-notification-senders.js";
import { SkillFolderWatcher, type SkillFolderWatchFactory } from "../../../src/skill-update-notices/monitor/skill-folder-watcher.js";
import { SEEN_SKILL_VERSIONS_FILE_NAME, SeenSkillVersionsStore } from "../../../src/skill-update-notices/providers/seen-skill-versions-store.js";
import { SkillFolderSnapshotter } from "../../../src/skill-update-notices/providers/skill-folder-snapshotter.js";
import { RunSkillTracker } from "../../../src/skill-update-notices/services/run-skill-tracker.js";
import { SkillUpdateNoticeService } from "../../../src/skill-update-notices/services/skill-update-notice-service.js";
import { createSkillUpdateNotices, type SkillUpdateNotices } from "../../../src/skill-update-notices/skill-update-notices.js";

// DS-002 / DS-003 with real skill folders, the real snapshotter, tracker and seen-versions store,
// and fake runs. Folder changes are fed to the service as the watcher reports them (settled);
// one test runs the real chokidar watcher end to end.

type PostBehavior = "forwarded" | "failed" | "rejected";

const tempDirs: string[] = [];
const subsystems: SkillUpdateNotices[] = [];
afterEach(async () => {
  await Promise.all(subsystems.splice(0).map((subsystem) => subsystem.close()));
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

const write = async (filePath: string, content: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
};

const createWorld = async () => {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "skill-notice-int-")));
  tempDirs.push(root);
  const skillsRoot = path.join(root, "skills");
  /** Agent definitions (id → configured skill names) and the installed skills catalog (name → folder). */
  const definitions = new Map<string, readonly string[]>();
  const catalog = new Map<string, string>();
  const createSkill = async (name: string, files: Record<string, string> = { "SKILL.md": `# ${name} v1` }, base = skillsRoot) => {
    const dir = path.join(base, name);
    for (const [file, content] of Object.entries(files)) await write(path.join(dir, file), content);
    return dir;
  };
  const install = (name: string, dir: string) => { catalog.set(name, dir); };
  const uninstall = (name: string) => { catalog.delete(name); };
  const defineAgent = (definitionId: string, skillNames: readonly string[]) => { definitions.set(definitionId, [...skillNames]); };
  const deleteAgent = (definitionId: string) => { definitions.delete(definitionId); };
  /** Defines the agent with these skills and installs them. */
  const useSkills = (definitionId: string, skills: Record<string, string>) => {
    defineAgent(definitionId, Object.keys(skills));
    for (const [name, dir] of Object.entries(skills)) install(name, dir);
  };
  /** One watch per skill folder: which folders were watched, and which of those watches are open. */
  const watches = { created: [] as string[], open: new Set<string>() };
  const createWatch: SkillFolderWatchFactory = (dir) => {
    watches.created.push(dir);
    watches.open.add(dir);
    return { on: () => undefined, close: async () => { watches.open.delete(dir); } };
  };
  /** Every definition read by ID, in order. */
  const definitionReads: string[] = [];
  /** The agent definition change signal (every save fires it). */
  const definitionListeners = new Set<() => void>();
  /** Integration names an added skill grants that a run does not hold (by skill name). */
  const integrationsBySkill = new Map<string, string[]>();
  const integrationRunAccess = {
    integrationsStartingOnRestart: vi.fn(async (_run: { runId: string }, skillNames: readonly string[]) =>
      skillNames.flatMap((name) => integrationsBySkill.get(name) ?? [])),
  };
  const subsystem = createSkillUpdateNotices({
    // A copy of the definition as it is now (null once deleted), as the definition service returns.
    agentDefinitionService: { getAgentDefinitionById: async (id: string) => {
      definitionReads.push(id);
      const skillNames = definitions.get(id);
      return (skillNames ? { id, skillNames: [...skillNames] } : null) as never;
    } },
    definitionChanges: { subscribe: (listener) => {
      definitionListeners.add(listener);
      return () => { definitionListeners.delete(listener); };
    } },
    integrationRunAccess,
    // Resolves a definition's configured names through the catalog as it is now.
    skillService: {
      resolveConfiguredSkillsForAgent: (definition: { skillNames: string[] } | null) =>
        (definition?.skillNames ?? []).flatMap((name) => {
          const rootPath = catalog.get(name);
          return rootPath ? [{ name, rootPath, description: `The ${name} skill.` }] : [];
        }) as never,
    },
    createWatch,
  });
  subsystems.push(subsystem);
  /** Saves the agent definition (as the agents page does): the signal fires; resolves once the pass is done. */
  const saveAgent = async (definitionId: string, skillNames: readonly string[] | null) => {
    if (skillNames) defineAgent(definitionId, skillNames);
    else deleteAgent(definitionId);
    for (const listener of definitionListeners) listener();
    await subsystem.service.onDefinitionsChanged();
  };
  return {
    root, skillsRoot, createSkill, useSkills, install, uninstall, defineAgent, deleteAgent, saveAgent,
    subsystem, service: subsystem.service, watches, integrationRunAccess, integrationsBySkill, definitionReads,
    signalListenerCount: () => definitionListeners.size,
  };
};

/** A fake run: status, agent-message posting with a chosen outcome, and published events. */
const createRun = (world: Awaited<ReturnType<typeof createWorld>>, options: {
  runId: string;
  definitionId: string;
  memoryDir?: string | null;
}) => {
  const state = { status: "idle" as string, post: "forwarded" as PostBehavior, turn: 0, active: true };
  /** What happened, in order: a skill set up on the runtime ("setup"), a notice posted ("posted"). */
  const order: string[] = [];
  const posted: AgentInputUserMessage[] = [];
  const published: AgentRunEvent[] = [];
  const memoryDir = options.memoryDir === undefined ? path.join(world.root, "memory", options.runId) : options.memoryDir;
  // The platform creates a run's memory folder; the notice subsystem never does.
  if (memoryDir) mkdirSync(memoryDir, { recursive: true });
  const run = {
    runId: options.runId,
    config: { agentDefinitionId: options.definitionId, memoryDir },
    getStatusSnapshot: () => ({ status: state.status }),
    isActive: () => state.active,
    applyDefinitionSkills: vi.fn(async (_definition: unknown) => { order.push("setup"); }),
    publishEvent: vi.fn(async (value: AgentRunEvent) => { published.push(value); }),
    postUserMessage: vi.fn(async (message: AgentInputUserMessage, opts: { lifecycleObserver?: (fact: AgentRunInputLifecycle) => void }) => {
      posted.push(message);
      order.push("posted");
      if (state.post === "rejected") return { accepted: false };
      queueMicrotask(() => {
        if (state.post === "forwarded") {
          state.turn += 1;
          opts.lifecycleObserver?.({ kind: "forwarded", turnId: `turn-${state.turn}` } as AgentRunInputLifecycle);
        } else {
          opts.lifecycleObserver?.({ kind: "failed", error: "provider down" } as unknown as AgentRunInputLifecycle);
        }
      });
      return { accepted: true };
    }),
  };
  return { run: run as unknown as AgentRun, state, posted, published, order, applyDefinitionSkills: run.applyDefinitionSkills };
};

/** A real AgentRun over a fake idle backend (start_turn and append supported) with this input preface port. */
const createAgentRun = (input: { runId: string; agentDefinitionId: string; memoryDir: string; inputPreface: AgentRunInputPreface }) => {
  const context = new AgentRunContext({
    runId: input.runId,
    config: new AgentRunConfig({
      runtimeKind: "claude_agent_sdk", agentDefinitionId: input.agentDefinitionId, llmModelIdentifier: "sonnet",
      autoExecuteTools: false, workspaceId: null, llmConfig: null, memoryDir: input.memoryDir,
    }),
    runtimeContext: null,
  });
  let turns = 0;
  const dispatchUserInput = vi.fn(async () => ({ forwarded: true, turnId: `turn-${++turns}` }));
  const backend = {
    runId: input.runId,
    runtimeKind: context.config.runtimeKind,
    compactionRecovery: { kind: "unsupported" } as const,
    inputCapabilities: { activeTurnAppend: "supported" },
    getContext: () => context,
    getPlatformAgentRunId: () => `platform-${input.runId}`,
    isActive: () => true,
    getLifecycleSnapshot: () => ({ availability: "active", phase: "idle", currentTurn: { kind: "NONE" } }),
    hasRunningBackgroundTasks: () => false,
    subscribeToSourceEventBatches: () => () => undefined,
    dispatchUserInput,
    approveToolInvocation: vi.fn(),
    interrupt: vi.fn(),
    terminate: vi.fn(),
  };
  const run = new AgentRun({
    providerInputNormalizer: { normalizeForProvider: (dispatch: AgentRunBackendInputDispatch) => dispatch },
    context,
    backend: backend as never,
    commandObservers: [],
    inputPreface: input.inputPreface,
  });
  const published: AgentRunEvent[] = [];
  run.subscribeToEvents((value) => { published.push(value); });
  const dispatched = (call: number) => (dispatchUserInput.mock.calls[call] as unknown as [AgentRunBackendInputDispatch])[0].message;
  return { run, dispatchUserInput, published, dispatched };
};

const publish = async (
  world: Awaited<ReturnType<typeof createWorld>>,
  fake: ReturnType<typeof createRun>,
  kind: AgentRunActivationKind = "new",
) => {
  world.service.runPublished(fake.run, kind);
  await world.subsystem.tracker.whenTracked(fake.run.runId);
  await settle();
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("SkillUpdateNoticeService (integration)", () => {
  it("AC-001: tells a busy run once through the agent-message path, with the turn id, and records what it saw", async () => {
    const world = await createWorld();
    const skillDir = await world.createSkill("code-review", { "SKILL.md": "v1", "references/checklist.md": "c1" });
    world.useSkills("def-a", { "code-review": skillDir });
    const fake = createRun(world, { runId: "run-a", definitionId: "def-a" });
    await publish(world, fake);
    fake.state.status = "running";

    await write(path.join(skillDir, "SKILL.md"), "v2");
    await world.service.onSkillFoldersChanged([skillDir]);

    await vi.waitFor(() => expect(fake.published).toHaveLength(1));
    expect(fake.posted).toHaveLength(1);
    const message = fake.posted[0]!;
    expect(message.senderType).toBe(SenderType.SYSTEM);
    expect(message.content).toBe([
      "[Platform notice — skill updated]",
      "",
      `Your skill package \`code-review\` has been updated (\`${skillDir}\`).`,
      "",
      "Changed files:",
      "- `SKILL.md` (changed)",
      "",
      "Re-read the updated files before continuing work that relies on this skill.",
    ].join("\n"));
    expect(fake.published[0]).toMatchObject({
      eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION,
      runId: "run-a",
      payload: { sender_id: SKILL_UPDATE_NOTICE_SENDER_ID, content: message.content, turn_id: "turn-1" },
    });
    await vi.waitFor(async () => {
      const record = JSON.parse(await fs.readFile(path.join(world.root, "memory", "run-a", SEEN_SKILL_VERSIONS_FILE_NAME), "utf8"));
      expect(JSON.stringify(record)).toContain(skillDir);
    });

    // The same files again (an identical save): nothing new to tell.
    await write(path.join(skillDir, "SKILL.md"), "v2");
    await world.service.onSkillFoldersChanged([skillDir]);
    await settle();
    expect(fake.posted).toHaveLength(1);
  });

  it("AC-004: one notice per settled burst, listing every changed file; a reverted edit yields none", async () => {
    const world = await createWorld();
    const skillDir = await world.createSkill("code-review", { "SKILL.md": "v1", "references/a.md": "a" });
    world.useSkills("def-a", { "code-review": skillDir });
    const fake = createRun(world, { runId: "run-a", definitionId: "def-a" });
    await publish(world, fake);
    fake.state.status = "running";

    await write(path.join(skillDir, "SKILL.md"), "v2");
    await write(path.join(skillDir, "references/a.md"), "a2");
    await write(path.join(skillDir, "references/b.md"), "b");
    await world.service.onSkillFoldersChanged([skillDir]);
    await vi.waitFor(() => expect(fake.published).toHaveLength(1));
    expect(fake.posted).toHaveLength(1);
    expect(fake.posted[0]!.content).toContain(
      "Changed files:\n- `SKILL.md` (changed)\n- `references/a.md` (changed)\n- `references/b.md` (added)\n");

    await write(path.join(skillDir, "SKILL.md"), "v3");
    await write(path.join(skillDir, "SKILL.md"), "v2");
    await world.service.onSkillFoldersChanged([skillDir]);
    await settle();
    expect(fake.posted).toHaveLength(1);
  });

  it("lists exactly the files that differ, each with its status; no SKILL.md when only references changed", async () => {
    const world = await createWorld();
    const skillDir = await world.createSkill("agent-package-creation", {
      "SKILL.md": "v1", "references/a.md": "a", "references/b.md": "b", "scripts/old.sh": "o",
    });
    world.useSkills("def-a", { "agent-package-creation": skillDir });
    const fake = createRun(world, { runId: "run-a", definitionId: "def-a" });
    await publish(world, fake);
    fake.state.status = "running";

    // Only reference files change.
    await write(path.join(skillDir, "references/a.md"), "a2");
    await write(path.join(skillDir, "references/b.md"), "b2");
    await world.service.onSkillFoldersChanged([skillDir]);
    await vi.waitFor(() => expect(fake.published).toHaveLength(1));
    expect(fake.posted[0]!.content).toBe([
      "[Platform notice — skill updated]",
      "",
      `Your skill package \`agent-package-creation\` has been updated (\`${skillDir}\`).`,
      "",
      "Changed files:",
      "- `references/a.md` (changed)",
      "- `references/b.md` (changed)",
      "",
      "Re-read the updated files before continuing work that relies on this skill.",
    ].join("\n"));
    expect(fake.posted[0]!.content).not.toContain("SKILL.md");

    // SKILL.md edited, a reference added, a script deleted.
    await write(path.join(skillDir, "SKILL.md"), "v2");
    await write(path.join(skillDir, "references/new.md"), "n");
    await fs.rm(path.join(skillDir, "scripts/old.sh"));
    await world.service.onSkillFoldersChanged([skillDir]);
    await vi.waitFor(() => expect(fake.published).toHaveLength(2));
    expect(fake.posted[1]!.content).toContain([
      "Changed files:",
      "- `SKILL.md` (changed)",
      "- `references/new.md` (added)",
      "- `scripts/old.sh` (removed)",
      "",
      "Re-read the updated files before continuing work that relies on this skill.",
      "Removed files are no longer available.",
    ].join("\n"));
  });

  it("DS-003: an idle run is only marked; its next input takes the notice once it is delivered", async () => {
    const world = await createWorld();
    const skillDir = await world.createSkill("code-review");
    world.useSkills("def-a", { "code-review": skillDir });
    const fake = createRun(world, { runId: "run-a", definitionId: "def-a" });
    await publish(world, fake);

    await write(path.join(skillDir, "SKILL.md"), "v2");
    await world.service.onSkillFoldersChanged([skillDir]);
    expect(fake.posted).toHaveLength(0);

    const preface = await world.service.takePreface(fake.run);
    expect(preface?.text).toContain(`Your skill package \`code-review\` has been updated (\`${skillDir}\`).\n\nChanged files:\n- \`SKILL.md\` (changed)\n`);
    expect(preface?.presentation).toEqual({ senderId: SKILL_UPDATE_NOTICE_SENDER_ID, content: preface?.text });
    // While in flight, no second notice is handed out.
    expect(await world.service.takePreface(fake.run)).toBeNull();
    world.service.prefaceDelivered(fake.run, preface!, "turn-1");
    await settle();
    expect(await world.service.takePreface(fake.run)).toBeNull();
  });

  it("AC-009: a failed busy delivery or a returned preface keeps the change for the next input", async () => {
    const world = await createWorld();
    const skillDir = await world.createSkill("code-review");
    world.useSkills("def-a", { "code-review": skillDir });
    const fake = createRun(world, { runId: "run-a", definitionId: "def-a" });
    await publish(world, fake);
    fake.state.status = "running";
    fake.state.post = "failed";

    await write(path.join(skillDir, "SKILL.md"), "v2");
    await world.service.onSkillFoldersChanged([skillDir]);
    await vi.waitFor(() => expect(fake.posted).toHaveLength(1));
    await settle();
    expect(fake.published).toHaveLength(0);

    fake.state.status = "idle";
    const preface = await world.service.takePreface(fake.run);
    expect(preface?.text).toContain("code-review");
    world.service.prefaceReturned(fake.run, preface!); // the carrying dispatch was not forwarded
    const again = await world.service.takePreface(fake.run);
    expect(again?.text).toBe(preface?.text);

    fake.state.status = "running";
    fake.state.post = "rejected";
    world.service.prefaceReturned(fake.run, again!);
    await write(path.join(skillDir, "SKILL.md"), "v3");
    await world.service.onSkillFoldersChanged([skillDir]);
    await settle();
    expect(await world.service.takePreface(fake.run)).not.toBeNull();
  });

  it("AC-007: only runs that use the changed skill hear about it; skills nobody uses are not watched", async () => {
    const world = await createWorld();
    const review = await world.createSkill("code-review");
    const research = await world.createSkill("deep-research");
    await world.createSkill("unused-skill");
    world.useSkills("def-a", { "code-review": review });
    world.useSkills("def-b", { "deep-research": research });
    const runA = createRun(world, { runId: "run-a", definitionId: "def-a" });
    const runB = createRun(world, { runId: "run-b", definitionId: "def-b" });
    await publish(world, runA);
    await publish(world, runB);
    await vi.waitFor(() => expect(world.subsystem.watcher.watchedFolders()).toEqual([review, research].sort()));
    runA.state.status = "running";
    runB.state.status = "running";

    await write(path.join(review, "SKILL.md"), "v2");
    await world.service.onSkillFoldersChanged([review]);
    await vi.waitFor(() => expect(runA.posted).toHaveLength(1));
    await settle();
    expect(runB.posted).toHaveLength(0);
  });

  it("AC-005: a skill moved to a new folder with the same files is no notice; one that no longer resolves is removed", async () => {
    const world = await createWorld();
    const generation1 = await world.createSkill("code-review", { "SKILL.md": "v1" }, path.join(world.root, "gen-1"));
    world.useSkills("def-a", { "code-review": generation1 });
    const fake = createRun(world, { runId: "run-a", definitionId: "def-a" });
    await publish(world, fake);
    fake.state.status = "running";

    // A new GitHub source generation: same name, new folder, same files; the old one is deleted.
    const generation2 = await world.createSkill("code-review", { "SKILL.md": "v1" }, path.join(world.root, "gen-2"));
    world.install("code-review", generation2);
    await fs.rm(generation1, { recursive: true, force: true });
    await world.service.onSkillFoldersChanged([generation1]);
    await settle();
    expect(fake.posted).toHaveLength(0);
    expect(world.subsystem.watcher.watchedFolders()).toEqual([generation2]);

    // The next generation changes SKILL.md: an update at the new path.
    await write(path.join(generation2, "SKILL.md"), "v2");
    await world.service.onSkillFoldersChanged([generation2]);
    await vi.waitFor(() => expect(fake.published).toHaveLength(1));
    expect(fake.posted[0]!.content).toContain(`Your skill package \`code-review\` has been updated (\`${generation2}\`).\n\nChanged files:\n- \`SKILL.md\` (changed)\n`);

    // The skill is uninstalled: it no longer resolves for the run.
    world.uninstall("code-review");
    await fs.rm(generation2, { recursive: true, force: true });
    await world.service.onSkillFoldersChanged([generation2]);
    await vi.waitFor(() => expect(fake.published).toHaveLength(2));
    expect(fake.posted[1]!.content).toContain("Your skill package `code-review` is no longer available.");
    expect(fake.posted[1]!.content).not.toContain("Re-read");
    await vi.waitFor(() => expect(world.subsystem.watcher.watchedFolders()).toEqual([]));
  });

  it("CR-002: a folder change re-resolves through the run's current definition; a deleted definition never reports a still-installed skill as removed", async () => {
    const world = await createWorld();
    const review = await world.createSkill("code-review");
    const research = await world.createSkill("deep-research");
    world.useSkills("def-a", { "code-review": review, "deep-research": research });
    const fake = createRun(world, { runId: "run-a", definitionId: "def-a" });
    await publish(world, fake);
    fake.state.status = "running";

    // The definition is deleted while the run is active; its skills are still installed.
    await world.saveAgent("def-a", null);
    await write(path.join(review, "SKILL.md"), "v2");
    await world.service.onSkillFoldersChanged([review]);
    await vi.waitFor(() => expect(fake.published).toHaveLength(1));
    expect(fake.posted[0]!.content).toContain(`Your skill package \`code-review\` has been updated (\`${review}\`).\n\nChanged files:\n- \`SKILL.md\` (changed)\n`);
    expect(fake.posted[0]!.content).not.toContain("no longer available");
    expect(world.subsystem.watcher.watchedFolders()).toEqual([review, research].sort());
  });

  it("AC-006: noise inside a skill folder never produces a notice", async () => {
    const world = await createWorld();
    const skillDir = await world.createSkill("code-review", { "SKILL.md": "v1", ".gitignore": "cache/\n" });
    world.useSkills("def-a", { "code-review": skillDir });
    const fake = createRun(world, { runId: "run-a", definitionId: "def-a" });
    await publish(world, fake);
    fake.state.status = "running";

    for (const noisy of [".git/index", "node_modules/a.js", "__pycache__/x.pyc", ".DS_Store", "SKILL.md.swp", "cache/tmp.bin"]) {
      await write(path.join(skillDir, noisy), "noise");
    }
    await world.service.onSkillFoldersChanged([skillDir]);
    await settle();
    expect(fake.posted).toHaveLength(0);
    expect(await world.service.takePreface(fake.run)).toBeNull();
  });

  it("AC-008: a skill folder is watched while a run using it is active, and released after", async () => {
    const world = await createWorld();
    const skillDir = await world.createSkill("code-review");
    world.useSkills("def-a", { "code-review": skillDir });
    const first = createRun(world, { runId: "run-a", definitionId: "def-a" });
    const second = createRun(world, { runId: "run-b", definitionId: "def-a" });
    await publish(world, first);
    await publish(world, second);
    expect(world.subsystem.watcher.watchedFolders()).toEqual([skillDir]);

    world.service.runReleased(first.run);
    expect(world.subsystem.watcher.watchedFolders()).toEqual([skillDir]);
    expect([...world.watches.open]).toEqual([skillDir]);
    world.service.runReleased(second.run);
    expect(world.subsystem.watcher.watchedFolders()).toEqual([]);
    expect([...world.watches.open]).toEqual([]); // its watch is closed: handles released (CR-005)
    expect(world.watches.created).toEqual([skillDir]);
  });

  it("AC-002/AC-003/AC-008: a restored run hears about changes made while it was stopped, added skills included; a missing record means none", async () => {
    const world = await createWorld();
    const skillDir = await world.createSkill("code-review");
    const removedDir = await world.createSkill("deep-research");
    world.useSkills("def-a", { "code-review": skillDir, "deep-research": removedDir });
    const original = createRun(world, { runId: "run-a", definitionId: "def-a" });
    await publish(world, original);
    await vi.waitFor(async () => {
      await fs.access(path.join(world.root, "memory", "run-a", SEEN_SKILL_VERSIONS_FILE_NAME));
    });
    world.service.runReleased(original.run);

    // While stopped: one skill changes, one is uninstalled, a new one is configured.
    await write(path.join(skillDir, "SKILL.md"), "v2");
    world.uninstall("deep-research");
    world.useSkills("def-a", { "code-review": skillDir, "brand-new": await world.createSkill("brand-new") });
    const restored = createRun(world, { runId: "run-a", definitionId: "def-a" });
    world.service.runPublished(restored.run, "restore");

    const preface = await world.service.takePreface(restored.run);
    expect(preface?.text).toContain(`Your skill package \`code-review\` has been updated (\`${skillDir}\`).\n\nChanged files:\n- \`SKILL.md\` (changed)\n`);
    expect(preface?.text).toContain("Your skill package `deep-research` is no longer available.");
    // Configured while it was stopped: the run was never told about it (DEC-002).
    const brandNewDir = path.join(world.skillsRoot, "brand-new");
    expect(preface?.text).toContain([
      "Your skill package `brand-new` is now available: The brand-new skill.",
      `Read its instructions before work it governs: \`${path.join(brandNewDir, "SKILL.md")}\`. Resolve relative paths in it from its folder.`,
      "",
    ].join("\n"));
    // Activated with its current definition: no "access starts at restart" sentence is looked up for it.
    expect(world.integrationRunAccess.integrationsStartingOnRestart).not.toHaveBeenCalled();

    // A run restored without a record (pre-feature run): re-created from current files, no notice.
    const legacy = createRun(world, { runId: "run-legacy", definitionId: "def-a" });
    world.service.runPublished(legacy.run, "restore");
    expect(await world.service.takePreface(legacy.run)).toBeNull();
    await vi.waitFor(async () => {
      await fs.access(path.join(world.root, "memory", "run-legacy", SEEN_SKILL_VERSIONS_FILE_NAME));
    });
  });

  it("R-5: ALL_INSTALLED runs share one watch per installed skill folder, all closed when the runs end", async () => {
    const world = await createWorld();
    const installed: Record<string, string> = {};
    for (let index = 0; index < 60; index += 1) {
      const name = `skill-${String(index).padStart(2, "0")}`;
      installed[name] = await world.createSkill(name);
    }
    world.useSkills("all-installed", installed);
    const runs = ["run-1", "run-2", "run-3"].map((runId) => createRun(world, { runId, definitionId: "all-installed" }));
    for (const fake of runs) await publish(world, fake);
    await vi.waitFor(() => expect(world.subsystem.watcher.watchedFolders()).toHaveLength(60));
    expect(world.watches.created).toHaveLength(60); // three runs, one watch per folder
    expect(world.watches.open.size).toBe(60);
    for (const fake of runs) world.service.runReleased(fake.run);
    expect(world.watches.open.size).toBe(0);
  });

  it("delivers through a real AgentRun: an idle run's next input carries the notice in one dispatch", async () => {
    const world = await createWorld();
    const skillDir = await world.createSkill("code-review");
    world.useSkills("def-a", { "code-review": skillDir });
    const { run, dispatchUserInput, published } = createAgentRun({
      runId: "run-real", agentDefinitionId: "def-a", memoryDir: path.join(world.root, "memory", "run-real"), inputPreface: world.service,
    });
    world.service.runPublished(run, "new");
    await vi.waitFor(() => expect(world.subsystem.watcher.watchedFolders()).toEqual([skillDir]));

    await write(path.join(skillDir, "SKILL.md"), "v2");
    await world.service.onSkillFoldersChanged([skillDir]);
    await run.postUserMessage(new AgentInputUserMessage("Review PR 12.", SenderType.USER, null, {}));

    await vi.waitFor(() => expect(published.some((value) => value.eventType === AgentRunEventType.SYSTEM_TASK_NOTIFICATION)).toBe(true));
    expect(dispatchUserInput).toHaveBeenCalledOnce();
    const message = (dispatchUserInput.mock.calls[0]![0] as AgentRunBackendInputDispatch).message;
    expect(message.content.endsWith("\n\nReview PR 12.")).toBe(true);
    expect(readPlatformInputPreface(message.metadata)?.originalContent).toBe("Review PR 12.");
    expect(published.find((value) => value.eventType === AgentRunEventType.SYSTEM_TASK_NOTIFICATION)?.payload)
      .toMatchObject({ sender_id: SKILL_UPDATE_NOTICE_SENDER_ID, turn_id: "turn-1" });

    // Delivered: the next input goes out unchanged.
    await vi.waitFor(async () => expect(await world.service.takePreface(run)).toBeNull());
    await run.postUserMessage(new AgentInputUserMessage("Thanks.", SenderType.USER, null, {}));
    await vi.waitFor(() => expect(dispatchUserInput).toHaveBeenCalledTimes(2));
    expect((dispatchUserInput.mock.calls[1]![0] as AgentRunBackendInputDispatch).message.content).toBe("Thanks.");
  });
});

describe("SkillUpdateNoticeService: skills added to or removed from a running agent's definition (DS-001)", () => {
  /** A run of `def-a` that has `code-review`; `deep-research` exists but is not configured yet. */
  const startWithOneSkill = async () => {
    const world = await createWorld();
    const review = await world.createSkill("code-review");
    const research = await world.createSkill("deep-research", { "SKILL.md": "# deep-research v1", "references/sources.md": "s1" });
    world.useSkills("def-a", { "code-review": review });
    world.install("deep-research", research);
    const fake = createRun(world, { runId: "run-a", definitionId: "def-a" });
    await publish(world, fake);
    return { world, review, research, fake };
  };

  const addedBlock = (name: string, dir: string) => [
    `Your skill package \`${name}\` is now available: The ${name} skill.`,
    `Read its instructions before work it governs: \`${path.join(dir, "SKILL.md")}\`. Resolve relative paths in it from its folder.`,
    "",
  ].join("\n");

  it("AC-001: an idle run's runtime sets the added skill up at once; its next input carries one 'now available' notice", async () => {
    const { world, research, fake } = await startWithOneSkill();

    await world.saveAgent("def-a", ["code-review", "deep-research"]);

    expect(fake.applyDefinitionSkills).toHaveBeenCalledOnce();
    expect(fake.applyDefinitionSkills).toHaveBeenCalledWith(expect.objectContaining({ id: "def-a", skillNames: ["code-review", "deep-research"] }));
    expect(fake.posted).toHaveLength(0); // an idle run is never woken
    expect(world.subsystem.watcher.watchedFolders()).toContain(research);
    const preface = await world.service.takePreface(fake.run);
    expect(preface?.text).toBe([
      "[Platform notice — skill updated]",
      "",
      addedBlock("deep-research", research),
    ].join("\n"));
    world.service.prefaceDelivered(fake.run, preface!, "turn-1");
    await vi.waitFor(async () => {
      const record = JSON.parse(await fs.readFile(path.join(world.root, "memory", "run-a", SEEN_SKILL_VERSIONS_FILE_NAME), "utf8"));
      expect(Object.keys(record.skills).sort()).toEqual(["code-review", "deep-research"]);
    });
    expect(await world.service.takePreface(fake.run)).toBeNull(); // told once
  });

  it("AC-001/AC-011: a busy run gets the notice now, after its runtime set the skill up", async () => {
    const { world, research, fake } = await startWithOneSkill();
    fake.state.status = "running";

    await world.saveAgent("def-a", ["code-review", "deep-research"]);

    await vi.waitFor(() => expect(fake.published).toHaveLength(1));
    expect(fake.order).toEqual(["setup", "posted"]);
    expect(fake.posted[0]!.content).toBe(["[Platform notice — skill updated]", "", addedBlock("deep-research", research)].join("\n"));
    expect(fake.published[0]).toMatchObject({
      eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION,
      payload: { sender_id: SKILL_UPDATE_NOTICE_SENDER_ID, content: fake.posted[0]!.content, turn_id: "turn-1" },
    });
  });

  it("AC-003: a removed skill is announced once; later edits of its files produce nothing for that run", async () => {
    const { world, review, fake } = await startWithOneSkill();
    fake.state.status = "running";

    await world.saveAgent("def-a", []);

    await vi.waitFor(() => expect(fake.published).toHaveLength(1));
    expect(fake.posted[0]!.content).toBe([
      "[Platform notice — skill updated]",
      "",
      "Your skill package `code-review` is no longer available.",
      "",
      "Do not rely on a skill that is no longer available.",
    ].join("\n"));
    expect(fake.applyDefinitionSkills).not.toHaveBeenCalled(); // removal is a message only (DEC-007)
    await vi.waitFor(() => expect(world.subsystem.watcher.watchedFolders()).toEqual([]));

    await write(path.join(review, "SKILL.md"), "v2");
    await world.service.onSkillFoldersChanged([review]);
    await settle();
    expect(fake.posted).toHaveLength(1);
  });

  it("AC-004: a save without skill changes, an add then a remove, or a remove then an add back before the next input: no notice", async () => {
    const { world, fake } = await startWithOneSkill();

    await world.saveAgent("def-a", ["code-review"]); // e.g. only the instructions changed
    expect(fake.applyDefinitionSkills).not.toHaveBeenCalled();
    expect(await world.service.takePreface(fake.run)).toBeNull();

    await world.saveAgent("def-a", ["code-review", "deep-research"]);
    await world.saveAgent("def-a", ["code-review"]);
    expect(fake.applyDefinitionSkills).toHaveBeenCalledOnce(); // set up by the first save; nothing is removed
    expect(await world.service.takePreface(fake.run)).toBeNull();

    await world.saveAgent("def-a", []);
    await world.saveAgent("def-a", ["code-review"]);
    expect(await world.service.takePreface(fake.run)).toBeNull();
    expect(fake.posted).toHaveLength(0);
  });

  it("AC-005: once announced, an added skill's file changes are noticed like any used skill's", async () => {
    const { world, research, fake } = await startWithOneSkill();
    fake.state.status = "running";
    await world.saveAgent("def-a", ["code-review", "deep-research"]);
    await vi.waitFor(() => expect(fake.published).toHaveLength(1));

    await write(path.join(research, "SKILL.md"), "# deep-research v2");
    await world.service.onSkillFoldersChanged([research]);

    await vi.waitFor(() => expect(fake.published).toHaveLength(2));
    expect(fake.posted[1]!.content).toContain(`Your skill package \`deep-research\` has been updated (\`${research}\`).\n\nChanged files:\n- \`SKILL.md\` (changed)\n`);
  });

  it("AC-006: an added integration skill says its access starts at a restart; nothing is granted", async () => {
    const { world, fake } = await startWithOneSkill();
    const github = await world.createSkill("github-integration");
    world.install("github-integration", github);
    world.integrationsBySkill.set("github-integration", ["GitHub"]);

    await world.saveAgent("def-a", ["code-review", "github-integration"]);

    const preface = await world.service.takePreface(fake.run);
    expect(preface?.text).toContain([
      "Your skill package `github-integration` is now available: The github-integration skill.",
      `Read its instructions before work it governs: \`${path.join(github, "SKILL.md")}\`. Resolve relative paths in it from its folder.`,
      "Its GitHub access starts when this run is restarted (stop the run, then send a message).",
      "",
    ].join("\n"));
    expect(world.integrationRunAccess.integrationsStartingOnRestart).toHaveBeenCalledWith(
      { runId: "run-a", agentDefinitionId: "def-a" }, ["github-integration"]);
  });

  it("AC-009: every tracked run of the definition hears it, a team member included", async () => {
    const { world, research, fake } = await startWithOneSkill();
    const member = createRun(world, { runId: "team-member-run", definitionId: "def-a" });
    await publish(world, member);
    const other = createRun(world, { runId: "other-agent-run", definitionId: "def-b" });
    world.defineAgent("def-b", ["code-review"]);
    await publish(world, other);

    await world.saveAgent("def-a", ["code-review", "deep-research"]);

    for (const run of [fake, member]) {
      expect(run.applyDefinitionSkills).toHaveBeenCalledOnce();
      expect((await world.service.takePreface(run.run))?.text).toContain(addedBlock("deep-research", research));
    }
    expect(other.applyDefinitionSkills).not.toHaveBeenCalled();
    expect(await world.service.takePreface(other.run)).toBeNull();
  });

  it("REQ-008: a setup that fails, or a run that is not active, still gets the notice", async () => {
    const { world, research, fake } = await startWithOneSkill();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    fake.applyDefinitionSkills.mockRejectedValueOnce(new Error("link refused"));
    const stopped = createRun(world, { runId: "inactive-run", definitionId: "def-a" });
    await publish(world, stopped);
    stopped.state.active = false;

    await world.saveAgent("def-a", ["code-review", "deep-research"]);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("SKILL_UPDATE_SETUP_FAILED:run-a: Error: link refused"));
    expect((await world.service.takePreface(fake.run))?.text).toContain(addedBlock("deep-research", research));
    expect(stopped.applyDefinitionSkills).not.toHaveBeenCalled();
    expect((await world.service.takePreface(stopped.run))?.text).toContain(addedBlock("deep-research", research));
    warn.mockRestore();
  });

  it("a definition that no longer exists leaves the run's skills as they are", async () => {
    const { world, review, fake } = await startWithOneSkill();

    await world.saveAgent("def-a", null);

    expect(await world.service.takePreface(fake.run)).toBeNull();
    expect(world.subsystem.watcher.watchedFolders()).toEqual([review]);
  });

  it("QR-001: a burst of saves reads each run's definition at most twice (one pass, then exactly one more)", async () => {
    const { world, fake } = await startWithOneSkill();
    world.definitionReads.splice(0);

    world.defineAgent("def-a", ["code-review", "deep-research"]);
    const passes = Array.from({ length: 5 }, () => world.service.onDefinitionsChanged());
    await Promise.all(passes);

    expect(world.definitionReads.filter((id) => id === "def-a").length).toBeLessThanOrEqual(2);
    expect(fake.applyDefinitionSkills).toHaveBeenCalledOnce();
  });

  it("closing the subsystem stops listening to definition changes", async () => {
    const { world } = await startWithOneSkill();
    expect(world.signalListenerCount()).toBe(1);
    await world.subsystem.close();
    expect(world.signalListenerCount()).toBe(0);
  });
});

describe("SkillUpdateNoticeService with the real folder watcher", () => {
  it("notices a SKILL.md edit end to end after the settle window", async () => {
    const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "skill-notice-watch-")));
    tempDirs.push(root);
    const skillDir = path.join(root, "code-review");
    await write(path.join(skillDir, "SKILL.md"), "v1");
    await fs.mkdir(path.join(root, "memory"), { recursive: true });
    const subsystem = createSkillUpdateNotices({
      agentDefinitionService: { getAgentDefinitionById: async (id: string) => ({ id }) as never },
      definitionChanges: { subscribe: () => () => undefined },
      integrationRunAccess: null,
      skillService: { resolveConfiguredSkillsForAgent: () => [{ name: "code-review", rootPath: skillDir, description: "" }] as never },
      settleQuietMs: 150,
      settleCapMs: 600,
    });
    subsystems.push(subsystem);
    const posted: string[] = [];
    const run = {
      runId: "run-watch",
      config: { agentDefinitionId: "def", memoryDir: path.join(root, "memory") },
      getStatusSnapshot: () => ({ status: "running" }),
      publishEvent: async () => undefined,
      postUserMessage: async (message: AgentInputUserMessage, opts: { lifecycleObserver?: (fact: AgentRunInputLifecycle) => void }) => {
        posted.push(message.content);
        queueMicrotask(() => opts.lifecycleObserver?.({ kind: "forwarded", turnId: "t" } as AgentRunInputLifecycle));
        return { accepted: true };
      },
    } as unknown as AgentRun;
    subsystem.service.runPublished(run, "new");
    await vi.waitFor(() => expect(subsystem.watcher.watchedFolders()).toEqual([skillDir]));
    await new Promise((resolve) => setTimeout(resolve, 700)); // watcher ready, pre-watch events drained

    await write(path.join(skillDir, "SKILL.md"), "v2");

    await vi.waitFor(() => expect(posted).toHaveLength(1), { timeout: 5000 });
    expect(posted[0]).toContain(`Your skill package \`code-review\` has been updated (\`${skillDir}\`).\n\nChanged files:\n- \`SKILL.md\` (changed)\n`);
  });
});

describe("SkillUpdateNoticeService tracking off the input path (CR-001)", () => {
  /** A service whose tracking snapshots wait for `open()` (a slow first scan of many skill files). */
  const createGatedService = async (options: { seenVersionsRetryDelaysMs?: readonly number[] } = {}) => {
    const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "skill-notice-gated-")));
    tempDirs.push(root);
    const skillDir = path.join(root, "skills", "code-review");
    await write(path.join(skillDir, "SKILL.md"), "v1");
    let open!: () => void;
    const gate = new Promise<void>((resolve) => { open = resolve; });
    const real = new SkillFolderSnapshotter();
    const tracker = new RunSkillTracker({
      resolution: {
        readDefinition: async () => null,
        resolveSkills: () => [{ name: "code-review", rootPath: skillDir, description: "" }],
      },
      snapshotter: { snapshot: async (skill) => { await gate; return real.snapshot(skill); } },
      store: new SeenSkillVersionsStore(),
      seenVersionsRetryDelaysMs: options.seenVersionsRetryDelaysMs,
    });
    const watcher = new SkillFolderWatcher({
      createWatch: () => ({ on: () => undefined, add: () => undefined, unwatch: () => undefined, close: async () => undefined }),
    });
    const service = new SkillUpdateNoticeService({
      tracker, watcher, snapshotter: real,
      agentDefinitionService: { getAgentDefinitionById: async () => null },
      integrationRunAccess: null,
    });
    return { root, skillDir, service, tracker, watcher, open };
  };

  it("a new run's first input is dispatched at once, while its skills are still being scanned", async () => {
    const { root, service, tracker, watcher, open } = await createGatedService();
    mkdirSync(path.join(root, "memory", "run-new"), { recursive: true });
    const { run, dispatchUserInput, dispatched } = createAgentRun({
      runId: "run-new", agentDefinitionId: "def-a", memoryDir: path.join(root, "memory", "run-new"), inputPreface: service,
    });
    service.runPublished(run, "new");

    await run.postUserMessage(new AgentInputUserMessage("Review PR 12.", SenderType.USER, null, {}));

    await vi.waitFor(() => expect(dispatchUserInput).toHaveBeenCalledOnce(), { timeout: 1000 });
    expect(dispatched(0).content).toBe("Review PR 12.");
    expect(tracker.getTrackedRun("run-new")).toBeNull(); // still scanning
    open();
    await vi.waitFor(() => expect(tracker.getTrackedRun("run-new")).not.toBeNull());
    await service.close();
    await watcher.close();
    await tracker.close();
  });

  it("a restored run's first input waits for its check and carries the notice for changes made while it was stopped", async () => {
    const { root, skillDir, service, tracker, watcher, open } = await createGatedService();
    const memoryDir = path.join(root, "memory", "run-restored");
    await fs.mkdir(memoryDir, { recursive: true });
    await new SeenSkillVersionsStore().write({ runId: "run-restored", memoryDir }, new Map([["code-review", {
      skillName: "code-review", skillDir, skillMdPath: path.join(skillDir, "SKILL.md"), files: { "SKILL.md": "digest-of-v0" },
    }]]));
    const { run, dispatchUserInput, dispatched } = createAgentRun({
      runId: "run-restored", agentDefinitionId: "def-a", memoryDir, inputPreface: service,
    });
    service.runPublished(run, "restore");

    await run.postUserMessage(new AgentInputUserMessage("continue", SenderType.USER, null, {}));
    await settle();
    expect(dispatchUserInput).not.toHaveBeenCalled(); // waits for the restore check
    open();

    await vi.waitFor(() => expect(dispatchUserInput).toHaveBeenCalledOnce());
    expect(dispatched(0).content.startsWith("[Platform notice — skill updated]")).toBe(true);
    expect(dispatched(0).content).toContain(`Your skill package \`code-review\` has been updated (\`${skillDir}\`).\n\nChanged files:\n- \`SKILL.md\` (changed)\n`);
    expect(dispatched(0).content.endsWith("\n\ncontinue")).toBe(true);
    await service.close();
    await watcher.close();
    await tracker.close();
  });

  // DR-001: a seen-versions write never outlives the run's release or the subsystem's close, and
  // never re-creates a deleted run's memory folder.
  const fakeRun = (runId: string, memoryDir: string) =>
    ({ runId, config: { agentDefinitionId: "def-a", memoryDir }, getStatusSnapshot: () => ({ status: "idle" }) }) as unknown as AgentRun;

  it("DR-001: a run released and deleted while its skills are being scanned does not get its memory folder back", async () => {
    const { root, service, tracker, watcher, open } = await createGatedService();
    const memoryDir = path.join(root, "memory", "run-deleted");
    await fs.mkdir(memoryDir, { recursive: true });
    const run = fakeRun("run-deleted", memoryDir);
    service.runPublished(run, "new");
    await settle();

    service.runReleased(run);
    await fs.rm(memoryDir, { recursive: true, force: true }); // the run is deleted
    open();
    await settle();
    await tracker.close();

    expect(existsSync(memoryDir)).toBe(false);
    await service.close();
    await watcher.close();
  });

  it("DR-001: a record waits for the runtime to create the memory folder, and stops for good once the run is released", async () => {
    const { root, service, tracker, watcher, open } = await createGatedService({ seenVersionsRetryDelaysMs: [20] });
    open();
    const memoryDir = path.join(root, "memory", "run-late-folder");
    const run = fakeRun("run-late-folder", memoryDir);
    service.runPublished(run, "new");
    await tracker.whenTracked("run-late-folder");
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(existsSync(memoryDir)).toBe(false); // never created by the subsystem

    await fs.mkdir(memoryDir, { recursive: true }); // the runtime writes its first trace
    await vi.waitFor(() => expect(existsSync(path.join(memoryDir, SEEN_SKILL_VERSIONS_FILE_NAME))).toBe(true));

    service.runReleased(run);
    await fs.rm(memoryDir, { recursive: true, force: true }); // the run is deleted
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(existsSync(memoryDir)).toBe(false);
    await service.close();
    await watcher.close();
    await tracker.close();
  });

  it("DR-001: close waits for tracking and writes in progress; nothing is written after it", async () => {
    const { root, service, tracker, watcher, open } = await createGatedService();
    const memoryDir = path.join(root, "memory", "run-closing");
    await fs.mkdir(memoryDir, { recursive: true });
    service.runPublished(fakeRun("run-closing", memoryDir), "new");
    await settle();

    const closing = (async () => { await watcher.close(); await service.close(); await tracker.close(); })();
    open();
    await closing;

    const after = readdirSync(memoryDir);
    expect(after.filter((name) => name.endsWith(".tmp"))).toEqual([]);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(readdirSync(memoryDir)).toEqual(after);
    await fs.rm(memoryDir, { recursive: true }); // no ENOTEMPTY: nothing is still writing
    expect(existsSync(memoryDir)).toBe(false);
  });
});
