import "reflect-metadata";
import { afterEach, describe, expect, it, vi } from "vitest";
import { agentRunCollaborationTreeDtoSchema, agentOrgExecutionTreeDtoSchema, CollaborationStreamServerMessageSchema } from "@autobyteus/collaboration-stream-contracts";
import { agentProjectionTree, orgProjectionTree } from "../../../fixtures/collaboration-public-projection-fixtures.js";
import { projectAgentCollaborationView, projectAgentCollaborationEvent } from "../../../../src/services/agent-streaming/agent-collaboration-view-projector.js";
import { projectAgentOrgExecutionSnapshot, projectAgentOrgExecutionEvent } from "../../../../src/services/agent-streaming/agent-org-execution-view-projector.js";
import { StandaloneRootExecutionIndex } from "../../../../src/standalone-agent-run-root/services/standalone-root-execution-index.js";
import { AgentOrgExecutionIndex } from "../../../../src/agent-org-execution/services/agent-org-execution-index.js";
import { AgentCollaborationStreamHandler } from "../../../../src/services/agent-streaming/agent-collaboration-stream-handler.js";
import { AgentOrgStreamHandler } from "../../../../src/services/agent-streaming/agent-org-stream-handler.js";
import { RootEventPublisher } from "../../../../src/agent-collaboration/execution/services/root-event-publisher.js";
import type { StandaloneRootEvent } from "../../../../src/standalone-agent-run-root/domain/standalone-root-event.js";
import { AgentRunCollaborationResolver } from "../../../../src/api/graphql/types/agent-run-collaboration.js";
import { AgentOrgRunService } from "../../../../src/agent-org-execution/services/agent-org-run-service.js";
import { bindProcessStandaloneAgentRunRootManager, releaseProcessStandaloneAgentRunRootManager } from "../../../../src/standalone-agent-run-root/services/standalone-agent-run-root-manager.js";

import { createCollaborationMemberExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

const packageSnapshot = <T>(tree: T, kind: "agent" | "agent_org") => ({
  tree, messages: kind === "agent"
    ? { schemaVersion: 1 as const, subjectKind: "agent" as const, hostRunId: "manager", messages: [] }
    : { schemaVersion: 1 as const, subjectKind: "agent_org" as const, orgRunId: "org-root", messages: [] },
  statuses: [], inputStates: [],
});
const setup = (kind: "agent" | "agent_org", linked = true) => {
  const tree = kind === "agent" ? agentProjectionTree(linked) : orgProjectionTree(linked);

  const run = { orgRunId: "org-root", isActive: () => true, isHostLive: () => true,
    ensureHostReady: async () => undefined, getExecutionTreeSnapshot: () => tree };
  const index = kind === "agent" ? new StandaloneRootExecutionIndex(tree as ReturnType<typeof agentProjectionTree>)
    : new AgentOrgExecutionIndex(tree as ReturnType<typeof orgProjectionTree>);
  const snapshot = { ...packageSnapshot(tree, kind), statuses: index.listAgents().filter(agent => kind !== "agent" || agent.agentRunId !== "manager").map(agent => ({
    execution: createCollaborationMemberExecutionIdentity({ root: index.root, memberAddress: agent.address, agentRunId: agent.agentRunId }),
    details: { status: "idle" as const, trigger: null, errorMessage: null, recoverableBlock: null }, statusHint: "IDLE" as const,
  })) };
  const projectView = () => kind === "agent"
    ? projectAgentCollaborationView({ hostRunId: "manager", isActive: true, snapshot: snapshot as never, baseChangeSequence: 7 })
    : projectAgentOrgExecutionSnapshot({ orgRunId: "org-root", isActive: true, snapshot: snapshot as never, baseChangeSequence: 7 });
  const projectEvent = (event: StandaloneRootEvent) => kind === "agent"
    ? projectAgentCollaborationEvent("manager", tree as ReturnType<typeof agentProjectionTree>, { event, changeSequence: 8 })
    : projectAgentOrgExecutionEvent(run as never, { event, changeSequence: 8 });
  return { tree, snapshot, index, run, projectView, projectEvent };
};
afterEach(() => vi.restoreAllMocks());

describe.each(["agent", "agent_org"] as const)("%s camel-case public projection", kind => {
  it("keeps the entire public nested forest and identity; dev-residue Task stamps never reach the current tree (C-1)", () => {
    const current = setup(kind), before = JSON.stringify(current.tree), view = current.projectView();
    const publicTree = view.root_subject_kind === "agent" ? view.root_agent.execution_tree : view.root_org.execution_tree;
    // Unstamped current trees already ARE the strict public shape. Exact equality
    // catches dropped children, members, sources, settings or identity fields.
    expect(publicTree).toEqual(kind === "agent"
      ? agentRunCollaborationTreeDtoSchema.parse(agentProjectionTree(false))
      : agentOrgExecutionTreeDtoSchema.parse(orgProjectionTree(false)));
    expect(JSON.stringify(publicTree)).not.toContain("taskLifetime");
    expect(JSON.stringify(current.tree)).toBe(before);
    expect(before).not.toContain("taskLifetime");
    expect(JSON.stringify(current.tree)).toBe(JSON.stringify(setup(kind, false).tree));
  });
  it.each(["solo-copy", "packet-copy", "nested-task-team", "nested-helper", "follow-on-agent", "follow-on-team", "review-helper", "shared-helper"])("projects the actual indexed started execution %s", id => {
    const current = setup(kind), unlinked = setup(kind, false);
    const reference = id.endsWith("team") || id === "packet-copy" ? { teamRunId: id } : { agentRunId: id };
    const indexed = current.index.getTaskExecution(reference)!;
    expect(indexed, id).toBeTruthy();
    const event = { kind: "task_execution_started" as const, host: indexed.host, taskExecution: reference };
    expect(current.projectEvent(event)).toEqual(unlinked.projectEvent(event));
    expect(current.projectEvent(event)).toMatchObject({ change_sequence: 8, event: {
      kind: "task_execution_started", host_kind: indexed.host.hostKind, host_run_id: indexed.host.hostRunId,
      execution: unlinked.index.getTaskExecution(reference)!.source,
    } });
    expect(indexed.source).not.toHaveProperty("taskLifetime");
  });
  it("projects collaborator events recursively without exposing lifetime ownership", () => {
    const current = setup(kind), unlinked = setup(kind, false);
    const entries = current.tree.subjectKind === "agent" ? current.tree.collaborators : current.tree.rootOrg.collaborators;
    const publicEntries = unlinked.tree.subjectKind === "agent" ? unlinked.tree.collaborators : unlinked.tree.rootOrg.collaborators;
    entries.forEach((collaborator, i) => expect(current.projectEvent({ kind: "collaborator_added", collaborator }))
      .toMatchObject({ event: { kind: "collaborator_added", collaborator: publicEntries[i] } }));
  });
  it("still rejects invalid public critical fields and missing started references", () => {
    const current = setup(kind);
    expect(() => current.projectEvent({ kind: "task_execution_started", host: current.index.getTaskExecution({ agentRunId: "solo-copy" })!.host,
      taskExecution: { agentRunId: "absent" } })).toThrow(/not in the current execution tree/);
    const entries = current.tree.subjectKind === "agent" ? current.tree.collaborators : current.tree.rootOrg.collaborators;
    expect(() => current.projectEvent({ kind: "collaborator_added", collaborator: { ...entries[0], agentRunId: "" } as never })).toThrow();
  });
  it("streams stamped snapshot/start/collaborator and reconnect through actual subscription boundary without false close1011", async () => {
    const current = setup(kind), publisher = new RootEventPublisher<StandaloneRootEvent>();
    const run = { ...current.run, openPackageSnapshotConnection: () => publisher.openSnapshotConnection(() => current.snapshot) };
    const handler = kind === "agent"
      ? new AgentCollaborationStreamHandler({ resolveRoot: async () => run as never, getActive: () => run as never })
      : new AgentOrgStreamHandler({ getActive: () => run as never, recordRunActivity: async () => undefined });
    const wire: unknown[] = [], close = vi.fn();
    const connection = { send: (raw: string) => wire.push(CollaborationStreamServerMessageSchema.parse(JSON.parse(raw))), close };
    const session = await handler.connect(connection, kind === "agent" ? "manager" : "org-root");
    expect(session, JSON.stringify(wire)).toBeTruthy();
    const indexed = current.index.getTaskExecution({ teamRunId: "packet-copy" })!;
    publisher.publish({ kind: "task_execution_started", host: indexed.host, taskExecution: { teamRunId: "packet-copy" } });
    const entries = current.tree.subjectKind === "agent" ? current.tree.collaborators : current.tree.rootOrg.collaborators;
    publisher.publish({ kind: "collaborator_added", collaborator: entries[1] });
    await Promise.resolve();
    expect(wire).toHaveLength(5);
    expect(wire.at(-2)).toMatchObject({ type: "ROOT_EXECUTION_EVENT", payload: { event: { execution: { teamRunId: "packet-copy" } } } });
    expect(wire.at(-1)).toMatchObject({ type: "ROOT_EXECUTION_EVENT", payload: { event: { collaborator: { teamRunId: "shared-team" } } } });
    expect(close).not.toHaveBeenCalled();
    handler.disconnect(session!);
    const reconnect = await handler.connect(connection, kind === "agent" ? "manager" : "org-root");
    expect(reconnect).toBeTruthy();
    expect(wire.at(-2)).toMatchObject({ type: "ROOT_EXECUTION_VIEW_SNAPSHOT" });
    expect(close).not.toHaveBeenCalled();
    handler.disconnect(reconnect!);
  });
});

it("GraphQL Agent inspection reuses the exact public view without materialization", async () => {
  const current = setup("agent"), inspection = { hostRunId: "manager", isActive: false, snapshot: current.snapshot, baseChangeSequence: 7 };
  const getInspection = vi.fn(async () => inspection), restore = vi.fn();
  const manager = { getInspection, resolveCommandReadyRoot: restore } as never;
  bindProcessStandaloneAgentRunRootManager(manager);
  let result: unknown;
  try { result = await new AgentRunCollaborationResolver().agentRunCollaboration("manager"); }
  finally { releaseProcessStandaloneAgentRunRootManager(manager); }
  expect(result).toEqual(projectAgentCollaborationView(inspection as never));
  expect(getInspection).toHaveBeenCalledWith("manager");
  expect(restore).not.toHaveBeenCalled();
  expect(JSON.stringify(current.tree)).not.toContain("taskLifetime");
});

it("Org GraphQL inspection service reuses strict public snapshot projection without restoring", async () => {
  const current = setup("agent_org"), inspection = { orgRunId: "org-root", isActive: false,
    snapshot: { ...current.snapshot, statuses: [] }, baseChangeSequence: 7 };
  const getInspection = vi.fn(async () => inspection), restore = vi.fn();
  const service = new AgentOrgRunService({ manager: { getInspection, restore } } as never);
  expect(await service.getInspection("org-root")).toEqual(projectAgentOrgExecutionSnapshot(inspection as never));
  expect(getInspection).toHaveBeenCalledWith("org-root");
  expect(restore).not.toHaveBeenCalled();
  expect(JSON.stringify(current.tree)).not.toContain("taskLifetime");
});
