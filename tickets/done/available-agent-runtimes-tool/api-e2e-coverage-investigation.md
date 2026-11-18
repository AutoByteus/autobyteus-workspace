# API/E2E Coverage Investigation — autobyteus-303 (`list_available_agent_runtimes`, Settings → Model Routing)

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `tickets/in-progress/available-agent-runtimes-tool/requirements-doc.md` (SR-005, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-005, incl. § SR-004 Addition)
- Supplemental Task Artifacts: `evidence/limit-probes/` (probe scripts; recorded answers are the fixtures in `autobyteus-server-ts/tests/fixtures/usage-limits/`)
- Design Review Report: `design-review-report.md` (ARCH-REV-005 Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-002)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-002 Pass, 9.4/10)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: 2
- Trigger: code review pass CRR-005 (round-1 fixes CR-002…CR-005; SR-006, SR-007) from `/software_engineering_team/code_reviewer`
- Prior Investigation Reviewed: round 1 (API-REV-001, Fail)
- Latest Authoritative Investigation: this document

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool` (branch `codex/available-agent-runtimes-tool`; code at `683b036be9`, base `origin/personal` `a2faf424d6`).

## Current Requirement And Design Basis

- An opt-in tool `list_available_agent_runtimes` (AutoByteus local tool and Agent Tools MCP adapter) and GraphQL `availableAgentRuntimes` return one `AvailableAgentRuntimesService.read()` report: every available agent runtime (installed and not known to be signed out) with its models and live 0-token usage limits; AutoByteus with its keyed (or local-with-models) providers, their models, balance or block (REQ-001…005, 007, 008, 010; AC-001…009, 011, 012).
- Per runtime: install (4 s) → sign-in (6 s) → models ‖ limits (8 s each), each step a deadline that stops its processes, backstopped at cap + 500 ms; failures give the REQ-007 entries; whole answer ≤ 20 s (DS-003, REQ-010).
- Settings → Model Routing → "Agent runtimes now" renders the same report, read on open, on Check again and on node rebind; no polling (REQ-009, AC-010, UI required states).
- No credential or account identity in answers, logs or storage; no model request (REQ-008, QR-002).
- Claude model discovery now uses an idle-input control query (no user turn) — a change to a preserved path (model lists for launches).
- Persisted data: `Not Affected`.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (agent calls the tool), SCN-002 (agent on another runtime calls it through Agent Tools MCP), SCN-003 (user opens Settings → Model Routing, Check again, remote-node window).
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-A1 Explicit edge (the code review's SCN-004): one runtime's CLI is slow or hangs at a step (a CLI waiting on its network) → that runtime's entry follows REQ-007, the answer still arrives in time, and the hung processes end. Trigger: a normal read while a CLI hangs.
  - SCN-A2 Two real readers at once: the page is open (or Check again) while an agent calls the tool, or two agents call it (RSK-002, C-05). Trigger: a user action and a tool call at about the same time; real parallel agent teams produce this.
  - SCN-A3 A node whose CLIs are all signed out or missing and with no provider key (a new Docker node, ASM-001): the page and the tool say so truthfully.
  - SCN-A4 The first read on a freshly started server (cold provider registry; C-03 4 s AutoByteus listing cap).
  - SCN-A5 Preserved: Claude model lists for launches (and the Agent Runtimes page) keep working after the discovery change; the Agent Runtimes page is unchanged.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): none recorded; C-02 (overlapping Antigravity families) is not produced by agy's data (code review) and is not tested.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 tool + GraphQL report | Added | design DS-001, DS-003 | Server E2E on a real studio server with scripted CLIs; MCP through a real Codex run; live answer |
| BEH-002 Model Routing page | Added | design DS-002 | Real-stack browser probe (scripted CLIs, built server) incl. states, zh-CN, remote node |
| BEH-003 limit readers (Codex, Claude, Antigravity, Grok; DeepSeek, Kimi, Anthropic, xAI) | Added | REQ-005 | Scripted wire protocols in E2E; live readers against real CLIs and the test vault |
| Claude model discovery on an idle-input control query | Changed | C-15, AR-001 | E2E: Claude CLI receives no `user` frame for discovery or usage; existing launch E2E with Claude models stays green |
| Agent Runtimes page, sign-in reading, launches | Preserved | Scope Guardrail | Rerun existing Agent Runtimes server E2E and browser probe (they share the extended fake CLI) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | service rules, parsers, matching | IMP-02/03 unit (fakes, fixtures) | composition with real strategies and processes | Server E2E |
| API / transport / contract | Yes | GraphQL `availableAgentRuntimes` (JSON), MCP tool, local tool | unit with a fake service | real HTTP, real MCP host and session exposure | Server E2E |
| Frontend component / state | Yes | section, row, model list | IMP-05 component tests | real GraphQL answer, rendering of every state | Browser probe |
| Browser integration / user journey | Yes | Settings nav → page, Check again, rebind | IMP-08 (dev stack, happy path only) | unknown/not-checked/provider states, zh-CN, remote node | Browser probe (real stack) |
| Authentication / session / permissions | Yes | runtime sign-in states; provider keys from the vault | unit | signed-out/unknown via real CLIs; vault keys | Server E2E; live |
| Desktop renderer / web-equivalent UI | Yes | same renderer | — | — | Browser probe (web-equivalent) |
| Desktop shell / Electron-specific integration | No | no shell change; the embedded server gets only `CODEX_HOME` of the CLI homes (TESTING.md) | — | CLI sign-ins seen by the embedded server use the real HOME as on any node | Not required (see Not Tested) |
| Process / lifecycle | Yes | short child processes under deadlines; kills; Codex lease | unit kills real child processes | real CLIs' processes, many at once | Server E2E (process checks); live parallel |
| Persisted-data transition | No | nothing stored | — | — | — |
| Worker / queue / distributed coordination | No | each node answers for itself | — | Docker node parity (ASM-001) | Test-owned Docker container |
| External integration | Yes | four CLI protocols, four provider HTTP APIs | recorded fixtures | live formats today | Live reads (real CLIs, test vault) |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool`
- Project type and runtime stack: pnpm monorepo; Fastify/GraphQL server (`autobyteus-server-ts`, vitest), Nuxt web (`autobyteus-web`), Electron shell.
- Project testing guideline path(s): `TESTING.md` (repository root of the worktree; same as the superrepo's). No closer `TESTING*.md` in `autobyteus-server-ts` or `autobyteus-web`.
- Conflicting, missing, or unclear project instructions: none.
- Required environment variables or secrets available: `Yes` — the standing test vault `~/.autobyteus-test/vault` is READY with DeepSeek, Kimi, Anthropic, Grok (xAI), OpenAI and other keys (`pnpm test-vault status`, values never read); signed-in host CLIs (codex, claude, agy, grok) for live reads.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | testing guideline | Server E2E on a test-owned server (`vitest run <file> --no-watch`), clean env `env -i PATH HOME=<resolved temp> TMPDIR`; live CLIs need real `HOME`, `USER`, `LOGNAME`; never edit `~/.codex`/`~/.claude`/`~/.grok`; agy has no isolated signed-in recipe → live agy on host login adds history; browser probes own their stack and fail on browser errors; Docker: test-owned container, `127.0.0.1`, no user volumes, `dist` mounted read-only, `docker rm -f -v`; test vault via `AUTOBYTEUS_TEST_VAULT`; one local-model run at a time; never touch the user's running AutoByteus |
| `autobyteus-server-ts/docs/modules/secret_management.md` § Test Vault | live provider keys | `AUTOBYTEUS_TEST_VAULT=<dir>` selects the read-only test vault for a test-owned server |
| `tests/e2e/helpers/agent-runtimes-e2e-harness.ts`, `tests/fixtures/agent-runtimes-fake-cli.mjs` | existing scripted-CLI harness | fakes linked as codex/claude/agy/grok, overrides `CODEX_APP_SERVER_COMMAND`, `CLAUDE_CODE_EXECUTABLE_PATH`, `ANTIGRAVITY_CLI_COMMAND`, `GROK_BUILD_COMMAND`, state files in `FAKE_RUNTIME_STATE_DIR` |
| `autobyteus-web/tests/e2e/agent-runtimes-settings-probe.mjs` | sibling real-stack probe | built `dist/app.js` with `--import` fetch stub, Nuxt dev, headless Chrome, `bindNodeContext` for a remote-node window, result.json + screenshots, cleanup receipt |
| `docs/isolated-app-instances.md` | desktop instances | not used (see Desktop plan) |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process studio server (server E2E) | `autobyteus-server-ts` | `buildStudioServer` in the test file | port 0, temp data root, scripted CLIs | `fastify.listen` resolved | `fastify.close()`, temp root removed |
| Built server node (browser probe, live, Docker) | `autobyteus-server-ts` | `pnpm -C autobyteus-server-ts build`, then `node dist/app.js --host 127.0.0.1 --port <free> --data-dir <temp>` | own data root and SQLite | `GET /rest/health` | SIGTERM/SIGKILL owned pid; temp root removed |
| Nuxt dev frontend (probe) | `autobyteus-web` | `pnpm dev --host 127.0.0.1 --port <free>` with `BACKEND_NODE_BASE_URL` | serialized with builds | HTTP 200 | owned process group stopped |
| Test-owned Docker container | — | `docker run` from `autobyteus/autobyteus-server:beta`, `127.0.0.1:<free>`, no user volumes, `dist` mounted read-only | user's containers `autobyteus-server-0..2` are never touched | `/rest/health` | `docker rm -f -v` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Signed-in/out runtime CLIs, scripted | extend `agent-runtimes-fake-cli.mjs` (state files) | no account, no network | temp root removed |
| Recorded limit answers | `tests/fixtures/usage-limits/*.json` | redacted | repository |
| Provider keys (scripted) | GraphQL `saveProviderApiKey` with synthetic keys into the test server's own vault; provider HTTP answered by an in-process `fetch` stub | synthetic keys, scanned for in every output | temp root removed |
| Provider keys (live) | standing test vault (`AUTOBYTEUS_TEST_VAULT`) | read-only; values never printed | nothing to clean |
| Live CLI logins | host logins, real `HOME` | reads only; agy `/usage` may add to the host's agy history (TESTING.md known gap) — reported | — |
| Docker CLI login (optional) | stream one credential file from a user's node container into the test container (TESTING.md) | never written to the host | container removed |

## Persisted Data Transition Coverage Basis (When Applicable)

Not applicable: `Not Affected` (live reads only; the implementation stores nothing).

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/runtime-management/agent-runtimes/available-agent-runtimes-service.test.ts` (and parsers, matching, strategies, control query, ACP, provider readers, tool tests; IMP-03) | service rules, REQ-007 entries, caps with slow fakes, parsers from fixtures, no secret in output | AC-001…009, 011, 012 | Still Valid | read; IMP-03 pass at 5135bb73dc, no server change since | Reuse (API-00) |
| `autobyteus-web/components/settings/model-routing/__tests__/ModelRoutingManager.spec.ts` (IMP-05/09) | page states in jsdom | AC-010 | Still Valid | IMP-09 at 683b036be9 | Reuse (API-00) |
| `tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts` | Agent Runtimes page contract on scripted CLIs | preserved behavior | Still Valid; shares the fake CLI being extended | read | Rerun (API-06) |
| `tests/e2e/runtime/agent-runtimes-running-agents.e2e.test.ts`, `application-import-codex-launch.e2e.test.ts` | launch readiness and runs on scripted CLIs (incl. Claude models through the SDK start) | preserved behavior; Claude discovery change | Still Valid; shares the fake CLI | read | Rerun (API-06) |
| `autobyteus-web/tests/e2e/agent-runtimes-settings-probe.mjs` | Agent Runtimes page real-stack journey | preserved behavior | Still Valid; shares the fake CLI | read | Rerun (API-07b) |
| No server E2E, MCP-path or browser coverage of `availableAgentRuntimes` | — | AC-001…011 | Gap | `grep availableAgentRuntimes tests/e2e` empty | Add (API-01…05, API-07) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-00 | AC-001…012 (unit level), AC-010 component | unit/component | Reused | IMP-01, IMP-02, IMP-03, IMP-04, IMP-05, IMP-06, IMP-09 | `git diff --name-only 683b036be9 HEAD` touches only `tickets/`; IMP-01…06 ran on 5135bb73dc and `5135bb73dc..683b036be9` changes only `availableAgentRuntimesPresentation.ts` (dead export), covered by IMP-09 |
| API-01 | AC-001, 003, 004, 005, 006, 007, 009; REQ-002, 003, 004, 005, 008 | real studio server over HTTP GraphQL; scripted CLIs (all four protocols incl. Claude `get_usage`, Grok ACP `_x.ai/billing`); provider keys saved through GraphQL; provider HTTP stubbed in process | Durable | new `tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts`, clean env | First proof through the real composition, strategies, processes and vault |
| API-02 | REQ-002, REQ-007 (sign-in), AC-001 alt | same | Durable | same file: Claude signed out → absent; Grok not installed → absent; Codex sign-in unknown → listed `signIn: "not checked"`; Codex `notRequired` → listed; provider without key absent | Availability rules with real CLI answers |
| API-03 | AC-008, AC-011, REQ-010 | same + process table | Durable | same file: agy hangs on `models` and `/usage` (sign-in, models and limits steps), Grok `--version` hangs (install), Codex `account/rateLimits/read` never answers; answer ≤ 20 s; hung pids dead; next read gets Codex limits again (lease released) | Deadlines stop real processes |
| API-04 | AC-002, AC-012, REQ-001 | real Codex run → thread/start MCP config → real Agent Tools MCP host | Durable | same file: agent definition listing the tool → Codex run → `enabled_tools` has it, `tools/list` has it, `tools/call` = GraphQL report shape; definition without it → not enabled, not listed, call refused | Proves the opt-in exposure through a real run, not a hand-made exposure |
| API-05 | RSK-002, REQ-010 | same | Durable | same file: three GraphQL reads and one MCP call at once; all ≤ 20 s; Codex outcome recorded | SCN-A2 |
| API-06 | preserved behavior | existing server E2E | Existing Test | the three existing scripted-CLI E2E files, clean env | Fixture change regression |
| API-07 | AC-010; UI required states | real stack: built server + Nuxt + headless Chrome, scripted CLIs, provider stub | Durable | new `autobyteus-web/tests/e2e/model-routing-settings-probe.mjs` (+ `fixtures/model-routing-provider-usage.mjs`): nav → page; rows; sign-in not checked; limits/models unknown; provider balance/blocked/not reported; Check again re-reads (state change shown); node with nothing usable; remote-node window shows that node; zh-CN; narrow width; page equals GraphQL; secret scan; no browser errors | Closes the "component tests only" gap on the real stack |
| API-07b | preserved Agent Runtimes page | real stack | Existing Test | `node tests/e2e/agent-runtimes-settings-probe.mjs --skip-server-build` | Fake CLI shared |
| API-08 | REQ-005, REQ-010, AC-003…007 live, AC-009 live, SCN-A4 | test-owned built server, real HOME (host CLI logins), test vault | Temporary Probe | start `dist/app.js` with own data root, `AUTOBYTEUS_TEST_VAULT`; first (cold) read and later reads of `availableAgentRuntimes`; compare against each runtime's own direct answer (limit probes); secret scan; timings | Live formats and live providers; a durable gated suite would spend nothing but would read the user's live accounts on every run, so it stays a ticket probe |
| API-09 | RSK-002, REQ-010 | same live server | Temporary Probe | 4 parallel reads (GraphQL) + timings, twice | Live concurrency |
| API-10 | REQ-008 (0 tokens), AC-005 live | real Claude CLI | Temporary Probe | repeated `get_usage` reads through the SDK idle-input query: `session.total_cost_usd`, `rate_limits.limits[].percent` per read; product reads between | 0-token proof the reviewer asked for |
| API-11 | AC-001 on the AutoByteus runtime (SCN-001 entry surface) | live server, AutoByteus agent with LM Studio local model | Journey | agent definition with the tool, AutoByteus runtime, local model `qwen/qwen3.6-35b-a3b`; ask it to call the tool; tool result equals a GraphQL read's shape | Real local-tool path; no paid tokens |
| API-12 | ASM-001, SCN-A3 | test-owned Docker container from the node image, this worktree's `dist` | Temporary Probe | container on `127.0.0.1`, no user volumes; GraphQL read with signed-out CLIs; optionally one CLI credential streamed in for a signed-in read | Docker parity |

| API-03b | AC-008 (reason), DS-003 | strategy + deadline | Temporary Probe (added during execution) | 400 Antigravity limit reads against a hanging `agy /usage` with short deadlines | API-03 run 1 reported "could not be read" for a timed-out step; measure and find the cause |
| API-05b | RSK-002, SCN-A2 | same as API-01 | Temporary Probe (added during execution) | two reads at once ×10, single reads ×5 | API-05 showed Codex unknown in 3 of 4 concurrent reads; measure the realistic two-reader case |
| API-08b | REQ-002, AC-001 | live node | Temporary Probe (added during execution) | read before and after `ensureProviderModelCatalog(LMSTUDIO)` with LM Studio serving models | LM Studio absent from the first live read |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-01…05 | `autobyteus-server-ts/tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts` | The server contract over real HTTP/MCP with real child processes has no coverage |
| API-07 | `autobyteus-web/tests/e2e/model-routing-settings-probe.mjs`, `autobyteus-web/tests/e2e/fixtures/model-routing-provider-usage.mjs`, `package.json` script `test:e2e:model-routing-settings` | Page states on the real stack |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-01…05, API-07 | `autobyteus-server-ts/tests/fixtures/agent-runtimes-fake-cli.mjs` | answer Codex `account/rateLimits/read` (and record `thread/start` config), Claude `get_usage` (record every stdin frame type), `agy -p /usage --output-format json`, Grok `agent --help` + ACP stdio (`initialize` with models, `_x.ai/billing`); state knobs for slow/failing steps; hung pids recorded | Additive; existing answers unchanged |
| API-01…05 | `autobyteus-server-ts/tests/e2e/helpers/agent-runtimes-e2e-harness.ts` | none planned beyond reuse | — |

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan (When Applicable)

- Desktop framework / shell: Electron; this change touches no shell, preload, IPC or lifecycle code.
- Web-equivalent behavior: the whole page (renderer + GraphQL); proven by the real-stack browser probe.
- Shell-specific behavior: none changed. The embedded server reads the same report; its CLI sign-ins come from the user's HOME as on any node.
- Chosen approach: browser probe (web-equivalent) + server E2E; an isolated desktop instance would add no changed-boundary evidence.
- How the run avoids disturbing the running desktop app: never touches `/Applications/AutoByteus.app` processes, `~/.autobyteus`, or the user's node containers; own ports and data roots.

## Live Environment And Fixture Plan (When Broader Validation Is Likely)

- Startup order: build server → (probe) node(s) + Nuxt + Chrome; (live) built node with real HOME + test vault; (Docker) container.
- Environment choices: scrubbed env (`ENABLE_*`, `AUTOBYTEUS_*`, runtime overrides removed); live: `HOME`, `USER`, `LOGNAME` real; `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault`.
- Health: `/rest/health`.
- Identities: host CLI logins (read only); test-vault provider keys.
- Evidence: GraphQL JSON (secret-scanned), timings, process lists, screenshots, DOM facts, probe result.json, server logs.
- Owned processes and state to clean: probe stacks, live node, Docker container, temp roots.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| The user's own Docker nodes (`autobyteus-server-0..2`) with their sign-ins | TESTING.md forbids testing against the user's node containers and volumes; a test-owned container stands in | Low | Yes (their nodes' own data) | Delivery: ask the user to open Model Routing on a node window |
| Grok `creditUsagePercent` meaning when present (UNK-001) | absent in today's live answer | Low | Yes (AC-006 says user verification) | — |
| Isolated desktop instance | no shell change | Low | No | — |

## Round 2 Rerun Plan (by impact)

- Changed since round 1 (`git diff --name-only 8de58e3ab3 5a87647318 -- . ':!tickets'`): the service (moved to `src/available-agent-runtimes/`), its report and matching, every strategy, `read-deadline.ts`, `runtime-command-runner.ts`, Antigravity/Grok capability, ACP handshake, Claude client, provider readers, GraphQL/tool contract, composition, one web row and type, and two expectations in my tests.
- Rerun (they exercise changed code): API-01…05, API-06, API-07, API-07b, API-08/08b/09/10/11, API-12; API-03b and API-05b first (round-1 failures).
- New behavior: AC-013 (single-flight) → AAR-04 made strict (API-05); SR-006 discovered providers → new AAR-06 (API-13) and MRP-02 extension; SR-007 wording → covered by AAR-03/06 and MRP-02.
- Reused: IMP-15, IMP-16, IMP-18, IMP-14, IMP-04 (API-00), still valid by their diffs (execution report).

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-13 | AC-007 (SR-006), REQ-002, REQ-007 | real studio server; LM Studio and a custom endpoint scripted over HTTP | Durable | AAR-06 in the server E2E file | discovered providers are read afresh on every read |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| F-1 timed-out step reported "could not be read" (wall-clock `timeLeft === 0` check) | `Local Fix` | `evidence/api-e2e/API-03b-timeout-reason-probe.log` | Implementation engineer (via failure-origin review) |
| F-2 local provider with models not listed until its catalog is loaded | `Design Impact` | `evidence/api-e2e/API-08b-live-lmstudio-probe.json.log` | Solution Designer |
| F-3 concurrent reads degrade Codex to unknown (shared home-folder lease close) | `Design Impact` | `evidence/api-e2e/API-05b-two-readers-probe.log`, API-01-05 logs | Solution Designer |
| Round 2: F-1, F-2, F-3 resolved (API-03b, API-08b, API-05/09) | — | `evidence/api-e2e/*r2*` | — |
| Agent Runtimes settings probe failing identically on base | Out of scope (pre-existing) | `evidence/api-e2e/API-07b-agent-runtimes-probe-vs-base.log` | FU-002 |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added and updated; none removed)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: live probes read the user's real accounts with 0 tokens; agy `/usage` may add an entry to the host agy history.
