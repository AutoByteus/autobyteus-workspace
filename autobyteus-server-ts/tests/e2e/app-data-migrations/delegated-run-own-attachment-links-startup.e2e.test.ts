import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import WebSocket from "ws";
import { afterAll, describe, expect, it } from "vitest";
import { segment, type Rec } from "../helpers/collaboration-root-harness.js";
import { createRoot, killBuiltStudios, managerOf, startBuiltStudio, until, type BuiltStudio } from "../helpers/built-studio-roots.js";
import { agentStreamFramesOf, waitConnected } from "../helpers/agent-stream-frames.js";
import { buildE2eClientCommandIds } from "../helpers/websocket-command-helpers.js";

// autobyteus-500 FU-020 (REQ-011, AC-008; design M-1 … M-9): the first start of the release over attachment links a
// release before beta.7 stored for delegated runs (`/rest/agent-collaborations/{host}/agent-runs/{child}/context-files/{f}`).
// Through the BUILT Studio server (`dist/app.js`), real HTTP/GraphQL/WebSocket and real restarts; only the AGY CLI is
// scripted. No user data: the data is made by the product itself, then given the released shape while the server is down.
// - ALM-1: a standalone Agent run delegates an Agent and a Team. The user attaches an image and a text file to the delegated
//   Agent and to the delegated Team's lead (draft upload, finalize, send: the composer's flow), and one more file to the
//   Agent that is later deleted. The current code writes each run's own link (AC-008, first clause). With the server down,
//   every stored own link becomes the released host-scoped link naming the delegator, the deleted file's file goes, and
//   both migrations' ledger rows are removed, as on an install that upgrades from a release before them.
//   Next start: both migrations run in that start (C-6); each converted trace file is byte-identical to what the current
//   code wrote; its backup holds the released bytes; every converted link opens its file through `/rest/runs/…` and
//   `/rest/team-runs/…/agent-runs/…`; the old route is gone; the deleted file's link is kept as it is, with a warning.
//   A second start changes nothing.
// The same data also holds the installed copies of the retired built-in Skill Self-Evolver and Memory Compactor that
// earlier builds left, and a real run of the Memory Compactor (autobyteus-491's `20261118_remove_retired_built_in_agents`,
// released in v1.5.14-beta.1; this ticket's two migrations are `20261119_…`, after it: SR-017, D-15). Two upgrade paths:
// - MO-1, from a release before beta.1: all three are pending. The one first start runs them in the registry's order:
//   491's removal, then the attachment-link migration, then its follow-up.
// - MO-2, from beta.1: 491's removal already ran there (its row SUCCEEDED, the copies gone; emulated by a start of this
//   build with only that row pending). The first start runs only the two `20261119_…` migrations, main then follow-up;
//   491's row is untouched.
// In both: the copies are gone; the compactor's run stays listed and continuing it gets the AGY runtime's own answer for a
// deleted agent ("AGY_AGENT_DEFINITION_MISSING: …"); backups land under the new ID's folder; the second start runs none.
// Prerequisite: `pnpm -C autobyteus-server-ts build` for the current worktree.
// Run: env -i PATH="$PATH" HOME="$(mktemp -d)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/app-data-migrations/delegated-run-own-attachment-links-startup.e2e.test.ts --no-watch
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const MIGRATION = "20261119_delegated_run_own_attachment_links";
const FOLLOW_UP = "20261119_delegated_run_own_attachment_links_after_task_agent_own_run";
const REMOVAL = "20261118_remove_retired_built_in_agents";
const EVOLVER_ID = "autobyteus-skill-evolver";
const COMPACTOR_ID = "autobyteus-memory-compactor";
const PNG = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
  "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082", "hex");
type Attachment = { storedFilename: string; displayName: string; locator: string };

suite("Delegated runs' stored attachment links become their own links at the first start (built server, FU-020)", () => {
  let root = "";
  let server: BuiltStudio | null = null;
  const env = () => ({ ANTIGRAVITY_CLI_COMMAND: cli, AGY_FAKE_CASE: "linked_skills" });

  afterAll(async () => {
    await server?.stop().catch(() => undefined);
    killBuiltStudios();
    if (root) await fs.rm(root, { recursive: true, force: true });
  }, 60_000);

  const memoryDir = () => path.join(root, "memory");
  /** Every raw trace file under memory (active, segments and archived). */
  const traceFiles = async (): Promise<string[]> => (await fs.readdir(memoryDir(), { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile() && /^raw_traces_.*\.jsonl$/.test(entry.name)).map((entry) => path.join(entry.parentPath, entry.name)).sort();
  const filesHolding = async (text: string) => {
    const found: string[] = [];
    for (const file of await traceFiles()) if ((await fs.readFile(file, "utf8")).includes(text)) found.push(file);
    return found;
  };
  /** Each JSON line with every string value equal to a key of `map` replaced by its value (a stored link, not text). */
  const replaceValues = (text: string, map: Map<string, string>) => {
    let replaced = 0;
    const visit = (value: unknown): unknown => {
      if (typeof value === "string" && map.has(value)) { replaced += 1; return map.get(value); }
      if (Array.isArray(value)) return value.map(visit);
      if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, visit(v)]));
      return value;
    };
    const next = text.split("\n").map((line) => line.trim() ? JSON.stringify(visit(JSON.parse(line))) : line).join("\n");
    return { next, replaced };
  };
  const migration = async (s: BuiltStudio, id: string) => ((await s.gql("{getAppDataMigrations{migrationId status attempts startedAt completedAt summary}}"))
    .getAppDataMigrations as Rec[]).find((m) => m.migrationId === id);
  const backupsOf = async (id: string) => {
    const dir = path.join(root, "app-data-migration-backups", id, "memory");
    const entries = await fs.readdir(dir, { recursive: true, withFileTypes: true }).catch(() => []);
    return entries.filter((entry) => entry.isFile()).map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name))).sort();
  };

  /** The retired built-ins' installed copies as earlier builds left them (the shapes of 491's RRB-1). */
  const writeRetiredCopies = async () => {
    const put = async (rel: string, text: string) => {
      await fs.mkdir(path.dirname(path.join(root, rel)), { recursive: true });
      await fs.writeFile(path.join(root, rel), text);
    };
    await put(`agents/${EVOLVER_ID}/agent.md`, "---\nname: Skill Self-Evolver\n---\n\nEvolve.\n");
    await put(`agents/${EVOLVER_ID}/agent-config.json`, `${JSON.stringify({ skillNames: ["retrospective-skill-coach"] })}\n`);
    await put(`agents/${EVOLVER_ID}/skills/retrospective-skill-coach/SKILL.md`, "# coach\n");
    await put(`agents/${COMPACTOR_ID}/agent.md`, "---\nname: Memory Compactor\n---\n\nCompact.\n");
    await put(`agents/${COMPACTOR_ID}/agent-config.json`, "{}\n");
  };
  const exists = (rel: string) => fs.lstat(path.join(root, rel)).then(() => true, () => false);
  const historyRunIds = async (s: BuiltStudio): Promise<string[]> =>
    ((await s.gql("{listWorkspaceRunHistory(limitPerAgent:50){agentDefinitions{runs{runId}}}}")).listWorkspaceRunHistory as Rec[])
      .flatMap((group) => (group.agentDefinitions as Rec[]).flatMap((definition) => (definition.runs as Rec[]).map((run) => String(run.runId))));
  /** The owner's message to a standalone run through its composer socket: the frames until `settled` holds. */
  const ownerMessage = async (s: BuiltStudio, runId: string, content: string, settled: (frames: Array<{ type: string; payload: Rec }>) => boolean) => {
    const socket = new WebSocket(`${s.url.replace(/^http/, "ws")}/ws/agent/${runId}`);
    s.sockets.push(socket);
    const frames: Array<{ type: string; payload: Rec }> = [];
    socket.on("message", (raw: unknown) => { try { frames.push(...agentStreamFramesOf(JSON.parse(String(raw)) as Rec)); } catch { /* not a frame */ } });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await waitConnected(frames);
    socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { ...buildE2eClientCommandIds(), agent_run_id: runId, content } }));
    await until(() => settled(frames) || null, `the answer to ${runId}`, 90_000);
    socket.close();
    return frames;
  };

  const journey = async (from: "before-beta.1" | "beta.1") => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "attachment-links-e2e-")));
    const workspace = path.join(root, "workspace");
    for (const dir of ["home", "workspace"]) await fs.mkdir(path.join(root, dir));
    await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    // MO-1: the fresh install records every migration; the retired copies then appear as an earlier build had left them
    // (their removal already recorded, so this build serves them until that ledger row goes, below).
    server = await startBuiltStudio(root, env());
    await server.stop();
    await writeRetiredCopies();
    server = await startBuiltStudio(root, env());
    let s = server;
    expect(((await s.gql("{agentDefinitions{id}}")).agentDefinitions as Rec[]).map((d) => d.id), "the retired copy is served")
      .toContain(COMPACTOR_ID);
    const compactorRun = await createRoot(s, "agent", { manager: COMPACTOR_ID }, workspace);
    await ownerMessage(s, compactorRun.rootId, "Compact my notes.",
      (frames) => frames.some((f) => f.type === "TURN_COMPLETED" || (f.type === "AGENT_STATUS" && f.payload.status === "idle")));
    const tag = randomUUID().slice(0, 6);
    const agent = async (name: string) => (await s.gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name, role: "assistant", description: name, instructions: "Follow the request.", toolNames: [] } })).createAgentDefinition.id as string;
    const manager = await agent(`ALM Manager ${tag}`);
    const helperName = `ALM Helper ${tag}`;
    await agent(helperName);
    const lead = await agent(`ALM Lead ${tag}`);
    const squadName = `ALM Squad ${tag}`;
    await s.gql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: squadName, description: squadName, instructions: "Deliver.", coordinatorMemberName: "lead", nodes: [{ memberName: "lead", ref: lead, refScope: "SHARED" }] } });

    // A standalone Agent run delegates an Agent and a Team (each a run of its own, in its own folder).
    const agentRoot = await createRoot(s, "agent", { manager }, workspace);
    const m = await managerOf(s, agentRoot);
    const toHelper = await m.call("delegate_task", { recipient_address: `/${segment(helperName)}`, description: "Read the notes." });
    expect(toHelper, JSON.stringify(toHelper)).toMatchObject({ delegated: true, target_kind: "agent" });
    const toSquad = await m.call("delegate_task", { recipient_address: `/${segment(squadName)}`, description: "Review the notes." });
    expect(toSquad, JSON.stringify(toSquad)).toMatchObject({ delegated: true, target_kind: "team" });
    m.close();
    const child = toHelper.target_agent_run_id as string;
    const team = toSquad.target_team_run_id as string;
    const teamTree = (await s.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: team })).getTeamRunResumeConfig.executionTree as Rec;
    const leadRun = (teamTree.root_team.members as Rec[]).find((member) => member.address === "/lead")!.agent_run_id as string;

    // The composer's flow for each: draft uploads, finalized to the run's own owner, then sent with the message.
    const upload = async (owner: Rec, filename: string, bytes: Buffer, type: string): Promise<Attachment> => {
      const form = new FormData();
      form.set("owner", JSON.stringify(owner));
      form.set("file", new Blob([new Uint8Array(bytes)], { type }), filename);
      const response = await fetch(`${s.url}/rest/context-files/upload`, { method: "POST", body: form });
      expect(response.status, await response.clone().text()).toBe(200);
      return response.json() as Promise<Attachment>;
    };
    const attach = async (draft: Rec, final: Rec, files: Array<[string, Buffer, string]>) => {
      const drafts = [];
      for (const [name, bytes, type] of files) drafts.push(await upload(draft, name, bytes, type));
      const response = await fetch(`${s.url}/rest/context-files/finalize`, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ draftOwner: draft, finalOwner: final, attachments: drafts }) });
      expect(response.status, await response.clone().text()).toBe(200);
      return (await response.json() as { attachments: Attachment[] }).attachments;
    };
    const send = async (route: string, agentRunId: string, content: string, attachments: Attachment[]) => {
      const socket = new WebSocket(`${s.url.replace(/^http/, "ws")}/ws/${route}`);
      s.sockets.push(socket);
      const frames: Array<{ type: string; payload: Rec }> = [];
      socket.on("message", (raw: unknown) => { try { frames.push(...agentStreamFramesOf(JSON.parse(String(raw)) as Rec)); } catch { /* not a frame */ } });
      await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
      await waitConnected(frames);
      const images = attachments.filter((a) => a.storedFilename.endsWith(".png")).map((a) => a.locator);
      const files = attachments.filter((a) => !a.storedFilename.endsWith(".png")).map((a) => a.locator);
      socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { ...buildE2eClientCommandIds(), agent_run_id: agentRunId, content,
        context_file_paths: files, image_urls: images } }));
      for (const a of attachments) await until(async () => (await filesHolding(a.locator)).length > 0 || null, `the trace holds ${a.locator}`, 90_000);
      await until(() => frames.some((f) => f.type === "TURN_COMPLETED" || (f.type === "AGENT_STATUS" && f.payload.status === "idle")) || null,
        `${route} turn ends`, 90_000).catch(() => undefined);
      socket.close();
    };
    const notes = (who: string) => Buffer.from(`ALM notes for ${who} ${tag}\n`);
    const childFiles = await attach({ kind: "agent_draft", draftRunId: `alm-${tag}` }, { kind: "agent_final", runId: child },
      [["child.png", PNG, "image/png"], ["child-notes.txt", notes("child"), "text/plain"]]);
    await send(`agent/${child}`, child, "Read these files.", childFiles);
    const goneFiles = await attach({ kind: "agent_draft", draftRunId: `alm-gone-${tag}` }, { kind: "agent_final", runId: child },
      [["gone.txt", notes("gone"), "text/plain"]]);
    await send(`agent/${child}`, child, "And this one.", goneFiles);
    const leadFiles = await attach({ kind: "team_member_draft", teamDraftId: `alm-${tag}`, memberAddress: "/lead" },
      { kind: "team_member_final", teamRunId: team, agentRunId: leadRun },
      [["lead.png", PNG, "image/png"], ["lead-notes.txt", notes("lead"), "text/plain"]]);
    await send(`agent-team/${team}`, leadRun, "Review these files.", leadFiles);

    // AC-008, first clause: a new attachment's link names the child's own run.
    const own = [...childFiles, ...goneFiles, ...leadFiles];
    for (const a of [...childFiles, ...goneFiles]) expect(a.locator).toBe(`/rest/runs/${child}/context-files/${a.storedFilename}`);
    for (const a of leadFiles) expect(a.locator).toBe(`/rest/team-runs/${team}/agent-runs/${leadRun}/context-files/${a.storedFilename}`);
    const bytesOf = new Map<string, Buffer>([
      ...childFiles.map((a) => [a.locator, a.storedFilename.endsWith(".png") ? PNG : notes("child")] as const),
      ...goneFiles.map((a) => [a.locator, notes("gone")] as const),
      ...leadFiles.map((a) => [a.locator, a.storedFilename.endsWith(".png") ? PNG : notes("lead")] as const)]);
    for (const [locator, bytes] of bytesOf) {
      const response = await fetch(`${s.url}${locator}`);
      expect(response.status, locator).toBe(200);
      expect(Buffer.from(await response.arrayBuffer()).equals(bytes), locator).toBe(true);
    }
    for (const mutation of [`terminateAgentRun(agentRunId:"${child}"){success}`, `terminateAgentTeamRun(teamRunId:"${team}"){success}`,
      `terminateAgentRun(agentRunId:"${agentRoot.rootId}"){success}`, `terminateAgentRun(agentRunId:"${compactorRun.rootId}"){success}`])
      await s.gql(`mutation{${mutation}}`).catch(() => undefined);
    await s.stop();

    // The released shape: each stored own link named the child through its delegator, the run that hosted it then.
    const hostScoped = (a: Attachment, runId: string) => `/rest/agent-collaborations/${agentRoot.rootId}/agent-runs/${runId}/context-files/${a.storedFilename}`;
    const toReleased = new Map<string, string>([...childFiles, ...goneFiles].map((a) => [a.locator, hostScoped(a, child)]));
    for (const a of leadFiles) toReleased.set(a.locator, hostScoped(a, leadRun));
    const current = new Map<string, string>();
    const released = new Map<string, string>();
    for (const file of await traceFiles()) {
      const text = await fs.readFile(file, "utf8");
      if (!own.some((a) => text.includes(a.locator))) continue;
      const { next, replaced } = replaceValues(text, toReleased);
      expect(replaced, `${file}: stored links found`).toBeGreaterThan(0);
      current.set(file, text);
      released.set(file, next);
      await fs.writeFile(file, next);
    }
    const childFolder = path.join(memoryDir(), "agents", child);
    expect([...current.keys()].some((file) => file.startsWith(childFolder + path.sep)), "the delegated Agent's own trace").toBe(true);
    expect([...current.keys()].some((file) => file.includes(`${path.sep}${team}${path.sep}${leadRun}${path.sep}`)), "the lead's member trace").toBe(true);
    // A file the user removed: its link cannot be admitted (M-3 b) and stays as it is.
    await fs.rm(path.join(childFolder, "context_files", goneFiles[0]!.storedFilename));
    const deleteRows = (ids: string[]) => {
      const db = new DatabaseSync(path.join(root, "db", "production.db"));
      for (const id of ids) {
        expect(db.prepare("SELECT status FROM app_data_migration_records WHERE migration_id = ?").get(id), `${id} ran on the fresh install`).toBeTruthy();
        db.prepare("DELETE FROM app_data_migration_records WHERE migration_id = ?").run(id);
      }
      db.close();
    };
    let removalOnBeta1: Rec | undefined;
    if (from === "beta.1") {
      // MO-2: beta.1's start ran 491's removal (and has no attachment-link migration): the copies go, its row is recorded.
      deleteRows([REMOVAL]);
      server = await startBuiltStudio(root, env());
      removalOnBeta1 = await migration(server, REMOVAL);
      expect(removalOnBeta1, JSON.stringify(removalOnBeta1)).toMatchObject({ status: "SUCCEEDED", summary: "Scanned 2; migrated 2; skipped 0; failed 0." });
      for (const gone of [`agents/${EVOLVER_ID}`, `agents/${COMPACTOR_ID}`]) expect(await exists(gone), gone).toBe(false);
      await server.stop();
      deleteRows([MIGRATION, FOLLOW_UP]);
    } else {
      deleteRows([MIGRATION, FOLLOW_UP, REMOVAL]);
    }

    // The first start of the release.
    server = await startBuiltStudio(root, env());
    s = server;
    const first = await migration(s, MIGRATION);
    const firstFollowUp = await migration(s, FOLLOW_UP);
    console.log(`ALM-1 first start: ${JSON.stringify({ migration: first, followUp: firstFollowUp })}`);
    expect(first?.status, JSON.stringify(first)).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(firstFollowUp?.status, "the follow-up runs in the same start (C-6)").toBe("SUCCEEDED_WITH_WARNINGS");
    // The two trace files holding converted links are migrated; the kept link is the warning (the status).
    expect(String(first?.summary)).toMatch(/^Scanned \d+; migrated 2; skipped \d+; failed 0\.$/);
    expect(String(firstFollowUp?.summary)).toMatch(/^Scanned \d+; migrated 0; skipped \d+; failed 0\.$/);
    const firstRemoval = await migration(s, REMOVAL);
    console.log(`${from === "beta.1" ? "MO-2" : "MO-1"} first start: ${JSON.stringify({ removal: firstRemoval })}`);
    expect(firstRemoval, JSON.stringify(firstRemoval)).toMatchObject({ status: "SUCCEEDED", attempts: 1, summary: "Scanned 2; migrated 2; skipped 0; failed 0." });
    const at = (record: Rec | undefined, field: "startedAt" | "completedAt") => Date.parse(String(record?.[field]));
    expect(at(first, "completedAt"), "the follow-up starts after the attachment-link migration").toBeLessThanOrEqual(at(firstFollowUp, "startedAt"));
    if (from === "beta.1") {
      // MO-2: 491's row is beta.1's, untouched by this start; ours ran after it.
      expect({ attempts: firstRemoval?.attempts, startedAt: firstRemoval?.startedAt, completedAt: firstRemoval?.completedAt })
        .toEqual({ attempts: removalOnBeta1?.attempts, startedAt: removalOnBeta1?.startedAt, completedAt: removalOnBeta1?.completedAt });
    }
    // MO-1 (and MO-2, a start earlier): 491's removal completes before the attachment-link migration starts.
    expect(at(firstRemoval, "completedAt"), "491's removal runs first").toBeLessThanOrEqual(at(first, "startedAt"));
    for (const gone of [`agents/${EVOLVER_ID}`, `agents/${COMPACTOR_ID}`]) expect(await exists(gone), gone).toBe(false);
    expect(((await s.gql("{agentDefinitions{id}}")).agentDefinitions as Rec[]).map((d) => d.id)).not.toContain(COMPACTOR_ID);
    expect(await exists(`memory/agents/${compactorRun.rootId}/run_metadata.json`), "the compactor's run stays").toBe(true);
    expect(await historyRunIds(s), "the compactor's run stays listed").toContain(compactorRun.rootId);
    const refused = await ownerMessage(s, compactorRun.rootId, "Compact more.", (frames) => frames.some((f) => f.type === "AGENT_COMMAND_ACK"));
    const ack = refused.find((f) => f.type === "AGENT_COMMAND_ACK")!.payload;
    // The AGY runtime's own answer for a deleted agent (its backend's, since the AGY baseline; AutoByteus answers
    // RUN_NOT_FOUND "AgentDefinition with ID … not found", E-002): it names the missing definition, never G-5's model text.
    expect(ack, JSON.stringify(ack)).toMatchObject({ accepted: false, code: "ACTIVATION_FAILED", run_id: compactorRun.rootId,
      message: `AGY_AGENT_DEFINITION_MISSING: ${COMPACTOR_ID}` });
    expect(refused.some((f) => f.type === "ASSISTANT_COMPLETE"), "nothing answered").toBe(false);
    const goneLink = hostScoped(goneFiles[0]!, child);
    for (const [file, text] of current) {
      const expected = text.includes(goneFiles[0]!.locator) ? replaceValues(text, new Map([[goneFiles[0]!.locator, goneLink]])).next : text;
      expect(await fs.readFile(file, "utf8"), `${file}: converted to the bytes the current code wrote`).toBe(expected);
      const backup = path.join(root, "app-data-migration-backups", MIGRATION, "memory", path.relative(memoryDir(), file));
      expect(await fs.readFile(backup, "utf8"), `${backup}: the released bytes`).toBe(released.get(file));
    }
    expect(await backupsOf(MIGRATION)).toHaveLength(current.size);
    expect(await backupsOf(FOLLOW_UP), "the follow-up found nothing left to convert").toEqual([]);
    // SR-017 D-15: the backups follow the migration's ID; nothing is written under the IDs it had before the rename.
    expect((await fs.readdir(path.join(root, "app-data-migration-backups"))).filter((dir) => dir.startsWith("20261117_")),
      "no backup under the former IDs").toEqual([]);
    expect((await filesHolding("/rest/agent-collaborations/")).length, "only the removed file's link stays host-scoped").toBe(1);
    for (const [locator, bytes] of bytesOf) {
      if (locator === goneFiles[0]!.locator) continue;
      const response = await fetch(`${s.url}${locator}`);
      expect(response.status, locator).toBe(200);
      expect(Buffer.from(await response.arrayBuffer()).equals(bytes), locator).toBe(true);
      expect((await fetch(`${s.url}${toReleased.get(locator)}`)).status, `the removed route: ${toReleased.get(locator)}`).toBe(404);
    }
    await s.stop();

    // A second start changes nothing.
    const before = new Map<string, string>();
    for (const file of await traceFiles()) before.set(file, await fs.readFile(file, "utf8"));
    const backupsBefore = await backupsOf(MIGRATION);
    server = await startBuiltStudio(root, env());
    s = server;
    const second = await migration(s, MIGRATION);
    const secondFollowUp = await migration(s, FOLLOW_UP);
    expect({ attempts: second?.attempts, completedAt: second?.completedAt, status: second?.status })
      .toEqual({ attempts: first?.attempts, completedAt: first?.completedAt, status: first?.status });
    expect({ attempts: secondFollowUp?.attempts, completedAt: secondFollowUp?.completedAt })
      .toEqual({ attempts: firstFollowUp?.attempts, completedAt: firstFollowUp?.completedAt });
    const secondRemoval = await migration(s, REMOVAL);
    expect({ attempts: secondRemoval?.attempts, completedAt: secondRemoval?.completedAt })
      .toEqual({ attempts: firstRemoval?.attempts, completedAt: firstRemoval?.completedAt });
    expect(await historyRunIds(s), "the compactor's run is still listed").toContain(compactorRun.rootId);
    for (const file of await traceFiles()) {
      if (!before.has(file)) continue;
      expect(await fs.readFile(file, "utf8"), `${file} unchanged by the second start`).toBe(before.get(file));
    }
    expect(await backupsOf(MIGRATION)).toEqual(backupsBefore);
    await s.stop();
    server = null;
    await fs.rm(root, { recursive: true, force: true });
    root = "";
  };

  it("ALM-1 / MO-1 from a release before beta.1: one first start runs 491's removal, then both attachment-link migrations; links convert with backups and open; a second start changes nothing",
    () => journey("before-beta.1"), 600_000);
  it("ALM-1 / MO-2 from beta.1 (491's removal already ran): the first start runs only the two 20261119 migrations, main then follow-up; links convert with backups and open; a second start changes nothing",
    () => journey("beta.1"), 600_000);
});
