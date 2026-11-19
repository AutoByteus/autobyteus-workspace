# Handoff: Architecture Design Complete — autobyteus-533 (interrupt-idempotent-stop)

- Result: `Architecture Design Complete`, SR-002, task_size `Medium`, architectural_risk `High` → independent architecture review.
- Package identifier: `interrupt-idempotent-stop` (Project Task autobyteus-533, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), founder's report of 2026-11-18.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-idempotent-stop/tickets/in-progress/interrupt-idempotent-stop`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-idempotent-stop`, `codex/interrupt-idempotent-stop`; base `origin/personal` at `bd2053ee51963b4d9fa715f5d9ab4d548aca2214`; finalization target `origin/personal`. Commit: see `git log -1` on the branch (ticket documents and the two reproductions).
- Release: only on the founder's word; the next beta carries it.

## Original request (summary)

Clicking Stop generation twice (desktop and phone) shows a red toast with the raw run id twice and internal words ("AgentRun … has no canonical active turn to interrupt"). Find the root cause; make a second Stop, or a Stop of a run with nothing to stop, harmless (no toast); show "Stopping…" after the first press until the status updates; never raw ids or internal words; real failures in plain words; every run kind, desktop and phone; tests (unit double press, e2e on an isolated node with a scripted runtime, phone probe case); decide whether the node should answer an idle interrupt as success.

## Root cause (reproduced and measured)

1. The node answers a Stop that finds nothing to stop as a failure with developer text containing the run id (`agent-run-interrupt-state.ts:58-65`, passed through by every stream handler).
2. The Stop control stays clickable after the first press (no pending state, `agentPrimaryAction.ts`).
3. The app toasts every non-accepted answer with the raw run id and raw text (`agentRunStore.ts:59-76`, `teamRunCommandPresentation.ts:14-31`); Org and peer runs show nothing at all.

The node ends the turn before it answers the first Stop, so a second Stop reaching it before the page renders the new status fails. Window ≈70 ms locally, ≈ one round trip remotely (≥300 ms at 150 ms one-way latency): a phone double tap fails most of the time. Evidence: `investigation-notes.md` (Runtime findings), `evidence/reproduction/`.

## Approval basis

Requirements approved by the Solution Designer within the Task's direction (no decision needed the user; user informed 2026-11-18). SR-002 removed a mixed-version clause per `DESIGN.md` rule 9 (no change to supported behavior). Design approval by the user: not required by the Task.

## Design summary

- Node: one rule `userInterruptOutcome` (new `services/agent-streaming/user-interrupt-outcome.ts`) applied at all five user interrupt boundaries (agent, Team, Org, collaboration, peer relay); not-running run/Team/Org answers accepted for an interrupt; the domain `AgentRun.interrupt()` result stays truthful for the shutdown fence and termination. Claude, Codex and native backends answer `NO_ACTIVE_TURN` when the turn is already gone in the runtime.
- Web: one Stop owner `runInterrupt` (new `services/runInterrupt/`) sets `AgentContext.interruptPending`, sends once, receives a typed `InterruptOutcome` from every route (streaming services return promises; result callbacks and per-route presenters removed; Org translated by `orgInterruptOutcome`), ends "Stopping…" when the status leaves Running (status watch) or on failure/connection loss, and shows only two plain messages naming the agent (`targetDisplayName` extracted).
- Spine re-walk for every run kind and state: `evidence/spine-validation/sr-002-stop-spines-by-run-kind.md` (no gap).

## Open risks

- R-1: overlap with autobyteus-448/526 FU-002 in the interrupt path (this design leaves `AgentRunInterruptState` unchanged; coordinate through the PM if FU-002 lands first).
- R-2: `agentOrgStreamingService.ts` is 498 lines; the translation lives outside it.
- R-3: an accepted Stop with no later status change (node defect) keeps "Stopping…"; no timer added.

## Follow-ups (not this ticket)

FU-001 (button labels not localized), FU-002 (open-time Running placeholder) in `follow-ups.md`.

## Reproduction to start from

- Server (fails on the base): `cd autobyteus-server-ts && env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/agent-run/interrupt-twice-repro.e2e.test.ts --no-watch`
- Browser (needs `pnpm -C autobyteus-server-ts build`): `cd autobyteus-web && node tests/e2e/interrupt-twice-repro-scratch.mjs --output-dir <fresh dir> [--latency-ms 150]`

## Expected next action

Architecture review of the package (requirements-doc.md, investigation-notes.md, design-spec.md, solution-revision-record.md, follow-ups.md, spine validation). On Pass, the reviewer routes to implementation per its rules.

## Route record

`get_handoff_rules` (2026-11-18): rule "task_size=Large or architectural_risk=High … ready for independent architecture review" matched → `/architecture_reviewer`.
