# Design Spec — Agent Runtimes page

## Solution And Approval Basis

- Current solution revision ID: SR-011 (SR-010 passed ARCH-REV-002; SR-011 adds the Application-agent count after the implementation engineer's Design Impact question)
- Approved requirements: `requirements-doc.md` SR-010 — SR-007 approved by the user 2026-10-20 (UD-005, UD-006), plus his SR-010 decisions UD-007 (runtime lookup unchanged; "After installing, restart AutoByteus." hint — answers AR-003 with option (b)) and UD-008 (no in-app Antigravity sign-in). DEC-008 decided by the Solution Designer, user informed.
- Behavior-defining supplement: Product UI/UX spec, Approved by the user ("yes approved", 2026-10-20): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/runtime-lifecycle-review/ui-ux-spec.md`, VIS-001…VIS-023, revision `a74ecd4` — with the two user-directed differences in requirements-doc "UI note (SR-010)": the restart hint on Not installed rows, and Antigravity in the command-line state (UXJ-009, VIS-010/011/012/021/023 no longer apply).
- Design status: Ready
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-lifecycle-design-review/tickets/in-progress/runtime-lifecycle-review/investigation-notes.md` (E-R01…E-R22, E-A01…E-A09)
- Authorities read (2026-10-20): `references/architecture-design.md`; `references/design-principles.md` (updated); `templates/design-spec-template.md` (updated); repository `DESIGN.md` and `TESTING.md` at `dc530fdcb0`. `design-examples.md` not used.
- Project design-principle conflicts or discrepancies: none.
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-lifecycle-design-review`, branch `codex/runtime-lifecycle-design-review`, base `origin/personal` `dc530fdcb0e52aa70ce681f33df94c80f5d2334c`; finalization target `origin/personal`.

## Current-State Read

- Each runtime has one command resolver, used by its execution path: Codex `resolveLaunchCommand()`, Claude `resolveClaudeCodeExecutablePath()`, Antigravity `antigravityCommand()`, Grok `grokBuildCommand()` (E-A01). This design **uses them unchanged** (UD-007): the page shows exactly what AutoByteus can run. A runtime installed while AutoByteus runs appears after a restart (the server's PATH comes from the login shell when the app starts, E-A02); the Not installed row says so.
- Sign-in detection exists in two places: the application launch-readiness adapter (`application-platform/launch-configuration/application-provider-credential-readiness-adapter.ts`) checks Codex (`account/read` via `CodexAppServerClientManager`, workspace cwd; configured when `requiresOpenaiAuth !== true || account != null`) and Claude (`auth status --json`); Antigravity's signed-out state is classified in model discovery (`AGY_SIGN_IN_REQUIRED`); Grok has none (E-A07, E-R21).
- `readAntigravityCliVersion()` caches the first successful `agy --version` for the server's lifetime; its only other user is the compaction-detection gate in `agy-agent-run-backend-factory.ts` 110 (minimum 1.2.16) (AR-002).
- Running agents: every standalone, team and Org member agent is an `AgentRun` in the process `AgentRunManager` (`listActiveRuns()`, `getActiveRun(id).runtimeKind`) (E-A03). **Application agents are not**: the application platform's one `ApplicationExecutionScope` builds its own `AgentRunManager` (`application-execution-scope-kernel-builder.ts` 131) held in its kernel; `ApplicationPlatformRuntime.hostManagement` has no read for it (E-A10, SR-011).
- Settings long-running work: one read-only status query polled 2 s while busy / 10 s idle, actions as mutations, server-side in-memory operation state (`useEmbeddingSettings.ts`) (E-A04).
- Only the window knows whether it is bound to the desktop's own node (`windowNodeContextStore.isEmbeddedWindow`) (E-A06).
- The readiness adapter is built in `create-application-orchestration-services.ts` 162, reached through `build-application-platform-runtime.ts` from both `build-studio-server.ts` and `start-standalone-application-host.ts` (AR-005).
- No persisted AutoByteus data is involved.

## Task Size And Architectural Risk (Mandatory)

- Task size: **Large**
- Size rationale: a new server capability (status service, sign-in reader, four runtime strategies, process operation, small shared runner/version files), a new GraphQL API, a refactor of the application readiness adapter's Codex/Claude branches and its composition, and a new Settings section (three components, composable, types, documents, two locales). About 25 files across server runtime-management, application-platform, GraphQL and web Settings.
- Architectural risk: **High**
- Risk rationale: new API contract (query + four mutations); the server starts vendor processes (update, Codex/Grok login) and fetches vendor update sources; sign-in detection moves to a new owner that application launch readiness then uses, in both composition roots.
- Escalation trigger: a vendor update or login command that needs a terminal, interactive input or elevated rights; a vendor source that is unusable; any need to change the four command resolvers or execution backends — return a Design Impact.

## Architecture Investigation Evidence

| Source | Path / reference | Observation | Decision supported | Uncertainty |
| --- | --- | --- | --- | --- |
| E-A01 Code | four resolvers | One resolver per runtime | Strategies call them unchanged | — |
| E-A02 Scripts/docs (read) | vendor install scripts, `electron/utils/shellEnv.ts` | Installers add their folder to the shell profile; the app reads the login-shell PATH at start | Restart hint (UD-007) | — |
| E-A03 Code | `agent-run-manager.ts`, `configured-agent-execution-handle.ts` | All member agents are `AgentRun`s in `AgentRunManager` | Running-agent count | — |
| E-A04 Code | `useEmbeddingSettings.ts` | Poll 2 s/10 s, mutations | Same pattern | — |
| E-A06 Code | `windowNodeContextStore.ts` | `isEmbeddedWindow` in renderer only | UI-only own-node gate | — |
| E-A07 Code | readiness adapter 185–233 | Codex/Claude detection | Move to sign-in reader | — |
| E-A08 Probe | Antigravity manifests | `{darwin,linux,windows}_{amd64,arm64}.json` | Platform mapping | — |
| E-A09 Code | `server-runtime.ts` | Shutdown closes the Fastify app | Stop processes on `onClose` | — |
| ARCH-REV-001 MP-001 | `antigravity-cli-capability.ts` 128–141 | Version cached for process life | Fresh `--version` in the strategy | — |
| E-R19…E-R22 | investigation notes | Commands, sources, links per runtime | Strategy contents | Grok signed-in output unseen |

## Intended Change

Add one server capability, **Agent Runtimes**, in `runtime-management/agent-runtimes/`. A status service owns the page's state for the four runtimes and delegates each runtime-specific step to that runtime's strategy: find it (existing resolver) and read its version; read its newest version; describe its update command and its sign-in route. A stateless sign-in reader owns "is this runtime signed in" for both the page and application launch readiness. The service runs checks independently per runtime and one operation (update or Codex/Grok sign-in) per runtime, and counts that runtime's running agents. A GraphQL query and four mutations expose it; the Settings page polls it like Embedding.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002, UC-003. Areas: new `autobyteus-server-ts/src/runtime-management/agent-runtimes/`; one read on the application platform (`ApplicationExecutionScope.countActiveAgentRuns`, exposed as `hostManagement.activeAgentRuns`, SR-011); the application readiness adapter (Codex/Claude delegate to the reader) and `create-application-orchestration-services.ts` (builds the reader); new GraphQL type; studio composition; new Settings section, composable, types, documents, localization.
- Deliberately left alone: the four command resolvers and how AutoByteus finds and runs runtimes (UD-007); `RuntimeAvailabilityService` and the chat model menu (labels and names "Claude SDK"/"Grok Build", DEC-006); agent execution backends; application readiness for Antigravity and Grok (stays "unsupported"); `Terminal.vue` and the terminal route; Electron; persisted data; the Antigravity execution-side version cache (see Reuse table).
- Follow-ups: FU-001…FU-004 in `follow-ups.md`.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind | REQ / AC | Trigger | Existing (evidence) | Approved change | Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001/005, AC-001/006 | Open Settings → Agent Runtimes | No page (E-R12) | Rows with installed version and sign-in state | DS-001 |
| BEH-002 | User | REQ-002, AC-002 | Page open / Check again | None | Independent per-runtime latest check | DS-001 |
| BEH-003 | User | REQ-003, AC-003/004 | Click Update | Terminal only | Vendor update, progress, re-check; blocked while agents run | DS-002 |
| BEH-004 | User | REQ-004, AC-005 | Runtime missing | "Unavailable" | Not installed + link + restart hint | DS-001 |
| BEH-005 | User/Contract | REQ-005/006/008, AC-006/007/009/011 | Click Sign in (Codex, Grok) | Terminal only | Vendor login opens the browser; Claude/Antigravity hint | DS-003 |
| BEH-006 | Operational | REQ-007, AC-010 | Remote node window | — | Status only | DS-001 (UI gate) |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| Product `ui-ux-spec.md` + VIS | Normative UI | REQ-001…007 | Every visible state and copy, with the SR-010 UI note | Approved by user |
| `design-review-report.md`, `architecture-review-revision-record.md` | ARCH-REV-001 | AR-001…007 | Resolved below | Reviewer-owned |
| `follow-ups.md` | Out-of-ticket findings | FU-001…004 | — | Not yet sent |

## Task Design Health Assessment (Mandatory)

- Change posture: Feature
- Current design issue found: Yes
- Structural triggers:
  - **Repeated coordination (fires):** Codex/Claude sign-in detection lives in the readiness adapter; the page needs the same → one owner (`AgentRuntimeSignInReader`), adapter delegates (E-A07).
  - **Capability-area reuse (fires):** status polling and process shutdown → reuse the Embedding pattern and Fastify `onClose`.
  - Ruled out: Ambiguous boundary (explicit `runtimeKind` everywhere); Persisted-data transition (no stored data); Legacy cleanup (no old path kept); Authoritative boundary (resolver and adapter use only public boundaries).
- Root cause classification: Duplicated Policy Or Coordination
- Refactor needed now: Yes, bounded: move Codex/Claude detection from the adapter into the reader.
- Evidence: E-A07.
- Design response: the reader owns sign-in reads; the adapter keeps its mapping to application readiness and its reason texts.
- Intentional deferrals: `RuntimeAvailabilityService` keeps its own probes (FU-003); application readiness for Antigravity/Grok unchanged (FU-004).

## Terminology

- **Runtime strategy:** the per-runtime object that knows that runtime's commands and sources.
- **Operation:** one running update or sign-in process for one runtime.
- **Check:** reading installed version, sign-in state and newest version for one runtime.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: the readiness adapter's private Codex/Claude detection, its local `runCommand` and its `commandRunner` option.
- Compatibility wrappers kept: None.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Decision: **Not Affected.** All new state (last check results, running operations) lives in server memory and is rebuilt by the next check. Vendor installs and credentials change only through the vendors' own commands that the user starts.

## Data-Flow Spine Inventory

| ID | Scope | BEH | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001/002/004/006 | Page open / Check again | Rows show installed, updates, account | `AgentRuntimeStatusService` | Main read path |
| DS-002 | Primary | BEH-003 | Click Update | New version shown, re-checked | `AgentRuntimeStatusService` | Runs a vendor process |
| DS-003 | Primary | BEH-005 | Click Sign in (Codex, Grok) | Signed in / didn't finish | `AgentRuntimeStatusService` | Runs a vendor process |
| DS-005 | Bounded local | BEH-003/005 | Process start | Exit / cancel / time-out | `RuntimeProcessOperation` | Every vendor process ends (QR-003) |
| DS-006 | Return/Event | all | Server state changes | Rows update | `useAgentRuntimes` | How results reach the page |

## Primary Execution Spine(s)

- DS-001: `Settings page -> useAgentRuntimes -> checkAgentRuntimes -> AgentRuntimeStatusService -> per runtime: strategy (existing resolver + fresh --version, latest source) and AgentRuntimeSignInReader -> in-memory row -> agentRuntimes query -> row`
- DS-002: `Update -> updateAgentRuntime(kind) -> service (refuse if agents run) -> RuntimeProcessOperation(<runtime> update) -> exit -> fresh version -> automatic re-check of that runtime -> "Updated from X to Y."`
- DS-003: `Sign in -> startAgentRuntimeSignIn(kind) -> service -> RuntimeProcessOperation(codex login | grok login --oauth) -> vendor opens browser -> exit 0 -> reader -> Signed in`

## Spine Narratives (Mandatory)

| Spine | Narrative | Main nodes | Owner | Off-spine |
| --- | --- | --- | --- | --- |
| DS-001 | Opening the page or Check again asks the server to check all four. The service starts four independent checks; each finds its runtime with the existing resolver, reads `--version` fresh, its sign-in through the reader and its newest version from its vendor source, and records each part as it arrives. The page polls and shows each row as soon as its result is in. A failing part marks only that part of that row. | page, composable, service, strategies, reader | Service | runner, version compare, HTTP |
| DS-002 | Update runs the strategy's update command. The service refuses while that runtime has running agents. Progress shows the command and the vendor's latest output line. Exit 0 with a new version: "Updated from X to Y.", then an automatic re-check of that runtime that keeps the result (AR-006). Failure, or exit 0 with an unchanged version (e.g. Homebrew "Claude is up to date!"): the vendor's output as the error. | button, service, operation | Service | operation |
| DS-003 | Sign in runs the strategy's login command; the vendor CLI opens the browser and ends when done. The service then asks the reader; SIGNED_IN ends the operation. Cancel or the 10-minute time-out stops the process ("Sign-in didn't finish. Try again."). No URL or code passes through AutoByteus. | button, service, operation, reader | Service | operation |

## Spine Actors / Main-Line Nodes

`AgentRuntimesManager` (page), `useAgentRuntimes`, `AgentRuntimesResolver` (GraphQL), `AgentRuntimeStatusService`, the four `AgentRuntimeStrategy` implementations, `AgentRuntimeSignInReader`, `RuntimeProcessOperation`.

## Ownership Map

- `AgentRuntimeStatusService`: the four rows' state (last check results, current operation, `checkedAt`); check sequencing (independent per runtime, one in flight per runtime); one operation per runtime; the agents-running rule; stopping processes on server close. Public boundary for the page's API.
- `AgentRuntimeSignInReader`: the one owner of "is this runtime signed in". Stateless; built from the strategies and a `CodexAppServerClientManager`. Used by the service and by the readiness adapter.
- `AgentRuntimeStrategy` (per runtime): that runtime's resolver call, version read (always fresh), sign-in read mechanics, newest-version source, update command, sign-in route, install link. No state.
- `RuntimeProcessOperation`: one child process — start, latest output line, bounded output, cancel, time-out, exit result.
- `AgentRuntimesResolver`: thin GraphQL translation.
- `useAgentRuntimes`: request sequencing, polling cadence, node-binding reset — as Embedding.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Owner behind it | Why | Must not own |
| --- | --- | --- | --- |
| `AgentRuntimesResolver` | `AgentRuntimeStatusService` | GraphQL transport | runtime knowledge, processes |
| Readiness adapter (Codex/Claude branches) | `AgentRuntimeSignInReader` | Application readiness mapping and reason texts | detection commands |

## Removal / Decommission Plan (Mandatory)

| Item | Why unnecessary | Replaced by | Notes |
| --- | --- | --- | --- |
| Adapter `readCodexReadiness`/`readClaudeReadiness` detection bodies, local `runCommand` (line 48), `commandRunner` dependency option (line 105) and its test usage (`application-provider-credential-readiness-adapter.test.ts` 24–37, 137–150) | Duplicated detection; the option only fakes that local command | `AgentRuntimeSignInReader`; adapter tests fake the reader | Reason texts kept by mapping `SignInReading.detail` |
| Dead code in touched files | Checked 2026-10-20: every export of the adapter is referenced (exported types used inside the file) | — | No further removals |

## Return Or Event Spine(s) (If Applicable)

DS-006: service state change → next `agentRuntimes` poll (**2 s** while any row is checking or has a running operation, as Embedding's `BUSY_POLL_MS`; **10 s** otherwise, which also refreshes running-agent counts so a blocked Update enables itself) → composable compares readings for announcements → rows. The query only reads; re-reads are started by the service (checks, operations), never by polling.

## Bounded Local / Internal Spines (If Applicable)

- DS-005, parent `RuntimeProcessOperation`: `spawn(argv, inherited env) -> collect output (ANSI stripped, capped 4 KB) -> latest line -> exit | cancel (SIGTERM, SIGKILL after 3 s) | time-out (10 min) -> {exitCode, output, cancelled, timedOut}`.
- Operation states per runtime (service): `idle -> updating -> updated | updateFailed`; `idle -> signingIn -> signedIn | signInDidNotFinish`, Cancel → idle. Rules (AR-006): after a successful update the automatic re-check of that runtime **keeps** `updated`, so "Updated from X to Y." stays visible (VIS-005); a **user-started check** (page open, Check again) clears finished results and **skips any runtime whose operation is running**; a new operation replaces a finished result; `signedIn` clears once the account reads SIGNED_IN.

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves | Responsibility | Why | Risk if on main line |
| --- | --- | --- | --- | --- | --- |
| Short command runner | DS-001 | strategies, reader | Run `--version`/status with 10 s time-out | Shared by strategies and the former adapter copy | Copies per strategy |
| Version parse/compare | DS-001/002 | strategies, service | `x.y.z` extract/compare | One rule | Wrong "Update available" |
| Latest-version HTTP fetch | DS-001 | strategies | GET, 10 s time-out | Isolated per runtime | One slow source blocks others |
| Running-agent count | DS-002 | service | Port `countRunningAgents(runtimeKind)`: process `AgentRunManager` + application platform `hostManagement.activeAgentRuns.countByRuntimeKind` | REQ-003, AC-004 (Application agents are agents too) | Update interrupting an Application's live run |

## Ownership Boundaries

`AgentRuntimeStatusService` is the only public boundary for the page. `AgentRuntimeSignInReader` is the only boundary for sign-in reads (service and adapter). Strategies and `RuntimeProcessOperation` are internal to `agent-runtimes/`.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden bypass | If too thin |
| --- | --- | --- | --- | --- |
| `AgentRuntimeStatusService` | strategies, operations, row state | GraphQL resolver | Resolver calling a strategy | Add a service method |
| `AgentRuntimeSignInReader` | per-runtime sign-in mechanics | service, readiness adapter | Adapter running vendor commands itself | Extend `SignInReading` |

## Dependency Rules

- `agent-runtimes/` may depend on: the four existing resolvers (unchanged), `antigravity-cli-capability` (`listAntigravityModels` and its sign-in classification), `CodexAppServerClientManager`, Node `child_process`/`fetch`, and a `countRunningAgents(runtimeKind)` port (it does not import `AgentRunManager` or the application platform; the studio composition supplies the port).
- The studio composition reads Application agents only through `ApplicationPlatformRuntime.hostManagement.activeAgentRuns` — never the scope kernel directly.
- The readiness adapter depends on `AgentRuntimeSignInReader` only (the standalone application host does not construct the status service).
- Execution backends do not depend on `agent-runtimes/`.
- Web: components → `useAgentRuntimes` → GraphQL documents; nothing imports server code.
- Forbidden: the renderer sending command strings; the server returning sign-in URLs, codes, `SignInReading.detail` or raw status output (Codex `login status` can print part of an API key).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity |
| --- | --- | --- | --- |
| Query `agentRuntimes: [AgentRuntime!]!` | four rows of this node | Read current state; never starts work | — |
| Mutation `checkAgentRuntimes: Boolean` | all four | User-started check: clear finished results, start a check for each runtime that is not checking and has no running operation | — |
| Mutation `updateAgentRuntime(runtimeKind: String!)` | one runtime | Start its update; error if agents run, not installed or busy | `runtimeKind` (validated with `runtimeKindFromString`, external kinds only) |
| Mutation `startAgentRuntimeSignIn(runtimeKind: String!)` | one runtime | Start its login process; error unless route is BROWSER (Codex, Grok), installed and idle | `runtimeKind` |
| Mutation `cancelAgentRuntimeSignIn(runtimeKind: String!)` | one runtime | Stop its login process | `runtimeKind` |
| `AgentRuntimeSignInReader.read(kind, { cwd })` → `SignInReading` | one runtime | Sign-in reading (internal) | kind + cwd (adapter: workspace root; page: `os.homedir()`, Codex's global config) |

`AgentRuntime` fields: `runtimeKind`, `installed`, `installedVersion`, `updates { state: CHECKING | UP_TO_DATE | UPDATE_AVAILABLE | CHECK_FAILED | NOT_CHECKED, latestVersion }`, `account { state: CHECKING | SIGNED_IN | SIGNED_OUT | UNKNOWN | NOT_APPLICABLE }`, `signInRoute: BROWSER | COMMAND_LINE`, `installInstructionsUrl`, `runningAgentCount`, `operation { kind: UPDATE | SIGN_IN, state: RUNNING | SUCCEEDED | FAILED | DID_NOT_FINISH, command, step, fromVersion, toVersion, error }` (nullable), `checkedAt`.

`SignInReading` (server-internal, AR-005):

```ts
type SignInReading =
  | { state: "signedIn" }
  | { state: "signedOut"; detail: string }   // e.g. "no logged-in account."
  | { state: "notRequired" }                 // Codex: requiresOpenaiAuth === false, no account
  | { state: "unknown"; detail: string };    // command/protocol failure text
```

- Codex: `account != null` → signedIn; else `requiresOpenaiAuth === false` → notRequired; else signedOut ("no logged-in account."). Errors → unknown.
- Claude: exit 0 and `loggedIn === true` → signedIn; exit 0, `loggedIn` false → signedOut; otherwise unknown with today's `describeFailure` text.
- Grok: output contains "You are not authenticated." → signedOut; other exit 0 → signedIn; failure → unknown.
- Antigravity: model listing succeeds → signedIn; `AGY_SIGN_IN_REQUIRED` → signedOut; other failure → unknown.

Adapter mapping (today's rule and texts): signedIn or notRequired → `{configured: true}`; signedOut/unknown → `{configured: false, reason: "<Runtime> authentication is unavailable: " + detail}` — Codex signedOut gives today's exact text; Claude keeps `describeFailure`.

Page mapping (`detail` never leaves the server): signedIn → **Signed in**; signedOut → **Not signed in** (+ Sign in for BROWSER route, "Sign in from its command line." for COMMAND_LINE); unknown → **Sign-in unknown**; notRequired → `NOT_APPLICABLE` → **"–"**, no button (DEC-008).

## Interface Boundary Check

| Interface | Singular | Explicit identity | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| agentRuntimes / checkAgentRuntimes | Yes | Yes | Low | — |
| updateAgentRuntime / start/cancelAgentRuntimeSignIn | Yes | Yes | Low | — |
| `AgentRuntimeSignInReader.read` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Drift | Action |
| --- | --- | --- | --- | --- |
| Page/API | Agent runtime (`agentRuntimes`, `AgentRuntimeStatusService`) | Yes | Low | — |
| Sign-in owner | `AgentRuntimeSignInReader` | Yes | Low | — |
| Per-runtime knowledge | `AgentRuntimeStrategy` | Yes | Low | — |
| Child process | `RuntimeProcessOperation` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Find each runtime | four resolvers | Reuse unchanged | Page matches what AutoByteus runs (UD-007) |
| Status polling | Embedding pattern | Reuse pattern | Same cadence and node reset |
| Codex sign-in read | `CodexAppServerClientManager` + `account/read` | Reuse | Same rule as application readiness |
| Antigravity sign-in read | `listAntigravityModels` + `AGY_SIGN_IN_REQUIRED` | Reuse | Already classified |
| Antigravity version | `readAntigravityCliVersion` | **Not reused** (AR-002) | It caches for the process life; the strategy runs `agy --version` fresh. The execution cache is left untouched: it only gates compaction detection (≥ 1.2.16); updates only raise the version; a restart refreshes it — staleness can only keep a newer feature off until restart |
| Running agents | process `AgentRunManager`; `ApplicationExecutionScope` kernel `AgentRunManager` | Reuse + Extend | Process manager covers standalone/team/Org members; Application agents need one new read on the scope, exposed through `hostManagement` (SR-011) |
| Process shutdown | Fastify `onClose` | Reuse | Server close path |
| Runtime status service | none | Create new | No owner of versions/updates/sign-in |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| server `runtime-management/agent-runtimes/` | service, reader, strategies, operation, runner, version, types | DS-001…003, DS-005 | Create new |
| server `application-platform/` | adapter delegates; reader built in orchestration services | — | Modify |
| server `api/graphql/types/` | `agent-runtimes.ts` | DS-001…003 | Create new |
| server `compositions/build-studio-server.ts` | service construction, `onClose` | — | Modify |
| web Settings | section, components, composable, types, documents, i18n | DS-001…003, DS-006 | Create new / extend |

## Draft File Responsibility Mapping

Drafted as the final mapping below.

## Reusable Owned Structures Check

| Repeated | Shared file | Owner | Why | Redundant removed | Overlap removed | Must not become |
| --- | --- | --- | --- | --- | --- | --- |
| Short command with time-out | `runtime-command-runner.ts` | agent-runtimes | strategies + former adapter copy | Yes | Yes | a process manager |
| Version extract/compare | `runtime-version.ts` | agent-runtimes | strategies + service | Yes | Yes | a semver library |
| Row/operation types | `agent-runtime-types.ts` | agent-runtimes | service, strategies, GraphQL | Yes | Yes | a grab-bag |

## Shared Structure / Data Model Tightness Check

| Structure | One meaning per field | Redundant removed | Overlap risk | Action |
| --- | --- | --- | --- | --- |
| `AgentRuntime` | Yes | Yes | Low | `installedVersion` null iff not installed |
| `SignInReading` | Yes | Yes | Low | `detail` server-internal |
| `operation` | Yes | Yes | Low | Lifetime rules in Bounded Local |

## Final File Responsibility Mapping

| File | Owner | Concern |
| --- | --- | --- |
| `server/src/runtime-management/agent-runtimes/agent-runtime-status-service.ts` | Service | Rows, independent checks, operations, agent rule, `close()`; singleton accessor |
| `…/agent-runtimes/agent-runtime-sign-in-reader.ts` | Reader | `SignInReading`, `read(kind, {cwd})` |
| `…/agent-runtimes/agent-runtime-strategy.ts` | Contract | Strategy interface, sign-in route type |
| `…/agent-runtimes/agent-runtime-types.ts` | Types | Row, check, operation types |
| `…/strategies/codex-agent-runtime-strategy.ts` | Codex | `resolveLaunchCommand()`; `--version`; sign-in read via `account/read` (moved logic); latest from GitHub `repos/openai/codex/releases/latest` (`rust-v` stripped); update `codex update`; route BROWSER `codex login`; link `https://learn.chatgpt.com/docs/codex/cli` |
| `…/strategies/claude-agent-runtime-strategy.ts` | Claude | resolver; `--version`; `auth status --json` (moved); latest from `https://downloads.claude.ai/claude-code-releases/<channel>`, channel = `autoUpdatesChannel` in the user's Claude `settings.json` (`CLAUDE_CONFIG_DIR` or `~/.claude`; default `latest`); update `claude update`; route COMMAND_LINE; link `https://code.claude.com/docs/en/setup` |
| `…/strategies/antigravity-agent-runtime-strategy.ts` | Antigravity | `antigravityCommand()`; `agy --version` fresh via the runner; sign-in from `listAntigravityModels` classification; latest from `https://antigravity-cli-auto-updater-974169037036.us-central1.run.app/manifests/<os>_<arch>.json` (darwin/linux/windows × amd64/arm64); update `agy update`; route COMMAND_LINE; link `https://antigravity.google/docs/getting-started?tab=cli` |
| `…/strategies/grok-agent-runtime-strategy.ts` | Grok | `grokBuildCommand()`; `--version`; sign-in via `grok models`; latest from `grok update --check --json`; update `grok update`; route BROWSER `grok login --oauth`; link `https://docs.x.ai/build/overview` |
| `…/agent-runtimes/runtime-process-operation.ts` | Operation | One child process |
| `…/agent-runtimes/runtime-command-runner.ts` | Runner | Short commands with time-out |
| `…/agent-runtimes/runtime-version.ts` | Version | Extract/compare `x.y.z` |
| MODIFY `application-platform/launch-configuration/application-provider-credential-readiness-adapter.ts` | Adapter | Codex/Claude via the reader; mapping above; local `runCommand` and `commandRunner` option removed; tests fake the reader |
| MODIFY `application-platform/runtime/create-application-orchestration-services.ts` | Wiring | Build the reader from `input.codexClientManager`, pass to the adapter (covers studio server and standalone host) |
| NEW `api/graphql/types/agent-runtimes.ts` + schema registration | Transport | Query and mutations (studio server only) |
| MODIFY `compositions/build-studio-server.ts` | Wiring | Construct the service with its reader (same `CodexAppServerClientManager`) and the port `countRunningAgents(kind) = process AgentRunManager count + applicationPlatformRuntime.hostManagement.activeAgentRuns.countByRuntimeKind(kind)`; `close()` on app `onClose` |
| MODIFY `application-platform/execution/application-execution-scope.ts` | Application scope | `countActiveAgentRuns(runtimeKind)`: counts `kernel.agentRunManager` active runs of that kind (`listActiveRuns` + `getActiveRun().runtimeKind`) |
| MODIFY `application-platform/execution/application-execution-scope-kernel-builder.ts` | Kernel | Expose a narrow active-run reader on `ApplicationExecutionScopeKernel` (it does not expose `agentRunManager` today) for the scope's count (AR-008, ARCH-REV-003) |
| MODIFY `application-platform/runtime/application-platform-runtime-contracts.ts`, `runtime/build-application-platform-runtime.ts` | Host contract | `ApplicationPlatformHostManagementContracts.activeAgentRuns: { countByRuntimeKind(runtimeKind): number }`, bound to the scope method |
| NEW web `graphql/queries/agentRuntimesQueries.ts`, `graphql/mutations/agentRuntimesMutations.ts`, `types/agentRuntimes.ts` | Web data | Documents, types |
| NEW web `composables/settings/useAgentRuntimes.ts` | Composable | Poll 2 s busy / 10 s idle; node reset; `checkAgentRuntimes` on mount and Check again; actions; announcements |
| NEW web `components/settings/agent-runtimes/AgentRuntimesManager.vue`, `AgentRuntimeRow.vue` | View | Card/table per the UI spec and the SR-010 UI note; own-node gating via `isEmbeddedWindow` |
| MODIFY web `pages/settings.vue` | Navigation | `agent-runtimes` after API Keys |
| MODIFY web `localization/messages/{en,zh-CN}/settings.ts` | Copy | `settings.agentRuntimes.*`, including "After installing, restart AutoByteus." / 安装后请重启 AutoByteus。 |

## Applied Patterns (If Any)

- **Strategy** (the user's request): one `AgentRuntimeStrategy` per runtime, selected by `runtimeKind` inside the service and the reader.
- **State machine** (local): operation states in Bounded Local.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Must not contain |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/agent-runtimes/` | Folder | Service, reader | Agent Runtimes capability | agent execution logic |
| `…/agent-runtimes/strategies/` | Folder | Strategies | One file per runtime | shared state |
| `autobyteus-web/components/settings/agent-runtimes/` | Folder | View | Page components | GraphQL calls |

## Folder Boundary Check

| Path | Depth | Clear | Risk | Note |
| --- | --- | --- | --- | --- |
| `agent-runtimes/` | Main-line domain | Yes | Low | Flat except `strategies/` |
| `components/settings/agent-runtimes/` | View | Yes | Low | Matches `settings/embedding/` |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Strategy | `{ runtimeKind, resolveExecutable(), readVersion(exe), readLatestVersion(exe), readSignIn(exe, cwd), updateArgv(exe), signInRoute, signInArgv?(exe), installInstructionsUrl }` | `switch (kind)` in every service method | Adding a runtime touches one file |
| Independent checks | four promises, each writes its row | `Promise.all` then publish | DESIGN.md rule 3 |
| Update result | exit 0 + new version → "Updated from X to Y."; exit 0 + same version → failure with vendor output | exit code alone | Homebrew `claude update` exits 0 with "Claude is up to date!" |
| Post-update re-check | automatic re-check keeps `updated` | clearing on every check | VIS-005 |

## Backward-Compatibility Rejection Log (Mandatory)

| Mechanism | Why considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep adapter's own Codex/Claude detection | Smaller diff | Rejected | Reader |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Runner, version, types; strategies; reader with the moved Codex/Claude logic; adapter delegates through the reader built in `create-application-orchestration-services.ts` (adapter tests keep their expected results and texts, faking the reader).
2. `RuntimeProcessOperation`; status service (independent checks, operations, agent rule, close); GraphQL; studio composition.
3. Web: types, documents, composable, components, section, localization.
4. Verify against the UI spec, the SR-010 UI note and the ACs.

## Key Tradeoffs

- Runtime lookup unchanged (UD-007): consistent with execution; a runtime installed while the app runs needs a restart, and the page says so.
- Vendor CLIs open the browser themselves: no URL through AutoByteus (REQ-008); if the browser does not open, the row times out with "Try again".
- Own-node gating is UI-only; the API adds no authority beyond the existing terminal route (E-R10).

## Risks

- Undocumented sources (Claude download host, Antigravity manifest) → that row shows Check failed (R-02). GitHub's unauthenticated limit (60/h) → Codex Check failed in extreme use.
- Grok's signed-in output unverified → verify with the user's consent.
- `codex login` from a piped process opening the browser is evidenced for an older version only → escalation trigger.
- `codex login` uses local port 1455; if busy the vendor error shows.

## Guidance For Implementation

- Follow the approved UI spec and the requirements' SR-010 UI note; `settings.agentRuntimes.*` keys.
- Never forward vendor status output to the client except the update/sign-in step line and the update failure output; strip ANSI; cap at 4 KB; never log sign-in output.
- Every started process ends on exit, cancel, time-out or server close (QR-003).
- Tests (per `TESTING.md`): strategies against scripted fake executables set through the existing env overrides (`CODEX_APP_SERVER_COMMAND`, `CLAUDE_CODE_EXECUTABLE_PATH`, `ANTIGRAVITY_CLI_COMMAND`, `GROK_BUILD_COMMAND`) with a temp `HOME`; HTTP sources stubbed; service tests for independence, agent rule, cancel/time-out, operation-result rules; adapter tests through a fake reader; GraphQL e2e; web unit tests; a browser probe for the UI states. Real update and sign-in only on the user's machine with his consent during delivery — never his accounts in automated tests.

## ARCH-REV-001 Resolution (SR-010)

| Finding | Resolution |
| --- | --- |
| AR-001 | N/A — the Antigravity terminal sign-in was removed by the user (UD-008); Antigravity shows the command-line hint |
| AR-002 | Antigravity strategy reads `agy --version` fresh; execution-side cache left untouched with reason (Reuse table) |
| AR-003 | User chose option (b) (UD-007): resolvers unchanged; Not installed rows say "After installing, restart AutoByteus."; REQ-009 not adopted |
| AR-004 | N/A — `Terminal.vue` is no longer touched (UD-008) |
| AR-005 | `SignInReading`, adapter and page mappings, page cwd (home folder), `AgentRuntimeSignInReader` built in `create-application-orchestration-services.ts` (both roots) and in the studio server for the service |
| AR-006 | Automatic post-update re-check keeps the result; user-started checks clear finished results and skip running operations |
| AR-007 | Cadence 2 s / 10 s (as Embedding); dead-code check recorded; adapter `commandRunner` and local `runCommand` listed; supplement inventory updated |

## SR-011 — Application agents in the running-agent count

- Trigger: implementation engineer (run `implementation_engineer_40c3051b92cb4a71afadf8349f6cf4f5`) Design Impact question: Application agents run in the application platform's own `AgentRunManager`, so the design's count missed them.
- Decision (within approved REQ-003/AC-004/DEC-003; no behavior change): count them. One read on the existing owner (`ApplicationExecutionScope`, one per server, already holding that manager) exposed through the platform's public `hostManagement` contract; the status service receives a single `countRunningAgents(kind)` port composed in the studio server. The standalone application host does not construct the status service and needs no wiring.
- Classification unchanged: Large/High.
