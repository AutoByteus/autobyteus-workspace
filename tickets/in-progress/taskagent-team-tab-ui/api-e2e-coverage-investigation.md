# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/in-progress/taskagent-team-tab-ui/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/in-progress/taskagent-team-tab-ui/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/in-progress/taskagent-team-tab-ui/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/in-progress/taskagent-team-tab-ui/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/in-progress/taskagent-team-tab-ui/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/in-progress/taskagent-team-tab-ui/code-review-report.md`
- Current Investigation Round: 1 (fresh round after the TaskAgent / TaskAgent-team Tasks UI redesign package; supersedes the earlier pre-redesign investigation content at this same path)
- Trigger: Fresh full code-review pass handoff from `code_reviewer` for the TaskAgent / TaskAgent-team Team tab Tasks UI redesign.
- Prior Investigation Reviewed: Yes. The prior file content covered the older right-side section-chevron/count task and is stale for the later task-reference/master-detail redesign. It was replaced with this current investigation before final execution.
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior is the redesigned right-side Team tab experience for TaskAgent and TaskAgent-team active work. Messages remains the default-open section and its content/reference behavior remains user-visible unchanged except that the section header disclosure is now the same leading chevron pattern used by the Team tab Tasks section. The Tasks section is collapsed by default, shows a human count such as `0 tasks`, `1 task`, or `2 tasks`, and opens into a Messages-like master/detail layout.

For Tasks, the left navigator owns task selection and task-owned reference rows. The right pane shows either the selected task body/details or, after a left-side reference click, a read-only task-owned reference preview with Back/maximize/raw/preview/loading/unavailable/forbidden/error handling consistent with the existing Messages reference viewer. The primary Tasks UI must use target names and body text, not visible `Task Agent` / `Task Team` badges, target-type labels, raw IDs, or separate task-kind rows. Focus is explicit: selecting a task is read-only, top-level Focus and task-team member Focus controls are the only focus actions. Tasks must never render Approve/Deny controls or own approval APIs; waiting states can be shown calmly as status text only, while Activity remains the approval surface.

The backend/source-of-truth requirement is that delegated task records/events carry normalized task reference metadata and normalized `taskArguments`; the frontend protocol/projections/active-task entry model propagate those values into the Tasks UI. The new task reference content API is task-owned (`teamRunId + taskId + referenceId`) and must not fake or reuse message-owned IDs/routes.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: old trailing header chevrons, generic Active Tasks list/detail behavior, primary visible task kind labels, duplicated right-detail reference rows, and Tasks approval controls were removed rather than retained behind compatibility branches. The code review found no findings, passed the implementation, and recommended API/E2E emphasis on live/current task-reference preview paths, missing/unreadable reference states, no approval controls/API ownership in Tasks, Messages regression, task-team member focus, and awareness that base-branch refresh is later delivery-owned.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Messages and Tasks section headers use leading disclosure chevrons, with Messages open by default and Tasks collapsed by default. | Changed / Preserved | `requirements.md` REQ-001/REQ-002/REQ-022; `design-spec.md` Messages header exception; `code-review-report.md` pass. | Execute `TeamOverviewPanel.spec.ts`; static source probe for removed trailing glyphs and parent-owned state. |
| Tasks collapsed header shows human task count (`N tasks`) and no approval summary. | Changed / Removed | `requirements.md` REQ-004/REQ-017; active-task labels rework docs. | Execute `TeamActiveTasksSection.spec.ts`; static probe for approval terms in Tasks components. |
| Tasks expanded state is a master/detail layout with task selection in the left navigator and task body/details or selected reference preview in the right pane. | Added / Changed | `requirements.md` REQ-005/REQ-011/REQ-012/REQ-013; UX prototype docs; `implementation-handoff.md`. | Execute `TeamActiveTasksSection.spec.ts` and `TeamTaskReferenceViewer.spec.ts`; run server task-reference API coverage. |
| Task reference metadata and task arguments originate from delegated task records/events and projections, not from messages. | Added | `requirements.md` REQ-014/REQ-015; `design-rework-task-reference-files.md`; implementation handoff file list. | Execute projection tests and server task-delegation tests; static probe verifies task-owned route and no message route in task viewer. |
| Task reference content route serves bytes by `teamRunId + taskId + referenceId` and maps not-found/unavailable/forbidden/error states gracefully. | Added | REQ-013/REQ-014; implementation handoff route details; code-review focus hints. | Execute durable server unit/API tests; add a temporary route probe for unpersisted error-code mappings because durable coverage covers success and forbidden but not every route mapping. |
| Primary Tasks UI hides `Task Agent` / `Task Team`, target-kind badges, raw IDs, `Task brief`, and default right-side reference rows. | Removed / Changed | REQ-006/REQ-008/REQ-011/REQ-024; label/chevron rework docs. | Execute Tasks component tests; static source probe for forbidden visible copy in primary components. |
| Tasks selection is read-only; Focus controls remain explicit and task-team members get generic Focus controls. | Changed / Preserved | REQ-007/REQ-010/REQ-024; UX behavior matrix. | Execute `TeamActiveTasksSection.spec.ts`; inspect emitted events through tests. |
| Tasks never owns approval controls, approval targets, or approval APIs. | Removed / Preserved elsewhere | REQ-017; design ownership map; implementation removed `teamActiveTaskApprovals.ts`. | Execute Tests section assertions; static probe for `Approve`, `Deny`, `postToolExecutionApproval`, `ToolApprovalTarget`, and removed helper. |
| Messages list/detail/reference behavior remains unchanged except header chevron. | Preserved | REQ-022; `design-rework-messages-visible-ux-unchanged.md`; code-review focus. | Execute `TeamCommunicationPanel.spec.ts` and `TeamCommunicationReferenceViewer.spec.ts`. |
| Activity remains approval surface and comparator; center-pane active-task strips are not reintroduced. | Preserved / Removed old shortcuts | Requirements out-of-scope; design forbidden shortcuts; code-review residual risks. | Static probe for forbidden shortcut patterns; no new durable coverage needed. |
| Branch is behind `origin/personal` by 13 commits. | Preserved external state / delivery-owned | Code-review residual risk. | Record in reports only; delivery engineer owns tracked-base refresh. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/__tests__/TeamOverviewPanel.spec.ts` | Messages section renders without Task Plan; leading section disclosures; no trailing glyphs; Messages open first, Tasks collapsed first; parent-owned toggling; reset to Messages on selected run change; route/path identity passed through. | REQ-001/REQ-002/REQ-022; AC-001..AC-005; DS parent ownership. | Still Valid | Current requirements explicitly require this behavior. Test scenarios match reviewed implementation. | Execute as final durable UI coverage. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` | Controlled collapsed state; `N tasks`; no approval summary; master/detail; first task selected; refs only in left nav; right task body/detail; task reference preview + Back; task selection does not focus; top/member Focus emits; empty state. | REQ-004..REQ-013, REQ-017, REQ-024; AC-006..AC-018; UX behavior matrix. | Still Valid | Test assertions are aligned to the final redesigned Tasks behavior and the latest code-review pass. | Execute as final durable UI coverage. |
| `autobyteus-web/components/workspace/team/__tests__/TeamTaskReferenceViewer.spec.ts` | Task reference viewer builds/fetches encoded task-owned content route by `teamRunId + taskId + referenceId` and emits Back. | REQ-012..REQ-015; task-reference rework design. | Still Valid | Proves wrapper ownership and prevents fake message-owned route construction. Generic preview/error states are covered by the shared viewer and Messages reference tests. | Execute as final durable UI/API-boundary coverage. |
| `autobyteus-web/components/workspace/team/__tests__/TeamCommunicationPanel.spec.ts` | Messages list/detail behavior, markdown detail, reference rows, selection, nested breadcrumbs, represented-subteam badges, split resize, and message-owned reference opening. | REQ-003/REQ-022; Messages content frozen rework. | Still Valid | Messages behavior is explicitly preserved except section header ownership handled by `TeamOverviewPanel`. | Execute as final Messages regression coverage. |
| `autobyteus-web/components/workspace/team/__tests__/TeamCommunicationReferenceViewer.spec.ts` | Message-owned reference content route, 404 unavailable state, non-404 read-only error, maximize/restore, raw/preview, mobile HTML preview behavior. | REQ-013 consistency requirement; REQ-022 preserved Messages UX. | Still Valid | Shared `TeamReferenceFileViewer.vue` handles generic reference preview states used by both Messages and Tasks; executing this confirms no regression. | Execute as final generic reference-viewer failure-state coverage. |
| `autobyteus-web/services/agentStreaming/__tests__/teamTaskExecutionEventRouter.spec.ts` | Applies delegated task details including task references/task arguments to task-agent projection nodes from `TASK_DELEGATION_EVENT` payloads. | REQ-014/REQ-015; design data spine. | Still Valid | Changed projection boundary is required for live Tasks metadata. | Execute as final projection coverage. |
| `autobyteus-web/services/agentStreaming/__tests__/teamTaskTeamExecutionProjection.spec.ts` | Extracts task-team identity and creates root/child clones while preserving delegated task metadata. | REQ-010/REQ-015; task-team member focus/design. | Still Valid | Task-team focus/member UI depends on this projection shape. | Execute as final projection coverage. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` | Delegation lifecycle plus task-owned reference resolution by task identity without message IDs. | REQ-014; task-reference source-of-truth design. | Still Valid | Includes the authoritative server task record/ledger reference resolution path. | Execute as final server coverage. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-reference-content-service.test.ts` | Resolves task reference bytes from the registry service and returns not-found when service/reference is missing. | REQ-013/REQ-014; API focus on missing/unreadable states. | Still Valid | Covers the content service happy path and missing task/reference state. | Execute as final server coverage. |
| `autobyteus-server-ts/tests/unit/api/task-delegation-route.test.ts` | Serves task-owned reference content route and maps forbidden/unreadable content failures to REST errors. | REQ-013/REQ-014; code-review focus on missing/unreadable states. | Still Valid | Covers REST route success and 403 forbidden mapping. Temporary probe will cover additional route error-code mappings without modifying durable coverage. | Execute as final server API coverage. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Broader in-process task-delegation lifecycle/tool flow. | General delegation lifecycle; partially related to task records, less directly to UI redesign. | Out Of Scope | The current change adds task references/UI projection, already covered by targeted server unit/API and frontend projection tests. This integration suite is useful baseline but not required for the changed boundary. | Do not gate final result unless run opportunistically. |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Live/gated Codex-backed mixed task-delegation runtime flow. | End-to-end live TaskAgent/TaskTeam behavior; potential live reference rows. | Out Of Scope / Not Testable In Scope | Test is explicitly gated (`RUN_MIXED_TASK_DELEGATION_E2E=1`) and depends on live external runtime credentials/tooling. The implementation and code-review evidence used deterministic fixture visual validation. | Do not run as final gate; record live transient row limitation. |
| `autobyteus-web/components/progress/__tests__/ActivityFeed.spec.ts` | Activity comparator behavior. | Activity remains approval surface/comparator but source not changed in final package. | Out Of Scope for final API/E2E gate | Current latest code-review targeted package uses Team tab + server/projection tests; Activity was a comparator in an earlier stage and is not a changed boundary now. | Do not gate final result. |
| Repository Playwright/Cypress durable browser E2E suite | Browser automation for full UI. | Would be relevant if present for live Team tab flows. | Out Of Scope / Not Present | Inventory found no dedicated durable browser E2E framework/scenario for this Team tab feature. | Use component/API/build/static execution and prior Electron/open_tab visual evidence; no new framework added. |
| `tickets/in-progress/taskagent-team-tab-ui/visual-validation/*.png` | Implementation visual evidence from Electron/open_tab against deterministic seeded Team tab states. | REQ-021/Electron visual validation; code-review inspected screenshots. | Still Valid as evidence, not executable durable coverage | Screenshots are not rerunnable tests but are relevant upstream evidence. | Reference in execution report; do not treat as command result. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Earlier API/E2E investigation content at this same artifact path | Prior version asserted the older “active approval summary / row approval target” section-improvement scope. | Later requirement/design rework explicitly removed Tasks approval controls and changed Tasks into master/detail with task-owned refs. | `requirements.md` REQ-017; `design-rework-task-reference-files.md`; `design-rework-active-task-labels-and-messages-chevron.md`; code-review pass. | This replacement investigation. | N/A |
| N/A durable test file | No current repository-resident durable coverage file was found that still asserts obsolete Tasks approval controls, primary task-kind badges, duplicate right-side reference rows, or trailing header glyphs. | Current tests were updated in the implementation and passed code review. | Code-review report and source/test inventory. | Existing updated tests. | No removal needed. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | Existing updated component, projection, server unit, and server REST coverage adequately cover the changed boundary in the current test architecture. | N/A | No repository-resident durable coverage addition is planned in this API/E2E round. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | No repository-resident durable coverage update is planned after code review. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | N/A | N/A | No repository-resident durable coverage removal is planned. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `TMP-STATIC-001` | Scoped source grep over changed Team tab and task-reference files for forbidden visible copy, old glyphs/clamps, fake message-route construction, approval terms/API calls, and removed approval helper references. | Confirms no old Tasks approval ownership, no primary kind-label copy, no message route in task reference viewer, and no obvious legacy UI shortcuts in changed files. | Static command output is execution evidence; durable assertions already exist in component tests where user-facing behavior matters. |
| `TMP-WEB-001` | Run targeted web Vitest files: TeamOverviewPanel, TeamActiveTasksSection, TeamTaskReferenceViewer, TeamCommunicationPanel, TeamCommunicationReferenceViewer, teamTaskExecutionEventRouter, teamTaskTeamExecutionProjection. | Proves current valid UI/projection durable coverage passes. | The tests are durable; the run log is temporary evidence. |
| `TMP-SERVER-001` | Run targeted server Vitest files: task-delegation-service, task-delegation-reference-content-service, task-delegation-route. | Proves current valid server/API durable coverage passes. | The tests are durable; the run log is temporary evidence. |
| `TMP-SERVER-002` | Create and remove a temporary Vitest route probe under `autobyteus-server-ts/tests/unit/api/__api-e2e-temp-task-delegation-route.test.ts` for additional `REFERENCE_NOT_FOUND`, `REFERENCE_CONTENT_UNAVAILABLE`, and `INVALID_REFERENCE_PATH` mappings. | Supplements durable route coverage for missing/unavailable/invalid task-reference states without adding persistent code after the code-review pass. | It is a one-off API/E2E probe to close residual-risk evidence; the implementation's durable route test already covers the main route and forbidden mapping. The temp file will be deleted before handoff. |
| `TMP-GUARD-001` | Run `guard:web-boundary`, `guard:localization-boundary`, and `audit:localization-literals`. | Confirms changed web/localization boundaries remain clean after copy/label changes. | Guard commands are project checks, not new coverage files. |
| `TMP-BUILD-001` | Run `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`, `pnpm -C autobyteus-server-ts build`, and `pnpm -C autobyteus-web build` if environment permits. | Confirms package build surfaces for changed server/web code. | Build logs are execution evidence. Full broad typechecks remain known-baseline failures and are not used as final gates. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live LLM-created/current nonzero TaskAgent/TaskTeam Tasks rows in a running Electron/browser session. | This API/E2E stage does not have a ready live delegated task run fixture. The implementation package already includes Electron/open_tab visual screenshots from deterministic seeded states, and durable component/API/projection tests exercise nonzero rows, task refs, and member focus. | Medium-low: a live runtime row could reveal environment-specific layout/data timing issues not visible in component tests. | Record limitation in execution report. No reroute unless a live probe is required by a future explicit release gate. |
| Live pending approval produced by a TaskAgent, viewed in Tasks. | Final requirements intentionally remove Approve/Deny controls from Tasks; creating a live pending approval belongs to the broader Activity approval flow and may require external runtime setup. Component/static coverage proves Tasks does not own approval UI/API. | Low for this change; Activity remains approval owner. | No follow-up unless product asks for a live approval demonstration. |
| Full repository web/server typechecks as pass/fail gates. | Code review records broad existing baseline failures outside this change. Server build tsconfig and package builds are the relevant gates planned here. | Low for changed files; code review already grepped changed-source entries. | Delivery may re-evaluate after base refresh. Do not fail this task on known unrelated baseline. |
| Tracked base refresh against `origin/personal`. | Code review records the branch is behind by 13 commits and team process assigns refresh to delivery. | Medium integration risk if remote changes touch these files. | Delivery engineer must refresh before final handoff per team workflow. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | No ambiguity or reroute trigger found during the current coverage investigation. | N/A |

## Execution Plan

1. Create/refresh `tickets/in-progress/taskagent-team-tab-ui/api-e2e-evidence/` and execute `git diff --check`.
2. Run `TMP-STATIC-001` scoped source probes and save command output.
3. Run `TMP-WEB-001` targeted web Vitest coverage and save output.
4. Run `TMP-SERVER-001` targeted server Vitest coverage and save output.
5. Run `TMP-SERVER-002` temporary REST error-mapping probe, then delete the temporary test file and verify no temp file remains in `git status`.
6. Run `TMP-GUARD-001` web boundary/localization/literal checks and save outputs.
7. Run `TMP-BUILD-001` server build-typecheck, server build, and web build; record any known unrelated baseline separately if encountered.
8. Write/update the canonical execution coverage report with scenario matrix, logs, residual untested areas, cleanup status, and pass/fail classification.
9. Because no repository-resident durable coverage will be added, updated, or removed, hand the cumulative package to `delivery_engineer` if execution passes.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing durable coverage is current after the redesign. This round will execute the current durable coverage plus temporary static/API/build probes. The temporary server route probe will be removed before handoff and is not a durable coverage change.
