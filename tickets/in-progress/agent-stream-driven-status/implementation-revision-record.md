# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates the initial implementation baseline.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `architecture_reviewer`; `design-review-report.md`; `ARCH-REV-002` | `N/A` (approved design resolved `ARCH-FIND-001`, `ARCH-FIND-002`) | `Initial Baseline` | `SR-002`, `ARCH-REV-002`; `CRR N/A`, `API-REV N/A`, `DR N/A` | Implemented; local implementation checks pass subject to recorded repository baseline limitations; ready for code review |

## Revision Entries

### IR-001 — Serialized run lifecycle and unified composer action baseline

- Triggering role, report path, and round: `architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-review-report.md`; `ARCH-REV-002`
- Triggering finding IDs: `N/A` for initial implementation; approved `SR-002` had already resolved `ARCH-FIND-001` and `ARCH-FIND-002`
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: Reviewed design implemented on `codex/agent-stream-driven-status`; primary implementation commit `b1e96b73f0b40427bebe07f9b4f9609007a766fe`; ready for code review.
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: Establishes the first completed implementation handoff for the approved status-only lifecycle authority and composer action policy.
- Approved behavior or requirement IDs affected: `BEH-001`–`BEH-005`; `REQ-001`–`REQ-012`; implementation-level evidence for `AC-001`–`AC-014`; `AC-015` remains downstream-owned.
- Implementation delta:
  - Replaced runtime backend outward listeners with neutral source-event batch plus internal lifecycle snapshot contracts.
  - Made `AgentRun` the sole run-owned queue/state/listener/publication boundary and moved lifecycle finalization after processors.
  - Added identified/anonymous/current/retired turn precedence, command facts, fresh snapshot reconciliation, terminal/error/offline rules, and per-event status companions.
  - Removed active-run direct status replacement, `statusOverride`, `emitLocalEvent`, duplicate converter status events, and the public interrupt-permission field.
  - Routed local run events through awaited `publishEvent` with accepted-domain failure semantics.
  - Replaced frontend lifecycle use of `isSending` with local `submissionPending`; added one primary-action resolver used by component and store guards; preserved exact interrupt routes.
  - Updated implementation-scoped unit/component fixtures and tests for the new contracts and races.
- Changed files or areas: Backend `agent-execution` domain/backends/events/services, mixed-team member status integration, stream mapping/handler, local event producers; frontend protocol/status/hydration/recovery/stores/composer; focused tests.
- Local validation and result:
  - Server build TypeScript: pass.
  - Changed server units: 32 files / 387 tests pass.
  - Viable changed frontend units/components: 18 files / 150 tests pass.
  - Targeted store lifecycle/routing cases: 5 tests pass.
  - Composer/action render set: 3 files / 20 tests pass.
  - Full changed frontend batch limitation and `nuxi typecheck` baseline errors are documented in `implementation-handoff.md`; detached baseline reproduced the same 20 store-test failures.
- Next recipient or routing: `code_reviewer`
- Remaining limitations or risks: Real multi-runtime API/E2E/WebSocket evidence, volume observation, environment-level failure injection, and docs sync remain downstream work. No implementation-owned requirement or design gap was found.
