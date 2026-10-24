# API/E2E execution coverage report — nfs-guide-install-commands

## API-REV-002 — Pass, 95.71%
**autobyteus-254 / project_task_647690a1-0e1b-4564-9aed-a5b5bf0875e3**. Reopened R2/SR003 Approved, SR004 Ready, IR002. Source/tests/scoped docs **3d95a5c4a16759060983489735e77820661cff53**, tested HEAD **4e308b716cf70ed5bc914ab780984e59df30af7f**; no non-ticket delta between them. Worktree **/Users/normy/autobyteus_org/autobyteus-worktrees/nfs-guide-install-commands-r2**, branch **codex/nfs-guide-install-commands-r2**. Finalization **origin/personal; NO release**.

Plan/upstream inventory: api-e2e-coverage-investigation.md. History: api-e2e-revision-record.md. Append-only progress: api-e2e-test-progress.md. Evidence folder **/Users/normy/autobyteus_org/autobyteus-worktrees/nfs-guide-install-commands-r2/tickets/in-progress/nfs-guide-install-commands/evidence**. The earlier API001 Pass96.43 is historical exact-input proof, not this revision's acceptance. New case evidence is suffixed `-02`; old evidence/history unchanged.

## Classification / impact
- **Small / Low / Direct Low-Risk**. Architecture/source review N/A—not selected. Test review **Not Required — direct low-risk route**. Successful-output route Delivery, using fresh rules after evidence commit.
- API product or durable-test edits: **None**. IR002's focused two-locale regression already covers the intended removal/partial version. A ticket-owned temporary current-page driver supplies composition/real clipboard/visual evidence, not a new test framework.
- API001 source2c6b414→current HEAD:2062 paths, including shared core/contracts, so old API cases are **Rerun**, not blindly carried. IMP08 recorded2010 paths at earlier input1103c5f9; later count includes current ticket additions. Scope remains renderer-only.
- R01 is current replacement evidence: IMP10/11 ran on3d95a5c4; diff to current exercised inputs is empty, so reuse rather than repeat for independence. R02/R03/C01 personally executed against current source. Five approved source changes only vs1103c5f9; helper/parent/Docker bytes preserved.

## Tested environments / setup
| Env | Commit / execution | Boundary and limits |
|---|---|---|
|I|Attributed IMP10/IMP11 on3d95a5c4, macOSarm64 Node22.23.1, Nuxt/Vitest3.2.7, privateHOME/TMP; current frozen filtered install/Nuxt prepare from IMP08|54tests/5files, focused helper typecheck/3guards; component browser negative-state proof. No repeated suites, no live installer|
|B|Current Nuxt dev on4e308b7, Node22.23.1, actual Chrome156.0.8078.47; fresh privateHOME/TMP/browsercontext, localhost51928; en/zh-CN ×1280/390|Actual /settings language selector and /nodes Manage→Docker→NFS, real catalogs/helper/router/clipboard. Final run explicitly chromiumSandbox=true and root launch argv checked for absence of --no-sandbox. Unrelated app read APIs/feeds emulated; not backend/Electron acceptance|
|C|Own process-group/port/root inspection, Git source/history check|No user's app/browser/data/containers touched. Current generated Nuxt outputs/dependencies retained, no stale server dist used|

Root TESTING.md and web AGENTS/ARCHITECTURE/README/package/Vitest/Nuxt config govern this renderer/browser layer. One frontend dev server at a time. Each attempt has fresh owned environment; no inherited AUTOBYTEUS roots, credentials or model providers. Actual page is **Nodes → NFS Guide**, Settings used only for language. No requirement for full product/Electron-shell journey in this unchanged-shell copy-only revision.

## Cases (the validation ledger)
Evidence names below relative to `evidence/`; each raw result has identity/environment/command/date. Four cases complete, no skipped in-scope case.

| ID | Criteria/scenario | Command or steps | Env | Result | Evidence / look for / limits |
|---|---|---|---|---|---|
|R01|AC001–006;SCN001–005|`python3 tickets/in-progress/nfs-guide-install-commands/evidence/R01-02-reuse.py`; inspect current IMP10/11 and diff since tested commit|I|**Pass — Reused**|`R01-02-reuse.json`, `R01-02-reused-excerpts.log`; `Test Files  5 passed (5)`, `Tests  54 passed (54)`, all5 commands exit0. Exact commands/full logs/env in implementation-handoff Checks Run IMP10. Component13/helper24/parent10/Docker7 includes6 inert shell controls (not additional unique tests). IMP11-verified/result.json+driver: partial version preserved, null version hidden, zero events. No new product test invocation|
|R02|AC001/002/003/005/006;SCN001/002/005|`node tickets/in-progress/nfs-guide-install-commands/evidence/R02-02-browser.mjs R02-02-attempt-2`; real locale settings→actual /nodes Manage→Docker→keyboard End→NFS; four locale/width combinations|B|**Pass**|`R02-02-summary.json`, `R02-02-attempt-2/result.json`, four text snapshots and12 view screenshots;9 independent expected commands ×4 =36 exact actual clipboard checks, exactly1safe advanced README, removed labels absent, review reminder/version present, installGap17 in every view,9unique aria names/polite status, selected tab/panel labels and no horizontal document overflow. Docker copied before and strings unchanged after each locale. `R02-02-visual-review.md` records actual inspected images|
|R03|AC003;SCN003|Same browser current page: Enter Copy→actual nativeclipboard→2s reset; controlled pending write, second excluded, leave tab→late resolve→return; denial/missing/manual selection|B|**Pass**|`R02-02-summary.json` clipboardEdgeCases; raw result R03: timerReset/pendingAll9Disabled/secondRequestExcluded/unmountLateResolve/denialManualSelection/missingClipboard alltrue. One additional realNFS keyboardcopy,2Docker copies inR02. `R02-02-attempt-2/denied.png`. Final errors=[] and no NFS asset requests; controlled permission errors are deliberately emulated|
|C01|AC005/safety|`python3 tickets/in-progress/nfs-guide-install-commands/evidence/C01-02-cleanup.py`; only own process groups/ports/roots, source/prior history/other-owner preservation|C|**Pass**|`C01-02-cleanup.json`: both attempts' groupsAbsent alltrue, portClosed/rootAbsent/browserClosed true, sourceDiff empty, oldHistoryPrefixUnchanged/otherTrackedOwnerFilesUnchanged true. Owned Chrome cleanup assistance disclosed below; no product fixture page created|

### Attempts / causal diagnosis
- **R02-02-attempt-1 remains Fail**, not acceptance: all four guide views reached, then browser-error guard rejected missing fixture boundaries on current Manage Nodes. New nodeListStore reads GetRemoteCollaborationSettings (`peerNodes`), GetRemoteCollaborationCapability and GET /rest/remote-access/status. The historical fixture supplied neither remote-collaboration query nor status; Apollo errors and an unsafe-port error came from the deliberately inert port1 URL. Actual query/request bodies, failure image/body, original driver and result retained.
- Read current nodeListStore, capability store, nodeIdentityProbe, GraphQL/types; supply empty peers, disabled capability and synthetic valid node identity. Backend fixture base becomes owned frontend origin, no live backend connection. Unknown operations/browser errors still fail. Corrected attempt2 passed **zero browser errors**. No product edit, no error suppression; R01's passing suite not repeated. R03 only executed on attempt2.
- Browser close on attempt1 waited for an orphaned owned network helper; exact recorded PID/profile/group was verified then SIGTERM'd (`cleanup-assist.json`). Observed Playwright's implicit no-sandbox default on this failed attempt; authoritative attempt2 explicitly enables Chromium sandbox and checks actual launch argv. No host policy/security setting changed. Attempt2 close needed its bounded owned browser-group SIGTERM; actual final absence verified, not assumed from close().
- `R02-02-attempt-note.json` holds diagnosis and correction. These are API harness failures, not an established implementation defect or an erased passing-first-attempt claim. Earlier implementation failed preview/typename attempts remain in IMP11 evidence with their original limits.

## Acceptance-criteria proof
All six are critical in this bounded UI scope. No Only The User Can Check designation or missing in-scope evidence.

| Criterion | Cases | Result and proof |
|---|---|---|
|AC001|R01/R02|**Proven**: unchanged two fixed v0.1.0 URL/checksum/OS-specific chains ending version; independently expected displayed and actualclipboard bytes in4views; valid release notice. Six inert shell tests show download/checksum failure prevents stub invocation. No actual installer executed or current download availability re-qualified|
|AC002|R01/R02|**Proven**:7installed commands/menu and explicit ~/.local/bin path, create-once/connect-other-host order, prerequisite/admin/drain/wait prose; advanced README exact URL/target_blank/relnoopener noreferrer retained|
|AC003|R01/R02/R03|**Proven**:9unique Copy controls,36exactclipboard comparisons+Enter, success only after fulfillment/reset, pending guard, component tab unmount/late completion, denied/missing/manualselection; no NFS request or execution. Clipboard negatives deliberate boundary emulation|
|AC004|R01/R02|**Proven**: current13component/24helper cases cover invalid/null/partial and both locales; current IMP11 actual component confirms partial Macenabled/Linuxdisabled/versionpreserved and nullbothdisabled/versionhidden. No standalone link in any state. Parent10/Docker7 plus current actual Docker copy/beforeafter preserved|
|AC005|R01/R02/R03/C01|**Proven**:actual en/zh ×1280/390, selectable locallyscrolling code, unique accessible names/politefeedback/keyboard tab+Enter, documentwidth≤viewport; host/trust/outage/deferred text in snapshots and screenshots. No field proof conflated, no unrelated resources changed|
|AC006|R01/R02|**Proven**:both removed labels and anchors absent in bothlocales/all descriptor states; exactly advancedREADME, reviewreminder names URL incommand, measured17px existing padding/border only afterinstallgrid inall4views. Desktop visual flow directly proceeds to roles; no reservedlinkcontainer. Current IR002 regression fails oldshape2/2 and passes current54suite|

## Confidence / broader validation
Simple mean of seven applicable categories; scope is copy-only renderer, not storage/installer or full product qualification.

| Category | Post-repository | Final | Evidence and residual limitation |
|---|---:|---:|---|
|Requirement/AC proof|90|95|R01+R02 prove all6 directly at relevant boundary; fixed contract, not refreshed remoteasset availability|
|Changed-boundary execution directness|85|100|R02 actual current Nodes parent/router/locales/template/browserclipboard and exact remnant anchor/version/layout|
|Cross-boundary realism/mock gap|75|95|Real browser clipboard/navigation, unrelated read services/feeds emulated; no changed guide behavior requires real backend|
|Environment/configuration/identity|95|95|Exact current source/current prepareddeps, isolated sandboxedChrome/profiles, no stale backendoutput; synthetic surrounding node identity explicit|
|Failure/edge/lifecycle/recovery|95|95|Current durable null/invalid/partial and shellfailclosed controls plus current tabpending/unmount/denial/missing. Actual OS permission dialog not forced|
|User surface/browser (shell N/A)|75|95|Four actualpage views/semantics/keyboard/realcopy and inspected screenshots. Not exhaustive assistive-tech certification or packagedElectron|
|Durable regression relevance|95|95|Current54tests valid, two targeted locale/state regressions sensitive to oldshape. Temporary composition probe complements—not replaces—durablecoverage|

Post-repository610/7=**87.14%**. Final670/7=**95.71%**, minimum95. All critical ACs proven; no material unresolved in-scope risk. **Broader validation Required → executed Browser** to close actual page/layout/clipboard gap. No deeper product-shell/storage run would add relevant removal evidence; no new user check or dependency request.

## Safety, emulation, transition and cleanup
- Emulated only unrelated read initialization: notifications/update automation, providercatalog/credentials, applications capability, workspace/history/root lists, Agent/Team/Org definitions; current remote peers/capability/identity, health and two invalidation feeds. Exact operations in summary/raw requests. No mutation, credentials, live data or NFS operation. Public icon assets may load normally; NFS download/release URLs never requested.
- Controlled clipboard Promise/reject/absence only for R03; happy paths use actual Chrome. No command pasted into terminal, no host install/CLI/version invocation/mount/export/Docker creation or field test.
- Persisted-data transition **Not Affected**. Own browser preferences/profile removed. No migration/compatibility fallback/hidden legacy label or anchor; retained helper downloadUrl is live validation, not dead UI compatibility.
- Current repository durable coverage paths unchanged by API; implementation changed only `autobyteus-web/components/settings/__tests__/NfsGuideCard.spec.ts` for this request. Temporary driver and evidence only; no production diagnostics left.
- Both Chrome/Nuxt process groups, localhost51842/51928 and ownedHOME/TMP roots absent. Ignored node_modules/.nuxt retained in this worktree. Canonical dirtycheckout/PMboards/NFSrepo/liveapp/old detached receipt6d90a825 untouched. Prior other-owner artifacts preserved; no cleanup outside owned resources.

## Latest result / downstream
**Pass95.71%**. No new product finding/blocker/follow-up. Direct successful Delivery route; **Not Required — direct low-risk test review**. No Code Reviewer/Designer/Implementation duplicate dispatch. Delivery verifies evidence, fresh origin/personal integration and any impacted checks, scoped docs/finalization/owned cleanup. **NO release**, tag, deployment or mandatory user verification; existing autobyteus-nfs-4 deferred field custody stays separate. Original API001 docs-intro note is already corrected in current source; not a new outstanding item. No API merge/push/TaskDone/Terminal claim.
