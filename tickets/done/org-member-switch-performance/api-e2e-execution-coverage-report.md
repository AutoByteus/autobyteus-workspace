# API/E2E Execution Coverage Report

Ticket folder (TF): `/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/tickets/in-progress/org-member-switch-performance/`

## Execution Round Meta

- Requirements Doc: `TF/requirements-doc.md` (Approved, SR-003)
- Investigation Notes: `TF/investigation-notes.md`
- Solution Revision Record: `TF/solution-revision-record.md`
- Design Spec: `TF/design-spec.md` (Ready, SR-003)
- Supplemental Task Artifacts: `TF/probes/`, `TF/evidence/`, `TF/handoff-result.md`
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `TF/implementation-handoff.md` (IR-001, commit `88bd41620`)
- Implementation Revision Record: `TF/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: N/A
- Coverage Investigation: `TF/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `TF/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `TF/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: Implementation Complete IR-001 (direct route)
- Prior Round Reviewed: N/A
- Latest Authoritative Round: 1

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Coverage investigation artifact: `TF/api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. Deviations, all evidence-driven:
  1. E-004 initially assumed the Org tab auto-selects the newest message. The Org tab is the default right tab, so the panel was already mounted on the team node, and the preserved selection rule kept a message shared with code reviewer selected. The probe now selects the 3,136-reference message explicitly. The selection logic is unchanged by the diff, so this is not a defect.
  2. E-005's "no refetch of the open reference" assertion failed. A base build comparison showed identical pre-existing behavior, so it was reclassified as observation OBS-001 (outside this change's scope). The in-scope assertions remain and pass.
  3. E-006 needed the snapshot Team run back in the index. The run had been dropped by migration `20260814_team_run_execution_tree_v1` during the implementer's 09:22 server start (OBS-003). It was restored from that migration's own backup in the owned copy only.
  4. E-006 Team switch timing is recorded, not asserted: QR-001 is defined on the Org snapshot, and AC-008 asks for bounded rendering and reachability (OBS-002).
- Existing coverage decisions revised during execution: None.
- Reroute required: `No`

## Test-Case Ledger Reconciliation

- Ledger path: `TF/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Long-running case checkpoints recorded: `Yes` (Electron build, environment setup)
- Ledger reconciled into this report: `Yes`
- Cases still running, interrupted, or not started: None

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| R-001 | Pass | 2 | console | — |
| DUR-001..003 | Pass | 3 | `autobyteus-web/components/workspace/collaboration/__tests__/CollaborationMessagesOrgRoot.integration.spec.ts`; `/tmp/omsp-api-e2e/mutation-*.log` | Mutation-sensitive |
| R-002 | Pass (2 pre-existing base failures) | 4 | `/tmp/omsp-api-e2e/r002-*.log` | — |
| R-003 | Pass | 5 | `/tmp/omsp-api-e2e/r003-localization.log` | — |
| E-001/E-002 | Pass | 8 | `evidence/api-e2e-E001-switch-Org-results.json` | — |
| E-003 | Pass | 9 | `evidence/api-e2e-E003-switch-Files-results.json` | — |
| E-004 | Pass | 10 | `evidence/api-e2e-E004/` | — |
| E-005 | Pass | 11 | `evidence/api-e2e-E005/` | OBS-001 |
| E-006/E-007 | Pass | 12 | `evidence/api-e2e-E006-E007/` | OBS-002, OBS-003 |
| E-008 | Pass | 13 | `evidence/api-e2e-E008/` | OBS-004 |

## Compatibility / Legacy Scope Check

- Requirements/design introduce or tolerate backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. The Panel has no `listMessages()` fallback (`rows` is required); there is no "inline all" mode; the eager hash is removed.
- Approved persisted-data transition followed: `Yes` (`Not Affected`; existing persisted messages open through the unchanged server route, E-004/E-006)
- Durable coverage added only for compatibility behavior: `No`

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | AC-002/003/004/006/008, REQ-002..005/008 | Section/Panel/projection | Vitest/jsdom | Durable | Pass | 4 files / 28 tests |
| DUR-001 | AC-003, REQ-005 | Org root: real context + projection + crypto-js, 42,000 refs | Vitest/jsdom | Durable | Pass | Mount: 1 projection, 0 hashes; switch: 1 projection, 20 hashes |
| DUR-002 | AC-007, REQ-006 | Real `applyEvent` live path | Vitest/jsdom | Durable | Pass | 1 projection; ≤ 20 hashes (preview); Show all kept; selection kept |
| DUR-003 | AC-004, REQ-004 | On-demand ID → content path | Vitest/jsdom | Durable | Pass | Last of 3,000 → server hash path; no re-hash (memoized) |
| R-002 | Regression | Affected suites | Vitest | Durable | Pass | 211 pass; 2 `RightSideTabs.workspaceTarget` failures identical on base |
| R-003 | REQ-003 copy | Localization | scripts | Durable | Pass | audit zero findings; guard passed |
| E-001 | AC-001/002, QR-001/002 | Rendered Org panel, real data | Production build + isolated real server, headless Chrome 2000×1250 | Browser | Pass | Switches 20–69 ms (baseline ≤ 4,232); ≤ 20 ref rows (baseline 41,965); DOM 828–1,916 (baseline 188,589) |
| E-002 | AC-005, QR-003 | Show all | same | Browser | Pass | 260 ms; plus 208–266 ms ×5 in E-004 |
| E-003 | AC-006 | Files-tab control | same | Browser | Pass | 5–51 ms |
| E-004 | AC-004, REQ-003/004/008 | Count, Show all copy, first/last of 3,136 opened via REST | same + REST | Browser/Live | Pass | 13/13 checks; IDs = `sha256(messageId\0path)`; served bytes SHA-256 = disk (34,448,621 B; 4,822 B) |
| E-005 | AC-007, REQ-006, QR-001; SCN-A1/A2 | Live arrival at real scale | same; real `AgentOrgExecutionContext.applyEvent` | Browser | Pass | 28 / 89 / 87 / 78 ms; existing ref-row DOM elements 100% reused; base 2,276 ms |
| E-006 | AC-008, REQ-007; SCN-A4 | Team root (server reference IDs), 241 msgs / 9,798 refs | same | Browser/Live | Pass | ≤ 20 ref rows every switch (base 9,798); Show all 183 = 35 ms; last ref → real 404 → "Reference file unavailable" |
| E-007 | REQ-003 (zh-CN) | Localized copy | same, zh-CN preference | Browser | Pass | `183 个引用文件`, `显示全部 183 个文件` |
| E-008 | ASM-002/UNK-002, QR-001/002/003, AC-007 | Electron renderer | Isolated desktop instance of the worktree build, owned snapshot root, CDP | Desktop | Pass | Switches 23–91 ms, ≤ 20 rows; Show all 245–275 ms ×3; live arrival (Show all expanded) 145 ms |

## Additional Repository Coverage Execution

None beyond the investigation's table, other than the two mutation checks recorded under DUR-001..003.

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 70% | 95% | +25 | AC-001..AC-008 and QR-001..003 each directly proven at real scale, in Chrome and Electron | Negligible |
| Changed-boundary execution directness | 80% | 95% | +15 | Production bundle against the real server and in the packaged Electron renderer | None material |
| Cross-boundary integration realism and mock gap | 70% | 95% | +25 | Real REST resolution of lazily derived IDs (Org) and server IDs (Team); live arrival through the real context `applyEvent` | WebSocket transport not exercised (unchanged; the stream service calls `applyEvent` directly) |
| Environment, configuration, identity, and fixture fidelity | 70% | 95% | +25 | The user's org (41,965 refs) and the largest local Team run (9,798 refs), owned copies | Team index restored from a migration backup (OBS-003) |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 95% | +15 | Real missing file → existing unavailable state; Show-all reset/keep; arrival with a reference open; unrelated arrival; selection preservation | Org-route missing file not separately exercised (same unchanged viewer and 404 handling) |
| User-surface, browser, and desktop-shell confidence | 50% | 95% | +45 | Chrome + Electron 42.4.1 at the default 1200×768 window (tool-strip layout), en + zh-CN, screenshots | QR-003 margin 25–45 ms (OBS-004); Team 241-message timing (OBS-002, outside acceptance) |
| Durable regression coverage quality and relevance | 95% | 95% | 0 | Mutation-verified Org-root spec | Timing is not durable (machine-dependent) |

- Overall post-repository confidence: 74%
- Overall final confidence: 95%
- Calculation method: simple average of the seven categories
- Confidence change produced by broader validation: +21 points
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: OBS-001..OBS-004 (non-blocking; see below)

## Broader Validation Decision And Execution

- Decision and mode: `Required`; `Browser` (production build + isolated real server on snapshot data) and `Project Desktop Validation` (isolated desktop instance).
- Material deviation: None in mode. Navigation adjustments are listed above.
- Gaps addressed: real timing/DOM scale, server reference resolution, live arrival cost (UNK-001), Team dataset, zh-CN, Electron ratio (UNK-002).
- Startup and readiness:
  1. `pnpm build:electron:mac` (EXIT 0). The packaged `app.asar` was verified to contain the new code (lazy getter, Show-all data-test).
  2. `nuxt build` with `BACKEND_*` → `127.0.0.1:29811`.
  3. Backend: `env -i HOME=/tmp/omsp-api-e2e/home PATH=/usr/bin:/bin ELECTRON_RUN_AS_NODE=1 APP_ENV=production DATABASE_URL=file:/tmp/omsp-api-e2e/data/db/production.db DB_NAME=… AUTOBYTEUS_MEMORY_DIR=/tmp/omsp-api-e2e/data/memory AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:29811 /Applications/AutoByteus.app/Contents/MacOS/AutoByteus dist/app.js --data-dir /tmp/omsp-api-e2e/data --port 29811 --host 127.0.0.1`. The log confirms `Datasource "db": … file:/tmp/omsp-api-e2e/data/db/production.db`, and `/rest/health` is ok.
  4. Static: `python3 -m http.server 29812`.
  5. Desktop: `pnpm --silent isolated-app start --from-worktree --data-root /tmp/omsp-api-e2e/electron-root`, instance `iso-57804-dcbd`, ports 57804/57805, `databaseUrl` inside the owned root.
- Environment choices: owned copies of the investigator snapshot (`/tmp/org-switch-repro/data` was never modified); the Electron root's `.env` was removed so the app generated its own deterministic `.env`; the base comparison build `26b555126` was served from a separate copy.
- Seed data: snapshot only. Synthetic live events in-page only; nothing persisted.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| SCN-001 Org member switch (Org tab) | ≤ 200 ms, ≤ 50 ref rows | 20–69 ms (Chrome), 23–91 ms (Electron); ≤ 20 rows | E-001, E-008 | Pass |
| SCN-002 count on every row, preview + Show all | Count, 20 rows, "Show all 3,136 files" | As expected; one reference list | E-004 | Pass |
| SCN-003 open first/last reference | Same content via server contract | IDs = server hash; bytes equal disk | E-004 | Pass |
| SCN-004 live arrival | Bounded, list updates | 28–89 ms, DOM reused, header +1, selection/Show all kept | E-005, E-008 | Pass |
| SCN-005 Team root | Bounded + reachable | ≤ 20 rows; last reference reachable (404 → unavailable state) | E-006 | Pass |
| SCN-A3 shared-message selection across member switch | Selection kept (preserved rule), Show all collapses | Observed in E-004 setup; DUR-002 asserts the collapse | E-004, DUR | Pass |
| SCN-A4 missing file | Existing unavailable state | "Reference file unavailable" | E-006 screenshot | Pass |

## Desktop Application Validation

- Approach executed: isolated desktop instance of the worktree build (`--from-worktree`) with an owned copy of the snapshot as `--data-root`, driven over CDP (`connectOverCDP`), in the default window (1200×768, collapsed right tool strip → "Agent Org").
- Web-equivalent behavior: the whole change; proven in Chrome (E-001..E-007) and in the Electron renderer (E-008).
- Shell-specific behavior: none changed.
- Effect on an already-running desktop application: None. Other worktrees' instances (`iso-52483-84f0`, `iso-57942-2d9d`) were left untouched.
- Not directly proven: none material.

## Platform / Runtime Targets

- macOS (Darwin 25.5.0), arm64
- Node v22.23.1; Nuxt production build of `88bd41620`; installed server v1.4.94-beta.2 for the browser runs; worktree-packaged server for Electron
- Google Chrome (headless, Playwright `playwright-core`), Electron 42.4.1
- Viewport 2000×1250 (Chrome), 1200×768 (Electron); locales en and zh-CN; system locale de (dates rendered "4. Okt.")

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data exercised: the user's org snapshot (59 messages, up to 3,136 references) and Team run (320 messages)
- Direct-use result: existing messages open their references through the current reader and routes (E-004, E-006)
- Version-specific runtime branch or compatibility fallback observed: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added this round: `Yes`

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-web/components/workspace/collaboration/__tests__/CollaborationMessagesOrgRoot.integration.spec.ts` | Added (uncommitted, untracked) | AC-003/004/007, REQ-004/005/006: real Org context + projection + counted crypto-js at 42,000 refs; member switch; live `applyEvent`; open last reference | 3/3 pass. Mutation: base sources → worker OOM; eager hash only → `expected 42000 to be +0`, `expected 42001 ≤ 20` |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct route; attached for delivery)
- Removed paths: None

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `TF/probes/api-e2e-reference-open.mjs` | E-004 probe | Retained (ticket) | — |
| `TF/probes/api-e2e-live-arrival.mjs` | E-005 probe | Retained | — |
| `TF/probes/api-e2e-base-live-arrival.mjs` | E-005 base comparison | Retained | — |
| `TF/probes/api-e2e-team-root.mjs` | E-006/E-007 probe | Retained | — |
| `TF/probes/api-e2e-base-team-switch.mjs` | E-006 base comparison | Retained | — |
| `TF/probes/api-e2e-electron-spot-check.mjs` | E-008 probe | Retained | — |
| `TF/evidence/api-e2e-*` | Results JSON + screenshots | Retained | — |
| `/tmp/omsp-api-e2e/*.log`, debug scripts | Logs, build logs, mutation logs | Temporary (5.7 MB) | Not needed for delivery |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| Temporary swap of changed files to base `26b555126` (mutation checks; base comparison build) | Prove test sensitivity; separate pre-existing from new behavior | Logs above | Restored with `git checkout HEAD -- <files>`; `git status` shows only the new spec and ticket folder as changes. The packaged Electron app (sealed 09:34:18) predates every swap and was verified to contain the new code |
| In-page `applyEvent` with the context marked `live` | No live org run available offline | E-005, E-008 | Page closed / instance stopped |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Live org stream (WebSocket) | Real `AgentOrgExecutionContext.applyEvent` with a realistic `communication` event | Producing a live org requires model runs | Transport not exercised; unchanged by this ticket |
| Presentation leaves in DUR specs | Icon/Markdown/viewer stubs | jsdom | Covered by browser cases |

## Observations (Non-Blocking, Outside This Change)

- OBS-001 (separate-ticket candidate). `CollaborationMessageReferenceViewer` re-fetches the open reference whenever a live arrival re-projects rows. Its watch getter returns a new array, and the reference objects are new each projection. HEAD: 1–2 requests per arrival; base 26b555126: 2 requests (identical behavior). For a 34 MB reference this re-downloads the file on each arrival. The viewer is unchanged by this ticket.
- OBS-002. Team root, member with 241 messages: Team-tab switch 135–221 ms, vs Files-tab control 16–22 ms and base 533–958 ms (9,798 rows). The remaining cost scales with message rows. The user ruled message paging out of scope (investigation notes, Message-Count Survey). QR-001 is defined on the Org snapshot, where every switch is ≤ 91 ms.
- OBS-003 (environment). In the investigator snapshot, app-data migration `20260814_team_run_execution_tree_v1` (installed v1.4.94-beta.2 server) rewrote `team_run_history_index.json` to `[]` at the implementer's 09:22 start. It also logged `20260701_team_communication_projection_addresses … FAILED` and `20260617_raw_trace_rotation_layout … FAILED`. The index was restored from the migration's own backup in my owned copy only. Unrelated to this ticket; possibly a hand-built snapshot index format. Mentioned for awareness.
- OBS-004. QR-003 margin: Show all 3,136 measured 208–275 ms across 11 runs (Chrome and Electron), against ≤ 300 ms. All runs pass. Slower machines may approach the limit; virtualization stays deferred per design.

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | R-001, DUR-001..003, R-002, R-003, E-001..E-008 | All acceptance criteria and quality targets proven directly |
| Out Of Scope | OBS-001..OBS-004 | Pre-existing, environmental, or explicitly excluded |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Isolated desktop instance `iso-57804-dcbd` | Mine | `pnpm --silent isolated-app stop iso-57804-dcbd` | Stopped; ports released |
| Backend PIDs 88153/88155 (first), 71073 (restart) on 29811 | Mine | kill | Ports free |
| Static servers on 29812 (88154/88156, 43626/45366, 51910, 83814, 56803, 85171) | Mine | kill | Ports free |
| `/tmp/omsp-api-e2e/{data,electron-root,web-head,web-base,home}` | Mine | Removed | Done |
| `autobyteus-web/dist/public` (untracked build output) | Shared build output | Restored to the HEAD (`88bd41620`) web build after the base comparison build | Verified contains the lazy getter |
| `autobyteus-web/electron-dist/`, `autobyteus-application-backend-sdk/dist/` (untracked) | Build outputs from `build:electron:mac` | Left in place (not committed) | Delivery: do not commit |
| `/tmp/org-switch-repro` | Investigator | Not modified | — |
| Other isolated instances | Other worktrees | Untouched | — |

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required`, executed (Browser + Project Desktop Validation)
- Critical acceptance criteria lacking direct proof: None
- Next recipient: per `get_handoff_rules`
- Notes: The new durable spec is untracked and uncommitted in the worktree. The test-code review decision is `Not Required — direct low-risk route`.
