# Code Review Report — Universal Team status (delegated-team-aggregate-status)

## Review Round Meta

- Review Entry Point: `Implementation Review` (user-requested independent source review on a direct `Medium`/`Low` route; requested through `/software_engineering_team/implementation_engineer`, 2026-10-17)
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved R2 / SR-002, AP-001; read with its uncommitted Solution Designer edits, incl. open DEC-004)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (referenced via design spec; not re-audited)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (context only)
- Design Spec Reviewed As Context: `design-spec.md` (SR-003)
- Supplemental Task Artifacts Reviewed As Context: none behavior-defining (two evidence screenshots only)
- Relevant Solution Revision IDs: `SR-002` (requirements), `SR-003` (design)
- Design Review Report Reviewed As Context: `N/A — not applicable` (direct route)
- Architecture Review Revision Record Reviewed As Context: `N/A — not applicable`
- Relevant Architecture Review Revision IDs: `N/A`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: user request ("could you send the change to code reviewer to review please") relayed by Implementation Engineer; no handoff rule selected source review for this package.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: `1`
- Coverage Investigation / Execution Coverage Report / API/E2E Revision Record: read as context only (API-REV-001 passed); this is not a failure-origin round.
- Delivery Revision Record Reviewed: context only (DR-003, on hold for UF-001 / DEC-004).
- Reviewed source: commit `d1a66feca` against base `927796780` (`git show d1a66feca`). Verified the reviewed source files are byte-identical at branch tip (`git diff --quiet d1a66feca HEAD -- <changed source>`), so the later `origin/personal` merge does not alter them.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `Low`
- Selected route: `Implementation Review` (user-requested, outside the configured route)
- Independent source review required by the classification: `No` (direct route); performed on user request
- Classification evidence or correction required: Confirmed. 17 web source/localization files, +163/−98; no server, contract, stream, persistence or ownership-boundary change; shared `foldTeamAggregateStatus` untouched. No correction.

## Review Scope

- Changed implementation and behavior reviewed: one web Team status rule (`resolveTeamStatus`) and its four per-root counting projections (Team run, Agent run, Org run, TEAMS run/group), the renderers, and dead-code removals.
- Files / areas reviewed: `utils/workspaceTeamAggregateStatus.ts`; `components/workspace/history/{workspaceHistoryTeamBranchStatus.ts, workspaceHistoryTeamDefinitionGroups.ts, WorkspaceTeamExecutionTree.vue, WorkspaceStableExecutionRow.vue, WorkspaceTransientExecutionRow.vue, TeamAggregateStatusDot.vue, AgentRunTaskRows.vue, WorkspaceAgentOrgHistoryCollection.vue, WorkspaceHistoryWorkspaceSection.vue}`; `services/agentCollaboration/agentRunCollaborationContext.ts`; `services/agentOrgExecution/agentOrgTeamBranchStatus.ts`; `utils/agentOrgHistoryRows.ts`; localization (en, zh-CN). Changed specs and the two probe edits in `d1a66feca` were read for API/E2E readiness. Supporting reads: shared fold (`collaboration-stream-contracts/src/team-aggregate-status.ts`), `AgentStatus`, `agentRunCollaborationStore.ts`, `agentRunCollaborationStreamingService.ts`, `runHistoryTeamExecutionRows.ts`, `applyOfflineOrTerminalCleanup`.
- Explicit exclusions: uncommitted docs and ticket edits (Delivery/Solution Designer); `components/workspace/running/*` (out of scope); DEC-004 presentation choice (open user decision, not a code question).
- Focused check run: `npx vitest run` on 9 changed specs (rule, branch status, Agent-root context + closure, Org branch status, Org rows, section, transient row, Org delegated rows) → 9 files / 122 tests passed. Worktree tracked files unchanged afterwards.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-001..008 / AC-001..011 (AP-001). Rule: busy (running or starting) > error > idle > offline; offline when the containing run is not alive; count every agent shown under the row, collapsed included, excluding closed work; group = highest of runs.
- Design-spec behavior map verified against the implementation: Yes (DS-001..DS-005).
- Design review report and round confirmed: N/A (direct route).
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none.
- Remaining material ambiguity: DEC-004 (presentation A/B/C) is open with the user; it does not affect the rule or counting reviewed here.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / New Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `listTaskRows` walks every listed node with a `shown` flag; agents return `statusOf(id)` (reactive `state.currentStatus`, same value the agent row shows); each Team entry gets `resolveTeamStatus(subtreeStatuses, this.isActive)`; closed nodes return `[]` before emission or counting. → `AgentRunTaskRows` → `WorkspaceTransientExecutionRow` `teamStatus` → `TeamAggregateStatusDot`. Specs: collapsed/expanded, reactive idle→running→error→starting→offline, not-alive gray, closure/reopen. | — |
| BEH-002 | Confirmed | `WorkspaceTeamExecutionTree.teamStatusOf` → `teamBranchStatus(team.executionRows, row, team.isActive)` at render time; depth slice counts Agent rows only; `executionRows` already excludes closed rows (`isTaskExecutionRowListed`) and contains collapsed rows. | — |
| BEH-003 | Confirmed | `projectAgentOrgHistoryRows` → `teamStatusInput(source, …)` (`runAlive = authority === 'live'`, `isListed`) → `projectAgentOrgTeamBranchStatus` / `projectAgentOrgTaskTeamStatus` (one listed-agent collector) → `resolveTeamStatus`. | — |
| BEH-004 | Confirmed | Shared rank puts `initializing` (3) above `error` (2); `resolveTeamStatus` maps it to `running`, so "starting counts busy" also outranks error as required. Gate `!runAlive → offline` applied on all surfaces. | — |
| BEH-005 | Confirmed | `WorkspaceHistoryWorkspaceSection` renders `TeamAggregateStatusDot` with `teamRunStatus(team)` / `teamDefinitionGroupStatus(group.runs)`; Stop/archive/delete markup untouched (diff shows only the dot swap). | — |
| BEH-006 | Confirmed | No `StatusDot` usage on agent rows changed; Org root row untouched. Transient row renders `TeamAggregateStatusDot` only in the `v-else` of `memberKind === 'agent'`; `memberKind` is `'agent' | 'agent_team'`. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal / Event | Entry Surface | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001; AC-001..007 | User | User watching an Agent run | Know which delegated Teams work | Workspaces tree under an Agent run | Normal | DS-001 | Dot follows REQ-001..003, collapsed too | Requirements screenshot 1; API/E2E TS-001 | Supported Normal Scenario | Use |
| SCN-002 | BEH-002/004 | User | User | Same, under a Team run | Tree under a Team run | Normal | DS-002 | Same | `runHistoryTeamExecutionRows`; TS-003 | Supported Normal Scenario | Use |
| SCN-003 | BEH-003/004 | User | User | Same, under an Org run | Tree under an Org run | Normal | DS-003 | Same | `agentOrgHistoryRows`; TS-004 | Supported Normal Scenario | Use |
| SCN-004 | BEH-005 | User | User | Is a standalone Team run working | TEAMS run row | Normal | DS-004 | Dot follows rule; stopped gray | Screenshot 2; TS-002 | Supported Normal Scenario | Use |
| SCN-005 | BEH-005 | User | User | Is any run of a Team definition working | TEAMS group row | Normal | DS-004 | Highest of runs | TS-002 | Supported Normal Scenario | Use |
| SCN-STOP | REQ-003, AC-007 | User/System | User stops the host, or host lifecycle ends | Team reads gray | Terminate button / stream `is_active=false` | Normal | `setActive(false)` or `beginHostTermination.confirm → setActive(false)` | Gray | `agentRunCollaborationContext.setActive`; TS-001 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CR-C01 | `listTaskRows` reads `this.isActive` from the context's plain `view` field; the context instance is held in a `shallowRef`, so `view.is_active` changes are not themselves reactive. | SCN-STOP, REQ-003/008 | User terminates the Agent run, or host lifecycle stream reports inactive | Every path to inactive goes through `setActive(false)`, which also runs `applyOfflineOrTerminalCleanup` on every child context (reactive `state.currentStatus = Offline`). That re-evaluates `taskRows`, and the fold of all-offline is offline anyway. Becoming active again happens through `publish` → `setContext` (new `contexts.value`), which is reactive. | `agentRunCollaborationContext.ts` `setActive`; `agentRuntimeStatusState.ts:59-70`; `agentRunCollaborationStore.ts` `setContext`/`publish`; TS-001 "terminated → gray" passed live | Reject | — | No reachable stale-dot consequence. |
| CR-C02 | Collapsed-subtree walk and closure exclusion (reviewer question 1). | SCN-001, AC-005/006 | User collapses a delegated Team; a Task is DONE | `visit(child, depth+1, childrenShown)` recurses into all listed children regardless of expansion and emits only when `shown`; `hidden` check at the top of `visit` returns `[]` before emission or counting, so closed subtrees are neither shown nor counted, including nested Teams. `hasChildren` and sibling lines are computed exactly as before. Team status is assigned after the recursion on the same entry object that was already pushed (mutation before `Object.freeze`), so ordering is correct. | Diff; `agentRunCollaborationContext.spec.ts` (collapsed/expanded, reactive), `agentRunCollaborationClosure.spec.ts` (closed/reopen) | Reject | — | Correct as implemented. |
| CR-C03 | Org `runAlive = authority === 'live'`: an active Org whose live context is not loaded reads gray (reviewer question 3). | SCN-003, REQ-002/003, ASM-001 | User has not opened an active Org this session | In that state `statusForAgentRunId` returns `undefined`, so every agent row under it also reads offline via `exactAgentStatus`. The Team dot therefore matches its own agent rows (REQ-002 "same status its own row shows"). The freshness gap is recorded as ASM-001 with a Solution Designer follow-up. | `agentOrgHistoryRows.ts` `statusSource`; requirements ASM-001 | Reject | — | Approved, documented behavior; not an implementation defect. |
| CR-C04 | Reactivity of Team-run rows (reviewer question 2). | SCN-002/004/005, REQ-008 | `AGENT_STATUS` → `patchTeamMember` updates one agent row | `teamStatusOf`, `teamRunStatus`, `teamDefinitionGroupStatus` are called from templates on each render and read current `executionRows`/`isActive`; nothing is stored. | Diff; design DS-002/DS-004; NTAS probe "collapsed live idle" | Reject | — | Correct; no stored Team status. |
| CR-C05 | "One rule owner" boundary (reviewer question 5). | Design § Boundary Encapsulation Map | — (structural) | `git grep` at `d1a66feca`: only `resolveTeamStatus` callers compute Team status (branch helper, Agent-root context, Org collector). The web `foldTeamAggregateStatus` wrapper is used once, by `exactAgentStatus` for single-agent normalization, as the design's thin facade allows. Group row reuses the rule over run statuses with `runAlive=true`, which is valid because the four `TeamStatus` values keep the shared rank order. | grep output in review | Reject | — | Boundary holds. |
| CR-C06 | `WorkspaceTeamExecutionTree` also computes `teamStatusOf` for transient Agent rows (short-circuits to offline; prop ignored for agents). | Engineering contract (no-op) | — | Negligible cost; no visible effect. | Diff | Reject | — | Nit only; no action required. |
| CR-C07 | Agent-root closure/reopen events reassign the plain `view` field without a reactive trigger, so a Task DONE may not re-render the Agent-root task rows (and now the Team dot) until another reactive change. | REQ-002 / AC-006 runtime freshness | Task marked DONE under an Agent run | Pre-existing for the rows themselves (`applyEvent` `task_executions_closed` branch, unchanged by this ticket); the Team dot shares the rows' trigger, so it can never contradict them. Whether a reactive change reliably follows closure in practice is unverified. | `agentRunCollaborationContext.ts` l.145-163; no `triggerRef`/`setContext` on closure in store or streaming service | Hold for Evidence | (would be Follow-up) | Not scored or routed. Mentioned to the Implementation Engineer as a possible separate investigation only. |
| CR-C08 | `team-activity-presentation-probe.mjs` cannot render (fixture crashes in `running/RunningTeamGroup.vue`) (reviewer question 4). | Design Removal Plan (follow-up row) | — | Pre-existing in the out-of-scope `running/*` surface. The history-surface edits in this commit are correct by reading. The design already lists the `running/*` + fixture + probe cluster as a follow-up removal. | handoff § Local Implementation Checks; design Removal Plan | Reject (as finding) | Follow-up already recorded upstream | Not duplicated. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | `Duplicated Policy Or Coordination` → one rule owner; implemented as designed | — |
| Matches behavior-defining supplements | Pass | None exist; REQ-006 placement (dot before slate icon) honored on all rows | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001..DS-005 map 1:1 to code paths | — |
| Ownership boundary preservation | Pass | Rule in `utils`; counting stays in each root's existing owner; renderers present only | — |
| Off-spine concern clarity | Pass | Rule is a pure off-spine function serving all projections | — |
| Existing capability reuse | Pass | Shared fold reused (wrapped), `TeamAggregateStatusDot`/`StatusDot` reused, existing depth scan and Org collector extended | — |
| Reusable owned structures | Pass | `TeamStatus` + `resolveTeamStatus` single owned file | — |
| Shared-structure tightness | Pass | `TeamStatus` four values; Team status kept off agent-only `currentStatus`; `hasActiveRuns` removed | — |
| Repeated coordination ownership | Pass | Ranking/gating/mapping exists only in `resolveTeamStatus` (CR-C05) | — |
| Empty indirection | Pass | `teamRunStatus`/`teamDefinitionGroupStatus` own counting scope; no pass-through layers | — |
| Separation of concerns / file responsibility | Pass | Each changed file keeps its concern | — |
| Ownership-driven dependency | Pass | `services/agentCollaboration` → `utils` only; no `components/*` import from services | — |
| Authoritative Boundary Rule | Pass | No caller uses both `resolveTeamStatus` and the shared fold for Team rows | — |
| File placement | Pass | No moves needed | — |
| Flat-vs-over-split layout | Pass | No new files | — |
| Interface boundary clarity | Pass | `teamBranchStatus(rows, row, runAlive)`, `projectAgentOrg*Status(input)` explicit subjects | — |
| Naming quality | Pass | `resolveTeamStatus`, `teamBranchStatus`, `teamRunStatus`, `teamDefinitionGroupStatus`, `appendListedTaskAgentRunIds` read naturally. The web wrapper name `foldTeamAggregateStatus` now serves single-agent normalization only; design-approved thin facade, documented in its JSDoc | — |
| No unjustified duplication | Pass | Org collectors share one recursive helper | — |
| Patch-on-patch complexity | Pass | `listTaskRows` change is one walk with a `shown` flag, not a second walk | — |
| Dead code removed in touched files | Pass | `aggregateTeamBranchAgentStatus`, `hasActiveRuns`, `team_status_initializing` (en, zh-CN), four section binary-label keys removed; `git grep` at `d1a66feca` finds no remaining reference outside `running/*` namespaces | — |
| Test scenarios clear and requirement-aligned | Pass | Specs tag REQ/AC IDs; cover collapsed, reactive change, liveness gate, closure/reopen, group ranking | — |
| Test fixtures/helpers coherent | Pass | Reuse existing builders (`build`, `buildClosureContext`) | — |
| No stale/compat-only tests | Pass | Binary-dot assertions replaced, not kept beside new ones | — |
| API/E2E readiness | Pass | Already executed: API-REV-001 passed with a live-stack probe | — |

## Source File Size And Structure Audit

| Source File | Non-Empty Before | After | `>500` | `>220` Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | 453 | 448 | Pass | Over 220 before; shrank | Pass | Pass | OK | — |
| `services/agentCollaboration/agentRunCollaborationContext.ts` | 341 | 354 | Pass | Over 220 before; +13 within its owned concern | Pass | Pass | OK | — |
| `utils/agentOrgHistoryRows.ts` | 245 | 254 | Pass | Over 220 before; +9 | Pass | Pass | OK | — |
| `components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue` | 253 | 255 | Pass | +2 | Pass | Pass | OK | — |
| `components/workspace/history/WorkspaceStableExecutionRow.vue` | 248 | 249 | Pass | +1 | Pass | Pass | OK | — |
| `components/workspace/history/WorkspaceTransientExecutionRow.vue` | 212 | 224 | Pass | Crosses 220 by 4 with a presentation-only prop/branch | Pass | Pass | OK | — |
| `services/agentOrgExecution/agentOrgTeamBranchStatus.ts` | 36 | 54 | Pass | — | Pass | Pass | OK | — |
| `utils/workspaceTeamAggregateStatus.ts` | 8 | 25 | Pass | — | Pass | Pass | OK | — |
| `components/workspace/history/workspaceHistoryTeamBranchStatus.ts` | 28 | 34 | Pass | — | Pass | Pass | OK | — |
| Others (`AgentRunTaskRows.vue`, `TeamAggregateStatusDot.vue`, `WorkspaceTeamExecutionTree.vue`, `workspaceHistoryTeamDefinitionGroups.ts`, localization) | — | ≤ base+1 or reduced | Pass | — | Pass | Pass | OK | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | Binary dot replaced, no dual display |
| No legacy old-behavior retention | Pass | `TeamActivityDot` no longer used by the tree |
| Dead code removed in touched files | Pass | See checks above |
| Persisted-data transition decision followed | Pass | `Not Affected` |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal

None in this ticket's scope. `components/workspace/running/*`, `common/TeamActivityDot.vue`, the e2e fixture's running surface and the running part of `team-activity-presentation-probe.mjs` are already listed by the design as a follow-up removal.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: run/group row meaning changed from "alive" to member-derived.
- Files: those listed in the design spec's docs-sync guidance; Delivery has uncommitted edits in progress (not reviewed here).

## Additional Material Premise Validation

None.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.4
- Overall score (`/100`): 94

| Priority | Category | Score | Why This Score | What Is Weak | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Four root spines and one rule spine match the code exactly | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One rule owner; counting stays with each root's owner; no bypass | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.3 | Explicit subjects and inputs (`runAlive`, `isListed`) | `teamStatus` defaults to offline on the transient row instead of being required for Team rows (design-approved) | — |
| 4 | Separation of Concerns and File Placement | 9.4 | Small, in-owner edits; no misplaced logic | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.5 | Four-value `TeamStatus`; agent-only `currentStatus` untouched | — | — |
| 6 | Naming Quality and Local Readability | 9.2 | Clear names and JSDoc | Web wrapper still called `foldTeamAggregateStatus` though now single-agent only (design-approved facade, pre-existing name) | Optional rename in a later cleanup |
| 7 | API/E2E Readiness | 9.5 | Already validated live (API-REV-001) | — | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 | Rank order, starting→busy above error, liveness gate, collapsed counting and closure exclusion all verified; specs pass | Closure-event freshness on Agent roots is unverified but pre-existing and shared with the rows (CR-C07, held, not scored) | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean replacement | — | — |
| 10 | Cleanup Completeness | 9.3 | Dead helper, field and keys removed with grep evidence | `running/*` cluster deferred to the design's follow-up | — |

## Findings

None.

## Follow-ups

| Follow-up ID | What is wrong, where | Evidence | Why outside this ticket | Suggested Task |
| --- | --- | --- | --- | --- |
| — | No new follow-up sent. The `running/*` removal is already recorded in the design spec's Removal Plan; CR-C07 is held for evidence and not promoted. | — | — | — |

- Sent to: `None`

## Classification

`Pass` — no classification.

## Recommended Recipient

Result returned to the requester, `/software_engineering_team/implementation_engineer` (user-requested review; API/E2E has already passed and Delivery is on hold, so no stage advance is triggered by this result).

## Residual Risks

- CR-C07 (held): if an Agent-root `task_executions_closed`/`reopened` event is not followed by another reactive change, both the task rows and the Team dot stay as they were until one occurs. Pre-existing; worth a quick check in a separate task if the user sees stale rows after a Task is DONE.
- ASM-001 freshness (unopened Agent hosts / Orgs) remains as the Solution Designer recorded.
- DEC-004 may change presentation (REQ-006); the rule and counting reviewed here would be reused unchanged.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (user-requested)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 / 10 (94/100); every category ≥ 9.0
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/implementation_engineer` (requester)
- Notes: Read-only review; no tracked file in the worktree was modified.
