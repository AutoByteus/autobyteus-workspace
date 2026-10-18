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
  const subsystem = createSkillUpdateNotices({
    // A copy of the definition as it is now (null once deleted), as the definition service returns.
    agentDefinitionService: { getAgentDefinitionById: async (id: string) => {
      const skillNames = definitions.get(id);
      return (skillNames ? { id, skillNames: [...skillNames] } : null) as never;
    } },
    // Resolves a definition's configured names through the catalog as it is now.
    skillService: {
      resolveConfiguredSkillsForAgent: (definition: { skillNames: string[] } | null) =>
        (definition?.skillNames ?? []).flatMap((name) => {
          const rootPath = catalog.get(name);
          return rootPath ? [{ name, rootPath }] : [];
        }) as never,
    },
    createWatch,
  });
  subsystems.push(subsystem);
  return {
    root, skillsRoot, createSkill, useSkills, install, uninstall, defineAgent, deleteAgent,
    subsystem, service: subsystem.service, watches,
  };
};

/** A fake run: status, agent-message posting with a chosen outcome, and published events. */
const createRun = (world: Awaited<ReturnType<typeof createWorld>>, options: {
  runId: string;
  definitionId: string;
  memoryDir?: string | null;
}) => {
  const state = { status: "idle" as string, post: "forwarded" as PostBehavior, turn: 0 };
  const posted: AgentInputUserMessage[] = [];
  const published: AgentRunEvent[] = [];
  const memoryDir = options.memoryDir === undefined ? path.join(world.root, "memory", options.runId) : options.memoryDir;
  // The platform creates a run's memory folder; the notice subsystem never does.
  if (memoryDir) mkdirSync(memoryDir, { recursive: true });
  const run = {
    runId: options.runId,
    config: { agentDefinitionId: options.definitionId, memoryDir },
    getStatusSnapshot: () => ({ status: state.status }),
    publishEvent: vi.fn(async (value: AgentRunEvent) => { published.push(value); }),
    postUserMessage: vi.fn(async (message: AgentInputUserMessage, opts: { lifecycleObserver?: (fact: AgentRunInputLifecycle) => void }) => {
      posted.push(message);
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
  return { run: run as unknown as AgentRun, state, posted, published };
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
      "The following skills you use changed on disk since you last read them:",
      `- code-review (${path.join(skillDir, "SKILL.md")}): SKILL.md`,
      "",
      "Re-read the updated SKILL.md (and any files it points to) before continuing work that relies on these skills.",
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
    expect(fake.posted[0]!.content).toContain("): SKILL.md, references/a.md, references/b.md");

    await write(path.join(skillDir, "SKILL.md"), "v3");
    await write(path.join(skillDir, "SKILL.md"), "v2");
    await world.service.onSkillFoldersChanged([skillDir]);
    await settle();
    expect(fake.posted).toHaveLength(1);
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
    expect(preface?.text).toContain(`- code-review (${path.join(skillDir, "SKILL.md")}): SKILL.md`);
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
    expect(fake.posted[0]!.content).toContain(`- code-review (${path.join(generation2, "SKILL.md")}): SKILL.md`);

    // The skill is uninstalled: it no longer resolves for the run.
    world.uninstall("code-review");
    await fs.rm(generation2, { recursive: true, force: true });
    await world.service.onSkillFoldersChanged([generation2]);
    await vi.waitFor(() => expect(fake.published).toHaveLength(2));
    expect(fake.posted[1]!.content).toContain("- code-review: no longer available");
    expect(fake.posted[1]!.content).not.toContain("Re-read");
    await vi.waitFor(() => expect(world.subsystem.watcher.watchedFolders()).toEqual([]));
  });

  it("CR-002: an active run keeps the definition it was activated with; editing or deleting it never reports a still-installed skill as removed", async () => {
    const world = await createWorld();
    const review = await world.createSkill("code-review");
    const research = await world.createSkill("deep-research");
    world.useSkills("def-a", { "code-review": review, "deep-research": research });
    const fake = createRun(world, { runId: "run-a", definitionId: "def-a" });
    await publish(world, fake);
    fake.state.status = "running";

    // The definition drops deep-research while the run is active; the run still uses it.
    world.defineAgent("def-a", ["code-review"]);
    await write(path.join(research, "SKILL.md"), "v2");
    await world.service.onSkillFoldersChanged([research]);
    await vi.waitFor(() => expect(fake.published).toHaveLength(1));
    expect(fake.posted[0]!.content).toContain(`- deep-research (${path.join(research, "SKILL.md")}): SKILL.md`);
    expect(fake.posted[0]!.content).not.toContain("no longer available");

    // The definition is deleted while the run is active; its skills are still installed.
    world.deleteAgent("def-a");
    await write(path.join(review, "SKILL.md"), "v2");
    await world.service.onSkillFoldersChanged([review]);
    await vi.waitFor(() => expect(fake.published).toHaveLength(2));
    expect(fake.posted[1]!.content).toContain(`- code-review (${path.join(review, "SKILL.md")}): SKILL.md`);
    expect(fake.posted[1]!.content).not.toContain("no longer available");
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

  it("AC-002/AC-003: a restored run hears about changes made while it was stopped; a missing record means none", async () => {
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
    expect(preface?.text).toContain(`- code-review (${path.join(skillDir, "SKILL.md")}): SKILL.md`);
    expect(preface?.text).toContain("- deep-research: no longer available");
    expect(preface?.text).not.toContain("brand-new");

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

describe("SkillUpdateNoticeService with the real folder watcher", () => {
  it("notices a SKILL.md edit end to end after the settle window", async () => {
    const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "skill-notice-watch-")));
    tempDirs.push(root);
    const skillDir = path.join(root, "code-review");
    await write(path.join(skillDir, "SKILL.md"), "v1");
    await fs.mkdir(path.join(root, "memory"), { recursive: true });
    const subsystem = createSkillUpdateNotices({
      agentDefinitionService: { getAgentDefinitionById: async (id: string) => ({ id }) as never },
      skillService: { resolveConfiguredSkillsForAgent: () => [{ name: "code-review", rootPath: skillDir }] as never },
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
    expect(posted[0]).toContain(`- code-review (${path.join(skillDir, "SKILL.md")}): SKILL.md`);
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
      resolveUsedSkills: async () => ({ resolve: () => [{ name: "code-review", rootPath: skillDir }] }),
      snapshotter: { snapshot: async (skill) => { await gate; return real.snapshot(skill); } },
      store: new SeenSkillVersionsStore(),
      seenVersionsRetryDelaysMs: options.seenVersionsRetryDelaysMs,
    });
    const watcher = new SkillFolderWatcher({
      createWatch: () => ({ on: () => undefined, add: () => undefined, unwatch: () => undefined, close: async () => undefined }),
    });
    const service = new SkillUpdateNoticeService({ tracker, watcher, snapshotter: real });
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
    service.close();
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
    expect(dispatched(0).content).toContain(`- code-review (${path.join(skillDir, "SKILL.md")}): SKILL.md`);
    expect(dispatched(0).content.endsWith("\n\ncontinue")).toBe(true);
    service.close();
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
    service.close();
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
    service.close();
    await watcher.close();
    await tracker.close();
  });

  it("DR-001: close waits for tracking and writes in progress; nothing is written after it", async () => {
    const { root, service, tracker, watcher, open } = await createGatedService();
    const memoryDir = path.join(root, "memory", "run-closing");
    await fs.mkdir(memoryDir, { recursive: true });
    service.runPublished(fakeRun("run-closing", memoryDir), "new");
    await settle();

    const closing = (async () => { await watcher.close(); service.close(); await tracker.close(); })();
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
