# Agent Runtimes

## Scope

Reports, for the node it runs on, each external agent runtime's installed
version, update state and sign-in state: Codex, Claude, Antigravity and Grok.
It also starts the vendor's own update and login commands. This is the server
side of Settings -> Agent Runtimes (see
[Settings](../../../autobyteus-web/docs/settings.md#settings-agent-runtimes)).

Out of scope:

- Installing runtimes. The user installs them; the page links to each vendor's
  official instructions.
- How runtimes are found and how they execute agents. The four existing
  resolvers are reused unchanged, so the page shows what agent runs use. A
  runtime installed while the server runs may need a restart to be found.
- Credentials. Nothing here reads, copies, stores or logs a credential,
  sign-in URL, code or account detail.

## TS Source

- `src/runtime-management/agent-runtimes/agent-runtime-status-service.ts` —
  `AgentRuntimeStatusService`, the only public boundary. It owns the four rows
  (last results, current operation, `checkedAt`), runs the checks for each
  runtime on their own, allows one operation per runtime, enforces the
  agents-running rule, and stops its processes on `close()`. It also reports
  the node fact `signInBrowserAvailable()`, decided once at construction.
- `sign-in-browser-availability.ts` — `isSignInBrowserAvailable(platform, env)`:
  whether a runtime's own login can open a browser on this node's desktop.
  macOS and Windows: yes. Otherwise yes only when `BROWSER`, `DISPLAY` or
  `WAYLAND_DISPLAY` is set (the AutoByteus server Docker image sets `BROWSER`,
  its VNC Chromium, and `DISPLAY`).
- `agent-runtime-sign-in-reader.ts` — `AgentRuntimeSignInReader`, the one
  owner of "is this runtime signed in". It returns a server-internal
  `SignInReading` (`signedIn`, `signedOut`, `notRequired`, or `unknown` with a
  `detail`). The service and the Application launch-readiness adapter both use
  it.
- `agent-runtime-strategy.ts` and `strategies/*-agent-runtime-strategy.ts` —
  one strategy per runtime: finding the executable, a fresh `--version` read,
  the sign-in read, the newest-version source, the update command, the sign-in
  route and the install link. Strategies hold no state.
- `runtime-process-operation.ts` — one long vendor process (update or login).
  It strips ANSI from the output, caps it at 4 KB and keeps the latest line.
  Cancel sends SIGTERM, then SIGKILL after 3 s. It times out after 10 minutes.
- `runtime-command-runner.ts` (short commands, 10 s time-out),
  `runtime-source-fetch.ts` (HTTP, 10 s time-out), `runtime-version.ts`
  (`x.y.z` extract and compare), `agent-runtime-types.ts`.
- `src/api/graphql/types/agent-runtimes.ts` — thin GraphQL resolver (studio
  server only).
- `src/compositions/agent-runtime-status-composition.ts` — builds the service
  and its `countRunningAgents(runtimeKind)` port. `build-studio-server.ts`
  closes it on server close.

## Per-Runtime Strategies

| Runtime | Sign-in read | Newest version from | Update | Sign in from the page |
| --- | --- | --- | --- | --- |
| Codex | app-server `account/read`: account → signed in; `requiresOpenaiAuth === false` → not required (page shows "–"); otherwise signed out | GitHub `repos/openai/codex/releases/latest` (`rust-v` stripped) | `codex update` | `codex login` |
| Claude | `claude auth status --json`, JSON read whatever the exit code (signed out exits 1); without JSON, exit 0 + "logged in" text → signed in | `downloads.claude.ai/claude-code-releases/<channel>`, channel = `autoUpdatesChannel` in the user's Claude `settings.json` (`CLAUDE_CONFIG_DIR` or `~/.claude`), default `latest` | `claude update` | No: command-line hint |
| Antigravity | `agy models` through `listAntigravityModels`; `AGY_SIGN_IN_REQUIRED` → signed out | the vendor updater manifest for the OS and CPU | `agy update` | No: command-line hint |
| Grok | `grok models`: "You are not authenticated." → signed out; other exit 0 → signed in | `grok update --check --json` | `grok update` | `grok login --oauth` |

A failed version source marks only that row `CHECK_FAILED` and keeps the
installed version. A failed sign-in read gives `UNKNOWN`.

## GraphQL API

- `agentRuntimes: [AgentRuntime!]!` — the four rows. It only reads, and never
  starts work.
- `agentRuntimeSignInBrowserAvailable: Boolean!` — whether this node's
  runtimes' own logins can open a browser on this node's desktop. Read only;
  fixed for the server's lifetime.
- `checkAgentRuntimes` — a user-started check. It clears finished results and
  starts a check for every runtime that is not already checking and has no
  running operation.
- `updateAgentRuntime(runtimeKind)` — starts the vendor update. Exit 0 with a
  newer version gives `SUCCEEDED` with `fromVersion` and `toVersion`, followed
  by an automatic re-check of that runtime that keeps the result. A failure,
  or exit 0 with the same version (for example Homebrew's "Claude is up to
  date!"), gives `FAILED` with the vendor's output.
- `startAgentRuntimeSignIn(runtimeKind)` / `cancelAgentRuntimeSignIn(runtimeKind)`
  — Codex and Grok only. When the login process exits, the account is read
  again: signed in ends the operation, anything else (or the time-out) gives
  `DID_NOT_FINISH`. The sign-in operation carries no command, step or error,
  and no output of a login process is kept, returned or logged.
- Refusals carry `extensions.code`: `AGENT_RUNTIME_AGENTS_RUNNING`,
  `AGENT_RUNTIME_BUSY`, `AGENT_RUNTIME_NOT_INSTALLED`,
  `AGENT_RUNTIME_SIGN_IN_UNSUPPORTED`, `AGENT_RUNTIME_UNKNOWN` (only the four
  external runtime kinds are accepted).

Remote and Docker node windows read the same query and run the same
operations on the node: a login started there opens in the node's own browser
(on a Docker node its VNC Chromium). The web client offers Sign in on a remote
node only when `agentRuntimeSignInBrowserAvailable` is true, and never offers
Update there.

## Running-Agent Rule

Update is refused while the runtime has running agents. The count is the
process `AgentRunManager`'s active runs of that runtime kind (standalone runs,
team and Org members) plus Application agents, read through
`ApplicationPlatformRuntime.hostManagement.activeAgentRuns.countByRuntimeKind`.
`agent-runtimes/` imports neither; the composition supplies the port.

## Application Launch Readiness

`application-provider-credential-readiness-adapter.ts` reads Codex and Claude
sign-in through `AgentRuntimeSignInReader` (built in
`create-application-orchestration-services.ts`) instead of running its own
commands. Its rules and reason texts are unchanged, except one case: a Claude
status read that times out now takes 10 s and gives the reason "Command timed
out after 10000ms.". Grok and Antigravity application readiness are still
`unsupported` (see [Grok Build Runtime](./grok_build_runtime.md#known-limits)).

## Tests

- Unit: `tests/unit/runtime-management/agent-runtimes/`,
  `tests/unit/api/graphql/agent-runtimes-resolver.test.ts`,
  `tests/unit/application-platform/`.
- E2E on a real studio server with scripted CLIs
  (`tests/fixtures/agent-runtimes-fake-cli.mjs`, selected through
  `CODEX_APP_SERVER_COMMAND`, `CLAUDE_CODE_EXECUTABLE_PATH`,
  `ANTIGRAVITY_CLI_COMMAND`, `GROK_BUILD_COMMAND`):
  `tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts` and
  `tests/e2e/runtime/agent-runtimes-running-agents.e2e.test.ts` (the latter
  needs `pnpm test:integration:prepare` for Brief Studio). Run them with a
  clean environment and a temporary `HOME`, so no real account is read.
