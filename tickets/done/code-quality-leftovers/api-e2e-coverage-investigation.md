# API/E2E Coverage Investigation — code-quality-leftovers (autobyteus-357)

## Investigation Meta

- Requirements Doc: `…/requirements-doc.md` (SR-002, Approved)
- Investigation Notes: `…/investigation-notes.md`
- Solution Revision Record: `…/solution-revision-record.md`
- Design Spec: `…/design-spec.md` (SR-002; Large / High)
- Supplemental Task Artifacts: `merged-task-texts.md`, `follow-ups.md` (FU-001…FU-003), root `DESIGN.md` rule 11
- Design Review Report: `…/design-review-report.md` (ARCH-REV-002 Pass)
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Implementation Handoff: `…/implementation-handoff.md` (IR-002)
- Implementation Revision Record: `…/implementation-revision-record.md`
- Code Review Report / Revision Record: `…/code-review-report.md`, `…/code-review-revision-record.md` (CRR-002 Pass)
- API/E2E Revision Record: `…/api-e2e-revision-record.md` (created with the first result)
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: CRR-002 pass; HEAD `0d2aa6f593`, code last changed in `534ad1f55e`
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this round

(`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/code-quality-leftovers/tickets/in-progress/code-quality-leftovers`.)

## Current Requirement And Design Basis

Ten no-behavior-change cleanups; product behavior, stored data and APIs are preserved except GraphQL `ModelSourceStatus.modelKind`.
- 54.1/54.2: `BaseLLM.releaseConversation` and the `logicalConversationId` label are removed. Test doubles recognise summary requests by their prompt (`CompactionAttempts`).
- 54.3/54.4: the source `modelKind` is removed; the web provider section reads the provider's single source.
- 125.x: dead code removed.
- 147: `ProjectTaskService` is split; REST context drafts go through `ProjectTaskContextDrafts`.
- 157: write outcomes are renamed.
- 159: streaming docs updated.
- 178: the test-only drain is removed.

What must be proven at real boundaries:
- REQ-002: Settings sources and statuses unchanged (AC-002), compaction unchanged.
- AC-004: server E2E for projects green.
- AC-006: the readers of the label pass; live e2e where allowed.
- The REST context-file journey through the new owner (147).
- DONE closure on real roots (178).
- Run persistence through the renamed outcomes (157).

## Supported Scenarios And Real Usage

- Designer scenarios: none beyond AC-002/004/006 (cleanup ticket).
- Real-use scenarios added:
  - RU-01: Settings → providers with a real LM Studio host. READY, unavailable (ERROR), and PARTIAL (one of two configured hosts down).
  - RU-02: create a Task with uploaded context files in the Projects page, then read it back (REST drafts → Task).
  - RU-03: a native agent run on a real local model (LM Studio), which takes the agent loop's LLM request path that 54.1/54.2 changed.
  - RU-04: closure of delegated work, persistence of runs, Team and Org roots through the scripted runtime (178, 157).
- Contrived scenarios: none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| LLM request path (54.1/54.2) | Preserved (code removed) | handoff trace | Real local model run (RU-03); compaction suites reused |
| GraphQL `ModelSourceStatus.modelKind` | Removed | DESIGN rule 9 | Settings in a browser with a real host (RU-01); GraphQL E2E |
| Provider section single-source states (IR-002) | Preserved | CR-001 | Browser READY / ERROR / PARTIAL / STALE |
| Task context drafts (147) | Preserved (new owner) | DS-001 | Browser upload journey (RU-02); gated projects E2E |
| DONE closure release (178) | Preserved | DEC-001 | Gated projects E2E (all roots) |
| Write outcomes (157) | Preserved (renamed) | — | Run-history, Team, Org and Agent E2E folders |
| Docs (159), dead code (125.x) | Removed / updated | IMP-02 | Reused searches |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | projects services, persistence results, LLM loop | IMP-04/05/06 | Real roots and a real model | Gated server E2E; LM Studio integration |
| API / transport / contract | Yes | GraphQL source status, REST context drafts | IMP-10 | The full gated E2E set | Gated server E2E |
| Frontend component / state | Yes | provider section, store | IMP-08, IMP-16 | A real host, PARTIAL | Browser on a real stack |
| Browser integration / user journey | Yes | Settings providers, Projects task upload | IMP-11/17 (fake endpoint) | Real LM Studio; PARTIAL; upload journey | Browser |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | same renderer | as above | — | Browser |
| Desktop shell / Electron-specific | No | — | — | — | — |
| Process / lifecycle | Yes | release at DONE, shutdown (178) | IMP-14 | Remaining gated suites | Gated server E2E |
| Persisted-data transition | No (`Not Affected`) | names in-process only | IMP-06 | — | — |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | Yes | real model providers | IMP-04 (unit) | Real provider request | LM Studio (local, no credits) |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/code-quality-leftovers`, branch `codex/code-quality-leftovers` (base `efd28d5c4a`; 11 commits behind `origin/personal`, which delivery re-integrates).
- Testing guideline: `TESTING.md`. It settles:
  - local model servers: one run at a time, small model `qwen/qwen3.6-35b-a3b`, unload what the run loaded;
  - the compaction section: "A live compaction run against a real model is not required proof for a ticket and not a gate … Run one only when the user asks for it". Prove compaction with the deterministic layers.
- Conflict noted: AC-006 asks for the live-e2e harness "where credentials allow". Its changed check (lines 926–930) is the compaction-summary check of a live compaction scenario, which TESTING.md says to run only when the user asks. This follows TESTING.md for the project-specific choice: AC-006's "else typecheck plus the scripted suites" path, plus a real local-model run of the changed request path (RU-03).
- Secrets: none needed. LM Studio is local (port 1234, running, lists models); Ollama is not running on this machine.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | strategy | gates; `env -i`; local-model rules; compaction rule; one heavy run at a time |
| `autobyteus-server-ts/tests/integration/agent-execution/autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts` | LM Studio native run | `RUN_LMSTUDIO_E2E=1`, `LMSTUDIO_TARGET_TEXT_MODEL` |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` | Projects page probe | `pnpm -C autobyteus-web test:e2e:projects`; owned stack; uploads to `/rest/projects/*/task-context-drafts/*/context-files` |
| `evidence/implementation/settings-sources-check.mjs` | IMP-11 Settings driver | owned stack, fake endpoint; extended here for a real LM Studio host |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | `autobyteus-server-ts` | `pnpm prebuild && pnpm build` | — | smoke line | — |
| Gated server E2E | `autobyteus-server-ts` | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs> vitest run <folders>` | in-process | — | suites |
| LM Studio | user's local app | already running | shared compute | `/v1/models` | unload JIT-loaded models |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Projects, Tasks, files, providers | probes' own stacks, public APIs | test-owned data roots | removed by the probes |

## Persisted Data Transition Coverage Basis

`Not Affected`. The renamed outcomes are in-process (IMP-06; migration suites reused). The gated E2E folders write and read real run records through them.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| Gated `tests/e2e/projects/**` (22 not run by IMP-14) | Closure, reactivation, delegation, context files, copies | AC-004, 147, 178 | Still Valid | the tracker edits keep the assertions | Run |
| `tests/e2e/run-history`, `agent-team-runs`, `agent-org-runs`, `agent` | Persistence and roots | 157 | Still Valid | — | Run (gated where gated) |
| `tests/e2e/llm-management`, `secret-management` (GraphQL sources) | Source statuses | 54.3 | Still Valid (`modelKind` selections removed by IR-001) | — | Run after a build |
| `projects-feature-probe.mjs` | Projects page incl. context-file upload | 147 | Still Valid | — | Run |
| `lmstudio` server integration | Native run on LM Studio | 54.1/54.2 | Still Valid | — | Run once (gated) |
| Live-e2e harness real compaction | Compaction summary metadata | AC-006 | Still Valid (typechecked, IMP-05) | TESTING.md compaction rule | Not run (see Not Tested) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | REQ-001, 005, AC-001/003/005/006 | typechecks, unit suites, searches, line counts, compaction readers, codegen | Reused | IMP-01…IMP-09, IMP-12, IMP-13, IMP-15, IMP-16 | `git diff --name-only 534ad1f55e HEAD` outside `tickets/` is empty; IR-002's effect is covered by IMP-16 |
| API-R02 | AC-002 (fake endpoint), AC-004 (partial) | Settings browser, server E2E subset, scripted subset | Reused | IMP-10, IMP-11, IMP-14, IMP-17 | Same code |
| API-01 | AC-004; 147, 178, 157, 54.3 | Gated server E2E folders | Existing Test | build, then `env -i … RUN_AGY_FAILURE_E2E=1 … vitest run tests/e2e/projects tests/e2e/run-history tests/e2e/agent-team-runs tests/e2e/agent-org-runs tests/e2e/agent tests/e2e/llm-management tests/e2e/secret-management` | The 22 gated projects suites and the persistence and source suites |
| API-02 | 147 (RU-02) | Browser Projects page, REST drafts | Existing Test | `pnpm -C autobyteus-web test:e2e:projects --output-dir=<ev>` | Task created with uploaded files, read back |
| API-03 | AC-002, REQ-002 (RU-01) | Browser Settings with a real LM Studio host | Temporary Probe | `settings-sources-check.mjs` extended: LM Studio READY on the real host, ERROR on a closed port, PARTIAL with one host up and one down | Real host and PARTIAL; ticket-owned driver like IMP-11 (no durable Settings probe harness exists for a real host) |
| API-04 | AC-006 (request path), REQ-006 | Native run on a real local model | Existing Test | `env -i … RUN_LMSTUDIO_E2E=1 LMSTUDIO_TARGET_TEXT_MODEL=qwen/qwen3.6-35b-a3b vitest run tests/integration/agent-execution/autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts` | Real provider request without `releaseConversation` and the label |

- Test progress log needed: Yes.

## Durable Coverage To Add / Update / Remove

None. The existing suites already follow the change (IR-001/IR-002 edits reviewed by CRR-002).

## Live Environment And Fixture Plan

- Order: server build → API-01 (long) → API-02 → API-03 → API-04. One heavy run at a time; one local-model run at a time.
- LM Studio: record which models are loaded before API-04, and unload any model it loaded.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Live-e2e harness real compaction scenario (lines 926–930) | TESTING.md: a live compaction run is not required proof and is run only when the user asks. AC-006's own fallback is "typecheck plus the scripted suites" (IMP-05: harness suites, recovery fixture, native-input-history, compaction tests) | Low: the check's logic is exercised only live | No (the user can ask for it) | None |
| Ollama in Settings | Not running on this machine; LM Studio uses the same discovery source code path (`OLLAMA_HOSTS` / `LMSTUDIO_HOSTS` are the same lifecycle) | Low | No | None |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required: `No`
