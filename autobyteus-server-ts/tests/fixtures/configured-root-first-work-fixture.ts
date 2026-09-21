import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunActivationCandidate } from "../../src/agent-execution/services/agent-run-activation-candidate.js";
import type { AgentRunConfig } from "../../src/agent-execution/domain/agent-run-config.js";
import { RuntimeKind } from "../../src/runtime-management/runtime-kind-enum.js";
import { FlatTeamExecutionFactory } from "../../src/agent-team-execution/local/flat-team-execution-factory.js";
import { materializeTeamRoot } from "../../src/agent-team-execution/services/team-root-materializer.js";
import { MemberExecutionContextBuilder } from "../../src/agent-team-execution/services/member-team-context-builder.js";
import { buildInitialTeamRunExecutionTree } from "../../src/agent-team-execution/services/team-run-execution-tree-builder.js";
import { AgentOrgExecutionScopeBuilder } from "../../src/agent-org-execution/services/agent-org-execution-scope-builder.js";
import { AgentOrgRunPersistenceCoordinator } from "../../src/agent-org-execution/services/agent-org-run-persistence-coordinator.js";
import { validateAgentOrgStatePackage } from "../../src/agent-org-execution/services/agent-org-state-package-validator.js";
import { AgentOrgRunExecutionTreeStore } from "../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { TeamRunExecutionTreeStore } from "../../src/run-history/store/team-run-execution-tree-store.js";
import type { RunPackageFileWriteResult } from "../../src/run-history/store/atomic-run-package-file-commit-writer.js";
import { testAgentNode, testTeamRunConfig } from "./current-team-run-fixtures.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "./current-agent-org-run-fixtures.js";

export type Placement = "standalone_team" | "direct_org" | "mounted_team";
export const placements: readonly Placement[] = ["standalone_team", "direct_org", "mounted_team"];
export const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};

/** Actual configured scope, local handles, mutators and root persistence; only provider/activity are controlled. */
export const configuredRootFixture = async (placement: Placement, options: {
  mode?: "fresh" | "restore";
  runtimeKind?: RuntimeKind;
  binding?: string | null;
  activity?: "none" | "present" | "indeterminate";
} = {}) => {
  const memoryDir = mkdtempSync(join(tmpdir(), "configured-first-work-"));
  const mode = options.mode ?? "restore";
  const runtimeKind = options.runtimeKind ?? RuntimeKind.CODEX_APP_SERVER;
  const initialBinding = options.binding === undefined ? "old-thread" : options.binding;
  const activity = { kind: options.activity ?? "none" };
  const order: string[] = [];
  const abort = vi.fn(async () => ({ kind: "aborted" as const }));
  const publish = vi.fn();
  const acceptInput = vi.fn();
  const configs = new Map<string, AgentRunConfig>();
  const failStop = vi.fn();
  let sequence = 0;
  const prepare = async ({ runId, config, platformAgentRunId }: {
    runId: string; config: AgentRunConfig; platformAgentRunId?: string;
  }) => {
    configs.set(runId, config);
    let listener: ((event: unknown) => void) | null = null;
    const emitIdle = () => listener?.({ eventType: "AGENT_STATUS", runId, payload: { status: "idle" }, statusHint: "IDLE" });
    const run = {
      runId,
      isActive: () => true,
      getStatusSnapshot: () => ({ status: "idle" }),
      subscribeToEvents: (callback: (event: unknown) => void) => { listener = callback; return () => { listener = null; }; },
      postUserMessage: async (message: AgentInputUserMessage) => { acceptInput(runId, message); emitIdle(); return { accepted: true }; },
      reserveUserMessage: async (message: AgentInputUserMessage) => ({ reserved: true, reservation: {
        agentRunId: runId, cancel: vi.fn(), commit: () => ({ release: () => { acceptInput(runId, message); emitIdle(); } }),
      } }),
    };
    return new AgentRunActivationCandidate({
      runId, runtimeKind,
      platformAgentRunId: runtimeKind === RuntimeKind.AUTOBYTEUS ? null : platformAgentRunId ?? `new-thread-${++sequence}`,
      publish: () => { order.push(`publish:${runId}`); publish(runId); return run as never; },
      abort,
    });
  };
  const manager = {
    prepareNewAgentRun: vi.fn(prepare),
    prepareRestoreAgentRunFromPlatformState: vi.fn(prepare),
    prepareRestoreAgentRun: vi.fn((context) => prepare({ runId: context.runId, config: context.config })),
  };
  const dependencies = {
    agentRunManager: manager as never,
    memoryLocator: { getLocation: (_scope: unknown, runId: string) => ({ memoryDir: join(memoryDir, runId) }) } as never,
    activityInspector: { inspect: () => activity.kind === "indeterminate"
      ? { kind: "indeterminate", error: new Error("unreadable") } : { kind: activity.kind } } as never,
  };
  const factory = new FlatTeamExecutionFactory(dependencies);
  const materialize = vi.spyOn(factory, "materialize");
  const definitions = { getDefinitionById: vi.fn(async () => null) };
  const taskExecutionIdentity = { agentRuns: { allocateForAgentDefinition: vi.fn() }, taskTeams: { create: vi.fn() } };
  const prefix = placement === "mounted_team" ? "/Team" : "";
  const addresses = ["Coordinator", "Worker", "Unused"].map((name) => `${prefix}/${name}`) as [string, string, string];
  const ids = ["agent-coordinator", "agent-worker", "agent-unused"] as const;
  const actualStore = placement === "standalone_team" ? new TeamRunExecutionTreeStore() : new AgentOrgRunExecutionTreeStore();
  const control: { hold: Promise<void> | null; failure: RunPackageFileWriteResult | null } = { hold: null, failure: null };
  const write = vi.fn(async (dir: string, tree: never) => {
    await control.hold;
    if (control.failure) return control.failure;
    const result = await actualStore.write(dir, tree);
    order.push("durable");
    return result;
  });
  const sidecarWrite = vi.fn(async () => ({ outcome: "committed" as const }));
  const rootId = "test-root";
  const common = { configs, manager, activity, abort, publish, acceptInput, write, control, order, materialize, ids, addresses, failStop,
    dispose: () => rmSync(memoryDir, { recursive: true, force: true }),
  };
  if (placement === "standalone_team") {
    const config = testTeamRunConfig({ rootTeamRunId: rootId, coordinatorAddress: addresses[0],
      children: addresses.map((address, i) => testAgentNode(address, { agentRunId: ids[i]!, runtimeKind, platformAgentRunId: initialBinding })),
    });
    const tree = buildInitialTeamRunExecutionTree({ config, teamDefinitionName: "Test Team" });
    await actualStore.write(memoryDir, tree as never);
    const root = await materializeTeamRoot({
      config, tree, tasks: { schemaVersion: 1, rootTeamRunId: rootId, records: [] },
      messages: { schemaVersion: 1, rootTeamRunId: rootId, messages: [] },
      teamMemoryDir: memoryDir, mode, persistInitialPackage: false, factory,
      memberExecutionContextBuilder: new MemberExecutionContextBuilder(definitions as never),
      taskExecutionIdentity: taskExecutionIdentity as never, executionTreeStore: { write } as never,
      taskRecordsStore: { write: sidecarWrite } as never, communicationStore: { write: sidecarWrite } as never,
      onTerminated: vi.fn(),
    });
    return { ...common, root,
      send: (id: string = ids[1]) => root.postMessage(new AgentInputUserMessage("Continue this conversation"), id),
      statuses: () => root.getLeafAgentStatusSnapshots(),
      members: () => root.getExecutionTreeSnapshot().rootTeam.members,
      reload: async () => (await new TeamRunExecutionTreeStore().read(memoryDir, rootId))!.rootTeam.members,
    };
  }
  const members = addresses.map((address, i) => {
    const member = testOrgAgentNode(address, ids[i]!);
    return { ...member, platformAgentRunId: initialBinding,
      launchConfiguration: { ...member.launchConfiguration, runtimeKind, workspaceRootPath: null } };
  });
  const tree = testAgentOrgExecutionTree({ orgRunId: rootId, members: placement === "direct_org" ? members : [
    testOrgTeamNode({ address: "/Team", teamRunId: "mounted-team", coordinatorAddress: addresses[0], members }),
  ] });
  await actualStore.write(memoryDir, tree as never);
  const state = validateAgentOrgStatePackage({ executionTree: tree,
    taskRecords: { schemaVersion: 1, subjectKind: "agent_org", orgRunId: rootId, records: [] },
    communicationMessages: { schemaVersion: 1, subjectKind: "agent_org", orgRunId: rootId, messages: [] },
  });
  const persistence = new AgentOrgRunPersistenceCoordinator({ orgRunId: rootId, orgMemoryDir: memoryDir,
    executionTreeStore: { write } as never, taskRecordsStore: { write: sidecarWrite } as never,
    communicationStore: { write: sidecarWrite } as never, enterPersistenceFailStop: failStop,
  });
  const root = await new AgentOrgExecutionScopeBuilder({ flatTeamExecutionFactory: factory,
    taskExecutionIdentity: taskExecutionIdentity as never, orgDefinitions: definitions as never, teamDefinitions: definitions as never,
    ...dependencies,
  }).build({ state, persistence, activationMode: mode, persistInitialPackage: false });
  const flatten = (tree: typeof state.executionTree) => tree.rootOrg.members.flatMap((member) => "agentRunId" in member ? [member] : [...member.members]);
  return { ...common, root,
    send: (id: string = ids[1]) => root.executeAgentCommand(id, { kind: "post_message", message: new AgentInputUserMessage("Continue this conversation") }),
    statuses: () => root.getAgentStatusSnapshots(),
    members: () => flatten(root.getExecutionTreeSnapshot()),
    reload: async () => flatten((await new AgentOrgRunExecutionTreeStore().read(memoryDir, rootId))!),
  };
};
