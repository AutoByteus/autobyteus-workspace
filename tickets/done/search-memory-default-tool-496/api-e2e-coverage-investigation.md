# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `tickets/in-progress/search-memory-default-tool-496/requirements-doc.md` (SR-004, approved by the user)
- Investigation Notes: `tickets/in-progress/search-memory-default-tool-496/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/search-memory-default-tool-496/solution-revision-record.md`
- Design Spec (required on every route): `tickets/in-progress/search-memory-default-tool-496/design-spec.md` (SR-004)
- Supplemental Task Artifacts: `follow-ups.md` (FU-001 to FU-005)
- Design Review Report: `N/A — not applicable` (SR-004 took the direct route; the file in the folder reviews the withdrawn SR-003)
- Architecture Review Revision Record: `N/A — not applicable` (same reason)
- Implementation Handoff: `tickets/in-progress/search-memory-default-tool-496/implementation-handoff.md`
- Implementation Revision Record: `tickets/in-progress/search-memory-default-tool-496/implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — direct low-risk route` (Small + Low)
- Code Review Revision Record: `N/A — direct low-risk route`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record (created after the first completed result): `tickets/in-progress/search-memory-default-tool-496/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation IR-001 handed to direct API/E2E validation (code under test `5cdd6faf81`; branch head `d163e606da` adds only docs and evidence)
- Prior Investigation Reviewed: none (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- REQ-001 / AC-001 / AC-004: every agent run on every runtime has `search_memory` without a package change; a definition that also lists it gets it once. One shared rule (`buildRuntimeAgentToolExposure`, `PLATFORM_GIVEN_TOOL_NAMES`) adds it; native creates it from the registry, MCP runtimes enable the existing adapter in the run's Agent Tools MCP session.
- REQ-002 / AC-002: the tool's search, result and description are unchanged (node-wide, minus the asking run).
- REQ-003 / AC-003: a restored run whose seen-tool-names record lacks the tool gets it with one "Now available: search_memory." notice; system prompts unchanged.
- Persisted data: `Not Affected` (the seen record is rewritten by its existing writer).
- Legacy / compatibility check in the handoff: clean (no wrappers, no retained legacy path). Persisted-data check: clean.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (native agent calls `search_memory`), SCN-002 (Claude/Codex/AGY/Grok/DeepSeek through the Agent Tools MCP endpoint), SCN-006 (restore after the upgrade).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-A1: an agent searches for work another run did earlier on the node (the reason the tool exists). Trigger: a user message asking the agent to look up earlier work; the earlier run is a real run of the same runtime whose journal the user indexed through the Memory page action (`startMemoryIndexing`).
  - SCN-A2: the asking run's own journal holds the same words once it is indexed; the tool still leaves the asking run out (preserved behavior under REQ-002, now reachable by every agent). Trigger: a second search in the same run after its first turn is indexed.
  - SCN-A3: a package agent that already lists `search_memory` (5 package configs do) sees the tool once in its real tool list. Trigger: run start of such a definition.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001: run exposure gains `search_memory` on every runtime | Added | handoff trace; `runtime-agent-tool-exposure.ts` diff (+8 lines) | Prove the tool reaches a real model's tool list and executes on native and on MCP runtimes |
| BEH-001: tool behavior / result / description | Preserved | REQ-002, QR-001 | Memory tool unit tests (reused) + the live call returning the earlier run, asking run left out |
| BEH-006: restore with an older seen record gives one notice | Changed (new name reaches the existing path) | REQ-003, IN-003 | Integration case (reused) + a real-server restore journey |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Shared exposure rule | Unit tests (IMP-02), full unit suite (IMP-01) | None for the rule itself | — |
| API / transport / contract | Yes | Agent Tools MCP `tools/list` / `tools/call` per run session; native provider tool list | MCP session service unit test with production adapters; MCP route integration files (IMP-05) | A real runtime CLI reading the run's MCP config and a real model choosing and calling the tool | Gated live runtime suite on the real Studio server |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No | — | — | The existing "Tools updated" card renders the notice unchanged | — |
| Authentication / session / permissions | No | The MCP session token path is unchanged | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | Run restore (seen-names notice) | Integration case (IMP-05) | Restore through the real server and a real runtime process | Real-server restore journey (scripted AGY, no model) |
| Persisted-data transition | No (`Not Affected`) | Seen-tool-names record rewritten by its writer | Integration case | — | Covered by the restore journey |
| Worker / queue / distributed coordination | No | Memory indexing passes are unchanged | — | — | — |
| External integration | Yes | Real providers / CLIs consuming the tool list | None in repository runs | Real model's view of the tool | Gated live suite with the test vault and signed-in CLIs |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-memory-default-tool-496` (branch `codex/search-memory-default-tool-496`)
- Project type and runtime stack: pnpm monorepo; Node 22 server (`autobyteus-server-ts`, Fastify + GraphQL + WebSocket), runtime backends for native AutoByteus, Claude Agent SDK, Codex app server, Antigravity CLI, Grok Build, DeepSeek Harness.
- Project testing guideline path(s): `TESTING.md` (root); `autobyteus-server-ts/AGENTS.md` (testing commands). No closer `TESTING*.md`.
- Conflicting, missing, or unclear project instructions: none.
- Changed build-input paths: `None` (`git diff --name-only a781007713...HEAD` touches server `src`, server tests, server docs and the ticket folder only); no fresh-start build case.
- Required environment variables or secrets available: `Yes` — test vault READY (`provider.deepseek.api-key`, `provider.anthropic.api-key` configured); `claude`, `codex`, `agy`, `grok` CLIs installed; `dsh` not installed.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing strategy | Gated runtime suites for real providers; test vault via `AUTOBYTEUS_TEST_VAULT`; signed-in CLIs need real `HOME`/`USER`/`LOGNAME`; clean env (`env -i`); scripted AGY CLI for model-free runtime runs; live Codex model `gpt-6.1-terra`, effort `medium`; one heavy run at a time; rerun by impact; both typechecks |
| `autobyteus-server-ts/AGENTS.md` | Server test commands | `pnpm -C autobyteus-server-ts exec vitest run <file> --no-watch` |
| `tests/e2e/runtime/live-tool-list-updates.e2e.test.ts`, `mcp-runtime-tool-matrix.e2e.test.ts`, `work-journal-live-runtimes.e2e.test.ts` | Existing patterns | Studio server per test data root (`startStudioE2eRuntimeServer`), GraphQL definitions/runs, agent WebSocket input, `getRunProjection` conversation, `initializeLiveServerVault` / `requireLiveCapability`; scripted AGY `LIST_TOOLS` / `CALL_TOOL:` (case `linked_skills`) |
| `tests/helpers/fake-embedding-model.ts`, `docs/modules/memory_search.md` | Memory index | A full index pass on a fresh data root would download the embedding model (~55 MB); the deterministic stand-in index is used instead, text search is real |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process Studio server | worktree root | started by the suite (`startStudioE2eRuntimeServer`) on a temp data root | One per suite run | GraphQL answers | `app.close()`; temp root removed |
| Scripted AGY CLI | — | `ANTIGRAVITY_CLI_COMMAND=<abs>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`, `AGY_FAKE_CASE=linked_skills` | No model, throwaway `HOME` | `--version` | process ends with the run |
| `claude`, `codex`, `grok` CLIs | — | host sign-in (real `HOME`, `USER`, `LOGNAME`) | Paid inference, one short search turn per step, cheapest models | `--version` | runs terminated by the suite |
| Native AutoByteus provider | — | test vault (`AUTOBYTEUS_TEST_VAULT`) DeepSeek key | Paid inference (`deepseek-v4-flash`) | `requireLiveCapability` | — |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| An earlier run with known work | A real run of the same runtime on the test data root, told a unique codeword | Test-owned data root only; never `~/.autobyteus` | Temp root removed after the suite |
| A built memory index | GraphQL `startMemoryIndexing` (the Memory page's Index now), with the deterministic embedding stand-in installed as the process `MemorySearch` | Nothing downloaded | Removed with the temp root |
| A run created before this build (upgrade journey) | A run of this build whose `seen_tool_names.json` is rewritten, after terminate, to the record the previous build wrote for it (same `{version: 1, toolNames}` structure, without `search_memory`) | Synthesized small data, test-owned run (TESTING.md "Migrations and upgrades are tested on small synthesized data") | Removed with the temp root |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-execution/shared/runtime-agent-tool-exposure.test.ts` and the 10 other updated unit files | Exposure rule; native instance; MCP `tools/list`; exact names | AC-001 | Still Valid | IMP-02 at `5cdd6faf81` | Reuse |
| `tests/unit/agent-tools/memory/search-memory-tool.test.ts`, `tests/unit/memory-search/**` | Tool result and search unchanged | AC-002 | Still Valid | IMP-01 at `8a0858709f`; files changed since then touch none of the code they exercise | Reuse |
| `tests/integration/tool-list-updates/tool-list-update-service.integration.test.ts` (new case) | Restore notice once, record rewritten | AC-003 | Still Valid | IMP-05 at `5cdd6faf81` | Reuse |
| `tests/e2e/runtime/live-tool-list-updates.e2e.test.ts` | Tool list update on a live runtime | REQ-003 (existing path) | Still Valid | A new run's seen record is created with the full exposure, so no extra notice appears; assertions use `toContain` | Not rerun (path unchanged; gated paid) |
| `tests/e2e/runtime/mcp-runtime-tool-matrix.e2e.test.ts`, `work-journal-live-runtimes.e2e.test.ts` | Other tools per runtime | Out of scope | Out Of Scope | Do not assert exact tool lists | None |
| `tests/e2e/memory/*` | Memory search GraphQL / pipeline | Preserved Memory page search | Still Valid | No source change in `src/memory-search` | None |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001 | Exposure rule, native resolver, MCP session `tools/list` (unit) | Reused | IMP-02 | Ran on `5cdd6faf81`, the code under test |
| API-02 | AC-001, AC-003 | MCP routes / sessions, tool-list update restore (integration) | Reused | IMP-05 | Ran on `5cdd6faf81` |
| API-03 | AC-002 | Memory tool and search (unit), full server unit suite | Reused | IMP-01 (+ IMP-02 for the files that failed there) | Since `8a0858709f` only test files changed (`git diff --name-only 8a0858709f 5cdd6faf81`); none of the memory code |
| API-04 | — | Server and web typecheck | Reused for source; rerun after the new test file | IMP-03/IMP-04, then rerun `pnpm -C autobyteus-server-ts typecheck` and `pnpm -C autobyteus-web typecheck` | The new e2e file is type-checked by the server typecheck |
| API-05 | AC-001, AC-004 (AGY), AC-003 extra | Real Studio server + scripted AGY CLI → run's Agent Tools MCP `tools/list` / `tools/call` | Durable | `SEARCH_MEMORY_LIVE_E2E=agy ANTIGRAVITY_CLI_COMMAND=<abs fixture> … vitest run tests/e2e/runtime/search-memory-default-tool-live.e2e.test.ts` | Model-free proof of the MCP path on a real runtime process: tools/list without listing (once), with listing (once), call returns the earlier run, asking run left out |
| API-06 | AC-003 | Real server restore journey (scripted AGY) | Durable | same file, case "upgrade restore" | Real restore through GraphQL and the runtime: first input carries the notice once, second none, record rewritten, tool callable |
| API-07 | AC-004 (native) | Real native AutoByteus run with a real model (DeepSeek flash, test vault) | Durable (gated, paid) | `SEARCH_MEMORY_LIVE_E2E=autobyteus AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault …` | AC-004 requires a real native run |
| API-08 | AC-004 (Claude) | Real Claude Agent SDK run (haiku) | Durable (gated, paid) | `SEARCH_MEMORY_LIVE_E2E=claude` with host login | AC-004 requires a real Claude or Codex run |
| API-09 | AC-001 (Codex) | Real Codex run (`gpt-6.1-terra`) | Durable (gated, paid) | `SEARCH_MEMORY_LIVE_E2E=codex` | Codex reaches the tool through its own `enabled_tools` config; a different consumer than Claude |
| API-10 | AC-001 (Grok, ACP backend) | Real Grok Build run | Durable (gated, paid) | `SEARCH_MEMORY_LIVE_E2E=grok` | ACP backend consumer (shared by Grok and DeepSeek Harness) |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-05, API-06, API-07, API-08, API-09, API-10 | `autobyteus-server-ts/tests/e2e/runtime/search-memory-default-tool-live.e2e.test.ts` | No test drives a real runtime with a definition that does not list `search_memory`; the scripted-AGY cases cost nothing and guard the MCP path and the upgrade notice on every later change to the exposure rule; the paid cases stay gated |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Live Environment And Fixture Plan

- Startup order and commands: the suite sets a temp data root, initializes the live vault, starts the Studio server in process, installs a `MemorySearch` over the server's app data and memory folders with the deterministic embedding stand-in.
- Environment choices that materially affect the run: `env -i` with `PATH`, `TMPDIR`; real `HOME`/`USER`/`LOGNAME` for signed-in CLIs; a throwaway `HOME` for the scripted AGY run; Node 22.
- Health / readiness checks: GraphQL answers; agent WebSocket `CONNECTED`; `memoryIndexStatus.state == READY`.
- Seed data / fixtures: per runtime, one earlier run told a unique codeword; the index built through `startMemoryIndexing`.
- Requirement-linked journeys: earlier run → index → asking run (new run of a definition with `toolNames: []`) calls `search_memory` → result names the earlier run → its own turn indexed → second search leaves it out.
- Evidence to capture: `SEARCH_MEMORY_E2E_EVIDENCE_DIR` writes per-runtime JSON (definition tool names, tool lists, tool call entries and results, notices); console log of each run.
- Owned processes and temporary state to clean up: runs terminated, server closed, temp root removed.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| DeepSeek Harness live run | `dsh` is not installed on this machine | Low: same ACP backend and `resolveRuntimeAgentToolExposure` path as Grok; MCP session path proven by AGY | No | None |
| Real meaning (embedding) search in the live journey | Downloading the model is not needed to prove the exposure; search code unchanged | None for this ticket | No | None |
| A run actually created by the previous build binary | Synthesized seen record of the released structure is used (TESTING.md rule) | Low | No | None |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added: one gated live suite)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: paid cases use one short search turn per step with the cheapest models.
