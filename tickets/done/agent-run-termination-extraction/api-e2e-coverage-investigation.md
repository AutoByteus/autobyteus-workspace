# API/E2E Coverage Investigation — agent-run-termination-extraction

## Investigation Meta

(`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction/tickets/in-progress/agent-run-termination-extraction`)

- Requirements Doc: `…/requirements-doc.md` (Approved, SR-003)
- Investigation Notes: `…/investigation-notes.md`
- Solution Revision Record: `…/solution-revision-record.md`
- Design Spec: `…/design-spec.md`
- Supplemental Task Artifacts: none (predecessor SR-006 § 11 is the preserved contract)
- Design Review Report: `…/design-review-report.md` (ARCH-REV-001 Pass)
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Implementation Handoff: `…/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `…/implementation-revision-record.md`
- Code Review Report: `…/code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `…/code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `…/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `…/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: CRR-001 Pass from `/code_reviewer`
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this file, round 1

## Routing Classification

- Task size: `Medium`. Architectural risk: `High`. Input route: `Reviewed`. Successful-output route: `Code Review`.
- Proportional test-code review decision: `Required` only if API/E2E changes durable tests (none planned).

## Current Requirement And Design Basis

- **REQ-001/AC-001:** termination and the root-shutdown fence attempt move to `AgentRunTermination`; `AgentRun` delegates its 4 public methods.
- **REQ-002/AC-002:** `agent-run.ts` ≤ 400 effective lines (reported 383; new owner 196).
- **REQ-003/AC-003/AC-004:** behavior-neutral, including SR-006 § 11 F-1–F-4 and cancel/reopen/finish-retry. Live gate: LE-O1 Codex ≥10 consecutive passes, plus the mention and agent-initiated suites on Claude and Codex.
- **AC-009:** no new failures vs `evidence/baseline-server-failures.txt` (27), by test name and message.
- Non-goal: the stale-local-turn residual (note any, do not count it).
- Persisted data: not affected.

## Supported Scenarios And Real Usage

- **SCN-001:** Stop a busy root (Team, Org, standalone) → fence → interrupt → quiescence → terminate; reopen works.
- **SCN-002:** End a single run (standalone Stop, delete, archive, server shutdown `stopAll`) with the run active or idle.
- **Added from the handoff hint and the user's earlier request:** quit the real desktop app while runs are busy mid-turn (SCN-002 through `stopAll`, and SCN-001 for the roots), relaunch, and continue the conversations.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 termination and fence ownership | Preserved (moved) | REQ-001/003 | Unit suites (AC-003), live gate (AC-004), busy-quit journey |
| BEH-002 size | Changed | REQ-002 | Static count |

## Changed Surface And Boundary Classification

| Surface | Affected? | Changed Boundary | Repository Evidence | Unexercised Risk | Broader Mode |
| --- | --- | --- | --- | --- | --- |
| Domain/backend logic | Yes | `AgentRun` ↔ `AgentRunTermination` delegation; dispatch-queue/microtask ordering | 8 AC-003 suites | Real runtime timing (busy interrupt races) | Live E2E |
| Process/lifecycle | Yes | Stop, server shutdown `stopAll`, restore | `native-root-termination.integration` | Real process quit while busy | Isolated desktop app |
| API/transport, frontend, persisted data, desktop shell | No | — | — | — | — |

## Project Execution Discovery

- Testing guideline: `TESTING.md` (worktree root); `AGENTS.md` points to it.
- Base comparison worktree: `…/agent-run-termination-extraction-base` (`03d5db06b`, deps installed).
- Live gates: `RUN_CLAUDE_E2E=1`, `RUN_CODEX_E2E=1`, `AIC_ROOT_RUNTIMES=codex_app_server`. The per-worktree test DB means live runs on one worktree are sequential.
- Isolated desktop: `pnpm --silent isolated-app start --build --keep`, driven by Playwright over CDP.

## Existing Durable Coverage Inventory

| Path | Intent | Req/AC | Validity | Action |
| --- | --- | --- | --- | --- |
| 8 AC-003 suites (`agent-run.test`, `agent-run-root-shutdown-fence.test`, `agent-run-compaction-races`, `frozen-root-termination-scope`, `configured-agent-execution-handle`, `agent-org-run-termination`, `root-team-run-termination`, `native-root-termination.integration`) | Termination/fence semantics | AC-003 | Still Valid (test diff additive only, +29/−0) | Execute |
| `tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` (LE-O1 etc.) | Busy Org Stop and root lifecycles live | AC-004 | Still Valid (unchanged) | Execute |
| `tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts` | Standalone Stop/wake live | AC-004 | Still Valid | Execute |
| `tests/architecture/**` | Guards | AC-009 | Still Valid | Execute |

## Durable Coverage To Add / Update / Remove

None planned. The behavior-neutral refactor is covered by unchanged suites; the busy-quit journey is a temporary live check.

## Repository Coverage Execution Plan

| Order | Command | Proves |
| --- | --- | --- |
| 1 | LE-O1 Codex ×10 consecutive (branch) | AC-004 gate |
| 2 | Mention (Claude+Codex), agent-initiated on Claude, agent-initiated on Codex (root cases) | AC-004 |
| 3 | AC-009 baseline command, branch and base; plus the full `tests/unit tests/integration tests/architecture`, branch vs base | AC-003, AC-009 |
| 4 | F-4 warning census across all live logs | REQ-003 diagnostics |

## Test-Case Ledger Decision

Ledger required: `Yes` (long paid live runs and a desktop journey). Path: `…/api-e2e-test-case-ledger.md`.

## Broader Validation Decision (initial)

`Required`, mode `Project Desktop Validation` (isolated app). The gap: no repository or live suite quits the whole process while agents are mid-turn and then continues. That is SCN-002 `stopAll` in its riskiest timing.

## Ambiguities Or Reroute Triggers

None at start.

## Results Summary (round 1)

- **T-01:** 10/10 (11/11). **T-02:** pass per AC-004; only base-identical flakiness. **T-03:** 6/6. **T-04:** 5/5. **AC-009:** 27/27 identical, 0 new. **F-4 census:** 0 warnings.
- **T-08/T-09:** conversations continue after busy quits. Found a pre-existing, base-identical busy-quit shutdown hang that orphans the server and agent processes. It is out of scope (non-goal); a new ticket is recommended.

## Investigation Decision

- Proceed: `Yes` (completed). Durable coverage changes: `No`. Reroute: `No`.
- Final confidence: 94% (execution report).
