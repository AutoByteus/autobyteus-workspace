# API/E2E coverage investigation — ORG-HISTORY-LATENCY-20260917-001
Completed API-REV-002. Latest result **Pass / 97.4% validation confidence**; prior API-REV-001 Pass / 95.0% remains historical evidence only. Small/Low direct route. Current authority SR-004 / DS-REV-002 and IR-002 retains SR001/SR002, SR003/DS001 and IR001. Architecture/source reviews N/A by classification, not Pass. Full requirements/investigation/design/revisions/handoffs/bootstrap and implementation evidence read. Legacy barrier removed outright; persisted data Not Affected.

Changed surface: one frontend async loader + required existing synchronous navigation-publication method. Actual boundary is accepted HTTP history response→Pinia cached projection→mounted sidebar, not raw slices. Backend/runtime/schema/selection owners unchanged. AC001 independent families/avatar/hydration; AC002 error/empty/quiet/generation; AC003 identities/selection/inspection/reconnection/stopped nonactivation/data retention.

Discovery: web AGENTS.md, README environment/testing, ARCHITECTURE.md, package.json, vitest.config.mts; server AGENTS/README/package scripts. pnpm test:nuxt --run; production server build then --data-dir/loopback; Nuxt BACKEND_NODE_BASE_URL. Historical Python architecture prose superseded by current TS README/scripts. No user app/profile/server actions or release/Gitfinalization. Eventual origin/requirements/flat-agent-organization-model, notpersonal.

Coverage:9new WorkspaceHistoryFamilyPublication cases Still Valid: initialized real Pinia/projection/production sidebar, delayed other query/catalog/hydration, before-expansion assertions prevent masking. Existing44 history-store cases and adjacent recovery/selection/hydration/disclosure Still Valid. Controlled transport/hydration does not prove live application. Structural mock method update Still Valid. Broader three suites18fail/16errors supplied exactbase evidence; assertion validity qualified (missing intent mocks/legacy nested/rejectedstop assumptions), no source defect inferred or unrelated repair. Independently run narrow then136-scoped; broad baseline controls supplied unless discrepancies warrant rerun. No durable new duplicate needed; actual-server UI timing/fault probe appropriate, owner tests cover race matrix.

Actual plan: owned fresh server/data/HOME; synthetic authored Agent/Team/Org; create history via ordinaryUI, not fabricated runtime trees. Prior test worktree finalized/removed, runtime data unavailable; no user-profile replacement. Previously user-authorized official credentials importer only to owned test DB if needed, no secret outputs. Transparent proxy may hold real responses/return503networkfault, never fabricate successful history. Actual normal browser startup; response-ready/release versus first-observedDOM timestamps (upper bounds, not universalSLA). No fixturepage/storeinjection/API mutations as acceptance. Backend observations read-only. Test bothorders/catalogholds, active reconnect, quietfailure/recovery/selection/retention. Rare generation/empty/malformed cases owner-suite evidence, live only where normalUI exposes trigger. Electron shell unchanged: browserpreferred, no Electron/SLA claim.

Broader Required: live accepted-response→render and connection/data realism unproven. Assess seven-categoryconfidence afterrepo andUI. APIREV001 onlyafter completedresult. Preserve incoming uncommittedartifacts. Initial setup command used web cwd for ticket creation and failed before any tests/files; corrected rootcwd, no validation result inferred.

## Post-repository gate
9new and136scoped Pass; productionbackendbuild Pass. Seven scores75/75/75/95/90/50/95 =79.3%. Broader Required: actualresponse→DOM independentvisibility, runtime/data/no-start remainunproven. Currentauthored6syntheticfiles, owned51181–51183, freshDB/HOME; no borroweduserhistory. Temporaryproxy independentresponseholds/503 only, successfulbodies unchanged.

## Final investigation reconciliation
Broader Required executed against actual listening server/native provider/normal production browser. Both family orders proven before held scoped queries/catalogs; active Team resume held while Org UI ready; both quiet503 directions preserve rows/selection/draft and recover; stopped direct/mounted inspection remains Offline. Normal focused startup actual backend1ms each, response-to-first-observed groups <=172ms workspace and171ms Org (polling upper bounds). No quantitative before/after speedup or user10second diagnosis.16 retained data hashes,6 authored hashes,4 input manifest hashes unchanged;3 deliberate provider requests total, no listing starts evidenced by unchanged traces and false API activity. Final all seven scores95%, mean95.0%; critical AC001/002/003 proven across live and durable owner boundaries.

Coverage decisions unchanged: implementation's9 durable publication cases and existing generation/empty/error owners adequate; no duplicate API-owned durable test. Rare full/focused arbitration and malformed/empty permutations remain direct real-owner tests with controlledIO, not live-race claim. Optional attachment upload Not Tested because extension file permission rejected; no attachment-path production change and16 retained data invariants support bounded preservation, no attachment-specific acceptance claim. Full strict Vue unavailable; supplied broader baseline18fail/16errors retained, no global-clean claim. No reroute finding. Cleanup complete. Full evidence and route in canonical execution report/API-REV-001.

## API-REV-002 reopened coverage investigation — cold readiness recovery

### Authority and prior-result status

- SR-004 / DS-REV-002 and IR-002 reopen the same ticket after the user reported that the delivered result still missed the cold real-process outcome. Historical API-REV-001 Pass / 95.0% remains evidence for IR-001 frontend publication, failure recovery, reconnection and preservation; it is **not** evidence that IR-002 fixed the cold backend owner.
- Current worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency-reopen`; branch `codex/org-history-startup-latency-reopen`; base `d7343ea0dfe9ed0ea9fccb1d426c10bb1fa09ebd` plus the four-file uncommitted IR-002 candidate.
- Classification remains `Small / Low`; direct validation route. Architecture/source review remain `N/A — not applicable`, not implied passes.
- Legacy/compatibility: clean. The change selects the existing readiness operation; it adds no fallback, version branch, migration or data repair. Persisted-data transition remains Not Affected.

### Changed boundary

The sole production change is the first initialization of `AgentOrgRunHistoryCatalogService`: reuse the shared `RootRunPackageReadinessIndex` generation through `AgentOrgRunPackageCatalog.awaitReady()` instead of unconditionally requesting a second `rebuild()`. Startup readiness, strict Team+Org package validation, queueing, derived index/tree reads, summaries, GraphQL and the already-delivered frontend publication path remain unchanged.

| Case | Authority | Required current evidence |
| --- | --- | --- |
| R02 | AC-001–003 | Verify current four-file manifest; independently run changed server owner tests and unchanged frontend preservation scope; confirm build evidence/current output |
| B05 | AC-001 | Seed representative owned Agent/Team/Org history through the normal UI, stop the seed process, then start a fresh instrumented process. Prove exactly one readiness rebuild before listen and no second rebuild during first mixed/Org history reads |
| B06 | AC-001/003 | In the same cold process, record backend-ready/released history responses and first visible Team/AgentOrg rows through normal Chrome UI; no warm-only substitution or universal SLA |
| B07 | AC-002/003 | Expand/select/inspect retained rows; verify IDs/labels/status and inactive no-provider-start; compare authored/history hashes before/after. Carry unchanged failure/generation/reconnection evidence proportionately |
| C02 | AC-003 | Cleanup, confidence, canonical report/ledger/API-REV-002, direct-route handoff |

### Durable coverage decisions

- **Still Valid, directly changed boundary:** `agent-org-run-history-catalog-service.test.ts` distinguishes `awaitReady` from `rebuild`, concurrent initialization and readiness failure/no publication.
- **Still Valid, strict lazy control:** `root-run-package-readiness-index.test.ts` proves no-generation `awaitReady()` performs one strict shared Team+Org generation.
- **Still Valid, mixed service:** `collaboration-root-history-readiness.test.ts` proves a real first mixed history read returns both families with one rebuild.
- **Still Valid, byte-identical IR-001 frontend:** `WorkspaceHistoryFamilyPublication` and adjacent 136-test history/recovery scope continue to cover independent accepted-family projection, errors, empty results, selection and recovery.
- **Historical actual evidence remains relevant only for unchanged paths:** API-REV-001 real response ordering, quiet 503 recovery, active reconnect, stopped nonactivation and data preservation can support proportional preservation, but cannot replace B05/B06.
- **No new durable API test planned initially:** the repository now has stable owner regressions for the corrected lifecycle. The missing evidence is one fresh process plus actual browser, best represented by a temporary read-only method counter/timing observer and isolated user journey. Add durable coverage only if this run exposes a new stable gap.

### Initial reopened confidence and broader-validation decision

| Category | Initial reopened score | Gap |
| --- | ---: | --- |
| Requirements / AC proof | 75% | Source/tests support the cause; no current cold-process acceptance |
| Changed-boundary directness | 75% | Owner regression is direct but no listening server first-read observation |
| Cross-boundary realism / mock gap | 70% | No current process→GraphQL→browser evidence |
| Environment/config/identity fidelity | 90% | Exact isolated harness/fixtures exist; runtime data must be recreated normally |
| Failure/lifecycle/recovery | 90% | New readiness failures and historical live recovery covered; current no-start/integrity pending |
| User surface/browser/desktop | 55% | Warm historical browser is insufficient for cold IR-002 |
| Durable regression quality | 95% | New red/green owner tests plus preserved frontend suite |

Initial reopened confidence: **78.6%** (simple mean). Broader validation: **Required**. The selected mode is a fresh isolated backend process with a non-mutating readiness call counter plus the normal browser UI, after histories are authored through the UI in a separate seed process. User profile/server/history are excluded.

### API-REV-002 final reconciliation

- Repository evidence: the four-entry IR-002 manifest remained exact; after the documented `prepare:shared` prerequisite, the three changed server owner files passed **12/12** and the byte-identical IR-001 frontend preservation scope passed **136/136**. The first server attempt was setup-only: two files/11 tests passed while one suite could not resolve an absent generated SDK package; it was not a product failure.
- Actual data: a fresh owned SQLite/data/HOME environment on ports 51181–51183 was populated exclusively through normal Chrome journeys. One standalone Agent, one standalone Team and one AgentOrg containing a direct Agent plus a mounted Team produced three distinct real `gpt-5.4-mini` replies, then were stopped through the UI. No runtime tree or history row was manufactured through an API command.
- Cold boundary: three fresh process observations reproduced the same shape. The definitive run recorded one startup `RootRunPackageReadinessIndex.rebuild()` (8 ms, admitting one Team and one Org), two subsequent already-initialized `awaitReady()` calls for the first mixed history load, and **zero post-startup rebuilds**. Server listen was 2026-09-18T04:42:48.773Z. First workspace history returned/released in 4/5 ms and collaboration-root history in 22/22 ms.
- User surface: a normal Chrome navigation from a blank page to the retained AgentOrg route displayed `Latency Agent`, `Latency Team`, `Latency Org`, all three exact retained replies and stopped hierarchy within a **6,188 ms accessibility-observation upper bound**. This is not paint timing or a universal SLA. Direct and mounted members, the standalone Team lead and standalone Agent all rendered Offline with their original IDs and selection/navigation remained usable.
- Safety/preservation: the cold listing/inspection process emitted **zero provider metadata calls**. All 22 compared authored/history/tree/context/trace/message/task files were byte-identical before versus after. Historical API-REV-001 live failure/reconnection evidence and current direct owner failure/generation tests remain applicable because IR-002 changed only the cold catalog readiness call.
- API/E2E-owned durable coverage: none added, updated or removed. `cold-observer.mjs` and `launch-cold.py` are temporary validation harnesses, not production or durable suite changes.
- Cleanup: owned browser tab closed, exact owned processes stopped, ports 51181–51183 closed, and the two intake-absent generated SDK `dist` directories removed. Isolated evidence data was retained; user profile/server/data and Git finalization were untouched.

Final scorecard (simple mean): requirements/AC **98%**; changed-boundary directness **100%**; cross-boundary realism **98%**; environment/config/identity fidelity **98%**; failure/lifecycle/recovery **95%**; user-surface/browser **95%**; durable regression quality **98%**. Overall **97.4%**. Broader validation was Required and completed. Residuals are bounded to representative rather than production-scale history volume, AX-observation rather than paint timing, no Electron-shell claim, and current failure injection remaining in direct owner tests plus unchanged historical live recovery. No critical AC is missing or failing.
