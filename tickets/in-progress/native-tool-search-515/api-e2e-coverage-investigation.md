# API/E2E Coverage Investigation — autobyteus-515: tool search on the AutoByteus native runtime

The plan. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001…SR-004)
- Design Spec (required on every route): `design-spec.md` (SR-004, Ready)
- Supplemental Task Artifacts: `evidence/probe-search-then-call.mjs` (+ output), `evidence/measure-request-tokens.mjs` (+ output), `evidence/evaluate-tool-search.mjs`; `follow-ups.md` (FU-001…FU-004)
- Design Review Report: `design-review-report.md` (round 2, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md` (ARCH-REV-002)
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass 9.5/10, no findings)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review CRR-001 pass from `/code_reviewer`, 2026-11-17
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this file, round 1

## Current Requirement And Design Basis

On the native runtime (server native backend opts in with `listedToolNames = AUTOBYTEUS_DEFAULT_TOOL_NAMES`), every request carries the four base tools plus `search_tools` and `call_tool`; every other tool is searchable (REQ-001/002, AC-001). `search_tools` returns full definitions; no match lists the searchable names (REQ-003, AC-002). A `call_tool` call of exactly `{name, arguments}` becomes the real tool's invocation at stream end, so validation, approval, events, the card, history and the result name the real tool; unknown tools are refused; malformed calls are answered (REQ-004, AC-003; DS-002). Memory records raw traces with the real tool + `called_through` and keeps the model's `call_tool` form only in the working context, on registration, `ingestToolResults` (incl. finalize) and repair (DS-003). Request `tools` and system prompt stay byte-identical across a run, through searches, found-tool calls, 324 tool adds/removes and compaction (REQ-006/007, AC-005/006/007). It must work on every native provider without a provider-specific path (REQ-005, AC-004). Old against new on PM and Daily Assistant on DeepSeek V4 Flash: first request ≥ 5,000 fewer prompt tokens, tasks that succeed old succeed new (REQ-008/009, AC-008/009). Persisted data: `Directly Usable — No Migration` (old raw traces without `called_through` mean "called directly"; a restored run takes the new split at its next request, one cache rebuild accepted).

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001, SCN-002, SCN-003, SCN-004, SCN-005; code review's SCN-R (restore with a found tool's call pending approval or running).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - **SCN-A1 Upgrade restore**: a user updates the app and reopens a native run that was created and used before the update (its working context holds direct calls of tools that are now searchable, raw traces without `called_through`). Trigger: run restore after an app update. Requirements "Data Continuity" names it (one cache rebuild, then the new split); the providers must accept a history holding calls of tools no longer declared.
  - **SCN-A2 Approval mode on the real server**: a user runs a native agent with tools not auto-executed; the approval prompt and the tool card over the agent WebSocket name the real tool, and run history shows it (AC-003's user-visible part, through the real server rather than the library).
  - **SCN-A3 Platform-given searchable tool**: every server native run gets `search_memory` (platform tool) as searchable; a user asks to search memory and the model must find it (496's live suite on the native runtime).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): `call_tool` naming `call_tool`/`search_tools` (code review C-06); a library caller with no searchable tool at start getting tools later (C-01, not reachable on the server).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 request tool set (DS-001) | Changed | design DS-001; handoff trace | Unit/integration reused (IMP-02); server request bytes in a new scripted server E2E; live on every provider; token saving in the evaluation |
| BEH-002 search + call → real invocation (DS-002, DS-004) | Added | design DS-002/DS-004 | Unit/integration reused; real server WebSocket approval + card + history in the new server E2E; live suite per provider |
| DS-003 memory records (raw real, working context model form) | Changed | design DS-003; code review Basis | Unit tests reused (with mutation check IMP-15); server run history projection in the new server E2E; upgrade-restore probe for old data |
| BEH-003 324 add/remove keeps `tools` | Changed | design DS-001 | Integration reused; server definition edit in the new server E2E (bytes); live 324 suite on native DeepSeek |
| BEH-004 external runtimes | Preserved | requirements | Whole server unit/integration/E2E suites (no external-runtime code changed) |
| BEH-005 compaction | Preserved | design | Integration AC-007 reused; K-2 compaction live suite (CCR) |
| OpenAI normalizer K-1 (open objects without `properties`) | Changed | handoff K-1, code review C-02 | Formatter unit test reused; live suite on all OpenAI-format providers |
| Raw trace `called_through` (persisted) | Added | design Persisted Data | Unit (old trace without key) reused; upgrade-restore probe with traces written by the base build |
| K-2 Anthropic live cases (APC-E2E-004, CCR-E2E-002) | Changed tests | handoff K-2 | Run the gated suites |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `autobyteus-ts` agent loop, tool search, memory | IMP-02 (245 tests), full suite | full-suite `run_bash` failures (FU-003) unexplained | full suite on branch and base |
| API / transport / contract | Yes | provider request `tools` to every native provider; agent WebSocket approval/segment events | IMP-13/14 (server, auto-execute) | approval over WebSocket for a found tool; providers other than DeepSeek | new scripted server E2E; live suite |
| Frontend component / state | No | web renames the card from END metadata (unchanged code) | — | — | covered through the WebSocket payload (END `tool_name`) |
| Browser integration / user journey | No | no web change | — | — | none |
| Authentication / session / permissions | No | approval semantics unchanged (ToolPhase) | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | run restore (repair, snapshot), stop/restore | unit (SCN-R) | restore of a run written by the old build | upgrade-restore probe; server restore case |
| Persisted-data transition | Yes | raw `tool_call` `called_through`; working-context snapshot | unit (`fromDict` without key) | real old data written by the base build | upgrade-restore probe |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | real providers (OpenAI, Anthropic, Gemini, DeepSeek, GLM, Grok, Kimi) | IMP-03 DeepSeek only | the other providers; Anthropic cache/thinking (K-2) | gated live suites |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/native-tool-search-515` (branch `codex/native-tool-search-515`, source final at `49867e8dc4`); base build for old-vs-new: `/Users/normy/autobyteus_org/autobyteus-worktrees/native-tool-search-515-base` (detached at `4cbf9e7881`, created for this validation, removed afterwards)
- Project type and runtime stack: pnpm monorepo; TypeScript; `autobyteus-ts` core library (vitest), `autobyteus-server-ts` (Fastify, GraphQL, WebSocket, Prisma/SQLite; vitest), Node 22.23.1, macOS
- Project testing guideline path(s): `TESTING.md` (root; no closer `TESTING*.md` under `autobyteus-ts` or `autobyteus-server-ts`)
- Conflicting, missing, or unclear project instructions: TESTING Rule 9 says a base-branch run narrows a failure but does not give its cause; code review asked for a base comparison for FU-003. Both are done: the base comparison and a cause search
- Changed build-input paths: `None` (diff `4cbf9e7881...49867e8dc4` touches no manifest, lockfile, tsconfig, scripts, workflow, contract package; the only new cross-package import is in a gated `autobyteus-ts` test file, which no release build type-checks). No fresh-start build case
- Required environment variables or secrets available: `Yes` for Anthropic, DeepSeek, GLM, Google (AI Studio, Vertex Express), Grok, Kimi, OpenAI (test vault `STATE READY`); `No` for LM Studio, MiniMax, Mistral, Qwen

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` "Test layers", "Choosing the path" | layers and the row "The tools a run gets" | whole server unit, whole `test:integration`, whole `pnpm test:e2e`, search gated suites for exact tool lists; both typechecks |
| `TESTING.md` "Environments, credentials and data" | Node 22; one heavy run at a time; clean env for E2E/live | `env -i PATH HOME=<resolved temp> TMPDIR …`; `test:integration:prepare` once |
| `TESTING.md` "Test vault" | real keys | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault` + `RUN_LIVE_PROVIDER_TESTS=1` (autobyteus-ts) or the suite's gate |
| `TESTING.md` Rule 9 | failure handling | find the cause of every failure; base run narrows only |
| `autobyteus-server-ts/package.json` | scripts | `test:unit`, `test:integration:prepare`, `test:integration`; root `test:e2e` = `pnpm --filter autobyteus-server-ts test --run tests/e2e` |
| gated suite headers (`native-tool-search-live.test.ts`, `autobyteus-anthropic-prompt-caching-live`, `autobyteus-compaction-cache-reuse-live`, `live-tool-list-updates`, `search-memory-default-tool-live`) | gates and commands | named per case in Planned Cases |
| `evidence/evaluate-tool-search.mjs` header | evaluation | `node evaluate-tool-search.mjs <root> <out> --agents pm,da --reps N`, needs `dist` in `<root>` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Branch builds (`autobyteus-ts`, server `dist`) | worktree | IMP-01 (reused); rebuilt by `pnpm test-vault status` at 17:15 from the same source | — | `dist/` present | untracked outputs, left |
| Base worktree + builds | `…/native-tool-search-515-base` | `git worktree add --detach … 4cbf9e7881`; `pnpm install --frozen-lockfile`; `prebuild`; `autobyteus-ts build`; server `build` | one heavy run | `dist/` present | `git worktree remove --force` at the end |
| In-process studio servers (E2E, live) | `autobyteus-server-ts` | started by each suite on temp data roots | test-owned ports and data | suite readiness | suite teardown |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Provider keys | test vault (read-only) | never printed | — |
| Agent definitions, runs, Projects | GraphQL through the suites on temp data roots | never `~/.autobyteus` | suites remove temp roots |
| Evaluation world | in-memory world of `evaluate-tool-search.mjs`, temp workspaces | nothing outside the process | script removes temp folders |
| Upgrade-restore memory dir | temp folder written by the base build's agent | test-owned | removed after the probe |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check"
- Representative existing-data setup and required behavior: a native run's memory folder (raw traces without `called_through`, working-context snapshot with direct calls of tools that become searchable) written by the **base build's** own agent loop on a real model; restored by the new build with `listedToolNames` set; the next request must carry the new split, be accepted by the provider, and the agent must search and call a searchable tool; later requests keep identical tools
- Evidence planned: API-13 (temporary probe, real old writer → new reader), plus the reused unit `fromDict` case
- Migration-specific completion/recovery scenarios: N/A
- Upstream ambiguity or reroute required: none

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/agent/tool-search/*`, `…/llm-streaming-response-handler-call-tool.test.ts`, `…/memory-manager-call-tool-records.test.ts`, `…/working-context-tool-protocol-repairer.test.ts`, `…/openai-json-schema-formatter.test.ts` | request set, search, conversion, DS-003 records, K-1 | AC-001/002/003, DS-002/003, K-1 | Still Valid | read; IMP-02, IMP-15 | Reuse IMP-02 |
| `autobyteus-ts/tests/integration/agent/native-tool-search-flow.test.ts` | scripted model: request bytes, approval names, add/remove, compaction | AC-003/005/006/007 | Still Valid | read; IMP-02 | Reuse |
| `autobyteus-ts/tests/integration/agent/native-tool-search-live.test.ts` (gated) | live search-then-call per provider, identical tools | AC-004, AC-006 | Still Valid | read | Run on all reachable providers (API-07) |
| hand-built-state tests (8 files), golden snapshot | tool search set on states | — | Still Valid | IMP-02 | Reuse |
| `autobyteus-ts/tests/unit/agent/llm-request-assembler.test.ts` "removes thinking bound to a changed prefix…" | the "tools changed → thinking removed" mechanism K-2 no longer exercises live | K-2 residual | Still Valid | read | Runs in the full suite (API-01) |
| server `tests/unit/.../autobyteus-agent-run-backend-factory.test.ts` | factory passes `listedToolNames` | AC-001 server | Still Valid | IMP-08 | Reuse |
| server `tests/e2e/runtime/autobyteus-anthropic-stored-config-edit-launch.e2e.test.ts` | scripted `delegate_task` through `call_tool` | AC-003 server (auto-execute) | Still Valid | IMP-13 | Reuse; also in whole E2E |
| server `tests/e2e/projects/get-project-task-worker-scope.e2e.test.ts` (gated AGY) | native requests offer `get_project_task` as searchable | AC-001 server | Still Valid | IMP-14 | Reuse |
| server `autobyteus-anthropic-prompt-caching-live` APC-E2E-004 (gated) | default image model change leaves tools unchanged, thinking kept, cache read | REQ-006, K-2 | Still Valid (rewritten, never run) | read | Run (API-09) |
| server `autobyteus-compaction-cache-reuse-live` CCR-E2E-002 (gated) | same, before compaction | REQ-006, BEH-005, K-2 | Still Valid (rewritten, never run) | read | Run (API-10) |
| server `live-tool-list-updates.e2e.test.ts` (gated, runtime-agnostic) | 324 add/remove on a real model; tool_call history names | SCN-003, AC-005, DS-003 history | Needs Update (found in execution): its assertions hold, but it opened no test vault, so it could not run on the native runtime | API-11 run 1 | Updated; run on `autobyteus` + DeepSeek (API-11) |
| server `search-memory-default-tool-live.e2e.test.ts` (gated, runtime-agnostic) | `search_memory` call on a real model | SCN-A3 | Still Valid: on native `search_memory` is searchable | read | Run on `autobyteus` (API-12) |
| server `agent-runtime-graphql.e2e.test.ts` native approval cases (LM Studio gate) | approvals of `run_bash`/`write_file` (listed) | BEH-002 preserved | Out Of Scope (listed tools unchanged; LM Studio key absent) | read | none |
| other gated suites keyed on native tool lists | `background-task-transport(-live)`, shutdown fixtures key on `run_bash` (listed) | — | Still Valid | handoff search; re-grep in API-06 | API-06 |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | — | builds | Reused | IMP-01 | source unchanged since (`8065d773e0..49867e8dc4` touches only tests) |
| API-R02 | AC-001, AC-002, AC-003, AC-005, AC-006, AC-007; DS-001…DS-004 | `autobyteus-ts` unit + scripted integration | Reused | IMP-02 (+ IMP-15 mutation check) | ran on `49867e8dc4`, the final source |
| API-R03 | — | server + web typecheck | Reused | IMP-10, IMP-12 | IMP-10 on `49867e8dc4`; IMP-12 on `8065d773e0` source, and nothing the web typecheck reads changed since |
| API-R04 | AC-001 (server), AC-003 (server, auto-execute) | server E2E | Reused | IMP-13, IMP-14 | ran on `49867e8dc4`; IMP-13 is also in the whole E2E run (API-05) |
| API-R05 | TESTING "tools a run gets" | whole server unit suite | Reused | IMP-08 (8220 passed) | server and `autobyteus-ts` source unchanged since `8065d773e0`; its 3 failures are API-02 |
| API-01 | FU-003; regression | `autobyteus-ts` whole library | Existing Test | `pnpm -C autobyteus-ts test` on the branch, then on the base worktree under the same conditions; cause search of any `run_bash` failure | code review FU-003; TESTING Rule 9 |
| API-02 | Green server suites | server folder-watcher tests | Existing Test | the 2 watcher files of IMP-08/09 alone, branch and base, with load noted; cause | IMP-08/09 failures need a cause |
| API-03 | TESTING "tools a run gets" | whole server `test:integration` | Existing Test | `pnpm -C autobyteus-server-ts test:integration:prepare`, then `test:integration` | handoff "still required" |
| API-04 | AC-001, AC-003, AC-005 (server), SCN-A2, DS-003 history, SCN-A1 (server restore) | real studio server in process: GraphQL, agent WebSocket, run history; scripted Anthropic model | Durable | new `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-tool-search.e2e.test.ts` | no server-level proof of approval/card/history for a found tool, nor of byte-identical tools across a definition edit and a restore |
| API-05 | TESTING "tools a run gets"; BEH-004 | whole server E2E | Existing Test | `pnpm test:e2e` (clean env) | handoff "still required" |
| API-06 | TESTING "tools a run gets" | gated suites | Existing Test (search) | grep gated E2E for `toolInstances`, `enabledTools`, `tools/list`, `requestedToolNames`, request `tools` assertions on native | TESTING row |
| API-07 | AC-004, AC-006, REQ-005, K-1 | real providers through the library agent loop | Existing Test (gated) | `env -i … AUTOBYTEUS_TEST_VAULT=… RUN_LIVE_PROVIDER_TESTS=1 LIVE_TOOL_SEARCH_RECORD=<file> pnpm -C autobyteus-ts exec vitest run tests/integration/agent/native-tool-search-live.test.ts` (8 default models; Gemini in Vertex Express, then AI Studio) | only DeepSeek ran |
| API-08 | AC-008, AC-009, REQ-008/009 | real agents' tool sets on DeepSeek V4 Flash | Existing Test (evaluation script) | `node evidence/evaluate-tool-search.mjs <base root> <out-old> --agents pm,da --reps 2` and the same with this worktree | old against new, all 12 tasks |
| API-09 | REQ-006, K-2 (APC-E2E-004 and the suite) | real studio server, Anthropic Opus 5.5, strict harness | Existing Test (gated) | `env -i … RUN_ANTHROPIC_CACHE_E2E=1 ./node_modules/.bin/vitest run tests/e2e/runtime/autobyteus-anthropic-prompt-caching-live.e2e.test.ts --no-watch` | rewritten, never run |
| API-10 | REQ-006, BEH-005, K-2 (CCR-E2E-002 and the suite) | real studio server, Anthropic + Gemini | Existing Test (gated) | `env -i … RUN_COMPACTION_CACHE_E2E=1 ./node_modules/.bin/vitest run tests/e2e/runtime/autobyteus-compaction-cache-reuse-live.e2e.test.ts --no-watch` | rewritten, never run |
| API-11 | AC-005, SCN-003, DS-003 history | real studio server, native, DeepSeek | Existing Test (gated) | `RUN_LIVE_TOOL_LIST_E2E=1 LIVE_TOOL_LIST_RUNTIME=autobyteus LIVE_TOOL_LIST_MODEL=deepseek-v4-flash` | 324 journey with searchable tools on a real model |
| API-12 | SCN-A3, AC-003 (real server, platform tool) | real studio server, native, DeepSeek | Existing Test (gated) | `SEARCH_MEMORY_LIVE_E2E=autobyteus` | the platform tool every native run has is now searchable |
| API-06b | BEH-002 (direct call of a searchable tool) | gated native background-task transport | Existing Test (gated) | `RUN_NATIVE_BACKGROUND_TASK_E2E=1 … autobyteus-background-task-transport.e2e.test.ts` | added during execution: its scripts call `delegate_task`/`send_message_to` by name, now searchable |
| API-14 | AC-003 (the run's tool card) | web segment handler | Durable | one case in `autobyteus-web/services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts` | added during execution: END keeps already-set arguments over metadata, so the `call_tool` card's arguments needed proof |
| API-13 | SCN-A1; persisted data `Directly Usable`; REQ-006 after restore | old build writes a run, new build restores it; DeepSeek, Gemini, Anthropic Sonnet | Temporary Probe | `evidence/API-13-upgrade-restore-probe.mjs` (base `dist` writes, branch `dist` restores) | needs two builds of the product at once; not a shape a repository test can hold (it would pin a historical build) |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-14 | `autobyteus-web/services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts` (one case) | the web turns the END metadata into the card; no case covered a START name replaced at END with streamed `call_tool` content |
| API-04 | `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-tool-search.e2e.test.ts` | AC-003's verification intent includes server integration with approval; AC-005's includes server integration. Existing server E2E prove only auto-executed `call_tool` (IMP-13) and the request offer (IMP-14). Runs in every `pnpm test:e2e`, no credits |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-11 | `autobyteus-server-ts/tests/e2e/runtime/live-tool-list-updates.e2e.test.ts` | open the test vault (`initializeLiveServerVault`/`closeLiveServerVault`) | found in execution: without it a native run has no provider key; CLI runtimes unaffected |

K-2 rewrites are already in the branch and ran as they are.

## Durable Coverage To Remove

None.

## Live Environment And Fixture Plan

- Startup order and commands: each gated suite starts its own in-process studio server on a temp data root; `env -i PATH="$PATH" HOME="<resolved temp>" TMPDIR="$TMPDIR"` plus the vault and gate.
- Environment choices that materially affect the run: Node 22.23.1; machine load (other processes: a VM and `fseventsd`) recorded per case.
- Health / readiness checks: the suites' own.
- Seed data / fixtures: created by the suites through GraphQL.
- Test identities, authentication, permissions, or session state: launch owner credential from the test setup.
- Requirement-linked journeys: API-04, API-09…API-13.
- Evidence to capture: test output excerpts, suite evidence dirs (request bodies, case results), evaluation JSON, probe JSON.
- Owned processes and temporary state to clean up: base worktree, temp homes and data roots, evidence dirs outside the ticket folder.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-004 on Mistral, Qwen, MiniMax, LM Studio, Ollama | no vault key (LM Studio/Ollama: local model servers not configured for this; requirements U-002) | provider-specific `call_tool` handling unproven there | No (keys missing) | recorded per REQ-005 alternate outcome |
| AC-004 on Kimi | vault key present; account was suspended in RF-004; run anyway, a refusal is a classified skip | — | No | — |
| Desktop/browser UI rendering of the card | no web change; END metadata already renames the card (existing code); proven at the WebSocket payload | low | No | — |

## Ambiguities Or Reroute Triggers

None at planning time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (API-04 added; API-14 case added and API-11 suite updated during execution)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: heavy suites run one at a time (TESTING); machine load is high from other processes (load average 73–93 at 17:15), recorded per case.
