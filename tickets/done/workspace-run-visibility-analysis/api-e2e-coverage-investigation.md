# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review handoff requested formal API/E2E coverage investigation and execution; user additionally requested a real browser/end-to-end validation with explicit backend/frontend startup steps.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

Current behavior to prove:

- The Workspaces sidebar must remain descriptor-authoritative: backend-visible workspace descriptors create top-level rows; persisted history/local contexts cannot invent rows for removed/unregistered roots.
- The backend-visible default temp workspace (`temp_ws_default`) must be eligible for sidebar projection, non-removable, and usable for workspace-scoped history expansion.
- Newly created local standalone agent and team runs must be immediately projected under their visible workspace row and revealed by selected ancestry expansion.
- Permanent local standalone contexts must stay visible until matching history rows reconcile/dedupe them.
- Same normalized root descriptors must dedupe to one row; fixed temp identity/removability wins for the temp root.
- New workspace mode must not expose a user-facing Load/preload action. A pending path must be emitted upward continuously and `Run Agent` / `Run Team` must register/load it before context creation.
- Failed New-path loading must block run creation and display workspace error; duplicate Run clicks during load must not create duplicate runs.
- Legacy/compatibility check from implementation handoff: clean. No backward-compatibility wrapper, dual Load path, or history-created workspace row path was introduced; `Load` UI/event/Enter preload were removed.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Temp workspace descriptor projects as sidebar workspace row | Changed | REQ-002, AC-001, DS-001, implementation handoff | Durable read-model/projection tests still valid; add temporary real browser check on fresh isolated data. |
| Temp workspace row non-removable | Added/Changed | REQ-008, AC-008, DS-005 | Durable component/API tests still valid; browser check can visually verify no remove action. |
| Removed roots suppressed | Preserved | REQ-003, AC-006, design legacy rejection log | Existing projection/read-model tests still valid. |
| Workspace-scoped history accepts visible temp workspace ID | Changed | REQ-010, AC-010, DS-004 | Existing backend E2E test remains valid; run during API/E2E. |
| Same-root temp/filesystem dedupe | Added | REQ-011, AC-011 | Existing read-model test remains valid; run during executable checks. |
| Local permanent standalone run row continuity/dedupe | Added | REQ-007, AC-012, AC-013, DS-006 | Existing read-model/projection tests remain valid; run during executable checks. |
| New mode has no Load action; pending input emits while typing | Removed/Changed | REQ-014, REQ-020, REQ-021, AC-021, AC-022 | Existing selector tests remain valid; real browser check should inspect no Load and pending helper. |
| Run Agent/Run Team loads pending path before context creation | Added/Changed | REQ-015, REQ-016, AC-016, AC-017 | Existing component tests remain valid; browser check should exercise at least Run Agent pending path with actual frontend/backend where feasible. |
| Load failure blocks context creation and duplicate clicks guarded | Added | REQ-018, REQ-020, AC-019, AC-020 | Existing component tests cover failure/enabling; temporary browser/API probing if practical. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts` / registered workspace scoped history | `workspaceRunHistory` resolves a visible registered workspace ID and returns grouped history | REQ-010, AC-007, DS-004 | Still Valid | Changed resolver delegates to `getWorkspaceRootPathForHistory`; registered reads remain required. | Execute targeted backend E2E. |
| `autobyteus-server-ts/tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts` / temp workspace scoped history | `workspaceRunHistory(temp_ws_default)` resolves to temp root and returns group | REQ-010, AC-010, DS-004 | Still Valid | Added durable backend E2E maps directly to temp expansion requirement. | Execute targeted backend E2E. |
| `autobyteus-server-ts/tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts` / unknown/removed ID rejection | Unknown/removed workspace ID is rejected and history service is not called | REQ-003, AC-006, DS-004 | Still Valid | Preserves descriptor/visible workspace authority. | Execute targeted backend E2E. |
| `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` / create/list/remove/re-add | Registered filesystem workspace lifecycle remains visible/removable and re-add restores root-scoped visibility | REQ-009, REQ-012, AC-007, AC-009 | Still Valid | Filesystem removal behavior is intentionally preserved. | Execute targeted backend E2E. |
| `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` / remove temp rejection | `removeWorkspace(temp_ws_default)` fails with registered-filesystem-only message | REQ-008, AC-008, DS-005 | Still Valid | Confirms temp visible for reads but not removable. | Execute targeted backend E2E. |
| `autobyteus-web/utils/__tests__/runTreeProjection.spec.ts` / descriptor-only top-level rows | Only descriptors create workspace rows; history/local rows attach only under matching descriptors | REQ-001, REQ-003, AC-006, AC-014 | Still Valid | Core removal invariant remains current. | Execute targeted frontend tests. |
| `autobyteus-web/utils/__tests__/runTreeProjection.spec.ts` / history over local/draft dedupe | Local rows dedupe under descriptors and history replaces local context rows | REQ-007, AC-012, AC-013, DS-006 | Still Valid | Matches local permanent continuity requirement. | Execute targeted frontend tests. |
| `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` / temp descriptor and draft projection | Backend-visible temp descriptor creates non-removable root and local draft appears | REQ-002, REQ-004, AC-001, AC-008 | Still Valid | Store-level coverage directly covers screenshot regression. | Execute targeted frontend tests. |
| `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` / same-root temp/filesystem dedupe | Same root temp + filesystem produces one temp non-removable row | REQ-011, AC-011 | Still Valid | Guards known backend duplicate risk. | Execute targeted frontend tests. |
| `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` / permanent local row and history dedupe | Permanent local standalone context appears as `local`; matching history replaces it | REQ-007, AC-012, AC-013 | Still Valid | Covers standalone ID-promotion timing gap. | Execute targeted frontend tests. |
| `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` / removed history root suppressed | History-only removed root does not create top-level row | REQ-003, AC-006, AC-014 | Still Valid | Preserves workspace-removal invariant. | Execute targeted frontend tests. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` / no eager global history | Sidebar loads workspace list without global history tree on mount | REQ-001, constraints | Still Valid | Confirms descriptor boundary not reversed. | Execute targeted frontend tests. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` / temp no remove action | Non-removable temp workspace row has no Remove from Workspaces action | REQ-008, AC-008 | Still Valid | Component-level UI guard. | Execute targeted frontend tests and inspect browser. |
| `autobyteus-web/components/workspace/config/__tests__/WorkspaceSelector.spec.ts` / pending input and no Load | Typing New path emits `workspace-input-change`; no Load button/event; Enter does not preload; helper copy updated | REQ-014, REQ-020, REQ-021, AC-021, AC-022 | Still Valid | Matches user’s final Load-removal decision. | Execute targeted frontend tests and inspect browser. |
| `autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts` / Run-triggered load success/failure/enabling | Pending New path is loaded before agent/team context; failures block; Run can enable before preload | REQ-015 through REQ-020, AC-016 through AC-020 | Still Valid | Covers launch sequencing and failure boundary. | Execute targeted frontend tests; browser-check agent path where feasible. |
| `autobyteus-web/components/workspace/config/__tests__/AgentRunConfigForm.spec.ts` and related pass-through coverage | Form remains wrapper/pass-through with updated event name | REQ-014, DS-007 | Still Valid | Code review notes wrappers stay minimal. | Execute in frontend targeted suite if included. |
| `autobyteus-web/utils/__tests__/runTreeLiveStatusMerge.spec.ts` | Live status merge unaffected by new `local` projection source | REQ-007, AC-013 | Still Valid | Guards status overlay while projection changes. | Execute targeted frontend tests. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None | N/A | Existing relevant durable coverage aligns with current requirements after implementation updates. | Code-review report found obsolete Load UI/event paths removed and tests updated. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | Existing repo-resident coverage added before code review already covers the required durable boundaries. This API/E2E pass will not add new durable coverage unless real execution reveals a gap. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | No stale or inadequate durable coverage identified before execution. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TMP-BROWSER-001 | Build/start real backend from this worktree using an isolated first-install app data directory and start Nuxt frontend pointed at that backend; inspect in a real browser. | Startup instructions are valid; frontend can talk to backend in fresh-user state. | Environment/procedural smoke evidence, not a stable repo test harness yet. |
| TMP-BROWSER-002 | In browser, open Agents flow from a fresh state, keep/default Temp Workspace, click Run for an agent if launch prerequisites allow. | Sidebar shows `Temp Workspace` and selected draft row is visible/revealed without reload; temp remove action absent. | Real interactive smoke check complements durable unit/API tests; may depend on installed local/browser state and built-in catalog details. |
| TMP-BROWSER-003 | In browser, switch workspace selector to New, type a path, verify no Load button and helper shows pending Run-triggered load; click Run Agent if launch prerequisites allow. | Pending path is not stale Temp Workspace; Run-triggered registration reveals row under new workspace, or any load failure blocks run with visible error and no draft. | Interactive UX check; durable sequencing already covered in component tests. |
| TMP-API-001 | Direct GraphQL query against running backend for `workspaces` and `workspaceRunHistory(temp_ws_default)`. | Real server exposes temp workspace and accepts temp scoped history in a fresh app data dir. | Server-runtime smoke check; durable backend E2E exists. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full LLM message send after draft creation | Requirement is about run creation/sidebar reveal before history polling; sending a real prompt may require external runtime/model credentials and is not necessary for this bug. | Low for this ticket; permanent-ID promotion remains covered by durable local projection tests. | None unless real browser draft creation cannot be reached. |
| Team browser run if app catalog/setup makes it impractical in available time | Durable tests cover team run sequencing; real browser check will prioritize first-install agent path plus temp/history/new-path. | Medium residual if skipped; record explicitly in execution report. | If browser app exposes team run with available prerequisites, execute it; otherwise rely on durable coverage and note not tested. |
| Native Electron integrated-server startup | User asked for backend/frontend startup; web dev + backend proves the same changed GraphQL/frontend boundaries. Electron packaging/integrated server is out of scope. | Low; packaged Electron could have separate startup issues not changed here. | Delivery can decide if release smoke is needed. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None before execution | N/A | Upstream artifacts and code review are consistent. | N/A |

## Execution Plan

1. Recreate temporary dependency symlinks to sibling checkout dependency directories only as execution setup, because this worktree intentionally lacks `node_modules`; remove them after execution.
2. Run current valid targeted backend and frontend durable suites:
   - Backend: `./node_modules/.bin/vitest run tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts tests/e2e/workspaces/workspaces-graphql.e2e.test.ts`.
   - Frontend: targeted Vitest files covering projection/read-model/history UI/config selector/run panel.
   - Server build typecheck: `./node_modules/.bin/tsc -p tsconfig.build.json --noEmit --pretty false`.
3. Build the backend if needed and start `node autobyteus-server-ts/dist/app.js --data-dir <isolated-temp-dir> --host 127.0.0.1 --port <free-port>`.
4. Start Nuxt frontend from `autobyteus-web` with `NUXT_PUBLIC_GRAPHQL_BASE_URL`, `NUXT_PUBLIC_REST_BASE_URL`, and `NUXT_PUBLIC_WS_BASE_URL` pointed to the running backend, on a free frontend port.
5. Use the in-app browser to navigate the frontend and execute TMP-BROWSER scenarios, collecting visible UI/API evidence and screenshots/text observations.
6. Stop background processes and clean temporary symlinks/scaffolding.
7. Write/update the canonical execution coverage report.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing durable coverage is current and sufficient at the codebase boundary. User-requested real browser validation will be recorded as temporary executable validation, not as new durable coverage unless it uncovers a missing durable test or implementation defect.
