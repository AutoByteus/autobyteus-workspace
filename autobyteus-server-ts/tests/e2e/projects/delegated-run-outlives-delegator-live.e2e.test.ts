import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { startCollaborationHarness, type CollaborationHarness, type Frame, type Rec } from "../helpers/collaboration-root-harness.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { closeLiveServerVault, initializeLiveServerVault, requireLiveCapability } from "../../../../test-support/test-vault/live-server-vault.js";

// autobyteus-461 AC-001 (REQ-001, REQ-002) on a real runtime (live, paid inference): a standalone agent delegated a long task
// to an Agent, and to a Team; the user stops the delegating agent. The delegating agent is stopped; the delegated run's turn
// is not interrupted; it keeps running under the stopped run and finishes.
// - The delegator is the scripted AGY actor (its tool calls are exact); the delegated agent, and the delegated team's
//   coordinator, run on the AutoByteus runtime over DeepSeek (their definitions' own default launch), so the turn that must
//   survive is real inference.
// - LIVE-1 (Agent child), LIVE-2 (Team child): delegate a long task, wait until the child's turn is running, Stop the delegator,
//   then the child's turn finishes with the codeword its task asks for; the delegator stays stopped; the child's own stream
//   shows no interruption.
// Gate: RUN_DEEPSEEK_E2E=1 and RUN_AGY_FAILURE_E2E=1 with ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs; the key comes
// from the test vault (AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault, TESTING.md#test-vault); a missing key is a skip.
// Model override: DEEPSEEK_E2E_MODEL (default: the first deepseek-v4-flash, else deepseek model of the catalog).
//   env -i PATH HOME=<temp> TMPDIR USER AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_DEEPSEEK_E2E=1 RUN_AGY_FAILURE_E2E=1 \
//     ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/projects/delegated-run-outlives-delegator-live.e2e.test.ts --no-watch
const { home, priorHome } = await vi.hoisted(async () => {
  if (process.env["RUN_DEEPSEEK_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "outlive-live-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_DEEPSEEK_E2E === "1" && process.env.RUN_AGY_FAILURE_E2E === "1"
  && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const RUNNING = new Set(["running", "processing", "thinking", "executing_tool", "tool_execution", "initializing"]);

suite("A delegated run outlives its delegator's Stop on a real runtime (AC-001; live DeepSeek, scripted delegator)", () => {
  let h: CollaborationHarness;
  const ids: Rec = {};
  const names: Rec = {};
  const sockets: WebSocket[] = [];
  let model = "";
  const evidence: Rec = {};

  beforeAll(async () => {
    h = await startCollaborationHarness("outlive-live");
    // As at server startup: the test vault is the only key source (read-only).
    await initializeLiveServerVault();
    const catalog = (await h.graphql(`mutation($p:String!,$r:String){ensureProviderModelCatalog(providerId:$p,runtimeKind:$r){llmModels{modelIdentifier}}}`,
      { p: "DEEPSEEK", r: "autobyteus" })).ensureProviderModelCatalog.llmModels.map((entry: Rec) => entry.modelIdentifier as string);
    model = (process.env["DEEPSEEK_E2E_MODEL"] && catalog.includes(process.env["DEEPSEEK_E2E_MODEL"]) ? process.env["DEEPSEEK_E2E_MODEL"] : null)
      ?? catalog.find((id: string) => /^deepseek-v4-flash/.test(id)) ?? catalog.find((id: string) => /^deepseek/.test(id)) ?? "";
    const suffix = randomUUID().slice(0, 6);
    names.manager = `Outlive manager ${suffix}`; names.writer = `Outlive writer ${suffix}`; names.lead = `Outlive lead ${suffix}`;
    names.mate = `Outlive mate ${suffix}`; names.squad = `Outlive squad ${suffix}`;
    ids.manager = await h.agentDefinition(names.manager);
    const live = model ? { defaultLaunchConfig: { runtimeKind: "autobyteus", llmModelIdentifier: model, llmConfig: null } } : {};
    const instructions = "When you receive a task, do it in one answer without calling any tool: write a numbered list of 40 short, "
      + "distinct facts about the topic it names, one per line, then a final line with exactly the codeword the task gives.";
    ids.writer = await h.agentDefinition(names.writer, { instructions, ...live });
    ids.lead = await h.agentDefinition(names.lead, { instructions, ...live });
    ids.mate = await h.agentDefinition(names.mate, { ...live });
    ids.squad = await h.teamDefinition(names.squad, [["lead", ids.lead], ["mate", ids.mate]], "lead");
  }, 300_000);

  afterAll(async () => {
    const dir = process.env["OUTLIVE_LIVE_EVIDENCE"];
    if (dir) fs.writeFileSync(dir, `${JSON.stringify(evidence, null, 2)}\n`);
    for (const socket of sockets) socket.terminate();
    if (h) await h.close();
    await closeLiveServerVault();
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      fs.rmSync(home, { recursive: true, force: true });
    }
  }, 300_000);

  /** A stream of the run's own (rule 2): `/ws/agent/<run>` or `/ws/agent-team/<team>`, open from now on. */
  const ownStream = async (route: "agent" | "agent-team", id: string, ready: string) => {
    const socket = new WebSocket(`ws://${new URL(h.url).host}/ws/${route}/${id}`); sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => frames.some((f) => f.type === ready), `${route}/${id} ${ready}`, 60_000);
    return { socket, frames };
  };
  const statusesOf = (frames: Frame[], agentRunId: string) => frames.flatMap((f) => {
    const text = JSON.stringify(f);
    if (!text.includes("AGENT_STATUS") || !text.includes(agentRunId)) return [];
    const match = /"status":"([a-z_]+)"/.exec(text);
    return match ? [match[1]!] : [];
  });
  const agentActive = async (runId: string) => Boolean((await h.graphql(`query($id:String!){getAgentRunResumeConfig(runId:$id){isActive}}`, { id: runId })).getAgentRunResumeConfig?.isActive);
  const conversationText = async (query: string, vars: Rec) => JSON.stringify(Object.values(await h.graphql(query, vars))[0] ?? null);

  const journey = async (kind: "agent" | "team") => {
    const root = await h.startRoot("agent", ids);
    const M = root.managerRunId;
    const codeword = `OUTLIVE-${kind.toUpperCase()}-${randomUUID().slice(0, 6)}`;
    const description = `Topic: the history of lighthouses. Codeword: ${codeword}`;
    const target = kind === "agent" ? `/${segment(names.writer)}` : `/${segment(names.squad)}`;
    const result = await h.mcpCall(M, "delegate_task", { recipient_address: target, description });
    expect(result.isError, result.text).toBe(false);
    const delegated = JSON.parse(result.text) as Rec;
    expect(delegated, result.text).toMatchObject({ delegated: true });
    const worker = (kind === "agent" ? delegated.target_agent_run_id : delegated.target_team_coordinator_agent_run_id) as string;
    const stream = kind === "agent" ? await ownStream("agent", worker, "CONNECTED") : await ownStream("agent-team", delegated.target_team_run_id as string, "TEAM_EXECUTION_VIEW_SNAPSHOT");
    // The child's turn on the real model is running.
    await until(() => statusesOf(stream.frames, worker).some((status) => RUNNING.has(status)), `${kind}: the child's real turn is running`, 120_000);
    const before = { statuses: statusesOf(stream.frames, worker) };
    // The user stops the delegating agent (its own Stop).
    await h.terminate("agent", M);
    const stoppedAt = Date.now();
    // The child's turn is not interrupted: it finishes with the codeword.
    const read = kind === "agent"
      ? () => conversationText(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: worker })
      : () => conversationText(`query($t:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$t,agentRunId:$a){conversation}}`, { t: delegated.target_team_run_id, a: worker });
    let text = "";
    await until(async () => (text = await read()).split(codeword).length > 2, `${kind}: the child's turn finished with the codeword`, 300_000);
    const finishedAfterMs = Date.now() - stoppedAt;
    const statuses = statusesOf(stream.frames, worker);
    expect(statuses.filter((status) => /interrupt|cancel|stopped|terminated|error/.test(status)), `${kind}: no interruption on the child's own stream`).toEqual([]);
    // The delegator stays stopped.
    expect(await agentActive(M), `${kind}: the delegating agent stays stopped`).toBe(false);
    evidence[kind] = { M, worker, model, codeword, before, statuses, finishedAfterMs, answerTail: text.slice(-600) };
    stream.socket.close();
    root.close();
    if (kind === "team") await h.terminate("team", delegated.target_team_run_id as string).catch(() => undefined);
    else await h.graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}`, { id: worker }).catch(() => undefined);
  };

  it("LIVE-1 an Agent child's real turn finishes after its delegator's Stop", async (ctx) => {
    await requireLiveCapability(ctx, "provider.deepseek.api-key");
    expect(model, "a DeepSeek model in the catalog").toBeTruthy();
    await journey("agent");
  }, 600_000);

  it("LIVE-2 a Team child's coordinator's real turn finishes after its delegator's Stop", async (ctx) => {
    await requireLiveCapability(ctx, "provider.deepseek.api-key");
    expect(model, "a DeepSeek model in the catalog").toBeTruthy();
    await journey("team");
  }, 600_000);
});
