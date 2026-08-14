# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative. This record is the concise chronological history of architecture-review results.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| `ARCH-REV-001` | Round 1 / initial complete solution package | `SR-001` | `N/A` | `Pass` | None |
| `ARCH-REV-002` | Round 2 / user-verified runtime defects and `SR-002` redesign | `SR-001`, `SR-002` | `Pass` | `Fail` — `Design Impact` | `AR-FIND-001`, `AR-FIND-002` |
| `ARCH-REV-003` | Round 3 / `SR-003` prior-finding fixes and fail-closed/manual-retry replacement | `SR-001`, `SR-002`, `SR-003` | `Fail` — `Design Impact` | `Fail` — `Requirement Gap` | `AR-FIND-001`, `AR-FIND-002`, `AR-FIND-003`, `AR-FIND-004` |
| `ARCH-REV-004` | Round 4 / `SR-004` USER-origin authorization and same-queue preservation | `SR-001`, `SR-002`, `SR-003`, `SR-004` | `Fail` — `Requirement Gap` | `Pass` | `AR-FIND-003`, `AR-FIND-004` |

## Revision Entries

### ARCH-REV-001 — Initial compaction-robustness design approval

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/design-review-report.md`
- Review round and trigger: round 1; initial architecture review requested after user approval and completion of `SR-001`
- Triggering role, report path, and finding IDs: `solution_designer`; report path N/A; finding IDs N/A
- Relevant solution revision IDs: `SR-001`
- Prior authoritative decision: `N/A`
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: established the initial architecture-review baseline after independently confirming the approved behavior map, production evidence, supplement coherence, spine inventory, owner/interface boundaries, clean-cut removal plan, bounded correction lifecycle, host-owned commit path, least-authority posture, and directly usable lineage transition.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None.
- Material classification changes: None.
- Recommended recipient: `implementation_engineer`
- Remaining risks or uncertainty: model factual quality remains probabilistic; invalid content may add one bounded child-run cost; first-attempt provider/timeout/launch/transport failures remain terminal; the global sender-heading removal needs the specified USER/TOOL/AGENT/SYSTEM and context/media regression coverage.

### ARCH-REV-002 — Post-delivery runtime redesign requires correction

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/design-review-report.md`
- Review round and trigger: round 2; user verification after the prior delivered baseline exposed three rapid successful compactions at 20%, four pre-response child failures misclassified as JSON failures, and unchanged pending-operation re-execution before the next `continue`
- Triggering role, report path, and finding IDs: `solution_designer`; prior downstream artifacts and retained runtime evidence in `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness`; new findings `AR-FIND-001`, `AR-FIND-002`
- Relevant solution revision IDs: `SR-001`, `SR-002`
- Prior authoritative decision: `Pass` (`ARCH-REV-001`, applicable to `SR-001`)
- Current authoritative decision: `Fail` — `Design Impact`
- What changed in the review result or what baseline was established: the `SR-002` planning formula, dynamic-budget ownership, typed assistant error transport, bounded proactive-failure recovery, accepted-commit boundary, clean removals, and no-migration posture were independently confirmed. The current redesign does not preserve the approved post-success observed-below reset, and its durable repeated-compaction evidence package is inconsistent.

#### Prior Finding Resolution

None — `ARCH-REV-001` had no findings. Its `SR-001` prompt/parser/commit conclusions remain valid; the current fail concerns behavior added after user verification.

- New or remaining finding IDs: `AR-FIND-001`, `AR-FIND-002`
- Material classification changes: authoritative result changes from `Pass` to `Fail — Design Impact` for `SR-002`; this does not invalidate the already implemented `REQ-001`–`REQ-010` baseline.
- Recommended recipient: `solution_designer`
- Remaining risks or uncertainty: estimator/provider accounting remains approximate; the revised gate must prevent that residual from recreating the exact rapid-success lifecycle. The exact four-child provider cause remains unknown but does not block typed runner-failure handling. Runtime-only suppression reset on restart remains an approved residual.

### ARCH-REV-003 — Prior findings resolved; manual-retry origin gap found

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/design-review-report.md`
- Review round and trigger: round 3; `SR-003` resolves both round-2 findings and replaces SR-002 autonomous failure recovery with the user-approved strict fail-closed/manual-retry policy
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/design-review-report.md`; prior findings `AR-FIND-001`, `AR-FIND-002`
- Relevant solution revision IDs: `SR-001`, `SR-002`, `SR-003`
- Prior authoritative decision: `Fail — Design Impact` (`ARCH-REV-002`)
- Current authoritative decision: `Fail — Requirement Gap`
- What changed in the review result or what baseline was established: accepted success now clears pending while installing a separate coordinator-owned actual-observation episode, and the durable three-operation evidence/inventory is corrected. Review of the new fail-closed policy found that a supported inter-agent turn reaches the same unconditional pending executor even though only a user-authored message may authorize retry; the package does not define the non-user message outcome. One evidence supplement also retains SR-002's rejected re-arm direction.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `AR-FIND-001` | Open — successful estimate substituted for below-threshold usage | Resolved | `SR-003`; `REQ-012`; `AC-016`; `design-spec.md` DS-001/DS-004, coordinator/commit hook, examples, invariants, and coverage | `CompactionThresholdEpisode` is separate from pending; accepted commit's final hook clears the verified operation and installs `awaiting_below_observation`; first actual same-key below rearms, first at/above emits one diagnostic and suppresses; budget-key reset and hard-cap override are explicit |
| `AR-FIND-002` | Open — wrong focused excerpt and incomplete inventory | Resolved | `SR-003`; corrected evidence and canonical inventory | Corrected file SHA-256 is `e8737eb3150dfe478aeed87c4c3c24e158bc152b8d97d1bf3d90f9d846203cd8`; all three operation IDs, four prompt observations, and three compactor prompt lengths are present; unrelated `mssvuhbz_1`/249139 is absent; all four SR-002 evidence files are inventoried and linked |

- New or remaining finding IDs: `AR-FIND-003`, `AR-FIND-004`
- Material classification changes: the two prior `Design Impact` findings are resolved. The current result remains `Fail`, now classified `Requirement Gap`, because the approved user-only retry contract lacks a defined outcome for a supported non-user external turn; the runner-failure supplement has a secondary design-coherence correction.
- Recommended recipient: `solution_designer`
- Remaining risks or uncertainty: provider estimation and runtime episode restart remain accepted residuals. The unresolved question is not hypothetical: `InterAgentMessageReceivedEvent` is a supported turn trigger and currently reaches unconditional pending execution.

### ARCH-REV-004 — USER-origin recovery and same-queue preservation pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/design-review-report.md`
- Review round and trigger: round 4; `SR-004` resolves the user-only retry authorization and supplemental-coherence findings from `ARCH-REV-003`
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/design-review-report.md`; `AR-FIND-003`, `AR-FIND-004`
- Relevant solution revision IDs: `SR-001`, `SR-002`, `SR-003`, `SR-004`
- Prior authoritative decision: `Fail — Requirement Gap` (`ARCH-REV-003`)
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: approved `BEH-010`/`REQ-015` now define the supported non-user disposition. Every turn-start entry receives authoritative immutable origin before conversion; a new operation keeps one automatic attempt for any origin; final failure changes the retained operation to `awaiting_user_retry`; the ordinary inbox leaves AGENT/SYSTEM entries unclaimed while selecting the earliest eligible USER; and the coordinator atomically authorizes at most one distinct-turn retry. Failure preserves the queue/gate, success runs the USER turn first and restores ordinary FIFO after settlement. The stale runner-failure supplement now matches this policy.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `AR-FIND-003` | Open — user-only retry lacked origin authorization and a non-user outcome | Resolved | `SR-004`; `BEH-010`; `REQ-015`; `AC-022`, `AC-023`; `design-spec.md` DS-006, attempt state, origin/admission interfaces, queue example, files, invariants, and coverage | Current core/server paths establish direct and carrier-based non-user turn starts. Target design stamps origin on the existing entry, uses one matching claim and the same wait predicate, carries origin through `AgentTurn`, and authorizes only a distinct USER turn after failure. Non-user entries stay in place across retry failure and resume in relative FIFO order after successful USER-turn settlement. |
| `AR-FIND-004` | Open — runner-failure supplement prescribed superseded SR-002 re-arm behavior | Resolved | `SR-004`; `compactor-runner-failure-analysis.md` Required Behavioral Direction | The supplement now requires uniform fail-closed `awaiting_user_retry`, no autonomous retry, USER-only distinct-turn re-entry, same-queue AGENT/SYSTEM preservation, and ordinary FIFO resumption after success. |

- New or remaining finding IDs: None.
- Material classification changes: the prior `Requirement Gap` and secondary supplemental `Design Impact` are resolved; the current package passes architecture review and is ready for implementation rework.
- Recommended recipient: `implementation_engineer`
- Remaining risks or uncertainty: token estimation remains approximate; runtime-only threshold suppression may reset on restart; queued turn starts retain existing non-persistent shutdown behavior; a single oversized input has no general admission/chunking gate; schema validation cannot prove factual summary quality. These are explicit and do not undermine the reviewed behavior.
