# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `tickets/in-progress/team-stream-recovery-541/requirements-doc.md` (SR-002; REQ-001…008, AC-001…010, DEC-001…005)
- Investigation Notes: `investigation-notes.md` (+ `evidence/investigation/`)
- Solution Revision Record: `solution-revision-record.md` (SR-001, SR-002 and its amendment)
- Design Spec: `design-spec.md` (SR-002)
- Design Review Report / Revision Record: `design-review-report.md` (ARCH-REV-002, Pass) and `architecture-review-revision-record.md` (the reviewer's, untracked; left as they are)
- Implementation Handoff / Revision Record: `implementation-handoff.md`, `implementation-revision-record.md` (IR-001)
- Code Review Report / Revision Record: `code-review-report.md`, `code-review-revision-record.md` (CRR-001, Pass; C-1, C-2 held for evidence)
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review Pass of IR-001 (reviewed route, Large / High); code head `9e508b3adf`, review docs `bfd6ab97b5`, base `80420a8bf6`
- Prior Investigation Reviewed: none

## Current Requirement And Design Basis

- A: a Team stream needing recovery recovers by itself (desktop, phone) on the reconnect cadence, single-flight per Team; members keep their last status; a send waits up to 10 s then gives the not-sent notice with the text back; the page's state (draft, notice, held send) survives the commit; after the fifth consecutive failure a localized notice; attempts go on.
- B: an open shows the run-status feed's status, else Initializing (never a Running placeholder); an open racing a context build reads once more and never throws "changed before projection commit".
- C: a history refresh no longer puts Initializing on an existing, merely disconnected context (Team and standalone).
- D, E: localized composer labels; the Team tool-approval handler's dead branch; the Org spec timeout; two Org files under 500 lines; a renamed file.
- Probe infrastructure: the stop-generation wire keeps each link's frame order (A's cause was the wire).
- Persisted data: not affected.

## Supported Scenarios And Real Usage

- From the ACs: a real gap (a frame lost) while the Team finishes a turn (desktop, phone); the recovery's reads failing (node unreachable for them) with a send meanwhile, then the node back; the path down with a history refresh (Team member and standalone run), with and without a send.
- From the code review's held edges: C-2 (the user switches member during an automatic attempt's hydration: which member is focused after the commit), C-1 (a recovering stopped Team archived and later reopened in the same session).
- Unsupported/contrived: none recorded.

## Changed Behavior Summary

| Behavior / Boundary | Change | Evidence | Consequence |
| --- | --- | --- | --- |
| Team stream recovery (A) | Added/Changed | D-A1…A7 | probes SDD-14/15, MSP-119/120; web specs; C-2 temp case |
| Status across a disconnect and a history refresh (C) | Changed | D-C1…C3 | SDD-12, SDD-13, SDD-07, SDD-09 on base and branch |
| Open's status and the race (B) | Changed | D-B1, D-B2 | web specs (no deterministic browser path for AC-005, handoff) |
| Labels, handler, Org splits (D, E) | Changed/Removed | D-D1…E2 | suites, `wc -l`, grep |
| Probe wire order | Changed (test infra) | D-A8 | wire prototype on base and branch; SGD-06 ×10 at 150 ms |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Changed Boundary | Repository Evidence | Risk Not Exercised | Broader Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes (small) | Team tool-approval handler (dead branch) | server unit + new test | none | none |
| API / transport | No (contracts preserved) | the client's use of the Team stream and checkpoint read | specs with fake sockets | real socket timing, real node | probes |
| Frontend component / state | Yes | stores, coordinators, recovery owner, views | specs | real browser timing | probes |
| Browser integration / user journey | Yes | desktop and phone Team views | — | all | probes |
| Process / lifecycle | Yes | recovery cadence, page hidden | specs (cadence) | real timers | probes (SDD-15/MSP-120 measure the cadence) |
| Persisted data, desktop shell, workers | No | | | | |

## Project Execution Discovery

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/team-stream-recovery-541`, branch `codex/team-stream-recovery-541`.
- Testing guideline: `TESTING.md` (root).
- Changed build inputs: none (no manifest, lockfile, config or workflow).
- Secrets: none (scripted runtime).

| Instruction / Path | Purpose | Learned |
| --- | --- | --- |
| `AGENTS.md`, `TESTING.md` | rules | `env -i`; own stacks; one heavy run at a time |
| `send-delivery-probe.mjs` header | desktop probe | `pnpm -C autobyteus-server-ts build`; built node + `nuxt dev` + headless Chrome; the wire |
| `mobile-shell-probe.mjs` | phone probe | `build:mobile-web` first; `--cases=` |
| `stop-generation-probe.mjs` | SGD-06 | `--cases SGD-06 --latency-ms 150` |

| Component | Start | Stop |
| --- | --- | --- |
| each probe's stack | the probe | the probe's `finally` (cleanup receipt) |
| base fresh clone (AC-004 old vs new) | `git clone --no-local` at `80420a8bf6` into `/tmp/api541/base`, frozen install, SDK `dist`, server build; the branch's probe files copied in | removed with `/tmp/api541` |

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related | Decision | Action |
| --- | --- | --- | --- | --- |
| `fixtures/stop-generation-wire.mjs` | the probes' wire | AC-009, every probe | Needs Update (done by implementation; reviewed: one FIFO queue per link and direction; test-only withhold options) | keep; prove with the prototype and SGD-06 |
| `fixtures/team-stream-gap.mjs` (new) | the gap and refused reads | AC-001, AC-002 | Still Valid (reviewed) | keep |
| `send-delivery-probe.mjs` SDD-07, 09, 12, 13 (made strict), SDD-14, 15 (new) | AC-001, 002, 004 | | Still Valid (reviewed); SDD-15 records the shown status during recovery without asserting it | add the assertion (REQ-002: members keep their last status) |
| `mobile-team-stream-recovery-cases.mjs` MSP-119, 120 (new) | AC-001, 002 phone | | Still Valid (reviewed) | keep |
| `stop-generation-probe.mjs` SGD-06 | the gap the wire caused | AC-009 | Still Valid | run ×10 |
| web and server specs (IMP-001 red on base) | A…E | all | Still Valid | whole suites |

## Planned Cases

| Case ID | Criteria | Surface | Kind | Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-001 | AC-003, 005, 006, 007, 008, 010 | whole web suite | Existing Test | `pnpm -C autobyteus-web test:nuxt` | |
| API-002 | AC-008 | whole server unit suite | Existing Test | `pnpm -C autobyteus-server-ts test:unit` | handler change and its new test |
| API-003 | AC-008 | `wc -l`, grep | Existing Test | `wc -l` the two Org files; `git grep agentOrgConnectionLostError` | |
| API-010 | AC-001 | desktop | Durable | `send-delivery-probe.mjs --cases SDD-14` | |
| API-011 | AC-001 | phone | Durable | `mobile-shell-probe.mjs --cases=MSP-119` | |
| API-012 | AC-002 | desktop | Durable | `send-delivery-probe.mjs --cases SDD-15` (+ the status assertion) | |
| API-013 | AC-002 | phone | Durable | `mobile-shell-probe.mjs --cases=MSP-120` | |
| API-014 | AC-004 | desktop, branch and base | Durable | `send-delivery-probe.mjs --cases SDD-13,SDD-07,SDD-12,SDD-09` in the worktree and in the base clone (with the branch's probe files) | "must fail on the old code" |
| API-015 | AC-009 | wire | Durable + prototype | `wire-order-stress.mjs` (IMP-003) on base and branch wire; `stop-generation-probe.mjs --cases SGD-06 --latency-ms 150` ×10 | |
| API-016 | C-2 (held) | desktop | Temporary Probe | a temporary SDD case: the recovery's checkpoint read delayed; the user selects another member during it; which member is focused after the commit | the code review's held edge |
| API-016b | C-2 (held) | desktop | Durable (SDD-16) | an in-app execution link to another member during a held hydration | the direct-focus path that does not join the recovery |
| API-017 | C-1 (held) | desktop | Temporary Probe (if reachable) | a recovering stopped Team archived, unarchived, reopened; a new gap: does the automatic recovery start | the code review's held edge |

- Test progress log: Yes.

## Durable Coverage To Update

| Case ID | Path | Change |
| --- | --- | --- |
| API-012 | `send-delivery-probe.mjs` SDD-15 | assert the member's shown status during the recovery is the one before it (REQ-002) |

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User Only? | Follow-Up |
| --- | --- | --- | --- | --- |
| AC-005 in a browser | the open's status path is taken only without a context; a loaded page's history refresh builds one first (handoff) | low; web spec covers the decision table | No | none |

## Ambiguities Or Reroute Triggers

None at investigation.

## Investigation Decision

- Proceed: `Yes`; durable coverage updated: `Yes` (SDD-15 assertion); reroute: `No`.
