import "reflect-metadata";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { builtServerLaunchEnvironment } from "../helpers/built-server-launch-credential.js";
import { callTool, segment, startCollaborationHarness, type CollaborationHarness, type Rec } from "../helpers/collaboration-root-harness.js";

// The episodic catalogs (autobyteus-493, `episodic-catalog-contract.md`) on a real Studio server and memory folder: real
// Agent, Team and Org roots, delegated copies, a task agent team, a file-authored team-local agent, Project Tasks, real
// Work Journals, real GraphQL archive/delete, and restarts of the built server (dist/app.js) on the same data dir. Only the
// external AGY CLI is scripted (tests/fixtures/agy-failure-cli.mjs, `linked_skills`); no inference. Production timings
// (a pass 5 s after the latest change, at most 30 s after the oldest).
// - EC-01 (AC-001, AC-002, AC-003, AC-013, AC-008): every kind of run of one definition is in its one catalog, oldest
//   first, each entry exactly the contract's lines (checked against the journal files on disk); a team-local id gets one
//   encoded folder, the semantic folder's name; the Task title is the About of runs working a Project Task and no other;
//   marker strings put in a user message, a tool call, a tool result, an agent reply and a Task description reach the
//   journals and no file under episodic/; index.md lists every agent.
// - EC-02 (AC-004): a new turn updates the run's entry within 60 s; a new run's first turn adds its entry; a burst of
//   turns gives at most two rewrites.
// - EC-03 (AC-005): archive of an agent, team and org run changes no catalog file; a refused delete (active run) changes
//   nothing; delete of an agent, team and org run removes their entries within 60 s and leaves the others as they were.
// - EC-04 (AC-009, live): a hand-edited catalog is rewritten at the agent's next change; with episodic/ unwritable the
//   write fails with EPISODIC_CATALOG_WRITE_FAILED while the run's turn and its journal go on; writable again, it heals.
// - EC-05 (AC-007 b, AC-009 at start): a turn whose catalog pass never ran (server stopped inside the 5 s window), a run
//   folder removed and an agent's only run removed while stopped, a hand-edited catalog: the built server's start brings
//   exactly those catalogs (and index.md) up to date (the last becomes `0 runs.`) and writes no other catalog file.
// - EC-06 (AC-006, REQ-008, older manifests, AC-009 damaged record): a start with no episodic/ folder builds every catalog
//   again, byte for byte as before, with a run without a journal ("no journal yet"), a run whose manifest is the older
//   shape (runtime once per manifest) listing its files, and a team run whose stored tree is unreadable left out with a
//   warning naming it; nothing under memory/ outside episodic/ changes (path, size, modification time).
// - EC-07 (AC-007 a): a restart with no change writes no file under episodic/.
// Prerequisites: `pnpm -C autobyteus-server-ts build` for the current worktree (EC-05…EC-07 start dist/app.js).
// Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/memory/episodic-catalog.e2e.test.ts --no-watch
// EPISODIC_CATALOG_E2E_EVIDENCE_DIR=<dir> writes the catalogs, timings and listings of each case as evidence.
const { home, priorHome } = await vi.hoisted(async () => {
  // A disposable HOME keeps the scripted actors' files out of the user's home.
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "ec-e2e-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const exists = (p: string) => fs.access(p).then(() => true, () => false);
const CATALOG_TIME = /^\d{4}-\d\d-\d\d \d\d:\d\d$/;
const HEADER_RANGE = / · (\d{4}-\d\d-\d\d) (\d\d:\d\d) – (?:(\d{4}-\d\d-\d\d) )?(\d\d:\d\d) UTC(?: · |$)/;
const FIXED_SENTENCE = "Maintained by the system: do not edit. Each run's Work Journal stays in its run folder; this catalog only points to it and quotes no conversation.";
/** Contract §2.2 size rule. */
const sizeText = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

type Entry = { runId: string; heading: string; start: string | null; text: string; lines: string[] };
/** A catalog file as the contract shapes it: header lines, then entries separated by one empty line. */
const parseCatalog = (text: string) => {
  const [head, ...blocks] = text.split("\n\n## ");
  const entries: Entry[] = blocks.map((block) => {
    const lines = `## ${block}`.replace(/\n$/, "").split("\n");
    const heading = lines[0]!;
    const runId = heading.slice(heading.lastIndexOf(" · ") + 3);
    const start = /^## (\d{4}-\d\d-\d\d \d\d:\d\d)/.exec(heading)?.[1] ?? null;
    return { runId, heading, start, text: lines.join("\n"), lines };
  });
  return { head: head!, entries, byRun: new Map(entries.map((entry) => [entry.runId, entry])) };
};

type FileStamp = { ino: number; mtimeMs: number; size: number };
/** Every file under a folder (relative path → inode, mtime, size), optionally leaving one subfolder out. */
const listing = async (root: string, skip?: string): Promise<Record<string, FileStamp>> => {
  const out: Record<string, FileStamp> = {};
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const full = path.join(dir, entry.name);
      if (skip && full === skip) continue;
      if (entry.isDirectory()) { await walk(full); continue; }
      const stat = await fs.stat(full).catch(() => null);
      if (stat) out[path.relative(root, full)] = { ino: stat.ino, mtimeMs: stat.mtimeMs, size: stat.size };
    }
  };
  await walk(root);
  return out;
};
/** A listing without inodes (path, size, modification time), the AC-006 comparison. */
const pathSizeMtime = (files: Record<string, FileStamp>) => Object.fromEntries(Object.entries(files).map(([file, s]) => [file, `${s.size} ${s.mtimeMs}`]));
const diffKeys = (a: Record<string, unknown>, b: Record<string, unknown>) =>
  [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((key) => JSON.stringify(a[key]) !== JSON.stringify(b[key])).sort();

suite("Episodic catalogs on a real server (real runs of every kind, GraphQL deletes, built-server restarts; scripted AGY actor)", () => {
  let h: CollaborationHarness;
  let memoryDir: string;
  let episodicDir: string;
  const suffix = Math.random().toString(16).slice(2, 8);
  const ids: Rec = {};
  const names: Rec = {};
  const runs: Rec = {};
  const titles: Rec = {};
  const evidence: Rec = {};
  const warnings: string[] = [];
  const marker = (name: string) => `EC_MARK_${name}_${suffix}`;
  const MK = { user: marker("USER"), call: marker("TOOLCALL"), result: marker("TOOLRESULT"), reply: marker("REPLY"), desc: marker("TASKDESC") };
  type Root = Awaited<ReturnType<CollaborationHarness["startRoot"]>>;
  const roots: Record<string, Root> = {};

  const catalogPath = (definitionId: string) => path.join(episodicDir, encodeURIComponent(definitionId), "catalog.md");
  const readCatalog = (definitionId: string) => fs.readFile(catalogPath(definitionId), "utf8");
  const stamp = async (file: string): Promise<FileStamp | null> => {
    const stat = await fs.stat(file).catch(() => null);
    return stat ? { ino: stat.ino, mtimeMs: stat.mtimeMs, size: stat.size } : null;
  };
  /** A run's folder: `agents/<id>`, or a member folder under agent_teams/ or agent_orgs/ (searched by its run ID). */
  const runDir = async (runId: string): Promise<string | null> => {
    const walk = async (dir: string, depth: number): Promise<string | null> => {
      for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
        if (!entry.isDirectory() || entry.name === "episodic" || entry.name === "work_journal") continue;
        const full = path.join(dir, entry.name);
        if (entry.name === runId) return full;
        if (depth < 4) { const found = await walk(full, depth + 1); if (found) return found; }
      }
      return null;
    };
    return walk(memoryDir, 0);
  };
  /** The run's journal files (name → size), as on disk; null without a journal. */
  const journalState = async (runId: string): Promise<Record<string, number> | null> => {
    const dir = await runDir(runId);
    const files = dir ? await fs.readdir(path.join(dir, "work_journal")).catch(() => null) : null;
    if (!files) return null;
    const out: Record<string, number> = {};
    for (const name of files.filter((n) => /^work_journal_.*\.md$/.test(n)).sort()) out[name] = (await fs.stat(path.join(dir!, "work_journal", name))).size;
    return Object.keys(out).length ? out : null;
  };
  /** Waits until the run's journal differs from `before` (a turn of the run has been rendered). */
  const journalChanged = async (runId: string, before: Record<string, number> | null, label: string) => {
    let now: Record<string, number> | null = null;
    await until(async () => JSON.stringify(now = await journalState(runId)) !== JSON.stringify(before) && now !== null, `${label}: journal of ${runId} written`, 90_000);
    return { at: Date.now(), state: now! };
  };
  /** The text of a run's journal files. */
  const journalText = async (runId: string) => {
    const dir = await runDir(runId);
    const files = dir ? await fs.readdir(path.join(dir, "work_journal")).catch(() => []) : [];
    return (await Promise.all(files.filter((n) => n.endsWith(".md")).map((n) => fs.readFile(path.join(dir!, "work_journal", n), "utf8")))).join("\n");
  };
  let turnCount = 0;
  const PADDING = "Notes on the checklist item, kept for the record. ".repeat(44);
  /**
   * One turn of a run, through the root that owns or reaches it: by default the scripted actor answers with a reply of its
   * own (a unique token and about 2 KB, so the journal's size line changes); waits until the journal holds `waitFor`.
   */
  const turn = async (root: Root, agentRunId: string, content?: string, waitFor?: string) => {
    turnCount += 1;
    const token = `TURN_${turnCount}_${suffix}`;
    const replyFile = path.join(h.dataDir, `reply-${turnCount}.md`);
    await fs.writeFile(replyFile, `${token} ${PADDING}\n`);
    const expected = waitFor ?? token;
    expect((await journalText(agentRunId)).includes(expected), `${expected} is not in the journal before the turn`).toBe(false);
    const sentAt = Date.now();
    await root.sendTo(agentRunId, content ?? `Please answer REPLY_FILE:${replyFile}`);
    await until(async () => (await journalText(agentRunId)).includes(expected), `journal of ${agentRunId} holds ${expected}`, 90_000);
    return { sentAt, at: Date.now(), state: (await journalState(agentRunId))! };
  };
  /**
   * The entry the contract gives for a run, computed from its folder and journal files on disk (header line 2 for the
   * range, the file size), the recorded workspace and the expected About.
   */
  const expectedEntry = async (runId: string, about: string | null, recordedStart?: string) => {
    const dir = (await runDir(runId))!;
    const journalDir = path.join(dir, "work_journal");
    const manifest = JSON.parse(await fs.readFile(path.join(journalDir, "work_journal_manifest.json"), "utf8").catch(() => "null")) as Rec | null;
    const files: Array<{ name: string; from: string | null; to: string | null; size: number }> = [];
    for (const file of (manifest?.files ?? []) as Rec[]) {
      const text = await fs.readFile(path.join(journalDir, file.journal_file), "utf8").catch(() => null);
      if (text === null) continue;
      const match = HEADER_RANGE.exec(text.split("\n")[1] ?? "");
      files.push({ name: file.journal_file, size: Buffer.byteLength(text), from: match ? `${match[1]} ${match[2]}` : null, to: match ? `${match[3] ?? match[1]} ${match[4]}` : null });
    }
    const start = files.find((f) => f.from)?.from ?? recordedStart ?? null;
    const last = [...files].reverse().find((f) => f.to)?.to ?? null;
    const heading = start === null ? `## start unknown · ${runId}` : last ? `## ${start} → ${last} UTC · ${runId}` : `## ${start} UTC · ${runId}`;
    const lines = [heading];
    if (about) lines.push(`- About: ${about}`);
    lines.push(`- Workspace: \`${h.workspace}\``);
    if (files.length) {
      lines.push(`- Journal: \`${journalDir}\``);
      for (const f of files) lines.push(f.from ? `  - ${f.name} · ${f.from} – ${f.to} · ${sizeText(f.size)}` : `  - ${f.name} · ${sizeText(f.size)}`);
    } else lines.push(`- Journal: no journal yet (run folder \`${dir}\`)`);
    return lines.join("\n");
  };
  /** Waits until a catalog satisfies a check; returns its text and when it did. */
  const catalogUntil = async (definitionId: string, check: (text: string) => boolean, label: string, ms = 75_000) => {
    let text = "";
    await until(async () => check(text = await readCatalog(definitionId).catch(() => "")), label, ms);
    return { text, at: Date.now() };
  };
  /** Every catalog file and index.md: relative path → stamp and text. */
  const catalogFiles = async () => {
    const out: Record<string, FileStamp & { text: string }> = {};
    for (const [file, s] of Object.entries(await listing(episodicDir))) out[file] = { ...s, text: await fs.readFile(path.join(episodicDir, file), "utf8") };
    return out;
  };
  /** Waits until no file under episodic/ has changed for `quietMs` (the debounced passes have run). */
  const settled = async (quietMs = 9_000, ms = 120_000) => {
    const deadline = Date.now() + ms;
    let last = JSON.stringify(await listing(episodicDir));
    let since = Date.now();
    while (Date.now() - since < quietMs) {
      if (Date.now() > deadline) throw new Error("episodic/ did not settle");
      await sleep(250);
      const now = JSON.stringify(await listing(episodicDir));
      if (now !== last) { last = now; since = Date.now(); }
    }
  };

  // ── Built-server process (EC-05…EC-07) ──
  let child: ChildProcess | null = null;
  let output = "";
  const serverDir = path.resolve(__dirname, "../../..");
  const startBuilt = async () => {
    output = "";
    const spawnedAt = Date.now();
    child = spawn(process.execPath, [path.join(serverDir, "dist", "app.js"), "--data-dir", h.dataDir, "--host", "127.0.0.1", "--port", "0"],
      { cwd: serverDir, env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", TMPDIR: process.env.TMPDIR ?? "/tmp", USER: process.env.USER ?? "tester",
        DATABASE_URL: process.env.DATABASE_URL ?? "", ANTIGRAVITY_CLI_COMMAND: cli, AGY_FAKE_CASE: "linked_skills", ...builtServerLaunchEnvironment() }, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout!.on("data", (chunk) => { output += String(chunk); });
    child.stderr!.on("data", (chunk) => { output += String(chunk); });
    const deadline = Date.now() + 120_000;
    while (!output.includes("Server listening on 127.0.0.1:0")) {
      if (child.exitCode !== null || Date.now() > deadline) throw new Error(`server did not start: ${output.slice(-2000)}`);
      await sleep(100);
    }
    return { spawnedAt, listeningAt: Date.now() };
  };
  const stopBuilt = async () => {
    if (!child) return;
    const running = child;
    child = null;
    running.kill("SIGTERM");
    await new Promise((resolve) => { if (running.exitCode !== null) resolve(null); else running.once("exit", resolve); });
  };
  const episodicLines = () => output.split("\n").filter((line) => /EPISODIC_CATALOG|RUN_FOLDER_DISCOVERY/.test(line));

  beforeAll(async () => {
    h = await startCollaborationHarness("episodic-catalog-e2e");
    memoryDir = path.join(h.dataDir, "memory");
    episodicDir = path.join(memoryDir, "episodic");
    vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => { warnings.push(args.map((a) => typeof a === "string" ? a : JSON.stringify(a)).join(" ")); });
    // D (the agent whose history is followed), H (host and coordinator), E (one run only).
    names.D = `EC Writer ${suffix}`; names.H = `EC Host ${suffix}`; names.E = `EC Solo ${suffix}`;
    ids.D = await h.agentDefinition(names.D, { toolNames: ["get_project_task"] });
    ids.H = await h.agentDefinition(names.H);
    ids.E = await h.agentDefinition(names.E);
    names.T = `EC Squad ${suffix}`;
    ids.T = await h.teamDefinition(names.T, [["manager", ids.H], ["mate", ids.D]], "manager");
    ids.O = await h.orgDefinition(`EC Org ${suffix}`, [
      { memberName: "manager", ref: ids.H, refType: "AGENT", refScope: "SHARED" },
      { memberName: "writer", ref: ids.D, refType: "AGENT", refScope: "SHARED" }], []);
    // A file-authored team with a team-local coordinator (as the user's own teams are), loaded by the app's Reload.
    const localTeamId = `ec_local_team_${suffix}`;
    const teamDir = path.join(h.dataDir, "agent-teams", localTeamId);
    await fs.mkdir(path.join(teamDir, "agents", "lead"), { recursive: true });
    await fs.writeFile(path.join(teamDir, "team.md"), ["---", `name: EC Local Team ${suffix}`, "description: episodic catalog e2e", "---", "", "Coordinate."].join("\n"));
    await fs.writeFile(path.join(teamDir, "team-config.json"), JSON.stringify({ coordinatorMemberName: "manager", handoffs: [], avatarUrl: null,
      members: [{ memberName: "manager", ref: "lead", refScope: "team_local" }, { memberName: "mate", ref: ids.D, refScope: "shared" }] }, null, 2));
    await fs.writeFile(path.join(teamDir, "agents", "lead", "agent.md"), ["---", `name: EC Lead ${suffix}`, "description: team-local lead", "role: assistant", "---", "", "Lead."].join("\n"));
    await fs.writeFile(path.join(teamDir, "agents", "lead", "agent-config.json"), JSON.stringify({ toolNames: [], skillNames: [] }));
    expect((await h.graphql(`mutation{reloadAgentPackageDefinitions}`)).reloadAgentPackageDefinitions).toBe(true);
    const agents = (await h.graphql(`query{agentDefinitions{id name}}`)).agentDefinitions as Rec[];
    ids.L = agents.find((agent) => agent.name === `EC Lead ${suffix}`)?.id;
    expect(ids.L, "team-local agent loaded").toMatch(/^team-local-agent:.+:lead$/);
    ids.LT = localTeamId;
    // Projects and Tasks: P1 goes to a delegated copy of D, P2 to a task agent team; the descriptions carry a marker.
    const project = (await h.graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
      { input: { name: `EC Project ${suffix}`, workspaces: [{ workspaceRootPath: h.workspace, description: "folder" }] } })).createProject.projectId as string;
    ids.project = project;
    for (const key of ["P1", "P2"]) {
      titles[key] = `EC ${key} launch checklist ${suffix}`;
      const task = (await h.graphql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId taskKey}}`,
        { input: { projectId: project, title: titles[key], description: `Details ${MK.desc} for ${key}.` } })).createProjectTask as Rec;
      ids[key] = task.taskId; names[`${key}key`] = task.taskKey;
    }
    await fs.writeFile(path.join(h.dataDir, "reply.md"), `Done: ${MK.reply}\n`);
  }, 300_000);

  afterAll(async () => {
    const dir = process.env["EPISODIC_CATALOG_E2E_EVIDENCE_DIR"];
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "episodic-catalog-e2e.json"), `${JSON.stringify({ ids, names, runs, titles, ...evidence }, null, 2)}\n`);
    }
    await stopBuilt();
    await fs.chmod(episodicDir, 0o755).catch(() => undefined);
    vi.restoreAllMocks();
    await h?.close();
    if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
    if (home) await fs.rm(home, { recursive: true, force: true });
  }, 300_000);

  it("EC-01: every kind of run of one agent is in its one catalog, oldest first, exactly the contract's lines; no conversation text; index.md lists every agent", async () => {
    // A standalone run of D: the user's message (the run-history summary) and its reply carry markers.
    roots.A = await h.startRoot("agent", { manager: ids.D });
    runs.A = roots.A.rootId;
    await turn(roots.A, runs.A, `${MK.user} please answer REPLY_FILE:${path.join(h.dataDir, "reply.md")}`, MK.reply);
    // A host root of H delegates to D: a Project Task (the copy reads it back: a tool result with the description), and
    // described work (the tool call carries a marker); then a Project Task to the Team T (a task agent team).
    roots.H = await h.startRoot("agent", { manager: ids.H });
    runs.H = roots.H.rootId;
    const copy1 = await roots.H.calls(runs.H, "/", callTool("delegate_task", { recipient_address: `/${segment(names.D)}`, task_id: ids.P1 }));
    const copy2 = await roots.H.calls(runs.H, "/", callTool("delegate_task", { recipient_address: `/${segment(names.D)}`, description: `Please handle ${MK.call}.` }));
    const taskTeam = await roots.H.calls(runs.H, "/", callTool("delegate_task", { recipient_address: `/${segment(names.T)}`, task_id: ids.P2 }));
    for (const result of [copy1, copy2, taskTeam]) expect(result.delegated, JSON.stringify(result)).toBe(true);
    runs.copy1 = copy1.target_agent_run_id; runs.copy2 = copy2.target_agent_run_id; runs.TT = taskTeam.target_team_run_id;
    const read = await roots.H.calls(runs.copy1, "/", callTool("get_project_task", { project_id: ids.project, task_id: ids.P1 }));
    expect(JSON.stringify(read)).toContain(MK.desc);
    const tt = await roots.H.waitForTaskAgent(runs.TT);
    runs.TTmanager = tt.members.find((m) => m.address === "/manager")?.agentRunId;
    runs.TTmate = tt.members.find((m) => m.address === "/mate")?.agentRunId;
    expect(runs.TTmate, JSON.stringify(tt)).toBeTruthy();
    // The task team's coordinator brings its mate in (lazy member activation), as a coordinator does.
    await until(async () => (await journalState(runs.TTmanager)) !== null, "task team coordinator worked its Task", 90_000);
    const mateBefore = await journalState(runs.TTmate);
    const brought = await roots.H.calls(runs.TTmanager, "/manager", callTool("send_message_to", { recipient_address: "/mate", content: "Reply OK." }));
    expect(brought.isError, JSON.stringify(brought)).toBe(false);
    await journalChanged(runs.TTmate, mateBefore, "task team mate");
    await until(async () => (await journalState(runs.copy2)) !== null, "copy2 journal", 90_000);
    // A Team run (D is its mate), an Org run (D is its writer), the team-local team (D is its mate).
    roots.T1 = await h.startRoot("team", { team: ids.T, manager: ids.H, mate: ids.D });
    runs.T1 = roots.T1.rootId; runs.T1manager = roots.T1.managerRunId; runs.T1mate = roots.T1.members["/mate"];
    await turn(roots.T1, runs.T1manager);
    await turn(roots.T1, runs.T1mate);
    roots.O1 = await h.startRoot("org", { org: ids.O });
    runs.O1 = roots.O1.rootId; runs.O1manager = roots.O1.managerRunId; runs.O1writer = roots.O1.members["/writer"];
    await turn(roots.O1, runs.O1manager);
    await turn(roots.O1, runs.O1writer);
    roots.L1 = await h.startRoot("team", { team: ids.LT, manager: ids.L, mate: ids.D });
    runs.L1 = roots.L1.rootId; runs.L1lead = roots.L1.managerRunId; runs.L1mate = roots.L1.members["/mate"];
    await turn(roots.L1, runs.L1lead);
    await turn(roots.L1, runs.L1mate);
    // E: one standalone run.
    roots.E = await h.startRoot("agent", { manager: ids.E });
    runs.E = roots.E.rootId;
    await turn(roots.E, runs.E);
    await settled();

    // AC-001: the folder names (a team-local id has ':'), the same as the semantic folder's rule.
    const folders = (await fs.readdir(episodicDir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    for (const id of [ids.D, ids.H, ids.E, ids.L]) expect(folders).toContain(encodeURIComponent(id));
    expect(encodeURIComponent(ids.L)).toContain("%3A");
    expect(folders.filter((name) => name.includes(":") || name.includes("/"))).toEqual([]);

    // AC-002, AC-013: D's catalog lists exactly D's seven runs, oldest first, each entry exactly as computed from disk.
    const expectedD: Array<[string, string | null]> = [[runs.A, null], [runs.copy1, titles.P1], [runs.copy2, null], [runs.TTmate, titles.P2],
      [runs.T1mate, null], [runs.O1writer, null], [runs.L1mate, null]];
    const textD = await readCatalog(ids.D);
    const catD = parseCatalog(textD);
    expect(catD.head.split("\n").slice(1)).toEqual(["", "7 runs, oldest first.", FIXED_SENTENCE]);
    expect(catD.entries.map((e) => e.runId).sort()).toEqual(expectedD.map(([id]) => id).sort());
    const order = [...catD.entries].sort((a, b) => (a.start ?? "~").localeCompare(b.start ?? "~") || a.runId.localeCompare(b.runId)).map((e) => e.runId);
    expect(catD.entries.map((e) => e.runId), "oldest first, equal starts by run id").toEqual(order);
    for (const [runId, about] of expectedD) expect(catD.byRun.get(runId)!.text, `entry of ${runId}`).toBe(await expectedEntry(runId, about));
    expect(textD.endsWith("\n") && !textD.endsWith("\n\n")).toBe(true);
    // The header names the agent by its newest run's name (contract §2.3): a member's address basename or the run's agent name.
    expect(["mate", "writer", names.D, ids.D]).toContain(catD.head.split("\n")[0]!.replace("# Episodic catalog: ", ""));
    // AC-013: no team/org name or address, delegation, runtime, Task key, run state, node.
    for (const word of [names.T, `EC Org ${suffix}`, `EC Local Team ${suffix}`, "/mate", "/writer", names.P1key, names.P2key, "antigravity", "AGY", "archived", "running", "delegat", runs.H]) {
      expect(textD, `D's catalog has no "${word}"`).not.toContain(word);
    }
    // The other catalogs: H (its host root, coordinator runs), the team-local lead, E.
    const catH = parseCatalog(await readCatalog(ids.H));
    expect(catH.entries.map((e) => e.runId).sort()).toEqual([runs.H, runs.T1manager, runs.O1manager, runs.TTmanager].sort());
    for (const runId of [runs.T1manager, runs.O1manager]) expect(catH.byRun.get(runId)!.text).toBe(await expectedEntry(runId, null));
    expect(catH.byRun.get(runs.TTmanager)!.text).toBe(await expectedEntry(runs.TTmanager, titles.P2));
    const textL = await readCatalog(ids.L);
    expect(textL).toBe(`# Episodic catalog: manager\n\n1 run, oldest first.\n${FIXED_SENTENCE}\n\n${await expectedEntry(runs.L1lead, null)}\n`);
    expect(await readCatalog(ids.E)).toBe(`# Episodic catalog: ${names.E}\n\n1 run, oldest first.\n${FIXED_SENTENCE}\n\n${await expectedEntry(runs.E, null)}\n`);

    // AC-003: every marker reached the journals (or the run history), and no file under episodic/ holds any of them.
    const reached = { user: (await journalText(runs.A)).includes(MK.user), reply: (await journalText(runs.A)).includes(MK.reply),
      call: (await journalText(runs.H)).includes(MK.call), result: (await journalText(runs.copy1)).includes(MK.desc),
      summary: (await fs.readFile(path.join(memoryDir, "run_history_index.json"), "utf8").catch(() => "")).includes(MK.user) };
    evidence.ec01Reached = reached;
    expect(reached, "the markers are in the journals and the run-history summary").toEqual({ user: true, reply: true, call: true, result: true, summary: true });
    const all = await catalogFiles();
    for (const [file, { text }] of Object.entries(all)) for (const mark of Object.values(MK)) expect(text, `${file} holds no ${mark}`).not.toContain(mark);
    // AC-008: index.md lists each agent: name, folder, run count, last activity.
    const index = all["index.md"]!.text;
    expect(index.startsWith("# Episodic catalogs on this node\n\nOne folder per agent; each holds catalog.md.\n\n")).toBe(true);
    for (const [id, count] of [[ids.D, 7], [ids.H, 4], [ids.L, 1], [ids.E, 1]] as const) {
      expect(index).toMatch(new RegExp(`^- .+ · \`${encodeURIComponent(id).replace(/[.*+?^${}()|[\]\\%]/g, "\\$&")}/catalog\\.md\` · ${count} runs? · last activity \\d{4}-\\d\\d-\\d\\d \\d\\d:\\d\\d UTC$`, "m"));
    }
    evidence.ec01 = { files: Object.fromEntries(Object.entries(all).map(([file, v]) => [file, v.text])) };
  }, 900_000);

  it("EC-02: a turn updates its entry within 60 s; a new run's first turn adds an entry; a burst of turns gives at most two rewrites", async () => {
    // A turn of an existing run.
    const before = parseCatalog(await readCatalog(ids.D)).byRun.get(runs.A)!.text;
    const changed = await turn(roots.A, runs.A);
    const expected = await expectedEntry(runs.A, null);
    expect(expected).not.toBe(before);
    const updated = await catalogUntil(ids.D, (text) => parseCatalog(text).byRun.get(runs.A)?.text === expected, "A's entry updated");
    const updateMs = updated.at - changed.at;
    expect(updateMs).toBeLessThanOrEqual(60_000);
    // A new run of D: its first turn adds its entry.
    roots.A2 = await h.startRoot("agent", { manager: ids.D });
    runs.A2 = roots.A2.rootId;
    const first = await turn(roots.A2, runs.A2);
    const added = await catalogUntil(ids.D, (text) => parseCatalog(text).byRun.has(runs.A2), "A2's entry added");
    expect(added.at - first.at).toBeLessThanOrEqual(60_000);
    await settled();
    expect(parseCatalog(await readCatalog(ids.D)).byRun.get(runs.A2)!.text).toBe(await expectedEntry(runs.A2, null));
    // A burst: four turns; count the catalog's rewrites (each write is a rename: a new inode).
    const inodes = new Set<number>();
    const initial = (await stamp(catalogPath(ids.D)))!.ino;
    let watching = true;
    const watcher = (async () => { while (watching) { const s = await stamp(catalogPath(ids.D)); if (s) inodes.add(s.ino); await sleep(25); } })();
    const burstStart = Date.now();
    const journalVersions: string[] = [];
    const burstTurns: Array<{ sentMs: number; journalMs: number }> = [];
    // Turns 2 s apart, as a working run's turns come: each falls inside the 5 s quiet window of the one before.
    for (let i = 0; i < 4; i += 1) {
      if (i > 0) await sleep(2_000);
      const done = await turn(roots.A, runs.A);
      journalVersions.push(JSON.stringify(done.state));
      burstTurns.push({ sentMs: done.sentAt - burstStart, journalMs: done.at - burstStart });
    }
    const burstMs = Date.now() - burstStart;
    await sleep(40_000);
    watching = false;
    await watcher;
    inodes.delete(initial);
    const finalText = parseCatalog(await readCatalog(ids.D)).byRun.get(runs.A)!.text;
    expect(finalText).toBe(await expectedEntry(runs.A, null));
    evidence.ec02 = { updateMs, addMs: added.at - first.at, burstMs, burstTurns, distinctJournalVersions: new Set(journalVersions).size, catalogRewrites: inodes.size };
    expect(new Set(journalVersions).size).toBe(4);
    expect(inodes.size, `rewrites during a ${burstMs} ms burst`).toBeGreaterThanOrEqual(1);
    expect(inodes.size).toBeLessThanOrEqual(2);
  }, 600_000);

  it("EC-03: archive changes no catalog file; a refused delete changes nothing; deletes of an agent, team and org run remove their entries within 60 s", async () => {
    // More runs to delete: an agent run of D, a Team run and an Org run (each with D's member active).
    roots.A3 = await h.startRoot("agent", { manager: ids.D });
    runs.A3 = roots.A3.rootId;
    await turn(roots.A3, runs.A3);
    roots.T2 = await h.startRoot("team", { team: ids.T, manager: ids.H, mate: ids.D });
    runs.T2 = roots.T2.rootId; runs.T2manager = roots.T2.managerRunId; runs.T2mate = roots.T2.members["/mate"];
    await turn(roots.T2, runs.T2mate);
    roots.O2 = await h.startRoot("org", { org: ids.O });
    runs.O2 = roots.O2.rootId; runs.O2writer = roots.O2.members["/writer"];
    await turn(roots.O2, runs.O2writer);
    // A team run whose tree EC-06 damages (D is its mate).
    roots.T3 = await h.startRoot("team", { team: ids.T, manager: ids.H, mate: ids.D });
    runs.T3 = roots.T3.rootId; runs.T3mate = roots.T3.members["/mate"];
    await turn(roots.T3, runs.T3mate);
    for (const key of ["A2", "A3", "T1", "T2", "T3", "O1", "O2"]) {
      roots[key]!.close();
      await h.terminate(roots[key]!.kind, runs[key]);
    }
    await settled();
    const catD = parseCatalog(await readCatalog(ids.D));
    for (const runId of [runs.A3, runs.T2mate, runs.O2writer, runs.T3mate]) expect(catD.byRun.has(runId), runId).toBe(true);

    // Archive one agent, team and org run: no catalog file is written.
    const beforeArchive = await catalogFiles();
    const archived = [
      (await h.graphql(`mutation($id:String!){archiveStoredRun(runId:$id){success message}}`, { id: runs.A2 })).archiveStoredRun,
      (await h.graphql(`mutation($id:String!){archiveStoredTeamRun(teamRunId:$id){success message}}`, { id: runs.T1 })).archiveStoredTeamRun,
      (await h.graphql(`mutation($id:String!){archiveStoredAgentOrgRun(orgRunId:$id){success message}}`, { id: runs.O1 })).archiveStoredAgentOrgRun];
    for (const result of archived) expect(result.success, result.message).toBe(true);
    // A delete refused by its guard (the run is still active).
    const refused = (await h.graphql(`mutation($id:String!){deleteStoredRun(runId:$id){success message}}`, { id: runs.A })).deleteStoredRun;
    expect(refused.success).toBe(false);
    await sleep(40_000);
    const afterArchive = await catalogFiles();
    expect(diffKeys(beforeArchive, afterArchive), "no file under episodic/ written after archive and a refused delete").toEqual([]);

    // Delete one agent, team and org run.
    const deletedAt = Date.now();
    const deleted = [
      (await h.graphql(`mutation($id:String!){deleteStoredRun(runId:$id){success message}}`, { id: runs.A3 })).deleteStoredRun,
      (await h.graphql(`mutation($id:String!){deleteStoredTeamRun(teamRunId:$id){success message}}`, { id: runs.T2 })).deleteStoredTeamRun,
      (await h.graphql(`mutation($id:String!){deleteStoredAgentOrgRun(orgRunId:$id){success message}}`, { id: runs.O2 })).deleteStoredAgentOrgRun];
    for (const result of deleted) expect(result.success, result.message).toBe(true);
    const gone = await catalogUntil(ids.D, (text) => { const c = parseCatalog(text); return ![runs.A3, runs.T2mate, runs.O2writer].some((id) => c.byRun.has(id)); }, "deleted runs leave D's catalog");
    const deleteMs = gone.at - deletedAt;
    expect(deleteMs).toBeLessThanOrEqual(60_000);
    await settled();
    const afterDelete = await catalogFiles();
    // The deleted runs are gone from every catalog (T2's manager from H's); every other entry is as it was.
    const removed = new Set([runs.A3, runs.T2mate, runs.T2manager, runs.O2writer, roots.O2!.managerRunId]);
    for (const [file, { text }] of Object.entries(beforeArchive)) {
      if (file === "index.md") continue;
      const was = parseCatalog(text);
      const now = parseCatalog(afterDelete[file]!.text);
      expect(now.entries.map((e) => e.text), file).toEqual(was.entries.filter((e) => !removed.has(e.runId)).map((e) => e.text));
      // A catalog with no deleted run is not written at all.
      if (!was.entries.some((e) => removed.has(e.runId))) expect(afterDelete[file]!.ino, `${file} not rewritten`).toBe(beforeArchive[file]!.ino);
    }
    for (const runId of removed) expect(await runDir(runId), `${runId} folder deleted`).toBeNull();
    evidence.ec03 = { archived, refused, deleted, deleteMs, catalogs: Object.fromEntries(Object.entries(afterDelete).map(([f, v]) => [f, v.text])) };
  }, 900_000);

  it("EC-04: a hand-edited catalog is rewritten at the agent's next change; an unwritable episodic/ is logged and the run goes on; writable again, it heals", async () => {
    const original = await readCatalog(ids.D);
    await fs.writeFile(catalogPath(ids.D), `${original}\nHAND EDIT\n`);
    const changed = await turn(roots.A, runs.A);
    const healed = await catalogUntil(ids.D, (text) => !text.includes("HAND EDIT") && parseCatalog(text).byRun.get(runs.A)?.text !== undefined, "hand edit replaced");
    expect(healed.at - changed.at).toBeLessThanOrEqual(60_000);
    await settled();
    expect(parseCatalog(await readCatalog(ids.D)).byRun.get(runs.A)!.text).toBe(await expectedEntry(runs.A, null));

    // Unwritable: every folder under episodic/ read-only; a new run of D starts (its entry must be written).
    roots.A4 = await h.startRoot("agent", { manager: ids.D });
    runs.A4 = roots.A4.rootId;
    const folders = [episodicDir, ...(await fs.readdir(episodicDir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => path.join(episodicDir, e.name))];
    const stale = await readCatalog(ids.D);
    for (const folder of folders) await fs.chmod(folder, 0o555);
    const warnFrom = warnings.length;
    let turnResult: Awaited<ReturnType<typeof turn>> | null = null;
    let secondTurn: Awaited<ReturnType<typeof turn>> | null = null;
    try {
      turnResult = await turn(roots.A4, runs.A4);
      await until(() => warnings.slice(warnFrom).some((line) => line.includes("EPISODIC_CATALOG_WRITE_FAILED")), "write failure logged", 75_000);
      expect(await readCatalog(ids.D)).toBe(stale);
      // The run goes on: another turn completes and its journal is written.
      secondTurn = await turn(roots.A4, runs.A4);
    } finally {
      for (const folder of folders) await fs.chmod(folder, 0o755);
    }
    const failures = warnings.slice(warnFrom).filter((line) => line.includes("EPISODIC_CATALOG"));
    expect(failures.length).toBeGreaterThan(0);
    // Writable again: the agent's next change brings the catalog up to date (the new run's entry appears).
    await turn(roots.A4, runs.A4);
    await catalogUntil(ids.D, (text) => parseCatalog(text).byRun.has(runs.A4), "catalog written again");
    await settled();
    expect(parseCatalog(await readCatalog(ids.D)).byRun.get(runs.A4)!.text).toBe(await expectedEntry(runs.A4, null));
    expect(await listing(episodicDir).then((files) => Object.keys(files).filter((f) => f.endsWith(".tmp")))).toEqual([]);
    evidence.ec04 = { healedMs: healed.at - changed.at, failures: failures.slice(0, 5).map((l) => l.slice(0, 400)), turnsDuringFailure: [turnResult?.state, secondTurn?.state] };
  }, 600_000);

  it("EC-05: a start after a pass that never ran, a removed run folder, an agent's only run removed and a hand edit: exactly those catalogs are brought up to date", async () => {
    // Every root but A stops first (the user's other runs are idle when the app quits).
    for (const key of ["H", "L1", "E", "A4"]) { roots[key]!.close(); await h.terminate(roots[key]!.kind, runs[key]); }
    await h.graphql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}`, { id: runs.TT }).catch(() => undefined);
    for (const id of [runs.copy1, runs.copy2]) await h.graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}`, { id }).catch(() => undefined);
    await settled();
    // The user quits inside the 5 s window after a turn: the pending pass is dropped at stop.
    const beforeTurn = await readCatalog(ids.D);
    const last = await turn(roots.A, runs.A);
    await h.stopServer();
    const stoppedAfterMs = Date.now() - last.at;
    await sleep(8_000);
    const stale = parseCatalog(await readCatalog(ids.D)).byRun.get(runs.A)!.text;
    const current = await expectedEntry(runs.A, null);
    evidence.ec05Stale = { stoppedAfterMs, staleAfterStop: stale !== current, catalogUnchangedSinceTurn: (await readCatalog(ids.D)) === beforeTurn };
    expect(stale, `the pass was dropped at stop (stopped ${stoppedAfterMs} ms after the journal write)`).not.toBe(current);
    // While stopped: remove A2's folder (archived run of D), E's only run folder, and hand-edit the team-local lead's catalog.
    await fs.rm((await runDir(runs.A2))!, { recursive: true });
    await fs.rm((await runDir(runs.E))!, { recursive: true });
    const leadText = await readCatalog(ids.L);
    await fs.writeFile(catalogPath(ids.L), leadText.replace("1 run, oldest first.", "1 run, oldest first. (edited)"));
    const before = await catalogFiles();
    const memoryBefore = pathSizeMtime(await listing(memoryDir, episodicDir));

    const started = await startBuilt();
    const restoredL = await catalogUntil(ids.L, (text) => text === leadText, "the hand-edited catalog rewritten at start", 120_000);
    await catalogUntil(ids.D, (text) => { const c = parseCatalog(text); return c.byRun.get(runs.A)?.text === current && !c.byRun.has(runs.A2); }, "D's catalog current", 60_000);
    await catalogUntil(ids.E, (text) => text === `# Episodic catalog: ${ids.E}\n\n0 runs.\n${FIXED_SENTENCE}\n`, "E's catalog lists no runs", 60_000);
    await settled(5_000);
    const after = await catalogFiles();
    const written = diffKeys(Object.fromEntries(Object.entries(before).map(([f, v]) => [f, v.ino])), Object.fromEntries(Object.entries(after).map(([f, v]) => [f, v.ino])));
    const expectWritten = ["index.md", ...[ids.D, ids.E, ids.L].map((id) => `${encodeURIComponent(id)}/catalog.md`)].sort();
    expect(written, "only the changed catalogs and index.md are written").toEqual(expectWritten);
    // D's catalog: only A's entry changed and A2's left.
    const wasD = parseCatalog(before[`${encodeURIComponent(ids.D)}/catalog.md`]!.text);
    const nowD = parseCatalog(after[`${encodeURIComponent(ids.D)}/catalog.md`]!.text);
    expect(nowD.entries.map((e) => e.runId)).toEqual(wasD.entries.map((e) => e.runId).filter((id) => id !== runs.A2));
    for (const entry of nowD.entries) if (entry.runId !== runs.A) expect(entry.text).toBe(wasD.byRun.get(entry.runId)!.text);
    // Nothing outside episodic/ changed under memory/.
    const memoryAfter = pathSizeMtime(await listing(memoryDir, episodicDir));
    const outside = diffKeys(memoryBefore, memoryAfter);
    // This is the data dir's first start of dist/app.js (the in-process test server runs no app-data migrations): its
    // migrations may rewrite the two run-history indexes, keeping a `.backup-<time>` copy. Nothing else may change; EC-06
    // and EC-07 (later starts) allow no change at all.
    const migrationLines = output.split("\n").filter((line) => /migrat/i.test(line)).map((l) => l.slice(0, 300));
    evidence.ec05 = { listeningMs: started.listeningAt - started.spawnedAt, leadRestoredMs: restoredL.at - started.listeningAt, written, outsideEpisodicChanged: outside,
      migrationLines: migrationLines.slice(0, 40), serverLines: episodicLines(), catalogs: Object.fromEntries(Object.entries(after).map(([f, v]) => [f, v.text])) };
    expect(outside.filter((file) => !/^(team_)?run_history_index\.json(\.backup-[0-9TZ-]+)?$/.test(file)), "nothing under memory/ outside episodic/ changed but the index migrations' files").toEqual([]);
  }, 600_000);

  it("EC-06: a start with no episodic/ rebuilds every catalog as it was, with a run without a journal, an older manifest and a damaged team record; nothing outside episodic/ changes", async () => {
    await stopBuilt();
    const before = await catalogFiles();
    await fs.rm(episodicDir, { recursive: true });
    // A run from before Work Journals: O1's manager has raw traces and records but no journal folder.
    await fs.rm(path.join((await runDir(runs.O1manager))!, "work_journal"), { recursive: true });
    // An older manifest: the runtime recorded once per manifest, not per entry (shape synthesized on a test-owned run).
    const manifestPath = path.join((await runDir(runs.copy1))!, "work_journal", "work_journal_manifest.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as Rec;
    const older = { ...manifest, runtime_kind: manifest.files[0].runtime_kind, files: (manifest.files as Rec[]).map(({ runtime_kind: _r, ...rest }) => rest) };
    expect(JSON.stringify(older.files)).not.toContain("runtime_kind");
    await fs.writeFile(manifestPath, JSON.stringify(older));
    // A damaged record: T3's stored team tree cannot be read.
    const treePath = path.join(memoryDir, "agent_teams", runs.T3, "team_run_execution_tree.json");
    const tree = await fs.readFile(treePath, "utf8");
    await fs.writeFile(treePath, tree.slice(0, Math.floor(tree.length / 2)));
    const memoryBefore = pathSizeMtime(await listing(memoryDir));

    const started = await startBuilt();
    await until(() => exists(path.join(episodicDir, "index.md")), "index.md written at start", 120_000);
    await settled(5_000);
    const builtAt = Date.now();
    const after = await catalogFiles();
    // Every catalog as before, except: O1's manager has no journal yet (start = recorded start), T3's mate is left out.
    // E has no run and, with episodic/ gone, no folder: it gets no catalog (contract §1); every other catalog is back.
    expect(Object.keys(after).sort()).toEqual(Object.keys(before).filter((file) => file !== `${encodeURIComponent(ids.E)}/catalog.md`).sort());
    const fileOf = (id: string) => `${encodeURIComponent(id)}/catalog.md`;
    for (const file of Object.keys(before)) {
      if ([fileOf(ids.D), fileOf(ids.H), fileOf(ids.E), "index.md"].includes(file)) continue;
      expect(after[file]!.text, `${file} rebuilt byte for byte`).toBe(before[file]!.text);
    }
    const nowD = parseCatalog(after[fileOf(ids.D)]!.text);
    const wasD = parseCatalog(before[fileOf(ids.D)]!.text);
    expect(nowD.entries.map((e) => e.text)).toEqual(wasD.entries.filter((e) => e.runId !== runs.T3mate).map((e) => e.text));
    expect(nowD.byRun.get(runs.copy1)!.lines.filter((l) => l.startsWith("  - ")).length, "older manifest lists its files").toBeGreaterThan(0);
    const nowH = parseCatalog(after[fileOf(ids.H)]!.text);
    const wasH = parseCatalog(before[fileOf(ids.H)]!.text);
    expect(nowH.entries.map((e) => e.runId).sort()).toEqual(wasH.entries.map((e) => e.runId).sort());
    for (const entry of nowH.entries) if (entry.runId !== runs.O1manager) expect(entry.text).toBe(wasH.byRun.get(entry.runId)!.text);
    const noJournal = nowH.byRun.get(runs.O1manager)!;
    expect(noJournal.lines.slice(1)).toEqual([`- Workspace: \`${h.workspace}\``, `- Journal: no journal yet (run folder \`${await runDir(runs.O1manager)}\`)`]);
    expect(noJournal.heading).toMatch(new RegExp(`^## \\d{4}-\\d\\d-\\d\\d \\d\\d:\\d\\d UTC · ${runs.O1manager}$`));
    const warnedT3 = episodicLines().concat(output.split("\n").filter((l) => l.includes(runs.T3))).filter((l) => l.includes(runs.T3));
    // Nothing under memory/ outside episodic/ changed.
    const outside = diffKeys(memoryBefore, pathSizeMtime(await listing(memoryDir, episodicDir)));
    evidence.ec06 = { listeningMs: started.listeningAt - started.spawnedAt, builtWithinMs: builtAt - started.spawnedAt, outsideEpisodicChanged: outside,
      t3Lines: warnedT3.slice(0, 5).map((l) => l.slice(0, 500)), serverLines: episodicLines().slice(0, 10).map((l) => l.slice(0, 500)),
      catalogs: Object.fromEntries(Object.entries(after).map(([f, v]) => [f, v.text])) };
    expect(outside, "no file under memory/ outside episodic/ changed").toEqual([]);
    expect(warnedT3.length, `a warning names the damaged run ${runs.T3}: ${JSON.stringify(episodicLines()).slice(0, 1500)}`).toBeGreaterThan(0);
  }, 600_000);

  it("EC-07: a restart with no change writes no file under episodic/", async () => {
    await stopBuilt();
    const before = await listing(episodicDir);
    const memoryBefore = pathSizeMtime(await listing(memoryDir, episodicDir));
    const started = await startBuilt();
    await sleep(25_000);
    const after = await listing(episodicDir);
    evidence.ec07 = { listeningMs: started.listeningAt - started.spawnedAt, changed: diffKeys(before, after), outsideEpisodicChanged: diffKeys(memoryBefore, pathSizeMtime(await listing(memoryDir, episodicDir))) };
    expect(diffKeys(before, after), "no catalog or index file written").toEqual([]);
    await stopBuilt();
  }, 300_000);
});
