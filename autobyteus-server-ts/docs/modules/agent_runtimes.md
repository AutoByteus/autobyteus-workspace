# Agent Runtimes

## Scope

Reports, for the node it runs on, each external agent runtime's installed
version, update state and sign-in state: Codex, Claude, Antigravity and Grok.
It also starts the vendor's own update and login commands. This is the server
side of Settings -> Agent Runtimes (see
[Settings](../../../autobyteus-web/docs/settings.md#settings-agent-runtimes)).

It also answers "what can run on this node now": every available agent
runtime with its offered models and its live usage limits, read with 0 tokens
(see [Available Agent Runtimes](#available-agent-runtimes)). That is the server
side of the opt-in tool `list_available_agent_runtimes` and of Settings ->
Model Routing -> "Agent runtimes now".

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
  the node fact `signInBrowserAvailable()`, decided once at construction. For
  the update notifications (desktop's own node only) it offers
  `listUpdateStates()`, `checkInBackground(kind)`, `runUpdate(kind)` and one
  update-state listener; see [Update Notifications](update_notifications.md).
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
| Codex | app-server `account/read`: account → signed in; `requiresOpenaiAuth === false` → not required (page shows "–"); otherwise signed out | The tag `github.com/openai/codex/releases/latest` redirects to (`rust-v` stripped; no REST API quota, GitHub's `web` gate) | `codex update` | `codex login` |
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

## Background Checks And Automatic Updates

On the desktop's own node the update-notifications pass checks each runtime at
its interval (default 60 minutes) with `checkInBackground(kind)`: the installed
and newest versions only, never the sign-in, skipped while the runtime is
checking or has a running operation, and keeping the page's finished update and
sign-in results. A newer version becomes an "Agent runtime update"
notification. With automatic updates for agent runtimes on, the pass updates
through `runUpdate(kind)`, the same path `updateAgentRuntime` starts: the same
refusals are returned as results (agents running → it waits and tries again at
the next pass; busy or not installed → nothing this time) instead of thrown
codes.

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

## Available Agent Runtimes

`src/available-agent-runtimes/available-agent-runtimes-service.ts` —
`AvailableAgentRuntimesService.read()`, the one boundary for the tool `list_available_agent_runtimes`
(`src/agent-tools/agent-runtimes/`, AutoByteus local tool and Agent Tools MCP
adapter) and the GraphQL query `availableAgentRuntimes: JSON!`
(`src/api/graphql/types/available-agent-runtimes.ts`; one JSON value, the
same report the tool returns, which the tool gives by the one tool result rule:
its null values are left out). The composition builds it from the same
strategies and sign-in reader as the status service and binds it until
`close()`. The folder `src/available-agent-runtimes/` (service, report,
`usage-limit-model-matching.ts`) sits above `runtime-management` and
`llm-management`, which it reads; neither imports it. Every call reads the runtimes again; nothing is cached, polled or
stored. Reads are single-flight: callers that arrive while a read is in
progress (several agents, the page) share it, so their runtime processes never
overlap. The answer resolves as soon as it is complete; the read stays the one
in progress until its client holds are released.

**Available** means installed (`strategy.readVersion(...) !== null`, the
Agent Runtimes page's rule) and not known to be signed out. A runtime whose
sign-in could not be read is listed with `signIn: "not checked"`. For
AutoByteus, per provider kind:

| Provider kind | Listed when | Models |
| --- | --- | --- |
| Static, keyed (OpenAI, Anthropic, DeepSeek, …) | its key is configured | the AutoByteus catalog's models of that provider |
| Discovered, local (Ollama, LM Studio) | it answers with at least one model now | the reload's models; not answering, an error or a time-out → left out |
| Discovered, keyed (custom endpoint) | its key is configured | the reload's models; a failed reload (`ERROR` / `STALE_ERROR`) → `"unknown: <name> model list could not be read: <source's safe message>"`, a time-out → `"unknown: <name> model list timed out"`, no model → `"unknown: <name> model list could not be read: the endpoint listed no models"` |

Discovered providers are reloaded on every read through
`ModelCatalogService.reloadProviderModelCatalog(id, "autobyteus")` (the
settings' own reload; it refreshes the shared catalog, and a failed reload
keeps the previous rows for launch lists).

**Steps and caps.** All runtimes are read in parallel. Per runtime: install
(4 s) → sign-in (6 s) → models ‖ limits (8 s each), at most 18 s; AutoByteus:
provider list (4 s) → per provider its discovered models ‖ its usage (8 s
each), all providers in parallel. Each cap is a `ReadDeadline`
(`src/runtime-management/read-deadline.ts`, an end time) that every command,
probe, handshake and request inside the step shares: each gets its usual
time-out cut to the time left, and nothing starts once it has passed, so the
step's own processes stop. Codex requests race the deadline and release their
lease in `finally`. Callers without a deadline (this page, launch paths) keep
their usual time-outs.

**Failures.** Strategies' `readUsageLimits`, catalogs and provider readers
return their answer or throw; the service alone words a failed step (REQ-007):
"<subject> timed out" when `isDeadlineExceeded(error)` (or a provider reader's
time-out signal); "<subject> could not be read: <reason>" for an answer a
parser or reader classified as unusable (`UsageLimitsUnreadableError`,
`ProviderUsageUnreadableError`); otherwise "<subject> could not be read". The
error's own text is never shown. Subjects: "<Runtime> usage limits",
"<Runtime> model list", "<Provider> usage", "<Provider> model list".

**Time-outs.** A step stopped by its own deadline surfaces a
`DeadlineExceededError` (from `raceDeadline`, the command runner, or as the
`cause` of a helper's own time-out diagnostic). A command's bound is
`commandBound(deadline, usualMs)`: its usual time-out cut to the time left,
`byDeadline` when the time left set it. Only then is its time-out the step's;
an ordinary per-command time-out (e.g. Antigravity's 3 s `--help` probe) is an
ordinary failure ("could not be read"). The rule is never decided by reading
the clock afterwards (timers and `Date.now()` can disagree by a millisecond).

**Codex client hold.** After the install step the service holds the runtime's
shared client for the rest of the read (`AgentRuntimeStrategy.holdClient`, Codex
only: a home-folder lease taken without `acquire()`), so sign-in, models and
limits start the app-server once and no step meets another's close; the hold
is released when the read is done. Another Codex user of the same folder
closing it meanwhile still gives that step's reason (follow-up FU-003). A failed or timed-out step
gives: install → left out; sign-in → `signIn: "not checked"`; models →
`"unknown: …"` (an empty model list is never "no models"); limits →
`"unknown: …"`.

**Limits** (`AgentRuntimeStrategy.readUsageLimits`, parsers in
`usage-limits/`; plans, tiers, credits, account data and vendor texts are
dropped):

| Runtime | Source (0 tokens) | Limits | A model is blocked when |
| --- | --- | --- | --- |
| Codex | app-server `account/rateLimits/read` (home-folder app-server) | each window: "5-hour", "Weekly" (a model-specific entry adds " · <model>"); remaining = 100 − used % | its window is used up and the account has no credits; with credits, `limitsNote` says Codex runs on paid credits |
| Claude | Agent SDK `get_usage` control request on a query opened with an input that never yields (`claude/client/claude-sdk-control-query.ts`; model discovery uses the same query) | `rate_limits.limits[]`: "5-hour", "Weekly", "Weekly · <model>"; no plan limits (API key) → `not reported` | a covering limit is at 100 % |
| Antigravity | `agy -p "/usage" --output-format json` | each enabled bucket: "<group> · weekly" / "<group> · 5-hour" | its group (by the model families the group lists, or the group name; most specific wins) has 0 % left |
| Grok | ACP extension `_x.ai/billing` after `initialize` on a short process (`runAcpExtensionRequest`) | "Billing period", resets at the period end; remaining only when Grok reports `creditUsagePercent`, else null with a `limitsNote` | its remaining is 0 % |

Remaining percentages are whole numbers rounded down (99.7 → 99); a limit's
exhaustion is decided on the unrounded value. A limit that maps to no offered
model covers the whole runtime. A limit names what it covers in its source's
terms (`appliesTo`): the whole runtime, model ids (Codex), or display-name
families (Claude, Antigravity; a family covers a model when its words appear in
the display name in order from the first word, and an id is never matched as
a family). Each model is given to its most specific family across all of the
runtime's limits; only then do the used-up limits block it. The service
derives each model's `blocked: {until, by}` (until the latest reset of the
used-up limits covering it). AutoByteus providers are read by
`src/llm-management/provider-usage/` (see
[LLM Management](llm_management.md#provider-usage)).

## Tests

- Unit: `tests/unit/runtime-management/agent-runtimes/` (including
  `usage-limits/`, from the recorded answers in
  `tests/fixtures/usage-limits/`), `tests/unit/available-agent-runtimes/`
  (service, concurrency, matching, dependency direction),
  `tests/unit/api/graphql/agent-runtimes-resolver.test.ts`,
  `tests/unit/application-platform/`.
- E2E on a real studio server with scripted CLIs
  (`tests/fixtures/agent-runtimes-fake-cli.mjs`, selected through
  `CODEX_APP_SERVER_COMMAND`, `CLAUDE_CODE_EXECUTABLE_PATH`,
  `ANTIGRAVITY_CLI_COMMAND`, `GROK_BUILD_COMMAND`):
  `tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts` and
  `tests/e2e/runtime/agent-runtimes-running-agents.e2e.test.ts` (the latter
  needs `pnpm test:integration:prepare` for Brief Studio), and
  `tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts` (AAR-01…06:
  the `availableAgentRuntimes` answer with 0 tokens, sign-in and install rules,
  step time-outs, the tool over Agent Tools MCP and shared reads, no secrets
  in any output, discovered providers; provider endpoints, LM Studio and a
  custom endpoint are answered by an in-process stub). Run them with a
  clean environment and a temporary `HOME`, so no real account is read.
- Live (gated, real signed-in CLIs, spends model tokens):
  `tests/e2e/runtime/available-agent-runtimes-live-agents.e2e.test.ts`: per
  enabled runtime (`RUN_CODEX_E2E`, `RUN_CLAUDE_E2E`, `RUN_AGY_E2E`,
  `RUN_GROK_E2E`; AutoByteus with `RUN_LMSTUDIO_E2E` or `RUN_DEEPSEEK_E2E`, the
  key from `AUTOBYTEUS_TEST_VAULT`), LR-1 an agent without the
  tool cannot call it, LR-2 an agent with it gets the node's report, the same as
  the GraphQL read; LR-3 (`RUN_ROUTED_DELEGATION_E2E=1`) is Model Routing's busy-router
  fallback (see [Model Routing](model_routing.md)).
