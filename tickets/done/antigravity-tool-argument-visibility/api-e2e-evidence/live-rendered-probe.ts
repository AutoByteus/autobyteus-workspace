// TEMPORARY provider + renderer probe; retained reproducibility source in the ticket, removed after use.
import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { createWriteStream } from "node:fs";
import { createRequire } from "node:module";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import WebSocket from "ws";
import { expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

const root = path.resolve("..");
const ticket = path.join(root, "tickets/in-progress/antigravity-tool-argument-visibility");
const out = path.join(ticket, "api-e2e-evidence");
const ledger = path.join(ticket, "api-e2e-test-case-ledger.md");
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const entry = (caseId: string, event: string, result: string, text: string) => fs.appendFile(ledger,
  `| live | ${caseId} | ${new Date().toISOString()} | ${event} | ${text} | ${result} | live-native.json / browser.json |\n`);
const freePort = async (): Promise<number> => new Promise((resolve) => {
  const server = net.createServer(); server.listen(0, "127.0.0.1", () => {
    const port = (server.address() as net.AddressInfo).port; server.close(() => resolve(port));
  });
});
type Wire = { type: string; payload: Record<string, any> };

it("L-001 and B-001: current real native inputs through implemented backend and live/reopened production renderer", async () => {
  await fs.mkdir(out, { recursive: true });
  await entry("L-001", "Started", "N/A", "Real AGY 1.2.16 via actual Studio backend; disposable app/workspace");
  const dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "agy-input-live-")));
  const workspace = path.join(dataDir, "workspace"); await fs.mkdir(workspace);
  await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
  appConfigProvider.config.setCustomAppDataDir(dataDir);
  const started = await startStudioE2eRuntimeServer();
  const url = started.mainUrl;
  const graphql = async (query: string, variables?: Record<string, any>) => {
    const response = await fetch(new URL("/graphql", url), { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }) });
    const body = await response.json() as any;
    if (!response.ok || body.errors?.length || !body.data) throw new Error(JSON.stringify(body));
    return body.data;
  };
  let definitionId = ""; let runId = ""; let socket: WebSocket | undefined;
  let browser: any; let nuxt: ReturnType<typeof spawn> | undefined;
  const pageFile = path.join(root, "autobyteus-web/pages/api-e2e-native-arguments.vue");
  let pageOwned = false;
  const messages: Wire[] = [];
  const clean: Record<string, any> = { dataDir, workspace, backendUrl: url.href };
  try {
    expect(spawnSync("agy", ["--version"], { encoding: "utf8" }).status).toBe(0);
    definitionId = (await graphql("mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: "agy-native-input-live-" + randomUUID(), role: "assistant", category: "runtime-e2e",
        description: "Disposable current native argument validation", toolNames: [],
        instructions: `Use only configured native tools. Only read or modify files inside ${workspace}. No MCP, skills, subagents, image generation or background processes. Perform exact requested calls sequentially, then stop.` } })).createAgentDefinition.id;
    const create = (await graphql("mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low",
        autoExecuteTools: true, runtimeKind: "antigravity_cli" } })).createAgentRun;
    expect(create.success, create.message).toBe(true); runId = create.runId;
    const port = await freePort();
    await fs.copyFile(path.join(out, "native-arguments-integrated.page.vue"), pageFile, fs.constants.COPYFILE_EXCL); pageOwned = true;
    const nuxtLog = createWriteStream(path.join(out, "integrated-nuxt.log"));
    nuxt = spawn("pnpm", ["exec", "nuxt", "dev", "--host", "127.0.0.1", "--port", String(port)], {
      cwd: path.join(root, "autobyteus-web"), detached: true,
      env: { ...process.env, NODE_ENV: "development", BACKEND_NODE_BASE_URL: url.origin }, stdio: ["ignore", "pipe", "pipe"] });
    nuxt.stdout!.pipe(nuxtLog); nuxt.stderr!.pipe(nuxtLog);
    const pageUrl = `http://127.0.0.1:${port}/api-e2e-native-arguments?runId=${runId}`;
    clean.nuxtPid = nuxt.pid; clean.nuxtPort = port;
    let ready = false;
    for (let i = 0; i < 120; i++) {
      if (nuxt.exitCode !== null) throw new Error("Nuxt exited before readiness");
      try { ready = (await fetch(pageUrl)).ok; if (ready) break; } catch { /* Own service warming. */ }
      await wait(500);
    }
    expect(ready).toBe(true);
    const require = createRequire(path.join(root, "autobyteus-web/package.json"));
    const { chromium } = require("playwright-core");
    browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
    const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
    const browserErrors: string[] = [];
    page.on("pageerror", (error: Error) => browserErrors.push(String(error)));
    const network: any[] = [];
    page.on("response", (response: any) => { if (response.url().endsWith("/graphql")) network.push({ url: response.url(), status: response.status() }); });
    await page.goto(pageUrl);
    await page.waitForFunction(() => document.querySelector('[data-test="state"]')?.textContent === "live-ready", null, { timeout: 60000 });
    await entry("B-001", "Started", "N/A", "Nuxt real HTTP hydration and production AgentStreamingService ready before native send");
    socket = new WebSocket(`ws://${url.host}/ws/agent/${runId}`);
    socket.on("message", (data: unknown) => { messages.push(JSON.parse(String(data))); });
    await new Promise<void>((resolve, reject) => { socket!.once("open", resolve); socket!.once("error", reject); });
    const target = path.join(workspace, "marker.txt");
    const prompt = `Use your native tools in this exact sequence, one call per step. Do not use shell substitutes for file or search operations.
1. write_to_file: TargetFile ${target}, CodeContent "BEFORE_NATIVE_9382\\nsecond line\\n", Overwrite true, EmptyFile false.
2. view_file: AbsolutePath ${target}, StartLine 1, EndLine 2.
3. replace_file_content: TargetFile ${target}, TargetContent BEFORE_NATIVE_9382, ReplacementContent MIDDLE_NATIVE_9382, StartLine 1, EndLine 2, AllowMultiple false. Supply Description and Instruction.
4. replace_file_content: same TargetFile, TargetContent MIDDLE_NATIVE_9382, ReplacementContent AFTER_NATIVE_9382, StartLine 1, EndLine 2, AllowMultiple false. Supply Description and Instruction.
5. grep_search: SearchPath ${workspace}, Query AFTER_NATIVE_9382, CaseInsensitive false, MatchPerLine true, Includes ["*.txt"].
6. find_by_name: SearchDirectory ${workspace}, Pattern "*.txt", Type "file", MaxDepth 1.
7. list_dir: DirectoryPath ${workspace}.
8. run_command: CommandLine "sleep 3; printf NATIVE_ARGUMENTS_REAL_OK", Cwd ${workspace}, WaitMsBeforeAsync 10000, IsDaemon false, SafeToAutoRun true. This is short foreground work; no persistent/background process.
9. view_file: AbsolutePath ${target}, StartLine 1, EndLine 2. Then reply only DONE.
Only use the disposable workspace above. No other tools or files.`;
    await fs.writeFile(path.join(out, "live-launch.json"), JSON.stringify({ dataDir, workspace, runId, definitionId, model: "gemini-3.8-flash-low",
      version: spawnSync("agy", ["--version"], { encoding: "utf8" }).stdout.trim(), prompt, pageUrl }, null, 2));
    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content: prompt });
    // While the actual foreground native command is active, earlier native cards came through the live socket.
    await page.waitForFunction(() => [...document.querySelectorAll('[data-invocation]')].some((card) =>
      card.textContent?.includes("run_command") && card.textContent?.includes("Running")), null, { timeout: 60000 });
    const liveCard = page.locator('[data-invocation]').filter({ hasText: "replace_file_content" }).first();
    await liveCard.getByText("Arguments", { exact: true }).click();
    const liveJson = JSON.parse(await liveCard.locator('.bg-gray-50.font-mono').innerText());
    expect(liveJson.TargetContent).toBe("BEFORE_NATIVE_9382"); expect(liveJson.ReplacementContent).toBe("MIDDLE_NATIVE_9382");
    await page.screenshot({ path: path.join(out, "integrated-live.png"), fullPage: true });
    await entry("B-001", "Checkpoint", "N/A", "Live stream-rendered replacement JSON exact while actual native command RUNNING");
    const deadline = Date.now() + 180000;
    while (Date.now() < deadline && !messages.some((m) => m.type === "TURN_COMPLETED") &&
      !messages.some((m) => m.type === "ERROR" && m.payload.error_effect === "terminal")) await wait(100);
    await fs.writeFile(path.join(out, "live-ws.json"), JSON.stringify(messages, null, 2));
    expect(messages.some((m) => m.type === "TURN_COMPLETED"), JSON.stringify(messages)).toBe(true);
    expect(messages.some((m) => m.type === "TOOL_EXECUTION_FAILED" || m.type === "TURN_INTERRUPTED" || m.type === "ERROR")).toBe(false);
    const memory = path.join(dataDir, "memory/agents", runId);
    const metadata = JSON.parse(await fs.readFile(path.join(memory, "run_metadata.json"), "utf8"));
    await fs.writeFile(path.join(out, "live-metadata.json"), JSON.stringify(metadata, null, 2));
    const conversationId = metadata.platformAgentRunId;
    const nativeFile = path.join(os.homedir(), ".gemini/antigravity-cli/brain", conversationId, ".system_generated/logs/transcript_full.jsonl");
    const nativeText = await fs.readFile(nativeFile, "utf8");
    const rows = nativeText.trim().split("\n").map((line) => JSON.parse(line));
    const rawText = await fs.readFile(path.join(memory, "raw_traces_active.jsonl"), "utf8");
    const raw = rawText.trim().split("\n").map((line) => JSON.parse(line));
    const starts = messages.filter((m) => m.type === "TOOL_EXECUTION_STARTED");
    expect(starts.map((m) => m.payload.tool_name)).toEqual(["write_to_file", "view_file", "replace_file_content", "replace_file_content",
      "grep_search", "find_by_name", "list_dir", "run_command", "view_file"]);
    const comparisons: any[] = [];
    for (const start of starts) {
      const index = Number(start.payload.invocation_id.split("-").at(-1));
      const planner = rows.find((row) => row.step_index === index - 1);
      expect(planner).toMatchObject({ source: "MODEL", type: "PLANNER_RESPONSE", status: "DONE" });
      expect(planner.tool_calls).toHaveLength(1); expect(planner.tool_calls[0].name).toBe(start.payload.tool_name);
      const args = planner.tool_calls[0].args;
      expect(start.payload.arguments).toEqual(args);
      const terminal = messages.find((m) => m.type === "TOOL_EXECUTION_SUCCEEDED" && m.payload.invocation_id === start.payload.invocation_id)!;
      expect(terminal.payload).toMatchObject({ arguments: args, turn_id: start.payload.turn_id, tool_name: start.payload.tool_name });
      const saved = raw.find((r) => r.trace_type === "tool_call" && r.tool_call_id === start.payload.invocation_id);
      expect(saved).toMatchObject({ source_event: "TOOL_EXECUTION_STARTED", tool_args: args, turn_id: start.payload.turn_id });
      comparisons.push({ invocationId: start.payload.invocation_id, toolName: start.payload.tool_name, nativeStep: index,
        providerArgs: args, canonicalArgs: start.payload.arguments, rawArgs: saved.tool_args, equal: true });
    }
    expect(await fs.readFile(target, "utf8")).toBe("AFTER_NATIVE_9382\nsecond line\n");
    expect(comparisons[0].providerArgs.Overwrite).toBe(true);
    // Optional fields are proven only when AGY actually supplies them, never fabricated from the prompt.
    expect(Object.hasOwn(comparisons[0].providerArgs, "EmptyFile") ? comparisons[0].providerArgs.EmptyFile : undefined).not.toBe(true);
    expect(comparisons[4].providerArgs.Includes).toEqual(["*.txt"]);
    expect(comparisons[5].providerArgs.MaxDepth).toBe(1);
    expect(comparisons[7].providerArgs.Cwd).toBe(workspace);
    expect(comparisons[7].providerArgs.IsDaemon).toBe(false);
    expect(comparisons[7].providerArgs.WaitMsBeforeAsync).toBe(10000);
    await fs.writeFile(path.join(out, "live-native.json"), JSON.stringify({ runId, conversationId, comparisons,
      finalContent: await fs.readFile(target, "utf8"), allNineNativeCanonicalRawEqual: true }, null, 2));
    await fs.writeFile(path.join(out, "live-transcript-full.jsonl"), nativeText);
    await fs.writeFile(path.join(out, "live-raw-traces.jsonl"), rawText);
    await entry("L-001", "Completed", "Pass", "Nine real native calls: provider actual typed args = first STARTED = terminal = raw disk; repeated edits and final file exact");
    const projection = (await graphql("query($runId: String!) { getRunProjection(runId: $runId) { conversation activities } }", { runId })).getRunProjection;
    expect((await graphql("mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }",
      { agentRunId: runId })).terminateAgentRun.success).toBe(true);
    socket.close();
    await page.locator('[data-test="reopen"]').click();
    await page.waitForFunction(() => document.querySelector('[data-test="state"]')?.textContent === "saved-ready", null, { timeout: 30000 });
    const rendered: any[] = [];
    for (const comparison of comparisons) {
      const card = page.locator(`[data-invocation="${comparison.invocationId}"]`);
      await card.getByText("Arguments", { exact: true }).click();
      const args = JSON.parse(await card.locator('.bg-gray-50.font-mono').innerText());
      expect(args).toEqual(comparison.providerArgs);
      rendered.push({ invocationId: comparison.invocationId, arguments: args });
    }
    const savedCard = page.locator(`[data-invocation="${comparisons[2].invocationId}"]`);
    await savedCard.locator('.cursor-pointer.select-none').click();
    expect(await savedCard.getByText("Arguments", { exact: true }).isVisible()).toBe(false);
    await savedCard.locator('.cursor-pointer.select-none').click();
    expect(JSON.parse(await savedCard.locator('.bg-gray-50.font-mono').innerText())).toEqual(comparisons[2].providerArgs);
    await page.screenshot({ path: path.join(out, "integrated-saved.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: path.join(out, "integrated-saved-narrow.png"), fullPage: true });
    await fs.writeFile(path.join(out, "live-projection.json"), JSON.stringify(projection, null, 2));
    await fs.writeFile(path.join(out, "browser.json"), JSON.stringify({ liveJson, reopened: rendered, network, browserErrors,
      browserVersion: browser.version(), viewports: ["1100x850", "390x844"], collapseReopen: true, documentOverflow: false }, null, 2));
    expect(browserErrors).toEqual([]);
    await entry("B-001", "Completed", "Pass", "Actual live WS handlers and fresh network-only history hydration rendered nine equal native argument objects; disclosure/collapse/narrow overflow Pass");
  } finally {
    if (socket) socket.close();
    if (runId) await graphql("mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }", { agentRunId: runId }).catch(() => undefined);
    if (definitionId) await graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }", { id: definitionId }).catch(() => undefined);
    if (browser) { await browser.close(); clean.browserClosed = true; }
    if (nuxt?.pid && nuxt.exitCode === null) {
      process.kill(-nuxt.pid, "SIGTERM");
      for (let count = 0; count < 40 && nuxt.exitCode === null && nuxt.signalCode === null; count++) await wait(100);
      if (nuxt.exitCode === null && nuxt.signalCode === null) process.kill(-nuxt.pid, "SIGKILL");
    }
    clean.nuxtStopped = !nuxt || nuxt.exitCode !== null || nuxt.signalCode !== null;
    if (pageOwned) { await fs.rm(pageFile); clean.pageRemoved = true; }
    await started.fastify.close(); clean.serverClosed = true;
    await fs.rm(dataDir, { recursive: true, force: true }); clean.dataRemoved = true;
    await fs.writeFile(path.join(out, "live-cleanup.json"), JSON.stringify(clean, null, 2));
  }
}, 360000);
