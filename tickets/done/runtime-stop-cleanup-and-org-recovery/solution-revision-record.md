# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | User request via `/api_e2e_engineer` (F-API-001) + user instruction to include Org termination fix; live probes L1/L2 | F-API-001 | N/A | Ready for Approval → Approved (2026-09-29) | BEH-A1, A2, B1, B2; REQ-A1..A3, B1..B4 | Approved with option A and DEC-001..006 resolved |
| SR-002 | Mixed | User approval of SR-001 + architecture investigation | N/A | Requirements Approved; design N/A | Requirements Approved; Design Ready | all SR-001 IDs | Architecture Design Complete (Medium / High) |
| SR-004 | Requirements | CRR-002 / CR-001 (F-API-B1-ALT); user approval 2026-09-29 | CR-001 | Requirements Approved (SR-001), design Ready (SR-003) | Requirements Approved (SR-004); design unchanged | AC-B1 (alternate column) | AC clarified; no code change |
| SR-003 | Design | ARCH-REV-001 round 1 (Fail, Design Impact) | AR-001, AR-002, R-1..R-8 | Design Ready (SR-002), review Fail | Design Ready (revised) | REQ-B1, REQ-B4 (Teams via DEC-004), REQ-B1 (fail-stop retry); REQ-A1 (R-1..R-3), REQ-B3 (R-4) | Architecture Design Complete (Medium / High), re-review |

## Revision Entries

### SR-001 — Stop AGY background processes on runtime stop; recover Orgs after member crash

- Phase and classification: Requirements; `Initial Baseline`
- Triggering input: `/api_e2e_engineer` message 2026-09-29 relaying the user's request to fix F-API-001; user instruction 2026-09-29 to include the earlier-diagnosed Org termination defect if it still exists.
- Triggering finding IDs: F-API-001 (predecessor API/E2E)
- Prior authoritative status: N/A
- Current status: `requirements-doc.md` Ready for Approval; design N/A
- IDs affected: all in requirements-doc SR-001
- Scenario-basis changes: SCN-A1, SCN-A2, SCN-B1, SCN-B2 established
- Why recorded: first coherent baseline presented for approval
- Sections changed: all created
- Supplements: `probes/` (gql.sh, org-send.mjs, create-nested-classroom-agy-org.json); `predecessor-delivery-receipt-verification.md`
- Intended behavior changed: `Yes` (new baseline; supersedes predecessor ASM-001 and Out-Of-Scope background-process-manager exclusion for AGY)
- Approval impact: pending explicit user approval incl. DEC-001..DEC-006
- Design/review basis: N/A
- Classification: N/A before design
- Handoff: none yet (approval hold)
- Remaining gaps: user decisions
- Next action: present to user; on approval, architecture design

### SR-002 — Approval captured; architecture design completed

- Phase and classification: Mixed; `Refinement` (approval + design)
- Triggering input: user replies 2026-09-29. First: "what do you mean by setsid. if its getting more and more complicated. i would accept not fixing the background task issue". After the option A/B clarification: "I want to have a reasonable fix … But if the fix is reasonable, I'm fine. it will make our product better." Taken as approval of option A and the recommended DEC-004/DEC-006; the user was notified and invited to object.
- Prior status: requirements Ready for Approval; design N/A
- Current status: `requirements-doc.md` Approved (SR-001 baseline with DEC resolutions); `design-spec.md` Ready
- IDs affected: REQ-A1 (narrowed to live-AGY stops, macOS/Linux), REQ-A3 (crash case → documented limitation), DEC-001..DEC-006 resolved
- Intended behavior changed: `Yes` relative to the draft (crash cleanup removed), covered by the approval above
- Design: D-A1 (stop AGY background process groups in `AgyStreamProcess.stop`), D-B1 (stale-run termination completes), D-B2 (per-attempt activation mode → restore after first publication), D-B3 (Org termination retry not cached), D-B4 (Org/Team restore self-heals a registered-but-stopping root)
- Classification: `task_size=Medium`, `architectural_risk=High` (shared Org/Team lifecycle and termination, concurrency, OS signalling)
- Handoff: see `handoff-architecture-design-complete.md`
- Remaining gaps: Team frozen-scope retry caching to confirm during implementation; delayed-SIGKILL pgid reuse risk left to the reviewer's judgment
- Next action: independent architecture review per handoff rules

### SR-003 — Design revision for ARCH-REV-001 round 1

- Phase and classification: Design; `Design Impact`
- Triggering report: `/architecture_reviewer` ARCH-REV-001 round 1, `design-review-report.md` (Fail, Design Impact) and `architecture-review-revision-record.md`
- Finding IDs: AR-001 (Medium), AR-002 (Low); non-blocking R-1..R-8
- Prior status: design Ready (SR-002), review Fail
- Current status: design Ready (revised); requirements unchanged (Approved SR-001)
- Changes in `design-spec.md`:
  - AR-001: D-B4 extended to `TeamRunService.restoreTeamRun`; its pre-transition `hasManagedTeamRun` guard is removed so the manager is the single authority; `resolveActiveTeamRun`/`resolveManagedTeamRun` explicitly unchanged; Team service-level test added; interface, file and ownership mappings updated.
  - AR-002: D-B3 adds a persistent `failStopped` field set by `enterFailStop` and read by every termination attempt; unit test added.
  - R-1 alive check includes `signalCode`; R-2 per-group `ESRCH`/`EPERM` handling, and the unref'd SIGKILL-on-quit limit documented; R-3 leader-descends-from-AGY selection, no `ps` re-verification (PR-003 accepted); R-4 mode switch at both publication sites; R-5 fence flag and readiness wait before the stale short-circuit, plus logging of `AgentRunRemovalCleanupError`; R-6 recorded as a residual risk; R-7 Stop-caused validation cases added; R-8 Team frozen scope clears `fencing` only.
- Intended behavior changed: `No` (no renewed approval needed)
- Classification: unchanged, `task_size=Medium`, `architectural_risk=High`
- Handoff: re-review by `/architecture_reviewer` (see `handoff-architecture-design-complete.md`, updated for SR-003)
- Remaining gaps: none known

### Review notification (informational; not a solution round)

- 2026-09-29: `/architecture_reviewer` ARCH-REV-002 (round 2) **Pass** on SR-003. AR-001 and AR-002 resolved; R-1..R-8 folded; non-blocking implementation notes N-1..N-3 in `design-review-report.md`. The reviewer delivered the cumulative package to `/implementation_engineer`. The Solution Designer does not forward it again.

### SR-004 — AC-B1 alternate clarification (approved)

- Phase and classification: Requirements; `Requirement Gap` (contributing) with `Design Impact` origin per CRR-002
- Triggering report: `/code_reviewer` CRR-002, finding CR-001; API/E2E F-API-B1-ALT (LIVE-ORG-B1, LIVE-ORG-R7, LIVE-TEAM-D4, 2 runs each)
- Evidence: `evidence/live-org-b1.json`, `evidence/live-team-d4.json`: secondTerminate → `{success:false, "…not found."}`; resolvers `agent-org-run.ts:254` and `agent-team-run.ts:215` map a manager `false` to "not found".
- Prior status: requirements Approved (SR-001), design Ready (SR-003), review Pass (ARCH-REV-002)
- Current status: requirements `Approved` (SR-004); design unchanged (SR-003 remains authoritative; option (b) needs no design change)
- Proposed: option (b) (clarify AC; no code change); alternative (a) (idempotent terminate contract)
- Approval impact: renewed approval received from the user on 2026-09-29: "Accept your suggestion." (option (b), recommended). Earlier the user said "What is your suggestion? I think you always give me really reasonable suggestions."
- Intended behavior changed: `No` (the AC wording now matches the approved intent and the preserved existing response)
- Downstream impact: no production code change. The API/E2E durable test assertion for the second Terminate (LIVE-ORG-B1, LIVE-ORG-R7, LIVE-TEAM-D4) must follow the clarified AC-B1; then run test-code review and continue towards delivery.
- Classification: unchanged (`Medium` / `High`)
- Handoff: per rules (revised package, High → `/architecture_reviewer`); see `handoff-architecture-design-complete.md` SR-004 section

### Review notification (informational; not a solution round)

- 2026-09-29: `/architecture_reviewer` ARCH-REV-003 (round 3) **Pass** on SR-004. The design SR-003 stands, and there is no production change. N-4 (two stale handoff lines) is corrected in `handoff-architecture-design-complete.md`. The reviewer delivered the package to `/implementation_engineer`. The Solution Designer does not forward it again.
