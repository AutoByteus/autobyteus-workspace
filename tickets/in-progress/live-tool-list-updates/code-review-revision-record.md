# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review / IR-001 | N/A | Fail (9.2/10): Design Impact → Solution Designer | CR-001, CR-002, CR-003 |
| CRR-002 | `code-review-report.md` | Implementation Review / IR-002 (Full Re-Audit) | Fail (CRR-001) | Fail (9.3/10): Local Fix → Implementation | CR-001…CR-003 resolved; CR-004 new |

## Revision Entries

### CRR-001 — Live tool list updates: restart action for a Team member undecided; two local fixes

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-001)
- Relevant solution revision IDs: SR-001…SR-004
- Relevant architecture-review revision IDs: ARCH-REV-001…ARCH-REV-004
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail`
- What changed in the review result and why: the initial result. DS-001…DS-006 are implemented as designed and traced correct, including the Codex retry premise (E-12). Findings:
  - CR-001: the Team-member restart stops the whole Team and does not restore it. That contradicts REQ-010/AC-007, and the design has no member restart.
  - CR-002: `claude-session.ts` goes over 500 lines.
  - CR-003: an unreachable `?? "."` fallback in the Grok reopen.
- Supported product scenario / material-premise basis changes: SCN-004-TEAM added (supported, promoted); MP-CODEX-RETRY confirmed

#### Prior Finding Resolution

None

- New or remaining finding IDs: CR-001, CR-002, CR-003
- Material score or classification changes: N/A (initial)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: Codex and Grok live runs owed (DEC-004); the Claude approval prompt for a removed tool in the brief re-list window (C-07)

### CRR-002 — Rework accepted; a duplicate Team-stream error introduced by the SR-009 observer

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Full Re-Audit`. The delta reached files outside the prior findings: the collaboration handle, the shared reopen helper, and the web removals
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-002)
- Relevant solution revision IDs: SR-005…SR-009
- Relevant architecture-review revision IDs: ARCH-REV-005…ARCH-REV-009
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-001 `Fail`
- Current authoritative result: `Fail`, `Local Fix` owned by implementation
- What changed in the review result and why: CR-001 was resolved upstream (DEC-008, DEC-009) and its code removed (completion grep empty). CR-002 and CR-003 are resolved. New CR-004: `ConfiguredAgentExecutionHandle.postMessage`'s observer republishes a run `ERROR` for every `failed` fact, including the run-published turn and runtime failures that `bindEvents` already forwards. So a Team member's failed turn shows its error twice. Proven by a temporary probe (`evidence/CRR-002-probe-team-member-duplicate-error.log`)
- Supported product scenario / material-premise basis changes: SCN-TEAM-TURN-ERROR added (supported normal). The SR-009 "no single-run duplicate" premise is reclassified for the Team stream

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Design Impact) | Resolved | SR-005…SR-009, ARCH-REV-009, IR-002 (`c4da95428e`) | Requirements REQ-010/AC-007 (SR-007); completion grep empty; five web files identical to base |
| CR-002 | Open | Resolved | IR-002 | `claude-session.ts` 490 effective lines; logic in `ClaudeAgentToolsMcpSessionState` |
| CR-003 | Open | Resolved | IR-002 | `AcpAgentRunBackendInput.workingDirectory: string`, no fallback |

- New or remaining finding IDs: CR-004
- Material score or classification changes: 9.2 → 9.3; classification Design Impact → Local Fix
- Recommended recipient: Implementation Engineer
- Remaining risks or uncertainty: as round 1 (Codex and Grok live runs owed; C-07)
