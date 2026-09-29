import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ContextFileProcessFixture, PNG, type Attachment } from "../helpers/context-file-process-fixture.js";

// Run after `pnpm -C autobyteus-server-ts build` with RUN_CONTEXT_FILE_PROCESS_E2E=1.
// External inference is deterministic; HTTP, WS, provider normalization, traces,
// strict package admission, Prisma migration ledger and server restart are real.
const run = process.env.RUN_CONTEXT_FILE_PROCESS_E2E === "1" ? describe : describe.skip;
const migrationId = "20260926_team_context_file_execution_locators_v1";
const hash = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
const readJson = async (file: string) => JSON.parse(await fs.readFile(file, "utf8"));
const writeJson = (file: string, value: unknown) => fs.writeFile(file, JSON.stringify(value));

run("Context-file built-process runtime and upgrade", () => {
  let f: ContextFileProcessFixture;
  const copies: string[] = [];
  beforeEach(async () => { f = new ContextFileProcessFixture(); await f.setup(); }, 90_000);
  afterEach(async ({ task }) => {
    const evidence = process.env.CONTEXT_FILE_E2E_EVIDENCE_DIR;
    const failed = task.result?.state === "fail";
    if (evidence) {
      await fs.mkdir(evidence, { recursive: true });
      await fs.writeFile(path.join(evidence, task.name.replace(/[^a-z0-9]+/gi, "-") + ".log"), `Fixture root: ${f.root}\n${f.logs}`);
    }
    await f?.cleanup(Boolean(evidence && failed));
    await Promise.all(copies.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
  }, 30_000);

  const launch = (kind: "agent" | "team") => f.launch(kind);
  async function attachments(owner: { runId: string; teamRunId: string | null; directory: string }, failFinalizationOnce = false) {
    const draft = owner.teamRunId ? { kind: "team_member_draft", teamDraftId: "draft", memberAddress: "/worker" }
      : { kind: "agent_draft", draftRunId: "draft" };
    const final = owner.teamRunId ? { kind: "team_member_final", teamRunId: owner.teamRunId, agentRunId: owner.runId }
      : { kind: "agent_final", runId: owner.runId };
    const uploaded = [await f.upload(draft, "image.png", PNG, "image/png"),
      await f.upload(draft, "notes.txt", Buffer.from("original file bytes"), "text/plain")];
    for (const a of uploaded) expect((await fetch(f.origin + a.locator)).status).toBe(200);
    if (failFinalizationOnce) {
      // Real filesystem failure, not a mocked transport response. Draft bytes must survive retry.
      await fs.mkdir(owner.directory, { recursive: true });
      const blocker = path.join(owner.directory, "context_files");
      await fs.writeFile(blocker, "owned finalization blocker", { flag: "wx" });
      try {
        const failed = await fetch(`${f.origin}/rest/context-files/finalize`, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ draftOwner: draft, finalOwner: final, attachments: uploaded }),
        });
        expect(failed.status).toBe(400);
        await verifyBytes(uploaded);
        expect(f.requests).toHaveLength(0);
      } finally { await fs.unlink(blocker); }
    }
    return f.finalize(draft, final, uploaded);
  }
  async function verifyBytes(files: Attachment[]) {
    for (const [index, file] of files.entries()) {
      const response = await fetch(f.origin + file.locator);
      expect(response.status).toBe(200);
      expect(Buffer.from(await response.arrayBuffer())).toEqual(index === 0 ? PNG : Buffer.from("original file bytes"));
    }
  }

  it.each(["agent", "team"] as const)("delivers %s image/file bytes through HTTP, WS and synchronous provider reads, then survives restart", async kind => {
    const owner = await launch(kind);
    const files = await attachments(owner, kind === "team");
    const events = await f.send(owner.teamRunId ? `/ws/agent-team/${owner.teamRunId}` : `/ws/agent/${owner.runId}`,
      owner.teamRunId ? owner.runId : null, "Validate these disposable attachments.", files);
    await verifyBytes(files);
    const request = JSON.stringify(f.requests.at(-1));
    expect(request).toContain(PNG.toString("base64"));
    expect(request).not.toContain("/rest/team-runs/");
    if (owner.teamRunId) {
      expect(events.find(e => e.type === "MEMBER_INPUT_MESSAGE")?.payload).toMatchObject({
        recipient_agent_run_id: owner.runId,
        context_file_paths: files.map(file => ({ path: file.locator, type: file.displayName.endsWith(".png") ? "image" : "text" })),
      });
    }
    const tracePath = path.join(owner.directory, "raw_traces_active.jsonl");
    const traceBefore = await fs.readFile(tracePath);
    expect(traceBefore.toString()).toContain(files[1]!.locator); // recording keeps file locator while provider gets local path
    await f.stop(); await f.start();
    await verifyBytes(files);
    expect(hash(await fs.readFile(tracePath))).toBe(hash(traceBefore));
  }, 120_000);

  it("rejects uncontained and cross-owner final-file symlinks at HTTP access without blocking valid attachments", async () => {
    const owner = await launch("team"); const files = await attachments(owner);
    const file = path.join(owner.directory, "context_files", files[0]!.storedFilename);
    const outside = path.join(f.root, "outside-memory.txt");
    await fs.writeFile(outside, "must not be returned");
    const other = await launch("agent");
    await fs.mkdir(path.join(other.directory, "context_files"), {recursive:true});
    const otherFile = path.join(other.directory, "context_files", files[0]!.storedFilename);
    await fs.writeFile(otherFile, "other owner bytes");
    for (const target of [outside, otherFile]) {
      await fs.unlink(file); await fs.symlink(target, file);
      expect((await fetch(f.origin + files[0]!.locator)).status).toBe(404);
      expect(await (await fetch(f.origin + files[1]!.locator)).text()).toBe("original file bytes");
    }
    await fs.unlink(file); await fs.writeFile(file, PNG); await verifyBytes(files);
  }, 120_000);

  it("uploads, previews and removes Team drafts before launch, then binds remaining bytes to the returned exact execution", async () => {
    const draft = { kind: "team_member_draft", teamDraftId: "before-launch", memberAddress: "/worker" };
    const removed = await f.upload(draft, "remove.png", PNG, "image/png");
    expect(Buffer.from(await (await fetch(f.origin + removed.locator)).arrayBuffer())).toEqual(PNG);
    expect((await fetch(f.origin + removed.locator, { method: "DELETE" })).status).toBe(204);
    expect((await fetch(f.origin + removed.locator)).status).toBe(404);
    const uploaded = [await f.upload(draft, "image.png", PNG, "image/png"),
      await f.upload(draft, "notes.txt", Buffer.from("original file bytes"), "text/plain")];
    await verifyBytes(uploaded);
    const owner = await launch("team");
    const files = await f.finalize(draft,
      { kind: "team_member_final", teamRunId: owner.teamRunId, agentRunId: owner.runId }, uploaded);
    expect(files.every(file => file.locator.includes(`/agent-runs/${owner.runId}/`))).toBe(true);
    await verifyBytes(files);
    const events = await f.send(`/ws/agent-team/${owner.teamRunId}`, owner.runId, "Prelaunch attachment delivery.", files);
    expect(events.find(event => event.type === "MEMBER_INPUT_MESSAGE")?.payload.recipient_agent_run_id).toBe(owner.runId);
    expect(await fs.readdir(path.join(owner.directory, "context_files"))).not.toContain(removed.storedFilename);
  }, 120_000);

  it("converts a copied retained duplicate-address package before admission and preserves bytes, history and inert released residue across restart", async () => {
    const owner = await launch("team");
    const files = await attachments(owner);
    await f.send(`/ws/agent-team/${owner.teamRunId}`, owner.runId, "Retained image and file history.", files);
    await f.stop();
    const originalRoot = f.root;
    const copyRoot = `${originalRoot}-upgrade`; copies.push(originalRoot);
    await fs.cp(originalRoot, copyRoot, { recursive: true }); f.root = copyRoot;
    const teamDir = path.join(copyRoot, "memory", "agent_teams", owner.teamRunId!);
    const agentDir = path.join(teamDir, owner.runId);
    const treePath = path.join(teamDir, "team_run_execution_tree.json");
    const tree = await readJson(treePath);
    const timestamp = "2026-09-01T00:00:00.000Z";
    tree.rootTeam.taskExecutions.push({ address: "/worker", agentRunId: "retained-task", platformAgentRunId: null, delegatorAgentRunId: owner.runId, startedAt: timestamp });
    await writeJson(treePath, tree);
    const otherDir = path.join(teamDir, "retained-task", "context_files"); await fs.mkdir(otherDir, { recursive: true });
    for (const file of files) await fs.writeFile(path.join(otherDir, file.storedFilename), `other execution ${file.displayName}`);
    const tracePath = path.join(agentDir, "raw_traces_active.jsonl");
    const rows = (await fs.readFile(tracePath, "utf8")).trim().split("\n").map(line => JSON.parse(line));
    const user = rows.find(row => row.trace_type === "user");
    user.media.images = [`/rest/team-runs/${owner.teamRunId}/members/worker/context-files/${files[0]!.storedFilename}`];
    user.file_attachments[0].uri = `/rest/team-runs/${owner.teamRunId}/members/%2Fworker/context-files/${files[1]!.storedFilename}`;
    const original = rows.map(row => JSON.stringify(row)).join("\n") + "\n";
    await fs.writeFile(tracePath, original);
    // Simulate an upgrade from the previous installed version in the stopped copy only.
    const db = new PrismaClient({ datasources: { db: { url: `file:${path.join(copyRoot, "db", "production.db")}` } } });
    try { await db.$executeRaw`DELETE FROM app_data_migration_records WHERE migration_id = ${migrationId}`; }
    finally { await db.$disconnect(); }
    const residueDir = path.join(copyRoot, "app-data-migration-backups", migrationId);
    await fs.mkdir(residueDir, {recursive:true});
    await fs.writeFile(path.join(residueDir, "manifest.json"), "malformed released manifest; not authority");
    await fs.writeFile(path.join(residueDir, "released.original"), original);
    await f.start();
    await verifyBytes(files);
    const converted = (await fs.readFile(tracePath, "utf8")).trim().split("\n").map(line => JSON.parse(line));
    const expected = structuredClone(rows); const expectedUser = expected.find(row => row.trace_type === "user");
    expectedUser.media.images = [files[0]!.locator]; expectedUser.file_attachments[0].uri = files[1]!.locator;
    expect(converted).toEqual(expected); // all non-locator values preserved
    for (const file of files) {
      expect(await (await fetch(f.origin + file.locator.replace(`/${owner.runId}/`, "/retained-task/"))).text()).toBe(`other execution ${file.displayName}`);
    }
    const backup = path.join(copyRoot, "app-data-migration-backups", migrationId);
    expect((await fs.readdir(backup)).sort()).toEqual(["manifest.json", "released.original"]);
    expect(await fs.readFile(path.join(backup, "manifest.json"), "utf8")).toBe("malformed released manifest; not authority");
    expect(await fs.readFile(path.join(backup, "released.original"), "utf8")).toBe(original);
    const after = await fs.readFile(tracePath);
    await f.stop(); await f.start(); await verifyBytes(files);
    expect(hash(await fs.readFile(tracePath))).toBe(hash(after));
    expect(await fs.readFile(path.join(backup, "released.original"), "utf8")).toBe(original);
    await f.gql(`mutation {reloadProviderModelCatalog(providerId:"LMSTUDIO",runtimeKind:"autobyteus"){llmModels{modelIdentifier}}}`);
    const restored = await f.gql(`mutation($teamRunId:String!){restoreAgentTeamRun(teamRunId:$teamRunId){success message}}`, { teamRunId: owner.teamRunId });
    expect(restored.restoreAgentTeamRun.success, restored.restoreAgentTeamRun.message).toBe(true);
    const fresh = await attachments(owner);
    const delivered = await f.send(`/ws/agent-team/${owner.teamRunId}`, owner.runId, "New exact-target message after duplicate-address restore.", fresh);
    expect(delivered.find(event => event.type === "MEMBER_INPUT_MESSAGE")?.payload.recipient_agent_run_id).toBe(owner.runId);
    expect(delivered.some(event => event.payload.agent_run_id === "retained-task")).toBe(false);
    expect((await fs.readdir(otherDir)).sort()).toEqual(files.map(file => file.storedFilename).sort());
    await verifyBytes(files); await verifyBytes(fresh);
  }, 120_000);
  it("resumes an eligible interrupted old/current corpus without a journal or overwriting later current writes", async () => {
    const owner = await launch("team"); const files = await attachments(owner); await f.stop();
    const tracePath = path.join(owner.directory, "raw_traces_active.jsonl");
    const old = files[0]!.locator.replace(`/agent-runs/${owner.runId}/`, "/members/%2Fworker/");
    const original = JSON.stringify({ id: "retained", trace_type: "user", content: "Preserved", media: { images: [old] } }) + "\n";
    await fs.writeFile(tracePath, original);
    const databaseUrl = `file:${path.join(f.root, "db", "production.db")}`;
    const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    try { await db.$executeRaw`DELETE FROM app_data_migration_records WHERE migration_id = ${migrationId}`; }
    finally { await db.$disconnect(); }
    const backup = path.join(f.root, "app-data-migration-backups", migrationId);
    await fs.rm(backup, { recursive: true, force: true });
    await expect(f.start({ interruptAfterTraceCommit: true })).rejects.toThrow("SIGKILL");
    expect(JSON.parse(await fs.readFile(tracePath, "utf8")).media.images).toEqual([files[0]!.locator]);
    await expect(fs.access(backup)).rejects.toMatchObject({code:"ENOENT"});
    const later = JSON.stringify({id:"later-current",trace_type:"user",content:"Preserve newer current write"}) + "\n";
    await fs.appendFile(tracePath, later);
    const remaining = path.join(owner.directory, "raw_traces_000001.jsonl");
    await fs.writeFile(remaining, original); // Still-old source in the stopped disposable partial corpus.
    await f.start(); // Active migration lease no longer globally blocks valid current data.
    await verifyBytes(files);
    await f.stop();
    // Model elapsed stale-lock time without waiting 15 minutes; writer/kill/recovery are real.
    const clockDb = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    try { await clockDb.$executeRaw`UPDATE app_data_migration_records SET started_at = ${new Date(0)} WHERE migration_id = ${migrationId}`; }
    finally { await clockDb.$disconnect(); }
    await f.start(); await verifyBytes(files);
    expect(JSON.parse((await fs.readFile(remaining, "utf8")).trim()).media.images).toEqual([files[0]!.locator]);
    expect(await fs.readFile(tracePath,"utf8")).toContain(later);
    await expect(fs.access(backup)).rejects.toMatchObject({code:"ENOENT"});
  }, 120_000);

});
