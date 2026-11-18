# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-002, Approved by the user)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts: none
- Design Review Report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass, no findings)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md` (after the first result)
- Current API/E2E Revision ID: `API-REV-001` (on completion)
- Current Investigation Round: 1
- Trigger: CRR-001 Pass (Medium / High route), message from `/code_reviewer`
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file, round 1
- Code validated: branch `codex/retired-memory-items-and-stale-built-ins`, code at `91ee1603a5` (HEAD `53eb3521f1` adds only ticket docs)

## Current Requirement And Design Basis

Part 1 removes the retired compactor's memory item model from `autobyteus-ts` (clean cut: `EpisodicItem`, `SemanticItem`, `MemoryType`, `MemoryItem`, `Retriever`, `MemoryBundle`, their file names, `MemoryStore.list`); the stores' `add` takes `RawTraceItem`; nothing visible changes (REQ-001, REQ-002). Part 2 adds the `STARTUP_ONLY` migration `20261118_remove_retired_built_in_agents`, which deletes `agents/autobyteus-skill-evolver` (with its skill) and `agents/autobyteus-memory-compactor` on every machine, retried at the next start on failure; no run folder is touched, old `episodic.jsonl`/`semantic.jsonl` files and the compactor's old runs stay (REQ-003…REQ-005). Stale tests that kept the Self-Evolver are rewritten (REQ-006). The founder's node is a delivery gate (REQ-007): nothing here runs on his data.

## Supported Scenarios And Real Usage

- Designer behaviors covered: BEH-001…BEH-005 (the requirements have no SCN table; the behaviors and ACs are the basis).
- Real-use scenarios added, each with its real trigger:
  - **S-1 upgrade start**: an install from an older build has both retired folders; the user starts the new version (built `dist/app.js`). Covered by RRB-1/2 (built server) and SIR-002 (desktop-like stack: real Chrome → Nuxt → built backend).
  - **S-2 an agent asks who it can work with**: after S-1, a run's agent calls `list_available_agents` (the `/memory_compactor` address was offered to every agent, INV-16). Real trigger: the agent's own tool call (scripted AGY CLI, `CALL_TOOL`). New durable case RRB-3.
  - **S-3 the user opens the Agents page** after S-1: SIR-002 (browser), extended to the Memory Compactor.
  - **S-4 a removal that fails** (mode-bit block) retries at the next start: unit test and SID-3 (IMP-07/IMP-08).
  - **S-5 native runs keep working**: compaction, restore and the Memory page (the store's `add`/reads changed) through the autobyteus-ts suite, the server suites and the gated LM Studio and live memory flows.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 library item model | Removed | REQ-001, DEC-001 | grep (AC-001); typechecks; autobyteus-ts suite; server and web suites (shared foundation, TESTING.md rerun rule 4) |
| Raw-trace store `add` / reads | Changed | handoff § Store reads and writes | autobyteus-ts unit + integration, gated memory flows (LM Studio, live) whose reads moved to `listTurnRawTracesOrdered()` |
| BEH-002 Memory page | Preserved | REQ-002 | `MemoryInspector.spec.ts` (IMP-05); whole server E2E |
| BEH-003/004 retired folders removed at startup | Added (migration) | REQ-003/004, design § Migration Plan | unit, RRB-1/2, SID, SIR-002, RRB-3 (`list_available_agents`) |
| BEH-005 old item files and compactor runs | Preserved | REQ-005 | RRB-1 byte-identical listing |
| `typecheck-baseline.json` (server) | Changed (shrunk by 1) | handoff Known Risks | fresh-start build (TESTING.md build input) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | memory store, migration | autobyteus-ts and server unit tests | consumers across packages | whole suites |
| API / transport / contract | Yes | public `autobyteus-ts` exports; agent tool `list_available_agents` output | typechecks; GraphQL catalog (RRB) | the tool surface | RRB-3 (real tool call) |
| Frontend component / state | No (assertions only) | — | MemoryInspector spec | — | — |
| Browser integration / user journey | Yes (Agents page shows fewer agents) | — | SIR-002 (Self-Evolver only) | Memory Compactor on the page | SIR-002 extended |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (same as browser) | — | SIR-002 | — | — |
| Desktop shell / Electron-specific integration | No | — | — | packaging of the changed server | fresh-start desktop build |
| Process / lifecycle | Yes | startup migration | RRB, SID | — | built-server starts |
| Persisted-data transition | Yes | `Migration Required` (a removal) | unit, RRB-1/2 | — | RRB, SIR-002 |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Indirect | LLM flows reading raw traces | gated tests | real model output shapes | LM Studio and live runs |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/retired-memory-items-and-stale-built-ins`
- Project type and runtime stack: pnpm monorepo; `autobyteus-ts` (library), `autobyteus-server-ts`, `autobyteus-web` (Nuxt/Electron); Node 22; Vitest
- Project testing guideline path(s): `TESTING.md` at the worktree root (no closer `TESTING*.md`)
- Conflicting, missing, or unclear project instructions: none. Note: no release job runs the server typecheck that reads `autobyteus-server-ts/typecheck-baseline.json` (the desktop job runs the web typecheck and the server build; the Docker job builds the server); the file is still on TESTING.md's build-input list, so the fresh-start proof runs.
- Changed build-input paths: `autobyteus-server-ts/typecheck-baseline.json` → fresh-start case API-11
- Required environment variables or secrets available: test vault with `provider.openai.api-key` (`CONFIGURED`), for the one live test; LM Studio on this machine for the two LM Studio tests

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Rerun by impact, rule 4 | autobyteus-ts is a shared foundation | every server and web layer reruns (unit, integration, whole E2E) |
| `TESTING.md` § Fresh-start build | build input changed | fresh clone, `pnpm install --frozen-lockfile`, then the desktop job's `build:electron:mac` and its verify steps |
| `TESTING.md` § Test vault, Gates, Local model servers | live tests | `AUTOBYTEUS_TEST_VAULT` + `RUN_LIVE_PROVIDER_TESTS=1`; one local-model run at a time, small model |
| `TESTING.md` § Browser probes | SIR-002 | `pnpm -C autobyteus-web test:e2e:skill-improvement-removal --output-dir <fresh dir>` (owns its stack) |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/remove-retired-built-in-agents-startup.e2e.test.ts` header | RRB | needs a current `dist/`; `env -i` |
| `autobyteus-ts/tests/integration/helpers/lmstudio-llm-helper.ts` | LM Studio gate | `LMSTUDIO_HOSTS` or `LMSTUDIO_MODEL_ID` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree | `pnpm -C autobyteus-server-ts build` | before RRB/SID/TAU and SIR-002 | smoke lines | — |
| Built Studio (RRB) | `autobyteus-server-ts` | `dist/app.js --data-dir <temp>` | test-owned root, own DB | `Server listening on 127.0.0.1:0` | test `afterEach` |
| SIR-002 probe stack | `autobyteus-web` | its script | owned Chrome, Nuxt, backend, data root | probe's own | probe cleanup receipt |
| Fresh clone | `<new temp dir>` | `git clone --no-local`, checkout `91ee1603a5` | no build output | — | removed afterwards |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Retired folders, runs, old item files | the RRB fixtures (`skill-improvement-data-fixtures.ts`) in released shapes | test-owned temp root, never real data | removed |
| SIR-002 upgrade data | the probe's fixtures, with the Memory Compactor folder added | probe-owned root | probe cleanup |

## Persisted Data Transition Coverage Basis

- Approved decision: `Migration Required` (removal of the two folders); `Not Affected` for every run file
- References: design-spec § Persisted Data / State Transition Decision, § Migration Plan; handoff § Persisted Data Transition Check
- Representative existing-data setup: both folders installed (the evolver with its skill), the compactor's old runs, a run with old `episodic.jsonl`/`semantic.jsonl`, a Memory Sync import, user agents
- Evidence planned: RRB-1/2 (byte-identical listing, second start nothing), SID (20261020 + 20261118 on one start, failure retry), SIR-002 (desktop-like upgrade)
- Migration-specific scenarios: failure and retry (unit, SID-3), idempotent second start (RRB-1)
- Upstream ambiguity or reroute required: none

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/app-data-migrations/remove-retired-built-in-agents/…migration.test.ts` (new) | both/one/none present, idempotent, failure/retry, symlink, others byte-identical | REQ-003/004 | Still Valid | IMP-08 | Reuse |
| `tests/e2e/app-data-migrations/remove-retired-built-in-agents-startup.e2e.test.ts` (new) | RRB-1/2 through the built start, GraphQL catalog | AC-003/004/005 | Needs Update (add RRB-3: the tool surface of AC-004) | IMP-07 | Add RRB-3, rerun |
| `remove-skill-improvement-data-startup.e2e.test.ts` (SID, updated) | SID-2 expects the Self-Evolver gone | REQ-006 | Still Valid | IMP-07 | Rerun with RRB (same build) |
| `task-agent-own-run-startup.e2e.test.ts` (TAU, `LATER` list) | registry tail | REQ-006 | Still Valid | IMP-07 | Rerun |
| `autobyteus-web/tests/e2e/skill-improvement-removal-cases.mjs` SIR-001/002 (updated) | upgrade removes feature data and the Self-Evolver; Agents page | AC-003/004, REQ-006 | Needs Update (the Memory Compactor is not in its fixture; AC-004's Agents page check covers only the Self-Evolver) | not run yet | Extend, run |
| `autobyteus-web/components/memory/__tests__/MemoryInspector.spec.ts` | two tabs | REQ-002 | Still Valid | IMP-05 | Reuse |
| autobyteus-ts suite (unit + default integration) | memory store, compaction | AC-002 | Still Valid | IMP-03 (only docs changed in autobyteus-ts since `9f9ad727b5`) | Reuse |
| gated LM Studio tests `memory-llm-flow`, `memory-tool-call-flow` and live `openai-read-file-strict-live` (reads changed) | flows over raw traces | AC-002 | Unclear until run (their assertions filter by trace type; not run by implementation) | — | Run (gate decision below) |
| registry-tail pins (20261020, collaborators, own-file) | registry order | REQ-006 | Still Valid | IMP-08 | Reuse |
| whole server unit suite | everything | AC-002 | Still Valid | IMP-06 on `ef0e56caf3` + IMP-08 on HEAD (later commits changed only tests IMP-08 reran) | Reuse |
| server integration, whole server E2E | preserved behavior | AC-002 | Unclear (not run) | — | Run (rule 4) |
| folder-watcher unit files | load-sensitive (FU-003 of autobyteus-493) | — | Still Valid | IMP-06 | Rerun on the quietest host available |

Search for tests made untrue: `git grep` of the removed names over `tests/` and `test-support/` is part of IMP-01 (AC-001) and is rerun as API-01.

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001 | repository grep | Durable (command) | rerun IMP-01's `git grep` on HEAD | cheap; my own direct proof |
| API-02 | AC-002 | typechecks | Reused | IMP-04 | HEAD |
| API-03 | AC-002 | autobyteus-ts suite | Reused | IMP-03 | only docs changed since |
| API-04 | REQ-002 | Memory page spec | Reused | IMP-05 | HEAD |
| API-05 | AC-002, REQ-003…006 | server unit suite | Reused | IMP-06 + IMP-08 | see inventory |
| API-06 | AC-003, AC-004 (GraphQL), AC-005, REQ-006 | built-server startup E2E | Durable | build, then `vitest run` RRB (with RRB-3), SID, TAU files | rerun with the new case |
| API-07 | AC-004 (tool) | `list_available_agents` after an upgrade start | Durable | RRB-3, gated `RUN_AGY_FAILURE_E2E=1` + scripted AGY CLI | the tool surface is untested |
| API-08 | AC-003, AC-004 (Agents page), REQ-006 | desktop-like stack, browser | Durable (probe) | `pnpm -C autobyteus-web test:e2e:skill-improvement-removal --output-dir <fresh>` with the Memory Compactor added | the updated case was not run |
| API-09 | AC-002 | server integration | Existing Test | `test:integration:prepare`, `test:integration` | rule 4 |
| API-10 | AC-002 | whole server E2E | Existing Test | `env -i … pnpm test:e2e` | rule 4 |
| API-11 | build input | fresh-start desktop build | Fresh-start proof | fresh clone → `pnpm install --frozen-lockfile` → desktop job's build and verify steps | TESTING.md |
| API-12 | AC-002, S-5 | gated memory flows | Existing Test (gated) | LM Studio: `LMSTUDIO_HOSTS=… vitest run memory-llm-flow memory-tool-call-flow`; live: `AUTOBYTEUS_TEST_VAULT=… RUN_LIVE_PROVIDER_TESTS=1 vitest run openai-read-file-strict-live` | their reads changed and nothing else runs them; small inputs (one 64×64 image and one short file for the live test) |
| API-13 | AC-002 | folder-watcher unit files | Existing Test | `vitest run` the two files | FU-003 recheck |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-07 | `autobyteus-server-ts/tests/e2e/app-data-migrations/remove-retired-built-in-agents-startup.e2e.test.ts` (RRB-3, gated) | AC-004's tool surface (`/memory_compactor` was offered to every agent) is the reason DEC-005 removes the Memory Compactor |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-08 | `autobyteus-web/tests/e2e/skill-improvement-removal-cases.mjs` SIR-002 | install the Memory Compactor folder in the upgrade fixture; expect it deleted, gone from the definitions and from the Agents page | REQ-004 / AC-004 for the second retired agent |

## Durable Coverage To Remove

None.

## Live Environment And Fixture Plan

- Startup order and commands: build `dist/`; RRB/SID/TAU files (`env -i`, gated for RRB-3); SIR-002 probe; integration; whole E2E; fresh clone and desktop build; gated memory flows. One heavy run at a time.
- Environment choices: Node 22.23.1; shared, loaded host.
- Seed data / fixtures: released shapes, test-owned roots only.
- Evidence: logs, the probe's output dir (screenshots, JSON), the fresh-clone build log.
- Owned processes and temporary state to clean up: built servers, probe stack, fresh clone, temp HOMEs.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| The removal on the founder's node | REQ-007: his approval and a backup first (delivery gate); TESTING.md: never on real data or a copy | low (the migration is proven on released shapes) | Yes | delivery gate |
| Docker image packaging, signing, notarization, other OS builds | need the runner or Docker image builds; the image's steps that read changed inputs (install, server build) run in the fresh-start desktop proof | low | No | release run |

## Ambiguities Or Reroute Triggers

None. Execution found stale tests that fail on the base for causes outside this ticket. Each was fixed as its own baseline-fix commit (TESTING.md Rule 9) or recorded as a follow-up:

| Test | Stale since | Cause | Handling |
| --- | --- | --- | --- |
| SIR-002 (web probe) | 9b013fcc09 (autobyteus-280), autobyteus-493 | sessions named no helper run (20261020 takes helper runs only from improver sessions); `memory/episodic/` (derived) not left out of the byte check | baseline fix `cbdf02f15a` |
| SIR-001 (web probe) | autobyteus-461 admission rule | `send_message_to` between unrelated standalone runs is refused (`TASK_AGENT_RESOURCE_CONFLICT`) | follow-up FU-001 (not this ticket's behavior) |
| LM Studio helper + `memory-llm-flow` | helper never registered LM Studio models (`LLMFactory.reloadModels`) | both LM Studio tests skipped silently on the base; once running, a reasoning model writes a third record | baseline fix `24582b576c` |
| `openai-read-file-strict-live` | 8065d773e0 (autobyteus-515) | the hand-built runtime has no tool search | baseline fix `0a7993c227` |

Execution notes that refined the plan:
- RRB-3 runs the built-in Daily Assistant: `list_available_agents` is opt-in per definition, and its configuration enables it (the user agent of RRB-1 has no tools).
- Server typecheck added as API-02 (rerun: RRB-3 is TypeScript).

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (RRB-3 added; SIR-002 extended)
- Reroute Required Before Validation Execution: `No`
- Notes: —
