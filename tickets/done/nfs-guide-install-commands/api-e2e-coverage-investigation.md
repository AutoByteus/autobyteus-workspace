# API/E2E coverage investigation — R3 compact guide
## API-REV-003 plan (before execution)
Task **autobyteus-254 / project_task_647690a1-0e1b-4564-9aed-a5b5bf0875e3**. Trigger IR003 reopening, **R3/SR005 Approved; SR006 Ready; Small/Low Direct Low-Risk**. Architecture/source review N/A—not selected. Worktree **/Users/normy/autobyteus_org/autobyteus-worktrees/nfs-guide-install-commands-r3**, branch codex/nfs-guide-install-commands-r3; source/tests/docs **1f2b346cfb164d0b0a7fe2534d1fec8d81fbc708**, input **ccc0c56d2d4fdf48815a19d73870798dcd8fadb9**, finalization origin/personal, **NO RELEASE**.

## Upstream authority / history
Read implementation-handoff.md Checks Run first (IMP14–19), implementation-revision-record.md IR003; current requirements-doc.md, design-spec.md DS001/002, investigation-notes.md INV11–17 and screenshot supplement inventory, solution-revision-record.md SR005/006, solution-design-handoff.md. No independent review applies. Historical API002 investigation/Cases/95.71% report, API revision history and append-only progress read before updating current plan/report. No prior product failure requires reopening; this is approved presentation rework. No Delivery re-entry. User screenshots are factual scope context, not a separate design authority.

## Changed behavior / scenarios / surfaces
- BEH006/REQ008/AC007: advanced README anchor and long footer removed. One unboxed folder tip plus compact amber trusted-private-network/unencrypted/no-internet/outage note; ≤60 English words, equivalent concise Chinese; no trailing/internal validation prose or empty gap.
- BEH001/002/003/004/005; AC001–006: preserve pinned v0.1.0 helper/validation, nine displayed/copied commands/order, actual Copy lifecycle, intended-host and admin/drain guidance, version/partial/null/invalid states and prior R2-link absence. Detailed removed facts retained in docs/nfs_guide.md. Adjacent Docker unchanged.
- SCN001–006 supported, all mapped below. No added contrived scenario. SCNX01 installer/CLI/mount/host execution explicitly unsupported for this copy-only task and will not run.
- Affected boundaries: frontend template/localized content, actual Nodes renderer/tab integration and responsive presentation. Preserved browser clipboard promise and component lifetime. Unaffected: backend/API/authentication, Electron shell/IPC, host lifecycle, persistence, workers/distributed/provider/NFS integration.
- Design health/removal checks clean: literal obsolete locale consumers deleted, no compatibility wrapper/hidden full disclaimer. Helper downloadUrl is live validation, not dead UI. Persisted data **Not Affected**, no migration or reset.

## Impact and durable coverage decisions
Prior API002 last tested 4e308b716cf70ed5bc914ab780984e59df30af7f; changed shared foundation/lockfile requires current replacement proof, not old passes. Exact current IMP16/17 tested 1f2b346cfb164d0b0a7fe2534d1fec8d81fbc708; diff to intake has no product changes. Reuse those checks after raw-log/identity inspection; do not rerun for independent credit. Current repository/browser harness compiles worktree source, no old backend/dist.

| Path/coverage | Decision and action | ACs |
|---|---|---|
|web/utils/__tests__/nfsLauncherCommands.spec.ts|Still Valid;24 independent literal/validation tests including6 inert shell controls. Reuse current IMP16, never execute public installer|001/004|
|web/components/settings/__tests__/NfsGuideCard.spec.ts|Still Valid after IR003 update;15 tests covering noanchors/concise bothlocales, all descriptor states, Copy lifecycle. IMP15 expected4red proves oldshape sensitivity. Reuse IMP16|001–007|
|NodeManager.spec.ts; DockerNodeStartGuideCard.spec.ts; dockerNodeLauncherCommands.spec.ts|Still Valid;10 parent+7 Docker controls on current integrated foundation, reuse IMP16|002/004|
|IMP17 current component preview|Still Valid exact current source for partial/null/invalid version and controlled lifecycle; component-only limits retained. Inspect split original/final results, not full Nodes proof|003/004/007|
|Prior API002 R02/R03|Rerun current Nodes; prior advanced-anchor/deferred-text expectations are Stale under AC007. Create new owned driver, never rewrite historical evidence|001–007|

No API durable coverage addition/update/removal needed: current focused regression is adequate. Temporary journey needed for current composition/layout/native clipboard, not new framework. Source path shorthand web=autobyteus-web.

## Execution discovery / isolation
Applicable authorities: root AGENTS/DESIGN/TESTING, web AGENTS/ARCHITECTURE Testing Strategy/README Testing, package.json/vitest.config.mts/nuxt.config.ts, current tests/e2e conventions and prior owned page probe. No closer TESTING, no conflicting instruction. Project permits renderer-only browser probe with explicit read fixtures; full Electron product/storage claims are not in scope.
- IMP14/15 current frozen filtered install + Nuxt prepare; reuse task-owned node_modules/.nuxt only, current source livecompiled. No server build/prebuild needed when backend is explicitly emulated. No secrets needed.
- One owned `pnpm exec nuxt dev --host 127.0.0.1 --port <free>` in web, private resolved HOME/TMP and minimal env (PATH, HOME, TMPDIR, NUXT_TELEMETRY_DISABLED, owned BACKEND_NODE_BASE_URL). Wait HTTP200/DOM and warm before assertions. No inherited live roots or provider keys.
- Fresh sandbox-enabled headless Chrome; actual /settings language selector then /nodes Manage→Docker→NFS. Synthetic empty read-only initialization/health/identity and invalidation feeds; unknown queries or browser errors fail. Fixture shapes inspected against current operations. Never touch live application/data, OS clipboard of user's browser, NFS/PM/old detached checkout.
- Save semantic DOM/exact native clipboard assertions plus screenshots and computed style/width/gap evidence; inspect retained actual images. Unsupported partial descriptor naturally not selectable in real Nodes; prove via current component fixtures rather than modifying production descriptor.
- Finally close only owned Chrome/Nuxt groups, verify ports/groups absent, remove only owned HOME/TMP/profile; keep current ignored worktree dependencies/generated cache and durable evidence.

## Planned cases
|ID|Criteria/scenarios|Kind|Command/steps and rationale|
|---|---|---|---|
|R01|AC001–007;SCN001–006|Reused|Read/diff current IMP16 56tests/5files, scopedtsc/3guards; IMP15 red and IMP17 actual component state controls. Audit exact source and headers before acceptance; no repeat suite|
|R02|AC001/002/003/005/006/007;SCN001/002/005/006|Journey|Fresh `node evidence/R02-03-browser.mjs R02-03-attempt-1`; actual language/Nodes tabs, en/zh×1280/390, nine independently expected commands and actualclipboard, noanchors/43-word concise footer/spacing/overflow/safety, Docker before/after. Temporary acceptance probe complements durable unitcoverage|
|R03|AC003;SCN003|Journey|Same owned actual page: Enter/nativeclipboard/reset and controlled pending/second exclusion/tabunmount/late resolution/denied/missing/manual selection. Current foundation needs fresh real tab-lifetime proof; boundary doubles explicit|
|C01|AC005/scope|Temporary Probe|Own processes/ports/roots removed and input/history/other-owner unchanged; retained docs contain detailed limits. No source/diagnostic edits|

Progress log required Yes. Plan precedes execution. Broader decision/confidence after R01 goes in execution report. No ambiguities/reroute/precondition; proceed Yes. No user-only gate or new field campaign. Direct test review **Not Required — direct low-risk route** after green, fresh rules determine recipient.

## R02 harness refinement before rerun
Attempt1 stopped before first viewport completion because inherited R2 needle demanded Windows on-page. R3 explicitly removed detailed platform paragraph; exclusion stays in docs (AC005/007). Renderer was correct. Remove only stale required Windows text in new driver; preserve failure/result/original driver. No product fix, no suite repeat; R01 valid, R03 not reached. Evidence R02-03-attempt-note.json.

## Cleanup / evidence gap correction
Attempts1/2 old probe removed temp before descendant compile-cache shutdown, fs.rm ENOTEMPTY aborted final save. R02 has four exact current receipts/completed progress and is not rerun. R03 assertions completed but its raw detailed receipt was not persisted; rerun only R03 using --lifecycle-only after saving before cleanup and waiting owned group absence/bounded rm retry. R01 unchanged. Diagnose probe, not product. Evidence C01-03-harness-note.json.
