import { testViewStreams } from "../helpers/view-streams.js";
import { TeamChangeNoticeSource } from "../../src/agent-team-execution/membership/team-change-notice-source.js";
import { NOT_DELEGATED } from "../helpers/run-collaboration.js";
import { noDelegations, openTaskRecords } from "../helpers/no-delegations.js";
import { testActivationManager } from "./agent-run-preparation-fixtures.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunActivationCandidate } from "../../src/agent-execution/services/agent-run-activation-candidate.js";
import type { AgentRunConfig } from "../../src/agent-execution/domain/agent-run-config.js";
import { RuntimeKind } from "../../src/runtime-management/runtime-kind-enum.js";
import type { PendingRuntimeSwitch } from "../../src/run-history/store/agent-run-metadata-types.js";
import { FlatTeamExecutionFactory } from "../../src/agent-team-execution/local/flat-team-execution-factory.js";
import { materializeTeamRoot } from "../../src/agent-team-execution/services/team-root-materializer.js";
import { MemberExecutionContextBuilder } from "../../src/agent-team-execution/services/member-team-context-builder.js";
import { buildInitialTeamRunExecutionTree } from "../../src/agent-team-execution/services/team-run-execution-tree-builder.js";
import { TeamRunExecutionTreeStore } from "../../src/run-history/store/team-run-execution-tree-store.js";
import type { RunPackageFileWriteResult } from "../../src/run-history/store/atomic-run-package-file-commit-writer.js";
import { testAgentNode, testTeamRunConfig } from "./current-team-run-fixtures.js";
import { NO_FILES_RECEIVED, NO_PEER_CHANNEL, OFFERED_MODEL_EXECUTION_FACTORY } from "../helpers/explicit-host-collaborators.js";
import { AgentRunMemoryLocator } from "../../src/agent-collaboration/execution/services/agent-run-memory-locator.js";

/**
 * A configured root's placement (org-teams-follow-definition: an Org's mounted Team and direct agents are runs of their
 * own, so a Team root is the one configured root; an Org's units are covered by the Team and standalone agent roots).
 */
export type Placement = "standalone_team";
export const placements: readonly Placement[] = ["standalone_team"];
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
  /** autobyteus-348: the second member (the Worker) was saved on `runtimeKind` with this pending switch and no session ID. */
  pendingSwitch?: PendingRuntimeSwitch;
  /** autobyteus-599 (AC-008): a real run manager (as a composition wires it) instead of the controlled preparations. */
  agentRunManager?: unknown;
  /** org-teams-follow-definition SR-016: the Team run is a unit of an Org (its tree's `containedIn`), as a container creates it. */
  containedIn?: Readonly<{ orgRunId: string; address: string }>;
  /** autobyteus-587: the node's received files (a real store) instead of none. */
  receivedFiles?: unknown;
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
  /** Ends the member's latest run (it died); the next input to the member re-activates it. */
  const stops = new Map<string, () => void>();
  const failStop = vi.fn();
  let sequence = 0;
  const prepare = async ({ runId, config, platformAgentRunId }: {
    runId: string; config: AgentRunConfig; platformAgentRunId?: string;
  }) => {
    configs.set(runId, config);
    let listener: ((event: unknown) => void) | null = null;
    let alive = true;
    stops.set(runId, () => { alive = false; });
    const emitIdle = () => listener?.({ eventType: "AGENT_STATUS", runId, payload: { status: "idle" }, statusHint: "IDLE" });
    const run = {
      runId,
      bindExecutionAdmissionFence: vi.fn(),
      getInputStateSnapshot: vi.fn(),
      isActive: () => alive,
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
  const preparations = { newPreparation: vi.fn(prepare), platformPreparation: vi.fn(prepare) };
  const manager = Object.assign(testActivationManager({
    ...preparations,
    restorePreparation: vi.fn((context) => prepare({ runId: context.runId, config: context.config })),
    releaseExactRun: vi.fn(async () => ({ accepted: true })),
  }), preparations);
  const dependencies = {
    agentRunManager: (options.agentRunManager ?? manager) as never,
    memoryLocator: { getMemoryDir: (_placement: unknown, runId: string) => join(memoryDir, runId) } as never,
    activityInspector: { inspect: () => activity.kind === "indeterminate"
      ? { kind: "indeterminate", error: new Error("unreadable") } : { kind: activity.kind } } as never,
  };
  const factory = new FlatTeamExecutionFactory({ executionFactory: OFFERED_MODEL_EXECUTION_FACTORY, ...dependencies });
  const materialize = vi.spyOn(factory, "beginMaterialization");
  const definitions = { getDefinitionById: vi.fn(async () => null) };
  const prefix = "";
  const addresses = ["Coordinator", "Worker", "Unused"].map((name) => `${prefix}/${name}`) as [string, string, string];
  const ids = ["agent-coordinator", "agent-worker", "agent-unused"] as const;
  const actualStore = new TeamRunExecutionTreeStore();
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
  const memberDir = (index: number) => join(memoryDir, ids[index]!);
  const stop = (index: number) => stops.get(ids[index]!)!();
  const common = { configs, manager, activity, abort, publish, acceptInput, write, control, order, materialize, ids, addresses, failStop, memberDir, stop,
    dispose: () => rmSync(memoryDir, { recursive: true, force: true }),
  };
  if (placement === "standalone_team") {
    const config = testTeamRunConfig({ rootTeamRunId: rootId, coordinatorAddress: addresses[0],
      children: addresses.map((address, i) => testAgentNode(address, {
        agentRunId: ids[i]!, runtimeKind, platformAgentRunId: i === 1 && options.pendingSwitch ? null : initialBinding,
        ...(i === 1 && options.pendingSwitch ? { pendingRuntimeSwitch: options.pendingSwitch } : {}),
      })),
    });
    const built = buildInitialTeamRunExecutionTree({ config, teamDefinitionName: "Test Team" });
    const tree = options.containedIn ? { ...built, containedIn: options.containedIn } : built;
    await actualStore.write(memoryDir, tree as never);
    const root = await materializeTeamRoot({ changeNotices: new TeamChangeNoticeSource(), remoteChannel: NO_PEER_CHANNEL, receivedFiles: (options.receivedFiles ?? NO_FILES_RECEIVED) as never, memoryLocator: new AgentRunMemoryLocator({ memoryDir }), delegationIndex: noDelegations(), viewStreams: testViewStreams(), taskRecords: openTaskRecords(),
      config, tree: tree as never,
      messages: { schemaVersion: 1, rootTeamRunId: rootId, messages: [] },
      teamMemoryDir: memoryDir, mode, persistInitialPackage: false, factory,
      memberExecutionContextBuilder: new MemberExecutionContextBuilder(definitions as never, NOT_DELEGATED), executionTreeStore: { write } as never,
      communicationStore: { write: sidecarWrite, appendMessage: sidecarWrite } as never,
      onTerminated: vi.fn(),
    });
    return { ...common, root, memoryDir,
      send: (id: string = ids[1]) => root.postMessage(new AgentInputUserMessage("Continue this conversation"), id),
      statuses: () => root.getLeafAgentStatusSnapshots(),
      members: () => root.getExecutionTreeSnapshot().rootTeam.members,
      reload: async () => (await new TeamRunExecutionTreeStore().read(memoryDir, rootId))!.rootTeam.members,
    };
  }
  throw new Error(`Unknown configured root placement '${placement}'.`);
};
