import "reflect-metadata";
import fs from "node:fs/promises";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { getSecretVaultRuntime, resetSecretVaultRuntimeForTests } from "../../../src/secret-management/secret-vault-runtime.js";
import { readLiveTestSecret } from "../../../../test-support/test-vault/live-test-secret.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";

/**
 * Skills added to or removed from a running agent's definition on Antigravity (autobyteus-460), through the real Studio
 * server (GraphQL saves, agent package folder feed, agent/team WebSockets, scoped agent-tools MCP, run manager, AGY
 * factory and capsule, credential proxy). Only the AGY CLI is scripted (`tests/fixtures/agy-failure-cli.mjs`, case
 * `linked_skills`, through `agy-shell-env-probe-cli.mjs`): `ECHO_INPUT` replies with the exact provider input of the
 * turn, `READ_SKILLS` lists `.agents/skills/*` in the capsule as AGY reads it, `CALL_TOOL:{…}` calls a real agent tool.
 * No model calls.
 * - API-05a (AC-012, AC-001, AC-003, AC-008; RU-01, RU-03): an added skill is linked into the run's capsule and listed
 *   in its `manifest.json` before the next input, which carries one "now available" notice with the `SKILL.md` path;
 *   a skill removed by editing the package's `agent-config.json` is announced and keeps its link (DEC-007); after a
 *   stop, a save while stopped and a message, the restored run keeps the mid-run link and manifest entry, and its
 *   first input carries one notice for both changes; a skill added to the restored run is linked too.
 * - API-05b (AC-009): a Team member and a delegated copy of the same agent each get their own capsule link and their
 *   own notice with their next input; a member of another agent gets none.
 * - API-05c (AC-006, AC-007; RU-04, QR-002), gated by RUN_GITHUB_PROXY_E2E=1 and `test.github.token` in the test vault:
 *   the GitHub integration's skill added to a run without GitHub access says that access starts when the run is
 *   restarted, and the running AGY process gets no variables; after stop and a message the restored process reaches
 *   GitHub through the proxy (issue #1 of the test repository: 200); the skill removed → the next call is refused
 *   (403 `INTEGRATION_NOT_ALLOWED`) and the agent is told; added back → 200, and the notice no longer speaks of a
 *   restart (the pass already holds GitHub).
 *
 * Run:
 *   RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/autobyteus-server-ts/tests/fixtures/agy-shell-env-probe-cli.mjs \
 *   [RUN_GITHUB_PROXY_E2E=1 AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault] \
 *   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-skill-definition-changes-transport.e2e.test.ts --no-watch
 * Unset AUTOBYTEUS_AGENT_PACKAGE_ROOTS, AUTOBYTEUS_SKILLS_PATHS and AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS (`env -u …`).
 * API-05c needs network access to api.github.com and github.com. Optional AGY_SKILL_DEFINITION_E2E_EVIDENCE_DIR writes
 * one JSON receipt per case (the run's pass is masked; the token is never written).
 */
const COMMAND = process.env["ANTIGRAVITY_CLI_COMMAND"]?.trim() ?? "";
const PROBE_CLI = fileURLToPath(new URL("../../fixtures/agy-shell-env-probe-cli.mjs", import.meta.url));
const SHELL_PROBE = fileURLToPath(new URL("../../fixtures/github-proxy-shell-probe.sh", import.meta.url));
const enabled = process.env["RUN_AGY_FAILURE_E2E"] === "1" && Boolean(COMMAND)
  && spawnSync(COMMAND, ["--version"], { stdio: "ignore" }).status === 0;
const githubEnabled = enabled && process.env["RUN_GITHUB_PROXY_E2E"] === "1" && path.resolve(COMMAND) === PROBE_CLI;
const suite = enabled ? describe : describe.skip;

type Frame = { type: string; payload: Record<string, any> };
type CapsuleSkill = { name: string; symlink: boolean; target: string | null; skillMd: string };
const HEADER = "[Platform notice — skill updated]";
const REPOSITORY = "ryan-zheng-teki/autobyteus-mcp-test";
const GITHUB_SKILL = "github-integration";
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const occurrences = (text: string, needle: string) => text.split(needle).length - 1;
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const mask = (text: string) => text.replace(/rp_[A-Za-z0-9_-]+/g, "rp_<pass>");
const skillMd = (name: string, description: string, codeword: string) =>
  `---\nname: ${name}\ndescription: ${description}\n---\n\nThe ${name} codeword is ${codeword}.\n`;

/** Every string after `marker` in a conversation projection, one per conversation entry, in order. */
const markerTexts = (conversation: unknown, marker: string): string[] => (Array.isArray(conversation) ? conversation : []).flatMap((entry) => {
  const strings: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "string") { if (value.includes(marker)) strings.push(value); return; }
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(entry);
  return strings.length ? [strings[0]!.slice(strings[0]!.indexOf(marker) + marker.length)] : [];
});
/** A JSON value at the start of `raw` (the scripted reply quotes it; anything after it is not part of it). */
const leadingJson = (raw: string): unknown => {
  for (let end = raw.length; end > 0; end -= 1) {
    try { return JSON.parse(raw.slice(0, end)); } catch { /* shorter */ }
  }
  throw new Error(`No JSON at the start of ${raw.slice(0, 120)}`);
};
const echoes = (conversation: unknown) => markerTexts(conversation, "ECHO:").map((raw) => leadingJson(raw) as string);
const skillReads = (conversation: unknown) => markerTexts(conversation, "SKILLS:").map((raw) => leadingJson(raw) as CapsuleSkill[]);
const objectsIn = (value: unknown): Record<string, any>[] => {
  const found: Record<string, any>[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== "object") return;
    found.push(node as Record<string, any>);
    Object.values(node).forEach(visit);
  };
  visit(value);
  return found;
};
/** Task execution nodes (delegated copies) of a root tree. */
const taskNodes = (tree: unknown) => objectsIn(tree).flatMap((record) => {
  const startedAt = record.startedAt ?? record.started_at;
  const agentRunId = record.agentRunId ?? record.agent_run_id;
  return typeof startedAt === "string" && agentRunId && !(record.teamRunId ?? record.team_run_id)
    ? [{ agentRunId: String(agentRunId), address: String(record.address) }] : [];
});
const envOf = (text: string) => new Map(text.split("\n").filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
  .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)] as const));

suite("Skills added to or removed from a running agent's definition on Antigravity (real server; scripted AGY CLI)", () => {
  let dataDir = "", workspace = "", argvLog = "", probeRoot = "", integrationSource = "";
  let app: FastifyInstance | undefined;
  let url!: URL;
  let secret: string | null = null;
  const sockets: WebSocket[] = [];
  const active: Array<{ kind: "agent" | "team"; id: string }> = [];
  const savedEnv = new Map<string, string | undefined>();
  const evidenceDir = process.env["AGY_SKILL_DEFINITION_E2E_EVIDENCE_DIR"]?.trim() || null;

  const graphql = async <T = any>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || (body.errors && body.errors.length)) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const config = () => ({ workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low",
    llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" });
  const skillPath = (name: string) => path.join(dataDir, "skills", name, "SKILL.md");
  const writeSkill = async (name: string, description: string, codeword: string) => {
    await fs.mkdir(path.dirname(skillPath(name)), { recursive: true });
    await fs.writeFile(skillPath(name), skillMd(name, description, codeword));
  };
  const createAgent = async (name: string, toolNames: string[], skillNames: string[]) => (await graphql(
    "mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}",
    { input: { name, role: "assistant", category: "runtime-e2e", description: `${name} (autobyteus-460 AGY E2E)`,
      instructions: "Follow the user's request.", toolNames, skillNames } })).createAgentDefinition.id as string;
  /** The agents page's save. */
  const saveSkills = (id: string, skillNames: string[]) =>
    graphql("mutation($input:UpdateAgentDefinitionInput!){updateAgentDefinition(input:$input){id}}", { input: { id, skillNames } });
  const definitionSkills = async (id: string) =>
    ((await graphql("query($id:String!){agentDefinition(id:$id){skillNames}}", { id })).agentDefinition?.skillNames ?? []) as string[];
  const launches = async () => (await fs.readFile(argvLog, "utf8").catch(() => "")).split("\n").filter(Boolean).length;
  const connect = async (route: string, id: string, ready: (frames: Frame[]) => boolean) => {
    const socket = new WebSocket(`ws://${url.host}/ws/${route}/${id}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => { const parsed = JSON.parse(String(raw)); frames.push({ type: parsed.type, payload: parsed.payload ?? {} }); });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => ready(frames), `${route} stream ready`, 30_000);
    return { socket, frames };
  };
  const terminate = async (runId: string) => {
    const result = (await graphql("mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}", { id: runId })).terminateAgentRun;
    expect(result.success, result.message).toBe(true);
  };
  /** A run's memory folder (its capsule is `<memoryDir>/agy-project`), wherever its root keeps it. */
  const memoryDirOf = async (runId: string): Promise<string> => {
    const search = (dir: string, depth: number): string | null => {
      let entries: import("node:fs").Dirent[] = [];
      try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return null; }
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const child = path.join(dir, entry.name);
        if (entry.name === runId && existsSync(path.join(child, "agy-project"))) return child;
        if (depth > 0) { const found = search(child, depth - 1); if (found) return found; }
      }
      return null;
    };
    let found: string | null = null;
    await until(() => (found = search(dataDir, 7)) !== null, `memory folder of ${runId}`, 30_000);
    return found!;
  };
  const capsuleOf = async (runId: string) => {
    const capsule = path.join(await memoryDirOf(runId), "agy-project");
    const link = (name: string) => path.join(capsule, ".agents", "skills", name);
    const manifestSkills = async () => (JSON.parse(await fs.readFile(path.join(capsule, "manifest.json"), "utf8")) as
      { skills: Array<{ name: string; relativePath: string }> }).skills.map((skill) => skill.name).sort();
    const linkedTo = async (name: string) => fs.realpath(link(name)).catch(() => null);
    return { capsule, link, manifestSkills, linkedTo };
  };
  const writeReceipt = async (name: string, receipt: unknown) => {
    if (!evidenceDir) return;
    await fs.mkdir(evidenceDir, { recursive: true });
    await fs.writeFile(path.join(evidenceDir, `${name}.json`), `${mask(JSON.stringify(receipt, null, 2))}\n`);
  };

  /** A standalone run with its input socket: `echo` sends a message and returns the provider input the agent got. */
  const standalone = async (agentDefinitionId: string) => {
    const created = (await graphql("mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}",
      { input: { agentDefinitionId, ...config() } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const runId = created.runId as string;
    active.push({ kind: "agent", id: runId });
    const { socket, frames } = await connect("agent", runId, (f) => f.some((frame) => frame.type === "CONNECTED"));
    const conversation = async () => (await graphql("query($id:String!){getRunProjection(runId:$id){conversation}}", { id: runId })).getRunProjection?.conversation;
    const turn = async <T>(content: string, read: (conversation: unknown) => T[]): Promise<T> => {
      const before = read(await conversation()).length;
      sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
      let all: T[] = [];
      await until(async () => { all = read(await conversation()); return all.length > before; }, `reply to ${content.slice(0, 60)}`, 90_000);
      return all[before]!;
    };
    const notices = () => frames.filter((frame) => frame.type === "SYSTEM_TASK_NOTIFICATION" && frame.payload.sender_id === "system.skill_update_notifier");
    return { runId, frames, notices, echo: (content: string) => turn(content, echoes), readSkills: () => turn("READ_SKILLS", skillReads),
      call: (content: string) => turn(content, (c) => markerTexts(c, "CALLED:")) };
  };

  beforeAll(async () => {
    dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "agy-skill-definition-e2e-")));
    workspace = path.join(dataDir, "workspace");
    argvLog = path.join(dataDir, "agy-argv.jsonl");
    probeRoot = path.join(dataDir, "agy-probes");
    integrationSource = path.join(dataDir, "integration-source");
    await fs.mkdir(workspace, { recursive: true });
    await writeSkill("anchor-skill", "A skill the run starts with.", "ANCHOR-1");
    await writeSkill("codeword-probe", "Gives the probe codeword.", "PROBE-4417");
    await writeSkill("extra-skill", "An extra skill added while the run is stopped.", "EXTRA-2290");
    await writeSkill("third-skill", "A skill added after the run was resumed.", "THIRD-6031");
    await writeSkill("team-probe", "Gives the team probe codeword.", "TEAM-5150");
    // The GitHub integration (API-05c): an imported folder whose skill grants GitHub through the proxy.
    await fs.mkdir(path.join(integrationSource, "github"), { recursive: true });
    await fs.writeFile(path.join(integrationSource, "github", "integration.json"), JSON.stringify({
      name: "GitHub", description: "GitHub through the credential proxy.", token: { help: "A test token." }, prerequisites: ["curl", "git"] }));
    await fs.writeFile(path.join(integrationSource, "github", "SKILL.md"),
      `---\nname: ${GITHUB_SKILL}\ndescription: Reach GitHub through the AutoByteus proxy.\n---\n\nUse $AUTOBYTEUS_GITHUB_API_URL.\n`);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    for (const key of ["AGY_FAKE_CASE", "AGY_FAKE_ARGV_LOG", "AGY_SHELL_PROBE_SCRIPT", "AGY_SHELL_PROBE_DIR",
      "AUTOBYTEUS_AGENT_PACKAGE_ROOTS", "AUTOBYTEUS_SKILLS_PATHS", "AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS"]) {
      savedEnv.set(key, process.env[key]);
      delete process.env[key];
    }
    process.env["AGY_FAKE_CASE"] = "linked_skills";
    process.env["AGY_FAKE_ARGV_LOG"] = argvLog;
    process.env["AGY_SHELL_PROBE_SCRIPT"] = SHELL_PROBE;
    process.env["AGY_SHELL_PROBE_DIR"] = probeRoot;
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    // As at server startup: the run database's own vault, where a GitHub connect stores the token.
    await resetSecretVaultRuntimeForTests();
    await getSecretVaultRuntime().initialize({ kind: "application", location: appConfigProvider.config.getOperationalDatabaseLocation() });
  }, 180_000);

  afterAll(async () => {
    const errors: string[] = [];
    for (const socket of sockets) socket.terminate();
    for (const run of [...active].reverse()) {
      const mutation = run.kind === "agent" ? "mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}"
        : "mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}";
      await graphql(mutation, { id: run.id }).catch((error) => errors.push(String(error)));
    }
    if (secret) await graphql("mutation { disconnectIntegration(id: \"github\") { state } }").catch((error) => errors.push(String(error)));
    if (app) await app.close();
    await resetSecretVaultRuntimeForTests();
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    expect(errors, "owned cleanup").toEqual([]);
  }, 120_000);

  it("API-05a (AC-012, AC-001, AC-003, AC-008): an added skill is linked into the capsule and announced; a package-file removal is announced; both survive stop, a save while stopped, and resume", async () => {
    const receipt: Record<string, unknown> = {};
    const agentId = await createAgent(`ab460-agy-${randomUUID().slice(0, 6)}`, [], ["anchor-skill"]);
    const run = await standalone(agentId);
    const first = await run.echo("ECHO_INPUT first");
    expect(first).not.toContain(HEADER);
    const capsule = await capsuleOf(run.runId);
    expect(await capsule.manifestSkills()).toEqual(["anchor-skill"]);

    // 1. Added on the agents page while the run is idle: linked into the capsule and listed in its manifest before
    //    the next input; the idle run is not woken (no new AGY launch, no notice on the wire yet).
    const launchesBeforeAdd = await launches();
    await saveSkills(agentId, ["anchor-skill", "codeword-probe"]);
    await until(async () => (await capsule.linkedTo("codeword-probe")) !== null
      && (await capsule.manifestSkills()).includes("codeword-probe"), "capsule link and manifest entry for codeword-probe", 30_000);
    expect(await capsule.linkedTo("codeword-probe")).toBe(await fs.realpath(path.dirname(skillPath("codeword-probe"))));
    expect((await fs.lstat(capsule.link("codeword-probe"))).isSymbolicLink()).toBe(true);
    expect(await capsule.manifestSkills()).toEqual(["anchor-skill", "codeword-probe"]);
    await wait(1_500);
    expect(await launches(), "the idle run is not woken").toBe(launchesBeforeAdd);
    expect(run.notices()).toHaveLength(0);
    const added = await run.echo("ECHO_INPUT after add");
    expect(occurrences(added, HEADER)).toBe(1);
    expect(added.indexOf(HEADER)).toBeLessThan(added.indexOf("ECHO_INPUT after add"));
    expect(added).toContain("Your skill package `codeword-probe` is now available: Gives the probe codeword.");
    expect(added).toContain(`Read its instructions before work it governs: \`${await fs.realpath(skillPath("codeword-probe"))}\`.`);
    expect(added).not.toContain("access starts when this run is restarted");
    const listedAfterAdd = await run.readSkills();
    expect(listedAfterAdd.map((skill) => skill.name)).toEqual(["anchor-skill", "codeword-probe"]);
    expect(listedAfterAdd.find((skill) => skill.name === "codeword-probe")?.skillMd).toContain("PROBE-4417");
    expect(await run.echo("ECHO_INPUT once")).not.toContain(HEADER);
    receipt.add = { notice: added, capsuleSkills: listedAfterAdd, manifest: await capsule.manifestSkills() };

    // 2. Removed by editing the agent package's agent-config.json (the package folder feed): announced once; the link
    //    stays until the run ends (DEC-007).
    const configPath = path.join(dataDir, "agents", agentId, "agent-config.json");
    const packageConfig = JSON.parse(await fs.readFile(configPath, "utf8")) as Record<string, unknown>;
    await fs.writeFile(configPath, `${JSON.stringify({ ...packageConfig, skillNames: ["codeword-probe"] }, null, 2)}\n`);
    await until(async () => JSON.stringify(await definitionSkills(agentId)) === JSON.stringify(["codeword-probe"]),
      "the package feed reloads the edited agent-config.json", 30_000);
    await wait(3_000);
    const removed = await run.echo("ECHO_INPUT after package edit");
    expect(occurrences(removed, HEADER)).toBe(1);
    expect(removed).toContain("Your skill package `anchor-skill` is no longer available.");
    expect(removed).toContain("Do not rely on a skill that is no longer available.");
    expect(removed).not.toContain("`codeword-probe` is now available");
    expect(await capsule.linkedTo("anchor-skill"), "a removed skill keeps its link (DEC-007)").not.toBeNull();
    receipt.packageEditRemoval = { notice: removed };

    // 3. Stopped; the skills change while stopped (codeword-probe removed, extra-skill added); a message resumes the
    //    run: its first input carries one notice for both, and the capsule keeps the mid-run link and manifest entry.
    await terminate(run.runId);
    await wait(1_500);
    await saveSkills(agentId, ["extra-skill"]);
    await wait(3_000);
    const resumed = await run.echo("ECHO_INPUT after resume");
    expect(occurrences(resumed, HEADER), "one notice with the first input after resume").toBe(1);
    expect(resumed).toContain("Your skill package `extra-skill` is now available: An extra skill added while the run is stopped.");
    expect(resumed).toContain(`\`${await fs.realpath(skillPath("extra-skill"))}\``);
    expect(resumed).toContain("Your skill package `codeword-probe` is no longer available.");
    expect(resumed).not.toContain("anchor-skill");
    expect(await capsule.manifestSkills(), "the manifest still lists the mid-run link after resume")
      .toEqual(expect.arrayContaining(["anchor-skill", "codeword-probe"]));
    expect(await capsule.linkedTo("codeword-probe")).toBe(await fs.realpath(path.dirname(skillPath("codeword-probe"))));
    const listedAfterResume = await run.readSkills();
    expect(listedAfterResume.map((skill) => skill.name)).toEqual(expect.arrayContaining(["anchor-skill", "codeword-probe"]));
    receipt.resume = { notice: resumed, capsuleSkills: listedAfterResume, manifest: await capsule.manifestSkills(),
      // Antigravity's restore reads its capsule and does not link skills added while stopped (FU-002); the notice
      // gives their path. Recorded, not asserted.
      extraSkillLinkedAfterResume: (await capsule.linkedTo("extra-skill")) !== null };

    // 4. A skill added to the resumed run is linked into the restored capsule and its manifest.
    await saveSkills(agentId, ["extra-skill", "third-skill"]);
    await until(async () => (await capsule.linkedTo("third-skill")) !== null
      && (await capsule.manifestSkills()).includes("third-skill"), "capsule link for a skill added after resume", 30_000);
    const third = await run.echo("ECHO_INPUT after third");
    expect(occurrences(third, HEADER)).toBe(1);
    expect(third).toContain("Your skill package `third-skill` is now available");
    receipt.addAfterResume = { notice: third, manifest: await capsule.manifestSkills() };
    await terminate(run.runId);
    await writeReceipt("API-05a-agy-capsule", receipt);
  }, 300_000);

  it("API-05b (AC-009): a Team member and a delegated copy of the same agent each get their own link and their own notice", async () => {
    const suffix = randomUUID().slice(0, 6);
    const workerName = `AB460 Worker ${suffix}`;
    const workerId = await createAgent(workerName, [], []);
    const plainId = await createAgent(`AB460 Plain ${suffix}`, [], []);
    const managerId = await createAgent(`AB460 Manager ${suffix}`, ["delegate_task", "send_message_to"], []);
    const teamDefinitionId = (await graphql("mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}",
      { input: { name: `AB460 Team ${suffix}`, description: "autobyteus-460 AC-009", instructions: "Follow requests.", coordinatorMemberName: "worker",
        nodes: [{ memberName: "worker", ref: workerId, refScope: "SHARED" }, { memberName: "plain", ref: plainId, refScope: "SHARED" }] } },
    )).createAgentTeamDefinition.id;
    const team = (await graphql("mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}",
      { input: { teamDefinitionId, teamConfigs: [{ teamAddress: "/", ...config() }], memberConfigs: [
        { memberAddress: "/worker", agentDefinitionId: workerId, ...config() },
        { memberAddress: "/plain", agentDefinitionId: plainId, ...config() }] } })).createAgentTeamRun;
    expect(team.success, team.message).toBe(true);
    active.push({ kind: "team", id: team.teamRunId });
    const teamView = await connect("agent-team", team.teamRunId, (f) => f.some((frame) => frame.type === "TEAM_EXECUTION_VIEW_SNAPSHOT"));
    const tree = (await graphql("query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}", { id: team.teamRunId })).getTeamRunResumeConfig.executionTree;
    const member = (address: string) => flattenE2eConfiguredAgentExecutions(tree).find((entry: any) => entry.memberAddress === address)!.agentRunId as string;
    const members = { worker: member("/worker"), plain: member("/plain") };
    const teamEcho = async (agentRunId: string, content: string) => {
      const conversation = async () => (await graphql("query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}",
        { id: team.teamRunId, a: agentRunId })).getTeamMemberRunProjection?.conversation;
      const before = echoes(await conversation()).length;
      sendE2eSendMessageCommand(teamView.socket, { agent_run_id: agentRunId, content });
      let all: string[] = [];
      await until(async () => { all = echoes(await conversation()); return all.length > before; }, `team member ${agentRunId} echo`, 90_000);
      return all[before]!;
    };

    // A standalone Manager delegates to the worker agent: a delegated copy of the same definition.
    const manager = await standalone(managerId);
    const collaboration = async () => (await graphql("query($id:String!){agentRunCollaboration(runId:$id)}", { id: manager.runId }))
      .agentRunCollaboration?.root_agent?.execution_tree ?? null;
    const copyConversation = async (copy: { agentRunId: string; address: string }) => (await graphql(
      "query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){conversation}}",
      { h: manager.runId, a: copy.address, r: copy.agentRunId })).agentRunCollaborationMemberProjection?.conversation;
    await manager.call(callTool("delegate_task", { recipient_address: `/${segment(workerName)}`, description: "ECHO_INPUT first task" }));
    let copy: { agentRunId: string; address: string } | undefined;
    await until(async () => {
      copy = taskNodes(await collaboration())[0];
      return !!copy && echoes(await copyConversation(copy)).length >= 1;
    }, "the delegated copy echoed its first input", 90_000);
    const messageCopy = async (content: string) => {
      const before = echoes(await copyConversation(copy!)).length;
      await manager.call(callTool("send_message_to", { target_agent_run_id: copy!.agentRunId, content }));
      let all: string[] = [];
      await until(async () => { all = echoes(await copyConversation(copy!)); return all.length > before; }, "the copy echoed the message", 90_000);
      return all[before]!;
    };

    const firstWorker = await teamEcho(members.worker, "ECHO_INPUT worker first");
    const firstPlain = await teamEcho(members.plain, "ECHO_INPUT plain first");
    expect([firstWorker, firstPlain, echoes(await copyConversation(copy!))[0]!].some((text) => text.includes(HEADER))).toBe(false);

    // The worker agent gains a skill on the agents page: each of its runs gets its own capsule link.
    await saveSkills(workerId, ["team-probe"]);
    const workerCapsule = await capsuleOf(members.worker);
    const copyCapsule = await capsuleOf(copy!.agentRunId);
    const plainCapsule = await capsuleOf(members.plain);
    await until(async () => (await workerCapsule.linkedTo("team-probe")) !== null && (await copyCapsule.linkedTo("team-probe")) !== null,
      "both runs of the worker agent linked team-probe", 30_000);
    expect(await workerCapsule.manifestSkills()).toEqual(["team-probe"]);
    expect(await copyCapsule.manifestSkills()).toEqual(["team-probe"]);
    expect(workerCapsule.capsule).not.toBe(copyCapsule.capsule);
    expect(await plainCapsule.linkedTo("team-probe")).toBeNull();

    const next = {
      worker: await teamEcho(members.worker, "ECHO_INPUT worker second"),
      copy: await messageCopy("ECHO_INPUT copy second"),
      plain: await teamEcho(members.plain, "ECHO_INPUT plain second"),
    };
    for (const who of ["worker", "copy"] as const) {
      expect(occurrences(next[who], HEADER), `${who}: one notice`).toBe(1);
      expect(next[who], `${who}: names the added skill and its path`)
        .toContain("Your skill package `team-probe` is now available: Gives the team probe codeword.");
      expect(next[who]).toContain(`\`${await fs.realpath(skillPath("team-probe"))}\``);
    }
    expect(next.plain, "a member of another agent hears nothing").not.toContain(HEADER);
    expect(await teamEcho(members.worker, "ECHO_INPUT worker third"), "delivered once").not.toContain(HEADER);
    await writeReceipt("API-05b-agy-team-and-copy", { members, copy, next });
  }, 300_000);

  it.skipIf(!githubEnabled)("API-05c (AC-006, AC-007): GitHub added to a running agent starts at restart; removed is refused and announced; added back works without a restart", async (context) => {
    const token = await readLiveTestSecret(context, "test.github.token");
    const imported = (await graphql<{ importIntegrations: Array<{ id: string; state: string }> }>(
      "mutation($location: String!) { importIntegrations(location: $location) { id state } }", { location: integrationSource })).importIntegrations;
    expect(imported).toEqual([{ id: "github", state: "NEEDS_TOKEN" }]);
    const card = (await graphql<{ connectIntegration: { state: string } }>(
      "mutation($token: String!) { connectIntegration(id: \"github\", token: $token) { state } }",
      { token: token.revealToTrustedConsumer() })).connectIntegration;
    expect(card.state).toBe("CONNECTED");
    secret = token.revealToTrustedConsumer();

    const readProbe = async (runId: string) => {
      const out = path.join(probeRoot, runId);
      await until(() => existsSync(path.join(out, "result.json")), `shell probe of ${runId}`, 90_000);
      const result = JSON.parse(readFileSync(path.join(out, "result.json"), "utf8")) as { apiHttp: string };
      const env = envOf(readFileSync(path.join(out, "env.txt"), "utf8"));
      const issue = existsSync(path.join(out, "issue.json")) ? JSON.parse(readFileSync(path.join(out, "issue.json"), "utf8")) as { number?: number } : null;
      const tokenInOutputs = readdirSync(out).filter((file) => readFileSync(path.join(out, file)).includes(secret!));
      return { apiHttp: result.apiHttp, address: env.get("AUTOBYTEUS_GITHUB_API_URL") ?? null, issueNumber: issue?.number ?? null, tokenInOutputs };
    };
    const call = async (address: string) => {
      const response = await fetch(`${address}/repos/${REPOSITORY}/issues/1`, { headers: { accept: "application/vnd.github+json" } });
      const body = await response.text();
      return { status: response.status, error: response.status === 200 ? null : (JSON.parse(body) as { error?: string }).error ?? body.slice(0, 80) };
    };

    const agentId = await createAgent(`ab460-gh-${randomUUID().slice(0, 6)}`, [], []);
    const run = await standalone(agentId);
    expect(await run.echo("ECHO_INPUT first")).not.toContain(HEADER);
    const atStart = await readProbe(run.runId);
    expect(atStart, "a run without the skill has no GitHub variables").toMatchObject({ address: null, apiHttp: "skipped" });

    // 1. Added mid-run: the notice says GitHub starts at a restart; the running process still has no variables.
    await saveSkills(agentId, [GITHUB_SKILL]);
    await wait(3_000);
    const added = await run.echo("ECHO_INPUT after github add");
    expect(occurrences(added, HEADER)).toBe(1);
    expect(added).toContain(`Your skill package \`${GITHUB_SKILL}\` is now available: Reach GitHub through the AutoByteus proxy.`);
    expect(added).toContain("Its GitHub access starts when this run is restarted (stop the run, then send a message).");
    expect(await readProbe(run.runId), "nothing is granted to the running process").toMatchObject({ address: null });

    // 2. Stopped, then a message: the restored process gets the variables and reaches GitHub through the proxy.
    await terminate(run.runId);
    await fs.rm(path.join(probeRoot, run.runId), { recursive: true, force: true });
    const resumed = await run.echo("ECHO_INPUT after restart");
    expect(resumed, "nothing left to announce").not.toContain(HEADER);
    const restarted = await readProbe(run.runId);
    expect(restarted).toMatchObject({ apiHttp: "200", issueNumber: 1, tokenInOutputs: [] });
    expect(restarted.address).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/r\/rp_[\w-]+\/github\/api$/);
    expect(await call(restarted.address!)).toEqual({ status: 200, error: null });

    // 3. Removed: the next proxied call is refused and the agent is told (AC-007).
    await saveSkills(agentId, []);
    await wait(3_000);
    const refused = await call(restarted.address!);
    expect(refused).toEqual({ status: 403, error: "INTEGRATION_NOT_ALLOWED" });
    const removed = await run.echo("ECHO_INPUT after github removal");
    expect(occurrences(removed, HEADER)).toBe(1);
    expect(removed).toContain(`Your skill package \`${GITHUB_SKILL}\` is no longer available.`);

    // 4. Added back: the run's pass still holds GitHub, so access works at once and the notice speaks of no restart.
    await saveSkills(agentId, [GITHUB_SKILL]);
    await wait(3_000);
    const allowedAgain = await call(restarted.address!);
    expect(allowedAgain).toEqual({ status: 200, error: null });
    const addedBack = await run.echo("ECHO_INPUT after github added back");
    expect(occurrences(addedBack, HEADER)).toBe(1);
    expect(addedBack).toContain(`Your skill package \`${GITHUB_SKILL}\` is now available`);
    expect(addedBack).not.toContain("access starts when this run is restarted");
    await terminate(run.runId);
    const afterStop = await call(restarted.address!);
    expect(afterStop).toEqual({ status: 403, error: "RUN_PASS_INVALID" });
    const wire = JSON.stringify(run.frames);
    expect(wire.includes(secret), "the token is never on the run's wire").toBe(false);
    await writeReceipt("API-05c-agy-github", { atStart, added, restarted, resumed, refused, removed, allowedAgain, addedBack, afterStop });
  }, 300_000);
});
