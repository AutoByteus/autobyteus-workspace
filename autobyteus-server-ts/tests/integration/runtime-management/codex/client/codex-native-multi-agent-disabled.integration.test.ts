import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { gunzipSync } from "node:zlib";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { CodexAppServerClient } from "../../../../../src/runtime-management/codex/client/codex-app-server-client.js";
import { CodexAppServerClientManager } from "../../../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import { parseArgs } from "../../../../../src/runtime-management/codex/client/codex-app-server-launch-config.js";

// Opt-in real installed Codex, loopback capture only: no login, paid inference or tool execution.
// RUN_CODEX_NATIVE_SURFACE_TESTS=1 pnpm exec vitest run <this file> --no-watch
// Optional CODEX_NATIVE_SURFACE_EVIDENCE_DIR retains sanitized request/argv/cleanup receipts.
// A gated missing binary fails; an ungated skip is never suppression evidence.
const enabled = process.env.RUN_CODEX_NATIVE_SURFACE_TESTS === "1";
const binary = process.env.CODEX_NATIVE_SURFACE_BINARY?.trim() || "codex";
const model = process.env.CODEX_NATIVE_SURFACE_MODEL?.trim() || "gpt-6.1-sol";
const evidenceDir = process.env.CODEX_NATIVE_SURFACE_EVIDENCE_DIR;
const cases = [
  ["A02", "positive-control", "control"],
  ["A03", "production-default", "default"],
  ["A04", "custom-string", "string"],
  ["A05", "custom-json", "json"],
] as const;
type Json = Record<string, any>;

function toolNames(request: Json): string[] {
  const names: string[] = [];
  const visit = (tool: Json, namespace = "") => {
    if (tool.type === "namespace") {
      for (const child of tool.tools ?? []) visit(child, namespace ? `${namespace}.${tool.name}` : tool.name);
    } else if (tool.function) visit(tool.function, namespace);
    else if (typeof tool.name === "string") names.push(namespace ? `${namespace}.${tool.name}` : tool.name);
  };
  for (const tool of request.tools ?? []) visit(tool);
  for (const item of request.input ?? []) {
    if (item.type === "additional_tools") for (const tool of item.tools ?? []) visit(tool);
  }
  return names.sort();
}
function nativeNames(request: Json): string[] {
  return toolNames(request).filter(name => name.startsWith("collaboration."));
}
function developerText(request: Json): string {
  return (request.input ?? []).filter((item: Json) => item.role === "developer")
    .flatMap((item: Json) => (item.content ?? []).map((part: Json) => part.text ?? "")).join("\n");
}
const ordinary = ["clock.sleep", "functions.exec", "functions.request_user_input", "functions.request_user_input_async", "functions.wait"].sort();
const native = ["followup_task", "interrupt_agent", "list_agents", "send_message", "spawn_agent", "wait_agent"]
  .map(name => `collaboration.${name}`).sort();

(enabled ? describe : describe.skip)("Codex native collaboration surface from production launch", () => {
  let controlOrdinary: string[] | undefined;
  for (const [id, name, mode] of cases) {
    it(`${id}: ${name}`, async () => {
      const version = spawnSync(binary, ["--version"], { encoding: "utf8" });
      expect(version.status, `Explicit native test gate requires executable ${binary}`).toBe(0);
      const originalEnv = process.env;
      const root = await fs.mkdtemp(path.join(os.tmpdir(), "codex-native-surface-"));
      const home = path.join(root, "home"), codexHome = path.join(home, ".codex"), cwd = path.join(root, "workspace");
      let manager: CodexAppServerClientManager | undefined;
      let lease: ReturnType<CodexAppServerClientManager["beginAcquire"]> | undefined;
      let client: CodexAppServerClient | undefined;
      let server: http.Server | undefined;
      let origin = "";
      let raw: Json | undefined;
      const notifications: Json[] = [];
      const receipt: Json = { id, name, mode, model, binary, binaryVersion: version.stdout.trim(), intentionalInferenceFailure: true };
      let failure: unknown;
      try {
        await fs.mkdir(codexHome, { recursive: true }); await fs.mkdir(cwd);
        let resolveCapture!: (body: Json) => void;
        let rejectCapture!: (error: unknown) => void;
        const capture = new Promise<Json>((resolve, reject) => { resolveCapture = resolve; rejectCapture = reject; });
        server = http.createServer(async (req, res) => {
          try {
            const buffers: Buffer[] = [];
            for await (const chunk of req) buffers.push(Buffer.from(chunk));
            let body = Buffer.concat(buffers);
            if (req.headers["content-encoding"] === "gzip") body = gunzipSync(body);
            resolveCapture(JSON.parse(body.toString()));
          } catch (error) { rejectCapture(error); }
          res.writeHead(400, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: { message: "Intentional local request capture, no inference", type: "invalid_request_error" } }));
        });
        await new Promise<void>(resolve => server!.listen(0, "127.0.0.1", resolve));
        origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
        await fs.writeFile(path.join(codexHome, "config.toml"), `model = "${model}"
model_provider = "local_probe"
approval_policy = "never"
web_search = "disabled"
[model_providers.local_probe]
name = "Native surface capture only"
base_url = "${origin}/v1"
wire_api = "responses"
requires_openai_auth = false
supports_websockets = false
[features]
enable_request_compression = false
apps = false
plugins = false
hooks = false
[agents]
enabled = true
[analytics]
enabled = false
[feedback]
enabled = false
`);
        // Replace only this test process's inherited environment; no personal config or auth read.
        process.env = { PATH: originalEnv.PATH, HOME: home, CODEX_HOME: codexHome, TMPDIR: root, LANG: "en_US.UTF-8", CODEX_APP_SERVER_COMMAND: binary };
        if (mode === "string") process.env.CODEX_APP_SERVER_ARGS = "app-server -c agents.enabled=true";
        if (mode === "json") {
          process.env.CODEX_APP_SERVER_ARGS_JSON = JSON.stringify(["app-server", "-c", "agents.enabled=true"]);
          process.env.CODEX_APP_SERVER_ARGS = "invalid-string-is-ignored";
        }
        if (mode === "control") {
          client = new CodexAppServerClient({ command: binary, args: ["app-server"], cwd, requestTimeoutMs: 30_000 });
          await client.start();
          await client.request("initialize", { clientInfo: { name: "autobyteus-server-ts", version: "0.1.1" }, capabilities: { experimentalApi: true } });
          client.notify("initialized", {});
        } else {
          // No injected factory or hardcoded treatment: exercise the current production owner.
          manager = new CodexAppServerClientManager();
          lease = manager.beginAcquire(cwd);
          client = await lease.acquire();
          const secondLease = manager.beginAcquire(path.join(cwd, "."));
          try { expect(await secondLease.acquire()).toBe(client); }
          finally { await secondLease.release(); }
          receipt.workspaceReusePreserved = true;
          expect(client.getLaunchContext().args).toEqual(parseArgs());
        }
        receipt.argv = client.getLaunchContext().args;
        client.onNotification(message => notifications.push(message));
        const config = await client.request<Json>("config/read", { includeLayers: true, cwd });
        receipt.effectiveAgents = config.config.agents;
        const thread = await client.request<Json>("thread/start", { cwd, model, approvalPolicy: "never", sandbox: "read-only", ephemeral: true });
        const threadId = thread.thread.id;
        const finished = new Promise<Json>(resolve => {
          const unbind = client!.onNotification(message => {
            if (message.method === "turn/completed" && message.params.threadId === threadId) { unbind(); resolve(message.params); }
          });
        });
        await client.request("turn/start", { threadId, input: [{ type: "text", text: "Reply OK without executing any tools." }] });
        raw = await withDeadline(capture, 30_000, "actual provider request");
        const completed = await withDeadline(finished, 30_000, "intentional HTTP400 turn termination");
        receipt.turnStatus = completed.turn.status;
        receipt.tools = toolNames(raw); receipt.nativeTools = nativeNames(raw);
        receipt.nativeRole = developerText(raw).includes("<multi_agent_role>");
        receipt.nativeMode = developerText(raw).includes("<multi_agent_mode>");
        expect(receipt.turnStatus).toBe("failed"); // Capture is NOT successful model inference.
        const nonNative = toolNames(raw).filter(tool => !tool.startsWith("collaboration."));
        expect(nonNative).toEqual(expect.arrayContaining(ordinary));
        if (mode === "control") {
          controlOrdinary = nonNative;
          expect(nativeNames(raw)).toEqual(native);
          expect(receipt.nativeRole).toBe(true); expect(receipt.nativeMode).toBe(true);
        } else {
          expect(controlOrdinary, "Positive control must run before treatments").toBeDefined();
          expect(nonNative).toEqual(controlOrdinary);
          expect(nativeNames(raw)).toEqual([]);
          expect(receipt.nativeRole).toBe(false); expect(receipt.nativeMode).toBe(false);
          expect(config.config.agents.enabled).toBe(false);
        }
        receipt.result = "Pass";
      } catch (error) { failure = error; receipt.result = "Fail"; receipt.error = String(error); }
      finally {
        const cleanupErrors: unknown[] = [];
        if (client) {
          try {
            let closed = false; client.onClose(error => { closed = error === null; });
            if (manager) { await lease!.release(); await manager.close(); }
            else await client.close();
            receipt.processClosed = closed;
            await expect(client.request("config/read", {})).rejects.toThrow("not started");
            expect(closed).toBe(true);
          } catch (error) { cleanupErrors.push(error); }
        }
        if (server) {
          try {
            server.closeAllConnections();
            await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
            receipt.listenerClosed = !server.listening;
            await expect(fetch(origin, { signal: AbortSignal.timeout(1000) })).rejects.toThrow();
          } catch (error) { cleanupErrors.push(error); }
        }
        process.env = originalEnv;
        await fs.rm(root, { recursive: true, force: true });
        receipt.privateRootRemoved = await fs.stat(root).then(() => false, error => error.code === "ENOENT");
        receipt.cleanupErrors = cleanupErrors.map(String);
        if (evidenceDir) {
          await fs.mkdir(evidenceDir, { recursive: true });
          await fs.writeFile(path.join(evidenceDir, `${name}.json`), JSON.stringify({ ...receipt, request: raw, notifications }, null, 2) + "\n");
        }
        console.info("Native surface receipt", JSON.stringify(receipt));
        if (originalEnv.CODEX_NATIVE_SURFACE_LEDGER) await fs.appendFile(originalEnv.CODEX_NATIVE_SURFACE_LEDGER,
          `\n- ${id} Completed ${receipt.result} ${new Date().toISOString()}: ${name}, native tools=${receipt.nativeTools?.length}, cleanup errors=${cleanupErrors.length}; evidence ${evidenceDir}/${name}.json.\n`);
        if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "Owned native capture cleanup failed");
      }
      if (failure) throw failure;
    }, 90_000);
  }
});

async function withDeadline<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`Timed out: ${label}`)), ms); })]); }
  finally { clearTimeout(timer); }
}
