# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/requirements-doc.md`
- Supplemental Task Artifacts Reviewed As Context: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/history-window-ui-ux-spec.md`
- Current Review Round: `1`
- Trigger: Implementation handoff for commit `d50cf2cc996e8e1bf63d5cf2dd3e2ef6735a92b5`
- Prior Review Round Reviewed: `N/A`
- Latest Authoritative Round: `1`
- Investigation Notes Reviewed As Context: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/investigation-notes.md`
- Design Spec Reviewed As Context: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/design-spec.md`
- Design Review Report Reviewed As Context: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/design-review-report.md` (authoritative round 2)
- Implementation Handoff Reviewed As Context: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/implementation-handoff.md`
- Coverage Investigation Reviewed (failure-origin entry point): `N/A`
- Execution Coverage Report Reviewed (failure-origin entry point): `N/A`
- Failing Scenario IDs: `N/A`
- Exact Failing Commands / Execution Mode: `N/A`
- Failure Evidence Paths: `N/A`

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Implementation handoff at `d50cf2cc` | N/A | `CR-001`, `CR-002` | Fail | Yes | One reviewed interface is unable to distinguish a transient mutation from a net bounded-presentation no-op; one team reopen replacement path omits the required revision reset. |

## Prior Findings Resolution Check (Mandatory On Round >1)

Not applicable in round 1.

## Review Scope

- Changed implementation and behavior reviewed: active-only/newest-100 backend projection; historical/live frontend visual-event retention; completed-first and mutable-fallback selection; standalone/team/submission actual-effect commits; Activity retention; feed scrolling/unseen action; localization; copy-control removal.
- Files / areas reviewed: all implementation-source changes in `75a4c97f..d50cf2cc`, relevant existing replay transformers/bundle builders, live routing and tool/activity projection paths, run/context hydration and team reopen merging, feed/disclosure render paths, and focused tests.
- Explicit exclusions: API/E2E environment discovery, large-fixture timing, real archive I/O instrumentation, 1,000-message system execution, and realistic live/browser validation remain owned by `api_e2e_engineer` after source review passes.

Reviewer checks executed:

- Backend projection focus: `2` files / `4` tests passed.
- Web source focus: `5` files / `34` tests passed.
- A temporary one-test review probe reproduced `CR-001`: the bounded presentation before/after was identical while `eventMonitorPresentationRevision` advanced to `1`. The probe was removed immediately; the worktree returned clean.
- `git diff --check 75a4c97f..d50cf2cc` passed.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `Yes` — the normal Event Monitor is active-file-only and bounded, completed candidates roll out before mutable candidates, the hard fallback is allowed only when needed, revision changes must represent actual bounded center-presentation changes, hydration/replacement establishes a new baseline, disclosure remains unchanged, and copy is removed.
- Design-spec behavior map verified against the implementation: `Contradicted in one material mechanism` — the major spines are implemented, but `commitRecentEventMonitorMutation(context, effect)` uses the reviewed `effect OR enforcement` rule even when the handler's transient append is itself removed and the post-commit bounded presentation is unchanged.
- Design review report and round confirmed: `Yes`; authoritative design-review round 2 and `MP-001` were used.
- Behavior-basis status: `Contradicted`
- Changed or newly discovered behavior, if any: none; `CR-001` exposes a reachable consequence omitted from the reviewed mechanism, not a new product behavior.
- Remaining material ambiguity, if any: none. `REQ-005` and its supplement clearly require net actual bounded-presentation change and baseline reset.

| Behavior ID | Current Status (`Confirmed`/`Contradicted`/`Unclear`/`Newly Discovered`) | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence (Only When Applicable) |
| --- | --- | --- | --- |
| `REQ-001` | Confirmed | Resolver/service -> local provider -> `getRunMemoryView(includeArchive:false)` | None. |
| `REQ-002` | Confirmed | Complete active normalization -> `buildHistoricalReplayEvents` -> `selectRecentReplayEvents` -> bundle | None. |
| `REQ-003` | Confirmed | Hydration/live conversation enforcement plus compaction-aware final presentation cap | None. |
| `REQ-004` | Confirmed | Shared completion classifier and completed-first selector; oldest-mutable fallback; stable-identity dedupe | None. |
| `REQ-005` | Contradicted | Handler returns `changed` -> commit enforces -> revision bumps on `effect === changed || enforcement.presentationChanged`; team reopen also replaces conversation without resetting revision | `CR-001` proves a retained-presentation no-op still bumps after the new completed event is evicted; `CR-002` identifies the unreset replacement path. |
| `REQ-006` | Confirmed | Existing Thinking/tool components remain the disclosure owners; feed passes retained segment objects | None. |
| `REQ-007` | Confirmed | Activity store enforces completed-first maximum 100 and repairs approval/highlight derivatives | None. |
| `REQ-008` | Confirmed | Workspace copy component use, eager join, and obsolete key removed | None. |
| `REQ-009` | Confirmed | Read-policy-only server change; no trace writer/schema/migration change | None. |

## Structural / Design Checks

| Check | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Fail | The missing-invariant refactor is largely present, but the actual-visible-revision invariant is not preserved for net no-ops (`CR-001`). | Revise the design mechanism, re-review it, then implement net bounded-presentation detection. |
| Implementation matches approved behavior-defining supplemental artifacts | Fail | UI/UX requires the jump action only after an actual visible change and a new baseline on replacement; `CR-001`/`CR-002` contradict those states. | Correct both paths and add focused state-transition coverage. |
| Data-flow spine inventory clarity and preservation under shared principles | Fail | `DS-001`, `DS-002`, `DS-004`, and `DS-005` remain clear; `DS-003` loses the distinction between transient source mutation and final retained presentation. | Revise the `DS-003` commit spine around a net bounded-presentation result. |
| Ownership boundary preservation and clarity | Fail | Window/dispatcher ownership is otherwise coherent, but neither current handler effects nor enforcement metadata owns enough information to decide net post-window visibility. | Assign net change comparison to one authoritative Event Monitor commit boundary. |
| Off-spine concern clarity (off-spine concerns serve clear owners and stay off the main line) | Pass | Completion, selection, hydration, localization, and scroll concerns attach to named owners. | None. |
| Existing capability/subsystem reuse check (no fresh helper where an existing subsystem should own it) | Pass | Existing replay, memory, streaming, Activity, hydration, and feed capabilities are extended. | None. |
| Reusable owned structures check (repeated structures extracted into the right owned file instead of copied across files) | Pass | Selection/completion/window structures are centralized; local presentation equality code is repeated but remains bounded and does not independently set policy. | Consider consolidating equality/snapshot logic during rework if it improves the net-change mechanism. |
| Shared-structure/data-model tightness check (no kitchen-sink base, no overlapping parallel shapes, specialization/composition used meaningfully) | Pass | Candidate/effect/result structures are narrow; descriptors are ephemeral rather than a second stored timeline. | None beyond `CR-001` interface redesign. |
| Repeated coordination ownership check (shared policy has a clear owner instead of being repeated across callers) | Pass | Recent selection and commit are centralized; callers do not add local slices. | None. |
| Empty indirection check (no pass-through-only boundary) | Pass | New policy modules each own selection, classification, or orchestration. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Backend and frontend policy files remain coherent; existing handler/store/component responsibilities are preserved. | None. |
| Ownership-driven dependency check (no forbidden shortcuts or unjustified cycles) | Pass | Runtime imports follow reviewed directions; Activity types cross the window boundary type-only. | None. |
| Authoritative Boundary Rule check (callers do not depend on both an outer owner and that owner's internal manager/repository/helper/lower-level concern) | Pass | No resolver/store/component bypasses its authoritative projection/window owner. | None. |
| File placement check (file/folder path matches owning concern or explicitly justified shared boundary) | Pass | New server policy is under run-history projection; web policy is under `services/eventMonitor`. | None. |
| Flat-vs-over-split layout judgment (layout is readable for the scope and not artificially fragmented) | Pass | Completion, generic selection, and conversation/presentation orchestration form a readable three-file capability. | None. |
| Interface/API/query/command/service-method boundary clarity (one subject, one responsibility, explicit identity shape) | Fail | `commitRecentEventMonitorMutation(context, 'changed')` cannot express whether an effective source mutation survives completed-first enforcement. | Replace or strengthen the reviewed commit/effect contract so it can prove net bounded-presentation change. |
| Naming quality and naming-to-responsibility alignment check (files, folders, APIs, types, functions, parameters, variables) | Pass | Names align with recent-window and presentation responsibilities. | Update names only if the revised commit contract changes meaning. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | No duplicated window policy or slicing exists. Three small equality helpers are local structural pressure, not an independent blocker. | Reassess during rework. |
| Patch-on-patch complexity control | Pass | The implementation replaces unbounded behavior directly and does not add compatibility paths. | None. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Copy derivation/control/key and archive-inclusive normal provider choice are removed. | None. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail | Current tests cover completed-first and basic revision changes but omit the reachable net-no-op overflow scenario and team reopen baseline replacement. | Add durable focused tests for both findings after design correction. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Focused builders and store/component fixtures are readable. | None. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | No compatibility-only coverage was introduced. | None. |
| API/E2E readiness for the next workflow stage | Fail | API/E2E should not validate an implementation whose unseen-action contract is already contradicted in source and a focused probe. | Return through design and implementation review first. |

## Source File Size And Structure Audit (If Applicable)

Effective lines are current non-empty lines. Delta is additions plus deletions in `75a4c97f..d50cf2cc`. Tests and generated catalogs are excluded from source thresholds.

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/projection/providers/local-memory-run-view-projection-provider.ts` | 49 | Pass | Pass (6) | Pass | Pass | Pass | None. |
| `autobyteus-server-ts/src/run-history/projection/recent-run-projection-policy.ts` | 5 | Pass | Pass (7) | Pass | Pass | Pass | None. |
| `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` | 196 | Pass | Pass (144) | Pass | Pass | Pass | None. |
| `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue` | 37 | Pass | Pass (2) | Pass | Pass | Pass | None. |
| `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue` | 143 | Pass | Pass (22) | Pass | Pass | Pass | None. |
| `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue` | 120 | Pass | Pass (1) | Pass | Pass | Pass | None. |
| `autobyteus-web/localization/messages/en/workspace.ts` | 205 | Pass | Pass (2) | Pass | Pass | Pass | None. |
| `autobyteus-web/localization/messages/zh-CN/workspace.ts` | 204 | Pass | Pass (2) | Pass | Pass | Pass | None. |
| `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` | 332 | Pass | Pass (53) | Pass | Pass | Design Impact via `CR-001` caller contract | Follow revised commit interface. |
| `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts` | 266 | Pass | Pass (78) | Pass | Pass | Pass | Re-evaluate effect semantics under revised design. |
| `autobyteus-web/services/agentStreaming/handlers/externalUserMessageHandler.ts` | 18 | Pass | Pass (6) | Pass | Pass | Pass | Re-evaluate effect semantics under revised design. |
| `autobyteus-web/services/agentStreaming/handlers/memberInputMessageHandler.ts` | 19 | Pass | Pass (6) | Pass | Pass | Pass | Re-evaluate effect semantics under revised design. |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | 419 | Pass | Pass (81) | Pass | Pass | Pass | Re-evaluate effect semantics under revised design. |
| `autobyteus-web/services/agentStreaming/handlers/segmentIdentity.ts` | 62 | Pass | Pass (11) | Pass | Pass | Pass | None. |
| `autobyteus-web/services/agentStreaming/handlers/systemTaskNotificationHandler.ts` | 21 | Pass | Pass (4) | Pass | Pass | Pass | Re-evaluate effect semantics under revised design. |
| `autobyteus-web/services/agentStreaming/handlers/teamHandler.ts` | 87 | Pass | Pass (26) | Pass | Pass | Pass | Re-evaluate effect semantics under revised design. |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | 415 | Pass | Pass (96) | Pass | Pass | Pass | Re-evaluate effect semantics under revised design. |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleState.ts` | 103 | Pass | Pass (15) | Pass | Pass | Pass | None. |
| `autobyteus-web/services/agentStreaming/handlers/userMessageProjection.ts` | 111 | Pass | Pass (30) | Pass | Pass | Pass | None. |
| `autobyteus-web/services/agentStreaming/teamStreamGenericMessageDispatcher.ts` | 122 | Pass | Pass (48) | Pass | Pass | Design Impact via `CR-001` caller contract | Follow revised commit interface. |
| `autobyteus-web/services/eventMonitor/recentEventMonitorCompletion.ts` | 33 | Pass | Pass (37) | Pass | Pass | Pass | None. |
| `autobyteus-web/services/eventMonitor/recentEventMonitorSelection.ts` | 60 | Pass | Pass (64) | Pass | Pass | Pass | None. |
| `autobyteus-web/services/eventMonitor/recentEventMonitorWindow.ts` | 198 | Pass | Pass (216) | Fail at commit responsibility | Pass | Design Impact (`CR-001`) | Redesign net-presentation commit; keep file below hard limit and reassess near-threshold pressure. |
| `autobyteus-web/services/runHydration/runProjectionActivityHydration.ts` | 229 | Pass | Pass (5) | Pass | Pass | Pass | None. |
| `autobyteus-web/services/runHydration/runProjectionConversation.ts` | 303 | Pass | Pass (5) | Pass | Pass | Pass | None. |
| `autobyteus-web/services/runSubmission/localUserSubmission.ts` | 78 | Pass | Pass (14) | Pass | Pass | Design Impact via `CR-001` caller contract | Follow revised commit interface. |
| `autobyteus-web/stores/agentActivityStore.ts` | 301 | Pass | Pass (122) | Pass | Pass | Pass | None. |
| `autobyteus-web/stores/agentContextsStore.ts` | 195 | Pass | Pass (1) | Pass | Pass | Pass | None. |
| `autobyteus-web/stores/agentTeamRunStore.ts` | 456 | Pass | Pass (2) | Pass | Pass | Pass | None. |
| `autobyteus-web/stores/runHistoryTeamMemberProjectionHydrator.ts` | 298 | Pass | Pass (1) | Pass | Pass | Pass | None. |
| `autobyteus-web/types/agent/AgentRunState.ts` | 70 | Pass | Pass (9) | Pass | Pass | Pass | None. |
| `autobyteus-web/types/segments.ts` | 114 | Pass | Pass (1) | Pass | Pass | Pass | None. |

`autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` was not changed, so it is not threshold-scored; it is nevertheless part of the relevant production replacement path and is the evidence location for `CR-002`.

## Legacy / Backward-Compatibility Verdict

| Check | Result (`Pass`/`Fail`) | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No archive/full-history compatibility option or wrapper was added. |
| No legacy old-behavior retention in changed scope | Pass | Normal provider is cleanly active-only and bounded. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Copy control/text/key remnants were removed. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Existing traces are read directly; no migration exists. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | None found. |
| Approved transition mechanics match the reviewed design, including migration safety only when required | Pass | `Directly Usable — No Migration` is preserved. |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `Yes` (task solution artifacts); `No` durable end-user/project-documentation impact identified yet.
- Why: `CR-001` requires the design spec, interface mapping, spine narrative, examples, and design-review premise treatment to define net bounded-presentation change rather than transient mutation OR eviction metadata. `CR-002` requires the replacement-path map to include `teamRunOpenCoordinator.mergeHydratedMembers`.
- Files or areas likely affected: `design-spec.md`, `investigation-notes.md`, possibly `requirements-doc.md` only for cross-link/clarification; then `design-review-report.md` through architecture review.

## Material Premise Validation (Only When Needed)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status (`Confirmed`/`Reclassified`/`No Longer Relevant`) | Changed Evidence / Reason (Required For `Reclassified` Or `No Longer Relevant`) |
| --- | --- | --- |
| `MP-001` | Confirmed | Implementation and focused tests preserve the reachable 101-mutable fallback. |

### `MP-CR-001` — A completed atomic event can be inserted after the retained window already contains 100 mutable events

- Origin: `New`
- Related approved requirement or established contract: `REQ-004`, `REQ-005`, `AC-004`, `AC-005`; design-review `MP-001`.
- Relevant behavior ID(s): `REQ-004`, `REQ-005`; `DS-003`, `DS-004`.
- Product-supported initiating trigger or governing contract, with evidence: `MP-001` confirms that supported segment/tool/compaction lifecycle traffic can leave 100 retained mutable visual events after fallback. Normal `EXTERNAL_USER_MESSAGE`, local user submission, `SYSTEM_TASK_NOTIFICATION`, inter-agent, or error traffic can then insert an atomic-complete visual event through existing supported stream/submission paths.
- Actual production caller/event path from that trigger to the claimed state: agent/team WebSocket or local submission -> handler appends one completed event and returns `changed` -> `commitRecentEventMonitorMutation` -> completed-first enforcement removes that newly added event because it is the only completed candidate -> conversation/final feed returns to the same 100 mutable items -> commit still increments revision because `effect === 'changed'` and enforcement reports a removal.
- Lifecycle preconditions and material consequence at the claimed point: the window is already full of mutable events; the added atomic event never survives the synchronous authoritative commit and is never part of the post-commit bounded presentation. Nevertheless the revision advances, so a non-pinned user receives `New activity · Jump to latest` even though jumping cannot reveal a new retained item. A temporary focused probe confirmed identical pre/post presentation with revision `0 -> 1`.
- Reachability: `Reachable`
- Review consequence / proportionate response: `CR-001` is valid and material. The Event Monitor commit contract must determine net post-window presentation change at its authoritative boundary. Because the reviewed `'none' | 'changed'` plus `effect OR enforcement` interface cannot represent this case without leaking policy into handlers, revise the design before implementation rework.

## Review Scorecard (Mandatory)

- Overall score (`/10`): `8.7`
- Overall score (`/100`): `87`
- Score calculation note: simple average rounded for summary only; the failing categories and findings govern the decision.

| Priority | Category | Score (`1.0-10.0`) | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 8.2 | Backend, hydration, Activity, and feed spines are readable. | `DS-003` conflates transient mutation with net retained presentation; team reopen replacement is omitted. | Revise the spine to cover pre/post bounded state and every replacement path. |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 8.5 | Most owners are coherent and no authoritative-boundary bypass exists. | No current owner has sufficient information to make the revision decision truthfully. | Make the Event Monitor commit boundary authoritative for net visibility. |
| `3` | `API / Interface / Query / Command Clarity` | 8.0 | Projection/query identities are strong and window selectors are narrow. | `commitRecentEventMonitorMutation(context, effect)` cannot express transient-change-then-evicted no-op. | Replace/strengthen the effect/commit contract in reviewed design. |
| `4` | `Separation of Concerns and File Placement` | 9.1 | Policy, handlers, stores, and components are placed and separated well. | Minor repeated equality/snapshot logic adds pressure. | Consolidate only if useful during rework; keep policy centralized. |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.0 | Candidate, result, identity, and revision types are tight; no stored duplicate timeline exists. | The effect type is too narrow for the required net semantic. | Introduce the smallest reviewed structure that represents net change without kitchen-sink metadata. |
| `6` | `Naming Quality and Local Readability` | 9.3 | Names generally match their responsibilities and local code is readable. | `presentationChanged` on enforcement means “descriptors removed,” not necessarily net presentation changed across the dispatch. | Rename or redefine the result in the revised contract to avoid semantic overclaim. |
| `7` | `API/E2E Readiness` | 8.0 | Focused suites are green and coverage hints are strong. | Two source-visible requirement contradictions and missing regression cases remain. | Correct findings and pass source review before broader execution. |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 7.8 | Core caps, ordering, archive exclusion, and copy removal match intent. | False unseen revisions are reachable; one conversation-replacement path fails baseline reset. | Implement net-change revision semantics and reset all replacement paths. |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.8 | Clean active-only path; no migration or compatibility branch. | No material weakness. | Preserve this posture. |
| `10` | `Cleanup Completeness` | 9.3 | Obsolete copy and archive-inclusive normal behavior are removed. | Test coverage cleanup is incomplete around the revised invariant. | Add focused durable cases; keep temporary probes out of the tree. |

## Findings

### `CR-001` — Revision advances when the authoritative bounded presentation is unchanged

- Severity: `High`
- Classification: `Design Impact`
- Affected approved behavior: `REQ-005`, `AC-005`, `UXJ-003`; related `REQ-004`/`MP-001` fallback.
- Evidence: `recentEventMonitorWindow.ts:207-215` increments when `effect === 'changed' || enforcement.presentationChanged`. `selectRecentWindowCandidates` removes completed candidates first. Under `MP-CR-001`, a newly appended completed atomic event is itself removed from a full 100-mutable window, making the final retained presentation identical. The temporary review probe confirmed identical pre/post presentation keys and revision `0 -> 1`.
- Why this matters: a non-pinned user sees the localized jump action even though no new retained content exists at latest. This directly defeats the explicit actual-visible-change contract introduced to resolve architecture finding `AR-002`.
- Why this is design impact: the implementation follows the reviewed interface mapping that says to OR a handler effect with enforcement metadata. The tight effect contains no mutation identity or pre-state, and the post-handler commit cannot determine whether the changed candidate survived. Correcting this cleanly changes the reviewed `DS-003`/commit interface rather than a bounded line-level implementation mistake.
- Required action: revise the solution design so one authoritative Event Monitor boundary can compare or otherwise prove net bounded presentation before bumping; cover ordinary visible updates, eviction-only changes, transient append-then-evict no-ops, and classification-only lifecycle changes proportionately. Return the revised solution package through architecture review before implementation resumes.

### `CR-002` — Existing team-member context replacement does not reset the presentation revision baseline

- Severity: `Medium`
- Classification: `Local Fix` subordinate to the design reroute
- Affected approved behavior: `REQ-005`, `AC-005`; design guidance requiring revision `0` on historical hydration or context replacement.
- Evidence: `services/runOpen/teamRunOpenCoordinator.ts:46-78` reuses an existing member context; at lines `62-65`, the non-live-preservation branch replaces `state.runId` and `state.conversation` but does not call `resetEventMonitorPresentationRevision()`. The same code later installs the reused contexts into the existing team context (`192-206`). Other replacement paths correctly reset in `agentContextsStore.ts` and `runHistoryTeamMemberProjectionHydrator.ts`.
- Why this matters: a persisted/inactive team reopen can retain an old counter and unseen state when the same member/run IDs remain mounted, instead of establishing the required fresh feed baseline.
- Required action: include this production path in the revised path map, reset the revision when the conversation is replaced, and add a focused reopen/merge test that proves baseline/unseen reset without disturbing subscribed live contexts.

## Classification

`Design Impact` — `CR-001` exposes an inadequate reviewed commit mechanism. `CR-002` is a bounded implementation omission but does not reduce the required upstream route.

## Recommended Recipient

`solution_designer`

The solution designer should revise the net-visible revision design and include the omitted team reopen replacement path. The revised package must return through `architecture_reviewer` before implementation resumes.

## Residual Risks

- Previously accepted residual risks remain: one event can be byte-heavy; conversation/Activity transport duplicates tool details; large active teams can issue several bounded reads; dynamic-height content can imperfectly anchor; source-limited re-entry can omit prior content.
- Index-derived Vue keys and existing segment-index disclosure keys remain a non-blocking follow-up risk under rolling eviction; current requirements require collapsed-by-default/explicit interaction but do not clearly require preservation of an expanded local state across a retained-group regroup. API/E2E should observe disclosure behavior after source review passes.
- Full repository web typecheck remains red on recorded unrelated baseline diagnostics; no new-path diagnostics were reported by implementation.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Fail` — reachable `MP-CR-001` contradicts the reviewed revision mechanism.
- Score Summary: `8.7/10` (`87/100`); interface, runtime fidelity, and API/E2E readiness are below the clean-pass threshold.
- Failure Origin (when applicable): `N/A` — this is implementation source review, not API/E2E failure-origin review.
- Recommended Recipient (when applicable): `solution_designer`
- Notes: Do not proceed to API/E2E. Revise design, pass architecture review, implement rework, then repeat implementation source review.
