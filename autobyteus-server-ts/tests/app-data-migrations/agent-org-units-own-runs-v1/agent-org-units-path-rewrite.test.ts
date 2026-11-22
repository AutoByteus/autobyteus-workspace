import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentOrgUnitsOwnRunsV1AppDataMigration } from "../../../src/app-data-migrations/migrations/agent-org-units-own-runs-v1/agent-org-units-own-runs-v1-app-data-migration.js";
import { createAgentOrgUnitsMigrations } from "../../../src/app-data-migrations/migrations/agent-org-units-own-runs-v1/agent-org-units-follow-ups.js";
import { planLogSplit, removeOrgLog, writeUnitLogs } from "../../../src/app-data-migrations/migrations/agent-org-units-own-runs-v1/org-log-split.js";
import { AgentOrgReferenceContentService } from "../../../src/agent-org-execution/services/agent-org-reference-content-service.js";
import { TeamCommunicationProjectionService } from "../../../src/services/team-communication/team-communication-projection-service.js";
import { TeamCommunicationContentService } from "../../../src/services/team-communication/team-communication-content-service.js";
import { MessageLog } from "../../../src/run-history/store/message-log.js";
import { BETA7, ORG, PDP, SET, writeBeta7CrossNodeOrg } from "../../fixtures/app-data-migrations/released-org-tree-v1-fixtures.js";

/**
 * org-teams-follow-definition SR-017 (typed paths follow a renamed member folder) and SR-018 (the node pass always
 * completes; the container file is the one completion marker, written last): hand-built released Orgs as
 * `v1.5.14-beta.7` wrote them, never real data or a copy of it (TESTING.md).
 */
const roots: string[] = [];
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
type World = { appData: string; memory: string };
const world = async (): Promise<World> => {
  const appData = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "org-units-paths-")));
  roots.push(appData);
  return { appData, memory: path.join(appData, "memory") };
};
const terminal = { getRecord: async () => ({ status: "SUCCEEDED" }) } as never;
const names = { agentDefinitionName: vi.fn(async () => null), teamDefinitionName: vi.fn(async () => null) };
const migration = (w: World, ledger = terminal) => new AgentOrgUnitsOwnRunsV1AppDataMigration(w.appData, w.memory, names, null, { ledger });
const lines = async (file: string) => (await fs.readFile(file, "utf8")).split("\n").filter(Boolean).map((line) => JSON.parse(line) as Record<string, any>);
const exists = (file: string) => fs.access(file).then(() => true, () => false);
const orgFile = (w: World) => path.join(w.memory, "agent_orgs", ORG, "agent_org_run_execution_tree.json");
const isContainer = async (w: World) => Array.isArray(JSON.parse(await fs.readFile(orgFile(w), "utf8")).rootOrg.units);

/** Where each fixture file is after the conversion. */
const moved = (w: World) => {
  const reviewer = path.join(w.memory, "agent_teams", SET, "code_reviewer_1");
  const concierge = path.join(w.memory, "agents", "concierge_1");
  return {
    reviewer, concierge,
    spec: path.join(reviewer, "received_files", "peer_lead_1", "spec.md"),
    notes: path.join(reviewer, "notes.md"),
    brief: path.join(concierge, "received_files", "peer_lead_2", "brief.pdf"),
    picture: path.join(concierge, "received_files", "peer_lead_2", "picture.png"),
  };
};

/** Every file under the app data folder, with its bytes (a third start must change none). */
const snapshot = async (dir: string): Promise<Map<string, string>> => {
  const files = new Map<string, string>();
  for (const entry of await fs.readdir(dir, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile()) continue;
    const file = path.join(entry.parentPath, entry.name);
    files.set(path.relative(dir, file), createHash("sha256").update(await fs.readFile(file)).digest("hex"));
  }
  return files;
};

/** The Org view's records (its units' logs, each message once), as the Org route reads a stopped container's. */
const orgRecords = (w: World) => ({
  getCollaborationRecordsSnapshot: async () => {
    const logs = await Promise.all([
      new MessageLog(path.join(w.memory, "agent_teams", SET), "team_communication_messages").read(),
      new MessageLog(path.join(w.memory, "agent_teams", PDP), "team_communication_messages").read(),
      new MessageLog(path.join(w.memory, "agents", "concierge_1"), "communication_messages").read(),
    ]);
    return { messages: { messages: [...new Map(logs.flatMap((log) => log ?? []).map((line) => [line.messageId, line])).values()] } };
  },
});
const read = async (stream: NodeJS.ReadableStream) => { let text = ""; for await (const chunk of stream) text += String(chunk); return text; };
const orgReferenceId = (messageId: string, file: string) => createHash("sha256").update(`${messageId}\0${file}`).digest("hex");

describe("SR-017: stored typed paths follow a renamed member folder (beta.7 cross-node files)", () => {
  it("every typed entry names the new folder, where the file is; the Org route and the units' readers open it; prose and foreign paths stay", async () => {
    const w = await world();
    const old = await writeBeta7CrossNodeOrg(w.appData, w.memory);
    await expect(migration(w).execute()).resolves.toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 1, failedCount: 0 } });
    const at = moved(w);
    for (const file of [at.spec, at.notes, at.brief, at.picture]) expect(await exists(file), file).toBe(true);

    // Message logs: the Team unit's and the agent unit's (from the Org log), the delegated run's (active and sealed).
    const team = await lines(path.join(w.memory, "agent_teams", SET, "team_communication_messages_active.jsonl"));
    expect(team.find((line) => line.messageId === "m_peer_member")).toMatchObject({ referenceFiles: [at.spec], counterpart: { nodeId: BETA7.peerNode } });
    expect(team.find((line) => line.messageId === "m_foreign")!.referenceFiles).toEqual([BETA7.foreign]);
    const concierge = await lines(path.join(at.concierge, "communication_messages_active.jsonl"));
    expect(concierge.find((line) => line.messageId === "m_peer_agent")!.referenceFiles).toEqual([at.brief, at.picture]);
    expect(concierge.find((line) => line.messageId === "m_foreign")!.referenceFiles).toEqual([BETA7.foreign]);
    const delegated = path.join(w.memory, "agents", "delegated_writer_1");
    expect((await lines(path.join(delegated, "communication_messages_active.jsonl")))[0]!.referenceFiles).toEqual([at.notes, at.spec]);
    expect((await lines(path.join(delegated, "communication_messages_000001.jsonl")))[0]!.referenceFiles).toEqual([at.notes]);
    // The ad-hoc Task, in its store's shape.
    const task = JSON.parse(await fs.readFile(path.join(w.appData, "ad-hoc-tasks", "task_cross", "task.json"), "utf8"));
    expect(task).toEqual({ taskId: "task_cross", description: "Review the spec.", referenceFiles: [at.spec], status: "IN_PROGRESS",
      createdAt: expect.any(String), updatedAt: expect.any(String) });
    // Traces: the typed fields follow; the prose is the record of what the agent saw, unchanged.
    const reviewerTrace = await lines(path.join(at.reviewer, "raw_traces_active.jsonl"));
    expect(reviewerTrace[0]!.file_attachments).toEqual([{ uri: at.spec, file_type: "text", file_name: "spec.md" }]);
    expect(reviewerTrace[0]!.content).toContain(old.spec);
    expect(reviewerTrace[1]!.content).toBe(`I read ${old.spec}.`);
    expect((await lines(path.join(at.reviewer, "raw_traces_000001.jsonl")))[0]!.file_attachments[0].uri).toBe(at.notes);
    const conciergeTrace = (await lines(path.join(at.concierge, "raw_traces_active.jsonl")))[0]!;
    expect(conciergeTrace).toMatchObject({ media: { images: [at.picture] }, file_attachments: [{ uri: at.brief }] });
    expect(conciergeTrace.content).toContain(old.brief);

    // The Org view's message reference opens through the Org route, for both units.
    const orgRoute = new AgentOrgReferenceContentService(orgRecords(w));
    for (const [messageId, file, bytes] of [["m_peer_member", at.spec, "SPEC BYTES"], ["m_peer_agent", at.brief, "BRIEF BYTES"]] as const) {
      const resolved = await orgRoute.resolveCommunication({ orgRunId: ORG, messageId, referenceId: orgReferenceId(messageId, file) });
      expect(await read(resolved.stream)).toBe(bytes);
    }
    // Each unit's own reader opens it: the Team run's projection, and the agent run's records.
    const teamProjection = new TeamCommunicationProjectionService({ memoryDir: w.memory, teamRunManager: { getManagedTeamRun: () => null } as never });
    const teamContent = await new TeamCommunicationContentService(teamProjection).resolveContent({ teamRunId: SET, messageId: "m_peer_member",
      referenceId: orgReferenceId("m_peer_member", at.spec) });
    expect(teamContent.absolutePath).toBe(at.spec);
    const agentRoute = new AgentOrgReferenceContentService({ getCollaborationRecordsSnapshot: async () =>
      ({ messages: { messages: (await new MessageLog(at.concierge, "communication_messages").read()) ?? [] } }) });
    const picture = await agentRoute.resolveCommunication({ orgRunId: "concierge_1", messageId: "m_peer_agent", referenceId: orgReferenceId("m_peer_agent", at.picture) });
    expect(await read(picture.stream)).toBe("PNG BYTES");
  });

  it("a re-run changes no byte; a file naming no moved Org is never parsed (byte pre-check)", async () => {
    const w = await world();
    await writeBeta7CrossNodeOrg(w.appData, w.memory);
    // A run outside the Org whose trace is not even valid JSON: never parsed, because it names no moved Org.
    await fs.mkdir(path.join(w.memory, "agents", "unrelated_1"), { recursive: true });
    await fs.writeFile(path.join(w.memory, "agents", "unrelated_1", "raw_traces_active.jsonl"), "not json at all\n");
    await expect(migration(w).execute()).resolves.toMatchObject({ status: "SUCCEEDED" });
    const after = await snapshot(w.appData);
    await expect(migration(w).execute()).resolves.toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 0 } });
    expect(await snapshot(w.appData)).toEqual(after);
    // A follow-up (its pass also over converted Orgs) changes nothing either.
    const followUp = createAgentOrgUnitsMigrations(w.appData, w.memory, names, null, terminal)
      .find((candidate) => candidate.id === "20261122_agent_org_units_after_raw_trace_active_file_name")!;
    await expect(followUp.execute()).resolves.toMatchObject({ status: "SUCCEEDED" });
    expect(await snapshot(w.appData)).toEqual(after);
  });
});

describe("SR-018: the container file is written last, after the node pass", () => {
  /** The state an attempt interrupted after the renames left: units moved, the released tree still in place. */
  const interruptedAfterRenames = async (w: World, withUnitLogs: boolean) => {
    const orgDir = path.join(w.memory, "agent_orgs", ORG);
    const agents = new Map([
      ["solution_designer_1", { unitRunId: SET, unitDir: path.join(w.memory, "agent_teams", SET), logName: "team_communication_messages" as const, orgAddress: "/software_engineering_team/solution_designer" }],
      ["code_reviewer_1", { unitRunId: SET, unitDir: path.join(w.memory, "agent_teams", SET), logName: "team_communication_messages" as const, orgAddress: "/software_engineering_team/code_reviewer" }],
      ["product_prototyper_1", { unitRunId: PDP, unitDir: path.join(w.memory, "agent_teams", PDP), logName: "team_communication_messages" as const, orgAddress: "/product_design_prototyping_team/product_prototyper" }],
      ["concierge_1", { unitRunId: "concierge_1", unitDir: path.join(w.memory, "agents", "concierge_1"), logName: "communication_messages" as const, orgAddress: "/concierge" }],
    ]);
    const split = withUnitLogs ? await planLogSplit(orgDir, agents) : null;
    await fs.mkdir(path.join(w.memory, "agent_teams"), { recursive: true });
    await fs.mkdir(path.join(w.memory, "agents"), { recursive: true });
    await fs.rename(path.join(orgDir, SET), path.join(w.memory, "agent_teams", SET));
    await fs.rename(path.join(orgDir, "concierge_1"), path.join(w.memory, "agents", "concierge_1"));
    // Step 4 follows every rename (steps 2–3): with it done, every unit is moved.
    if (split) { await fs.rename(path.join(orgDir, PDP), path.join(w.memory, "agent_teams", PDP)); await writeUnitLogs(split); await removeOrgLog(orgDir); }
  };

  it.each([
    ["without step 4 (the Org log still in place)", false],
    ["with step 4 done (unit logs written with the old paths, the Org log removed)", true],
  ])("interrupted after a unit's rename and before the pass, %s: the retry moves every typed path; a third start changes no byte", async (_case, withUnitLogs) => {
    const w = await world();
    await writeBeta7CrossNodeOrg(w.appData, w.memory);
    await interruptedAfterRenames(w, withUnitLogs);
    expect(await isContainer(w)).toBe(false);
    const retried = await migration(w).execute();
    expect(retried, JSON.stringify(retried.summary.details)).toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 1 } });
    const at = moved(w);
    expect((await lines(path.join(w.memory, "agent_teams", SET, "team_communication_messages_active.jsonl"))).find((line) => line.messageId === "m_peer_member")!
      .referenceFiles).toEqual([at.spec]);
    expect((await lines(path.join(at.concierge, "communication_messages_active.jsonl"))).find((line) => line.messageId === "m_peer_agent")!
      .referenceFiles).toEqual([at.brief, at.picture]);
    expect((await lines(path.join(at.reviewer, "raw_traces_active.jsonl")))[0]!.file_attachments[0].uri).toBe(at.spec);
    expect(JSON.parse(await fs.readFile(path.join(w.appData, "ad-hoc-tasks", "task_cross", "task.json"), "utf8")).referenceFiles).toEqual([at.spec]);
    expect(await isContainer(w)).toBe(true);
    const after = await snapshot(w.appData);
    await expect(migration(w).execute()).resolves.toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 0 } });
    expect(await snapshot(w.appData)).toEqual(after);
  });

  it("a pass that fails leaves the released tree: the container file appears only after a pass that succeeded", async () => {
    const w = await world();
    await writeBeta7CrossNodeOrg(w.appData, w.memory);
    // The first attempt's pass cannot write the ad-hoc Task (the write throws once).
    const realRename = fs.rename.bind(fs);
    let failed = false;
    vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      if (!failed && String(to).endsWith(path.join("task_cross", "task.json"))) { failed = true; throw new Error("disk full"); }
      return realRename(from, to);
    });
    const first = await migration(w).execute();
    expect(first).toMatchObject({ status: "FAILED", summary: { failedCount: 1 } });
    expect(first.summary.details[0]!.message).toContain("task.json");
    expect(await isContainer(w)).toBe(false);
    // The retry repeats the units (recognized) and the whole pass, then writes the container file.
    await expect(migration(w).execute()).resolves.toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 1 } });
    expect(JSON.parse(await fs.readFile(path.join(w.appData, "ad-hoc-tasks", "task_cross", "task.json"), "utf8")).referenceFiles).toEqual([moved(w).spec]);
    expect(await isContainer(w)).toBe(true);
  });

  it("interrupted after the pass and before the container file: the pass re-runs and changes nothing; the container file is written", async () => {
    const w = await world();
    await writeBeta7CrossNodeOrg(w.appData, w.memory);
    const realRename = fs.rename.bind(fs);
    let failed = false;
    vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      if (!failed && String(to) === orgFile(w)) { failed = true; throw new Error("power lost"); }
      return realRename(from, to);
    });
    await expect(migration(w).execute()).resolves.toMatchObject({ status: "FAILED" });
    expect(await isContainer(w)).toBe(false);
    const passed = await snapshot(w.appData);
    await expect(migration(w).execute()).resolves.toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 1 } });
    // Only the container file changed: every other byte is as the first attempt's pass left it.
    const after = await snapshot(w.appData);
    const changed = [...after].filter(([file, digest]) => passed.get(file) !== digest).map(([file]) => file);
    expect(changed).toEqual([path.relative(w.appData, orgFile(w))]);
  });

  it("an Org whose own step fails is isolated; its committed moves are still in the pass (paths point at the moved folders)", async () => {
    const w = await world();
    await writeBeta7CrossNodeOrg(w.appData, w.memory);
    // The PDP folder exists at both places: its rename fails. The units are moved in tree order: SET first (moved), then
    // PDP (fails), so the agent unit is not moved.
    await fs.mkdir(path.join(w.memory, "agent_teams", PDP), { recursive: true });
    const result = await migration(w).execute();
    expect(result.summary.details).toEqual([expect.objectContaining({ itemId: ORG, status: "FAILED" })]);
    expect(await isContainer(w)).toBe(false);
    // The pass ran with the one real move (SET): its paths point at the moved folder; the agent unit's stay where it still is.
    const at = moved(w);
    expect((await lines(path.join(at.reviewer, "raw_traces_active.jsonl")))[0]!.file_attachments[0].uri).toBe(at.spec);
    expect((await lines(path.join(w.memory, "agents", "delegated_writer_1", "communication_messages_active.jsonl")))[0]!.referenceFiles).toEqual([at.notes, at.spec]);
    const conciergeTrace = (await lines(path.join(w.memory, "agent_orgs", ORG, "concierge_1", "raw_traces_active.jsonl")))[0]!;
    expect(conciergeTrace.media.images).toEqual([path.join(w.memory, "agent_orgs", ORG, "concierge_1", "received_files", "peer_lead_2", "picture.png")]);
  });

  it("a path writer predecessor not terminal: the Org waits as it is; its late output is converted by its follow-up", async () => {
    const w = await world();
    await writeBeta7CrossNodeOrg(w.appData, w.memory);
    const pending = { getRecord: async (id: string) => ({ status: id === "20260707_raw_trace_active_file_name" ? "FAILED" : "SUCCEEDED" }) } as never;
    const waited = await migration(w, pending).execute();
    expect(waited.summary.details[0]!.message).toContain("waiting_for_20260707_raw_trace_active_file_name");
    expect(await isContainer(w)).toBe(false);
    expect(await exists(path.join(w.memory, "agent_orgs", ORG, SET))).toBe(true);
    // The predecessor finishes late: it renames a released raw_traces.jsonl, which names the member's old folder, in place.
    const old = path.join(w.memory, "agent_orgs", ORG, SET, "solution_designer_1");
    await fs.writeFile(path.join(old, "raw_traces_active.jsonl"), `${JSON.stringify({ id: "s1", trace_type: "user", content: "Late.",
      file_attachments: [{ uri: path.join(w.memory, "agent_orgs", ORG, SET, "code_reviewer_1", "notes.md"), file_type: "text", file_name: "notes.md" }] })}\n`);
    const followUp = createAgentOrgUnitsMigrations(w.appData, w.memory, names, null, terminal)
      .find((candidate) => candidate.id === "20261122_agent_org_units_after_raw_trace_active_file_name")!;
    await expect(followUp.execute()).resolves.toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 1 } });
    expect(await isContainer(w)).toBe(true);
    const late = await lines(path.join(w.memory, "agent_teams", SET, "solution_designer_1", "raw_traces_active.jsonl"));
    expect(late[0]!.file_attachments[0].uri).toBe(moved(w).notes);
  });

  it("a writer's follow-up over a converted Org: a file written late with an old prefix is moved (moves from the container file)", async () => {
    const w = await world();
    await writeBeta7CrossNodeOrg(w.appData, w.memory);
    await expect(migration(w).execute()).resolves.toMatchObject({ status: "SUCCEEDED" });
    // Late output of a writer predecessor after the conversion (e.g. a rotation that moved an archived trace).
    const at = moved(w);
    await fs.writeFile(path.join(at.concierge, "raw_traces_000002.jsonl"), `${JSON.stringify({ id: "c0", trace_type: "user", content: "Rotated late.",
      media: { images: [path.join(w.memory, "agent_orgs", ORG, "concierge_1", "received_files", "peer_lead_2", "picture.png")] } })}\n`);
    const followUp = createAgentOrgUnitsMigrations(w.appData, w.memory, names, null, terminal)
      .find((candidate) => candidate.id === "20261122_agent_org_units_after_raw_trace_rotation_layout")!;
    await expect(followUp.execute()).resolves.toMatchObject({ status: "SUCCEEDED" });
    expect((await lines(path.join(at.concierge, "raw_traces_000002.jsonl")))[0]!.media.images).toEqual([at.picture]);
  });
});

describe("SR-018 cost: one node pass", () => {
  it("is measured on the synthetic large Org with a synthetic node of many runs (sizes assumed: no user data is read)", async () => {
    const w = await world();
    const launch = { runtimeKind: "codex_app_server", llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/w" };
    // The synthetic large Org: 10 Teams of 4 agents, 40,000 log lines (~9 MB), each member's folder with a 256 KB trace.
    const orgDir = path.join(w.memory, "agent_orgs", "large_org");
    const members = Array.from({ length: 10 }, (_, team) => ({ address: `/team_${team}`, teamDefinitionId: `team-${team}`, role: null, description: null,
      teamRunId: `team_run_${team}`, coordinatorAddress: `/team_${team}/a0`, defaultLaunchConfiguration: launch,
      members: Array.from({ length: 4 }, (_, agent) => ({ address: `/team_${team}/a${agent}`, agentDefinitionId: "a", role: null, description: null,
        agentRunId: `agent_${team}_${agent}`, platformAgentRunId: null, launchConfiguration: launch })) }));
    await fs.mkdir(orgDir, { recursive: true });
    await fs.writeFile(path.join(orgDir, "agent_org_run_execution_tree.json"), JSON.stringify({ subjectKind: "agent_org", createdAt: "2026-01-01T00:00:00.000Z",
      archivedAt: null, applicationBinding: null, handoffs: [], rootOrg: { address: "/", orgDefinitionId: "o", orgDefinitionName: "O", orgRunId: "large_org",
        defaultLaunchConfiguration: launch, members } }));
    const received = (team: number, agent: number) => path.join(orgDir, `team_run_${team}`, `agent_${team}_${agent}`, "received_files", "peer", "f.md");
    const logLines = Array.from({ length: 40_000 }, (_, index) => JSON.stringify({ messageId: `m${index}`, senderAgentRunId: `agent_${index % 10}_0`,
      receiverAgentRunId: `agent_${(index + 1) % 10}_${index % 4}`, content: "x".repeat(200), messageType: "handoff",
      referenceFiles: index % 100 === 0 ? [received((index + 1) % 10, index % 4)] : [], createdAt: "2026-01-01T00:00:00.000Z" }));
    await fs.writeFile(path.join(orgDir, "agent_org_communication_messages_active.jsonl"), `${logLines.join("\n")}\n`);
    const trace = (count: number, file: string | null) => Array.from({ length: count }, (_, index) => `${JSON.stringify(index === 0 && file
      ? { id: `t${index}`, trace_type: "user", content: "y".repeat(240), file_attachments: [{ uri: file, file_type: "text", file_name: "f.md" }] }
      : { id: `t${index}`, trace_type: "assistant", content: "y".repeat(240) })}\n`).join("");
    for (const team of members) {
      for (const [agent, member] of team.members.entries()) {
        await fs.mkdir(path.dirname(received(Number(team.teamRunId.slice(9)), agent)), { recursive: true });
        await fs.writeFile(path.join(orgDir, team.teamRunId, member.agentRunId, "raw_traces_active.jsonl"), trace(1000, received(Number(team.teamRunId.slice(9)), agent)));
      }
    }
    // The rest of the node: 200 agent runs and 30 Team runs of 4 members (each with a 256 KB trace and a 64 KB log); 1 in 20
    // names an Org member's file (so it is parsed), the others do not (byte pre-check only).
    for (let run = 0; run < 200; run += 1) {
      const dir = path.join(w.memory, "agents", `run_${run}`);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "raw_traces_active.jsonl"), trace(1000, run % 20 === 0 ? received(run % 10, 0) : null));
      await fs.writeFile(path.join(dir, "communication_messages_active.jsonl"), Array.from({ length: 250 }, (_, index) => `${JSON.stringify({ messageId: `r${run}_${index}`,
        senderAgentRunId: `run_${run}`, receiverAgentRunId: "x", content: "z".repeat(200), messageType: "agent_message", referenceFiles: [], createdAt: "2026-01-01T00:00:00.000Z" })}\n`).join(""));
    }
    for (let team = 0; team < 30; team += 1) {
      for (let member = 0; member < 4; member += 1) {
        const dir = path.join(w.memory, "agent_teams", `node_team_${team}`, `node_member_${team}_${member}`);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, "raw_traces_active.jsonl"), trace(1000, null));
      }
    }
    const started = performance.now();
    await expect(migration(w).execute()).resolves.toMatchObject({ status: "SUCCEEDED" });
    const elapsedMs = performance.now() - started;
    // Recorded as evidence (implementation handoff): the conversion with its one node pass.
    process.stdout.write(`[org-units-path-pass-cost] large Org (10 Teams, 40 agents, 40000 lines) + 200 agent runs + 120 Team members (~140 MB): ${Math.round(elapsedMs)} ms\n`);
    expect((await lines(path.join(w.memory, "agents", "run_0", "raw_traces_active.jsonl")))[0]!.file_attachments[0].uri)
      .toBe(path.join(w.memory, "agent_teams", "team_run_0", "agent_0_0", "received_files", "peer", "f.md"));
    expect(elapsedMs).toBeLessThan(120_000);
  }, 180_000);
});
