# Markdown Preview Relative Images — API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/tickets/in-progress/markdown-preview-relative-images/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/tickets/in-progress/markdown-preview-relative-images/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/tickets/in-progress/markdown-preview-relative-images/design-spec.md`
- Supplemental Solution Artifacts: `None`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/tickets/in-progress/markdown-preview-relative-images/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/tickets/in-progress/markdown-preview-relative-images/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/tickets/in-progress/markdown-preview-relative-images/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/tickets/in-progress/markdown-preview-relative-images/api-e2e-coverage-investigation.md`
- Current Execution Round: `2`
- Trigger: proportional test-code review failure `TR-MPRI-001` for persisted workspace-registry leakage in REST E2E cleanup.
- Prior Round Reviewed: `Yes — Round 1 API/E2E pass and proportional test-review report`
- Latest Authoritative Round: `Round 2`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | source/architecture review pass | N/A | no implementation failure; proportional review later found `TR-MPRI-001` in durable REST-test cleanup | Pass, then test-review Fail | No | durable REST/API and lifecycle coverage added; real Chromium journeys passed |
| 2 | `TR-MPRI-001` local test-cleanup fix | Yes — retained registry records inspected and removed | None | Pass | Yes | supported registry removal added; 3/3 rerun; registry count/hash verified stable |

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`; the unavailable in-app browser runtime was replaced by standalone Playwright Core controlling installed Google Chrome after the mandated browser bootstrap check returned no available browser. The selected real-Chromium evidence surface remained unchanged.
- Existing coverage decisions revised during execution: `Yes`; four `ArtifactContentViewer` assertions expected the old exact `{ cache }` request-init shape. The approved canonical authorization transport now materializes a `Headers` snapshot even without a credential. Those assertions were updated without changing product source, and the 17-test file passed.
- Reroute required before or during execution: `No`; Round 2 was a bounded API/E2E-owned local fix.
- Notes: unrelated repository-wide test/typecheck/environment baselines were preserved and classified separately; none was used to claim a pass. Browser/API behavior did not require repetition because Round 2 changed test cleanup only.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

## Changed Boundary And Evidence Matrix

| Scenario ID | Requirement / Acceptance-Criteria IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| `MPRI-API-001` | REQ-003; AC-003, AC-004 | encoded workspace image path, MIME, bytes through real `FileSystemWorkspace` | Fastify inject + real manager/temp filesystem | Durable | Pass | Round 2: `evidence/server-rest-e2e-round2.log` |
| `MPRI-API-002` | REQ-009; AC-006 | same-prefix sibling traversal rejection through REST authority | Fastify inject + real `FileSystemWorkspace` | Durable | Pass | same log |
| `MPRI-API-003` | REQ-009; AC-006 | absolute candidate rejection through REST authority | Fastify inject + real `FileSystemWorkspace` | Durable | Pass | same log |
| `MPRI-TEST-001` | shared transport neutrality | existing artifact fetch tests after canonical `Headers` snapshot | Nuxt/Vitest | Durable | Pass | `evidence/artifact-content-viewer-rerun.log` |
| `MPRI-TEST-002` | REQ-008; AC-010; DS-004 | credential A→null in flight, unchanged source, stale completion | Nuxt/Vitest | Durable | Pass | `evidence/credential-lifecycle-rerun.log` |
| `MPRI-BROWSER-001` | REQ-001–003, 005–006, 010–011; AC-001–003, 007–008 | sibling/nested/parent/space/encoded path, missing, blocked, SVG fragment, HTTP/data rendering | Chrome 150 + actual Vue resolver/renderer + live loopback resources | Browser/Live | Pass | `evidence/chromium-results.json`, screenshot |
| `MPRI-BROWSER-002` | REQ-004, 008; AC-005, 010 | no initial managed `src` or unauthenticated request | Chrome network/DOM with delayed credential-A response | Browser/Live | Pass | one early request, `Bearer credential-a`, no pre-resolution `src` |
| `MPRI-BROWSER-003` | REQ-004, 008; AC-005, 010 | null→credential A with unchanged managed identity | Chrome/Vue/store/live HTTP | Browser/Live | Pass | credential-A blob decoded at width 4 |
| `MPRI-BROWSER-004` | REQ-008; AC-010 | A→B while A is in flight; B wins; stale A never rebinds | Chrome/Vue/store/live delayed HTTP | Browser/Live | Pass | A and B request log; final B SVG 7×5 after A completion |
| `MPRI-BROWSER-005` | REQ-008; AC-010 | credential removal with unchanged source | Chrome/Vue/store/live HTTP | Browser/Live | Pass | B→null direct reload, one blob revoke; explicit A→null additionally proven by `MPRI-TEST-002` |
| `MPRI-BROWSER-006` | REQ-003, 008; AC-004, 010 | pending node/workspace/document switches and cleanup | Chrome; 127.0.0.1→localhost, ws-a→ws-b, docs→other | Browser/Live | Pass | final response `localhost/ws-b/other/assets/switch.svg`, 11×6; older completions did not rebind |
| `MPRI-BROWSER-007` | REQ-005, 007, 011; AC-008–009 | generic Markdown neutrality | Chrome actual generic renderer without resolver | Browser/Live | Pass | raw `src="generic-relative.png"`; no workspace request |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | focused 12-file Nuxt suite | worktree root | changed frontend owners | Pass — 12 files/64 tests | `evidence/frontend-focused.log` |
| 2 | focused six-file server suite | worktree root | changed backend/API owners | Pass — 6 files/26 tests | `evidence/server-affected.log` |
| 3 | full Nuxt suite | `autobyteus-web` | broad frontend regression | Baseline/stale classified — 348 files/1827 tests passed; 4 stale artifact assertions corrected and focused rerun passed; 4 unchanged unrelated assertions remain failing; one shared Electron installation suite unavailable | `evidence/frontend-full.log`, `frontend-baseline-failures-focused.log` |
| 4 | all server file-explorer E2E files | `autobyteus-server-ts` | broader explorer regression | Baseline environment classified — 4 files/11 tests passed; 2 websocket lifecycle tests could not find the pre-generated watcher runtime | `evidence/server-file-explorer-e2e.log` |
| 5 | web/server typecheck | respective packages | regression comparison | documented baseline failures, not regressions | `evidence/typecheck-web.log`, `typecheck-server.log` |
| 6 | web/localization guards + `git diff --check` | worktree | boundary and patch hygiene | Pass | `evidence/guards.log`; final `git diff --check` also passed after durable edits |
| 7 | temporary supported cleanup probe, then focused REST E2E rerun | `autobyteus-server-ts` | `TR-MPRI-001`; MPRI-API-001–003 | Pass | `evidence/registry-cleanup-round2.log`: 9 task-test records removed through manager lifecycle; `evidence/server-rest-e2e-round2.log`: 3/3; `evidence/registry-isolation-round2.txt`: 0 matching before/after and identical hash |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 94% | 98% | +4 | every critical criterion maps to passing durable or Chrome scenario | only negligible packaged-shell uncertainty |
| Changed-boundary execution directness | 93% | 98% | +5 | real REST authority and actual Vue/DOM/fetch/blob code executed | none material |
| Cross-boundary integration realism and mock gap | 90% | 96% | +6 | Chrome + live HTTP headers/timing/bytes plus real REST workspace | local HTTP fixture substitutes for physical paired phone |
| Environment, configuration, identity, and fixture fidelity | 92% | 95% | +3 | two loopback hosts, workspace/document identities, deterministic bearer A/B and real Chrome | no physical device/account/full app bootstrap |
| Failure, edge-case, lifecycle, and recovery evidence | 94% | 98% | +4 | missing/blocked, A→B stale completion, A/B→null, context switches, 3/3 blob cleanup | none material |
| User-surface, browser, and desktop-shell confidence | 82% | 96% | +14 | Chrome 150 decoded PNG/SVG/data/blob/direct images and preserved document/alt states | packaged Electron `file:` origin not separately launched; no shell code changed |
| Durable regression coverage quality and relevance | 96% | 97% | +1 | new real REST security E2E, explicit A→null lifecycle, stale assertions updated narrowly | proportional code review pending |

- Overall post-repository confidence: `92%`
- Overall final confidence: `97%` (678/7 = 96.86%, rounded)
- Calculation method: simple average of seven applicable category scores.
- Confidence change produced by broader validation: `+5 percentage points`; browser category increased from 82% to 96%.
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below 90%: `No`
- Default final confidence target of 95% met: `Yes`
- Confidence-limiting residual risks: physical Phone Access pairing and packaged Electron shell were not run; both are bounded because actual credential/store/fetch/blob renderer code ran in Chrome and no shell-specific code changed. Symlink/canonical-filesystem containment remains intentionally outside scope.

## Broader Validation Decision And Execution

- Decision and selected execution mode: `Required — real browser plus live local HTTP fixture`
- Round 2 repetition decision: `Not Required`; the only change was server-test teardown/registry cleanup, and the affected focused REST E2E plus registry isolation were rerun directly.
- Material deviation: in-app Browser discovery returned no available runtime, so installed Google Chrome was driven headlessly through standalone Playwright Core. This still provided the selected real Chromium surface.
- Confidence gap actually addressed: image decoding, sanitized DOM binding, no initial managed `src`, authenticated request timing, stale generation suppression, direct/blob transitions, context switches, and generic neutrality.
- Startup/readiness: a temporary Vite server on `0.0.0.0:43127` transformed actual worktree Vue/TS modules and served deterministic PNG/SVG/protected endpoints; HTTP navigation returned 200 before scenarios ran.
- Environment: isolated loopback only; `127.0.0.1` and `localhost` represented distinct bound nodes with CORS-enabled protected endpoints; no existing desktop process was touched.
- Seed data/identities: deterministic Markdown matrix, 1×1 PNG, dimension-coded SVGs, bearer `credential-a`/`credential-b`, ws-a/ws-b, docs/other document paths.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Relative rendering matrix | valid sources decode; blocked has no `src`; missing stays local; text remains | sibling/nested/parent/encoded PNGs 1×1, fragment SVG 4×3, direct/data decoded, missing 0 width, blocked no `src`, heading visible | `chromium-results.json` / `chromium-validation.png` | Pass |
| Initial credential A | no direct image request or `src`; authorized fetch only | exactly one early request with `Bearer credential-a`; image had no `src` until blob decode | same JSON | Pass |
| A→B in flight | B result wins and A completion is stale | A and B requests observed; final 7×5 B image unchanged after delayed A returned | same JSON | Pass |
| credential removal | blob cleared/revoked and unchanged source reclassified | direct URL rebound; one revoke; unauthenticated direct request; explicit A→null test also passed | JSON + credential lifecycle log | Pass |
| node/workspace/document switches | no old endpoint/workspace/path result survives | four requests reflected transitions; final `localhost/ws-b/other/...` 11×6 result remained after old responses | JSON | Pass |
| generic renderer | raw relative source remains browser-owned; no workspace inference | raw `generic-relative.png`, one generic request, zero workspace requests | JSON | Pass |

Expected console evidence contained one 404 resource error for the deliberate missing image and no page/runtime errors.

## Desktop Application Validation

- Validation approach: real Chrome for the web-equivalent Electron renderer; no actual Electron launch.
- Browser-tested behavior: full changed frontend rendering/credential/context surface.
- Shell-specific or lifecycle behavior: none changed; existing Electron tests are not evidence for this task and the shared Electron install baseline was unavailable.
- Effect on any already-running desktop application: `None`
- Behavior not directly proven and consequence: packaged `file:` origin not run; absolute workspace REST URLs and no changed IPC/preload logic reduce this to negligible residual uncertainty.

## Platform / Runtime Targets

- Operating system / platform: macOS (Darwin host; browser UA reports Macintosh)
- Runtime/framework: pnpm 10.28.2; Nuxt/Vitest versions from repository lock/install; Vite 7.3.1 temporary transform surface.
- Browser / engine: Google Chrome `150.0.7871.115` / Chromium 150, headless.
- Viewport: 1440×1200; locale/timezone were not material to image behavior.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data exercised: ordinary Markdown text and PNG/SVG assets represented as read-only deterministic fixtures.
- Result: rendered without any write path; `git status` after cleanup contains only intended durable tests/reports/evidence.
- Migration completion/recovery evidence: `N/A`
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: `None material`

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts` | Added, then cleanup-corrected in Round 2 | real REST + `FileSystemWorkspace`, encoded image, sibling/absolute rejection, deterministic registry isolation | Pass, 3/3 in Round 2 | `afterEach` now removes each created workspace through `WorkspaceManager.removeRegisteredWorkspace` before deleting its temp root |
| `autobyteus-web/composables/__tests__/useAuthorizedObjectUrl.spec.ts` | Updated | explicit A→null in-flight unchanged-source lifecycle | Pass, 2/2 file | complements browser B→null evidence |
| `autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts` | Updated | valid canonical `Headers` request-init shape | Pass, 17/17 file | stale exact call-shape assertion only |

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/autobyteus-web/composables/__tests__/useAuthorizedObjectUrl.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts`
- Paths removed: `None`
- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: `N/A`

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `tickets/in-progress/markdown-preview-relative-images/evidence/chromium-results.json` | semantic DOM/network/lifecycle result | Retained | authoritative browser result |
| `.../evidence/chromium-validation.png` | screenshot support | Retained | results page |
| `.../evidence/chromium-console.json` | browser console | Retained | only expected missing-image 404 |
| `.../evidence/*.log` | repository commands/baseline evidence | Retained | exact command outputs |
| `.../evidence/registry-before-cleanup-round2.json` | retained leak evidence | Retained | 9 matching records created by the REST test before correction |
| `.../evidence/registry-cleanup-round2.log` | supported cleanup execution | Retained | manager lifecycle removed all 9 matching records |
| `.../evidence/registry-isolation-round2.txt` | before/after count and hash | Retained | zero matching records before and after focused rerun; identical registry SHA-256 |
| `.../evidence/server-rest-e2e-round2.log` | focused Round 2 rerun | Retained | 3/3 pass with corrected cleanup |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `.local/mpri-browser-harness` Vite/HTTP fixture | repository has no durable browser runner; actual Vue modules and Chrome were required | all 7 browser scenario groups passed | directory removed |
| temporary worktree `node_modules` symlinks | assigned worktree intentionally had no install; reused primary checkout install as implementation did | repository/browser commands executed | all created links removed |
| loopback Vite process on 43127 | live HTTP/browser timing | passed | stopped; no listener remains |
| headless Chrome context | real Chromium evidence | passed | context/browser closed |
| temporary `mpri-registry-cleanup.test.ts` | remove records leaked by earlier task-test runs through the supported manager lifecycle | 9 entries removed, zero matching remained | file removed immediately after execution |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Physical Phone Access node/device | deterministic live HTTP endpoints with actual bearer/store/fetch/blob frontend code | no device/account required for changed transaction semantics | bounded; pairing UI itself not retested |
| Workspace image asset set in browser | deterministic PNG/SVG/missing responses | reproducible decode/dimension/timing assertions | none material |

## Prior Failure Resolution Check

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `TR-MPRI-001` — REST E2E closed workspaces and deleted only private active-map state, leaving persisted registry entries | Local Fix / `api_e2e_engineer` | Resolved | `registry-cleanup-round2.log`; `server-rest-e2e-round2.log`; `registry-isolation-round2.txt` | 9 prior matching records removed via supported manager lifecycle; corrected 3/3 rerun left zero matching records and unchanged registry hash |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | `MPRI-API-001`–`003`, `MPRI-TEST-001`–`002`, `MPRI-BROWSER-001`–`007` | all critical API, security, rendering, credential, stale-binding, cleanup, and neutrality scenarios passed |
| Out Of Scope | symlink canonical containment, physical pairing UI, packaged Electron shell | explicitly bounded by reviewed scope or unchanged boundary |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Vite server port 43127 | validation-owned | Ctrl-C and listener check | cleaned |
| headless Chrome | validation-owned | context/browser close | cleaned |
| temporary Vite harness | validation-owned | recursive removal | cleaned |
| dependency links | validation-owned | removed each recorded symlink | cleaned |
| browser blob URLs | application under test | lifecycle invalidation/unmount | 3 created / 3 revoked |
| temp workspace roots | server tests | test hooks close/remove | cleaned |
| persisted REST-test workspace registry records | validation-owned | removed 9 prior records through `WorkspaceManager.removeRegisteredWorkspace`; corrected hook uses same lifecycle | cleaned; zero matching records before/after rerun |

## Classification

`Pass`. `TR-MPRI-001` is resolved. No implementation, requirement, or design failure was found. The corrected durable REST test requires proportional review Round 2.

## Recommended Recipient

`code_reviewer` for proportional review of the three changed durable test files.

## Evidence / Notes

- The full Nuxt and broader file-explorer commands are not presented as clean passes. Their remaining failures are preserved in logs and are unrelated unchanged assertions or missing shared/generated runtime dependencies.
- Web typecheck reproduced 229 documented baseline errors; the only changed-owner hits are pre-existing implicit-any lines in `fileExplorerContentActions.ts`. Server typecheck reproduced the documented TS6059 configuration baseline.
- The reviewed lexical-only containment policy is preserved; no symlink/canonical-filesystem claim is made.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: `97%`
- Default 95% confidence target met: `Yes`
- Any final applicable confidence category below 90%: `No`
- Broader validation decision: `Required and completed — real Chrome + live HTTP`
- Critical acceptance criteria lacking direct proof: `None`
- Required next recipient: `code_reviewer` for proportional test-code review
- Notes: all critical acceptance criteria are directly proven within the reviewed lexical-only scope; `TR-MPRI-001` is resolved with supported lifecycle cleanup and stable registry evidence.
