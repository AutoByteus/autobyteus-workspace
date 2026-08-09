# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/requirements.md`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/performance-evidence.md` and `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/probe-evidence`
- Relevant Solution Revision IDs: `SR-004`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/design-review-report.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-004`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-002` (reworking `IR-001`)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: `2`
- Trigger: IR-002 source rework commit `21c85e91e355c71d643cab61fa8d24acf9dc78dd` at clean HEAD `fcc902e8ac8bed6a88387cf9960c4193e43bf648`.
- Prior Authoritative Review: `CRR-001 — Fail — Local Fix`
- Latest Authoritative Round: `CRR-002`
- Coverage / API-E2E / delivery failure-origin inputs: `N/A — API/E2E has not started`

## Review Scope

- Re-reviewed the complete implementation-source range from task base `7f0fc49965950d9689726a048371f2e2b78eef31` through current HEAD, the IR-002 delta, all six prior findings, affected focused tests, and the complete approved package.
- Explicit exclusions: API/E2E execution, aggregate browser/Electron performance proof, delivery-owned base refresh, and durable documentation synchronization.
- Reviewer checks executed:
  - `pnpm exec vitest run tests/unit/services/agent-streaming/agent-stream-websocket-egress.test.ts --no-watch` — Pass, 1 file / 32 tests.
  - `pnpm test:nuxt --run` across `TeamStreamingService`, shared projector, local submission, team-open, standalone/team stores, navigation projection, and run-history store — Pass, 8 files / 159 tests.
  - IR-002 delta and complete task-range `git diff --check` — Pass.
  - Worktree cleanliness after review execution — Pass before review-artifact edits.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes.
- Design review basis: `SR-004 / ARCH-REV-004 — Pass`.
- Behavior-basis status: `Contradicted` by three bounded integration/lifecycle defects; no requirement or design ambiguity was found.

| Behavior ID | Current Status | Evidence |
| --- | --- | --- |
| BEH-001 | Confirmed | Shared server/frontend presentation ownership and cached navigation remain intact. |
| BEH-002 | Confirmed | Off-spine attachment/file/voice owners remain separated. |
| BEH-003 | Confirmed | Task-agent ensure/repair remains router-owned and the resolver is read-only. |
| BEH-004 | Contradicted | Local failure navigation is patched before terminal status cleanup, and team activation can publish before its source context becomes active. See CR-007/CR-008. |
| BEH-005 | Contradicted | Replacement now primes correctly, but subscribed live reuse omits the design-required idempotent final prime. See CR-009. |
| BEH-006 | Contradicted | Exact lifecycle patches exist, but the user-send activation order can leave the cached team root inactive through the equal initial lifecycle no-op. See CR-008. |
| BEH-007 | Confirmed | Exact status identity/filtering remains bounded per connection. |
| BEH-008 | Confirmed | Existing cadence/coalescing and progressive focused rendering are preserved. |
| BEH-009 | Confirmed | Controls receive recursively cloned/frozen snapshots and cannot mutate scheduler/sink delivery. |

## Structural / Design Checks

| Check | Result | Evidence / Required Action |
| --- | --- | --- |
| Design health and reviewed scope preserved | Pass | The Performance Bug + Refactor ownership diagnosis remains implemented. |
| Implementation matches approved behavior artifacts | Fail | CR-007–CR-009 contradict final status, team activation, and baseline lifecycle contracts. |
| Data-flow spine clarity | Fail | Primary spines are clear, but two supported caller orderings publish stale navigation state. |
| Ownership boundary preservation | Pass | Egress controls, task mutation, Event Monitor, and navigation each retain one owner. |
| Off-spine concern clarity | Pass | Settings, task details, token/activity, and file side effects remain outside the main projection line. |
| Existing subsystem reuse | Pass | Existing egress, run history, Event Monitor, and context stores are reused. |
| Reusable owned structures | Pass | One projector, one effect merge, one navigation projection, and one execution-row composer remain. |
| Shared-structure/data-model tightness | Pass | Combined presentation/activity and stable collection reconciliation are now explicit and covered. |
| Repeated coordination ownership | Pass | No duplicate scheduler/projector/navigation builder was reintroduced. |
| Empty indirection / patch-on-patch control | Pass | New boundaries own policy and no compatibility wrapper was added. |
| Scope-appropriate separation and placement | Pass | Changed files remain capability-local and bounded. |
| Ownership-driven dependency / authoritative boundary | Pass | Components consume run-history results; task helpers do not bypass source ownership. |
| Interface/API clarity | Fail | Caller ordering violates the otherwise-clear navigation and baseline interfaces. Resolve CR-007–CR-009. |
| Naming and local readability | Pass | Current names align with filter/effect/patch/context responsibilities. |
| Cleanup and obsolete-path removal | Pass | Old egress policy, duplicate dispatcher, Event Monitor API, and component row builder remain deleted. |
| Relevant tests requirement-aligned | Fail | Green focused suites omit caller-level error-status coherence, new/restored-team activation coherence, and required subscribed-live idempotent prime. |
| Test fixture coherence / no stale compatibility tests | Pass | Existing suites remain capability-oriented and no removed path is retained. |
| API/E2E readiness | Fail | Source must return through one bounded local rework before API/E2E begins. |

## Source File Size And Structure Audit

All 66 changed production-source files in the complete task range were re-audited. Tests, fixtures, generated files, docs, and evidence are excluded. No current changed source exceeds 500 effective non-empty lines. No new file exceeds the reviewed 220-line delta guard; the shared projector remains exactly 220 added lines. Only the four rows tied to current findings fail the source audit.

| Source File | Effective Non-Empty Lines | `>500` Check | `>220` New-File Delta | SoC / Contract | Placement | Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/agent-streaming/websocket-egress/agent-status-projection-identity.ts` | 69 | Pass | Pass (+75) | Pass | Pass | Pass | None |
| `autobyteus-server-ts/src/services/agent-streaming/websocket-egress/agent-status-transition-filter.ts` | 26 | Pass | Pass (+30) | Pass | Pass | Pass | None |
| `autobyteus-server-ts/src/services/agent-streaming/websocket-egress/agent-stream-content-cadence-scheduler.ts` | 82 | Pass | Pass (+93) | Pass | Pass | Pass | None |
| `autobyteus-server-ts/src/services/agent-streaming/websocket-egress/agent-stream-egress-control-composition.ts` | 25 | Pass | Pass (+27) | Pass | Pass | Pass | None |
| `autobyteus-server-ts/src/services/agent-streaming/websocket-egress/agent-stream-egress-control.ts` | 64 | Pass | Pass (+77) | Pass | Pass | Pass | None |
| `autobyteus-server-ts/src/services/agent-streaming/websocket-egress/agent-stream-websocket-egress-policy.ts` | Removed | N/A | Pass (deletion) | Pass | Pass | Pass | None |
| `autobyteus-server-ts/src/services/agent-streaming/websocket-egress/agent-stream-websocket-egress.ts` | 88 | Pass | Pass (+59) | Pass | Pass | Pass | None |
| `autobyteus-server-ts/src/services/agent-streaming/websocket-egress/stream-content-coalescing.ts` | 24 | Pass | Pass (+2) | Pass | Pass | Pass | None |
| `autobyteus-server-ts/src/services/agent-streaming/websocket-egress/stream-payload-equality.ts` | 34 | Pass | Pass (+36) | Pass | Pass | Pass | None |
| `autobyteus-web/components/mobile/MobileRemoteAccessShell.vue` | 278 | Pass | Pass (+1) | Pass | Pass | Pass | None |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | 359 | Pass | Pass (+0) | Pass | Pass | Pass | None |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | 477 | Pass | Pass (+27) | Pass | Pass | Pass | None |
| `autobyteus-web/components/workspace/history/WorkspaceTransientExecutionRow.vue` | 84 | Pass | Pass (+4) | Pass | Pass | Pass | None |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | 71 | Pass | Pass (+0) | Pass | Pass | Pass | None |
| `autobyteus-web/components/workspace/running/RunningAgentsPanel.vue` | 198 | Pass | Pass (+3) | Pass | Pass | Pass | None |
| `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue` | 130 | Pass | Pass (+3) | Pass | Pass | Pass | None |
| `autobyteus-web/components/workspace/team/TeamMembersPanel.vue` | 113 | Pass | Pass (+4) | Pass | Pass | Pass | None |
| `autobyteus-web/composables/mobile/useMobileRunLaunchCoordinator.ts` | 213 | Pass | Pass (+3) | Pass | Pass | Pass | None |
| `autobyteus-web/composables/mobile/useMobileTeamMemberFocusCoordinator.ts` | 114 | Pass | Pass (+3) | Pass | Pass | Pass | None |
| `autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts` | 114 | Pass | Pass (+0) | Pass | Pass | Pass | None |
| `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | 353 | Pass | Pass (+27) | Pass | Pass | Pass | None |
| `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` | 260 | Pass | Pass (+6) | Pass | Pass | Pass | None |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | 423 | Pass | Pass (+52) | Pass | Pass | Pass | None |
| `autobyteus-web/services/agentStreaming/agentStreamMessageProjector.ts` | 216 | Pass | Pass (+220) | Pass | Pass | Pass | None |
| `autobyteus-web/services/agentStreaming/agentStreamMutationEffects.ts` | 58 | Pass | Pass (+66) | Pass | Pass | Pass | None |
| `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts` | 277 | Pass | Pass (+40) | Pass | Pass | Pass | None |
| `autobyteus-web/services/agentStreaming/handlers/externalUserMessageHandler.ts` | 15 | Pass | Pass (+1) | Pass | Pass | Pass | None |
| `autobyteus-web/services/agentStreaming/handlers/memberInputMessageHandler.ts` | 16 | Pass | Pass (+1) | Pass | Pass | Pass | None |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | 402 | Pass | Pass (+25) | Pass | Pass | Pass | None |
| `autobyteus-web/services/agentStreaming/handlers/systemTaskNotificationHandler.ts` | 20 | Pass | Pass (+2) | Pass | Pass | Pass | None |
| `autobyteus-web/services/agentStreaming/handlers/teamHandler.ts` | 78 | Pass | Pass (+8) | Pass | Pass | Pass | None |
| `autobyteus-web/services/agentStreaming/handlers/tokenUsageHandler.ts` | 12 | Pass | Pass (+2) | Pass | Pass | Pass | None |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | 440 | Pass | Pass (+112) | Pass | Pass | Pass | None |
| `autobyteus-web/services/agentStreaming/handlers/userMessageProjection.ts` | 108 | Pass | Pass (+5) | Pass | Pass | Pass | None |
| `autobyteus-web/services/agentStreaming/teamStreamGenericMessageDispatcher.ts` | Removed | N/A | Pass (deletion) | Pass | Pass | Pass | None |
| `autobyteus-web/services/agentStreaming/teamStreamMemberContextResolver.ts` | 113 | Pass | Pass (+9) | Pass | Pass | Pass | None |
| `autobyteus-web/services/agentStreaming/teamTaskAgentContextProjection.ts` | 461 | Pass | Pass (+28) | Pass | Pass | Pass | None |
| `autobyteus-web/services/agentStreaming/teamTaskExecutionEventRouter.ts` | 194 | Pass | Pass (+98) | Pass | Pass | Pass | None |
| `autobyteus-web/services/agentStreaming/teamTaskExecutionProjection.ts` | 345 | Pass | Pass (+101) | Pass | Pass | Pass | None |
| `autobyteus-web/services/agentStreaming/teamTaskTeamChildProjection.ts` | 365 | Pass | Pass (+34) | Pass | Pass | Pass | None |
| `autobyteus-web/services/agentStreaming/teamTaskTeamExecutionProjection.ts` | 261 | Pass | Pass (+27) | Pass | Pass | Pass | None |
| `autobyteus-web/services/eventMonitor/recentEventMonitorMutationCommit.ts` | Removed | N/A | Pass (deletion) | Pass | Pass | Pass | None |
| `autobyteus-web/services/eventMonitor/recentEventMonitorMutationCoordinator.ts` | 62 | Pass | Pass (+69) | Pass | Pass | Pass | None |
| `autobyteus-web/services/runHydration/runContextHydrationService.ts` | 173 | Pass | Pass (+3) | Pass | Pass | Pass | None |
| `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | 489 | Pass | Pass (+10) | Pass | Pass | Pass | None |
| `autobyteus-web/services/runHydration/teamRunMemberStatusHydration.ts` | 73 | Pass | Pass (+2) | Pass | Pass | Pass | None |
| `autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts` | 83 | Pass | Pass (+4) | Pass | Pass | Pass | None |
| `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | 254 | Pass | Pass (+21) | Fail | Pass | Local Fix (CR-009) | Resolve CR-009 |
| `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts` | 62 | Pass | Pass (+5) | Pass | Pass | Pass | None |
| `autobyteus-web/services/runSubmission/localUserSubmission.ts` | 113 | Pass | Pass (+58) | Fail | Pass | Local Fix (CR-007) | Resolve CR-007 |
| `autobyteus-web/stores/agentContextsStore.ts` | 196 | Pass | Pass (+12) | Pass | Pass | Pass | None |
| `autobyteus-web/stores/agentRunStore.ts` | 393 | Pass | Pass (+6) | Fail | Pass | Local Fix (CR-007) | Resolve CR-007 |
| `autobyteus-web/stores/agentTeamContextsStore.ts` | 283 | Pass | Pass (+13) | Pass | Pass | Pass | None |
| `autobyteus-web/stores/agentTeamRunStore.ts` | 498 | Pass | Pass (+28) | Fail | Pass | Local Fix (CR-007/CR-008) | Resolve CR-007/CR-008 |
| `autobyteus-web/stores/runHistoryLoadActions.ts` | 322 | Pass | Pass (+0) | Pass | Pass | Pass | None |
| `autobyteus-web/stores/runHistoryNavigationPatches.ts` | 187 | Pass | Pass (+199) | Pass | Pass | Pass | None |
| `autobyteus-web/stores/runHistoryNavigationProjection.ts` | 178 | Pass | Pass (+187) | Pass | Pass | Pass | None |
| `autobyteus-web/stores/runHistoryNavigationStoreActions.ts` | 107 | Pass | Pass (+115) | Pass | Pass | Pass | None |
| `autobyteus-web/stores/runHistorySelectionActions.ts` | 128 | Pass | Pass (+2) | Pass | Pass | Pass | None |
| `autobyteus-web/stores/runHistoryStore.ts` | 488 | Pass | Pass (+88) | Pass | Pass | Pass | None |
| `autobyteus-web/stores/runHistoryTeamExecutionRows.ts` | 100 | Pass | Pass (+109) | Pass | Pass | Pass | None |
| `autobyteus-web/stores/runHistoryTeamHelpers.ts` | 156 | Pass | Pass (+3) | Pass | Pass | Pass | None |
| `autobyteus-web/stores/runHistoryTeamMemberProjectionHydrator.ts` | 305 | Pass | Pass (+9) | Pass | Pass | Pass | None |
| `autobyteus-web/stores/runHistoryTypes.ts` | 248 | Pass | Pass (+24) | Pass | Pass | Pass | None |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | 289 | Pass | Pass (+4) | Pass | Pass | Pass | None |
| `autobyteus-web/utils/workspaceTeamExecutionDisplayRows.ts` | Removed | N/A | Pass (deletion) | Pass | Pass | Pass | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility machinery in changed scope | Pass | No wrappers, dual paths, version gates, or aliases were added. |
| No legacy behavior retention | Pass | Replaced paths remain removed. |
| Persisted-data transition decision followed | Pass | Changes are per-connection/in-memory presentation state; no migration is applicable. |
| No version-specific read/write fallback | Pass | None exists. |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Delivery should synchronize `autobyteus-server-ts/docs/modules/agent_streaming.md`, `autobyteus-web/docs/agent_execution_architecture.md`, and `autobyteus-web/docs/settings.md` after source/API/E2E pass; verify `autobyteus-web/docs/content_rendering.md` remains accurate.

## Material Premise Validation

### Upstream premise

| Premise ID | Status | Evidence |
| --- | --- | --- |
| ARCH-PREM-004 | Confirmed | First ordinary exact task-agent ensure/repair is router-owned, reports its mutation, and precedes read-only resolution. |

### CR-PREM-007 — A supported local submission failure reaches navigation before terminal status cleanup

- Origin: `New during re-review`
- Related contracts: BEH-004, FR-002/FR-003, AC-002/AC-007.
- Initiating basis: `User` — the workspace composer sends to the selected standalone run or focused team member, and preparation/connection/upload may fail.
- Forward production trace: composer -> `activeContextStore.send` -> standalone/team send action -> `beginLocalUserSubmission` -> catch -> `failLocalSubmission` -> exact navigation patch -> `applyOfflineOrTerminalCleanup(..., Error)`.
- Material consequence: `applyLocalSubmissionNavigation` reads the pre-cleanup status. The cached row receives correct summary/activity but can retain Idle/Running while the authoritative context becomes Error.
- Reachability: `Reachable`.
- Review consequence: CR-007, bounded local ordering fix plus caller-level standalone/team regression coverage.

### CR-PREM-008 — First send or restore activates navigation before the team context

- Origin: `New during re-review`
- Related contracts: BEH-004/BEH-006, FR-002/FR-003, AC-002.
- Initiating basis: `User` plus canonical `System` snapshot — the user sends the first message to a draft team or resumes an inactive team; the connected server sends its required initial `TEAM_RUN_LIFECYCLE is_active=true` snapshot.
- Forward production trace: `TeamWorkspaceView` -> `sendMessageToFocusedMember` -> create/restore -> `markTeamAsActive` -> full navigation build from `allTeamRuns` while `finalTeamContext.isActive` is still false -> set context true -> connect -> initial lifecycle true -> `handleTeamRunLifecycle` equal-no-op.
- Material consequence: team-context overlay wins during the build, so the cached root can remain inactive until the unrelated best-effort `refreshTreeQuietly` completes; the canonical equal snapshot cannot repair it.
- Reachability: `Reachable`.
- Review consequence: CR-008, order the source mutation before navigation publication or apply one exact active patch, with new/restored-team regression coverage.

### CR-PREM-009 — Reopening an already subscribed live team reuses preserved member contexts

- Origin: `New during re-review`
- Related contracts: BEH-005, FR-002, AC-003/AC-007; DS-006 exact lifecycle ordering.
- Initiating basis: `User` — the user selects/reopens an already subscribed live team from history.
- Forward production trace: history selection -> `openTeamRun` -> `shouldKeepLiveContext=true` -> merge hydrated members while preserving existing live contexts -> compute `finalBaselineMemberKeys` as new members only -> prime only those keys.
- Governing consequence: SR-004 explicitly requires preserved subscribed members to avoid reset but receive an idempotent prime after the merge decision. Current code and test intentionally skip that final lifecycle call, so the final-witness contract is not implemented for this supported reuse path.
- Reachability: `Reachable`.
- Review consequence: CR-009, restore the required idempotent prime without resetting preserved live contexts; retain one post-activity prime for replaced/new members.

## Prior Finding Resolution

| Finding | Resolution | Evidence |
| --- | --- | --- |
| CR-001 | Resolved | Deep-cloned recursively frozen control snapshots isolate nested mutation from scheduler/sink delivery; focused test covers observer and filter attempts. |
| CR-002 | Resolved | Combined `PRESENTATION` plus `occurredAt` preserves terminal activity in one exact standalone/team patch. |
| CR-003 | Resolved | Local submission, attachment, and failure mutations now apply exact summary/activity navigation effects; equal attachments no-op. CR-007 is a distinct caller-ordering defect in final status propagation. |
| CR-004 | Resolved | Root lifecycle reports actual change; equal/mismatched payloads no-op; real changes use exact root presentation patch. CR-008 is a distinct send/restore activation-order defect. |
| CR-005 | Resolved | Equal top-level and unaffected workspace bucket collections retain reference identity. |
| CR-006 | Resolved | Replacement paths no longer prime between conversation and activity; they prime once after final hydration. CR-009 is a distinct preserved-subscribed reuse omission. |

## Review Scorecard

- Overall score: `9.17/10 (91.7/100)`.
- Calculation: simple average of ten categories. Result remains `Fail` because categories 1, 3, 7, and 8 are below 9.0 and CR-007–CR-009 are actionable supported-path defects.

| Priority | Category | Score | Basis / Improvement |
| --- | --- | ---: | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 8.9 | Clear spines, but caller ordering can publish stale final status/team activity. Resolve CR-007/CR-008. |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.2 | Owners are singular and control immutability is enforced. |
| 3 | API / Interface / Query / Command Clarity | 8.9 | Interfaces are narrow; lifecycle call order does not meet their final-state contracts. |
| 4 | Separation of Concerns and File Placement | 9.4 | Capability placement remains strong. |
| 5 | Shared-Structure / Data-Model Tightness | 9.3 | Combined effects and referential reconciliation are corrected. |
| 6 | Naming Quality and Local Readability | 9.5 | Names and bounded helpers are clear. |
| 7 | API/E2E Readiness | 8.5 | Focused suites pass, but three supported caller/lifecycle seams remain unproved and incorrect. |
| 8 | Runtime Correctness and Behavioral Fidelity | 8.4 | Core architecture is correct; final status, team activation, and subscribed reuse lifecycle remain wrong. |
| 9 | No Backward-Compatibility / Legacy Retention | 9.8 | Clean replacement with no dual behavior. |
| 10 | Cleanup Completeness | 9.8 | Deleted owners remain gone; both diff checks pass. |

## Findings

### CR-007 — Failure navigation is patched before the authoritative Error status

- Status: `Open`
- Classification: `Local Fix`
- Affected contracts: BEH-004, FR-002/FR-003, AC-002/AC-007.
- Material premise: CR-PREM-007 (`Reachable`).
- Evidence: `localUserSubmission.ts:39-49,104-126` reads `context.state.currentStatus` while applying failure navigation. Both `agentRunStore.ts:242-243` and `agentTeamRunStore.ts:500-501` call `failLocalSubmission` before `applyOfflineOrTerminalCleanup(..., AgentStatus.Error)`.
- Consequence: supported preparation/upload/connection failures can leave the cached row status stale although the context is Error.
- Required action: Apply terminal cleanup before the failure navigation effect, or explicitly patch Error after cleanup. Add caller-level standalone and team failure tests asserting authoritative context and cached navigation status agree, summary/activity remain exact, and no topology build occurs.

### CR-008 — Team send/restore can publish an inactive cached root that the equal lifecycle snapshot cannot repair

- Status: `Open`
- Classification: `Local Fix`
- Affected contracts: BEH-004/BEH-006, FR-002/FR-003, AC-002.
- Material premise: CR-PREM-008 (`Reachable`).
- Evidence: `agentTeamRunStore.ts:439-455` calls `markTeamAsActive` before setting `finalTeamContext.isActive=true`. `runHistoryStore.ts:325-347` rebuilds immediately; `runHistoryNavigationStoreActions.ts:27-40` includes all live contexts; `runHistoryTeamHelpers.ts:127-159` overlays persisted activity with `teamContext.isActive`. `TeamStreamingService.ts:394-401` correctly no-ops the later equal initial snapshot.
- Consequence: first-send/resume navigation can remain visibly inactive until a best-effort full refresh returns.
- Required action: Establish `finalTeamContext.isActive=true` before the activation publication, or follow source mutation with one exact team-root patch. Add new-team and restored-team tests proving the cached root is immediately active and the equal initial lifecycle snapshot performs no extra patch/build.

### CR-009 — Preserved subscribed team members skip the required idempotent final Event Monitor prime

- Status: `Open`
- Classification: `Local Fix`
- Affected contracts: BEH-005, FR-002, AC-003/AC-007, DS-006.
- Material premise: CR-PREM-009 (`Reachable`).
- Evidence: `teamRunOpenCoordinator.ts:166-205,239-251` excludes every preserved existing member from `finalBaselineMemberKeys`, then primes only that filtered list. SR-004 lines 273-290 and 842 require no reset plus idempotent prime after subscribed-live reuse. The IR-002 test/handoff assert zero re-prime instead of the reviewed contract.
- Consequence: the supported reuse lifecycle does not re-establish the required final-witness boundary after its merge decision.
- Required action: Prime preserved subscribed contexts idempotently after reuse without resetting them. Preserve exactly one post-activity prime for new/replaced members. Cover both branches and assert no intermediate prime/reset.

## Classification

- Overall failure classification: `Local Fix`.
- Rationale: All three defects are bounded sequencing/test omissions inside existing SR-004 owners. Requirements, protocol, persistence, and architecture do not need revision.

## Recommended Recipient

- `implementation_engineer`
- API/E2E must remain paused until the next full source-review pass.

## Residual Risks

- Aggregate browser/Electron responsiveness and exact sustained background correctness remain downstream API/E2E work.
- Repository-wide Nuxt/server typecheck baseline limitations remain as recorded; focused green runs do not convert them into broad passes.
- Durable documentation synchronization remains delivery-owned.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate: `Pass`
- Score Summary: `9.17/10 (91.7/100)`; categories 1, 3, 7, and 8 remain below threshold.
- Recommended Recipient: `implementation_engineer`
- Notes: CR-001–CR-006 are resolved. CR-007–CR-009 require bounded source/test correction before API/E2E.
