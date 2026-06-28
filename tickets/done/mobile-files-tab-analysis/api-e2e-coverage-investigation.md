# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-files-tab-analysis/tickets/done/mobile-files-tab-analysis/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-files-tab-analysis/tickets/done/mobile-files-tab-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-files-tab-analysis/tickets/done/mobile-files-tab-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-files-tab-analysis/tickets/done/mobile-files-tab-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-files-tab-analysis/tickets/done/mobile-files-tab-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-files-tab-analysis/tickets/done/mobile-files-tab-analysis/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review pass for the mobile Files tab ticket; proceed to API/E2E coverage investigation and execution.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved requirement and reviewed design define the mobile Files tab as a server-served `/mobile` Nuxt web-shell feature loaded by Android/iOS WebView/WKWebView wrappers. Files must resolve only from the current workspace, agent-run, or team-run context; it must not silently browse an unrelated workspace. If there is no workspace-capable context, the UI must show an actionable choose-workspace state. If a selected run/team-run workspace root or root `folderChildren` call cannot be resolved/loaded, the UI must show a clear retryable workspace-unavailable state rather than an empty successful list. The shared `fetchFolderChildren` contract must propagate non-abort/non-stale GraphQL/server payload failures. Successful real workspace browsing, lazy folder loading, read-only preview, and served `/mobile` asset freshness remain validation concerns. Implementation handoff's `Legacy / Compatibility Removal Check` is clean: no compatibility mechanism was introduced, old silent-success behavior is not retained, and no native duplicate Files implementation was added.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Shared file explorer `fetchFolderChildren` failure contract | Changed | Requirements REQ-005 / AC-005; design DS-002; implementation handoff “What Changed” | Execute store coverage and real backend folder API E2E to prove success/error payload behavior. |
| Mobile root resolution publication sequencing | Changed | Requirements REQ-002 / REQ-004; design DS-001/DS-002; implementation handoff “active workspace state is published only after root success” | Execute mobile component coverage and a temporary real-API probe for root success/failure/retry. |
| Selected run/team-run unavailable root shows retryable unavailable state | Added/Changed | Requirements AC-004; code-review residual risk | Existing durable component coverage is valid but mocked; add temporary real-API executable probe. |
| Successful real workspace root listing and lazy folder listing | Preserved/Changed | Requirements UC-003/UC-004; implementation handoff coverage hints | Execute existing durable component/store coverage plus temporary real-API/browser probe. |
| Transient `folderChildren` failure retries into success | Added/Changed | Requirements REQ-004/REQ-005; implementation handoff coverage hints | Existing durable component coverage is valid; temporary browser/API probe should exercise one transient intercepted root failure then real retry success. |
| Served `/mobile` asset freshness | Preserved validation requirement | Requirements REQ-006 / AC-006; design DS-005; implementation handoff build freshness note | Execute `build:mobile-web`, inspect generated/served static assets through the server route, and record hashes/markers. |
| Native Android/iOS wrapper ownership | Preserved | Requirements AC-001; design thin-shell policy | No native E2E required for this ticket unless browser/server `/mobile` transport fails. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/mobile/__tests__/MobileFiles.spec.ts` | Mobile Files component covers lazy folder loading, folder-load error display, no fallback to unrelated workspace, root failure inactive state, retry to successful list, deep search, and preview | REQ-002/003/004/005/007/008; AC-004/005/007/008; DS-001/002/003 | Still Valid | File inspected; code review passed this updated durable coverage | Execute focused Vitest as final web coverage. |
| `autobyteus-web/stores/__tests__/fileExplorerStore.spec.ts` | Shared store covers folder payload success, GraphQL error throwing, and backend payload error throwing | REQ-005; AC-005; DS-002 | Still Valid | File inspected; new assertions map directly to error-contract design | Execute focused Vitest as final web coverage. |
| `autobyteus-web/stores/__tests__/workspaceStore.spec.ts` | Workspace metadata/list store behavior around registered workspaces and file explorer actions | REQ-002/004; DS-001 | Still Valid | Relevant because mobile resolver uses workspace metadata/registration before root fetch | Execute focused Vitest with mobile/store tests. |
| `autobyteus-web/stores/__tests__/workspaceStore.reconnect-resync.spec.ts` | Live file explorer reconnect/resync behavior | DS-001 live-session sequencing and residual desktop risk | Still Valid | Mobile resolver starts live session after active root success; regression surface should remain green | Execute focused Vitest. |
| `autobyteus-web/components/mobile/__tests__/MobileUxRefinement.spec.ts` | Broader mobile shell/UI states remain coherent | REQ-007/008 | Still Valid | Code review ran it; useful surrounding UI confidence | Execute focused Vitest. |
| `autobyteus-web/components/fileExplorer/__tests__/FileItem.spec.ts` | Desktop/shared file explorer item behavior remains compatible with stricter fetch errors | Code review residual risk: desktop callers | Still Valid | Direct neighboring shared file explorer UI coverage | Execute focused Vitest. |
| `autobyteus-web/pages/__tests__/mobile-root.spec.ts`, `autobyteus-web/pages/__tests__/mobile-root-shell.spec.ts`, `autobyteus-web/middleware/__tests__/mobileFeatureGate.global.spec.ts` | `/mobile` route and mobile static/runtime gating behavior | REQ-001/006; AC-001/006; DS-005 | Still Valid | Existing mobile route coverage confirms shell ownership and route behavior | Execute focused Vitest for route/static-runtime coverage. |
| `autobyteus-server-ts/tests/e2e/file-explorer/file-explorer-graphql.e2e.test.ts` | Real GraphQL `folderChildren`, search, invalid workspace payload, and watcher-free snapshot behavior | AC-003/005; DS-001/002 | Still Valid | Existing server E2E directly exercises backend folder API with real filesystem temp roots | Execute focused server E2E. |
| `autobyteus-server-ts/tests/e2e/file-explorer/file-explorer-path-boundary.e2e.test.ts` | Real GraphQL folder/read/write/rename path-boundary errors return safe payloads/errors before tree mutation | AC-003/005; DS-002 | Still Valid | Existing server E2E covers backend error payload boundary consumed by stricter frontend store | Execute focused server E2E. |
| `autobyteus-server-ts/tests/e2e/remote-access/phone-access-running-routes.e2e.test.ts` | Phone-access status/pairing/mobile credential route behavior | REQ-001/006 and mobile API auth transport context | Still Valid | Mobile `/mobile` shell uses remote-access session/status and protected GraphQL/REST paths | Execute if practical as surrounding API coverage. |
| Repository browser E2E/Playwright suite | Durable full browser coverage for `/mobile` Files with real backend | REQ-007/008; code-review residual API/E2E scenarios | Out Of Scope | No established repository-resident browser E2E harness/config exists; current package only has `playwright-core` used for ad-hoc validation | Use temporary executable browser/API probe only; do not add a new durable framework in API/E2E stage. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No stale or obsolete API/E2E coverage found during inventory | N/A | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | Existing code-reviewed durable unit/component and server E2E coverage is adequate for permanent repo coverage in this ticket; remaining proof is environment/integration validation best done by temporary probe because no durable browser E2E harness exists. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | No repository-resident durable coverage updates planned in API/E2E stage. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| APIE2E-001 | Real backend GraphQL/file-explorer E2E using existing server Vitest files | Real filesystem root listing, lazy folder payload, invalid workspace/payload errors, and path-boundary safe failures | Already repository-resident durable server E2E; this stage only executes it. |
| APIE2E-002 | Temporary `/mobile` static/browser probe against a real Fastify server serving fresh built mobile assets and a real temp workspace | Served `/mobile` loads fresh assets, workspaces catalog selects a real workspace, root list shows real files/folders, lazy folder loads through real GraphQL, file preview loads through real GraphQL | No established durable browser E2E framework; temporary probe is environment-specific and records evidence only. |
| APIE2E-003 | Same temporary browser probe with one intercepted `folderChildren` transient failure followed by retry | Transient root `folderChildren` failure produces `Workspace unavailable` + `Retry`, then retry succeeds into real file list | Interception is scenario-specific and does not belong as durable code without a maintained browser E2E harness. |
| APIE2E-004 | Temporary browser/component API probe with selected run context pointing at a missing root | Selected run missing root shows retryable unavailable state and does not browse unrelated workspaces | Requires direct state setup not exposed through stable app UI; existing durable component coverage already locks behavior, temporary real-API probe strengthens API boundary evidence. |
| APIE2E-005 | `pnpm --dir autobyteus-web build:mobile-web` plus server `GET /mobile` and asset hash evidence | Served mobile-web asset freshness relative to source/build | Build/serve evidence belongs in ticket artifacts; no repo coverage change required. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Physical Android/iOS device WebView against a paired node | No device runtime was provided; native wrappers are unchanged and design identifies `/mobile` web shell as owner | Low/medium residual: device-specific stale cache or mount mismatch can still occur | Delivery should keep stale served bundle and container mount risks visible; no reroute unless local browser/server `/mobile` fails. |
| Real containerized paired-node filesystem mount disappearance | Local probe can emulate missing root on host; Docker bind-mount mismatch requires target deployment setup | Medium residual for user environment | Delivery/deployment should verify target node/workspace mount if user still reports unavailable root. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | No requirement/design ambiguity or compatibility-wrapper trigger found before execution | N/A |

## Execution Plan

1. Run final focused web durable coverage for mobile Files, shared file explorer store, workspace store/reconnect, mobile UX, desktop FileItem, and `/mobile` route/gating tests.
2. Run final focused server durable E2E coverage for real file explorer GraphQL/path-boundary behavior and phone-access route behavior if practical.
3. Run `pnpm --dir autobyteus-web build:mobile-web` to refresh mobile static assets and capture build result.
4. Run temporary executable probe(s): start a real local server or in-process GraphQL/static route, create temp workspace contents and missing-root/run fixtures, load `/mobile` with a mobile viewport, verify root listing/lazy folder/preview, transient root failure + Retry, selected-run missing-root unavailable state, and served asset hash/markers.
5. Remove temporary in-repo probe scaffolding, keep logs/JSON evidence under the ticket artifact folder, and write the execution coverage report.
6. If no repository-resident durable coverage is added/updated/removed, route to `delivery_engineer`; otherwise route back to `code_reviewer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing code-reviewed durable coverage remains valid and no stale coverage was found. API/E2E will execute current durable coverage plus temporary real API/browser probes; no repo-resident coverage edits are planned.
