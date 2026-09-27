import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ContextFileProcessFixture } from "../helpers/context-file-process-fixture.js";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";
import { writeAttachmentSidecars } from "../../fixtures/current-attachment-package-fixtures.js";

const run = process.env.RUN_CONTEXT_FILE_PROCESS_E2E === "1" ? describe : describe.skip;
const ID = "20260926_team_context_file_execution_locators_v1";
const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const put = async (file: string, value: unknown) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, typeof value === "string" ? value : JSON.stringify(value));
};
const locator = (id: string) => `/rest/team-runs/${id}/agent-runs/${id}-agent/context-files/ctx_file__notes.txt`;
async function seedTeam(root: string, id: string, uri?: string) {
  const directory = path.join(root, "memory", "agent_teams", id);
  await put(path.join(directory, "team_run_execution_tree.json"), testExecutionTree({ rootTeamRunId: id,
    coordinatorAddress: "/worker", children: [testAgentNode("/worker", { agentRunId: `${id}-agent` })] }));
  writeAttachmentSidecars(directory, "team", id, `${id}-agent`);
  await put(path.join(directory, `${id}-agent`, "context_files", "ctx_file__notes.txt"), `${id} original bytes`);
  if (uri) await put(path.join(directory, `${id}-agent`, "raw_traces_active.jsonl"),
    JSON.stringify({ id: "historical", trace_type: "user", content: "Retained history", media: { images: [uri] } }) + "\n");
}
async function residue(root: string) {
  await fs.mkdir(path.join(root, "memory", "agent_teams", "empty", "empty-member"), { recursive: true });
  await put(path.join(root, "memory", "agent_teams", "incomplete", "member", "raw_traces_active.jsonl"),
    '{"id":"retained","trace_type":"user","content":"Keep this historical data"}\n');
}
async function record(root: string) {
  const db = new PrismaClient({ datasources: { db: { url: `file:${path.join(root, "db", "production.db")}` } } });
  try { return (await db.$queryRawUnsafe<any[]>("SELECT status, attempts, summary, error_message, log_path FROM app_data_migration_records WHERE migration_id = ?", ID))[0]; }
  finally { await db.$disconnect(); }
}

run("Scoped historical attachment recovery through actual startup entrypoints", () => {
  let f: ContextFileProcessFixture;
  beforeEach(() => { f = new ContextFileProcessFixture(); });
  afterEach(async ({ task }) => {
    const evidence = process.env.CONTEXT_FILE_E2E_EVIDENCE_DIR;
    if (evidence) {
      await fs.mkdir(evidence, { recursive: true });
      await fs.writeFile(path.join(evidence, `recovery-${task.name.replace(/[^a-z0-9]+/gi, "-")}.log`), `Root: ${f.root}\n${f.logs}`);
    }
    await f.cleanup(Boolean(evidence && task.result?.state === "fail"));
  }, 30_000);

  async function newWork() {
    await f.gql(`mutation {reloadProviderModelCatalog(providerId:"LMSTUDIO",runtimeKind:"autobyteus"){llmModels{modelIdentifier}}}`);
    const owner = await f.launch("agent");
    const events = await f.send(`/ws/agent/${owner.runId}`, null, "New work after historical exclusions.", []);
    expect(events.some(event => event.type === "ASSISTANT_COMPLETE")).toBe(true);
    expect(f.requests.length).toBeGreaterThan(0);
  }
  async function unavailable(id: string) {
    expect((await fetch(f.origin + locator(id))).status).toBe(404);
    await expect(f.gql(`query($id:String!,$agent:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$agent){conversation}}`, { id, agent: `${id}-agent` })).rejects.toThrow();
    const result = await f.gql(`mutation($id:String!){restoreAgentTeamRun(teamRunId:$id){success message}}`, { id });
    expect(result.restoreAgentTeamRun.success).toBe(false);
  }

  async function readableHistory(id: string) {
    expect(await (await fetch(f.origin + locator(id))).text()).toBe(`${id} original bytes`);
    const projection = await f.gql(`query($id:String!,$agent:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$agent){conversation}}`, { id, agent: `${id}-agent` });
    expect(JSON.stringify(projection)).toContain("Retained history");
    expect((await fetch(f.origin + locator("incomplete"))).status).toBe(404);
    expect((await fetch(f.origin + "/rest/team-runs/incomplete/members/worker/context-files/ctx_file__notes.txt")).status).toBe(404);
  }

  it("preserves incomplete roots while missing historical references fail only at requested access in both hosts", async () => {
    await f.setup({ seed: residue });
    // Preserve the normally completed predecessor ledger; do not replay old migrations over current fixtures.
    await f.stop();
    await seedTeam(f.root, "good");
    await seedTeam(f.root, "old-dependent", "/rest/team-runs/incomplete/members/worker/context-files/ctx_file__notes.txt");
    await seedTeam(f.root, "exact-dependent", locator("incomplete"));
    await f.start();
    const retained = path.join(f.root, "memory", "agent_teams", "incomplete", "member", "raw_traces_active.jsonl");
    const before = digest(await fs.readFile(retained));
    expect(await record(f.root)).toMatchObject({ status: "SUCCEEDED_WITH_WARNINGS" });
    const first = await record(f.root);
    for (const id of ["empty", "incomplete"]) await unavailable(id);
    for (const id of ["old-dependent", "exact-dependent"]) await readableHistory(id);
    expect(await (await fetch(f.origin + locator("good"))).text()).toBe("good original bytes");
    expect((await f.gql(`query{getTeamRunResumeConfig(teamRunId:"good"){teamRunId}}`)).getTeamRunResumeConfig.teamRunId).toBe("good");
    await newWork(); await f.stop();
    expect(await f.standalone()).toContain("STANDALONE_ADMITTED");
    await f.start();
    expect(await record(f.root)).toEqual(first); // Terminal warnings skip; structural rejection and operation-scoped access remain.
    await unavailable("incomplete");
    for (const id of ["old-dependent", "exact-dependent"]) await readableHistory(id);
    expect(await (await fetch(f.origin + locator("good"))).text()).toBe("good original bytes");
    expect(digest(await fs.readFile(retained))).toBe(before);
  }, 150_000);

  it("starts both hosts when all historical roots are excluded and executes genuinely new work", async () => {
    await f.setup({ seed: residue });
    expect(await record(f.root)).toMatchObject({ status: "SUCCEEDED_WITH_WARNINGS" });
    await unavailable("incomplete"); await unavailable("empty");
    await f.stop(); expect(await f.standalone()).toContain("STANDALONE_ADMITTED");
    await f.start();
    await newWork();
    expect(await fs.readFile(path.join(f.root, "memory", "agent_teams", "incomplete", "member", "raw_traces_active.jsonl"), "utf8"))
      .toContain("Keep this historical data");
  }, 150_000);

  it("skips terminal SUCCEEDED without auditing historical references or hiding readable conversations", async () => {
    await f.setup(); const first = await record(f.root); expect(first.status).toBe("SUCCEEDED");
    await f.stop(); await residue(f.root);
    await seedTeam(f.root, "unavailable", locator("incomplete"));
    await f.start(); await readableHistory("unavailable"); await unavailable("incomplete");
    expect(await record(f.root)).toEqual(first); // No test ledger mutation and no forced rerun.
    await newWork(); await f.stop();
    expect(await f.standalone()).toContain("STANDALONE_ADMITTED");
  }, 150_000);

  it("ignores and retains released journal residue without treating it as current startup authority", async () => {
    await f.setup({ seed: async root => {
      await put(path.join(root, "app-data-migration-backups", ID), "inert released residue");
    } });
    const first = await record(f.root); expect(first.status).toBe("SUCCEEDED");
    await newWork(); await f.stop();
    expect(await f.standalone()).toContain("STANDALONE_ADMITTED");
    await f.start();
    expect(await record(f.root)).toEqual(first);
    expect(await fs.readFile(path.join(f.root, "app-data-migration-backups", ID), "utf8")).toBe("inert released residue");
  }, 150_000);
});
