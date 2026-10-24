# API/E2E coverage investigation — nfs-guide-install-commands
## API-REV-002 plan (before current execution)
Task autobyteus-254 / project_task_647690a1-0e1b-4564-9aed-a5b5bf0875e3. Trigger IR002 reopened presentation request; R2/SR003 Approved, SR004 Ready, **Small/Low Direct**. Architecture and source review N/A—not selected. Current source/tests/docs **3d95a5c4a16759060983489735e77820661cff53**, intake **4e308b716cf70ed5bc914ab780984e59df30af7f**, branch codex/nfs-guide-install-commands-r2. Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/nfs-guide-install-commands-r2; finalization origin/personal, **NO release**.

Read implementation-handoff Checks Run FIRST; full current requirements, design, investigation, solution history/handoff and implementation history are the upstream basis. API001 plan/report/Cases/history/progress read before replacing current plan/report; their original results remain historical in Git/history/evidence. Supplied removal screenshots are inventoried in investigation-notes (not separate Product authority). No delivery re-entry or review report applies to this round.

## Behavior, scenarios and boundaries
- BEH005/REQ007/AC006: remove only two standalone install links/labels in en/zh, retain advanced README and review reminder pointing to URL in the copied command; no reserved gap. DS001 is actual /nodes → NodeManager → NfsGuideCard with current catalogs.
- BEH001/AC001/004: preserve exact command data, helper validation and any-valid-installer version notice, including partial/null/invalid states.
- BEH002/003/004 and AC002/003/005: nine Copy cards, safety/host/deferred prose, clipboard lifecycle, responsive/accessibility behavior and adjacent Docker preserved. DS002 clipboard owner unchanged.
- SCN001–005 all supported and planned. No new scenario needed. SCNX01 app executing installers/probes/mounts is unsupported/out of scope; never run a copied command.
- Affected: frontend template/localized content/availability projection and web-equivalent desktop renderer. Browser clipboard/tab lifecycle preserved, not a new API. Not affected: backend/API transport/authentication, Electron shell/IPC, persistence, workers/queues/distributed/storage/provider integration. External link identity is static, not refreshed release availability.
- Implementation removal/data checks are clean: no hidden compatibility alias or anchor; descriptor downloadUrl remains used by validation; **Not Affected** persistence, no migration.

## Impact and existing durable coverage
Current root TESTING.md rerun-by-impact applies. API001 source2c6b414 → current includes integrated core/contracts/shared foundation; old API001 evidence cannot be carried as current. All old cases marked Rerun/current replacement. IR002 already reran its scoped checks on3d95a5c4; only ticket artifacts differ to4e308b7, so reuse those **current** results after log/diff inspection, not repeat for independence. Old R02 expectation of three links is stale under REQ007; new probe expects exactly advanced README. Historical raw evidence stays immutable.

| Coverage | Validity / action | Criteria |
|---|---|---|
| utils/__tests__/nfsLauncherCommands.spec.ts | Still Valid: 24 helper checks, independent literals and six inert success/download/checksum shell controls. Reuse IMP10, helper unchanged |AC001/004|
| components/settings/__tests__/NfsGuideCard.spec.ts | Still Valid after IR002 update:13 cases, both-locales×valid/partial/null/unsafe anchor/version states; exactcopy/pending/denial/missing/timer/unmount. Reuse IMP10; IMP09 red on old3anchor shape is sensitivity evidence |AC001–006|
| components/settings/__tests__/NodeManager.spec.ts | Still Valid current10 parent routing cases, not old11; reuse IMP10 |AC002/004|
| DockerNodeStartGuideCard.spec.ts + dockerNodeLauncherCommands.spec.ts | Still Valid current7 controls, source unchanged; reuse IMP10 |AC004|
| IMP11-verified component renderer | Still Valid exact source for partial/null actual availability, localized content and lifecycle samples. Reuse these limits only; not /nodes composition |AC004/006|
| API001 actual-page R02/R03 | Rerun current page/fixtures: shared foundation changed and old link assertion is intentionally obsolete. Do not edit old artifacts |AC001–006|

No durable test change required: IR002 already supplies narrow regression; repeated local assertions would add no coverage. Use a ticket-owned reproducible actual-page probe to prove composition/rendered gap/real clipboard, as this is scoped acceptance evidence rather than a new test framework.

## Execution discovery / environment
Authorities: root AGENTS.md/TESTING.md/DESIGN.md; web AGENTS.md/ARCHITECTURE.md (Testing Strategy)/README.md (Testing); web package.json, vitest.config.mts, nuxt.config.ts; existing tests/e2e probe conventions. No closer TESTING; initial guessed vitest.config.ts lookup absent, actual .mts read. No conflicting guideline.
- Test: pnpm -C autobyteus-web test:nuxt <five files> --run --maxWorkers=2; helper tsc; guard:web-boundary / guard:localization-boundary / audit:localization-literals, already current in IMP10. Nuxt/HappyDOM proves component semantics, not browser navigation.
- IMP08 frozen filtered install and nuxt prepare succeeded for current lock/config; reuse ignored deps, Nuxt recompiles current source. No server/dist used or server prebuild needed in the explicit browser-fixture layer.
- Fresh resolved private HOME/TMPDIR, ephemeral localhost port, fresh headless Chrome/context. Environment only PATH, owned HOME/TMPDIR, NUXT_TELEMETRY_DISABLED, BACKEND_NODE_BASE_URL=http://127.0.0.1:1. No secrets needed. Serialize one dev server, no parallel heavy run.
- Start pnpm exec nuxt dev --host 127.0.0.1 --port <free>; wait /nodes HTTP200 and actual DOM, warm cold dev page. Actual language settings select → /nodes Manage/Docker/NFS. Current read-only app query/feed/health fixtures include GetUpdateAutomationSettings matching actual current schema. Unknown operations/browser errors fail; no suppression. No product page rewrite or live backend.
- Close only owned Chrome/process group; remove own HOME/TMP root; retain ignored worktree node_modules/.nuxt. Preserve canonical/old detached worktree/PM/live app and other-owner evidence.

## Planned cases (same IDs across rounds)
| ID | Criteria/scenario | Kind | Command / evidence and reason |
|---|---|---|---|
|R01|AC001–006/SCN001–005|Reused|Audit diff/log headers/results for IMP10 current54/5files, helper tsc/3guards and IMP11-verified negative states; source identity and valid assertions. Old case replaced by current attributed proof, no duplicate suite|
|R02|AC001/002/003/005/006;SCN001/002/005|Journey / Temporary Probe|node tickets/in-progress/nfs-guide-install-commands/evidence/R02-02-browser.mjs R02-02-attempt-1; actual /nodes tab journey and language settings, en/zh×1280/390, nine independently expected strings copied, exactly1safeREADME, oldlabels absent/reviewreminder/no reservedgap, semantics/code-scroll/nooverflow; Dockerbeforeafter|
|R03|AC003;SCN003|Journey / Temporary Probe|Same owned browser: Enter realcopy/reset; controlledpending→secondexcluded→leave/late settle/reenter; denial/missing/manualselection. Current parent lifetime gap not component fixture alone|
|C01|AC005/safety|Temporary Probe|Own browser/processgroup/port/temp removal and current source/history preservation; no installer/CLI/realnode operation|

Progress append-only required. Investigation permits execution; no reroute or durable source/test addition/removal. Broad browser layer expected because actual Nodes composition/layout not covered by current components. Full product/backend/Electron/field/NFS qualification excluded, not Passed; autobyteus-nfs-4 custody unchanged. No user-only prerequisite or host questionnaire. On success test review **Not Required — direct low-risk route**, fresh rules choose Delivery.

## Diagnosed fixture refinement before R02 rerun
R02-02-attempt-1 reached four guide views but failed on missing current Manage tab empty-peer/capability/identity responses (details R02-02-attempt-note.json). Add only those read fixtures from current stores/schema; backend URL becomes owned frontend origin instead of port1. Unknown operations/errors still fail. No product edit, R01 suite not repeated. New attempt explicitly enables Chromium sandbox and verifies launch argv; preserve failed attempt and cleanup assistance. R03 has not yet executed.
