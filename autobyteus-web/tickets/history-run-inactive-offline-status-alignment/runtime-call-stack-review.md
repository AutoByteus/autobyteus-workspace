# Proposed-Design-Based Runtime Call Stack Review

## Review Meta

- Scope Classification: `Medium`
- Current Round: `4`
- Minimum Required Rounds: `3`
- Review Mode:
  - Round 1 Diagnostic (mandatory `No-Go`)
  - Round 2 Hardening (mandatory `No-Go`)
  - Round 3 Gate Validation
  - Round 4 Deep Criteria Verification

## Review Basis

- Runtime Call Stack Document: `tickets/history-run-inactive-offline-status-alignment/proposed-design-based-runtime-call-stack.md`
- Source Design Basis: `tickets/history-run-inactive-offline-status-alignment/proposed-design.md`
- Artifact Versions In This Round:
  - Design Version: `v4`
  - Call Stack Version: `v4`
- Required Write-Backs Completed For This Round: `Yes`

## Round History

| Round | Design Version | Call Stack Version | Focus | Result (`Pass`/`Fail`) | Implementation Gate (`Go`/`No-Go`) |
| --- | --- | --- | --- | --- | --- |
| 1 | v1 | v1 | Diagnose status semantics mismatch and ownership boundaries | Fail | No-Go |
| 2 | v2 | v2 | Hardening testability + no-regression guarantees | Fail | No-Go |
| 3 | v3 | v3 | Final gate validation | Pass | Go |
| 4 | v4 | v4 | Deep criteria verification against current code/test behavior | Pass | Go |

## Round Write-Back Log (Mandatory)

| Round | Findings Requiring Updates (`Yes`/`No`) | Updated Files | Version Changes | Changed Sections | Resolved Finding IDs |
| --- | --- | --- | --- | --- | --- |
| 1 | Yes | `proposed-design.md`, `proposed-design-based-runtime-call-stack.md` | v1 -> v2 | SoC boundaries, UC-001/UC-002 stack details | F-001 |
| 2 | Yes | `proposed-design.md`, `proposed-design-based-runtime-call-stack.md` | v2 -> v3 | test coverage requirements + UC-003/UC-004 trace details | F-002 |
| 3 | No | N/A | v3 -> v3 | N/A | N/A |
| 4 | Yes | `proposed-design.md`, `proposed-design-based-runtime-call-stack.md`, `runtime-call-stack-review.md` | v3 -> v4 | Residual UX-risk note for mobile running panel semantics | F-003 |

## Per-Use-Case Review

| Use Case | Terminology & Concept Naturalness (`Pass`/`Fail`) | File/API Naming Intuitiveness (`Pass`/`Fail`) | Future-State Alignment With Proposed Design (`Pass`/`Fail`) | Use-Case Coverage Completeness (`Pass`/`Fail`) | Business Flow Completeness (`Pass`/`Fail`) | Gap Findings | Structure & SoC Check (`Pass`/`Fail`) | Dependency Flow Smells | Remove/Decommission Completeness (`Pass`/`Fail`/`N/A`) | No Legacy/Backward-Compat Branches (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | Pass | Pass | Pass | Pass | Pass | Non-blocking: mobile running panel may still show offline context | Pass | Low | Pass | Pass | Pass |
| UC-002 | Pass | Pass | Pass | Pass | Pass | None | Pass | Low | N/A | Pass | Pass |
| UC-003 | Pass | Pass | Pass | Pass | Pass | None | Pass | Low | N/A | Pass | Pass |
| UC-004 | Pass | Pass | Pass | Pass | Pass | None | Pass | Low | N/A | Pass | Pass |

## Findings

- [F-001] Use case: UC-001 | Type: Structure | Severity: Blocker | Evidence: inactive history run hydration used `AgentStatus.Idle`, conflating non-running snapshots with live-waiting runtime state. | Required update: assign inactive-open status as `AgentStatus.ShutdownComplete`.
- [F-002] Use case: UC-001/UC-002 | Type: Coverage | Severity: Blocker | Evidence: no explicit regression test guaranteeing inactive-open status mapping + no stream connect for inactive open. | Required update: add focused run-open unit coverage in `runHistoryStore.spec.ts`.
- [F-003] Use case: UC-001 | Type: UX-Semantics | Severity: Minor (Non-blocking) | Evidence: `RunningAgentsPanel` groups all in-memory contexts from `agentContextsStore.instancesByDefinition`, so opened inactive/offline contexts can appear under a running-labeled mobile panel. | Required update: none for this ticket; track as follow-up scope candidate.

## Blocking Findings Summary

- Unresolved Blocking Findings: `No`
- Remove/Decommission Checks Complete For Scoped `Remove`/`Rename/Move`: `Yes`
- Final Deep Verification Evidence:
  - `pnpm vitest stores/__tests__/runHistoryStore.spec.ts components/workspace/running/__tests__/RunningAgentsPanel.spec.ts`
  - Result: 2 files passed, 14 tests passed.

## Gate Decision

- Minimum rounds satisfied for this scope: `Yes`
- Implementation can start: `Yes`
- Gate rule checks (all required):
  - Terminology and concept vocabulary is natural/intuitive across in-scope use cases: Yes
  - File/API naming is clear and implementation-friendly across in-scope use cases: Yes
  - Future-state alignment with proposed design is `Pass` for all in-scope use cases: Yes
  - Use-case coverage completeness is `Pass` for all in-scope use cases: Yes
  - All use-case verdicts are `Pass`: Yes
  - No unresolved blocking findings: Yes
  - Required write-backs completed for the latest round: Yes
  - Remove/decommission checks complete for scoped `Remove`/`Rename/Move` changes: Yes
  - Minimum rounds satisfied: Yes
