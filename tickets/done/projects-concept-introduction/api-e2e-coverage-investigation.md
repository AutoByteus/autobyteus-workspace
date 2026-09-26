# API/E2E Coverage Investigation

Package `PROJ-CONCEPT-20260926-001` — `projects-concept-introduction` (slice 1: Projects only, behind `ENABLE_PROJECTS`).

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/requirements-doc.md` (Approved, `SR-001`)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/solution-revision-record.md` (`SR-001`–`SR-003`)
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/design-spec.md` (`SR-003`)
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/handoff-to-architecture-review-sr-003.md`. The external `REQ-ATPTN-001` prototype is non-normative.
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/design-review-report.md` (`ARCH-REV-002`, Pass)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/implementation-revision-record.md` (`IR-001`)
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/code-review-report.md` (`CRR-001`, Pass 9.3/10)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/api-e2e-test-case-ledger.md`
- Current Investigation Round: `2`
- Trigger: round 2 — `/code_reviewer` delta-review Pass (`CRR-003`) of `IR-002` (commit `63e6fb0e4`: `components/common/SearchableSelect.vue` keyboard/listbox fix + 2 specs), resolving `CR-001` = `API-F-001`. Round 1 was triggered by `CRR-001` of `IR-001` (`6563fd69f`, `816fd4db5` on base `1676bede9`).
- Prior Investigation Reviewed: round 1 (same file, API-REV-001)
- Latest Authoritative Investigation: this document, round 2

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review)
- Proportional test-code review decision: `Required` (durable coverage is added this round)

## Current Requirement And Design Basis

Slice 1 adds a node-scoped Projects feature behind the per-node capability `ENABLE_PROJECTS`. The capability is off by default, and its user-visible behavior matches Applications: when it is off, the nav item is hidden and `/projects*` redirects to `/`; the Settings › Basics toggle turns it on and off, and so does the Advanced-table edit of `ENABLE_PROJECTS`.

A Project has:
- a durable id;
- a unique name (trimmed, case-insensitive), and a description that may be empty;
- timestamps;
- described links to registered filesystem workspaces.

The link rules are:
- A link references a workspace by `workspaceId` and snapshots its root path.
- Availability is resolved when the Project is read: `AVAILABLE` or `UNREGISTERED`.
- Removing a workspace is never blocked by a link.
- Re-registering the same path restores availability without creating a duplicate link.
- The same workspace may be linked to several Projects.

Deleting a Project needs confirmation, and it removes only that Project's record.

Everything under `REQ-011` must stay unchanged: the workspace registry, run history, and every setting except the new key.

The feature is desktop-only, with strings in en and zh-CN. It must contain no Task wording, and it must be keyboard operable with focus-managed dialogs (`REQ-013`, `AC-011`, `QR-003`).

The design (`SR-003`) extracts a shared web capability-store factory, a shared toggle card and a generic server boolean accessor. It moves Applications and Skill Improvement onto them, and the preserved behavior is guarded by `AC-010`.

The link dialog reuses `WorkspaceSelector` through the opt-in `candidateWorkspaceIds` prop, with `autoSelectDefault=false`.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 Projects CRUD, search, confirmed delete, no Task wording | Added | REQ-001/008/009/012–014; DS-001/002 | Live API + browser journey (create/validate/duplicate/search/edit/delete, en + zh-CN, keyboard) |
| BEH-002 Described links; register-then-link | Added | REQ-002/003/005; DS-003 | Un-mocked GraphQL against the real workspace registry + browser default Add-workspace path |
| BEH-003 Unregistered link retained; re-register restores | Added (read-time projection) | REQ-004; AC-007 | Real `removeWorkspace`/`createWorkspace` against the real registry; browser row state |
| BEH-004 `ENABLE_PROJECTS` capability; Applications/SI preserved | Added + Changed (shared factory/card/accessor refactor) | REQ-006/007; AC-001/002/010; DS-004/004b/005 | Live backend toggle via Basics and the Advanced table; persisted setting; Applications/SI toggles in the browser |
| BEH-005 Desktop-only | Added | DEC-005 | Spec coverage (`mobileFeatureGates.spec.ts`); no browser need |
| BEH-006 Per-node persistence; rebinding invalidation | Added | REQ-010/011; AC-009 | Backend restart on the same data dir; two live backends with an in-page rebind |
| `WorkspaceSelector` `candidateWorkspaceIds` | Changed (opt-in) | AR-001 | Existing specs + browser dialog (no Temp, no pre-selection) |
| `ServerSettingsService` generic accessor | Changed | Removal plan | Existing unit tests + live capability reads/writes |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `ProjectService`, `ProjectStore`, `ProjectsCapabilityService`, generic accessor | `project-service.test.ts` (real file store, **mocked** workspace lookup), capability/service tests | Real `WorkspaceManager` registration/removal interplay; prefix guard on real ids | Un-mocked GraphQL e2e (durable) |
| API / transport / contract | Yes | New GraphQL types, resolvers, error extensions | `projects.test.ts` and `projects-schema.test.ts` (**service mocked**) | Full resolver → service → store → registry path is never executed together | Un-mocked GraphQL e2e (durable) + live backend |
| Frontend component / state | Yes | Projects components, `projectStore`, capability factory, cards, middleware, nav, serverSettings refresh table | 35+ spec files with mocked stores/Apollo | Real Apollo ↔ server contract, generated documents, real rendering | Browser |
| Browser integration / user journey | Yes | Nav, routes, dialogs, focus, locale | None | All AC-level journeys | Browser (durable Playwright probe) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | All Projects UI is renderer-only | As above | As above | Browser via `pnpm dev` |
| Desktop shell / Electron-specific integration | No | No preload/IPC/window change. Node rebinding is driven by the Electron window context, but the store logic is shared. | — | The Electron window bootstrap itself is unchanged | In-page `bindNodeContext` against two live backends |
| Process / lifecycle | Yes | Restart persistence of `projects.json` and `ENABLE_PROJECTS` | None | Real restart | Backend restart in the browser probe + store reset in the API e2e |
| Persisted-data transition | Yes (new subject only) | `Not Affected`; new `projects/projects.json` and a new setting key | Unit tests | `workspaces.json` unchanged under Project operations | Byte comparison in the API e2e + browser probe |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction`, branch `codex/projects-concept-introduction`
- Project type and runtime stack: pnpm monorepo. The server is Node 22 / TypeScript / type-graphql / Fastify (`autobyteus-server-ts`). The web app is Nuxt 3 / Vue 3 / Pinia / Apollo (`autobyteus-web`), and it also ships as an Electron shell.
- Conflicting, missing, or unclear project instructions:
  - `pnpm typecheck` on the server is broken on base, per the handoff.
  - The existing probes default to Linux Chrome paths. On macOS the probe uses Playwright's cached Chromium, or `--browser-executable`.
- Required environment variables or secrets available: `N/A`. No provider keys are needed.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-web/package.json` | Web scripts | `test:nuxt` = `cross-env NUXT_TEST=true vitest`. Durable browser E2E lives in `tests/e2e/*-probe.mjs`, run as `test:e2e:<name>` with `node`. `guard:localization-boundary` and `audit:localization-literals`. |
| `autobyteus-web/tests/e2e/provider-api-key-save-probe.mjs` | Canonical isolated browser-probe pattern | Build the server, create a temp data dir and a fresh sqlite DB, run `prisma migrate deploy`, start `dist/app.js --data-dir`, run `pnpm dev` with `BACKEND_NODE_BASE_URL`, use a headless Chromium from `playwright-core`, write evidence to `test-results/<name>/result.json`, and kill owned processes and the temp dir on exit |
| `autobyteus-web/nuxt.config.ts` | Dev proxy | In dev, `/graphql` and `/rest` are proxied to `BACKEND_NODE_BASE_URL` |
| `autobyteus-web/plugins/30.apollo.client.ts`, `stores/windowNodeContextStore.ts` | Node binding | The Apollo URI resolves per operation from `windowNodeContextStore.getBoundEndpoints()`. `bindNodeContext(nodeId, baseUrl)` bumps `bindingRevision`, which is the same path the Electron and mobile bootstraps use. |
| `autobyteus-server-ts/package.json`, `tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` | Server GraphQL e2e pattern | `npx vitest run <file>`. Build the full schema with `buildGraphqlSchema()` and use an isolated `appConfigProvider.config` (app data dir) |
| `autobyteus-web/localization/runtime/preferenceStorage.ts` | Locale | `localStorage['autobyteus.localization.preference-mode']` = `en` or `zh-CN` |
| `autobyteus-web/pages/settings.vue` | Settings routing | `/settings?section=server-settings&mode=quick` for Basics, `mode=advanced` for the Advanced table |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | `autobyteus-server-ts` | `corepack pnpm -C autobyteus-server-ts build` (skippable with `--skip-server-build`) | Writes `dist/` in the worktree | `dist/app.js` exists | N/A (build output) |
| Backend node A | `autobyteus-server-ts` | `node dist/app.js --host 127.0.0.1 --port <free> --data-dir <tmp>/node-a` after `prisma migrate deploy` | Temp sqlite DB; free port | `GET /rest/health` | SIGTERM, then SIGKILL on the process group |
| Backend node B | same | same, with `<tmp>/node-b` | Second isolated node for AC-009 | same | same |
| Frontend | `autobyteus-web` | `corepack pnpm dev --host 127.0.0.1 --port <free>` with `BACKEND_NODE_BASE_URL=<A>` | Nuxt dev server | `GET /` ok | SIGTERM, then SIGKILL on the process group |
| Chromium | — | `playwright-core` `chromium.launch` (cached `chromium-1208`, or `--browser-executable`) | Headless; 1440×900; UTC | launch | `browser.close()` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Registered workspaces (3) | Real `createWorkspace` GraphQL mutation against node A with temp folders | Temp dirs under the probe root only | Removed with the temp root |
| Projects | Created through the UI, plus direct GraphQL for setup where the UI is not under test | Node A and B data dirs only | Removed with the temp root |
| Settings | Real `setProjectsEnabled` / `updateServerSetting` | Per-node temp `.env` / config | Removed with the temp root |
| No accounts or secrets | — | The user's `.autobyteus` data and running apps are not touched | — |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected`. This is a new subject only.
- Design-spec and implementation-handoff references: design-spec › Persisted Data / State Transition Decision; handoff › Persisted Data Transition Check
- Representative existing-data setup and required behavior:
  - `workspaces.json` with registered roots must stay byte-identical across Project create, link, unlink and delete.
  - `ENABLE_APPLICATIONS` and `ENABLE_SKILL_IMPROVEMENT` values keep their meaning under the generic accessor.
  - A missing `projects.json` reads as no Projects.
- Evidence planned:
  - The API e2e compares `workspaces.json` bytes before and after Project operations and deletion.
  - The capability reads before and after `setProjectsEnabled` show that the Applications and SI values are untouched.
  - The browser probe reads `workspaces.json` before and after deletion.
- Migration-specific completion/recovery scenarios: N/A
- Upstream ambiguity or reroute required: None

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/projects/project-service.test.ts` (19) | Service invariants with a real file store and a **mocked** workspace lookup | REQ-001–004, 009, QR-001 | Still Valid | Passed 83/83 in changed-area run | Keep; complemented by an un-mocked e2e |
| `autobyteus-server-ts/tests/unit/projects/projects-capability-service.test.ts` | Default-disabled capability semantics | REQ-006 | Still Valid | Pass | Keep |
| `autobyteus-server-ts/tests/unit/api/graphql/types/projects.test.ts`, `projects-schema.test.ts` | Resolver mapping and schema exposure with the service **mocked** | DS-001–003 | Still Valid | Pass | Keep |
| `autobyteus-server-ts/tests/architecture/projects-boundaries.test.ts` | Import boundaries (`workspaces/**` ↛ `projects/**`) | REQ-004 | Still Valid | Pass | Keep |
| `autobyteus-server-ts/tests/unit/services/server-settings-service.test.ts`, `tests/unit/application-capability/**` | Generic accessor; Applications capability | AC-010 | Still Valid | Pass | Keep |
| `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` | Workspace registry GraphQL | BEH-002/003 preserved | Still Valid (1 pre-existing failure) | `removes a registered workspace…` fails identically on base `1676bede9` (AgentRunManager not initialized) | Out of scope; report as pre-existing |
| `autobyteus-server-ts/tests/skill-improvement/*` (4 failing), `tests/unit/workspaces/workspace-manager*.test.ts` (2 failing) | SI/workspace behavior | — | Out Of Scope (pre-existing failures) | The same 7 tests fail on base (`/tmp/proj-e2e-logs/server-adjacent-base.log`) | Report only |
| `autobyteus-web/components/projects/__tests__/*.spec.ts` (4 files, 24 tests) | Component behavior incl. focus trap, validation, stale candidate | AC-003–008, AC-011 | Still Valid | Pass | Keep; browser adds real-DOM keyboard proof |
| `autobyteus-web/stores/__tests__/projectStore.spec.ts`, `stores/capabilities/__tests__/createBoundNodeCapabilityStore.spec.ts`, `stores/__tests__/applicationsCapabilityStore.spec.ts` | Store logic, rebinding invalidation | AC-009, AC-010 | Still Valid | Pass | Keep |
| `autobyteus-web/components/settings/__tests__/{Projects,Applications,SkillImprovement}FeatureToggleCard.spec.ts`, `ServerSettingsBasicsPanel.spec.ts` | Card behavior | AC-002, AC-010 | Still Valid | Pass | Keep |
| `autobyteus-web/middleware/__tests__/feature-flags.global.spec.ts`, `composables/__tests__/useShellPrimaryNavigation*.spec.ts`, `utils/__tests__/mobileFeatureGates.spec.ts` | Gating and nav | AC-001, BEH-005 | Still Valid | Pass | Keep |
| `autobyteus-web/tests/stores/serverSettingsStore.test.ts` | Advanced-table refresh table; SI excluded | AC-002, AC-010 | Still Valid | Pass | Keep |
| `autobyteus-web/components/workspace/config/__tests__/WorkspaceSelector{,.candidates}.spec.ts` | Selector default and opt-in candidates | AC-005 | Still Valid | Pass | Keep |
| `autobyteus-web/localization/messages/__tests__/projectsCatalog.spec.ts` | en/zh-CN parity; no Task wording | REQ-012, AC-012 | Still Valid | Pass | Keep |
| Browser E2E for Projects | — | AC-001–AC-012 | Missing | — | Add |
| Un-mocked GraphQL e2e for Projects | — | AC-003–AC-008 | Missing | — | Add |

## Stale Or Obsolete Coverage Decisions

None. No existing test asserts obsolete behavior.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-001…API-006 | Full resolver → service → store → real `WorkspaceManager` registry, un-mocked | AC-001/002 (capability), AC-003–AC-008, REQ-011 | `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` | The existing server tests mock either the workspace lookup or the service. Nothing proves the real registration, removal and re-registration interplay, or `workspaces.json` invariance. |
| E2E-001…E2E-012 | Browser user journeys against live isolated backends | AC-001–AC-012 | `autobyteus-web/tests/e2e/projects-feature-probe.mjs`, script `test:e2e:projects` in `autobyteus-web/package.json` | The repo's established durable browser-E2E form. The design (step 7) requires browser E2E for these ACs. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| E2E-007 (round 2) | `autobyteus-web/tests/e2e/projects-feature-probe.mjs` › link-existing step | Assert the approved combobox-popup contract instead of "focus stays inside the dialog DOM while the list is open":<br>- While open, focus is the `combobox` popup referenced by the dialog trigger's `aria-controls`, and never the page behind the modal.<br>- Tab and Shift+Tab close the list and return focus to the trigger.<br>- The first Escape closes only the list; the second closes the dialog and returns focus.<br>- Filter by typing, press Enter, and the workspace is selected with focus back on the trigger.<br>- The link is submitted and persisted. | AC-011, REQ-013, QR-003; `CRR-003` fix contract (`IR-002`) | The round-1 assertion (`inDialog` while the list is open) was stricter than the standard teleported-popup pattern. The updated case is stronger on outcomes: it now completes and persists a keyboard link. |
| E2E-013 (round 2, added) | same file | New narrow-desktop layout case (1024×700) | Requirements UI section ("desktop responsive behavior consistent with existing catalogue pages"), REQ-008 | Closes the single-viewport confidence gap |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `npx vitest run tests/unit/projects tests/unit/api/graphql/types/projects.test.ts tests/unit/api/graphql/projects-schema.test.ts tests/architecture/projects-boundaries.test.ts tests/unit/services/server-settings-service.test.ts tests/unit/application-capability` | `autobyteus-server-ts` | Changed server units | Pass (7 files / 83 tests) | `/tmp/proj-e2e-logs/server-changed.log` |
| 2 | `npx vitest run tests/skill-improvement tests/e2e/workspaces tests/e2e/server-settings tests/unit/workspaces tests/unit/skill-improvement` | `autobyteus-server-ts` | Adjacent SI, workspace and settings suites | 7 fail / 87 pass. The same 7 fail on base `1676bede9` | `/tmp/proj-e2e-logs/server-adjacent.log`, `server-adjacent-base.log` |
| 3 | `NUXT_TEST=true npx vitest run components/projects components/settings stores/__tests__/projectStore.spec.ts stores/capabilities stores/__tests__/applicationsCapabilityStore.spec.ts … components/workspace/config tests/stores/serverSettingsStore.test.ts components/layout` | `autobyteus-web` | Changed and adjacent web specs | Pass (90 files / 530 tests) | `/tmp/proj-e2e-logs/web-changed.log` |
| 4 | `pnpm guard:localization-boundary`; `pnpm audit:localization-literals` | `autobyteus-web` | REQ-012 guards | Pass | `/tmp/proj-e2e-logs/l10n-*.log` |
| 5 | `NUXT_TEST=true npx vitest run` (full web suite) | `autobyteus-web` | Regression delta | 14 failed / 3137 passed (7 files). Six files match the handoff's base-failing list. `app-font-size-fixed-px-audit` flags only untouched `token-usage` files. `electron/extensions/managedExtensionService.spec.ts` passes in isolation, and `electron/` is unchanged, so it is a load flake. There are no failures in changed areas. The base full-suite comparison could not run: Vite `fs.allow` rejected the symlinked `node_modules`, so attribution uses file-level evidence. | `/tmp/proj-e2e-logs/web-full-branch.log`, `fails-branch.txt` |
| 5b | Additional server check: `tests/unit/api/graphql` (whole folder) | `autobyteus-server-ts` | Adjacent GraphQL units | 3 failures (`studio-application-api-services`, `workspace-converter` ×2), identical on base `1676bede9` | `/tmp/proj-e2e-logs/server-unit-graphql.log` |
| 6 | `npx vitest run tests/e2e/projects/projects-graphql.e2e.test.ts` (new) | `autobyteus-server-ts` | API-001…API-006 | Pass 6/6, 3 consecutive runs. A combined run with the workspaces/settings e2e and unit-graphql suites shows only pre-existing failures. | `/tmp/proj-e2e-logs/server-projects-e2e.log`, `server-e2e-combined.log` |
| 7 | `node tests/e2e/projects-feature-probe.mjs --skip-server-build` (new; also `pnpm test:e2e:projects`) | `autobyteus-web` | E2E-001…E2E-012 | 11 Pass / 1 Fail (E2E-007), identical across runs 3, 4, 5 and 6 | `/tmp/proj-e2e-logs/probe-run5/result.json` |
| R2-1 | `NUXT_TEST=true npx vitest run components/common components/workspace/config components/projects components/applications components/settings` | `autobyteus-web` | Round 2: all consumers of the changed `SearchableSelect` (`WorkspaceSelector` + 7 run-config callers, `ApplicationWorkspaceRootSelector`) and Projects/settings, including the new `SearchableSelect.keyboard.spec.ts` and `ProjectWorkspaceLinkDialog.keyboard.spec.ts` | Pass (71 files / 414 tests) | `/tmp/proj-e2e-logs/r2-web-consumers.log` |
| R2-2 | `npx vitest run tests/e2e/projects` | `autobyteus-server-ts` | API-001…006 (server unchanged in round 2) | Pass 6/6 | `/tmp/proj-e2e-logs/r2-server-e2e.log` |
| R2-3 | `pnpm guard:localization-boundary`; `pnpm audit:localization-literals` | `autobyteus-web` | REQ-012 guards after `IR-002` | Pass | — |

## Test-Case Ledger Plan (When Applicable)

- Ledger required: `Yes`. There are 18 independently meaningful cases across two surfaces, a long-running multi-process browser probe, and a credible risk of context compression.
- Canonical ledger path: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Case granularity: one API scenario group or one browser journey per case

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Evidence Expected |
| --- | --- | --- | --- | --- | --- | --- |
| API-001 | Capability default disabled, persisted `false`, set true/false; Applications/SI capability values unchanged | AC-001, AC-002, AC-010, REQ-011 | Live GraphQL schema + real settings | `projects-graphql.e2e.test.ts` | 1 | Vitest pass |
| API-002 | CRUD + `PROJECT_NAME_REQUIRED` / `PROJECT_NAME_TAKEN` (case-insensitive) / rename collision / not-found | AC-003, AC-004 | same | same | 2 | same |
| API-003 | Link via real `createWorkspace`; reject temp / unregistered id; duplicate link; same workspace in two Projects | AC-005, AC-006 | same + real registry | same | 3 | same |
| API-004 | Real `removeWorkspace` not blocked → `UNREGISTERED` with snapshot path/description; re-register → `AVAILABLE`, no duplicate; unlink unregistered | AC-007 | same | same | 4 | same |
| API-005 | Delete removes only the Project; `workspaces.json` byte-identical; registered workspaces unchanged | AC-008, REQ-011 | same | same | 5 | same |
| API-006 | Restart: fresh store/service singletons read the same `projects.json` | AC-009, REQ-010 | same | same | 6 | same |
| E2E-001 | Flag off: no nav item; `/projects` and `/projects/<id>` redirect to `/`; Basics toggle disabled; capability error → redirect | AC-001, QR-002 | Browser + live node A | `projects-feature-probe.mjs` | 7 | DOM/URL assertions, screenshot |
| E2E-002 | Basics toggle on → nav item after Nodes without reload; setting persisted `true` | AC-002 | Browser + backend | same | 8 | DOM + GraphQL readback |
| E2E-003 | Create, empty-name field error, duplicate (case-insensitive), search name/description, no-match + clear, edit, rename collision | AC-003, AC-004 | Browser | same | 9 | DOM + backend readback |
| E2E-004 | Add-workspace default path: registered only, no Temp, nothing pre-selected, Submit disabled; link with description; row shows name/path/description; linked one not offered again; register new root then link | AC-005 | Browser + real registry | same | 10 | DOM + backend readback |
| E2E-005 | Remove linked workspace → Unavailable with path/description; re-register → Available, no duplicate; edit link description; unlink | AC-007, AC-005 | Browser + real registry | same | 11 | DOM |
| E2E-006 | Delete cancel then confirm; `workspaces.json` unchanged | AC-008 | Browser + filesystem | same | 12 | DOM + file bytes |
| E2E-007 | Keyboard-only journey: create, search, open, edit, link, unlink, delete; focus trap; Escape; focus return; announced errors | AC-011, QR-003 | Browser keyboard | same | 13 | `document.activeElement` assertions |
| E2E-008 | zh-CN rendering of Projects surfaces; no Task / 任务 wording | REQ-012, AC-003, AC-012 | Browser | same | 14 | DOM text |
| E2E-009 | Advanced-table `ENABLE_PROJECTS` false/true hides/shows nav without reload; open Project route redirects when off | AC-002 | Browser | same | 15 | DOM/URL |
| E2E-010 | Backend restart on the same data dir → still enabled; Projects intact | AC-002, AC-009, REQ-010 | Process lifecycle + browser | same | 16 | DOM after restart |
| E2E-011 | Rebind to node B → B's own Projects/capability; rebind to A → A's Projects | AC-009 | Two live backends + in-page rebind | same | 17 | DOM + GraphQL target |
| E2E-012 | Applications and SI toggles still toggle and persist; Applications nav gating unchanged; independent of Projects | AC-010 | Browser | same | 18 | DOM + GraphQL readback |

## Post-Repository Confidence Scorecard (Mandatory)

Scored after orders 1–6: existing suites plus the new un-mocked API e2e, before the browser probe.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | AC-003–AC-008 are proven at the real GraphQL/registry boundary. AC-001/002/009/010 are proven in stores and specs. | AC-001/002/011/012 user journeys, restart and rebinding are unproven in a real UI | Browser journeys |
| Changed-boundary execution directness | 75% | The server path runs un-mocked end to end | The web ↔ server contract, generated documents and real rendering are never executed together | Browser against live backends |
| Cross-boundary integration realism and mock gap | 70% | The API e2e uses the real store, registry and settings | Every web spec mocks Apollo/stores | Browser |
| Environment, configuration, identity, and fixture fidelity | 85% | Isolated app data dir; real settings `.env` | Not a running server process | Live isolated backends |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | Duplicates, unregistered/temp ids, not-found, removal/re-registration, delete scope, simulated restart | Real process restart; rebinding; capability-error redirect in a browser | Browser + lifecycle |
| User-surface, browser, and desktop-shell confidence | 50% | Component specs only | Keyboard, focus trap, nav live update, zh-CN rendering — the `SearchableSelect` keyboard risk is identified by code read | Browser keyboard journey |
| Durable regression coverage quality and relevance | 85% | New API e2e closes the mocked-lookup gap | No durable browser coverage | Durable probe |

- Overall post-repository confidence: 74% (simple average of 7)
- Calculation method: simple average; weak categories listed explicitly
- Every critical acceptance criterion directly proven: `No` (AC-001, AC-002, AC-009 in part, AC-011, AC-012 lack real-UI proof)
- Any applicable category below `90%`: `Yes` — all seven
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: real UI journeys; keyboard operability of the reused `SearchableSelect`; restart and rebinding

### Round 2 post-repository scorecard (before the browser rerun)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | Round-1 browser proof for 11 ACs stands (web delta confined to `SearchableSelect`). `ProjectWorkspaceLinkDialog.keyboard.spec.ts` mounts the real frame, selector and `SearchableSelect` and links by keyboard. | AC-011 not yet re-proven in a real browser |
| Changed-boundary execution directness | 90% | The delta's consumers pass (414 tests) | Real focus and teleport behavior in a browser |
| Cross-boundary integration realism and mock gap | 93% | Unchanged from round 1 for the untouched boundaries | — |
| Environment, configuration, identity, and fixture fidelity | 93% | Unchanged | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Unchanged; the delta touches no lifecycle | — |
| User-surface, browser, and desktop-shell confidence | 75% | Spec-level keyboard proof | Live keyboard; single viewport |
| Durable regression coverage quality and relevance | 95% | Two new component specs plus the existing probe | — |

- Overall: 90% (632 / 7). Broader validation: `Required` (Browser). The E2E-007 recheck comes first, then the full probe; the viewport case (E2E-013) was added to close the single-viewport gap.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser`. Isolated live backends, with a restart and a second node.
- Specific confidence gap or residual risk addressed:
  - No existing test exercises the web ↔ server contract.
  - Real nav and route gating have not been exercised.
  - Keyboard behavior with the real DOM, including the reused `SearchableSelect`, has not been exercised.
  - Restart persistence and node rebinding have not been exercised.
- Why the selected mode can materially improve confidence: the ACs are user-journey ACs. The design (step 7) names browser E2E as the verification.
- Expected confidence after the selected validation: ≥ 95% if all journeys pass.
- Browser-specific decision and rationale: required. The Projects UI is renderer-only and web-equivalent.
- Pre-execution risk noted from code read:
  - `components/common/SearchableSelect.vue`, used by `WorkspaceSelector` in the link dialog, renders its options as click-only `<li>` elements with no key handling.
  - Its popover is teleported to `body`, outside the `ProjectDialogFrame` panel that owns the focus trap.
  - E2E-007 will determine whether a keyboard-only user can link an existing workspace (`AC-011`).

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron (`autobyteus-web/electron`)
- Relevant README or development instructions: `autobyteus-web/package.json` scripts, `tests/e2e/*-probe.mjs`
- Web-equivalent behavior: all Projects UI, settings, nav, route gating, store rebinding logic
- Shell-specific or lifecycle behavior: the Electron window-node bootstrap (`plugins/20.windowNodeBootstrap.client.ts`) is unchanged; the folder-browse button (Electron only) is unchanged
- Chosen validation approach and why it fits the project: browser against `pnpm dev`. Rebinding is exercised through the same `windowNodeContextStore.bindNodeContext` that the shell bootstrap and the mobile session use.
- Server/frontend setup when browser validation is used: see the component table
- Effect on any already-running desktop application: `None`. Only isolated temp data dirs and free ports are used.
- Behavior not directly proven and confidence consequence: the Electron window-per-node creation itself (unchanged code) is not proven.

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- Startup order and commands:
  1. Build the server.
  2. For node A and node B, run `prisma migrate deploy` into temp sqlite DBs, then start `node dist/app.js --data-dir <tmp>/node-{a,b}` on free ports.
  3. Start `pnpm dev` with `BACKEND_NODE_BASE_URL=<A>`.
  4. Launch headless Chromium.
- Environment choices that materially affect the run: `APP_ENV=development`, sqlite, temp log/memory/temp-workspace dirs, `en` locale preset via localStorage (switched to `zh-CN` for E2E-008), 1440×900, UTC.
- Health / readiness checks: `/rest/health` for the backends; HTTP 200 on the frontend root.
- Seed data / fixtures: three temp folders registered through `createWorkspace` (`web-prototype`, `marketing`, `superrepo`), plus a fourth unregistered folder for register-then-link.
- Test identities, authentication, permissions, or session state: none.
- Requirement-linked journeys or scenarios: E2E-001…E2E-012.
- Evidence to capture: `result.json` with per-case results, GraphQL readbacks, screenshots per case, backend and frontend logs, browser console errors.
- Owned processes and temporary state to clean up: the two backends, the frontend, the browser, and the temp root.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| BASE-CMP | Temporary `git worktree` at `/tmp/proj-e2e-base-1676bede9` (symlinked `node_modules`) | Pre-existing failure attribution | Diagnostic only; removed after use |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| "Registration failed → nothing linked" through the real backend | The existing `createWorkspace` accepts nonexistent paths (handoff). The failure branch is covered by the component spec. | Low; the registration rules are unchanged and out of scope | None |
| QR-004 performance at 200 Projects | Client-side filter; not an AC | Low | Optional |
| Electron window-per-node creation | Unchanged shell code | Low | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| **Resolved in round 2 (API-REV-002).** `API-F-001` (E2E-007, `AC-011`/`REQ-013`/`QR-003`): in the Add-workspace dialog, a keyboard-only user cannot link an existing registered workspace. The reused `WorkspaceSelector` → `SearchableSelect` has three problems: its options are click-only `<li>` elements (no role, tabindex or key handling), so ArrowDown/Enter selects nothing and Submit stays disabled; opening the list focuses a search input teleported to `<body>`, outside the `aria-modal` `ProjectDialogFrame`, and Tab then reaches the page behind the modal; and Escape from there closes neither the list nor the dialog. | Preliminary `Local Fix` (implementation). A fix that changes the shared `SearchableSelect` (used by the 7 run-configuration callers) or replaces the design-mandated `WorkspaceSelector` reuse may be reclassified as `Design Impact` by the failure-origin review. | `/tmp/proj-e2e-logs/probe-run5/result.json` › `cases.E2E-007.observations.keyboardLinkExisting`; `/tmp/proj-e2e-logs/probe-kbd/E2E-007-keyboard-link-existing.png` | `/code_reviewer` (failure-origin review) |

## Investigation Decision

- Round 2 decision: proceed. `API-F-001` was rechecked first and resolved (E2E-007 Pass). Durable coverage was updated (E2E-007 assertions) and extended (E2E-013). No reroute is required. Final confidence is in the execution report.
- Proceed To API/E2E Execution: `Yes` (completed)
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`. Added `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` and `autobyteus-web/tests/e2e/projects-feature-probe.mjs`; updated `autobyteus-web/package.json` (`test:e2e:projects`).
- Post-repository confidence: 74%
- Broader validation decision: `Required` (Browser); executed
- Reroute Required Before Validation Execution: `No`. A reroute is required after execution for `API-F-001`.
- Recommended Recipient If Reroute Required: `/code_reviewer`
- Notes: Pre-existing failures are attributed to base: 7 server tests in the adjacent suites, 3 server unit-graphql tests, and 14 web tests in 7 files, of which 6 files are on the handoff's list and 1 is a load flake.
