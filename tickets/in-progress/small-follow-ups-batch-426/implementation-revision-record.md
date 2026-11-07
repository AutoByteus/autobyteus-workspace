# Implementation Revision Record — small-follow-ups-batch-426, round 1

The current code and `implementation-handoff.md` are authoritative; this record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-002 | Code reviewer, `code-review-report.md` (CRR-001 Fail), round 1 | F-001, F-002, F-003 | `Local Fix` | SR-005; ARCH-REV-003; CRR-001; API-REV N/A; DR N/A | Three bounded fixes in `1d2cdd15ab`; ready for the Targeted Delta Review |
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

### IR-002 — CRR-001 local fixes

- Triggering role, report path, and round: code reviewer (`code_reviewer_54f114daa05e40fda891656b2c93e4bb`), `tickets/in-progress/small-follow-ups-batch-426/code-review-report.md`, CRR-001 (Full Review of IR-001 at `af76ab7ff5`), round 1
- Triggering finding IDs: F-001, F-002, F-003
- Classification: `Local Fix`
- Prior authoritative result: IR-001, CRR-001 Fail (Runtime Correctness and Cleanup 9.0 < 9.2)
- Current authoritative result: fixes in `1d2cdd15ab`; ready for the Targeted Delta Review
- Related solution revision IDs: SR-005 (D-02 message-fallback scope; D-13 text)
- Related architecture-review revision IDs: ARCH-REV-003 (no classification by message text for the new codes)
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why recorded: code-review findings, implementation-owned
- Approved behavior or requirement IDs affected: REQ-002 (F-001), REQ-008 (F-002), REQ-013 (F-003); no intended behavior changes
- Implementation delta:
  - F-001: `autobyteus-web/utils/remoteAccess/remoteAccessReadRefusal.ts`. The message fallback is exactly today's 401 / AUTH_REQUIRED / AUTH_INVALID rule. The two new codes are read only from the status and body (Apollo `networkError`, axios `response`). The spec adds: a bare message naming either code returns null.
  - F-002: `autobyteus-web/services/workspace/runWorkspaceChoice.ts`. The workspace ID is typed `string`; the metadata is resolved unconditionally; only the `!workspaceMetadata` check is kept. Also a stray blank line removed in `scripts/guard-localization-boundary.mjs`.
  - F-003: `docs/design-cases.md` Case 5. New "Again in autobyteus-426 (SR-005, IMP-02)" bullet with D-13's text, and "autobyteus-426, SR-005" added to the heading list.
- Changed files or areas: the four files above plus the rule's spec
- Local validation and result: IMP-14 (affected specs 52/52, the guard and its integration test, web typecheck PASS at baseline)
- Next recipient or routing: Code Reviewer (Targeted Delta Review), as the handoff rules route a High-risk Local Fix
- Remaining limitations or risks: unchanged from IR-001
