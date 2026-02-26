# Proposed-Design-Based Runtime Call Stack Review

## Review Meta

- Scope Classification: `Medium`
- Current Round: `5`
- Minimum Required Rounds:
  - `Small`: `1`
  - `Medium`: `3`
  - `Large`: `5`
- Review Mode:
  - Round 1 Diagnostic (mandatory `No-Go`)
  - Round 2 Hardening (mandatory `No-Go`)
  - Round 3 Gate Validation
  - Round 4 Deep Criteria Review (additional)
  - Round 5 Post-Update Gate Validation (additional)

## Review Basis

- Runtime Call Stack Document: `tickets/history-run-hard-delete-memory/proposed-design-based-runtime-call-stack.md`
- Source Design Basis: `tickets/history-run-hard-delete-memory/proposed-design.md`
- Artifact Versions In This Round:
  - Design Version: `v6`
  - Call Stack Version: `v4`
- Required Write-Backs Completed For This Round: `Yes`

## Review Intent (Mandatory)

- Primary check: proposed future-state call stack is coherent, safe for destructive delete behavior, and implementable across web+server boundaries.
- Not a pass criterion: matching current code exactly (current code has no delete path).

## Round History

| Round | Design Version | Call Stack Version | Focus | Result (`Pass`/`Fail`) | Implementation Gate (`Go`/`No-Go`) |
| --- | --- | --- | --- | --- | --- |
| 1 | v3 | v1 | Diagnostic: boundary ownership and persistence correctness | Fail | No-Go |
| 2 | v4 | v2 | Hardening: security guardrails and UI eligibility constraints | Fail | No-Go |
| 3 | v5 | v3 | Gate validation across all use cases and criteria | Pass | Go |
| 4 | v5 | v3 | Deep review: strict criteria re-check + runId safety assumption stress test | Fail | No-Go |
| 5 | v6 | v4 | Post-update gate validation | Pass | Go |

## Round Write-Back Log (Mandatory)

| Round | Findings Requiring Updates (`Yes`/`No`) | Updated Files | Version Changes | Changed Sections | Resolved Finding IDs |
| --- | --- | --- | --- | --- | --- |
| 1 | Yes | `proposed-design.md`, `proposed-design-based-runtime-call-stack.md` | design `v3 -> v4`, call stack `v1 -> v2` | Change inventory, architecture overview, UC-001 call stack persistence flow | F-001 |
| 2 | Yes | `proposed-design.md`, `proposed-design-based-runtime-call-stack.md` | design `v4 -> v5`, call stack `v2 -> v3` | Security/path-safety contract, delete eligibility rules, UC-002/UC-006 branches | F-002 |
| 3 | No | N/A | `v5 -> v5`, `v3 -> v3` | N/A | N/A |
| 4 | Yes | `proposed-design.md`, `proposed-design-based-runtime-call-stack.md` | design `v5 -> v6`, call stack `v3 -> v4` | Path-safety model refinement (separator blacklist -> resolved-path containment), UC-001 safety decision frames | F-003 |
| 5 | No | N/A | `v6 -> v6`, `v4 -> v4` | N/A | N/A |

## Applied Updates By Round

- Round 1 applied updates:
  - Added explicit index-row removal design via `RunHistoryIndexStore.removeRow` to avoid full rebuild dependency.
  - Updated UC-001 runtime call stack to include `removeRow` persistence step.
- Round 2 applied updates:
  - Added strict runId/path-safety guard contract in service design.
  - Constrained frontend delete icon to inactive persisted rows only and modeled cancel path explicitly.
- Round 3 applied updates:
  - No blocking findings; no write-back required.
- Round 4 applied updates:
  - Replaced ambiguous separator-blacklist wording with resolved-path containment + root-delete guard.
  - Updated UC-001 runtime call stack with containment decision gates.
- Round 5 applied updates:
  - No blocking findings; no write-back required.

## Per-Use-Case Review

| Use Case | Terminology & Concept Naturalness (`Pass`/`Fail`) | File/API Naming Intuitiveness (`Pass`/`Fail`) | Future-State Alignment With Proposed Design (`Pass`/`Fail`) | Use-Case Coverage Completeness (`Pass`/`Fail`) | Business Flow Completeness (`Pass`/`Fail`) | Gap Findings | Structure & SoC Check (`Pass`/`Fail`) | Dependency Flow Smells | Remove/Decommission Completeness (`Pass`/`Fail`/`N/A`) | No Legacy/Backward-Compat Branches (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | Pass | Pass | Pass | Pass | Pass | None | Pass | Low | N/A | Pass | Pass |
| UC-002 | Pass | Pass | Pass | Pass | Pass | None | Pass | Low | N/A | Pass | Pass |
| UC-003 | Pass | Pass | Pass | Pass | Pass | None | Pass | Medium (selection/context coupling) | N/A | Pass | Pass |
| UC-004 | Pass | Pass | Pass | Pass | Pass | None | Pass | Low | N/A | Pass | Pass |
| UC-005 | Pass | Pass | Pass | Pass | Pass | None | Pass | Low | N/A | Pass | Pass |
| UC-006 | Pass | Pass | Pass | Pass | Pass | None | Pass | Low | N/A | Pass | Pass |

## Findings

- [F-001] Use case: UC-001 | Type: Structure | Severity: Blocker | Evidence: delete flow depended on full index rebuild, coupling destructive path to unrelated run scanning. | Required update: add direct index row removal API and update call stacks accordingly. | Status: Resolved
- [F-002] Use case: UC-001/UC-002/UC-006 | Type: Security/Gap | Severity: Blocker | Evidence: initial design lacked explicit runId path-safety guard and did not model confirmation-cancel path as first-class branch. | Required update: add safe-path validation contract and explicit cancel branch + UI eligibility constraints. | Status: Resolved
- [F-003] Use case: UC-001 | Type: Security/Future-State Alignment | Severity: Blocker | Evidence: prior wording implied separator blacklist enforcement, but current runtime ID construction does not centrally sanitize all characters; blacklist-first interpretation can produce inconsistent delete behavior for historical IDs. | Required update: define safety as resolved-path containment under `agentsRoot` + root-delete guard, then update UC-001 call stack. | Status: Resolved

## Blocking Findings Summary

- Unresolved Blocking Findings: `No`
- Remove/Decommission Checks Complete For Scoped `Remove`/`Rename/Move`: `N/A`
- Findings Trend Across Rounds: improved and localized (`2 blockers -> 1 blocker -> 0 -> 1 -> 0`), with late blocker fully resolved in the next round.

## Gate Decision

- Minimum rounds satisfied for this scope: `Yes`
- Implementation can start: `Yes`
- Gate rule checks (all must be `Yes` for `Implementation can start = Yes`):
  - Terminology and concept vocabulary is natural/intuitive across in-scope use cases: Yes
  - File/API naming is clear and implementation-friendly across in-scope use cases: Yes
  - Future-state alignment with proposed design is `Pass` for all in-scope use cases: Yes
  - Use-case coverage completeness is `Pass` for all in-scope use cases: Yes
  - All use-case verdicts are `Pass`: Yes
  - No unresolved blocking findings: Yes
  - Required write-backs completed for the latest round: Yes
  - Remove/decommission checks complete for scoped `Remove`/`Rename/Move` changes: N/A
  - Minimum rounds satisfied: Yes
- Additional scope rules:
  - Scope is `Medium`; mandatory No-Go rounds (1-2) were enforced.
- If `No`, required refinement actions:
  - N/A
