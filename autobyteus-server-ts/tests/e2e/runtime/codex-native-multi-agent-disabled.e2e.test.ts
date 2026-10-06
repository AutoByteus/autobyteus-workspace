import fs from "node:fs/promises";
import { appendFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { spawn, execFile, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import { expect, it } from "vitest";

// Requires current server prebuild/build, installed logged-in Codex, explicit two bounded live turns.
// RUN_CODEX_E2E=1 RUN_CODEX_NATIVE_POLICY_LIVE=1 CODEX_NATIVE_POLICY_AUTH_FILE=<auth.json>
// pnpm exec vitest run tests/e2e/runtime/codex-native-multi-agent-disabled.e2e.test.ts --no-watch
// Optional CODEX_NATIVE_POLICY_EVIDENCE_DIR retains sanitized receipts (never auth/env bytes).
const enabled = process.env.RUN_CODEX_E2E === "1" && process.env.RUN_CODEX_NATIVE_POLICY_LIVE === "1";
const fingerprint = async (file: string) => createHash("sha256").update(await fs.readFile(file)).digest("hex");
const sanitize = (text: string) => text.replace(/agtrun_[A-Za-z0-9_-]{43}/g, "<redacted-session>");

(enabled ? it : it.skip)("A08: actual inventories and scoped MCP survive public Team create/Stop/restore with exact identity", async () => {
  const sourceAuth = process.env.CODEX_NATIVE_POLICY_AUTH_FILE;
  expect(sourceAuth, "Explicit auth source required; never infer or copy personal config").toBeTruthy();
  const sourceDir = path.dirname(sourceAuth!);
  const sourceConfig = path.join(sourceDir, "config.toml");
  const beforeAuth = await fingerprint(sourceAuth!);
  const beforeConfig = await fingerprint(sourceConfig);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "codex-native-policy-system-"));
  await fs.chmod(root, 0o700);
  let child: ChildProcess | undefined;
  let result: any;
  let logs = "";
  let failure: unknown;
  const cleanup: Record<string, unknown> = {};
  const evidence = process.env.CODEX_NATIVE_POLICY_EVIDENCE_DIR;
  const model = process.env.CODEX_NATIVE_POLICY_MODEL || "gpt-6.1-sol";
  const ledger = process.env.CODEX_NATIVE_POLICY_LEDGER;
  const binary = process.env.CODEX_NATIVE_POLICY_BINARY || "codex";
  try {
    const version = await promisify(execFile)(binary, ["--version"]);
    cleanup.binaryVersion = version.stdout.trim();
    const home = path.join(root, "home"), codexHome = path.join(home, ".codex");
    await fs.mkdir(codexHome, { recursive: true, mode: 0o700 });
    await fs.copyFile(sourceAuth!, path.join(codexHome, "auth.json")); await fs.chmod(path.join(codexHome, "auth.json"), 0o600);
    const catalog = path.join(sourceDir, "models_cache.json");
    await fs.copyFile(catalog, path.join(codexHome, "models_cache.json")); await fs.chmod(path.join(codexHome, "models_cache.json"), 0o600);
    await fs.writeFile(path.join(codexHome, "config.toml"), `model = "${model}"
model_reasoning_effort = "low"
approval_policy = "never"
cli_auth_credentials_store = "file"
web_search = "disabled"
[features]
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
    await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    const env: NodeJS.ProcessEnv = { PATH: process.env.PATH, HOME: home, CODEX_HOME: codexHome, TMPDIR: root, LANG: "en_US.UTF-8", APP_ENV: "test",
      DATABASE_URL: `file:${path.join(root, "test.db")}`, AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(root, "temp_workspace"), AUTOBYTEUS_AGENT_PACKAGE_ROOTS: "",
      CODEX_APP_SERVER_COMMAND: process.env.CODEX_NATIVE_POLICY_BINARY || "codex", CODEX_APP_SERVER_SANDBOX: "read-only" };
    for (const key of ["HTTPS_PROXY", "HTTP_PROXY", "ALL_PROXY", "NO_PROXY", "SSL_CERT_FILE", "SSL_CERT_DIR", "CODEX_CA_BUNDLE", "NODE_EXTRA_CA_CERTS"]) {
      if (process.env[key]) env[key] = process.env[key];
    }
    await fs.access(path.resolve("dist/compositions/build-studio-server.js"));
    await promisify(execFile)(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy", "--schema", "prisma/schema.prisma"], { env });
    child = spawn(process.execPath, ["tests/fixtures/codex-native-multi-agent-system.mjs", root, model], { env, stdio: ["ignore", "pipe", "pipe", "ipc"] });
    child.stdout!.on("data", chunk => { logs += sanitize(String(chunk)); }); child.stderr!.on("data", chunk => { logs += sanitize(String(chunk)); });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Bounded system probe exceeded 420 seconds")), 420_000);
      child!.on("message", (message: any) => {
        if (message.checkpoint) {
          console.info("A08 checkpoint", message.checkpoint);
          if (ledger) appendFileSync(ledger, `\n- A08 Checkpoint ${new Date().toISOString()}: ${message.checkpoint} (not terminal).\n`);
        }
        if (message.receipt) result = message.receipt;
      });
      child!.once("error", error => { clearTimeout(timer); reject(error); });
      child!.once("exit", (code, signal) => { clearTimeout(timer); cleanup.childExited = true; cleanup.exitCode = code; cleanup.signal = signal;
        if (code !== 0) reject(new Error(`Owned system failed: ${JSON.stringify(result)}\n${logs.slice(-5000)}`)); else resolve(); });
    });
    expect(result.result).toBe("Pass"); expect(result.inventories).toHaveLength(2);
    expect(result.cleanup.errors).toEqual([]); expect(result.exactThreadIdentityPreserved).toBe(true); expect(result.twoPhysicalClientCloses).toBe(true);
  } catch (error) { failure = error; }
  finally {
    if (child && child.exitCode === null && child.signalCode === null) {
      // Kill only this exact owned child after giving graceful teardown an opportunity.
      const exited = new Promise<void>(resolve => child!.once("exit", () => resolve())); child.kill("SIGTERM");
      const force = setTimeout(() => child!.kill("SIGKILL"), 10000);
      try { await exited; cleanup.childExited = true; } finally { clearTimeout(force); }
    }
    await fs.rm(root, { recursive: true, force: true });
    cleanup.privateRootAndAuthRemoved = await fs.stat(root).then(() => false, error => error.code === "ENOENT");
    cleanup.sourceAuthUnchanged = await fingerprint(sourceAuth!) === beforeAuth;
    cleanup.sourceConfigUnchanged = await fingerprint(sourceConfig) === beforeConfig;
    if (evidence) {
      await fs.mkdir(evidence, { recursive: true });
      await fs.writeFile(path.join(evidence, "system.json"), sanitize(JSON.stringify({ result, cleanup, error: failure ? String(failure) : null }, null, 2)) + "\n");
      await fs.writeFile(path.join(evidence, "system.log"), logs);
    }
    console.info("A08 cleanup", JSON.stringify(cleanup));
    if (ledger) appendFileSync(ledger, `\n- A08 Completed ${failure ? "Fail" : "Pass"} ${new Date().toISOString()}: ${failure ? String(failure).slice(0, 250) : "two inventories/MCP/identity/physical closes passed"}; cleanup ${JSON.stringify(cleanup)}; see ${evidence}/system.json.\n`);
    expect(cleanup.privateRootAndAuthRemoved).toBe(true); expect(cleanup.sourceAuthUnchanged).toBe(true); expect(cleanup.sourceConfigUnchanged).toBe(true);
  }
  if (failure) throw failure;
}, 480_000);
