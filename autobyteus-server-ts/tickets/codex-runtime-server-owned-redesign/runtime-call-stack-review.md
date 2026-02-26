# Proposed-Design-Based Runtime Call Stack Review

## Review Meta

- Scope Classification: `Medium`
- Current Round: `33`
- Minimum Required Rounds:
  - `Small`: `1`
  - `Medium`: `3`
  - `Large`: `5`
- Review Mode:
  - `Round 1 Diagnostic (Medium/Large mandatory, must be No-Go)`
  - `Round 2 Hardening (Medium/Large mandatory, must be No-Go)`
  - `Gate Validation Round (Round >= 3 for Medium, Round >= 5 for Large)`

## Review Basis

- Runtime Call Stack Document: `tickets/codex-runtime-server-owned-redesign/proposed-design-based-runtime-call-stack.md`
- Source Design Basis: `tickets/codex-runtime-server-owned-redesign/proposed-design.md`
- Artifact Versions In This Round:
  - Design Version: `v18`
  - Call Stack Version: `v18`
- Required Write-Backs Completed For This Round: `Yes`

## Review Intent (Mandatory)

- Validate future-state runtime call stack completeness, structure, naming clarity, and decommission readiness.

## Round History

| Round | Design Version | Call Stack Version | Focus | Result (`Pass`/`Fail`) | Implementation Gate (`Go`/`No-Go`) |
| --- | --- | --- | --- | --- | --- |
| 1 | v1 | v1 | Diagnostic: boundary and migration gaps | Fail | No-Go |
| 2 | v2 | v2 | Hardening: override semantics, route-level determinism, decommission closure | Fail | No-Go |
| 3 | v3 | v3 | Gate validation | Pass | Go |
| 4 | v3 | v3 | Deep review: websocket runtime-event identity/correlation guarantees | Fail | No-Go |
| 5 | v4 | v4 | Gate re-validation after event-envelope write-back | Pass | Go |
| 6 | v4 | v4 | Deep review: websocket/persistence event identity parity | Fail | No-Go |
| 7 | v5 | v5 | Gate re-validation after persistence parity write-back | Pass | Go |
| 8 | v5 | v5 | Deep review: persistence-before-mapping ordering for UC-006 | Fail | No-Go |
| 9 | v6 | v6 | Gate re-validation after persist-first stream ordering write-back | Pass | Go |
| 10 | v6 | v6 | Deep review: run-scoped sequence monotonicity across reconnect/multi-session | Fail | No-Go |
| 11 | v7 | v7 | Gate re-validation after run-scoped sequence ledger write-back | Pass | Go |
| 12 | v7 | v7 | Deep review: duplicate per-session stream consumption for same run | Fail | No-Go |
| 13 | v8 | v8 | Gate re-validation after per-run fanout hub write-back | Pass | Go |
| 14 | v8 | v8 | Deep review: fanout subscriber failure isolation and worker cleanup semantics | Fail | No-Go |
| 15 | v9 | v9 | Gate re-validation after fanout isolation/cleanup write-back | Pass | Go |
| 16 | v9 | v9 | Deep review: zero-subscriber active-run lifecycle semantics | Fail | No-Go |
| 17 | v10 | v10 | Gate re-validation after headless-mode/orphan-timeout write-back | Pass | Go |
| 18 | v10 | v10 | Deep review: separation-of-concerns and naming naturalness for fanout/worker modules | Fail | No-Go |
| 19 | v11 | v11 | Gate re-validation after orchestrator/subscriber-hub split and rename write-back | Pass | Go |
| 20 | v11 | v11 | Deep review: rename/move decommission closure for fanout module references | Fail | No-Go |
| 21 | v12 | v12 | Gate re-validation after decommission cleanup write-back | Pass | Go |
| 22 | v12 | v12 | Deep review: reconnect catch-up completeness for missed events during disconnect | Fail | No-Go |
| 23 | v13 | v13 | Gate re-validation after reconnect catch-up write-back | Pass | Go |
| 24 | v13 | v13 | Deep review: reconnect replay/live handoff race when worker already active | Fail | No-Go |
| 25 | v14 | v14 | Gate re-validation after replay-watermark + pending-buffer handoff write-back | Pass | Go |
| 26 | v14 | v14 | Deep review: replay-abort cleanup determinism for pending reconnect sessions | Fail | No-Go |
| 27 | v15 | v15 | Gate re-validation after replay-abort cleanup write-back | Pass | Go |
| 28 | v15 | v15 | Deep review: phase-aware cleanup correctness across activation and worker-start failure | Fail | No-Go |
| 29 | v16 | v16 | Gate re-validation after phase-aware connect-abort cleanup write-back | Pass | Go |
| 30 | v16 | v16 | Deep review: connect/disconnect race idempotency across reconnect attempts | Fail | No-Go |
| 31 | v17 | v17 | Gate re-validation after attempt-scoped cleanup idempotency write-back | Pass | Go |
| 32 | v17 | v17 | Deep review: replay-abort contract drift between design error policy and call stack API | Fail | No-Go |
| 33 | v18 | v18 | Gate re-validation after replay-abort contract alignment write-back | Pass | Go |

## Round Write-Back Log (Mandatory)

| Round | Findings Requiring Updates (`Yes`/`No`) | Updated Files | Version Changes | Changed Sections | Resolved Finding IDs |
| --- | --- | --- | --- | --- | --- |
| 1 | Yes | `proposed-design.md`, `proposed-design-based-runtime-call-stack.md` | design `v1 -> v2`, call stack `v1 -> v2` | change inventory, architecture overview, UC-001/003/005, decommission plan | F-001, F-002, F-003 |
| 2 | Yes | `proposed-design.md`, `proposed-design-based-runtime-call-stack.md` | design `v2 -> v3`, call stack `v2 -> v3` | active-run override policy, websocket pre-connect policy, UC-003/006/007 runtime paths | F-004, F-005, F-006 |
| 3 | No | N/A | N/A | N/A | N/A |
| 4 | Yes | `proposed-design.md`, `proposed-design-based-runtime-call-stack.md` | design `v3 -> v4`, call stack `v3 -> v4` | goals, change inventory C-025/C-026, UC-006 event flow | F-007 |
| 5 | No | N/A | N/A | N/A | N/A |
| 6 | Yes | `proposed-design.md`, `proposed-design-based-runtime-call-stack.md` | design `v4 -> v5`, call stack `v4 -> v5` | change inventory C-027, UC-006 persistence path parity | F-008 |
| 7 | No | N/A | N/A | N/A | N/A |
| 8 | Yes | `proposed-design.md`, `proposed-design-based-runtime-call-stack.md` | design `v5 -> v6`, call stack `v5 -> v6` | architecture overview, C-028, UC-006 persist-first ordering | F-009 |
| 9 | No | N/A | N/A | N/A | N/A |
| 10 | Yes | `proposed-design.md`, `proposed-design-based-runtime-call-stack.md` | design `v6 -> v7`, call stack `v6 -> v7` | C-029 sequence ledger, UC-006 reconnect path and sequence conflict path | F-010 |
| 11 | No | N/A | N/A | N/A | N/A |
| 12 | Yes | `proposed-design.md`, `proposed-design-based-runtime-call-stack.md` | design `v7 -> v8`, call stack `v7 -> v8` | C-030 fanout hub, UC-006 single-worker flow and multi-session subscribe path | F-011 |
| 13 | No | N/A | N/A | N/A | N/A |
| 14 | Yes | `proposed-design.md`, `proposed-design-based-runtime-call-stack.md` | design `v8 -> v9`, call stack `v8 -> v9` | C-031 fanout isolation/cleanup semantics, UC-006 subscriber error/terminal cleanup paths | F-012 |
| 15 | No | N/A | N/A | N/A | N/A |
| 16 | Yes | `proposed-design.md`, `proposed-design-based-runtime-call-stack.md` | design `v9 -> v10`, call stack `v9 -> v10` | C-032 zero-subscriber lifecycle policy, UC-006 headless persistence/orphan-timeout paths | F-013 |
| 17 | No | N/A | N/A | N/A | N/A |
| 18 | Yes | `proposed-design.md`, `proposed-design-based-runtime-call-stack.md` | design `v10 -> v11`, call stack `v10 -> v11` | C-030..C-033 worker/fanout split, UC-006 boundary + naming updates | F-014 |
| 19 | No | N/A | N/A | N/A | N/A |
| 20 | Yes | `proposed-design.md`, `proposed-design-based-runtime-call-stack.md` | design `v11 -> v12`, call stack `v11 -> v12` | C-034 decommission gate, cleanup verification for renamed fanout module | F-015 |
| 21 | No | N/A | N/A | N/A | N/A |
| 22 | Yes | `proposed-design.md`, `proposed-design-based-runtime-call-stack.md` | design `v12 -> v13`, call stack `v12 -> v13` | C-035..C-037 reconnect catch-up flow and cursor error paths | F-016 |
| 23 | No | N/A | N/A | N/A | N/A |
| 24 | Yes | `proposed-design.md`, `proposed-design-based-runtime-call-stack.md` | design `v13 -> v14`, call stack `v13 -> v14` | C-038..C-040 replay watermark + pending-buffer activation contract for UC-006 | F-017 |
| 25 | No | N/A | N/A | N/A | N/A |
| 26 | Yes | `proposed-design.md`, `proposed-design-based-runtime-call-stack.md` | design `v14 -> v15`, call stack `v14 -> v15` | C-041..C-043 replay-abort classification and pending-session cleanup contract | F-018 |
| 27 | No | N/A | N/A | N/A | N/A |
| 28 | Yes | `proposed-design.md`, `proposed-design-based-runtime-call-stack.md` | design `v15 -> v16`, call stack `v15 -> v16` | C-044..C-045 phase-aware connect-abort cleanup semantics | F-019 |
| 29 | No | N/A | N/A | N/A | N/A |
| 30 | Yes | `proposed-design.md`, `proposed-design-based-runtime-call-stack.md` | design `v16 -> v17`, call stack `v16 -> v17` | C-046..C-047 connect-attempt idempotency and stale-cleanup guards | F-020 |
| 31 | No | N/A | N/A | N/A | N/A |
| 32 | Yes | `proposed-design.md`, `proposed-design-based-runtime-call-stack.md` | design `v17 -> v18`, call stack `v17 -> v18` | replay-abort error policy alignment to `abortConnectSession({ connectAttemptId, phase: \"pending\" })` | F-021 |
| 33 | No | N/A | N/A | N/A | N/A |

## Per-Use-Case Review

| Use Case | Terminology & Concept Naturalness (`Pass`/`Fail`) | File/API Naming Intuitiveness (`Pass`/`Fail`) | Future-State Alignment With Proposed Design (`Pass`/`Fail`) | Use-Case Coverage Completeness (`Pass`/`Fail`) | Business Flow Completeness (`Pass`/`Fail`) | Gap Findings | Structure & SoC Check (`Pass`/`Fail`) | Dependency Flow Smells | Remove/Decommission Completeness (`Pass`/`Fail`/`N/A`) | No Legacy/Backward-Compat Branches (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | Pass | Pass | Pass | Pass | Pass | None | Pass | None | Pass | Pass | Pass |
| UC-002 | Pass | Pass | Pass | Pass | Pass | None | Pass | None | Pass | Pass | Pass |
| UC-003 | Pass | Pass | Pass | Pass | Pass | None | Pass | None | Pass | Pass | Pass |
| UC-004 | Pass | Pass | Pass | Pass | Pass | None | Pass | None | Pass | Pass | Pass |
| UC-005 | Pass | Pass | Pass | Pass | Pass | None | Pass | None | Pass | Pass | Pass |
| UC-006 | Pass | Pass | Pass | Pass | Pass | None | Pass | None | Pass | Pass | Pass |
| UC-007 | Pass | Pass | Pass | Pass | Pass | None | Pass | None | Pass | Pass | Pass |
| UC-008 | Pass | Pass | Pass | Pass | Pass | None | Pass | None | Pass | Pass | Pass |

## Findings

- `F-007` (`Resolved`): UC-006 lacked explicit runtime-event identity/correlation contract (`eventId`, `sequence`, `occurredAt`) before websocket mapping, creating replay/dedupe ambiguity for clients.
- `F-008` (`Resolved`): UC-006 mapped normalized runtime envelopes to websocket but persisted raw runtime events to run-history, creating identity divergence risk between delivered and stored event trails.
- `F-009` (`Resolved`): UC-006 mapping occurred before persistence, allowing mapper failures to skip event persistence and break audit/history completeness guarantees.
- `F-010` (`Resolved`): UC-006 sequence state was session-scoped in design, conflicting with run-scoped event identity and risking duplicate/non-monotonic `eventId` across reconnects or concurrent sessions.
- `F-011` (`Resolved`): UC-006 allowed per-session runtime stream consumption for one run, risking duplicate persistence/events; replaced with single per-run stream worker plus subscriber fanout.
- `F-012` (`Resolved`): UC-006 fanout model lacked per-subscriber failure isolation and deterministic terminal cleanup, allowing one socket failure to destabilize run delivery lifecycle and leak worker state.
- `F-013` (`Resolved`): UC-006 did not define behavior when subscriber count dropped to zero during active runs, risking either event-loss (if worker stopped) or orphan leaks (if worker never cleaned).
- `F-014` (`Resolved`): `runtime-event-fanout-hub` mixed run-worker orchestration and subscriber delivery concerns, and its name no longer reflected a single responsibility; split into `runtime-run-stream-orchestrator` and `runtime-event-subscriber-hub`.
- `F-015` (`Resolved`): Rename/move from `runtime-event-fanout-hub` to `runtime-event-subscriber-hub` lacked explicit decommission closure verification, risking stale references and split naming paths.
- `F-016` (`Resolved`): Reconnect path reattached live workers but lacked a catch-up replay contract for persisted events missed while disconnected, leaving a business-flow gap in UC-006.
- `F-017` (`Resolved`): Reconnect catch-up replay still had a race window; events emitted while replay was in progress could be missed between history-read and live activation when a run worker was already active.
- `F-018` (`Resolved`): Reconnect replay abort path lacked deterministic pending-session cleanup; disconnect/send failures during replay could leak pending buffers/session state and cause unstable reconnect behavior.
- `F-019` (`Resolved`): Connect flow cleanup was not phase-aware; worker-start failures after activation could incorrectly use pending cleanup, leaving active subscriber state inconsistent.
- `F-020` (`Resolved`): Connect/disconnect race lacked attempt-scoped idempotency, so stale cleanup from an older connect attempt could interfere with newer reconnect state.
- `F-021` (`Resolved`): Design error-handling policy drifted from the call stack/API contract by referencing `cancelPending` instead of attempt-scoped `abortConnectSession`, creating implementation ambiguity in a critical reconnect failure path.

## Blocking Findings Summary

- Unresolved Blocking Findings: `No`
- Remove/Decommission Checks Complete For Scoped `Remove`/`Rename/Move`: `Yes`

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
  - Remove/decommission checks complete for scoped `Remove`/`Rename/Move` changes: Yes
  - Minimum rounds satisfied: Yes
- Additional scope rules:
  - If scope is `Medium` and `Current Round < 3`, gate is always `No-Go` even if no findings.
- If `No`, required refinement actions:
  - N/A
