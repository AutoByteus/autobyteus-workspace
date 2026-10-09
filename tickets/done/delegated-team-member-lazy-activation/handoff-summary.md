# Handoff Summary — delegated-team-member-lazy-activation

## State For User Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation`
- Ticket branch: `codex/delegated-team-member-lazy-activation`
- Base / finalization target: `origin/personal`. Bootstrap base `ace86bf1f`. At delivery start the base had advanced 36 commits to `f93ad1fc5` (archived-open-run-disappears, task-closed-status, interrupt-resend-retired-cleanup-stuck, v1.4.99-beta.2..beta.4). Ticket artifacts were checkpointed (`30cc6f129`), then the base was merged as `3a3731636` with no conflicts.
- Overlap with the base: `configured-agent-execution-handle.ts` (the base marks a failed previous-run release retry-safe; this ticket adds `startForInput`; separate hunks), `agy-failure-cli.mjs`, its unit test, and `TESTING.md`. All merged automatically; the suites below pass on the merged state.
- Verified candidate: the ticket branch HEAD that contains this file (delivery commit on top of `3a3731636`)
- Classification: `task_size=Small`, `architectural_risk=High`. Route: reviewed (ARCH-REV-001/002, CRR-003, API-REV-002, CRR-004 all Pass).

## What Changed

- A delegated Team copy starts only its coordinator, when the work packet is delivered to it. Every other member stays not started until work reaches it: no AgentRun, no provider session, a `null` saved binding, and gray "Offline". This applies in all roots (Agent, Team, Org), by description or `task_id`, and for Task helper Teams.
- Flat Team preparation is now always scope-only. Removed: the `prepareConfiguredAgents` option, `FlatTeamExecutionManager.prepareConfiguredActivation`, `prepare-flat-team-configured-activation.ts` and the staged-binding fields. Commit: `203eb29e1`.
- One member start step, `ConfiguredAgentExecutionHandle.startForInput()`, serves both teammate delivery (`reserveInput`) and direct input (`postMessage`). If a member cannot start:
  - the sender gets `AGENT_RUN_ACTIVATION_FAILED`, with the cause in the message;
  - the member shows `error`;
  - the member's conversation gets one error card.

  Input closed for the member (Task DONE, shutdown) is reported as `AGENT_RUN_NOT_ACCEPTING_INPUT`, with no error. Commit: `b3b28d47b` (IR-003, supersedes IR-002 `d30c11204`).
- Coordinator start failure still fails `delegate_task`.
- Tests: durable E2E `delegated-team-lazy-member-activation.e2e.test.ts` (DTL-001..008, gated live-Claude DTL-009), browser probe BR-008..010, five baseline test-double fixes (`fecc0c047`), `c95ad4b92`, `520c53dc7`.
- Docs: `agent_team_execution.md` (lifecycle and start-failure contract), `agent_orgs.md`, `TESTING.md`. See `docs-sync-report.md`.

## Validation Evidence

| Gate | Result |
| --- | --- |
| Architecture review | ARCH-REV-001 / ARCH-REV-002 Pass |
| Implementation | IR-001 + IR-003 |
| Source review | CRR-003 Pass, 9.4/10 |
| API/E2E (API-REV-002) | Pass, 95%. DTL ×5 under host load; live Claude DTL-009; built backend + real browser render (coordinator Idle, unused member Offline in all three roots); two real backend restarts (BR-011) |
| Test-code review | CRR-004 Pass, no findings |
| Delivery, post-merge (`3a3731636`) | `tsc -p tsconfig.build.json --noEmit`: exit 0. Unit (agent-collaboration, agent-team-execution, agent-execution, agent-org-execution, projects): 216 files, 2071 tests Pass. Integration agent-team-execution: 8 files, 56 tests Pass. Fake-AGY E2E: DTL suite, task reactivation, and the base's AGY interrupt-resend (Team member): 3 files, 11 tests Pass (2 live-Claude cases skipped by gate). Logs: `delivery-evidence/dr1-*.log` |

## How To Verify (AC-007)

Quick, without the app (about 2 minutes):

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation
RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
  pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/delegated-team-lazy-member-activation.e2e.test.ts --no-watch
```

Hands-on, in an isolated app built from this worktree (`pnpm --silent isolated-app start --build` from the worktree root; separate data, your own app is not touched):

1. In a Project, have the Project Task Manager delegate a Task to a Team with several members.
   Expected: only the coordinator turns active (amber, then blue or green). Every other member stays gray "Offline" in the sidebar and the member header.
2. Let the coordinator hand work to one member.
   Expected: that member alone starts (amber, then blue), works, then turns green Idle. Members that got no work stay gray.
3. Optional: mark the Task done and reopen it, or restart the app, then message the copy again.
   Expected: it continues, and again only the members that get work start.

Team copies you delegated before this build keep their started members until they go idle and shut down.

## Residual Risks (accepted)

- PREM-001, the Task DONE race during a start:
  - the `initializing` withdrawal is local only;
  - the "input closed" check runs twice, so once a card and `NOT_ACCEPTING` may disagree;
  - covered by unit tests only.
- CAND-005: UI-started Team/Org members that fail to start on a teammate message now return the typed failure instead of `-32603` (the REQ-005 intent).
- Code vocabulary: the operation-result code for a member start failure is now `AGENT_RUN_ACTIVATION_FAILED`, and the underlying code moves into the message. Integration note: for a Team member, the base's `AGENT_RUN_PREVIOUS_RUNTIME_RELEASE_PENDING` also follows this rule. The member's error card keeps the plain text. Only the rejected-send acknowledgement carries the `AGENT_RUN_PREVIOUS_RUNTIME_RELEASE_PENDING: …` prefix. That path is practically unreachable live (the base ticket notes a real runtime always stops).
- Pre-existing: a throw before the configured handle exists can still escape `reserveInput`.
- The Codex runtime was not run (it shares the handle path).
- R-002: copies delegated before this change keep their eagerly started members until normal idle shutdown.
- Not caused by this change: `pnpm -C autobyteus-server-ts typecheck` TS6059 (also on base). Untracked build outputs (`autobyteus-application-backend-sdk/dist/`, `autobyteus-application-sdk-contracts/dist/`) are not committed.
- Out of scope: the user-agreed follow-up cleanup ticket (`followup-cleanup-ticket-brief.md`), already sent to Solution Designer.

## Ticket Archive Note

`implementation-design-impact-ir-003.md` and `ir-003-wip-start-for-input.patch` are kept as history. They are the evidence for DI-001, which led to SR-004. The SR-004 handoff marks them as history only.

## Delivery Artifacts

- Docs sync: `docs-sync-report.md`
- Release notes: `release-notes.md`
- Release/deployment report: `release-deployment-report.md`
- Delivery revision record: `delivery-revision-record.md` (DR-001)

## Outcome

- User verification: "finalize and release a new beta" (`user-verification.md`)
- Finalized: merge `9d28c1b17` on `origin/personal`. Ticket branch `codex/delegated-team-member-lazy-activation` pushed.
- Released: **`v1.4.99-beta.5`** (release commit `ebf68c4af`). All 4 workflows succeeded on attempt 1. It is a GitHub pre-release; Docker images are `:1.4.99-beta.5` and `:beta`, and `:latest` is unchanged.
- AC-007: the user checks it on the installed beta.5. After a Project Task Manager delegation, only the coordinator should be active.
- Details: `release-deployment-report.md` (DR-002)
