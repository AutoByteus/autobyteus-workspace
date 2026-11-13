/**
 * A skill added to a running agent's definition is linked into the run's workspace skill folder by its backend and
 * released with the run (autobyteus-460, AC-011/AC-012, design DS-003). Per runtime: the link is added and held and
 * released at run end, and a release while an add is in flight leaves no link and no holder:
 * - Claude: cleanup's `skills` stage runs in parallel with `process` and `listeners`;
 * - Codex: the release starts while the add waits for Codex's `skills/list` answer;
 * - Grok (ACP, the fake ACP agent): `terminate` during the add.
 * Real `WorkspaceSkillMaterializer`s and links in a test-owned workspace; a gate on `symlink` holds an add in flight.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { ClaudeAgentRunBackend } from "../../../../src/agent-execution/backends/claude/backend/claude-agent-run-backend.js";
import { CLAUDE_WORKSPACE_SKILL_MATERIALIZATION_PROFILE } from "../../../../src/agent-execution/backends/claude/claude-workspace-skill-materializer.js";
import { ClaudeSessionCleanup } from "../../../../src/agent-execution/backends/claude/session/claude-session-cleanup.js";
import { CodexAgentRunBackend } from "../../../../src/agent-execution/backends/codex/backend/codex-agent-run-backend.js";
import { CodexAgentRunContext } from "../../../../src/agent-execution/backends/codex/backend/codex-agent-run-context.js";
import { CODEX_WORKSPACE_SKILL_MATERIALIZATION_PROFILE } from "../../../../src/agent-execution/backends/codex/codex-workspace-skill-materializer.js";
import { CodexWorkspaceSkillRequestPlanner } from "../../../../src/agent-execution/backends/codex/codex-workspace-skill-request-planner.js";
import { CodexThreadManager } from "../../../../src/agent-execution/backends/codex/thread/codex-thread-manager.js";
import { CodexApprovalPolicy } from "../../../../src/agent-execution/backends/codex/thread/codex-thread-config.js";
import type { CodexClientThreadRouter } from "../../../../src/agent-execution/backends/codex/thread/codex-client-thread-router.js";
import { AcpAgentRunBackendFactory } from "../../../../src/agent-execution/backends/acp/backend/acp-agent-run-backend-factory.js";
import { GROK_WORKSPACE_SKILL_MATERIALIZATION_PROFILE } from "../../../../src/agent-execution/backends/grok/grok-workspace-skill-materializer.js";
import { grokBuildSessionProfile } from "../../../../src/agent-execution/backends/grok/grok-build-session-profile.js";
import {
  exposedWorkspaceSkillRequests,
  planExposedWorkspaceSkillRequests,
  RunWorkspaceSkills,
  type WorkspaceSkillRequestPlanner,
} from "../../../../src/agent-execution/backends/shared/run-workspace-skills.js";
import {
  WorkspaceSkillMaterializer,
  type WorkspaceSkillMaterializationProfile,
} from "../../../../src/agent-execution/backends/shared/workspace-skill-materializer.js";
import { AgentRunConfig } from "../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../src/agent-execution/domain/agent-run-context.js";
import type { CodexAppServerClient } from "../../../../src/runtime-management/codex/client/codex-app-server-client.js";
import type { CodexAppServerClientManager } from "../../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import type { ConfiguredAgentSkillBinding } from "../../../../src/skills/domain/configured-agent-skill-binding.js";
import { Skill } from "../../../../src/skills/domain/models.js";
import { activatedAgentToolMcpRunSessionsStub, createAgentToolMcpRunSessionsStub } from "../../../helpers/agent-tool-mcp-run-sessions-stub.js";
import { testCodexLeaseManager } from "../../../fixtures/agent-run-preparation-fixtures.js";
import { fakeAcpLaunchProfile, fixturePath } from "./acp/acp-fake-agent-harness.js";

let root: string;
let workspace: string;
const catalog = new Map<string, Skill>();

beforeEach(async () => {
  root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "mid-run-workspace-skills-")));
  workspace = path.join(root, "workspace");
  await fs.mkdir(workspace);
  catalog.clear();
  for (const name of ["code-review", "deep-research"]) {
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

const definition = (...skillNames: string[]) => new AgentDefinition({
  id: "def", name: "Agent", description: "Test agent", instructions: "Work.", skillNames, toolNames: [],
});
const skillService = {
  resolveConfiguredSkillBindingsForAgent: (value: AgentDefinition | null | undefined): ConfiguredAgentSkillBinding[] =>
    (value?.skillNames ?? []).flatMap((name) => {
      const skill = catalog.get(name);
      return skill ? [{ kind: "resolved" as const, skill }] : [];
    }),
  resolveSkillScope: () => "CONFIGURED" as const,
  hasEffectiveSkills: () => true,
  resolveManagedSkillForMaterialization: () => null,
};
const linkIn = (profile: WorkspaceSkillMaterializationProfile, name: string) =>
  path.join(workspace, ...profile.workspaceSkillsRootSegments, name);
const exists = async (target: string) => fs.lstat(target).then(() => true, () => false);

/** A real materializer whose `symlink` waits while its gate is closed. */
const gatedMaterializer = (profile: WorkspaceSkillMaterializationProfile) => {
  let gate: Promise<void> | null = null;
  let openGate: (() => void) | null = null;
  const waiting = vi.fn();
  const materializer = new WorkspaceSkillMaterializer(profile, {
    logger: { warn: () => undefined },
    fileSystem: {
      symlink: async (...args: Parameters<typeof fs.symlink>) => {
        if (gate) { waiting(); await gate; }
        return fs.symlink(...args);
      },
    },
  });
  return {
    materializer, waiting,
    close: () => { gate = new Promise<void>((resolve) => { openGate = resolve; }); },
    open: () => { gate = null; openGate?.(); },
  };
};

const holderFor = (materializer: WorkspaceSkillMaterializer, planRequests: WorkspaceSkillRequestPlanner = planExposedWorkspaceSkillRequests, runId = "run-a") =>
  new RunWorkspaceSkills({ runId, materializer, skillService, planRequests, logger: { warn: () => undefined } });

const prepare = (holder: RunWorkspaceSkills, ...skillNames: string[]) => holder.acquire({
  workingDirectory: workspace,
  requests: exposedWorkspaceSkillRequests(skillService.resolveConfiguredSkillBindingsForAgent(definition(...skillNames))),
  workspaceCollisionPolicy: "fail",
  assertPreparing: () => undefined,
});

/** Another run of the same workspace takes and releases the skill: a leaked holder would keep its link. */
const expectNoHolderLeft = async (materializer: WorkspaceSkillMaterializer, profile: WorkspaceSkillMaterializationProfile, name: string) => {
  const other = holderFor(materializer, planExposedWorkspaceSkillRequests, "run-other");
  await prepare(other, name);
  expect(await exists(linkIn(profile, name))).toBe(true);
  await other.release();
  expect(await exists(linkIn(profile, name))).toBe(false);
};

describe("Claude: a skill added mid-run", () => {
  const profile = CLAUDE_WORKSPACE_SKILL_MATERIALIZATION_PROFILE;

  /** A Claude session double over a run context that holds these workspace skills. */
  const sessionFor = (holder: RunWorkspaceSkills, closeProcess: () => Promise<void> = async () => undefined) => ({
    closeProcess: vi.fn(closeProcess),
    closeTurnForTermination: vi.fn(async () => undefined),
    clearRuntimeListeners: vi.fn(),
    releaseAgentToolsMcp: vi.fn(),
    runContext: { runId: "run-a", config: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK }, runtimeContext: { requireWorkspaceSkills: () => holder } },
  });

  it("AC-011: the backend links it into .claude/skills; the session cleanup releases it with the run", async () => {
    const { materializer } = gatedMaterializer(profile);
    const holder = holderFor(materializer);
    await prepare(holder, "code-review");
    const session = sessionFor(holder);
    const backend = new ClaudeAgentRunBackend(session.runContext as never, { ...session, subscribeToRuntimeEvents: () => () => undefined } as never);

    await backend.applyDefinitionSkills(definition("code-review", "deep-research"));
    expect(await fs.realpath(linkIn(profile, "deep-research"))).toBe(catalog.get("deep-research")!.rootPath);

    await new ClaudeSessionCleanup().cleanupSessionResources({ session: session as never });
    expect(await exists(linkIn(profile, "deep-research"))).toBe(false);
    expect(await exists(linkIn(profile, "code-review"))).toBe(false);
  });

  it("AR-001: cleanup's skills stage, running beside a process stage still closing, waits for the add in flight and leaves nothing", async () => {
    const gated = gatedMaterializer(profile);
    const holder = holderFor(gated.materializer);
    await prepare(holder, "code-review");
    let exitProcess!: () => void;
    const session = sessionFor(holder, () => new Promise<void>((resolve) => { exitProcess = resolve; }));
    gated.close();

    const adding = holder.addFrom(definition("code-review", "deep-research"));
    await vi.waitFor(() => expect(gated.waiting).toHaveBeenCalledOnce());
    const cleanup = new ClaudeSessionCleanup().cleanupSessionResources({ session: session as never });
    await vi.waitFor(() => expect(session.closeProcess).toHaveBeenCalledOnce());
    gated.open(); // the add completes while the process stage is still closing
    await adding;
    exitProcess();
    await cleanup;

    expect(await exists(linkIn(profile, "deep-research"))).toBe(false);
    expect(await exists(linkIn(profile, "code-review"))).toBe(false);
    await expectNoHolderLeft(gated.materializer, profile, "deep-research");
  });
});

describe("Codex: a skill added mid-run", () => {
  const profile = CODEX_WORKSPACE_SKILL_MATERIALIZATION_PROFILE;

  const codexWorld = async (answerSkillsList: () => Promise<unknown>) => {
    const gated = gatedMaterializer(profile);
    const client = {
      request: vi.fn(async (method: string) => method === "skills/list" ? answerSkillsList() : { thread: { id: "thread-1" } }),
      onNotification: vi.fn(() => () => {}),
      onServerRequest: vi.fn(() => () => {}),
      onClose: vi.fn(() => () => {}),
    } as unknown as CodexAppServerClient;
    const clientManager = testCodexLeaseManager({
      acquireClient: vi.fn(async () => client), releaseClient: vi.fn(async () => undefined),
    }) as unknown as CodexAppServerClientManager;
    const planner = new CodexWorkspaceSkillRequestPlanner(clientManager);
    const holder = holderFor(gated.materializer, (input) => planner.plan(input));
    await prepare(holder, "code-review");
    const manager = new CodexThreadManager(clientManager, { registerThread: vi.fn(() => () => {}) } as unknown as CodexClientThreadRouter);
    const context = new AgentRunContext({
      runId: "run-a",
      config: new AgentRunConfig({ runtimeKind: RuntimeKind.CODEX_APP_SERVER, agentDefinitionId: "def", llmModelIdentifier: "",
        autoExecuteTools: false, workspaceId: workspace, memoryDir: null, llmConfig: null }),
      runtimeContext: new CodexAgentRunContext({ workspaceSkills: holder, codexThreadConfig: {
        model: null, workingDirectory: workspace, reasoningEffort: null, serviceTier: null,
        approvalPolicy: CodexApprovalPolicy.ON_REQUEST, sandbox: "workspace-write", baseInstructions: null,
        developerInstructions: null, appServerConfig: null, dynamicTools: [],
      } }),
    });
    const thread = await manager.createThread(context, () => undefined);
    const backend = new CodexAgentRunBackend(context, thread, manager, activatedAgentToolMcpRunSessionsStub("run-a"));
    return { gated, client, manager, context, thread, backend };
  };

  it("AC-012: the backend links it into .codex/skills (Codex does not discover it); the thread release releases it", async () => {
    const world = await codexWorld(async () => ({ data: [{ cwd: workspace, skills: [] }] }));

    await world.backend.applyDefinitionSkills(definition("code-review", "deep-research"));
    expect(await fs.realpath(linkIn(profile, "deep-research"))).toBe(catalog.get("deep-research")!.rootPath);
    expect(world.client.request).toHaveBeenCalledWith("skills/list", { cwds: [workspace], forceReload: true });

    await world.manager.terminateThread("run-a", world.thread);
    expect(await exists(linkIn(profile, "deep-research"))).toBe(false);
    expect(await exists(linkIn(profile, "code-review"))).toBe(false);
  });

  it("AR-001: a release that starts while the add waits for `skills/list` links nothing and leaves no holder", async () => {
    let answer!: (value: unknown) => void;
    const world = await codexWorld(() => new Promise((resolve) => { answer = resolve; }));

    const adding = world.backend.applyDefinitionSkills(definition("code-review", "deep-research"));
    await vi.waitFor(() => expect(world.client.request).toHaveBeenCalledWith("skills/list", expect.anything()));
    const releasing = world.manager.releasePreparation(world.context);
    answer({ data: [{ cwd: workspace, skills: [] }] });
    await Promise.all([adding, releasing]);

    expect(world.backend.isActive()).toBe(false);
    expect(await exists(linkIn(profile, "deep-research"))).toBe(false);
    expect(await exists(linkIn(profile, "code-review"))).toBe(false);
    await expectNoHolderLeft(world.gated.materializer, profile, "deep-research");
  });
});

describe("Grok (ACP): a skill added mid-run", () => {
  const profile = GROK_WORKSPACE_SKILL_MATERIALIZATION_PROFILE;

  const startGrokRun = async () => {
    const gated = gatedMaterializer(profile);
    const factory = new AcpAgentRunBackendFactory({
      launchProfile: fakeAcpLaunchProfile("Fake Grok", () => ({ FAKE_ACP_FIXTURE: fixturePath("prompt"), FAKE_ACP_REPORT_MCP_READY: "1" })),
      integrationRunAccess: null, providerRelayAccess: null,
      sessionProfile: grokBuildSessionProfile,
      definitions: { getAgentDefinitionById: vi.fn(async () => definition("code-review")) } as never,
      skills: skillService as never,
      workspaces: { resolveWorkingDirectory: vi.fn(async () => workspace) },
      mcpSessions: createAgentToolMcpRunSessionsStub() as never,
      skillMaterializer: gated.materializer,
    });
    const config = new AgentRunConfig({ agentDefinitionId: "def", llmModelIdentifier: "test-model", autoExecuteTools: false,
      workspaceId: "test-workspace", memoryDir: path.join(root, "memory"), runtimeKind: RuntimeKind.GROK_BUILD });
    const backend = await factory.beginPreparation({ kind: "new", config, runId: "grok-run" }).prepare();
    expect(await exists(linkIn(profile, "code-review"))).toBe(true);
    return { gated, backend };
  };

  it("AC-012: the backend links it into .grok/skills; terminate releases it with the run's other links", async () => {
    const { backend } = await startGrokRun();

    await backend.applyDefinitionSkills(definition("code-review", "deep-research"));
    expect(await fs.realpath(linkIn(profile, "deep-research"))).toBe(catalog.get("deep-research")!.rootPath);

    await backend.terminate();
    expect(await exists(linkIn(profile, "deep-research"))).toBe(false);
    expect(await exists(linkIn(profile, "code-review"))).toBe(false);
  });

  it("AR-001: terminate during the add waits for it and leaves no link and no holder", async () => {
    const { gated, backend } = await startGrokRun();
    gated.close();

    const adding = backend.applyDefinitionSkills(definition("code-review", "deep-research"));
    await vi.waitFor(() => expect(gated.waiting).toHaveBeenCalledOnce());
    const terminating = backend.terminate();
    await new Promise((resolve) => setTimeout(resolve, 20));
    gated.open();
    await Promise.all([adding, terminating]);

    expect(await exists(linkIn(profile, "deep-research"))).toBe(false);
    expect(await exists(linkIn(profile, "code-review"))).toBe(false);
    await expectNoHolderLeft(gated.materializer, profile, "deep-research");
  });
});
