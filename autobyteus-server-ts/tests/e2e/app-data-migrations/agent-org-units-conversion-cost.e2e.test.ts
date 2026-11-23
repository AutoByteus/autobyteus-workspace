import "reflect-metadata";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { afterAll, describe, expect, it } from "vitest";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { builtServerLaunchEnvironment } from "../helpers/built-server-launch-credential.js";
import { faithfulUpgradeLedger, migrationsFrom } from "./helpers/faithful-upgrade-ledger.js";
import { AGENT_ORG_UNITS_OWN_RUNS_V1_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/agent-org-units-own-runs-v1/agent-org-units-own-runs-v1-app-data-migration.js";

/**
 * org-teams-follow-definition (autobyteus-29) SR-018 cost, measured on the BUILT server's startup (`dist/app.js`, the real
 * migration runner and ledger): `20261122_agent_org_units_own_runs_v1` with its one node pass over a large synthetic node.
 * Hand-built synthetic data only (never user data, never read from one); the sizes are assumptions for a heavy desktop
 * install, stated in `LAYOUT` and recorded with the timing:
 *  - two released Orgs: a large one (4 Teams of 5 agents and 2 direct agents; a 30,000-line Org log, 1 in 100 lines with a
 *    reference into a member's `received_files/`), each agent with a 2 MiB active trace and two 4 MiB sealed segments; a
 *    small one (1 Team of 3, 1 agent, 1 MiB traces);
 *  - the rest of the node: 300 agent runs and 60 Team runs of 4 members, each agent with a 1 MiB active trace and a 1 MiB
 *    sealed segment and a 64 KiB message log; 1 run in 25 names a large-Org member's file (parsed), the others not (the byte
 *    pre-check only); 200 ad-hoc Tasks, 1 in 20 naming a member file.
 * The case records the conversion's own `startedAt` → `completedAt` and the first start's wall time; a second start's
 * migration time is the control. Opt-in (about 1.6 GB written): RUN_ORG_CONVERSION_COST_E2E=1.
 * Run: env -i PATH="$PATH" HOME="$(mktemp -d)" TMPDIR="$TMPDIR" RUN_ORG_CONVERSION_COST_E2E=1 \
 *   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/app-data-migrations/agent-org-units-conversion-cost.e2e.test.ts --no-watch
 * ORG_CONVERSION_COST_E2E_EVIDENCE_DIR keeps the receipt. The data root defaults to the temp folder (ORG_CONVERSION_COST_E2E_ROOT).
 */
const enabled = process.env.RUN_ORG_CONVERSION_COST_E2E === "1";
const suite = enabled ? describe : describe.skip;
const serverDir = path.resolve(__dirname, "../../..");
const evidenceDir = process.env.ORG_CONVERSION_COST_E2E_EVIDENCE_DIR?.trim() || null;
const MiB = 1024 * 1024;
const LAYOUT = Object.freeze({ largeOrgTeams: 4, largeOrgTeamSize: 5, largeOrgAgents: 2, orgLogLines: 30_000, orgActiveTraceBytes: 2 * MiB,
  orgSealedSegments: 2, orgSealedBytes: 4 * MiB, nodeAgentRuns: 300, nodeTeamRuns: 60, nodeTeamSize: 4, nodeTraceBytes: MiB, nodeSealedBytes: MiB,
  nodeLogBytes: 64 * 1024, namingEvery: 25, adHocTasks: 200 });
type Rec = Record<string, any>;

suite("SR-018 cost of the Org conversion on the built server's startup (synthetic heavy node)", () => {
  let root = "";
  let child: ChildProcess | null = null;
  let output = "";

  const start = async (label: string) => {
    output += `===== ${label}\n`;
    const began = Date.now();
    child = spawn(process.execPath, [path.join(serverDir, "dist", "app.js"), "--data-dir", root, "--host", "127.0.0.1", "--port", "0"], { cwd: serverDir,
      env: { PATH: process.env.PATH ?? "", HOME: path.join(root, "home"), TMPDIR: process.env.TMPDIR ?? os.tmpdir(), DATABASE_URL: `file:${path.join(root, "db", "production.db")}`,
        LMSTUDIO_HOSTS: "http://127.0.0.1:1", ...builtServerLaunchEnvironment() }, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout!.on("data", (chunk) => { output += String(chunk); });
    child.stderr!.on("data", (chunk) => { output += String(chunk); });
    const from = output.length;
    await until(() => {
      if (child!.exitCode !== null) throw new Error(`${label}: server exited: ${output.slice(-2000)}`);
      return output.slice(from).includes("Server listening on 127.0.0.1:0");
    }, `${label}: server ready`, 1_800_000);
    // The listener that serves GraphQL (a server prints more than one listening address).
    let url = "";
    for (const [, candidate] of output.slice(from).matchAll(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/g)) {
      const probe = await fetch(`${candidate}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: "{__typename}" }) });
      if (probe.ok) { url = candidate!; break; }
    }
    if (!url) throw new Error(`${label}: no listener serves GraphQL`);
    const graphql = async (query: string): Promise<Rec> => (await (await fetch(`${url}/graphql`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }) })).json() as Rec).data;
    return { graphql, readyMs: Date.now() - began };
  };
  const stop = async () => {
    if (!child || child.exitCode !== null) return;
    const exited = new Promise((resolve) => child!.once("exit", resolve));
    child.kill("SIGTERM");
    await exited;
  };

  afterAll(async () => {
    await stop();
    if (evidenceDir) await fsp.writeFile(path.join(evidenceDir, "cost-server-output.log"), output);
    if (root) await fsp.rm(root, { recursive: true, force: true });
  }, 600_000);

  it("COST-01: the conversion and its node pass on a heavy synthetic node; a second start as the control", async () => {
    const base = process.env.ORG_CONVERSION_COST_E2E_ROOT?.trim() || os.tmpdir();
    root = fs.realpathSync(await fsp.mkdtemp(path.join(base, "org-conversion-cost-")));
    const memory = path.join(root, "memory");
    for (const dir of [path.join(root, "home"), path.join(root, "db"), memory]) await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(path.join(root, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    const { neverRan } = await faithfulUpgradeLedger({
      databaseFile: path.join(root, "db", "production.db"),
      firstStart: async () => {
        const fresh = await start("first start (ledger)");
        const ids = ((await fresh.graphql("{getAppDataMigrations{migrationId}}")).getAppDataMigrations as Rec[]).map((entry) => String(entry.migrationId));
        await stop();
        return ids;
      },
      neverRan: migrationsFrom(AGENT_ORG_UNITS_OWN_RUNS_V1_MIGRATION_ID),
    });

    const writtenStarted = Date.now();
    let bytes = 0;
    const write = async (file: string, content: string) => { await fsp.mkdir(path.dirname(file), { recursive: true }); await fsp.writeFile(file, content); bytes += Buffer.byteLength(content); };
    const traceOf = (size: number, file: string | null) => {
      const line = (index: number) => `${JSON.stringify(index === 0 && file ? { id: `t${index}`, trace_type: "user", content: "y".repeat(400), file_attachments: [{ uri: file, file_type: "text", file_name: "f.md" }] }
        : { id: `t${index}`, trace_type: "assistant", content: "y".repeat(400) })}\n`;
      const count = Math.max(1, Math.floor(size / line(1).length));
      return Array.from({ length: count }, (_, index) => line(index)).join("");
    };
    const launch = { runtimeKind: "codex_app_server", llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/w" };
    const agentNode = (address: string, agentRunId: string) => ({ address, agentDefinitionId: "a", role: null, description: null, agentRunId, platformAgentRunId: null, launchConfiguration: launch });
    const writeOrg = async (orgRunId: string, teams: number, teamSize: number, agents: number, logLines: number, active: number, sealed: number, sealedBytes: number) => {
      const orgDir = path.join(memory, "agent_orgs", orgRunId);
      const members: Rec[] = [];
      const memberDirs: Array<{ dir: string; agentRunId: string }> = [];
      for (let team = 0; team < teams; team += 1) {
        const teamRunId = `${orgRunId}_team_${team}`;
        const agentsOf = Array.from({ length: teamSize }, (_, agent) => agentNode(`/team_${team}/a${agent}`, `${orgRunId}_agent_${team}_${agent}`));
        members.push({ address: `/team_${team}`, teamDefinitionId: `team-${team}`, role: null, description: null, teamRunId, coordinatorAddress: `/team_${team}/a0`,
          defaultLaunchConfiguration: launch, members: agentsOf });
        for (const agent of agentsOf) memberDirs.push({ dir: path.join(orgDir, teamRunId, agent.agentRunId), agentRunId: agent.agentRunId });
      }
      for (let agent = 0; agent < agents; agent += 1) {
        const node = agentNode(`/direct_${agent}`, `${orgRunId}_direct_${agent}`);
        members.push(node);
        memberDirs.push({ dir: path.join(orgDir, node.agentRunId), agentRunId: node.agentRunId });
      }
      await write(path.join(orgDir, "agent_org_run_execution_tree.json"), JSON.stringify({ subjectKind: "agent_org", createdAt: "2026-09-01T00:00:00.000Z", archivedAt: null,
        applicationBinding: null, handoffs: [], rootOrg: { address: "/", orgDefinitionId: "o", orgDefinitionName: "O", orgRunId, defaultLaunchConfiguration: launch, members } }));
      const received = memberDirs.map((member) => path.join(member.dir, "received_files", "peer", "f.md"));
      for (const [index, member] of memberDirs.entries()) {
        await write(received[index]!, "RECEIVED");
        await write(path.join(member.dir, "raw_traces_active.jsonl"), traceOf(active, received[index]!));
        for (let segment = 1; segment <= sealed; segment += 1) await write(path.join(member.dir, `raw_traces_${String(segment).padStart(6, "0")}.jsonl`), traceOf(sealedBytes, null));
      }
      await write(path.join(orgDir, "agent_org_communication_messages_active.jsonl"), Array.from({ length: logLines }, (_, index) => `${JSON.stringify({ messageId: `${orgRunId}_m${index}`,
        senderAgentRunId: memberDirs[index % memberDirs.length]!.agentRunId, receiverAgentRunId: memberDirs[(index + 1) % memberDirs.length]!.agentRunId, content: "x".repeat(200),
        messageType: "handoff", referenceFiles: index % 100 === 0 ? [received[(index + 1) % memberDirs.length]!] : [], createdAt: "2026-09-01T00:00:00.000Z" })}\n`).join(""));
      await write(path.join(orgDir, "agent_org_task_delegation_records.json"), JSON.stringify({ schemaVersion: 1, subjectKind: "agent_org", orgRunId, records: [] }));
      return received;
    };
    const largeReceived = await writeOrg("large_org", LAYOUT.largeOrgTeams, LAYOUT.largeOrgTeamSize, LAYOUT.largeOrgAgents, LAYOUT.orgLogLines, LAYOUT.orgActiveTraceBytes,
      LAYOUT.orgSealedSegments, LAYOUT.orgSealedBytes);
    await writeOrg("small_org", 1, 3, 1, 2_000, MiB, 0, 0);
    const logOf = (runId: string, naming: string | null) => {
      const line = (index: number) => `${JSON.stringify({ messageId: `${runId}_${index}`, senderAgentRunId: runId, receiverAgentRunId: "x", content: "z".repeat(200),
        messageType: "agent_message", referenceFiles: index === 0 && naming ? [naming] : [], createdAt: "2026-09-01T00:00:00.000Z" })}\n`;
      return Array.from({ length: Math.floor(LAYOUT.nodeLogBytes / line(1).length) }, (_, index) => line(index)).join("");
    };
    for (let run = 0; run < LAYOUT.nodeAgentRuns; run += 1) {
      const dir = path.join(memory, "agents", `run_${run}`);
      const naming = run % LAYOUT.namingEvery === 0 ? largeReceived[run % largeReceived.length]! : null;
      await write(path.join(dir, "raw_traces_active.jsonl"), traceOf(LAYOUT.nodeTraceBytes, naming));
      await write(path.join(dir, "raw_traces_000001.jsonl"), traceOf(LAYOUT.nodeSealedBytes, null));
      await write(path.join(dir, "communication_messages_active.jsonl"), logOf(`run_${run}`, naming));
    }
    for (let team = 0; team < LAYOUT.nodeTeamRuns; team += 1) {
      for (let member = 0; member < LAYOUT.nodeTeamSize; member += 1) {
        const dir = path.join(memory, "agent_teams", `node_team_${team}`, `node_member_${team}_${member}`);
        await write(path.join(dir, "raw_traces_active.jsonl"), traceOf(LAYOUT.nodeTraceBytes, null));
        await write(path.join(dir, "raw_traces_000001.jsonl"), traceOf(LAYOUT.nodeSealedBytes, null));
      }
      await write(path.join(memory, "agent_teams", `node_team_${team}`, "team_communication_messages_active.jsonl"), logOf(`node_team_${team}`, team % LAYOUT.namingEvery === 0 ? largeReceived[0]! : null));
    }
    for (let task = 0; task < LAYOUT.adHocTasks; task += 1) {
      await write(path.join(root, "ad-hoc-tasks", `task_${task}`, "task.json"), `${JSON.stringify({ taskId: `task_${task}`, description: "Work.",
        referenceFiles: task % 20 === 0 ? [largeReceived[task % largeReceived.length]!] : [], status: "TODO", createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z" }, null, 2)}\n`);
    }
    const writtenMs = Date.now() - writtenStarted;

    let server = await start("upgrade start");
    const first = ((await server.graphql("{getAppDataMigrations{migrationId status summary startedAt completedAt}}")).getAppDataMigrations as Rec[])
      .filter((entry) => neverRan.includes(String(entry.migrationId)));
    const firstReadyMs = server.readyMs;
    await stop();
    server = await start("second start (control)");
    const secondReadyMs = server.readyMs;
    const msOf = (entry: Rec | undefined) => entry?.startedAt && entry?.completedAt ? new Date(entry.completedAt).getTime() - new Date(entry.startedAt).getTime() : null;
    const conversion = first.find((entry) => entry.migrationId === AGENT_ORG_UNITS_OWN_RUNS_V1_MIGRATION_ID);
    const firstMoved = JSON.parse(await fsp.readFile(path.join(memory, "agents", "run_0", "raw_traces_active.jsonl"), "utf8").then((text) => text.split("\n")[0]!)) as Rec;
    const receipt = { layout: LAYOUT, syntheticBytes: bytes, syntheticMiB: Math.round(bytes / MiB), writtenMs, conversion: { ...conversion, durationMs: msOf(conversion) },
      followUps: first.filter((entry) => entry.migrationId !== AGENT_ORG_UNITS_OWN_RUNS_V1_MIGRATION_ID).map((entry) => ({ id: entry.migrationId, status: entry.status, durationMs: msOf(entry) })),
      firstStartReadyMs: firstReadyMs, secondStartReadyMs: secondReadyMs, firstMovedAttachment: firstMoved.file_attachments?.[0]?.uri ?? null };
    process.stdout.write(`[org-conversion-cost] ${JSON.stringify(receipt)}\n`);
    if (evidenceDir) { await fsp.mkdir(evidenceDir, { recursive: true }); await fsp.writeFile(path.join(evidenceDir, "COST-01.json"), JSON.stringify(receipt, null, 2)); }
    expect(conversion).toMatchObject({ status: "SUCCEEDED" });
    expect(first.filter((entry) => entry.status === "FAILED")).toEqual([]);
    expect(receipt.firstMovedAttachment).toBe(path.join(memory, "agent_teams", "large_org_team_0", "large_org_agent_0_0", "received_files", "peer", "f.md"));
  }, 3_600_000);
});
