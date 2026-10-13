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
import type { AgentRunBackendInputDispatch, AgentRunInputLifecycle } from "../../../src/agent-execution/input/agent-run-input-contract.js";
import { SKILL_UPDATE_NOTICE_SENDER_ID } from "../../../src/agent-execution/domain/system-task-notification-senders.js";
import type { SkillFolderWatchFactory } from "../../../src/skill-update-notices/monitor/skill-folder-watcher.js";
import { SEEN_SKILL_VERSIONS_FILE_NAME } from "../../../src/skill-update-notices/providers/seen-skill-versions-store.js";
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
  /** agent definition id → the skills it resolves to now (name → folder). */
  const definitions = new Map<string, Map<string, string>>();
  const createSkill = async (name: string, files: Record<string, string> = { "SKILL.md": `# ${name} v1` }, base = skillsRoot) => {
    const dir = path.join(base, name);
    for (const [file, content] of Object.entries(files)) await write(path.join(dir, file), content);
    return dir;
  };
  const useSkills = (definitionId: string, skills: Record<string, string>) => {
    definitions.set(definitionId, new Map(Object.entries(skills)));
  };
  const watches = { created: 0 };
  const createWatch: SkillFolderWatchFactory = () => {
    watches.created += 1;
    return { on: () => undefined, add: () => undefined, unwatch: () => undefined, close: async () => undefined };
  };
  const subsystem = createSkillUpdateNotices({
    agentDefinitionService: { getAgentDefinitionById: async (id: string) => ({ id }) as never },
    skillService: {
      resolveConfiguredSkillsForAgent: (definition: { id: string }) =>
        [...(definitions.get(definition.id) ?? new Map()).entries()]
          .map(([name, rootPath]) => ({ name, rootPath })) as never,
    },
    createWatch,
  });
  subsystems.push(subsystem);
  return { root, skillsRoot, createSkill, useSkills, subsystem, service: subsystem.service, watches };
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
  const run = {
    runId: options.runId,
    config: { agentDefinitionId: options.definitionId, memoryDir: options.memoryDir === undefined ? path.join(world.root, "memory", options.runId) : options.memoryDir },
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

const publish = async (
  world: Awaited<ReturnType<typeof createWorld>>,
  fake: ReturnType<typeof createRun>,
  kind: AgentRunActivationKind = "new",
) => {
  world.service.runPublished(fake.run, kind);
  // takePreface waits for the run's tracking; a new run has nothing to hear yet.
  expect(await world.service.takePreface(fake.run)).toBeNull();
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
    world.useSkills("def-a", { "code-review": generation2 });
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
    world.useSkills("def-a", {});
    await fs.rm(generation2, { recursive: true, force: true });
    await world.service.onSkillFoldersChanged([generation2]);
    await vi.waitFor(() => expect(fake.published).toHaveLength(2));
    expect(fake.posted[1]!.content).toContain("- code-review: no longer available");
    expect(fake.posted[1]!.content).not.toContain("Re-read");
    await vi.waitFor(() => expect(world.subsystem.watcher.watchedFolders()).toEqual([]));
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
    world.service.runReleased(second.run);
    expect(world.subsystem.watcher.watchedFolders()).toEqual([]);
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

  it("R-5: ALL_INSTALLED runs share one watch with one entry per installed skill folder", async () => {
    const world = await createWorld();
    const installed: Record<string, string> = {};
    for (let index = 0; index < 60; index += 1) {
      const name = `skill-${String(index).padStart(2, "0")}`;
      installed[name] = await world.createSkill(name);
    }
    world.useSkills("all-installed", installed);
    for (const runId of ["run-1", "run-2", "run-3"]) {
      await publish(world, createRun(world, { runId, definitionId: "all-installed" }));
    }
    await vi.waitFor(() => expect(world.subsystem.watcher.watchedFolders()).toHaveLength(60));
    expect(world.watches.created).toBe(1);
  });

  it("delivers through a real AgentRun: an idle run's next input carries the notice in one dispatch", async () => {
    const world = await createWorld();
    const skillDir = await world.createSkill("code-review");
    world.useSkills("def-a", { "code-review": skillDir });
    const context = new AgentRunContext({
      runId: "run-real",
      config: new AgentRunConfig({
        runtimeKind: "claude_agent_sdk", agentDefinitionId: "def-a", llmModelIdentifier: "sonnet",
        autoExecuteTools: false, workspaceId: null, llmConfig: null, memoryDir: path.join(world.root, "memory", "run-real"),
      }),
      runtimeContext: null,
    });
    const dispatchUserInput = vi.fn().mockResolvedValue({ forwarded: true, turnId: "turn-7" });
    const backend = {
      runId: "run-real",
      runtimeKind: context.config.runtimeKind,
      compactionRecovery: { kind: "unsupported" } as const,
      inputCapabilities: { activeTurnAppend: "supported" },
      getContext: () => context,
      getPlatformAgentRunId: () => "platform-run-real",
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
      inputPreface: world.service,
    });
    const published: AgentRunEvent[] = [];
    run.subscribeToEvents((value) => { published.push(value); });
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
      .toMatchObject({ sender_id: SKILL_UPDATE_NOTICE_SENDER_ID, turn_id: "turn-7" });

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
