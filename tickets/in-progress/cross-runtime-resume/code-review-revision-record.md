# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1, from IR-001 | N/A | Pass (superseded by CRR-002) | None (FU-009 follow-up) |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review, from API-REV-001 (API-02 / RS-01 failed) | Pass (CRR-001) | Fail | F-1, F-2 (Design Impact), F-3 (Local Fix) |
| CRR-003 | `code-review-report.md` | Implementation Review, round 3, `Full Re-Audit`, from IR-002 | Fail (CRR-002) | Pass | F-1, F-2, F-3 resolved |

## Revision Entries

### CRR-001 — Initial source review of cross-runtime-resume

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md`; none
- Relevant solution revision IDs: SR-004
- Relevant architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Pass (9.4 / 10)
- What changed in the review result and why: first result. Pending switch, single commit path, activation sequence, recorder, notice, per-file journal runtime, rename and web match the approved design; the removed model-only commit is behavior-equivalent; no finding.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none; follow-up FU-009
- Material score or classification changes: Large / High confirmed
- Recommended recipient: API/E2E engineer; implementation engineer informed
- Remaining risks or uncertainty: native runtime not in the real switch run; hand-edited generated GraphQL file; two files at exactly 500 effective lines

### CRR-002 — Failure-origin review of API-02 / RS-01 (switch to and from the native runtime)

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Review scope: `N/A` (failure-origin round)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-001); API-02 / RS-01, OBS-1
- Relevant solution revision IDs: SR-004
- Relevant architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-001)
- Current authoritative result: Fail
- What changed in the review result and why: API/E2E measured two failures. F-1: preparing a native candidate appends its `system_instruction` to the run's active raw-trace file before the marker and rotation, so it lands in the previous agent's archived segment (I-7 broken for a native target). F-2: the local-memory projection reads `includeArchive: false`, so the reopened chat of a switched run starts at the latest marker. Both trace to premises in the reviewed design that the source review also accepted; they are classified `Design Impact`. F-3 (from OBS-1): `selectionContextFor` passes the pending, never-started model as the current one, so a model-only edit while a switch to native is pending hits the replacement capacity rule; `Local Fix`. Scorecard categories 7 and 8 lowered.
- Supported product scenario / material-premise basis changes: two material premises contradicted (a prepare writes nothing to the run's raw-trace file; the local projection shows earlier files).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| (round 1) none | n/a | n/a | CRR-001 | CRR-001 had no findings; it is superseded |

- New or remaining finding IDs: F-1, F-2, F-3
- Material score or classification changes: overall 9.4 → 8.7; Large / High unchanged
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: Grok as a switch target; a stored pending switch across a restart; rendered settings page and chat marker not seen

### CRR-003 — Source re-review of the rework IR-002

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 3
- Review scope: `Full Re-Audit` (the rework changes the activation spine, the memory port, the metadata shape, the library store and two readers)
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-002); CRR-002 F-1, F-2, F-3
- Relevant solution revision IDs: SR-004 (notes 14–16)
- Relevant architecture-review revision IDs: ARCH-REV-003, ARCH-REV-004
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-002)
- Current authoritative result: Pass (9.4 / 10)
- What changed in the review result and why: the activation takes a watermark ticket before the candidate prepares, archives only through it, and discards a failed attempt's records after a confirmed release; the chat reads the `runtime_switch` segments; the hand-over is derived from the raw traces; the pending model is no current model. Built-server RS-01/02/03 and the live three-runtime run pass. No new finding.
- Supported product scenario / material-premise basis changes: the two contradicted premises are now stated in the design and covered by tests.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-1 | Open (Design Impact) | Resolved | IR-002, ARCH-REV-004 | Code read (`activateSwitched`, `discardFailedSwitchAttempt`, library rule 3), `runtime-switch-failed-attempts.test.ts`, IMP-04 RS-01, IMP-05 |
| F-2 | Open (Design Impact) | Resolved | IR-002, ARCH-REV-004 | Code read (`readChatRawTraces`, provider), `runtime-switch-chat-history.test.ts`, IMP-04 RS-01 reload |
| F-3 | Open (Local Fix) | Resolved | IR-002 | `selectionContextFor`, updater test, IMP-04 RS-02 |

- New or remaining finding IDs: none
- Material score or classification changes: overall 8.7 → 9.4; Large / High unchanged
- Recommended recipient: API/E2E engineer; implementation engineer informed
- Remaining risks or uncertainty: Grok target not started for real; restart with a stored pending switch; browser view; optional C-9 hardening
