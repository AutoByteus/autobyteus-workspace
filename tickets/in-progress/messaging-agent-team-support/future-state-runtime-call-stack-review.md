# Future-State Runtime Call Stack Review

Use this document as the pre-implementation gate for future-state runtime-call-stack quality and use-case completeness.
This review validates alignment with target (`to-be`) design behavior, not parity with current (`as-is`) code.

## Review Meta

- Scope Classification: `Medium`
- Current Round: `9`
- Current Review Type: `Deep Review`
- Clean-Review Streak Before This Round: `2`
- Clean-Review Streak After This Round: `0`
- Round State: `No-Go`
- Missing-Use-Case Discovery Sweep Completed This Round: `Yes`
- New Use Cases Discovered This Round: `Yes`
- This Round Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`): `Design Impact`
- Required Re-Entry Path Before Next Round: `1 -> 2 -> 3 -> 4 -> 5`

## Review Basis

- Requirements: `tickets/in-progress/messaging-agent-team-support/requirements.md` (status `Refined`)
- Runtime Call Stack Document: `tickets/in-progress/messaging-agent-team-support/future-state-runtime-call-stack.md`
- Source Design Basis:
  - `Medium/Large`: `tickets/in-progress/messaging-agent-team-support/proposed-design.md`
- Artifact Versions In This Round:
  - Requirements Status: `Refined`
  - Design Version: `v6`
  - Call Stack Version: `v6`
- Required Persisted Artifact Updates Completed For This Round: `Yes`

## Review Intent (Mandatory)

- Primary check: Is the future-state runtime call stack a coherent and implementable future-state model?
- Not a pass criterion: matching current-code call paths exactly.
- Shared-principles rule: review uses the same architecture principles as design (`SoC` is cause, `layering` is an emergent result, `decoupling` enforces one-way replaceable boundaries).
- Not a required action: adding or removing layers by default; `Keep` can pass when layering is coherent and boundary placement is clear.
- Layering extraction trigger rule: if coordination policy repeats across callers (provider selection/fallback/retry/aggregation/routing/fan-out), review should require orchestration or manager extraction.
- Anti-overlayering rule: fail a new layer that is only pass-through and owns no policy or boundary concern.
- Local-fix-is-not-enough rule: if a fix works functionally but degrades architecture or responsibility boundaries, mark `Fail` and require architectural artifact updates via classified re-entry.
- Any finding with a required design or call-stack update is blocking.
- No-backward-compat review rule: if future-state behavior keeps compatibility wrappers, dual-path logic, or legacy fallback branches for old flows, mark `Fail`.
- Decoupling review rule: if future-state behavior introduces tight coupling, bidirectional dependency tangles, or unjustified cycles, mark `Fail`.

## Round History

| Round | Requirements Status | Design Version | Call Stack Version | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Clean Streak After Round | Round State | Gate (`Go`/`No-Go`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Design-ready | v2 | v2 | No | No | N/A | N/A | None | 1 | Candidate Go | Go |
| 2 | Design-ready | v2 | v2 | No | No | N/A | N/A | None | 2 | Go Confirmed | Go |
| 3 | Refined | v3 | v3 | Yes | Yes (`UC-007`) | Yes | Requirement Gap | `2 -> 3 -> 4 -> 5` | 0 | No-Go | No-Go |
| 4 | Refined | v3 | v3 | No | No | N/A | N/A | None | 1 | Candidate Go | Go |
| 5 | Refined | v3 | v3 | No | No | Yes | N/A | None | 2 | Go Confirmed | Go |
| 6 | Refined | v4 | v4 | Yes | Yes (`UC-008`) | Yes | Requirement Gap | `2 -> 3 -> 4 -> 5` | 0 | No-Go | No-Go |
| 7 | Refined | v4 | v4 | No | No | Yes | N/A | None | 2 | Go Confirmed | Go |
| 8 | Refined | v5 | v5 | No | No | Yes | N/A | None | 3 | Go Confirmed | Go |
| 9 | Refined | v6 | v6 | Yes | Yes (`UC-011`, `UC-012`) | Yes | Design Impact | `1 -> 2 -> 3 -> 4 -> 5` | 0 | No-Go | No-Go |

## Round Artifact Update Log (Mandatory)

| Round | Findings Requiring Updates (`Yes`/`No`) | Updated Files | Version Changes | Changed Sections | Resolved Finding IDs |
| --- | --- | --- | --- | --- | --- |
| 1 | No | `tickets/in-progress/messaging-agent-team-support/proposed-design.md`, `tickets/in-progress/messaging-agent-team-support/future-state-runtime-call-stack.md` | design `v2`, call stack `v2` | Definition-bound TEAM design, reusable team-launch orchestration, runtime modeling | None |
| 2 | No | None | None | None | None |
| 3 | Yes | `tickets/in-progress/messaging-agent-team-support/investigation-notes.md`, `tickets/in-progress/messaging-agent-team-support/requirements.md`, `tickets/in-progress/messaging-agent-team-support/proposed-design.md`, `tickets/in-progress/messaging-agent-team-support/future-state-runtime-call-stack.md` | requirements `Design-ready -> Refined`, design `v2 -> v3`, call stack `v2 -> v3` | TEAM current-process bot-owned active-run parity, cached-run ownership semantics, restart reconnect modeling | F-001, F-002 |
| 4 | No | None | None | None | None |
| 5 | No | None | None | None | None |
| 6 | Yes | `tickets/in-progress/messaging-agent-team-support/investigation-notes.md`, `tickets/in-progress/messaging-agent-team-support/requirements.md`, `tickets/in-progress/messaging-agent-team-support/proposed-design.md`, `tickets/in-progress/messaging-agent-team-support/future-state-runtime-call-stack.md` | design `v3 -> v4`, call stack `v3 -> v4` | Live team left-tree selection parity, subscribed-local-context fast path, non-live reopen fallback | F-003 |
| 7 | No | None | None | None | None |
| 8 | No | `tickets/in-progress/messaging-agent-team-support/proposed-design.md`, `tickets/in-progress/messaging-agent-team-support/future-state-runtime-call-stack.md` | design `v4 -> v5`, call stack `v4 -> v5` | Side-effect-free history refresh, backend active-runtime source, explicit subscription reconciliation | None |
| 9 | Yes | `tickets/in-progress/messaging-agent-team-support/investigation-notes.md`, `tickets/in-progress/messaging-agent-team-support/requirements.md`, `tickets/in-progress/messaging-agent-team-support/proposed-design.md`, `tickets/in-progress/messaging-agent-team-support/future-state-runtime-call-stack.md`, `tickets/in-progress/messaging-agent-team-support/future-state-runtime-call-stack-review.md` | design `v5 -> v6`, call stack `v5 -> v6` | Runtime-aware history-source boundary, standalone history metadata/resume normalization, team-member history-source routing | F-005 |

## Missing-Use-Case Discovery Log (Mandatory Per Round)

| Round | Discovery Lens | New Use Case IDs (`None` if no new case) | Source Type (`Requirement`/`Design-Risk`) | Why Previously Missing | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Upstream Update Required |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Requirement coverage / boundary crossing / fallback-error / design-risk | None | N/A | N/A | N/A | No |
| 2 | Requirement coverage / boundary crossing / fallback-error / design-risk | None | N/A | N/A | N/A | No |
| 3 | Requirement coverage / boundary crossing / fallback-error / design-risk | `UC-007` | Requirement | Manual restart verification showed the selected workspace-page live context can stay offline because reconnect scheduling stops after a failed reconnect close, and the lifecycle rule narrowed from resumable reuse to current-process bot-owned active-run reuse | Requirement Gap | Yes |
| 4 | Requirement coverage / boundary crossing / fallback-error / design-risk | None | N/A | N/A | N/A | No |
| 5 | Requirement coverage / boundary crossing / fallback-error / design-risk | None | N/A | N/A | N/A | No |
| 6 | Requirement coverage / boundary crossing / fallback-error / design-risk | `UC-008` | Requirement | Manual workspace verification showed that clicking `Professor`/`Student` in the left tree reopens an already subscribed live team from persisted projection, resetting live state and making the run look historical/offline | Requirement Gap | Yes |
| 7 | Requirement coverage / boundary crossing / fallback-error / design-risk | None | N/A | N/A | N/A | No |
| 8 | Requirement coverage / boundary crossing / fallback-error / design-risk | None | N/A | N/A | N/A | No |
| 9 | Requirement coverage / boundary crossing / fallback-error / design-risk | `UC-011`, `UC-012` | Requirement | The v5 model already made projection runtime-aware, but it still left shared run-history metadata and resume semantics above that boundary, allowing local manifest and standalone-member assumptions to leak into shared history services | Design Impact | Yes |

## Per-Use-Case Review

| Use Case | Architecture Fit (`Pass`/`Fail`) | Shared-Principles Alignment (`Pass`/`Fail`) | Layering Fitness (`Pass`/`Fail`) | Boundary Placement (`Pass`/`Fail`) | Decoupling Check (`Pass`/`Fail`) | Module/File Placement Alignment (`Pass`/`Fail`) | Existing-Structure Bias Check (`Pass`/`Fail`) | Anti-Hack Check (`Pass`/`Fail`) | Local-Fix Degradation Check (`Pass`/`Fail`) | Terminology & Concept Naturalness (`Pass`/`Fail`) | File/API Naming Clarity (`Pass`/`Fail`) | Name-to-Responsibility Alignment Under Scope Drift (`Pass`/`Fail`) | Future-State Alignment With Design Basis (`Pass`/`Fail`) | Use-Case Coverage Completeness (`Pass`/`Fail`) | Use-Case Source Traceability (`Pass`/`Fail`) | Design-Risk Justification Quality (`Pass`/`Fail`/`N/A`) | Business Flow Completeness (`Pass`/`Fail`) | Layer-Appropriate SoC Check (`Pass`/`Fail`) | Dependency Flow Smells | Redundancy/Duplication Check (`Pass`/`Fail`) | Simplification Opportunity Check (`Pass`/`Fail`) | Remove/Decommission Completeness (`Pass`/`Fail`/`N/A`) | Legacy Retention Removed (`Pass`/`Fail`) | No Compatibility Wrappers/Dual Paths (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | None | Pass | Pass | N/A | Pass | Pass | Pass |
| UC-002 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | None | Pass | Pass | N/A | Pass | Pass | Pass |
| UC-003 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | None | Pass | Pass | N/A | Pass | Pass | Pass |
| UC-004 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | None | Pass | Pass | N/A | Pass | Pass | Pass |
| UC-005 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | None | Pass | Pass | N/A | Pass | Pass | Pass |
| UC-006 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | None | Pass | Pass | N/A | Pass | Pass | Pass |
| UC-007 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | None | Pass | Pass | N/A | Pass | Pass | Pass |
| UC-008 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | None | Pass | Pass | N/A | Pass | Pass | Pass |
| UC-009 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | None | Pass | Pass | N/A | Pass | Pass | Pass |
| UC-010 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | None | Pass | Pass | N/A | Pass | Pass | Pass |
| UC-011 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | None | Pass | Pass | N/A | Pass | Pass | Pass |
| UC-012 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | None | Pass | Pass | N/A | Pass | Pass | Pass |

## Findings

- [F-001] Requirement Gap: cached TEAM reuse semantics were too broad. The previous runtime call stack allowed reuse of an inactive resumable cached `teamRunId`, which does not match the clarified AGENT-parity requirement.
- [F-002] Requirement Gap: restart-time reconnect behavior for selected live contexts was not modeled. The previous call stack did not include the failed-reconnect-close path that can keep the workspace page offline after a backend restart.
- [F-003] Requirement Gap: subscribed live team selection was not modeled. The previous call stack allowed every left-tree member click to reopen from persisted projection, which resets live team state instead of only retargeting focus within the active team context.
- [F-004] Design Impact: history refresh still owned active-run recovery. That made a persisted-history poll reconnect live sockets and churn websocket attachments, so v5 separates history loading from active-runtime synchronization.
- [F-005] Design Impact: runtime-aware logic stopped too low in the history stack. v5 normalized projection retrieval, but shared history metadata and resume semantics still leaked local manifest and standalone-member assumptions; v6 extends the boundary into a broader runtime-aware history-source layer and adds explicit standalone/team-member history use cases.

## Blocking Findings Summary

- Unresolved Blocking Findings: `No`
- Remove/Decommission Checks Complete For Scoped `Remove`/`Rename/Move`: `Yes`

## Gate Decision

- Implementation can start: `No`
- Clean-review streak at end of this round: `0`
- Gate rule checks (all must be `Yes` for `Implementation can start = Yes`):
  - Architecture fit is `Pass` for all in-scope use cases: `Yes`
  - Shared-principles alignment is `Pass` for all in-scope use cases: `Yes`
  - Layering fitness is `Pass` for all in-scope use cases: `Yes`
  - Boundary placement is `Pass` for all in-scope use cases: `Yes`
  - Decoupling check is `Pass` for all in-scope use cases: `Yes`
  - Module/file placement alignment is `Pass` for all in-scope use cases: `Yes`
  - Existing-structure bias check is `Pass` for all in-scope use cases: `Yes`
  - Anti-hack check is `Pass` for all in-scope use cases: `Yes`
  - Local-fix degradation check is `Pass` for all in-scope use cases: `Yes`
  - Terminology and concept vocabulary is natural/intuitive across in-scope use cases: `Yes`
  - File/API naming clarity is `Pass` across in-scope use cases: `Yes`
  - Name-to-responsibility alignment under scope drift is `Pass` across in-scope use cases: `Yes`
  - Future-state alignment with target design basis is `Pass` for all in-scope use cases: `Yes`
  - Layer-appropriate structure and separation of concerns is `Pass` for all in-scope use cases: `Yes`
  - Use-case coverage completeness is `Pass` for all in-scope use cases: `Yes`
  - Use-case source traceability is `Pass` for all in-scope use cases: `Yes`
  - Requirement coverage closure is `Pass`: `Yes`
  - Redundancy/duplication check is `Pass` for all in-scope use cases: `Yes`
  - Simplification opportunity check is `Pass` for all in-scope use cases: `Yes`
  - All use-case verdicts are `Pass`: `Yes`
  - No unresolved blocking findings: `Yes`
  - Required persisted artifact updates completed for this round: `Yes`
  - Missing-use-case discovery sweep completed for this round: `Yes`
  - No newly discovered use cases in this round: `No`
  - Remove/decommission checks complete for scoped `Remove`/`Rename/Move`: `Yes`
  - Legacy retention removed for impacted old-behavior paths: `Yes`
  - No compatibility wrappers/dual paths retained for old behavior: `Yes`
  - Two consecutive deep-review rounds have no blockers, no required persisted artifact updates, and no newly discovered use cases: `No`

## Speak Log (Optional Tracking)

- Stage/gate transition spoken after `workflow-state.md` update: `No`
- Review gate decision spoken after persisted gate evidence: `No`
- Re-entry or lock-state change spoken (if applicable): `N/A`
- If any required speech was not emitted, fallback text update recorded: `Yes`
