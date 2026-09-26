# API/E2E Execution Coverage Report

Package `PROJ-CONCEPT-20260926-001` — `projects-concept-introduction` (slice 1: Projects only, behind `ENABLE_PROJECTS`).

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/requirements-doc.md` (Approved, `SR-001`)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/solution-revision-record.md`
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/design-spec.md` (`SR-003`)
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/handoff-to-architecture-review-sr-003.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/design-review-report.md` (`ARCH-REV-002`)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/implementation-revision-record.md` (`IR-001`, `IR-002`)
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/code-review-report.md` (`CRR-001`…`CRR-003`; round 3 = `IR-002` delta Pass)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/code-review-revision-record.md`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Execution Round: `2`
- Trigger: `/code_reviewer` delta-review Pass `CRR-003` of `IR-002` (commit `63e6fb0e4`, `SearchableSelect.vue` keyboard/listbox fix + 2 specs), resolving `CR-001` = `API-F-001`
- Prior Round Reviewed: round 1 (`API-REV-001`, Fail 83%, `API-F-001`)
- Latest Authoritative Round: `2`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` — requested now (round 2 Pass)

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md` (round 2)
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. Deviations:
  - The Applications capability assertion moved from the API e2e to the browser probe (E2E-012), because its resolver needs studio services that exist only in a full server.
  - Primary-nav assertions are made after client-side navigation away from Settings, because Settings renders no primary nav.
- Existing coverage decisions revised during execution, with evidence:
  - **Round 2, E2E-007:** the link-existing assertions were updated to the approved combobox-popup contract (see the investigation's Durable Coverage To Update). The round-1 `inDialog`-while-open check was stricter than the teleported-popup pattern. The new case completes and persists a keyboard link and forbids focus in the page behind the modal.
  - **Round 2, E2E-013:** added (narrow desktop viewport).
- Reroute required before or during execution: round 1 `Yes` after execution (`API-F-001`, since resolved); round 2 `No`
- Notes: probe runs 1 and 2 were diagnostic. Their failures were fixed in the probe: a locator scope, a trap-walk index, two async-settle races, and state cascades. None were product defects.

## Test-Case Ledger Reconciliation (When Applicable)

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`. API cases were recorded after the server e2e run. Browser cases were recorded per case from the probe's per-case `result.json`, with the diagnostic runs recorded as checkpoints.
- Long-running case checkpoints recorded when needed: `Yes` (sequences 7–8)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: sequence 25 (E2E-013 Completed)
- Cases still running, interrupted, or not started: none
- Interruption, context-compression, or rerun note:
  - Round 1: runs 3–6 were identical.
  - Round 2: the E2E-007 recheck ran first (`r2-e2e007`), then two identical 12-case runs (`r2-full` via `pnpm test:e2e:projects`, `r2-full-confirm`), then the final 13-case run (`r2-final`).

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| API-001 … API-006 | Pass | Completed (seq 1–6, 23) | `/tmp/proj-e2e-logs/r2-server-e2e.log` | Pass |
| E2E-001 … E2E-006, E2E-008 … E2E-012 | Pass | Completed (seq 24) | `/tmp/proj-e2e-logs/r2-final/result.json` | Pass (round 2) |
| E2E-007 | Pass | Completed (seq 22, 24) | `/tmp/proj-e2e-logs/r2-e2e007/result.json`, `r2-final/result.json`, `r2-final/E2E-007-keyboard-link-existing.png` | Round 1 Fail → round 2 Pass (`API-F-001` resolved) |
| E2E-013 | Pass | Completed (seq 25) | `r2-final/result.json`, `E2E-013-link-dialog-1024.png` | Pass (new) |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`. The state is `Not Affected`: `workspaces.json` stays byte-identical across Project operations; `ENABLE_APPLICATIONS` and `ENABLE_SKILL_IMPROVEMENT` keep their values and meaning; a missing `projects.json` means no Projects.
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| API-001 | AC-001, AC-002, AC-010, REQ-011 | Capability service + generic accessor | Full GraphQL schema, isolated config | Durable | Pass | `projects-graphql.e2e.test.ts` |
| API-002 | AC-003, AC-004, REQ-001 | Resolver → service → file store | same | Durable | Pass | same |
| API-003 | AC-005, AC-006, REQ-002/003/005 | + real `WorkspaceManager` registry | same | Durable | Pass | same |
| API-004 | AC-007, REQ-004 | + real `removeWorkspace` / `createWorkspace` | same (run managers emulated as having no active runs) | Durable | Pass | same |
| API-005 | AC-008, REQ-009/011 | Delete scope; `workspaces.json` | same | Durable | Pass | same |
| API-006 | AC-009, REQ-010 | Persistence across fresh singletons | same | Durable | Pass | same |
| E2E-001 | AC-001, QR-002 | Nav filter, route gate, Basics card | Browser + live node A | Durable / Browser | Pass | `result.json`, `E2E-001-pass.png` |
| E2E-002 | AC-002, AC-001 alternate | Toggle → store → nav; capability error | Browser | Durable / Browser | Pass | same |
| E2E-003 | AC-003, AC-004, REQ-013 (errors) | Index, form dialog, detail | Browser | Durable / Browser | Pass | same |
| E2E-004 | AC-005, REQ-005 | Link dialog, `WorkspaceSelector.candidateWorkspaceIds`, register-then-link | Browser + real registry | Durable / Browser | Pass | same |
| E2E-005 | AC-007, AC-005 | Read-time availability; row states; edit/unlink | Browser + real registry | Durable / Browser | Pass | same |
| E2E-006 | AC-008 | Delete dialog; registry invariance | Browser + filesystem | Durable / Browser | Pass | same |
| E2E-007 | AC-011, REQ-013, QR-003 | Keyboard/focus across all Projects dialogs; `SearchableSelect` listbox (`IR-002`) | Browser keyboard only | Durable / Browser | Pass (round 2; round 1 Fail) | `r2-final/result.json` › `E2E-007`; `E2E-007-keyboard-link-existing.png` |
| E2E-013 | UI section (desktop responsive), REQ-008 | Layout at 1024×700 | Browser | Durable / Browser | Pass | `E2E-013-link-dialog-1024.png` |
| E2E-008 | REQ-012, AC-003, AC-012 | zh-CN catalogues; Task wording | Browser zh-CN + en | Durable / Browser | Pass | same |
| E2E-009 | AC-002 (DS-004b) | Advanced-table refresh table; route gate | Browser | Durable / Browser | Pass | same |
| E2E-010 | AC-002, AC-009, REQ-010 | Process restart on the same data dir | Lifecycle + browser | Durable / Browser | Pass | same |
| E2E-011 | AC-009 | Binding-revision invalidation across two live nodes | Browser + 2 backends | Durable / Browser | Pass | same |
| E2E-012 | AC-010 | Applications/SI on the shared factory and card; Applications route gate | Browser | Durable / Browser | Pass | same |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 8 | `corepack pnpm -C autobyteus-server-ts build` | worktree root | Built server for live nodes | Pass | `/tmp/proj-e2e-logs/server-build.log` |
| 9 | `node tests/e2e/projects-feature-probe.mjs --skip-server-build` (runs 1–5) | `autobyteus-web` | E2E-001…E2E-012 | Final: 11 Pass / 1 Fail | `/tmp/proj-e2e-logs/probe-run{1..5}.log`, `probe-run{3,4,5}/` |
| 10 | `corepack pnpm test:e2e:projects --skip-server-build --output-dir=/tmp/proj-e2e-logs/probe-run6-script` | `autobyteus-web` | Script entry | 11 Pass / 1 Fail (identical) | `/tmp/proj-e2e-logs/probe-run6-script/result.json` |
| R2-a | `node tests/e2e/projects-feature-probe.mjs --skip-server-build --only=E2E-003,E2E-004,E2E-007 --output-dir=/tmp/proj-e2e-logs/r2-e2e007` | `autobyteus-web` | Round 2 prior-failure recheck | Pass (3/3 selected) | `/tmp/proj-e2e-logs/r2-e2e007/` |
| R2-b | `corepack pnpm test:e2e:projects --skip-server-build --output-dir=/tmp/proj-e2e-logs/r2-full`; then the same via `node` to `r2-full-confirm` | `autobyteus-web` | E2E-001…012 | Pass 12/12, twice | `/tmp/proj-e2e-logs/r2-full*/` |
| R2-c | `node tests/e2e/projects-feature-probe.mjs --skip-server-build --output-dir=/tmp/proj-e2e-logs/r2-final` (with E2E-013) | `autobyteus-web` | E2E-001…013 | Pass 13/13 | `/tmp/proj-e2e-logs/r2-final/` |
| 11 | `node tests/e2e/projects-feature-probe.mjs --only=E2E-003,E2E-004,E2E-007 --output-dir=/tmp/proj-e2e-logs/probe-kbd` | `autobyteus-web` | Mid-journey screenshot of `API-F-001` | E2E-007 Fail (same 3 findings); E2E-003 failed only because the filtered run skipped E2E-002, fixed afterwards with a precondition | `/tmp/proj-e2e-logs/probe-kbd/` |

## Validation Confidence Scorecard (Mandatory)

Round 2 is authoritative. The post-repository column is the round-2 post-repository score from the investigation. Round 1's final score was 83%.

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 95% | +5 | All 12 ACs are directly proven through the live UI and API. AC-011 is re-proven in a real browser by keyboard only, including linking an existing workspace. | The "registration failed → nothing linked" branch is proven by spec only, because the backend accepts nonexistent paths |
| Changed-boundary execution directness | 90% | 95% | +5 | The `IR-002` delta ran in the real browser inside the real dialog. The full stack is unchanged from round 1. | — |
| Cross-boundary integration realism and mock gap | 93% | 95% | +2 | Two live nodes, a real restart and real cross-origin GraphQL. Rebinding uses the same `windowNodeContextStore.bindNodeContext` the shell bootstrap calls, and the window bootstrap code is unchanged. | Negligible |
| Environment, configuration, identity, and fixture fidelity | 93% | 95% | +2 | Isolated fresh nodes with `ENABLE_*` scrubbed. The diff contains no build or runtime config change (`nuxt.config*`, `electron/`, `plugins/`, server `config/` are untouched), so the dev-server vs production-bundle difference is negligible for this change. | macOS only |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | 0 | Unchanged from round 1, plus the Escape and Tab paths of the list | As above (registration-failure branch) |
| User-surface, browser, and desktop-shell confidence | 75% | 95% | +20 | Live keyboard journey passes (`softFailures: []`); 1440×900 and 1024×700 layouts fit (`docOverflowX=0`); en and zh-CN | Screen-reader output for the teleported listbox under `aria-modal` was not exercised. AC-011 is keyboard operability, so this is non-blocking. |
| Durable regression coverage quality and relevance | 95% | 95% | 0 | API e2e plus a 13-case probe with the revised E2E-007 and the new E2E-013 | — |

- Overall post-repository confidence (round 2): 90%
- Overall final confidence: 95% (665 / 7)
- Calculation method: simple average of the 7 applicable categories
- Confidence change produced by broader validation: +5. It re-proved AC-011 live and closed the single-viewport gap.
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: screen-reader exposure of the teleported listbox under `aria-modal` (not an approved AC surface); the registration-failure branch is covered by spec only

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: `Required` — Browser, with isolated live backends, a restart and a second node
- Material deviation from the planned mode or rationale: none
- Confidence gap or residual risk actually addressed: the web ↔ server contract; nav and route gating; the Advanced-table refresh; restart; rebinding; keyboard and focus behavior; zh-CN; Task wording
- If `Not Required`, direct evidence that made broader validation unnecessary: N/A
- If `Blocked`, exact unavailable dependency or access and attempted alternatives: N/A
- Startup order, commands, and readiness results:
  1. Server build.
  2. For each node: `prisma migrate deploy` (temp sqlite), then `node dist/app.js --host 127.0.0.1 --port <free> --data-dir <tmp>/node-{a,b}`, readiness via `/rest/health`.
  3. `corepack pnpm dev --host 127.0.0.1 --port <free>` with `BACKEND_NODE_BASE_URL=<node A>`, readiness via HTTP 200.
  4. Headless Chromium (playwright-core 1.58.2 default revision).
- Environment choices that materially affected the run:
  - Spawned processes have every `ENABLE_*` variable removed. The developer shell exports `ENABLE_SKILL_IMPROVEMENT=true` and `ENABLE_APPLICATIONS=false`, which otherwise leak into the node as settings.
  - Locale `en` is preset in localStorage; E2E-008 uses a separate `zh-CN` context.
  - Viewport 1440×900, timezone UTC.
- Seed data, fixtures, identities, authentication, permissions, or session state:
  - Five temp folders under `<tmp>/roots`: `e2e-web-prototype`, `e2e-marketing`, `e2e-superrepo`, `e2e-new-root`, `e2e-kbd-root`.
  - Workspaces are registered through the real `createWorkspace` mutation.
  - Projects are created through the UI, or through GraphQL where the UI is not under test.
  - No identities.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | DOM / Screenshot / Log / API / Process Evidence | Result |
| --- | --- | --- | --- | --- |
| E2E-001 fresh node | No Projects nav; `/projects*` → home; toggle off | Nav `Agents…Nodes`; both routes landed on `/agents` (the `/` home); `aria-checked=false`, "Disabled"; `.env` gained `ENABLE_PROJECTS=false` | `result.json` | Pass |
| E2E-002 toggle | Nav shows Projects after Nodes without reload; persisted; off hides and redirects; capability error hides and redirects | As expected; page marker preserved; capability error intercepted twice, final path `/agents` | `result.json` | Pass |
| E2E-003 CRUD | Field errors associated; duplicates rejected; search and no-match; edit persists | As expected; `aria-describedby` matches the error id | `result.json` | Pass |
| E2E-004 link default path | Only registered workspaces, no Temp, nothing selected, Submit disabled | Options = the 3 `e2e-*` roots; trigger "Select a workspace..."; Submit disabled; row AVAILABLE with name, path and description; linked one not re-offered; New root linked | `result.json` | Pass |
| E2E-005 unavailable/restore | Removal not blocked; UNREGISTERED row with data; restore without duplicate | "Workspace removed from Workspaces…"; badge "Unavailable" + help text; same id on re-registration; 3 rows | `result.json` | Pass |
| E2E-006 delete | Confirm needed; registry unchanged | Initial focus Cancel; cancel kept the Project; confirm removed it; `workspaces.json` byte-identical | `result.json` | Pass |
| E2E-007 keyboard (round 2) | Link an existing workspace by keyboard; focus never reaches the page behind the modal | The list opened with Enter and ArrowDown. Focus was on the `combobox` popup owned by the trigger (`aria-controls` matched), with `activeInPageBehindModal=false`. Tab and Shift+Tab returned focus to the trigger. The first Escape closed the list only; the second closed the dialog, and focus returned to Add workspace. Typing `superrepo` and pressing Enter selected it, with focus back on the trigger. The link persisted. The rest of the journey was unchanged. | `r2-final/result.json` › `E2E-007`; `E2E-007-keyboard-link-existing.png` | Pass |
| E2E-013 layout | No horizontal overflow at 1024×700; dialogs fit | `docOverflowX=0` on the index, detail and both dialogs; the Add workspace button stays on one line; the link dialog spans y 123–577 | `E2E-013-link-dialog-1024.png` | Pass |
| E2E-007 keyboard (round 1, superseded) | All actions keyboard-operable; dialogs trap focus | Create, error focus, trap wrap (4 focusables), Shift+Tab, Escape + focus return, search → card, edit + focus return, New-path link, unlink (accessible name "Unlink e2e-kbd-root from this project"), delete with Escape/return all worked. **Existing-workspace link failed:** focus after opening the list = `INPUT "Search workspaces..." inDialog=false`; after ArrowDown+Enter nothing selected (Submit disabled); Tab → `BODY` (page behind the modal); Escape left the dialog open. | `result.json` › `E2E-007.observations`; `E2E-007-keyboard-link-existing.png` | **Fail** |
| E2E-008 i18n/Task | zh-CN strings; no Task wording | zh index, nav and detail labels present; no English "New project"; `taskWordingMatches: []`; selector literals "Existing"/"New" remain English (pre-existing) | `result.json` | Pass |
| E2E-009 Advanced table | Nav hides/shows; open route redirects | Store settled 153 ms after save; history-back to `/projects/<id>` → `/agents`; nav hidden; marker preserved; `true` → nav shows | `result.json` | Pass |
| E2E-010 restart | Still enabled; data identical | `autobyteus:2`, `Marketing site:0` before and after; 2 rows | `result.json` | Pass |
| E2E-011 rebinding | Node B's own Projects; back to A | B shows `node-b-only`; GraphQL origins A and B; back to A shows `autobyteus`, `Marketing site`; no leak | `result.json` | Pass |
| E2E-012 Applications/SI | Unchanged toggling and gating | Applications on → nav shows it; off → `/applications` → `/agents`; SI flip persisted; both restored; Projects unaffected | `result.json` | Pass |

## Desktop Application Validation (When Applicable)

- Validation approach executed and any deviation from the investigation: browser against `pnpm dev`, as planned
- Browser-tested web-equivalent behavior and evidence: all 12 journeys
- Shell-specific or lifecycle behavior and evidence:
  - Backend process restart: real SIGTERM, then a start on the same data dir.
  - Window-node rebinding: exercised through the shared `windowNodeContextStore.bindNodeContext`.
- Effect on any already-running desktop application: `None`
- Behavior not directly proven and confidence consequence: Electron window-per-node creation and the Electron-only folder-browse button (both unchanged code). This is a small consequence, reflected in the 93% realism score.

## Platform / Runtime Targets

- Operating system / platform: macOS (darwin-arm64), Darwin 25.5.0
- Runtime and relevant framework versions: Node v22.23.1; Nuxt 3 dev server; playwright-core 1.58.2
- Browser / engine and version, when applicable: Playwright bundled Chromium (headless)
- Device, viewport, locale, timezone, or accessibility settings, when applicable: 1440×900 (all cases) and 1024×700 (E2E-013); `en` and `zh-CN`; UTC; keyboard-only journey in E2E-007

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected` (new subject only)
- Representative existing data exercised: registered-workspace `workspaces.json`; `ENABLE_APPLICATIONS` and `ENABLE_SKILL_IMPROVEMENT` settings
- Direct-use, discard/rebuild, or migration result and evidence:
  - API-005 and E2E-006: `workspaces.json` byte-identical.
  - API-001 and E2E-012: the other capability values are unchanged.
  - API-006 and E2E-010: `projects.json` and `ENABLE_PROJECTS` survive a restart unchanged.
- Migration completion/recovery evidence: N/A
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none material

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` (API-001…006) | Added (round 1) | AC-001–AC-010 server boundary; REQ-011 | Pass 6/6 (round 1 ×3, round 2 ×1) | Un-mocked; isolated app data dir; run managers emulated as having no active runs |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` (E2E-001…013) | Added (round 1); updated in round 2 (E2E-007 link-existing assertions to the combobox-popup contract; new E2E-013) | AC-001–AC-012; desktop responsive layout | Pass 13/13 (round 2) | Follows the `provider-api-key-save-probe.mjs` pattern; per-case evidence; `--only` filter; full cleanup |
| `autobyteus-web/package.json` | Updated (`test:e2e:projects`) | Probe entry | Validated (round 1 run 6; round 2 `r2-full`) | One line |

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes` (uncommitted in the worktree)
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/autobyteus-web/tests/e2e/projects-feature-probe.mjs`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/autobyteus-web/package.json`
- Paths removed: none
- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `/tmp/proj-e2e-logs/` | Command logs, probe results and screenshots (round 1: runs 1–6, `probe-kbd`; round 2: `r2-e2e007`, `r2-full`, `r2-full-confirm`, `r2-final`) | Retained as evidence (outside the repo) | `r2-final/result.json` is the authoritative browser evidence |
| `/tmp/proj-e2e-logs/fails-branch.txt` | Full web suite failing-test list | Retained | — |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `git worktree` at `/tmp/proj-e2e-base-1676bede9` (symlinked `node_modules`) | Base attribution of server failures | 7 adjacent + 3 unit-graphql server failures identical on base. The full web suite could not run there (Vite `fs.allow` with symlinks). | Removed (`git worktree remove --force`, `prune`) |
| `/tmp/proj-e2e-explore` (manual backend/frontend + 4 Playwright scripts) | DOM discovery; early keyboard reproduction | Confirmed the `SearchableSelect` keyboard/focus defect before writing the probe | Processes stopped; directory removed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| `AgentRunManager` / `AgentTeamRunManager` (API e2e only) | `vi.spyOn(...getInstance)` returning "no active runs" | Process singletons exist only in a full server; the unchanged removal guard needs them | None for Projects. The live probe uses the real managers (E2E-005). |
| Capability GraphQL failure (E2E-002) | Playwright route fulfils `GetProjectsCapability` with an error | Needed to exercise the AC-001 alternate | None |
| Electron window-node bootstrap (E2E-011) | In-page `bindNodeContext` | The browser has no Electron window context | Window creation is unchanged code |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | API-001 … API-006, E2E-001 … E2E-013 | Approved behavior proven for AC-001–AC-012 and desktop layout. `API-F-001` (round-1 E2E-007 failure) is resolved by `IR-002`. |
| Out Of Scope | Pre-existing failures | Unchanged from round 1. Server: 4 SI, 2 workspace-manager, 1 workspaces e2e and 3 unit-graphql tests, all identical on base. Web: 14 tests in 7 files (6 on the handoff's list; `managedExtensionService` is a load flake). `CRR-003` reports the same base-failing specs after `IR-002`. |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe backends A/B, frontend, browser (each run) | Owned by the probe | SIGTERM/SIGKILL on the process group; `browser.close()` | `terminated:*` recorded in every `result.json` |
| Probe temp roots (`$TMPDIR/autobyteus-projects-e2e-*`) | Owned | `fs.rm` | `tempRoot: removed`; none left |
| API e2e temp app data dirs | Owned | `afterEach` `fs.rmSync` | Removed |
| Exploration backend/frontend (ports 18731/13731) and `/tmp/proj-e2e-explore` | Owned | `kill`; `rm -rf` | No listeners left; directory removed |
| Base worktree `/tmp/proj-e2e-base-1676bede9` | Owned | `git worktree remove --force` + `prune` | Removed |
| `autobyteus-web/test-results/` (probe default output) | Owned | Evidence copied to `/tmp/proj-e2e-logs`, then the directory was removed | The worktree has only the intended changes |
| `autobyteus-server-ts/dist` rebuild | Build output (ignored) | Left in place (ignored build output) | — |
| Round 2 probe runs (backends, frontend, browser, temp roots) | Owned by the probe | Same as round 1; output written to `/tmp/proj-e2e-logs/r2-*` (never into the worktree) | `terminated:*` and `tempRoot: removed` in every result; no `$TMPDIR/autobyteus-projects-e2e-*` left; no `autobyteus-web/test-results` |

## Preliminary Classification

N/A — round 2 passes. For history: round 1's `API-F-001` was classified `Local Fix`. `CRR-002` and `CRR-003` confirmed it as `CR-001`, and it was fixed in `IR-002`.

## Recommended Recipient

`/code_reviewer` — proportional test-code review of the durable test changes (`api-e2e-test-review-report.md`)

## Evidence / Notes

- **Prior-failure resolution:**
  - `API-F-001` was rechecked first in round 2 (`/tmp/proj-e2e-logs/r2-e2e007/result.json` › `E2E-007.observations.keyboardLinkExisting`, `softFailures: []`).
  - It stayed green in the three later full runs.
- **Shared-component regression:**
  - `SearchableSelect` is used by `WorkspaceSelector` (7 run-config callers plus the Projects link dialog) and `ApplicationWorkspaceRootSelector`. All their suites pass (71 files / 414 tests).
  - Mouse selection in a real browser is still exercised by E2E-004.
  - `CRR-003` notes that the trigger now shows a focus ring after a mouse selection. This is expected combobox behavior.
- **Non-blocking observations, carried forward:**
  1. The pre-existing English `WorkspaceSelector` literals appear in zh-CN.
  2. The Advanced-table save refreshes the capability store about 150 ms after the backend persists (same mechanism as Applications).
  3. `/rest/health` returns 500s and CORS errors while the backend restarts (existing infrastructure).
  4. Developer-shell `ENABLE_*` variables override dev-node settings; the probe scrubs them.
  5. New: the teleported listbox sits outside the `aria-modal` dialog subtree. Keyboard behavior is correct. Whether screen readers expose it was not tested, and this is not part of AC-011's keyboard criterion.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required` — executed (Browser, 2 live nodes, restart, keyboard-only, 2 viewports)
- Critical acceptance criteria lacking direct proof: none
- Required next recipient: `/code_reviewer` for the proportional test-code review
- Notes:
  - `task_size=Large` and `architectural_risk=High` are preserved.
  - Round 1 failed (83%, `API-F-001`); round 2 passes (95%).
  - The durable test files are uncommitted in the worktree for review; delivery owns integration and commit.
