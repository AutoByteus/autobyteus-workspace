# Implementation Revision Record — small-follow-ups-batch-426, round 1

The current code and `implementation-handoff.md` are authoritative; this record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md` (ARCH-REV-002 Pass, then ARCH-REV-003 for D-02 and ARCH-REV-004 for D-19), round 1 | N/A | `Initial Baseline` | SR-004, SR-005, SR-006; ARCH-REV-002, ARCH-REV-003, ARCH-REV-004; CRR N/A; API-REV N/A; DR N/A | Round 1 implemented (D-01…D-03, D-05…D-08, D-10…D-14, D-16…D-19); one Design Impact raised and resolved during the round (D-02, SR-005) |

## Revision Entries

### IR-001 — Round-1 implementation baseline

- Triggering role, report path, and round: architecture reviewer (`architecture_reviewer_d40b29b15ce84a0290edd732f58a7e5e`), `tickets/in-progress/small-follow-ups-batch-426/design-review-report.md`, round 1 (ARCH-REV-002 Pass on SR-004; ARCH-REV-003 Pass on SR-005; ARCH-REV-004 Pass on SR-006)
- Triggering finding IDs: N/A (baseline)
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: implementation complete for round 1 on branch `codex/small-follow-ups-batch-426` (commits `709617b6eb`…`b1d92c7ced`, with the `origin/personal` merge `ed29eb6522`); ready for source review
- Related solution revision IDs: SR-004 (round-1 design), SR-005 (D-02 revised after this implementation's Design Impact), SR-006 (item 19 / D-19 added)
- Related architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003, ARCH-REV-004
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: first implementation handoff of round 1. During the round, implementation measured that the history read hands the phone's check only a message string, so D-02's refusal codes never reached the classifier (evidence `IMP-02`); it was returned as a Design Impact to the Solution Designer, revised as SR-005 (`historyReadFailure`), reviewed (ARCH-REV-003) and then implemented. Item 19 joined the round as SR-006 / ARCH-REV-004 and was built after taking in `origin/personal` (autobyteus-427).
- Approved behavior or requirement IDs affected: REQ-001, 002, 003, 005, 006, 007, 008, 010, 011, 012, 013, 014, 016, 017, 018, 019 (BEH-001…BEH-019 except the dropped 004, 015 and round-2 009)
- Implementation delta: see `implementation-handoff.md` § Reviewed Behavior Implementation Trace (one row per behavior with its files)
- Changed files or areas: server (`server-addressing`, `remote-access/services/ip-address-ranges.ts`, `workspaces`, GraphQL `workspace.ts`, `node-desktop`), server tests (unit, four stale E2E files, two new E2E cases), web (phone shell, run history store, workspace refusal, VNC clipboard sheet, Phone Setup remote wording, locale formatting at ~20 sites and the guard, event monitor status), Android (`TrustedNavigationPolicy`, `AutoByteusWebView`, `OpenPageRestore`, `MainActivity`, `NodeConnectionFlow`), probes (B04, NVP-05 + `fixtures/dev-server-ready.mjs`), docs (`agent_artifacts.md`, `content_rendering.md`, `docs/design-cases.md`), one baseline test fix (`agent-provider-composition-boundaries.test.ts`)
- Local validation and result: `implementation-handoff.md` § Checks Run (IMP-01…IMP-14)
- Next recipient or routing: Code Reviewer (`task_size=Medium`, `architectural_risk=High`)
- Remaining limitations or risks: `implementation-handoff.md` § Known Risks; probe runs (B04, NVP-05), the phone-bundle cases and the emulator checks (AC-004, AC-005, AC-007) are left to API/E2E
