# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative. This record is the concise chronological history of architecture-review results.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| `ARCH-REV-001` | Round 1 / initial complete solution package | `SR-001` | `N/A` | `Pass` | None |
| `ARCH-REV-002` | Round 2 / user-verified runtime defects and `SR-002` redesign | `SR-001`, `SR-002` | `Pass` | `Fail` — `Design Impact` | `AR-FIND-001`, `AR-FIND-002` |
| `ARCH-REV-003` | Round 3 / `SR-003` prior-finding fixes and fail-closed/manual-retry replacement | `SR-001`, `SR-002`, `SR-003` | `Fail` — `Design Impact` | `Fail` — `Requirement Gap` | `AR-FIND-001`, `AR-FIND-002`, `AR-FIND-003`, `AR-FIND-004` |
| `ARCH-REV-004` | Round 4 / `SR-004` USER-origin authorization and same-queue preservation | `SR-001`, `SR-002`, `SR-003`, `SR-004` | `Fail` — `Requirement Gap` | `Pass` | `AR-FIND-003`, `AR-FIND-004` |
| `ARCH-REV-005` | Round 5 / `SR-005` provider-safe Unicode boundary | `SR-001`, `SR-002`, `SR-003`, `SR-004`, `SR-005` | `Pass` | `Fail` — `Design Impact` | `AR-FIND-002`, `AR-FIND-005` |
| `ARCH-REV-006` | Round 6 / `SR-006` bounded evidence/oracle corrections | `SR-001`, `SR-002`, `SR-003`, `SR-004`, `SR-005`, `SR-006` | `Fail` — `Design Impact` | `Pass` | `AR-FIND-002`, `AR-FIND-005` |
| `ARCH-REV-007` | Round 7 / `SR-008` memory-owned configuration and non-recursive built-in leaf | `SR-001`–`SR-008` | `Pass` | `Pass` | None |

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
| `AR-FIND-002` | Open — wrong focused excerpt and incomplete inventory | Resolved for content/inventory; checksum assertion later corrected by `ARCH-REV-005` | `SR-003`; corrected evidence and canonical inventory; `ARCH-REV-005` direct recomputation | All three operation IDs, four prompt observations, and three compactor prompt lengths are present; unrelated `mssvuhbz_1`/249139 is absent; all four SR-002 evidence files are inventoried and linked. The file's actual SHA-256 is `adc1c471f487ad1aee1ffe4e6176fdd70603218b0dadff39c09af439134148cf`, not the previously recorded `e8737e...`. |

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

### ARCH-REV-005 — Unicode architecture is sound; two package corrections remain

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/design-review-report.md`
- Review round and trigger: round 5; `SR-005` adds the approved derived-copy Unicode correction after a live DeepSeek request rejection caused by a truncation-created lone surrogate
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/design-review-report.md`; prior result had no open finding, current findings `AR-FIND-002` (reopened) and `AR-FIND-005`
- Relevant solution revision IDs: `SR-001`, `SR-002`, `SR-003`, `SR-004`, `SR-005`
- Prior authoritative decision: `Pass` (`ARCH-REV-004`)
- Current authoritative decision: `Fail — Design Impact`
- What changed in the review result or what baseline was established: the live source-to-provider path is reachable and reproduced. The proposed pure memory-presentation utility, source-versus-derived ownership, surrogate-safe middle/end truncation, final local prompt guard, typed fail-closed disposition, parser-clamp reuse, exact fixtures, and directly usable/no-migration posture are proportionate and technically sound. Review found two bounded package defects: the retained three-operation evidence has a stale asserted checksum, and the Unicode example adds an undefined whole-prompt character limit that is not part of the approved per-value/clamp contract.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `AR-FIND-001` | Resolved in `ARCH-REV-003` | Remains resolved | `SR-003`–`SR-005`; DS-001/DS-004 and accepted commit hook | SR-005 does not change the actual-observation episode, suppression/reset, or hard-cap override |
| `AR-FIND-002` | Resolved in `ARCH-REV-003` for evidence content/inventory | Reopened only for checksum metadata | `SR-003`, `SR-005`; canonical evidence and checksum assertions | Direct SHA-256 recomputation returns `adc1c471f487ad1aee1ffe4e6176fdd70603218b0dadff39c09af439134148cf`; upstream artifacts still assert `e8737e...`. Content remains the correct three-operation sequence. |
| `AR-FIND-003` | Resolved in `ARCH-REV-004` | Remains resolved | `SR-004`, `SR-005`; REQ-014/015 | SR-005 preserves authoritative origin, USER-only retry, atomic attempt authorization, and same-queue non-user retention |
| `AR-FIND-004` | Resolved in `ARCH-REV-004` | Remains resolved | `SR-004`, `SR-005`; runner-failure supplement | SR-005 preserves strict fail-closed/USER-only recovery and does not reintroduce autonomous failure retry |

- New or remaining finding IDs: `AR-FIND-002` (reopened), `AR-FIND-005` (new)
- Material classification changes: prior `Pass` changes to `Fail — Design Impact` for two narrow coherence/actionability corrections. The substantive Unicode architecture is accepted; no requirement clarification or new machinery is requested.
- Recommended recipient: `solution_designer`
- Remaining risks or uncertainty: malformed old/external source becomes U+FFFD only in the derived copy; token estimation remains approximate; runtime-only threshold state can reset on restart; ordinary queued work remains non-persistent; a single oversized input lacks general admission/chunking; deterministic validation cannot prove factual summary quality.

### ARCH-REV-006 — Corrected Unicode package passes

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/design-review-report.md`
- Review round and trigger: round 6; `SR-006` corrects the two bounded evidence/actionability findings from `ARCH-REV-005`
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/design-review-report.md`; `AR-FIND-002`, `AR-FIND-005`
- Relevant solution revision IDs: `SR-001`, `SR-002`, `SR-003`, `SR-004`, `SR-005`, `SR-006`
- Prior authoritative decision: `Fail — Design Impact` (`ARCH-REV-005`)
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: direct recomputation now agrees with every current upstream checksum assertion while the canonical evidence bytes and expected sequence remain unchanged. The invalid whole-prompt `plannedRenderedLimit` oracle is removed; the design now separates complete-prompt well-formed/control safety, independent configured per-value/per-clamp limits, and B/T/P token-budget ownership. No requirement behavior, prompt/schema/tool/storage/migration contract, or retry/origin lifecycle changed.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `AR-FIND-002` | Reopened — stale checksum metadata | Resolved | `SR-006`; investigation inventory, repeated-compaction analysis, solution revision record, retained evidence | File SHA-256 directly recomputes to `adc1c471f487ad1aee1ffe4e6176fdd70603218b0dadff39c09af439134148cf`; current upstream references agree. The file contains only the expected three operation IDs, four prompt observations, and three child prompt lengths; unrelated `mssvuhbz_1`/249139 remains absent. |
| `AR-FIND-005` | Open — undefined whole-prompt character bound | Resolved | `SR-006`; `design-spec.md` Unicode example, exact invariants, and prompt/parser coverage | `plannedRenderedLimit` is removed as an oracle. The complete 540,727-unit captured task is preserved subject only to well-formed/control safety; each rendered value and accepted-text clamp uses its own configured bound after safe-boundary adjustment; B/T/P remains the exclusive complete-prompt budget path. |

- New or remaining finding IDs: None.
- Material classification changes: the two bounded `Design Impact` findings are resolved; the package returns to `Pass` and is ready for implementation rework.
- Recommended recipient: `implementation_engineer`
- Remaining risks or uncertainty: malformed old/external source becomes U+FFFD only in the derived copy; provider token estimation remains approximate; runtime-only threshold state can reset on restart; ordinary queued work remains non-persistent; one oversized input lacks general admission/chunking; deterministic validation cannot prove factual summary quality.

### ARCH-REV-007 — Memory-owned non-recursive leaf composition passes

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/design-review-report.md`
- Review round and trigger: round 7; `SR-008` supersedes the unimplemented `SR-007` null-runner boundary with the user-approved bounded automatic-compaction ownership refactor
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/design-review-report.md`; no open prior or new finding IDs
- Relevant solution revision IDs: `SR-001`–`SR-008`
- Prior authoritative decision: `Pass` (`ARCH-REV-006`, applicable through `SR-006`; SR-007/SR-008 implementation remained blocked pending this review)
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: live production evidence adds `BEH-012` and proves that fragmented runner/policy/strategy composition let the built-in Memory Compactor apply the global 20% policy to its already-usable 176,655-token response and launch a nested compactor. SR-008 replaces the split sources with one closed runtime-only memory configuration; server provisioning selects disabled for the canonical built-in on create/restore and fail-fast enabled composition for normal definitions; `AgentFactory` installs rather than invents policy; `MemoryManager` owns the configuration; and definition-agnostic `LlmPhase` retains common provider request capacity while omitting every automatic-compaction integration when disabled. The current policy, strategy registry/sole strategy, parent-owned initial/correction sibling runs, accepted commit, prompt/schema/tool/storage contracts, and no-migration posture remain intact.

#### Prior Finding Resolution

No prior finding was open in `ARCH-REV-006`. Direct recheck confirms `AR-FIND-001`–`AR-FIND-005` remain resolved; SR-008 does not alter their accepted behavior or evidence.

- New or remaining finding IDs: None.
- Material classification changes: None. The prior authoritative result remains `Pass`; `ARCH-REV-007` extends that approval to the new `REQ-017` / `SR-008` ownership and leaf-execution scope. `SR-007` is superseded before implementation.
- Recommended recipient: `implementation_engineer`
- Remaining risks or uncertainty: a genuinely oversized one-shot child has no chunking strategy and fails truthfully; token estimation remains approximate; enabled configurations require a fresh mutable policy per runtime; runtime-only threshold state and ordinary queued delivery retain their accepted restart/shutdown limits; the independent token-ledger schema mismatch is out of scope; deterministic validation cannot prove factual summary quality.
