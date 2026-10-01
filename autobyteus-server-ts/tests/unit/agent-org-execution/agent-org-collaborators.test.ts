import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CollaborationStreamServerMessageSchema, type CollaborationStreamServerMessage } from "@autobyteus/collaboration-stream-contracts";
import { collaboratorMentionNote } from "@autobyteus/agent-presentation-contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/agent-team-definition.js";
import { createCollaboratorMentionAdmission } from "../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import { prepareCollaboratorHandles } from "../../../src/agent-collaboration/execution/backends/collaborator-handle-preparation.js";
import type { RunModelSelectionValidator } from "../../../src/llm-management/services/run-model-selection-service.js";
import { AgentOrgStreamHandler } from "../../../src/services/agent-streaming/agent-org-stream-handler.js";
import { projectAgentOrgConfiguredAgentNode, projectAgentOrgConfiguredTeamNode } from "../../../src/agent-org-execution/services/agent-org-runtime-config-projector.js";
import type { TeamRunAgentTeamNode } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { AgentOrgRun } from "../../../src/agent-org-execution/domain/agent-org-run.js";
import type { AgentOrgRunEvent } from "../../../src/agent-org-execution/domain/agent-org-run-event.js";
import { RootTeamExecutionDirectory } from "../../../src/agent-collaboration/execution/backends/root-team-execution-directory.js";
import { RootAgentExecutionRegistry } from "../../../src/agent-collaboration/execution/backends/root-agent-execution-registry.js";
import { AgentOrgRunPersistenceCoordinator } from "../../../src/agent-org-execution/services/agent-org-run-persistence-coordinator.js";
import { AgentOrgRunExecutionTreeStore } from "../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { AgentOrgCommunicationMessagesV1Store } from "../../../src/agent-org-execution/persistence/agent-org-communication-messages-v1-store.js";
import { FlatTeamExecutionFactory } from "../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import type { FlatTeamExecutionCallbacks } from "../../../src/agent-team-execution/local/flat-team-execution-callbacks.js";
import { RootEventPublisher } from "../../../src/agent-collaboration/execution/services/root-event-publisher.js";
import { createAgentOrgRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { TokenUsageMigrationReadiness } from "../../../src/token-usage/providers/token-usage-migration-readiness.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";
import { flushMicrotasks, observeConfiguredHandles } from "./helpers/task-publication-handles.js";

const directories: string[] = [];
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(directories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });

const validator = (runnable = true) => ({
  validate: vi.fn(),
  validateMany: vi.fn(async (inputs: readonly unknown[]) => inputs.map(() => runnable
    ? { kind: "valid" as const, selection: { llmModelIdentifier: "m", llmConfig: null } }
    : { kind: "model_unavailable" as const })),
}) as unknown as RunModelSelectionValidator;

const admission = (runnable = true) => {
  const agents = [
    new AgentDefinition({ id: "definition-director", name: "Director", description: "d", instructions: "x" }),
    new AgentDefinition({ id: "code-reviewer", name: "Code Reviewer", description: "Reviews", instructions: "x" }),
    new AgentDefinition({ id: "designer", name: "Designer", description: "Designs", instructions: "x" }),
  ];
  const teams = [new AgentTeamDefinition({
    id: "product-team", name: "Product Team", description: "Product", instructions: "x",
    nodes: [new TeamMember({ memberName: "designer", ref: "designer", refScope: "shared" })],
    coordinatorMemberName: "designer", handoffs: [],
  })];
  return createCollaboratorMentionAdmission({
    listAgentDefinitions: async () => agents,
    listTeamDefinitions: async () => teams,
    getAgentDefinition: async (id) => agents.find((agent) => agent.id === id) ?? null,
    getTeamDefinition: async (id) => teams.find((team) => team.id === id) ?? null,
  }, validator(runnable));
};

const buildOrg = async (options: { runnable?: boolean } = {}) => {
  vi.spyOn(TokenUsageMigrationReadiness.prototype, "assertCurrentSchemaReady").mockImplementation(() => undefined);
  const handles = observeConfiguredHandles();
  const root = createAgentOrgRootExecutionIdentity("org-collaborators");
  const orgMemoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "org-collaborators-")); directories.push(orgMemoryDir);
  const tree = testAgentOrgExecutionTree({ orgRunId: root.rootRunId, members: [
    { ...testOrgAgentNode("/director", "director"), agentDefinitionId: "definition-director" },
    testOrgTeamNode({ address: "/target", teamRunId: "configured-team", coordinatorAddress: "/target/lead",
      members: [testOrgAgentNode("/target/lead", "configured-lead")] }),
  ] });
  const messages = { schemaVersion: 1 as const, subjectKind: "agent_org" as const, orgRunId: root.rootRunId, messages: [] };
  const executionTreeStore = new AgentOrgRunExecutionTreeStore();
  const persistence = new AgentOrgRunPersistenceCoordinator({ orgRunId: root.rootRunId, orgMemoryDir,
    executionTreeStore, communicationStore: new AgentOrgCommunicationMessagesV1Store(), enterPersistenceFailStop: vi.fn() });
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
  let allocation = 0;
  run = new AgentOrgRun({ root, tree, messages, rootAgents, teams, callbacks, persistence, publisher,
    taskExecutionIdentity: {
      agentRuns: { allocateForAgentDefinition: async () => `task-agent-${++allocation}` },
      taskTeams: { create: async ({ source }: { source: TeamRunAgentTeamNode }) => {
        const id = `task-team-${++allocation}`;
        return { teamNode: { ...source, teamRunId: id,
          children: source.children.map((child) => ({ ...child, agentRunId: `${id}-${child.address.split("/").at(-1)}`, platformAgentRunId: null })) } };
      } },
    } as never,
    activityInspector: { inspect: vi.fn(() => ({ kind: "present" as const })) } as never,
    collaboratorAdmission: admission(options.runnable ?? true),
    prepareCollaboratorHandles: (entries) => prepareCollaboratorHandles({ root, rootAgents, teams, teamCallbacks: callbacks, entries, mode: "fresh" }),
  });
  run.activate();
  return { handles, root, orgMemoryDir, executionTreeStore, owner: run, rootAgents, teams, publisher };
};

describe("collaborators brought into an AgentOrg run with @", () => {
  it("admits mentions on SEND_MESSAGE, streams collaborator_added and posts the composed note", async () => {
    const f = await buildOrg();
    const wire: CollaborationStreamServerMessage[] = [];
    const stream = new AgentOrgStreamHandler({ getActive: () => f.owner, recordRunActivity: vi.fn() });
    const session = await stream.connect({ send: (raw) => wire.push(CollaborationStreamServerMessageSchema.parse(JSON.parse(raw))), close: vi.fn() }, f.root.rootRunId);
    await stream.handleMessage(session!, JSON.stringify({ type: "SEND_MESSAGE", payload: {
      root_subject_kind: "agent_org", root_run_id: f.root.rootRunId, target_agent_run_id: "director", command_id: "c1",
      content: "Ask @Product Team", context_file_paths: [], image_urls: [], message_id: "m1", dedupe_key: "d1",
      mentions: [{ kind: "agent_team", definition_id: "product-team" }],
    } }));
    await flushMicrotasks();
    const added = wire.filter((message) => message.type === "ROOT_EXECUTION_EVENT" && message.payload.event.kind === "collaborator_added");
    expect(added).toHaveLength(1);
    const posted = f.handles.get("director")!.handle.postMessage.mock.calls[0]![0] as { content: string };
    expect(collaboratorMentionNote.parse(posted.content)?.collaborators).toEqual([{ name: "Product Team", kind: "agent_team", address: "/product_team" }]);
    const durable = await f.executionTreeStore.read(f.orgMemoryDir, f.root.rootRunId);
    expect(durable!.rootOrg.collaborators.map((entry) => entry.address)).toEqual(["/product_team"]);
    expect(wire.at(-1)).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { state: "accepted" } });

    await stream.handleMessage(session!, JSON.stringify({ type: "SEND_MESSAGE", payload: {
      root_subject_kind: "agent_org", root_run_id: f.root.rootRunId, target_agent_run_id: "director", command_id: "c2",
      content: "Ask the director", context_file_paths: [], image_urls: [], message_id: "m2", dedupe_key: "d2",
      mentions: [{ kind: "agent", definition_id: "definition-director" }],
    } }));
    expect(wire.at(-1)).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: {
      state: "rejected", code: "COLLABORATOR_ADD_FAILED", collaborator_name: "Director", message: "Director is already in this run.",
    } });
  });

  it("hosts each collaborator once at admission, Offline, and reaches it by address (DI-001)", async () => {
    const f = await buildOrg();
    await f.owner.admitCollaboratorMentions({ focusedAgentRunId: "director", content: "x", mentions: [
      { kind: "agent", definitionId: "code-reviewer" }, { kind: "agent_team", definitionId: "product-team" },
    ] });
    const [reviewer, product] = f.owner.getExecutionTreeSnapshot().rootOrg.collaborators;
    if (reviewer?.kind !== "agent" || product?.kind !== "agent_team") throw new Error("collaborators were not added");
    // Hosted handles exist before any message; nothing has started.
    expect(f.rootAgents.get(reviewer.agentRunId)).not.toBeNull();
    expect(f.teams.get(product.teamRunId)?.isActive()).toBe(true);
    const offline = f.owner.getAgentStatusSnapshots().filter((snapshot) =>
      [reviewer.agentRunId, product.members[0]!.agentRunId].includes(snapshot.execution.agentRunId));
    expect(offline.map((snapshot) => snapshot.details.status)).toEqual(["offline", "offline"]);
    // Message resolution: one execution per address.
    expect(f.owner.resolveMessageRecipient("/code_reviewer").receiver.agentRunId).toBe(reviewer.agentRunId);
    expect(f.owner.resolveMessageRecipient("/product_team")).toMatchObject({ kind: "agent_team", receiver: { address: "/product_team/designer" } });
    expect(f.owner.resolveMessageRecipient("/product_team/designer").receiver.agentRunId).toBe(product.members[0]!.agentRunId);
    // send_message_to by address starts the collaborator Agent and delivers.
    const director = f.handles.get("director")!.input.identity;
    await expect(f.owner.deliverLogicalMessage(director, { recipientAddress: "/code_reviewer", content: "Please review" }))
      .resolves.toMatchObject({ accepted: true });
    expect(f.handles.get(reviewer.agentRunId)!.handle.reserveInput).toHaveBeenCalledTimes(1);
    // ...and a collaborator Team member, through its hosted TeamRun.
    await expect(f.owner.deliverLogicalMessage(director, { recipientAddress: "/product_team", content: "Design it" }))
      .resolves.toMatchObject({ accepted: true });
    expect(f.handles.get(product.members[0]!.agentRunId)!.handle.reserveInput).toHaveBeenCalledTimes(1);
    // Re-mention reuses the same instance.
    await f.owner.admitCollaboratorMentions({ focusedAgentRunId: "director", content: "again", mentions: [{ kind: "agent", definitionId: "code-reviewer" }] });
    expect(f.owner.getExecutionTreeSnapshot().rootOrg.collaborators).toHaveLength(2);
  });

  it("rejects an unrunnable mention without writing, hosting or posting anything", async () => {
    const f = await buildOrg({ runnable: false });
    const events: unknown[] = [];
    f.publisher.subscribe(({ event }) => events.push(event));
    const result = await f.owner.admitCollaboratorMentions({ focusedAgentRunId: "director", content: "x", mentions: [{ kind: "agent_team", definitionId: "product-team" }] });
    expect(result).toMatchObject({ admitted: false, code: "COLLABORATOR_ADD_FAILED", collaboratorName: "Product Team" });
    expect(f.owner.getExecutionTreeSnapshot().rootOrg.collaborators).toEqual([]);
    expect((await f.executionTreeStore.read(f.orgMemoryDir, f.root.rootRunId))!.rootOrg.collaborators).toEqual([]);
    expect(f.teams.list().map((run) => run.teamRunId)).toEqual(["configured-team"]);
    expect(events).toEqual([]);
  });

  it("keeps the Org host rule for extra copies: a mounted-Team member's copy stays under that Team (REQ-013)", async () => {
    const f = await buildOrg();
    await f.owner.admitCollaboratorMentions({ focusedAgentRunId: "configured-lead", content: "x", mentions: [{ kind: "agent", definitionId: "code-reviewer" }] });
    const lead = { identity: createCollaborationMemberExecutionIdentity({ root: f.root, memberAddress: "/target/lead", agentRunId: "configured-lead" }) };
    const director = { identity: f.handles.get("director")!.input.identity };
    await expect(f.owner.delegateTask(lead, { recipient_address: "/code_reviewer", description: "Review" }))
      .resolves.toMatchObject({ target_agent_run_id: expect.any(String) });
    await expect(f.owner.delegateTask(director, { recipient_address: "/code_reviewer", description: "Review too" }))
      .resolves.toMatchObject({ target_agent_run_id: expect.any(String) });
    const tree = f.owner.getExecutionTreeSnapshot();
    const team = tree.rootOrg.members.find((member) => member.address === "/target")!;
    expect("teamRunId" in team && team.taskExecutions.map((task) => task.address)).toEqual(["/code_reviewer"]);
    expect(tree.rootOrg.taskExecutions.map((task) => task.address)).toEqual(["/code_reviewer"]);
  });

  it("offers nothing already in the Org and rejects unmentioned delegation with a reason", async () => {
    const f = await buildOrg();
    const policy = admission().policy;
    const listed = await policy.listCandidates(f.owner.collaboratorPort());
    expect(listed.candidates.map((candidate) => candidate.definitionId)).toEqual(["code-reviewer", "designer", "product-team"]);
    await f.owner.admitCollaboratorMentions({ focusedAgentRunId: "director", content: "x", mentions: [{ kind: "agent_team", definitionId: "product-team" }] });
    // The Team and its member Agents are now in the run.
    expect((await policy.listCandidates(f.owner.collaboratorPort())).candidates.map((candidate) => candidate.definitionId)).toEqual(["code-reviewer"]);
    const director = { identity: f.handles.get("director")!.input.identity };
    await expect(f.owner.delegateTask(director, { recipient_address: "/marketing_team", description: "x" }))
      .resolves.toEqual({ target_agent_run_id: null, message: expect.stringContaining("@") });
  });
});
