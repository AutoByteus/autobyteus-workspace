# Code Review Revision Record — output-tps-precision

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 / IR-001 | N/A | Pass (9.4/10) | None blocking. C-004 is a docs item for delivery |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review, round 2 / API-REV-001 (API-L04) | Pass | Fail: Design Impact | CR-F01 (new, from C-009) |
| CRR-003 | `code-review-report.md` | Implementation Review, round 3 (targeted delta) / IR-002 | Fail: Design Impact | Pass (9.4/10) | CR-F01 resolved; C-001 retired (IC-2); C-010 new (non-blocking, delivery) |
| CRR-004 | `api-e2e-test-review-report.md` | Proportional API/E2E test-code review / API-REV-002 Pass | Pass (CRR-003) | Pass | None (C-004, C-010 carried to delivery) |

## Revision Entries

### CRR-001 — Initial implementation review of per-call runtime TPS

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `implementation-handoff.md` (IR-001); SCN-001 to SCN-005
- Relevant solution revision IDs: SR-005 (D3.1); SR-004 (R3)
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Pass
- What changed in the review result and why: initial baseline. All behaviors are confirmed against the code. Server typecheck passes. I re-ran the new and changed tests (server 67/67, web 62/62, autobyteus-ts 7/7). Both DS-003 boundary refinements were checked against the recorded Codex P5 and Grok fixtures and accepted.
- Supported product scenario / material-premise basis changes: none. P-001 to P-003 are confirmed. The Codex long-tool ordering is held for RSK-002 evidence and is not a finding.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none blocking. C-004 (stale `autobyteus-web/README.md` Token Meter paragraph) goes to delivery's documentation sync.
- Material score or classification changes: N/A (baseline). Every category is at least 9.0.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty:
  - RSK-002, including the Codex usage-vs-long-tool ordering;
  - RSK-005 and AGY cadence;
  - Grok first-call setup;
  - native hidden reasoning without a count.

### CRR-002 — Failure origin of API-L04: the Codex call end includes tool time

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-execution-coverage-report.md` (API-REV-001); API-L04; AC-004, SCN-002
- Relevant solution revision IDs: SR-005 (D3.1); SR-004 (R3)
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-001)
- Current authoritative result: Fail. Design Impact to Solution Designer.
- What changed in the review result and why: I re-parsed both live Codex wire logs myself. In each, the tool-calling call's `thread/tokenUsage/updated` arrives after the tool's `item/completed` (6,888 / 6,270 ms), while `rawResponse/completed` marks the call's real end (3,687 / 3,183 ms). The adapter follows the DS-003 Codex row (call end = usage update) exactly, so the reading includes about 2.9 s of tool time. The cause is the design premise, not the implementation. API-L04 is valid against approved SCN-002 and REQ-003.
- Supported product scenario / material-premise basis changes: the C-001 residual (held in CRR-001) is promoted as C-009 on live evidence. SCN-002 is confirmed as a Supported Normal Scenario.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| C-001 residual (Hold for Evidence) | Held for RSK-002 | Promoted to C-009 / CR-F01 | API-REV-001 | `evidence/api-e2e/live/codex*/codex-wire.jsonl` |
| C-004 (docs) | Open, delivery docs sync | Unchanged | — | README lines 64–68 |

- New or remaining finding IDs: CR-F01 (Design Impact); C-004 (docs, non-blocking)
- Material score or classification changes: category 8 (Runtime Correctness) is blocked by CR-F01. Classification: Design Impact.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - Approval waits are not separately sampled (same position, before `item/completed`).
  - The design revision must define how the next call's request boundary opens once the call end moves before the usage update.
  - Grok first-call setup time and native hidden reasoning without a count remain documented limits.

### CRR-003 — IR-002 Codex rework (D3.2) resolves CR-F01

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/code-review-report.md`
- Review entry point and round: Implementation Review, round 3
- Review scope: `Targeted Delta Review`. The changes stay within CR-F01's files and behavior, which is Codex timing only. No shared interface or data shape changed.
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `implementation-handoff.md` (IR-002); CR-F01; SCN-002, AC-004
- Relevant solution revision IDs: SR-006 (D3.2)
- Relevant architecture-review revision IDs: ARCH-REV-003 (IC-2)
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail, Design Impact (CRR-002)
- Current authoritative result: Pass
- What changed in the review result and why:
  - The Codex call now ends at the receipt of `rawResponse/completed`, with a pending reading paired by matching output count to the next model-call usage update. This matches the D3.2 pairing rule bullet for bullet.
  - IC-2 is satisfied: only reasoning/agentMessage items freeze the boundary.
  - Approval replies are boundaries.
  - Re-run checks: typecheck exit 0; Codex, fold and acceptance tests 318/318. They include live-wire replays through the real `CodexThread` with the true durations (59.5 / 72.7 tok/s on sample 1).
- Supported product scenario / material-premise basis changes: C-011 held (a no-reasoning call with a tool before the response completes is not evidenced). C-012 rejected (redundant reply mark, no wrong reading). P-004 confirmed.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-F01 | Open (Design Impact) | Resolved | SR-006, ARCH-REV-003, IR-002 | `codex-model-call-timing.ts`; `codex-model-call-timing.test.ts` live-wire replays; typecheck |
| C-001 (accepted in CRR-001) | Accepted refinement | Retired per IC-2 | ARCH-REV-003 | `OUTPUT_ITEM_TYPES` limited to reasoning/agentMessage |
| C-004 (docs) | Open, delivery docs sync | Unchanged | — | README lines 64–68 |

- New or remaining finding IDs: C-010 (new, non-blocking): at ticket finalization, the durable Codex test must stop reading the `tickets/in-progress/...` path. C-004 (docs).
- Material score or classification changes: category 8 restored to 9.0; overall 9.4/10. Classification: none (Pass).
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty:
  - live API-L04 rerun pending;
  - approval wait not yet sampled live;
  - Codex CLI without raw events gives no reading;
  - C-011 held.

### CRR-004 — Proportional test-code review after API/E2E Pass (API-REV-002)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/api-e2e-test-review-report.md`
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-execution-coverage-report.md` (API-REV-002 Pass, 95%); API-L01–L09
- Relevant solution revision IDs: SR-006
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-003, implementation review)
- Current authoritative result: Pass (test review)
- What changed in the review result and why: the one durable test changed during API/E2E (`token-meter-tps-live.e2e.test.ts`) is coherent and gated per TESTING.md. It asserts approved behavior, and the L04/L08 bounds would catch the round-1 defect. It enters through real triggers (GraphQL, WebSocket, `APPROVE_TOOL`) and cleans up its own runs and definitions.
- Supported product scenario / material-premise basis changes: none. C-011 was not observed in 4 live Codex captures (12 calls).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-F01 | Resolved in code (CRR-003) | Resolved and live-verified | API-REV-002 | `round2/live/codex/API-L04-codex-tool.json` (110 / 1,529 ms; tool excluded); `round2/live/codex-approval/API-L08-codex-approval.json` (approval wait excluded) |
| C-004 (docs) | Open, delivery | Open, delivery | — | README lines 64–68 |
| C-010 (test path) | Open, delivery finalization | Open, delivery finalization | — | `codex-model-call-timing.test.ts:18` |

- New or remaining finding IDs: none new. C-004 and C-010 go to delivery.
- Material score or classification changes: none
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - the Codex desktop journey was not run on the IR-002 build (the user has no Codex tokens; the server path is proven live in L03, L04 and L08);
  - Grok first-call setup time and native hidden reasoning without a count remain documented limits.
