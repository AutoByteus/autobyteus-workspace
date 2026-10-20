#!/usr/bin/env node
// Scripted stand-in for the four agent runtime CLIs (Settings → Agent Runtimes, ticket runtime-lifecycle-review).
// Link it as `codex`, `claude`, `agy` or `grok`; the link's name picks the runtime. No account, no network.
// The signed-out answers are the real CLIs' own (codex-cli 0.163.0, Claude Code 2.1.302, agy 1.4.3, grok 1.0.62,
// captured in an empty HOME); signed-in, update and login texts are illustrative.
//
// State: files in $FAKE_RUNTIME_STATE_DIR, read on every call, so a test switches a runtime by writing a file.
//   <runtime>-version            installed version (codex 0.150.0, claude 2.1.200, agy 1.4.3, grok 1.0.62)
//   codex-account                signedOut | signedIn | notRequired           (default signedOut)
//   claude-account / agy-account / grok-account   signedOut | signedIn         (default signedOut)
//   codex-update-to              version `codex update` installs (default 0.163.0)
//   claude-update                upToDate (exit 0, version unchanged) | fail   (default upToDate)
//   agy-update                   fail (exit 1, coloured error) | succeed        (default fail)
//   grok-latest                  latest version `grok update --check --json` reports (default = installed)
//   <codex|grok>-login           write `complete` to let a waiting login finish signed in
//   codex-models                 comma-separated model ids for app-server `model/list` (default gpt-5.6-luna)
// The Claude Agent SDK's own start (stream-json) gets one model, `claude-fake-sonnet`.
// Records: <runtime>-<command>.pid (pid of a running login/update), emitted-secrets.log (every secret-looking
// value this fake printed, so a secret scan can prove it had something to find), app-server-requests.log.
// `grok login --oauth` ignores SIGTERM, as a CLI that keeps waiting for its browser callback does.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const name = path.basename(process.argv[1]);
const args = process.argv.slice(2);
const joined = args.join(" ");
const stateDir = process.env.FAKE_RUNTIME_STATE_DIR;
if (!stateDir) {
  process.stderr.write("FAKE_RUNTIME_STATE_DIR is not set\n");
  process.exit(70);
}
const state = (file, fallback) => {
  try { return fs.readFileSync(path.join(stateDir, file), "utf8").trim() || fallback; } catch { return fallback; }
};
const write = (file, value) => fs.writeFileSync(path.join(stateDir, file), value);
const out = (text) => process.stdout.write(text);
const err = (text) => process.stderr.write(text);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const secret = (value) => { fs.appendFileSync(path.join(stateDir, "emitted-secrets.log"), `${value}\n`); return value; };
const recordPid = (label) => write(`${name}-${label}.pid`, String(process.pid));
const waitFor = async (file) => { while (state(file, "wait") !== "complete") await sleep(200); write(file, "wait"); };

const DEFAULT_VERSIONS = { codex: "0.150.0", claude: "2.1.200", agy: "1.4.3", grok: "1.0.62" };
const version = () => state(`${name}-version`, DEFAULT_VERSIONS[name]);

const codexAppServer = () => {
  const send = (value) => out(`${JSON.stringify(value)}\n`);
  let thread = 0;
  let turn = 0;
  readline.createInterface({ input: process.stdin }).on("line", (line) => {
    const message = JSON.parse(line);
    fs.appendFileSync(path.join(stateDir, "app-server-requests.log"), `${message.method}\n`);
    if (message.id === undefined) return;
    let result = {};
    switch (message.method) {
      case "initialize":
        result = { userAgent: `autobyteus/${version()} (fake)`, codexHome: path.join(stateDir, "codex-home"), platformFamily: "unix", platformOs: "macos" };
        break;
      case "account/read": {
        const account = state("codex-account", "signedOut");
        result = account === "signedIn"
          ? { account: { type: "chatgpt", email: secret("FAKE-SECRET-codex-user@example.invalid"), planType: "plus" }, requiresOpenaiAuth: true, workspaceRouting: null }
          : { account: null, requiresOpenaiAuth: account !== "notRequired", workspaceRouting: null };
        break;
      }
      case "model/list":
        result = {
          data: state("codex-models", "gpt-5.6-luna").split(",").map((id, index) => ({
            id, model: id, upgrade: null, upgradeInfo: null, displayName: id.toUpperCase(), description: "Scripted test model.",
            hidden: false, supportedReasoningEfforts: [{ reasoningEffort: "medium", description: "Balanced" }],
            defaultReasoningEffort: "medium", inputModalities: ["text"], supportsPersonality: false, isDefault: index === 0,
          })),
          nextCursor: null,
        };
        break;
      case "thread/start":
      case "thread/resume":
        thread += 1;
        result = { thread: { id: `fake-thread-${process.pid}-${thread}` } };
        break;
      case "turn/start":
        turn += 1;
        result = { turn: { id: `fake-turn-${process.pid}-${turn}` } };
        send({ id: message.id, result });
        // The turn stays in progress: the agent keeps running until it is stopped.
        send({ method: "turn/started", params: { threadId: message.params?.threadId, turn: result.turn } });
        return;
      case "turn/interrupt":
        // Codex 0.160's order for a Stop: the response, then idle, then the interrupted turn.
        send({ id: message.id, result: {} });
        send({ method: "thread/status/changed", params: { threadId: message.params?.threadId, status: { type: "idle" } } });
        send({ method: "turn/completed", params: { threadId: message.params?.threadId, turn: { id: message.params?.turnId, status: "interrupted", error: null } } });
        return;
      default:
        result = {};
    }
    send({ id: message.id, result });
  }).on("close", () => process.exit(0));
};

const main = async () => {
  if (joined === "--version") {
    if (name === "codex") return out(`codex-cli ${version()}\n`);
    if (name === "claude") return out(`${version()} (Claude Code)\n`);
    if (name === "agy") return out(`${version()}\n`);
    if (name === "grok") return out(`grok ${version()} (1474f9cbdd91)\n`);
  }
  if (name === "codex") {
    if (args.includes("app-server")) return codexAppServer();
    if (joined === "login") {
      recordPid("login");
      out("Starting local login server on http://localhost:1455.\nIf your browser did not open, navigate to this URL to authenticate:\n\n");
      out(`${secret("https://auth.openai.com/oauth/authorize?response_type=code&client_id=app_FAKE&code_challenge=FAKE-SECRET-codex-challenge&state=FAKE-SECRET-codex-state")}\n`);
      await waitFor("codex-login");
      write("codex-account", "signedIn");
      return out("Successfully logged in\n");
    }
    if (joined === "update") {
      recordPid("update");
      const target = state("codex-update-to", "0.163.0");
      for (const line of ["Checking for updates…", `Downloading codex ${target}…`, "Installing…"]) { out(`${line}\n`); await sleep(700); }
      write("codex-version", target);
      return out(`Updated to ${target}\n`);
    }
  }
  if (name === "claude") {
    // Started by the Claude Agent SDK (stream-json): answer its control requests with one model, as
    // `claude-owned-sdk-cli.mjs` does; used for the Claude model list behind application launch readiness.
    if (args.includes("--input-format") && args.includes("stream-json")) {
      readline.createInterface({ input: process.stdin }).on("line", (line) => {
        const frame = JSON.parse(line);
        if (frame.type !== "control_request") return;
        out(`${JSON.stringify({ type: "control_response", response: { subtype: "success", request_id: frame.request_id,
          response: { commands: [], models: [{ value: "claude-fake-sonnet", displayName: "Claude Fake Sonnet", description: "Scripted test model." }],
            account: {}, output_style: "default", available_output_styles: [] } } })}\n`);
      }).on("close", () => process.exit(0));
      return;
    }
    if (joined === "auth status --json") {
      if (state("claude-account", "signedOut") === "signedIn") {
        out(`${JSON.stringify({ loggedIn: true, authMethod: "claude.ai", apiProvider: "firstParty", email: secret("FAKE-SECRET-claude-user@example.invalid"), orgId: secret("FAKE-SECRET-claude-org"), subscriptionType: "max" }, null, 2)}\n`);
        return;
      }
      // Claude 2.1.302 signed out: this JSON on stdout and exit code 1.
      out(`${JSON.stringify({ loggedIn: false, authMethod: "none", apiProvider: "firstParty", analyticsDisabled: false, projectsDirectory: path.join(stateDir, "claude-config", "projects"), configDirectory: path.join(stateDir, "claude-config") }, null, 2)}\n`);
      process.exitCode = 1;
      return;
    }
    if (joined === "update") {
      recordPid("update");
      out(`Current version: ${version()}\nChecking for updates to latest version...\n`);
      await sleep(600);
      if (state("claude-update", "upToDate") === "fail") { err("Error: EACCES: permission denied, rename '/fake/claude/versions/tmp'\n"); process.exitCode = 1; return; }
      return out("Claude is up to date!\n");
    }
  }
  if (name === "agy") {
    if (joined === "--help") return out("--agent --new-project --add-dir --conversation --input-format --output-format --dangerously-skip-permissions\n");
    if (joined === "models") {
      if (state("agy-account", "signedOut") === "signedIn") return out("gemini-3.8-flash-low\tGemini test\n");
      // agy 1.4.3 signed out (empty HOME).
      err("Fetching available models...\nError: Please sign in to view available models. Launch the CLI without arguments to sign in.\n");
      process.exitCode = 1;
      return;
    }
    if (joined === "update") {
      recordPid("update");
      out("Checking for updates...\n");
      await sleep(1500);
      if (state("agy-update", "fail") === "succeed") { write("agy-version", "1.5.0"); return out("Updated to 1.5.0\n"); }
      err("\u001b[31mError:\u001b[0m update failed: permission denied writing /fake/agy/bin/agy\n");
      process.exitCode = 1;
      return;
    }
  }
  if (name === "grok") {
    if (joined === "models") {
      // grok 1.0.62 in an empty HOME prints this with exit 0.
      if (state("grok-account", "signedOut") === "signedOut") return out("You are not authenticated.\n\nDefault model: grok-4.6\n\nAvailable models:\n  * grok-4.6 (default)\n  - grok-4.5\n");
      return out("Default model: grok-4.6\n\nAvailable models:\n  * grok-4.6 (default)\n  - grok-4.5\n");
    }
    if (joined === "update --check --json") {
      const latest = state("grok-latest", version());
      return out(`${JSON.stringify({ currentVersion: version(), latestVersion: latest, updateAvailable: latest !== version(), installer: "internal", channel: "stable", autoUpdate: null, error: null })}\n`);
    }
    if (joined === "login --oauth") {
      recordPid("login");
      process.on("SIGTERM", () => { fs.appendFileSync(path.join(stateDir, "grok-login-signals.log"), "SIGTERM ignored\n"); });
      out(`Opening your browser to sign in…\n${secret("https://accounts.x.ai/oauth2/auth?client_id=grok-cli&code_challenge=FAKE-SECRET-grok-challenge")}\n`);
      await waitFor("grok-login");
      write("grok-account", "signedIn");
      return out("Signed in.\n");
    }
  }
  err(`agent-runtimes-fake-cli: unsupported ${name} ${joined}\n`);
  process.exitCode = 9;
};

await main();
