import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CollaborationCommunicationMessage } from "../../../../src/agent-collaboration/execution/communication/collaboration-communication-message.js";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentOrgCommunicationMessagesStore } from "../../../../src/agent-org-execution/persistence/agent-org-communication-messages-store.js";
import { AgentOrgRunExecutionTreeStore } from "../../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../../../src/run-history/store/agent-org-run-execution-tree-schema.js";
import {
  AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "../../../../src/run-history/store/atomic-run-package-file-commit-writer.js";
import {
  COORDINATING_LOG,
  messageLogOwnerOf,
  messageLogOwners,
  type MessageLogOwner,
} from "../../../../src/run-history/store/task-agent-message-logs.js";
import { TeamRunExecutionTreeStore } from "../../../../src/run-history/store/team-run-execution-tree-store.js";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import { TeamExecutionIndex } from "../../../../src/agent-team-execution/services/team-execution-index.js";
import { TeamCommunicationStore } from "../../../../src/services/team-communication/team-communication-store.js";
import { emptyStandaloneRootTree } from "../../../../src/standalone-agent-run-root/domain/standalone-root-tree.js";
import { StandaloneRootPackageStore } from "../../../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { validateStandaloneRootTreePayload } from "../../../../src/standalone-agent-run-root/persistence/standalone-root-tree-schema.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgLaunchConfiguration } from "../../../fixtures/current-agent-org-run-fixtures.js";

/** Design D-4, contract §3.4: each message is stored with the run(s) it belongs to (the email model). */

const T = (second: number) => `2026-10-17T09:00:${String(second).padStart(2, "0")}.000Z`;
const launch = testOrgLaunchConfiguration("/workspace");
const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});
const message = (messageId: string, senderAgentRunId: string, receiverAgentRunId: string, second: number): CollaborationCommunicationMessage => ({
  messageId, senderAgentRunId, receiverAgentRunId, content: messageId, messageType: "agent_message", referenceFiles: [], createdAt: T(second),
});
const ids = (log: { messages: readonly { messageId: string }[] } | null) => log?.messages.map((entry) => entry.messageId);
const readLog = async (file: string) => (JSON.parse(await fs.readFile(file, "utf8")) as { messages: { messageId: string }[] }).messages.map((entry) => entry.messageId);

const agentCopy = (agentRunId: string, delegatorAgentRunId: string) => ({
  address: "/helper", agentRunId, platformAgentRunId: null, delegatorAgentRunId, startedAt: T(0),
  source: { kind: "agent", agentDefinitionId: "helper", launchConfiguration: launch },
});
const teamCopy = (teamRunId: string, delegatorAgentRunId: string) => ({
  address: "/squad", teamRunId, delegatorAgentRunId, startedAt: T(0), taskExecutions: [],
  members: [
    { address: "/squad/lead", agentRunId: `${teamRunId}-lead`, platformAgentRunId: null },
    { address: "/squad/designer", agentRunId: `${teamRunId}-designer`, platformAgentRunId: null },
  ],
  source: { kind: "agent_team", teamDefinitionId: "squad", coordinatorAddress: "/squad/lead", handoffs: [], defaultLaunchConfiguration: launch,
    members: [{ address: "/squad/lead", agentDefinitionId: "lead" }, { address: "/squad/designer", agentDefinitionId: "designer" }] },
});

const teamRun = async () => {
  const memory = await fs.mkdtemp(path.join(os.tmpdir(), "task-agent-logs-team-")); roots.push(memory);
  const dir = new AgentMemoryLayout(memory).getTeamDirPath({ rootTeamRunId: "team-root", ancestorTeamRunIds: [] });
  const base = testExecutionTree({ rootTeamRunId: "team-root", coordinatorAddress: "/lead",
    children: [testAgentNode("/lead", { agentRunId: "lead-run" }), testAgentNode("/worker", { agentRunId: "worker-run" })] });
  const tree = validateTeamRunExecutionTreePayload({ ...base, rootTeam: { ...base.rootTeam,
    taskExecutions: [agentCopy("copy-run", "lead-run"), teamCopy("tt", "lead-run")] } }, "team-root");
  const trees = new TeamRunExecutionTreeStore();
  const messages = new TeamCommunicationStore();
  await trees.write(dir, tree);
  await messages.write(dir, { schemaVersion: 1, rootTeamRunId: "team-root", messages: [] });
  const index = new TeamExecutionIndex(tree);
  const ownerOf = (agentRunId: string): MessageLogOwner => messageLogOwnerOf(agentRunId, index.getMemoryPlacementForAgent(agentRunId));
  const send = (entry: CollaborationCommunicationMessage, store = messages) =>
    store.appendMessage(dir, "team-root", entry, messageLogOwners(entry, ownerOf));
  return {
    memory, dir, tree, trees, messages, send,
    files: {
      run: path.join(dir, "team_communication_messages.json"),
      copy: path.join(memory, "agents", "copy-run", "communication_messages.json"),
      team: path.join(memory, "agent_teams", "tt", "team_communication_messages.json"),
    },
  };
};

describe("per-run message logs of a team run (D-4, contract §3.4)", () => {
  it("stores a message once within one run and in both runs' logs across runs, receiver's log first", async () => {
    const f = await teamRun();
    const writes = vi.spyOn(AtomicRunPackageFileCommitWriter.prototype, "write");
    const m1 = message("m1", "lead-run", "copy-run", 1);   // run part → task agent
    const m2 = message("m2", "tt-lead", "tt-designer", 2);  // inside one task agent team
    const m3 = message("m3", "copy-run", "tt-lead", 3);     // task agent → task agent team member
    const m4 = message("m4", "lead-run", "worker-run", 4);  // parts of the team run
    for (const entry of [m1, m2, m3, m4]) expect((await f.send(entry)).outcome).toBe("committed");
    expect(writes.mock.calls.map(([input]) => path.relative(f.memory, input.filePath))).toEqual([
      "agents/copy-run/communication_messages.json", "agent_teams/team-root/team_communication_messages.json",
      "agent_teams/tt/team_communication_messages.json",
      "agent_teams/tt/team_communication_messages.json", "agents/copy-run/communication_messages.json",
      "agent_teams/team-root/team_communication_messages.json",
    ]);
    expect(await readLog(f.files.run)).toEqual(["m1", "m4"]);
    expect(await readLog(f.files.copy)).toEqual(["m1", "m3"]);
    expect(await readLog(f.files.team)).toEqual(["m2", "m3"]);
    // The stored view: each message once, in createdAt order.
    expect(ids(await f.messages.read(f.dir, f.tree))).toEqual(["m1", "m2", "m3", "m4"]);
    // A repeated commit finds the message present and writes nothing.
    writes.mockClear();
    expect((await f.send(m1)).outcome).toBe("committed");
    expect(writes).not.toHaveBeenCalled();
  });

  it("shows only messages whose endpoints are loaded; the logs keep the rest (L6)", async () => {
    const f = await teamRun();
    for (const entry of [message("m1", "lead-run", "copy-run", 1), message("m2", "tt-lead", "tt-designer", 2), message("m3", "copy-run", "tt-lead", 3)]) await f.send(entry);
    await fs.rename(path.join(f.memory, "agent_teams", "tt"), path.join(f.memory, "tt-moved-away"));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const composed = (await f.trees.read(f.dir, "team-root"))!;
    expect(composed.rootTeam.taskExecutions.map((task) => "agentRunId" in task ? task.agentRunId : task.teamRunId)).toEqual(["copy-run"]);
    expect(ids(await f.messages.read(f.dir, composed))).toEqual(["m1"]);
    expect(await readLog(f.files.copy)).toEqual(["m1", "m3"]);
  });

  it("reports a later log's failure after an earlier log is durable as indeterminate (fail-stop, V-11)", async () => {
    const f = await teamRun();
    let calls = 0;
    const secondFails = new (class extends AtomicRunPackageFileCommitWriter {
      override async write(input: Parameters<AtomicRunPackageFileCommitWriter["write"]>[0]): Promise<RunPackageFileWriteResult<any>> {
        calls += 1;
        if (calls === 2) return { outcome: "not_renamed", file: input.file, stage: "rename", cause: new Error("disk full") };
        return super.write(input);
      }
    })();
    const result = await f.send(message("m1", "lead-run", "copy-run", 1), new TeamCommunicationStore(secondFails));
    expect(result).toMatchObject({ outcome: "renamed_finalization_indeterminate", file: "communication_messages" });
    expect(await readLog(f.files.copy)).toEqual(["m1"]);
    // Nothing durable yet: the first log's failure is reported as not committed.
    calls = 1;
    expect(await f.send(message("m2", "lead-run", "worker-run", 2), new TeamCommunicationStore(secondFails)))
      .toMatchObject({ outcome: "not_renamed" });
  });

  it("puts the receiver's log first and stores a message within one run once", () => {
    const owners: Record<string, MessageLogOwner> = { a: COORDINATING_LOG, b: COORDINATING_LOG, c: { kind: "task_agent", agentRunId: "c" } };
    expect(messageLogOwners({ senderAgentRunId: "a", receiverAgentRunId: "b" }, (id) => owners[id]!)).toEqual([COORDINATING_LOG]);
    expect(messageLogOwners({ senderAgentRunId: "a", receiverAgentRunId: "c" }, (id) => owners[id]!)).toEqual([owners.c, COORDINATING_LOG]);
  });
});

describe("per-run message logs of standalone and organization runs (AC-014)", () => {
  it("keeps a standalone host's messages with a task agent in both logs and composes them once", async () => {
    const memory = await fs.mkdtemp(path.join(os.tmpdir(), "task-agent-logs-agent-")); roots.push(memory);
    const dir = new AgentMemoryLayout(memory).getAgentRunCollaborationDirPath("host");
    const tree = validateStandaloneRootTreePayload({ ...emptyStandaloneRootTree({ host: { address: "/assistant" as never, agentRunId: "host", agentDefinitionId: "assistant" }, createdAt: T(0) }),
      taskExecutions: [agentCopy("copy-run", "host")] }, "host");
    const store = new StandaloneRootPackageStore();
    await store.writeTree(dir, tree);
    await store.writeMessages(dir, { schemaVersion: 1, subjectKind: "agent", hostRunId: "host", messages: [] });
    const owners = (id: string): MessageLogOwner => id === "host" ? COORDINATING_LOG : { kind: "task_agent", agentRunId: id };
    const entry = message("m1", "copy-run", "host", 1);
    expect((await store.appendMessage(dir, "host", entry, messageLogOwners(entry, owners))).outcome).toBe("committed");
    expect(await readLog(path.join(dir, "communication_messages.json"))).toEqual(["m1"]);
    expect(await readLog(path.join(memory, "agents", "copy-run", "communication_messages.json"))).toEqual(["m1"]);
    expect(ids(await store.readMessages(dir, tree))).toEqual(["m1"]);
  });

  it("keeps an organization agent's messages with a task agent team member in both logs and composes them once", async () => {
    const memory = await fs.mkdtemp(path.join(os.tmpdir(), "task-agent-logs-org-")); roots.push(memory);
    const dir = new AgentMemoryLayout(memory).getOrgDirPath("org-root");
    const base = testAgentOrgExecutionTree({ orgRunId: "org-root", members: [testOrgAgentNode("/director", "director-run")] });
    const tree = validateAgentOrgRunExecutionTreePayload({ ...base, rootOrg: { ...base.rootOrg, taskExecutions: [teamCopy("tt", "director-run")] } }, "org-root");
    await new AgentOrgRunExecutionTreeStore().write(dir, tree);
    const store = new AgentOrgCommunicationMessagesStore();
    await store.write(dir, { schemaVersion: 1, subjectKind: "agent_org", orgRunId: "org-root", messages: [] });
    const owners = (id: string): MessageLogOwner => id === "director-run" ? COORDINATING_LOG : { kind: "task_agent_team", teamRunId: "tt" };
    const entry = message("m1", "director-run", "tt-lead", 1);
    expect((await store.appendMessage(dir, "org-root", entry, messageLogOwners(entry, owners))).outcome).toBe("committed");
    expect(await readLog(path.join(dir, "agent_org_communication_messages.json"))).toEqual(["m1"]);
    expect(await readLog(path.join(memory, "agent_teams", "tt", "team_communication_messages.json"))).toEqual(["m1"]);
    expect(ids(await store.read(dir, tree))).toEqual(["m1"]);
  });
});
