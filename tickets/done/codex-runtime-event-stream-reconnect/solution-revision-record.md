# Solution Revision Record

The latest requirements, investigation notes, design spec, and runtime evidence supplement remain authoritative. This record is only the durable round and rationale index.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| `SR-001` | Solution designer initial baseline after user requirements approval | `N/A` | `Initial Baseline` | Complete solution package ready for architecture review |
| `SR-002` | Architecture reviewer / `design-review-report.md` / round 1 | `AR-F-001` | `Design Impact` | Identity-scoped turn-terminal cleanup design ready for architecture re-review |
| `SR-003` | Architecture reviewer / `design-review-report.md` / round 2 | `AR-F-002` | `Design Impact` | Codex-local stale-boundary containment and full projection regression design ready for architecture re-review |

## Revision Entries

### SR-001 — Codex retry diagnostic lifecycle correction baseline

- Triggering role, report path, and round: Solution designer; initial investigation/design round; no triggering downstream report.
- Triggering finding IDs: `N/A`
- Prior authoritative result: `N/A`
- Current authoritative result: User-approved `Design-ready` requirements and an initial implementation-ready design package, pending architecture-review decision.
- Why this baseline or revision entry is recorded: Establish the first complete solution package for the production defect where retryable Codex provider errors falsely terminalize an active AutoByteus turn and cause later native events to be discarded.
- Resolution: Localize correction to exact native `willRetry` classification in the Codex thread notification boundary and effect-aware structural cleanup in the Codex lifecycle converter. Reuse exact-turn admission, common diagnostic lifecycle, streaming, frontend projection, and current trace schemas unchanged.
- Approved behavior or requirement IDs affected: `BEH-001`, `BEH-002`, `BEH-003`; `REQ-001` through `REQ-006`; `AC-001` through `AC-007`.
- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect/requirements.md` — approved requirements basis and scope guardrail.
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect/investigation-notes.md` — completed production/code/data investigation and current path map.
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect/design-spec.md` — initial target design, spines, ownership, file mapping, removal plan, and change sequence.
- Supplemental artifacts updated, added, or removed: Added `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect/runtime-evidence.md` as approval-`N/A` production evidence.
- Downstream and architecture-review impact: Architecture reviewer should validate the local ownership/refactor decision, exact `willRetry` semantics, diagnostic tracker preservation, terminal regression boundary, and explicit rejection of reconnect/backfill work. Implementation must not begin until design review passes.
- Next recipient or routing: `/architecture_reviewer`
- Remaining gaps or risks: No blocking requirement gap is known. Approved residual risks are severe-looking retry-card presentation, future Codex protocol drift, and lack of historical backfill for already discarded events.

### SR-002 — Scope terminal converter cleanup to the identified turn

- Triggering role, report path, and round: Architecture reviewer; `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect/design-review-report.md`; `ARCH-REV-001`, round 1.
- Triggering finding IDs: `AR-F-001`
- Prior authoritative result: Architecture review `Fail` — the original `DS-004` protected diagnostics but retained run-wide reasoning/tool cleanup for every terminal turn error, allowing a late error for retired A to damage active B's converter state.
- Current authoritative result: Revised solution package ready for architecture re-review. Valid turn-terminal cleanup is exact-turn-scoped; run-wide cleanup is reserved for runtime-global terminal and genuinely unclassified errors.
- Why this baseline or revision entry is recorded: Resolve the in-scope `BEH-003`/`AC-005` design contradiction without expanding product behavior or moving ownership.
- Resolution: Extend `CodexThreadLifecycleEventConverterContext` with the converter's existing `closeReasoningBlocksForBoundary` and `clearOrderedToolsForBoundary` hooks. Validate canonical scope/effect/non-empty `turn_id`; apply no cleanup for a valid turn diagnostic, exact-turn cleanup for a valid turn terminal, and existing all-scope cleanup for runtime-global or invalid/unclassified errors. Add a joined retired-A/active-B regression that proves B reasoning and ordered-tool correlation survive A's late terminal event and close normally on B's later boundaries.
- Approved behavior or requirement IDs affected: `BEH-003`; `REQ-004`, `REQ-005`; `AC-005`. No requirement text or approval state changed.
- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect/design-spec.md` — current-state read, intended change, behavior map, `DS-004`, ownership/context/interface guidance, removal plan, file responsibilities, examples, change sequence, risks, and implementation guidance.
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect/investigation-notes.md` — recorded `ARCH-REV-001` evidence, current cleanup capabilities, and resolved re-review focus.
- Supplemental artifacts updated, added, or removed: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect/runtime-evidence.md` wording aligned to reference the completed design spec; no evidence or intended behavior changed.
- Downstream and architecture-review impact: Architecture re-review should verify exact-turn cleanup for every valid turn-terminal source, all-scope cleanup retention for runtime-global/unclassified errors, and adequacy of the joined A/B reasoning plus tool-correlation regression. All round-1 passing decisions remain unchanged.
- Next recipient or routing: `/architecture_reviewer`
- Remaining gaps or risks: No known blocking gap remains. Approved residual risks remain retry-card visual severity, future Codex protocol drift, and no historical backfill.

### SR-003 — Contain stale Codex terminal boundaries before canonical projection

- Triggering role, report path, and round: Architecture reviewer; `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect/design-review-report.md`; `ARCH-REV-002`, round 2.
- Triggering finding IDs: `AR-F-002`
- Prior authoritative result: Architecture re-review `Fail` — `AR-F-001` was resolved, but the preserved late A terminal/completion event still reached turn-blind frontend terminal handlers and completed/terminalized active B's response.
- Current authoritative result: Revised solution package ready for architecture re-review. An explicitly identified stale A terminal error, completion, or failed status is suppressed at the Codex notification boundary before thread-listener/canonical emission; B's canonical/replay/wire/projection path contains only B events and completes only on B's own boundary.
- Why this baseline or revision entry is recorded: Complete the approved `BEH-003`/`AC-005` return path through the user-visible projection without adding shared frontend policy or expanding into reconnect/replay/admission changes.
- Resolution: Use the existing `CodexThread` notification handler because it is the earliest owner with both exact native event identity and current active identity and already controls `CodexNotificationHandlingResult`. On an exact A/B mismatch for a terminal error, completion, or turn-identified failed status, perform no state mutation and return no local/native emission. Preserve matching-active, runtime-global, missing-identity conservative, and retry-diagnostic behavior. Keep the accepted `DS-004` exact-turn cleanup for emitted turn terminals. Add thread/converter regressions plus one joined test-only native-to-live-projection A/B integration proving one B response with intact tool/correlation state.
- Approved behavior or requirement IDs affected: `BEH-003`; `REQ-004`, `REQ-005`; `AC-005`, `AC-006`. No requirement text or approval state changed.
- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect/design-spec.md` — current-state read, intended change, behavior map, `DS-002`/`DS-003`, ownership/boundary rules, event/replay semantics, file/test mapping, removal plan, examples, sequence, tradeoffs, risks, and implementation guidance.
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect/investigation-notes.md` — recorded the verified frontend consequence, containment-owner evidence, affected files, and updated reviewer focus.
- Supplemental artifacts updated, added, or removed: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect/runtime-evidence.md` was aligned to distinguish correct same-turn diagnostic projection from the verified stale-terminal projection consequence; approval remains `N/A` and no new intended behavior was introduced.
- Downstream and architecture-review impact: Architecture re-review should verify the exact stale predicate, containment ownership, no-emission/replay semantics, preservation of matching/runtime-global failures, lack of frontend/non-Codex expansion, continued `DS-004` correctness, and the joined native-to-live-projection A/B regression. Implementation must not begin until review passes.
- Next recipient or routing: `/architecture_reviewer`
- Remaining gaps or risks: No known blocking gap remains. Approved residual risks remain retry-card visual severity, future Codex protocol drift, and no historical backfill. Identity-missing malformed events retain existing conservative behavior rather than being silently suppressed.
