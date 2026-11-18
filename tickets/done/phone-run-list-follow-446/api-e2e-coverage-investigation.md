# API/E2E Coverage Investigation — autobyteus-446

The plan. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-001)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-002, `Ready`)
- Supplemental Task Artifacts: `evidence/repro/closed-task-rows-repro.mjs` (reproduction); `follow-ups.md` (FU-001, FU-002)
- Design Review Report: `N/A — not applicable` (architecture review not selected)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 (Medium / Low, direct API/E2E)
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file, round 1

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-run-list-follow-446`, branch `codex/phone-run-list-follow-446`, base `a85bf4f38d`; source as of `ff9a0c7b0c` (`c8620f1dac` adds ticket documents).

## Current Requirement And Design Basis

- REQ-001 / AC-001, AC-002, AC-006: when a Task closes, its delegated rows leave every run list whose open run is not the host within the list's next refresh (≤ 10 s while shown; at once when a phone's list is shown again).
- REQ-002 / AC-003: a reopened Task's rows return the same way.
- REQ-003 / AC-004, AC-005: preserved: the open host's live removal (≤ 1 s), reload, Org hosts, no per-host view read when nothing changed, nothing read while the phone is in the background, closed runs stay in their host's tree.
- Design: the history poll's statuses answer carries each active standalone host's closed-set digest (`closedTaskExecutionsDigest`, contracts); the store re-reads the host's view when it differs from the digest of its context's `closed_task_executions`. Risks for validation: Team hosts ("not affected", to be checked); inactive hosts (FU-001, out of scope).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (host open), SCN-002 (host listed, another run open; phone and desktop), SCN-003 (reload, preserved), SCN-004 (reopen).
- Real-use scenarios added:
  - SCN-002 with the phone **in the background** when the Task closes (AC-006 trigger: `visibilitychange`).
  - SCN-002 for a **Team host**: a Team member delegates a Project Task; the Task closes while the phone shows another run (design Risks).
  - SCN-002 on the **desktop** with the host **active** before the close (a host that turns active at the close would be re-read by the existing "active changed" rule, which would not test this fix).
  - Closures come from agents' `update_task` (the PM in the user's report; a Team member for its own delegated Task). A user-side status change has no surface: `updateProjectTask` carries no status field, so it is not a scenario here.
- Contrived (not tested): none named.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-002/004 rows leave on the poll | Changed | design DS-001 | MSP-24 (phone), MSP-27 (desktop) |
| BEH-005 reopen | Changed | DS-001 | MSP-24 |
| BEH-001 open host live | Preserved | live stream | MSP-24 host phone; existing MSP-14 |
| BEH-003 reload | Preserved | IMP-07 | reuse IMP-07 |
| BEH-006 Org hosts | Preserved | untouched | existing MSP cases (API-03) |
| AC-005 no view read when unchanged | Preserved | store unit IMP-12 | MSP-24 network log |
| AC-006 hidden then shown | Changed + preserved (E-25) | DS-001 | MSP-25 |
| `agentRunCollaborationStatuses` gains a field | Added | GraphQL type | IMP-03 server unit; probes read it |
| Team host | Unclear (design: not affected) | design Risks | MSP-26 |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | root accessor, manager digest | IMP-03 (real root close/reopen), IMP-10 | — | — |
| API / transport / contract | Yes | contracts digest; GraphQL field | IMP-02, IMP-03, IMP-06 | Same string on node and browser end to end | probes |
| Frontend component / state | Yes | `refreshListedStatuses` decision | IMP-12 (store specs) | The real poll timing and rendering | probes |
| Browser integration / user journey | Yes | phone list, desktop sidebar | IMP-07 repro (phone, host and other) | Durable coverage; reopen; hidden; desktop; Team host | `test:e2e:mobile-shell` cases |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | sidebar task rows | unit (shared store) | the desktop poll path | MSP-27 (`nuxt dev` window) |
| Desktop shell / Electron | No | — | — | — | — |
| Process / lifecycle | Yes (visibility) | phone list hidden/shown | — | AC-006 | MSP-25 (visibility emulated) |
| Persisted-data transition | No (`Not Affected`) | — | — | — | — |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned worktree: as above.
- Stack: pnpm monorepo; Nuxt web + phone bundle; Node server; contracts package with tracked `dist/`.
- Testing guideline: `TESTING.md` (root). Phone behavior is proven by a `test:e2e:mobile-shell` case.
- Conflicting or unclear instructions: none.
- Changed build-input paths: `autobyteus-collaboration-stream-contracts/**` (contract package). Fresh-start build already run by implementation on `ff9a0c7b0c` (IMP-13); no build input changed since (`c8620f1dac` is documents only) → reused.
- Secrets: N/A (scripted AGY).

| Instruction / Configuration Path | Authority | Learned |
| --- | --- | --- |
| `TESTING.md` | testing rules | layers; one heavy run at a time; phone cases in `test:e2e:mobile-shell`; fresh-start build on contracts changes |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` header | the phone probe | prerequisites (server build, `build:mobile-web`), `--cases`, duplicate-ID start check; desktop window = `nuxt dev` against alpha |
| `autobyteus-web/tests/e2e/fixtures/probe-node-access.mjs` | node credentials (autobyteus-437) | `ownerHeaders`, `ownerSocketUrl`, `attachToBrowserContext`, `probeNodeEnvironment` |
| `evidence/repro/closed-task-rows-repro.mjs` | reproduction | PTM delegates Task A (agent) and Task B (Team) with `CALL_TOOL`; phones host/other; `update_task` DONE |

| Component | Start | Readiness | Stop |
| --- | --- | --- | --- |
| Builds | IMP-11 (`8e686b7f36`; later commits change a comment and documents only) — verified before running | bundle contains `closedTaskExecutionsDigest` | — |
| Probe stack (alpha, beta, nuxt dev, Chrome) | the probe | `/rest/health` | probe `finally` |
| Node "delta" and its phones (new cases) | `serverAt('delta')`, own Chrome mapping 192.168.77.30 → 127.0.0.1 | health, pairing | the cases' `finally` |

| Data / Fixture | Method | Safety | Cleanup |
| --- | --- | --- | --- |
| delta: PTM (tools `update_task`…), Release Notes Writer, Docs Review Team, Live Team (lead with `update_task`), Project with Tasks A, B, C, a plain run "Other" | public GraphQL; `CALL_TOOL:` through the run streams (owner credential) | test-owned data root | removed with the probe root |
| alpha (MSP-27): the probe's PTM, its Task B (Docs Review Team), a plain run | existing stack | runs last, so no later case depends on Task B | — |

## Persisted Data Transition Coverage Basis

`Not Affected` (the digest is computed on demand). No persisted-data case.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-collaboration-stream-contracts/tests/closed-task-executions-digest.test.mjs` | digest: order, keys, empty, pinned values | AC-005 determinism | Still Valid | IMP-02 | Reuse |
| server `tests/unit/api/graphql/agent-run-collaboration-statuses.test.ts`, `tests/unit/standalone-agent-run-root/*` | field; active vs inactive; real root close/reopen | REQ-001/002 | Still Valid | IMP-03 | Reuse |
| web `stores/__tests__/agentRunCollaborationListedStatuses.spec.ts`, `services/agentCollaboration/__tests__/agentRunCollaborationStatuses.spec.ts` | the store decision (differs → one re-read; equal → none; inactive; live-followed) | AC-002 (shared store), AC-005 | Still Valid | IMP-12 | Reuse |
| `mobile-shell-probe.mjs` MSP-14 | Task A DONE: the task agent's row leaves live on the phone whose open run is the PTM | AC-004 | Still Valid | not run upstream | Run (full probe) |
| `mobile-shell-probe.mjs` MSP-01…23 | phone shell regression (MSP-02: delegated rows; MSP-12: no read while hidden) | REQ-003 | Still Valid | not run upstream | Run (full probe) |
| `pages/__tests__/mobile-root-shell.spec.ts` | pairing screen shows the node name | — (baseline fix) | Still Valid (fixed to 433's behavior) | IMP-09 | Reuse |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-005 (determinism) | contracts digest | Reused | IMP-02 | `8e686b7f36`; since then only the doc comment changed (`ff9a0c7b0c`) |
| API-02 | REQ-001/002, ASM-001 | server field, real root | Reused | IMP-03 | ran on `ff9a0c7b0c` |
| API-03 | REQ-003 | server unit suite; web full suite + baseline fix | Reused | IMP-10; IMP-08 + IMP-09 | IMP-10 on `e8270ed84e`; IMP-08 on `8e686b7f36` with its one failure fixed and rerun (IMP-09); later changes: a comment and documents |
| API-04 | AC-002 (shared store), AC-005 | web collaboration specs | Reused | IMP-12 | ran on `ff9a0c7b0c` |
| API-05 | — | typechecks, codegen | Reused | IMP-04, IMP-05, IMP-06 | `8e686b7f36`; comment-only change since |
| API-06 | release build | fresh-start build | Reused | IMP-13 | ran on `ff9a0c7b0c`; no build input changed since |
| API-07 | BEH-003 (reload) | phone bundle | Reused | IMP-07 (`otherAfterReload: []`) | same source |
| MSP-24 | AC-001, AC-003, AC-004, AC-005 | phone bundle on delta: phone-host (PTM open), phone-other (Other open) | Durable | new case | Durable proof of the fix, reopen, the open host, and the network cost |
| MSP-25 | AC-006 | phone-other hidden when the Task closes, then shown | Durable | new case | Visibility path |
| MSP-26 | REQ-001 (Team host; design Risks) | phone bundle on delta: a Team member (the lead) delegates Task C and closes it with `update_task` while the phone shows another run | Durable | new case | Confirms or refutes "Team hosts not affected" |
| MSP-27 | AC-002 | desktop window (`nuxt dev`) on alpha, open run = a plain run; the PTM's Task B closed | Durable | new case | Desktop poll path end to end |
| API-08 | REQ-003, AC-004 (MSP-14), regression | full phone probe | Existing Test | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/API-08-mobile-shell-probe` (all cases incl. MSP-24…27) | The phone shell on the changed client |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why |
| --- | --- | --- |
| MSP-24…27 | `autobyteus-web/tests/e2e/mobile-closed-task-rows-cases.mjs` (new), run last from `mobile-shell-probe.mjs` | TESTING.md: phone behavior is proven by a `test:e2e:mobile-shell` case; the design's step 4. A module of its own keeps the 2,173-line probe from growing; its own node keeps the closes away from alpha's shared stack (except MSP-27, which needs alpha's desktop window and runs last) |

## Durable Coverage To Update

| Case ID | Existing Path | Required Update |
| --- | --- | --- |
| MSP-24…27 | `mobile-shell-probe.mjs` | header lists the cases; `runCases` calls the module last; runtime note |

## Durable Coverage To Remove

None.

## Live Environment And Fixture Plan

- Order: verify builds; full probe (its stack; then the new module: delta, its phones, then MSP-27 on alpha).
- Setup choices: delta `AGY_FAKE_CASE=linked_skills` (`CALL_TOOL:`), probe owner credential; phones pair through Phone Access at `http://192.168.77.30:<delta port>`.
- Evidence: per case details (removal times, network ops per phone with run IDs, visibility windows), screenshots, server logs.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| Inactive host (FU-001) | Out of scope | known | No | FU-001 |
| A 32-bit digest collision | Not reachable by a test in reasonable time | Low (one refresh late) | No | — |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Owner |
| --- | --- | --- | --- |
| A Team host's closed Task rows stay listed (MSP-26) | Would be `Design Impact` (design escalation trigger) | to be observed | Solution Designer |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Durable Coverage Added / Updated: `Yes`
- Reroute Required Before Validation Execution: `No`
