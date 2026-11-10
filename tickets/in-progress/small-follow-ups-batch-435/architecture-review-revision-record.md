# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (2026-11-10) | SR-001 | N/A | Fail (Design Impact) | AR-001, AR-002 (blocking); AR-003, AR-004 (non-blocking) |
| ARCH-REV-002 | Round 2 / Architecture Design Complete after revision (2026-11-10) | SR-002 | Fail (Design Impact) | Pass | AR-001…AR-004 resolved |
| ARCH-REV-003 | Round 3 / revision after code review CRR-001 CR-001 (2026-11-10) | SR-003 | Pass | Pass | AR-001 premise corrected (DS-006b); AR-005 new (non-blocking) |

## Revision Entries

### ARCH-REV-001 — Baseline review of the 12-item batch

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/design-review-report.md`
- Review round and trigger: round 1; Solution Designer's `Architecture Design Complete` (SR-001, Medium/High)
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-design-complete.md`; N/A
- Relevant solution revision IDs: `SR-001`
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` (Design Impact)
- What changed in the review result or what baseline was established: the behavior basis is confirmed. Items 1–5 and 7–12 pass, including item 10's close classification and close-all and item 11's inactive digest. DS-006 (item 6) fails on two points: the Create-run entry form is missing (AR-001), and the restore's readiness and "gone" decision are not specified (AR-002).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001, AR-002 (blocking); AR-003, AR-004 (non-blocking)
- Material classification changes: None (Medium/High confirmed)
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: item 5 on API 28–34 is covered by unit test only; item 11 has not been run; UNK-001.

### ARCH-REV-002 — Re-review of SR-002 (item 6 restore and Create run)

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/design-review-report.md`
- Review round and trigger: round 2; Solution Designer's `handoff-round-2-architecture-design-complete.md` (SR-002, Medium/High)
- Triggering role, report path, and finding IDs: Solution Designer; ARCH-REV-001 findings AR-001…AR-004
- Relevant solution revision IDs: `SR-002`
- Prior authoritative decision: `Fail` (Design Impact)
- Current authoritative decision: `Pass`
- What changed in the review result: the behavior basis was reconfirmed with REQ-005 clarified (DEC-014, DEC-015, AC-005-5…7). The DS-006 write and restore spines were redrawn in call order and checked against the cited code. Items 1–5 and 7–12 are unchanged from round 1 (Pass), except the wording added for AR-003 and AR-004.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (blocking) | Resolved | SR-002; design-spec DS-006 write entry form 2, interface rows | `MobileNewRun.vue:20` emits `runId`. `agentRunRowKey` replaces the literals at `runListProjection.ts:79,98`. New run starts agent runs only (`useMobileRunSetupController.ts:14-19`). |
| AR-002 | Open (blocking) | Resolved | SR-002; DS-006 restore steps 1–7; DEC-014, DEC-015 | `initialLoad` always resolves (`useRunHistorySectionLoad.ts:29-38,83-85`). A non-quiet `fetchTree` sets `error` (`runHistoryLoadActions.ts:148-152`). `inspect` settles with the published context or `errors[host]` (`agentRunCollaborationStore.ts:159-185`). The pending open is keyed (`mobileRunOpeningStore.ts:16-26`). No timer. |
| AR-003 | Open (non-blocking) | Resolved | DS-004 row; FU-003 | Matches `app.vue:47-53` and `useTaskWorkerTasks.ts:38` |
| AR-004 | Open (non-blocking) | Resolved | Shared-structure check row | Meaning written per state |

- New or remaining finding IDs: None
- Material classification changes: None (Medium/High)
- Recommended recipient: `/software_engineering_team/implementation_engineer`; informational notice to `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: the restore should stop after its scope is disposed (session rejected at the first check); item 5 on API 28–34 is covered by unit test only; item 11 has not been run; UNK-001.

### ARCH-REV-003 — Re-review of SR-003 (DS-006b: route follows draft promotion)

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/design-review-report.md`
- Review round and trigger: round 3; `handoff-round-3-architecture-design-complete.md` (SR-003, Medium/High), after code review CRR-001 (Design Impact CR-001)
- Triggering role, report path, and finding IDs: Solution Designer; `code-review-report.md` CR-001
- Relevant solution revision IDs: `SR-003`
- Prior authoritative decision: `Pass` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed: CR-001 showed that AR-001's resolution, and this review's MP-001 premise in rounds 1–2, assumed `onLaunched` gets the node run's ID. It gets the draft's `temp-*` ID. Rounds 1–2 accepted `createAgentRun` returning a "runId" without following it into `createRunFromTemplate`. That was a review gap. SR-003 adds DS-006b and AC-005-8 (DEC-016). Re-checked against the code: the D-13 rule (`useChatRouteRunSync.ts`), `promoteTemporaryId`, which moves the mobile selection, and IR-001's route-derived `subjectKeys`. Everything outside DS-006 is unchanged since ARCH-REV-002.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved (ARCH-REV-002) on a wrong premise | Resolved (SR-003, DS-006b) | CRR-001 CR-001; DEC-016; AC-005-6, AC-005-8 | `agentContextsStore.ts:85-111,160-173`; `agentRunStore.ts:205-225`; `useChatRouteRunSync.ts:22-44` |
| AR-002…AR-004 | Resolved | Resolved (unchanged) | — | — |

- New or remaining finding IDs: AR-005 (non-blocking: reuse the D-13 detection rather than copy it)
- Material classification changes: None (Medium/High)
- Recommended recipient: `/software_engineering_team/implementation_engineer`; informational notice to `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: an entry not revisited before a reload keeps the draft key (→ list); item 5 on API 28–34 is covered by unit test only; item 11 has not been run; UNK-001.
