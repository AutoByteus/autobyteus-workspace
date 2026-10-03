import "reflect-metadata";
import { recordCase } from "../helpers/runtime-error-case-evidence.js";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AgyRuntimeErrorFixture, until, type Scope } from "../helpers/agy-runtime-error-fixture.js";

// TESTING.md: deterministic CLI only. Optional RUN_AGY_ERROR_BROWSER=1 closes the real public-stream→DOM boundary.
// RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<absolute>/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run <this file> --no-watch
const fakeCommand = process.env["ANTIGRAVITY_CLI_COMMAND"] ?? "";
const enabled = process.env["RUN_AGY_FAILURE_E2E"] === "1" && spawnSync(fakeCommand, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const fallback = "Antigravity could not complete this turn.";
const cases = [
  ["quota", "Individual quota reached. Please upgrade your subscription to increase your limits. Resets in 3h28m50s."],
  ["unfamiliar", "Workspace service temporarily unavailable. Reference W-771; try again later."],
  ["structured", "Read limit reached. Try again after the provider permits requests."],
  ["missing", fallback], ["empty", fallback], ["malformed", fallback],
  ["credential", 'Workspace unavailable token=<redacted> <img src=x onerror=alert(1)>'],
] as const;
const scopeId = { agent: "A", team: "T", org: "O" };

suite("controlled AGY failure through real Agent/Team/Org public transport", () => {
  const fixture = new AgyRuntimeErrorFixture();
  beforeAll(() => fixture.start(), 60_000);
  afterAll(() => fixture.close(), 60_000);

  it("retains native-image denial privacy without fabricating tool success", () => recordCase("API-D01", async () => {
    const run = await fixture.create("agent", "tool_denied");
    const stream = await fixture.connect(run);
    stream.send("Generate a blue dog image.");
    await until(() => stream.frames.some((m) => m.type === "TURN_COMPLETED"), "denied turn settled");
    expect(stream.frames.find((m) => m.type === "TOOL_EXECUTION_STARTED")?.payload.arguments).toEqual({ ImageName: "blue_dog", Prompt: "blue dog" });
    expect(stream.frames.some((m) => m.type === "AGENT_COMMAND_ACK" && m.payload.accepted === true)).toBe(true);
    expect(stream.frames.some((m) => m.type === "TOOL_DENIED" && m.payload.tool_name === "generate_image")).toBe(true);
    expect(stream.frames.some((m) => m.type === "TOOL_EXECUTION_SUCCEEDED")).toBe(false);
    expect(JSON.stringify([stream.frames, await fixture.projection(run)])).not.toMatch(/PRIVATE_AGY_SECRET|SECRET_IMAGE|\/private\//);
    const diagnostic = await fixture.diagnostic(run);
    expect(diagnostic.text).toContain("PRIVATE_AGY_SECRET"); expect(diagnostic.text.length).toBeLessThan(32 * 1024); expect(diagnostic.mode).toBe(0o600);
    await fixture.terminate(run);
  }), 40_000);

  it("retains the existing credential-only terminal-error negative without fabricated completion", () => recordCase("API-D02", async () => {
    const run = await fixture.create("agent", "terminal_error");
    const stream = await fixture.connect(run);
    stream.send("Ordinary work.");
    await until(() => stream.frames.some((m) => m.type === "ERROR"), "terminal error");
    expect(stream.frames.find((m) => m.type === "ERROR")?.payload).toMatchObject({ code: "AGY_TURN_ERROR", message: "token=<redacted>", error_effect: "terminal" });
    expect(stream.frames.some((m) => m.type === "TURN_COMPLETED")).toBe(false);
    expect(JSON.stringify([stream.frames, await fixture.projection(run)])).not.toContain("PRIVATE_AGY_SECRET");
    expect(stream.frames.some((m) => m.type === "AGENT_COMMAND_ACK" && m.payload.accepted === true)).toBe(true);
    const diagnostic = await fixture.diagnostic(run);
    expect(diagnostic.text).toContain("PRIVATE_AGY_SECRET"); expect(diagnostic.text.length).toBeLessThan(32 * 1024); expect(diagnostic.mode).toBe(0o600);
    await fixture.terminate(run);
  }), 40_000);

  for (const scope of ["agent", "team", "org"] as Scope[]) {
    it.each(cases)(`${scope}: supplied %s error survives actual public transport and normal next user turn`, (kind, expected) =>
      recordCase(`API-${scopeId[scope]}-${String(cases.findIndex((c) => c[0] === kind) + 1).padStart(2, "0")}`, async () => {
        const run = await fixture.create(scope);
        const auditBefore = (await fixture.audit()).length;
        const stream = await fixture.connect(run);
        stream.send("Report runtime case: " + kind);
        await until(() => stream.projected().some((m) => m.type === "ERROR"), "attributed terminal error");
        const first = stream.projected();
        const error = first.find((m) => m.type === "ERROR")!;
        expect(error.payload).toMatchObject({ code: "AGY_TURN_ERROR", message: expected, error_scope: "turn", error_effect: "terminal" });
        expect(error.payload.turn_id).toEqual(expect.any(String));
        expect(error.payload).not.toHaveProperty("provider_status", 429);
        if (scope === "team") expect(error.payload).toMatchObject({ agent_run_id: run.runId });
        if (scope === "org") expect(error).toMatchObject({ agentRunId: run.runId, memberAddress: run.address });
        expect(first.filter((m) => m.type === "ERROR")).toHaveLength(1);
        expect(first.some((m) => m.type === "TURN_COMPLETED")).toBe(false);
        expect(first.filter((m) => m.type === "TOOL_EXECUTION_SUCCEEDED")).toHaveLength(1);
        const before = await fixture.projection(run);
        expect(JSON.stringify(before)).toContain("PARTIAL_WORK_PRESERVED");
        expect(JSON.stringify(before)).toContain("COMPLETED_WORK_PRESERVED");
        const completedTool = before.activities.find((a: any) => a.toolName === "run_command");
        expect(completedTool).toMatchObject({ status: "success" });
        expect(JSON.stringify([stream.frames, before])).not.toMatch(/PRIVATE_AGY_SECRET|PRIVATE_RESPONSE_MARKER|\[object Object\]/);
        const diagnostic = await fixture.diagnostic(run);
        expect(diagnostic.text).toContain("PRIVATE_RESPONSE_MARKER"); expect(diagnostic.mode).toBe(0o600);
        const firstAudit = (await fixture.audit()).slice(auditBefore);
        expect(firstAudit).toHaveLength(1); // No automatic recovery/retry.
        const providerIdentity = firstAudit[0].conversation_id;
        const firstLength = first.length;
        stream.send("Continue the same work.");
        await until(() => stream.projected().slice(firstLength).some((m) => m.type === "TURN_COMPLETED"), "next user turn completes");
        const next = stream.projected().slice(firstLength);
        expect(next.filter((m) => m.type === "TURN_COMPLETED")).toHaveLength(1);
        expect(next.some((m) => m.type === "ERROR" || m.type.startsWith("TOOL_EXECUTION"))).toBe(false);
        expect(next.find((m) => m.type === "TURN_COMPLETED")!.payload.turn_id).not.toBe(error.payload.turn_id);
        const audit = (await fixture.audit()).slice(auditBefore);
        expect(audit).toHaveLength(2); expect(audit.map((row) => row.conversation_id)).toEqual([providerIdentity, providerIdentity]);
        expect(audit.map((row) => row.content)).toEqual(["Report runtime case: " + kind, "Continue the same work."]);
        const after = await fixture.projection(run);
        expect(after.activities.find((a: any) => a.invocationId === completedTool.invocationId)).toEqual(completedTool);
        expect(JSON.stringify(after)).toContain("NEXT_USER_TURN_OK");
        await fixture.terminate(run);
        const saved = await fixture.projection(run);
        expect(saved.activities.find((a: any) => a.invocationId === completedTool.invocationId)).toEqual(completedTool);
        expect(JSON.stringify(saved)).toContain("PARTIAL_WORK_PRESERVED");
        await fixture.save(`API-${scopeId[scope]}-${kind}.json`, { run, expected, frames: stream.frames, before, after, saved,
          audit, privateDiagnostic: { retained: true, mode: diagnostic.mode } });
      }), 60_000);
  }

  it("restores a normally stopped failed Agent with the exact provider conversation and unchanged completed work", () => recordCase("API-C02", async () => {
    const run = await fixture.create("agent");
    const stream = await fixture.connect(run);
    const start = (await fixture.audit()).length;
    stream.send("Report runtime case: quota");
    await until(() => stream.frames.some((m) => m.type === "ERROR"), "failed Agent before stop");
    const before = await fixture.projection(run);
    const readConfig = async () => (await fixture.graphql(`query($id:String!){getAgentRunResumeConfig(runId:$id){runId metadataConfig{runtimeKind llmModelIdentifier llmConfig autoExecuteTools workspaceRootPath runtimeReference{runtimeKind sessionId threadId metadata}}}}`, { id: run.runId })).getAgentRunResumeConfig;
    const config = await readConfig();
    await fixture.terminate(run);
    process.env["AGY_FAKE_CASE"] = "runtime_error";
    const restored = await fixture.graphql(`mutation($id:String!){restoreAgentRun(agentRunId:$id){success message runId}}`, { id: run.runId });
    expect(restored.restoreAgentRun).toMatchObject({ success: true, runId: run.runId });
    expect(await readConfig()).toEqual(config);
    const resumed = await fixture.connect(run);
    resumed.send("Continue the same work.");
    await until(() => resumed.frames.some((m) => m.type === "TURN_COMPLETED"), "restored success");
    const audit = (await fixture.audit()).slice(start);
    expect(audit).toHaveLength(2); expect(audit[1].conversation_id).toBe(audit[0].conversation_id);
    const after = await fixture.projection(run);
    expect(after.activities).toEqual(before.activities);
    expect(JSON.stringify(after)).toContain("PARTIAL_WORK_PRESERVED"); expect(JSON.stringify(after)).toContain("NEXT_USER_TURN_OK");
    await fixture.save("API-C02.json", { run, config, before, after, audit });
    await fixture.terminate(run);
  }), 60_000);

  it.skipIf(process.env["RUN_AGY_ERROR_BROWSER"] !== "1")("closes real Agent/Team transport→production streaming service→rendered card gap", () => recordCase("API-B01", async () => {
    const auditStart = (await fixture.audit()).length;
    const runs = [await fixture.create("agent"), await fixture.create("team")];
    const manifest = path.join(fixture.dataDir, "browser-manifest.json");
    const output = process.env["AGY_ERROR_EVIDENCE_DIR"] ?? path.join(fixture.dataDir, "browser-evidence");
    await fs.writeFile(manifest, JSON.stringify({ serverUrl: String(fixture.url), runs, cases }));
    const probe = path.resolve("../autobyteus-web/tests/e2e/runtime-error-transport-probe.mjs");
    const child = spawn(process.execPath, [probe, "--manifest", manifest, "--output-dir", output], { stdio: ["ignore", "pipe", "pipe"] });
    let log = "";
    child.stdout.on("data", (data) => { log += String(data); }); child.stderr.on("data", (data) => { log += String(data); });
    const timeout = setTimeout(() => child.kill("SIGTERM"), 240_000);
    const code = await new Promise<number | null>((resolve, reject) => {
      child.once("error", (error) => { clearTimeout(timeout); reject(error); });
      child.once("exit", (exitCode) => { clearTimeout(timeout); resolve(exitCode); });
    });
    await fs.writeFile(path.join(output, "browser-process.log"), log);
    const audit = (await fixture.audit()).slice(auditStart);
    const projections = await Promise.all(runs.map(async (run) => ({ run, projection: await fixture.projection(run) })));
    await fixture.save("browser-server-correlation.json", { code, runs, audit, projections });
    expect(code, log).toBe(0);
    expect(audit).toHaveLength(16);
    for (let index = 0; index < runs.length; index++) {
      const inputs = audit.slice(index * 8, (index + 1) * 8);
      expect(new Set(inputs.map((row) => row.conversation_id)).size).toBe(1);
      expect(inputs.map((row) => row.content)).toEqual([...cases.map(([kind]) => "Report runtime case: " + kind), "Continue the same work."]);
      expect(projections[index]!.projection.activities.filter((a: any) => a.status === "success")).toHaveLength(7);
      expect(JSON.stringify(projections[index]!.projection)).toContain("NEXT_USER_TURN_OK");
    }
    expect(audit[0].conversation_id).not.toBe(audit[8].conversation_id);
    for (const run of runs) await fixture.terminate(run);
  }), 300_000);
});
