import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, vi } from "vitest";
import { projectAgentOrgConfiguredAgentNode, projectAgentOrgConfiguredTeamNode } from "../../../../src/agent-org-execution/services/agent-org-runtime-config-projector.js";
import type { TeamRunAgentTeamNode } from "../../../../src/agent-team-execution/domain/team-run-config.js";
import { AgentOrgRun } from "../../../../src/agent-org-execution/domain/agent-org-run.js";
import type { AgentOrgRunEvent } from "../../../../src/agent-org-execution/domain/agent-org-run-event.js";
import { RootTeamExecutionDirectory } from "../../../../src/agent-collaboration/execution/backends/root-team-execution-directory.js";
import { RootAgentExecutionRegistry } from "../../../../src/agent-collaboration/execution/backends/root-agent-execution-registry.js";
import { AgentOrgRunPersistenceCoordinator } from "../../../../src/agent-org-execution/services/agent-org-run-persistence-coordinator.js";
import { AgentOrgRunExecutionTreeStore } from "../../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { AgentOrgCommunicationMessagesStore } from "../../../../src/agent-org-execution/persistence/agent-org-communication-messages-store.js";
import { FlatTeamExecutionFactory } from "../../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import type { FlatTeamExecutionCallbacks } from "../../../../src/agent-team-execution/local/flat-team-execution-callbacks.js";
import { RootEventPublisher } from "../../../../src/agent-collaboration/execution/services/root-event-publisher.js";
import { createAgentOrgRootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";
import type { TaskExecutionIdleTimers } from "../../../../src/agent-collaboration/execution/task/task-execution-idle-shutdown-schedule.js";
import { TokenUsageMigrationReadiness } from "../../../../src/token-usage/providers/token-usage-migration-readiness.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../../fixtures/current-agent-org-run-fixtures.js";
import { flushMicrotasks, observeConfiguredHandles } from "./task-publication-handles.js";

/**
 * A real AgentOrg root (persistence on a temp dir, root agent registry, root team directory) with
 * observed fake configured-agent handles and a manual idle clock: a director, a worker and a
 * configured Team at '/target'.
 */
const directories: string[] = [];
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(directories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });

/** Controllable clock for the idle grace period. */
export const manualTimers = () => {
  const pending = new Map<number, { callback: () => void; delayMs: number }>();
  let next = 0;
  const timers: TaskExecutionIdleTimers = {
    setTimeout: (callback, delayMs) => { const id = ++next; pending.set(id, { callback, delayMs }); return id; },
    clearTimeout: (handle) => { pending.delete(handle as number); },
  };
  return {
    timers,
    pendingCount: () => pending.size,
    delays: () => [...pending.values()].map((entry) => entry.delayMs),
    fireAll: () => { const due = [...pending.values()]; pending.clear(); due.forEach((entry) => entry.callback()); },
  };
};

export const buildOrg = async (kind: "agent" | "team") => {
  vi.spyOn(TokenUsageMigrationReadiness.prototype, "assertCurrentSchemaReady").mockImplementation(() => undefined);
  const handles = observeConfiguredHandles();
  const root = createAgentOrgRootExecutionIdentity(`org-idle-shutdown-${kind}`);
  const orgMemoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "org-idle-shutdown-")); directories.push(orgMemoryDir);
  const tree = testAgentOrgExecutionTree({ orgRunId: root.rootRunId, members: [
    testOrgAgentNode("/director", "director"), testOrgAgentNode("/worker", "configured-worker"),
    testOrgTeamNode({ address: "/target", teamRunId: "configured-team", coordinatorAddress: "/target/lead",
      members: [testOrgAgentNode("/target/lead", "configured-lead")] }),
  ] });
  const messages = { schemaVersion: 1 as const, subjectKind: "agent_org" as const, orgRunId: root.rootRunId, messages: [] };
  const executionTreeStore = new AgentOrgRunExecutionTreeStore();
  const failStop = vi.fn();
  const persistence = new AgentOrgRunPersistenceCoordinator({ orgRunId: root.rootRunId, orgMemoryDir,
    executionTreeStore, communicationStore: new AgentOrgCommunicationMessagesStore(), enterPersistenceFailStop: failStop });
  await persistence.commitInitial({ tree, messages });
  let run: AgentOrgRun | undefined;
  const callbacks: FlatTeamExecutionCallbacks = {
    buildMemberExecutionContext: vi.fn(async () => ({} as never)), commitPlatformBindingChange: vi.fn(),
    publishAgentEvent: (identity, event) => run?.onAgentExecutionEvent(identity, event),
  };
  const rootAgents = new RootAgentExecutionRegistry({ root, callbacks });
  const teams = new RootTeamExecutionDirectory(new FlatTeamExecutionFactory());
  for (const member of tree.rootOrg.members) {
    if ("agentRunId" in member) {
      (await rootAgents.prepareConfigured(projectAgentOrgConfiguredAgentNode(member), "fresh")).commitAfterDurability();
    } else {
      (await teams.prepareConfigured({ teamNode: projectAgentOrgConfiguredTeamNode(member), handoffs: [],
        physicalScope: { root, ancestorTeamRunIds: [member.teamRunId] }, callbacks, activationMode: "fresh" })).commitAfterDurability();
    }
  }
  const publisher = new RootEventPublisher<AgentOrgRunEvent>();
  const published: AgentOrgRunEvent[] = [];
  publisher.subscribe(({ event }) => published.push(event));
  const clock = manualTimers();
  const inspect = vi.fn(() => ({ kind: "present" as const }));
  let allocation = 0;
  run = new AgentOrgRun({ root, tree, messages, rootAgents, teams, callbacks, persistence, publisher,
    taskExecutionIdentity: {
      agentRuns: { allocateForAgentDefinition: async () => `task-agent-${++allocation}` },
      taskTeams: { create: async ({ source }: { source: TeamRunAgentTeamNode }) => {
        const id = `task-team-${++allocation}`;
        return { teamNode: { ...source, teamRunId: id,
          children: source.children.map((child) => ({ ...child, agentRunId: `${id}-lead`, platformAgentRunId: null })) } };
      } },
    } as never,
    activityInspector: { inspect } as never,
    taskExecutionIdleShutdown: { gracePeriodMs: () => 600_000, timers: clock.timers },
    taskExecutionResources: new InMemoryTaskExecutionResources(),
  });
  run.activate();
  const owner = run;
  const lifecycle = (owner as unknown as { taskExecutions: { drain(): Promise<void> } }).taskExecutions;
  const drain = async () => {
    for (let i = 0; i < 3; i += 1) { await flushMicrotasks(); await lifecycle.drain(); }
  };
  return { handles, root, orgMemoryDir, executionTreeStore, failStop, rootAgents, teams, published, clock, inspect, owner, drain };
};

