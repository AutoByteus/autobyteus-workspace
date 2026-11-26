# Implementation Handoff — autobyteus-516 Stage 1: the extension foundation on every node, proven by Voice Input

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large / High) and passed (ARCH-REV-002). Handoff rule: Large or High → `/code_reviewer`.
- Requirements doc: `tickets/in-progress/autobyteus-516-extensions/requirements-doc.md` (SR-006, DEC-015…DEC-019)
- Investigation notes: `…/investigation-notes.md`
- Solution revision record: `…/solution-revision-record.md`
- Design spec: `…/design-spec.md` (SR-007/SR-008, plus `ExtensionList.platform`, see below)
- Supplemental task artifacts: `…/extension-contract.md` (parts 1–5 frozen), `…/use-case-spines.md` Part V; Product UI spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/extensions-ui-516/ui-ux-spec.md` (VIS-V*, VIS-L-01/02, VIS-N-01…03; REQ-007 row and VIS-V3-01 superseded by DEC-016)
- Design review report: `…/design-review-report.md` (ARCH-REV-002, Pass)
- Architecture review revision record: `…/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial).

All paths above are under `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-516-extensions/`.

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `…/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-006, SR-007, SR-008 (+ `platform`, below)
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review / API/E2E / delivery revision IDs: N/A
- Triggering finding IDs: N/A
- Branch / commits: `codex/autobyteus-516-extensions` on `origin/personal` @ fdde5406fa: 60a02aa667 (server foundation), 3982b0042e (list `platform`, real-release test), d2934d630f (web, desktop removal, deletion step), 8bf772e0e6 (docs), 38058ec630 (voice re-read on followed changes, suite fixes, probe), cc3094a0cb (test wait bound), plus the ticket documents and evidence commit after this file. Not pushed.
- Second repository: `AutoByteus/autobyteus-extensions` does not exist on GitHub yet (the founder creates it). Its content is a local git repository at `/Users/normy/autobyteus_org/autobyteus-extensions` (branch `main`, commit 4d00904).

What exists now:

- **Every node has an Extension Manager** (`autobyteus-server-ts/src/extensions/`), built in `src/compositions/extensions-composition.ts` and wired in `build-studio-server.ts`. Its parts:
  - the signed catalog (Ed25519, base64 `.sig`; fetched once after listen, on page open with `refreshCatalog: true`, and at Install/Update, each bounded at 10 s and shared while running);
  - the package installer (SHA-256, `tar` unpack into `package.new/` refusing unsafe paths and links, layout and description equality, swap into `package/`);
  - the Server Part Host (per-load `?load=n` import, shape check, bound `ctx`, status bounded at 5 s, own action keys only);
  - `state.json` (tolerant read, atomic serialized writes) and the per-extension log (1 MB cap).
- **Transport, owner only:**
  - GraphQL `extensions(refreshCatalog)`, `extensionLog`, and the install, update, remove and set-enabled mutations; the manager reaches resolvers through the request context, and `registerGraphql`'s parameter is required.
  - `POST /rest/extensions/:id/actions/:action`: JSON, or `audio/wav` through a route-scoped parser with a 100 MB limit (`RECORDING_TOO_LONG`).
  - `GET /rest/extensions/:id/ui/*`: streamed, with the sandbox CSP of the design.
  - `/rest/extensions` is an owner action in `node-route-permissions.ts`.
  - The extensions that are on start in the background after listen; `stopAll()` runs in `closeProcessResources` (5 s per extension).
- **Voice Input package** (`autobyteus-extensions/voice-input`):
  - `extension.json` with zh-CN translations.
  - `server/index.mjs` (Node built-ins only): installs runtime v0.3.2 and its model into `ctx.dir`, deletes downloads, warms the worker in `start`, stops it after 30 min idle, reports "Getting ready…" while loading, and returns the worker's one-line reason on a failed start. Actions: `transcribe`, `getSettings`, `setLanguage`.
  - `ui/index.html`, from the Product page.
  - Scripts `pack` (reproducible ustar), `check-catalog` and `sign-catalog`, and two workflows: package release (`<id>-v<version>`, never Latest) and catalog release (fixed tag `catalog`, never Latest).
- **Web:**
  - Settings → Extensions page with node line, owner, browser and catalog notes, cards per VIS-V*, dialogs, and the sandboxed page frame with its bridge.
  - The microphone panel and Test (AutoByteus's own; microphone choice in `localStorage['autobyteus.voiceInput.microphone']`).
  - `extensionsStore` reads the window's node and polls every 1 s while something installs, updates or starts. `voiceInputStore` reads the embedded node's `voice-input` item through `directNodeApolloClient` (not on the phone runtime) and transcribes through `extensionActionClient`.
  - The slow note on voice surfaces (VIS-V5-03).
  - en and zh-CN catalog texts from the Product catalogs.
- **Desktop:** the Electron extension manager, its IPC, preload members, `electron.d.ts` members and the old card are removed. A sealed client-data step (`client-data-migrations/migrations/remove-desktop-voice-input-install/`) names `<base data folder>/extensions`; `electron-file-runner.ts` deletes it in the background at start (DEC-016).
- **Docs:** GLOSSARY (Extensions section), `autobyteus-server-ts/docs/modules/extensions.md`, DESIGN.md rule 9 second exception (and the Solution Designer's rule 13), and `node_access_model.md` (NA-7 wording, NAS-42/43).

Design addition made during implementation (Solution Designer confirmed option (a), 2026-11-26): `ExtensionList.platform`, the node's `<os>-<cpu>` from `thisPlatform()`. Only the VIS-V1-05 card text ("There is no build for this computer, {platform}") reads it. It is internal part 6; parts 1–5 are unchanged.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md, "Task Size And Architectural Risk".
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: the implementation is what the design classified: a new server subsystem, owner-only routes, code downloaded and run inside the node, a frozen contract, a long-lived child process (the voice worker), deletion of user data (DEC-016), a second repository with a signing key, and about 3,670 lines removed in the web package.
- Selected route: `Code Review`
- Lightweight implementation self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: None open. The one gap found (the node's platform) was decided with the Solution Designer during implementation.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | The list of the window's node from the signed catalog; install, update, remove, on/off | `ExtensionsManager.vue` → `extensionsStore.open/refresh/lifecycle` → GraphQL `extensions`/mutations (`api/graphql/types/extensions.ts`) → `ExtensionManager.list/install/update/remove/setEnabled` → `ExtensionCatalog`, `ExtensionPackageInstaller`, `ServerPartHost`, `ExtensionStateStore` | Done; real install through the page: IMP-R R1, R2, R8; unit IMP-01 |
| BEH-002 | Dictation by the embedded node's Voice Input; warm at start (REQ-012) | `voiceInputStore.stopRecording` → `transcribe` → `extensionActionClient` → `POST /rest/extensions/voice-input/actions/transcribe` → `ExtensionManager.callAction` → voice server part → worker; `startEnabled()` after listen, `start` on turn-on and after install | Done; real: IMP-03 (en/zh/silence), IMP-R R4 (Test, 818 ms warm) |
| BEH-003 | Same five surfaces, gated on installed + on + ready | `VoiceInputButton` (`isAvailable` from `voiceInputStore.voiceInput`); re-read at window start (`plugins/22.voiceInputAvailability.client.ts`), on surface mount, on focus, after this window's change and when a followed change ends, and on `EXTENSION_OFF`/`EXTENSION_NOT_INSTALLED` | Done; IMP-R R5/R6 (Memory search button shown, hidden while Off, back after On); voice specs |
| BEH-004 | A remote node's window dictates with this computer's Voice Input | `voiceInputStore` always uses the embedded entry (`nodeStore.getEntryById(EMBEDDED_ENTRY_ID)`), not the window's node | Done in code and unit-tested; not run against a real second node (left to API/E2E, AC-009) |
| BEH-005 | A Docker/Linux node lists its own extensions; Voice Input not offered there | `ExtensionManager.isOfferedHere` (`desktop-node` ⇔ `isDesktopEmbeddedNode()`, one place); page shows the voice note on another node's window | Unit (offer filter) and page spec; no Docker run (AC-010 left to API/E2E) |
| BEH-006 | Phone / no credential refused | Route table owner action; resolver `requireOwner` | IMP-01 NAS-42/NAS-43; negative controls N3/N4 |
| BEH-007 | The old install is deleted once | `electron-file-runner.ts` `removeFolderInBackground` + `REMOVE_DESKTOP_VOICE_INPUT_INSTALL`; called from `electronApplication.start()` with `profile.baseDataRoot` | Synthesized v1, v2 and v2+device fixtures with `.DS_Store`: deleted once, second start does nothing, failure logged and retried |
| BEH-008 | A broken extension affects only its card | `ExtensionManager.itemOf/failed` (unreadable package, load failure, `status()` throw or 5 s timeout → Failed, warned once, nothing deleted); unreadable `state.json` → everything Off | Unit V12 cases; negative control N8 |
| BEH-009 | Docs | GLOSSARY, module doc, DESIGN.md, node access model | Done |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Server: `src/extensions/{domain,catalog,packages,server-parts,storage,services}/*`, `src/compositions/extensions-composition.ts`, `src/compositions/build-studio-server.ts`, `src/server-runtime.ts`, `src/api/graphql/{index,graphql-request-context,schema}.ts`, `src/api/graphql/types/extensions.ts`, `src/api/rest/{extensions,index}.ts`, `src/api/security/node-route-permissions.ts`; tests `tests/unit/extensions/*`, `tests/unit/api/rest/extensions-routes.test.ts`, `tests/fixtures/extension-packages.ts`, `tests/helpers/test-extension-manager.ts`, `tests/real-release/voice-input-extension.real-release.test.ts` (`test:voice-input-real-release`).
- Web: `components/settings/ExtensionsManager.vue`, `components/settings/extensions/{ExtensionCard,ExtensionPageFrame,ExtensionDialogs,VoiceMicrophonePanel}.vue`, `stores/{extensionsStore,voiceInputStore}.ts`, `services/extensions/{extensionActionClient,extensionPageBridge}.ts`, `graphql/{queries,mutations}/extensions*.ts`, `types/extensions.ts`, `plugins/22.voiceInputAvailability.client.ts`, `components/voiceInput/VoiceTargetStatus.vue`, `components/agentInput/VoiceInputStatusRow.vue`, `localization/messages/{en,zh-CN}/extensions.ts`, `client-data-migrations/…`, `demo/graphql/unreachable-operations.json`, `generated/graphql.ts`, `tests/e2e/extensions-page-probe.mjs` (`test:e2e:extensions-page`).
- Removed: `electron/extensions/**`, `electron/extensionIpcHandlers.ts`, `components/settings/VoiceInputExtensionCard.vue` (+ spec), preload and `electron.d.ts` members, `test:voice-input-real-release` (web), the old card's localization keys.
- Repository `autobyteus-extensions`: `voice-input/*`, `scripts/{pack,check-catalog,sign-catalog}.mjs`, `scripts/lib/*`, `.github/workflows/{release-extension,release-catalog}.yml`, `tests/*`, `README.md`, `catalog.json` (empty until the first package release).

## Important Assumptions

- The page's "Try again" (design: a catalog fetch "when the page opens or the owner presses Try again") is not drawn in the approved UI (VIS-V13-03 says "try again later" and has no button). Opening the page fetches. I did not add a control the UI spec does not have.
- The catalog `.sig` is base64 (the C3 precedent, `sign-server-package.mjs`); the contract says "Ed25519 over the exact bytes" without an encoding.
- Lifecycle refusal codes on GraphQL (`EXTENSION_CATALOG_NOT_VERIFIED`, `EXTENSION_NOT_OFFERED`, `EXTENSION_NOT_AVAILABLE`, `EXTENSION_ALREADY_INSTALLED`, `EXTENSION_NO_UPDATE`, `EXTENSION_NOT_INSTALLED`, `EXTENSION_BUSY`) are internal part 6. The page shows their message as a toast.
- A Remove dialog text for extensions other than Voice Input (`extensions.remove.text.general`) exists for a later catalog entry; Stage 1 shows only Voice Input's approved text. Four more AutoByteus strings the real states need were added in en and zh-CN: "Installed and on.", the short "System default", the microphone problem lines (reused from the old card) and the Test's no-speech and error outcomes.
- The card hides a status message that is exactly "Ready." (as the Product reference does).

## Known Risks

- **Release blocker (founder):** `EXTENSIONS_CATALOG_PUBLIC_KEY_PEM` in `src/extensions/catalog/extension-catalog-source.ts` is empty until the founder creates the catalog key. Until then every node answers `unverified` and nothing installs, except with a development catalog. The repository also needs `catalog-public-key.pem` and the secret `EXTENSIONS_CATALOG_SIGNING_KEY`, and `catalog.json` gets the voice-input entry after its first package release (the order is in the repository README). The Solution Designer was told on 2026-11-26.
- Server parts run in the node's process (accepted deviation). A server part that blocks the event loop blocks the node. `status()` is bounded at 5 s and `stop()` at 5 s at shutdown.
- Through the Nuxt dev proxy, the CSP of a page names the backend host while the frame loads through the frontend host. Voice Input's page is inline-only, so nothing is affected. A future page with classic scripts from `ui/` would be blocked in `pnpm dev` only; the packaged desktop loads the node directly.
- `stores/voiceInputStore.ts` is at 496 effective lines (it was 453). Under the limit; the next change to it should split capture from availability (recorded as FU-003).
- Voice runtime 0.3.2 needs Homebrew `ffmpeg` on Apple Silicon. A failed start shows the worker's reason ("Could not start: …") and hides the microphone (unit-tested with a scripted worker; not reproduced against the real runtime).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Larger Requirement (feature + relocation)
- Reviewed root-cause classification: Boundary Or Ownership Issue
- Reviewed refactor decision: Refactor Needed Now
- Implementation matched the reviewed assessment: Yes. One owner per node; Electron keeps none; the web talks to nodes.
- If challenged, routed as Design Impact: one gap (`platform`), decided with the Solution Designer.
- Evidence / notes: removal plan done in full, including the corrected `electronApplication.ts:38-39,68,371,398` lines.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: None. Nothing reads the old registry, and there is no IPC fallback.
- Legacy old-behavior retained in scope: No.
- Dead code in the touched files and modules removed: Yes. That covers the old card keys, `failedToTranscribeAudio`, the `isElectron` state of the voice store, the removed-module mocks, the web `test:voice-input-real-release` script and the baseline entry.
- Dead code found elsewhere, added to `follow-ups.md`: None.
- Shared structures remain tight: Yes. `ExtensionItem` is flat with fields set per state, as the contract table says. `GraphqlServices` carries only `extensions`.
- Canonical shared design guidance reapplied: Yes.
- Deviations from a design principle decided during implementation:
  - `tests/architecture/user-file-replies.test.ts` names `extensions.ts` as a third exception to "protective headers only in `sendUserFile`". Extension page files are installed extension code served with the page's own, stricter CSP (contract §2/§5), the same kind of exception as `application-bundles.ts`. `sendUserFile`'s `sandbox allow-scripts` alone would let the page reach the network.
  - The web voice integration test runs in the node environment. The Nuxt environment's module runner cannot import a server part by file URL with a query.
- Changed source files within size guardrails: Yes. `build-studio-server.ts` 478, `extension-manager.ts` 414 (new, one owner), `voiceInputStore.ts` 496.
- Notes: none.

## Persisted Data Transition Check

- Approved decision: (1) old desktop install → `Discard or Rebuild` (DEC-016); (2) `<data dir>/extensions` → `Not Affected` (new data).
- Design-spec decision reference: "Persisted Data / State Transition Decision".
- Implementation follows the approved decision: Yes. It is a sealed client-data step and the migration file holds only the folder name and log texts. The runner deletes the folder in the background (recursive `rm`, absent folder = nothing to do, failure logged and retried at the next start), and the shapes are never read.
- Discard result: `client-data-migrations/__tests__/electron-file-runner.spec.ts` (4 new cases, synthesized fixtures).
- Deviation: None.

## Environment Or Dependency Notes

- A fresh worktree needs `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-web exec nuxi prepare` and `test:integration:prepare`.
- The real-release test and the probe need macOS `say`, Homebrew `ffmpeg`, Python 3.9+ and network access (GitHub release and Hugging Face, about 2 GB). Both use only temporary folders (HOME and the data dir).
- Commands that rebuild `autobyteus-ts/dist` (typecheck, `pretest`) break a node started at the same time: run the probe alone.

## Checks Run

Evidence folder: `tickets/in-progress/autobyteus-516-extensions/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts test:unit`; then the 4 failing files rerun after fixes | d2934d630f; rerun 38058ec630 | macOS arm64, Node 22.23.1 | whole server unit + architecture suites; `src/extensions/**`, routes, GraphQL | AC-001…AC-006, AC-011, BEH-006/008 | Pass after fixes (4 files caused by this change, fixed in 38058ec630) | `IMP-01-server-unit.log` | "Tests  65 passed (65)" for the rerun |
| IMP-02 | `test:integration:prepare && test:integration`; `env -i … vitest run tests/e2e/file-explorer/search-content-http.e2e.test.ts` | d2934d630f | same | `registerGraphql` callers, whole integration suite | — | Pass | `IMP-02-server-integration.log` | "Tests  523 passed"; e2e "6 passed" |
| IMP-03 | `env -i … AUTOBYTEUS_VOICE_INPUT_REAL_E2E=1 AUTOBYTEUS_EXTENSIONS_CATALOG_URL/PUBLIC_KEY=<dev catalog> pnpm -C autobyteus-server-ts test:voice-input-real-release` | 3982b0042e + extensions 4d00904 | same, real runtime v0.3.2 from GitHub, model from Hugging Face | Manager, installer, host, action route, real voice package and runtime | AC-002, AC-007, REQ-012 | Pass | `IMP-03-voice-real-release.log` | "installed and ready in 142 s"; "Tests  1 passed" |
| IMP-04 | `/tmp/516-scripts/negative-controls.py` (10 guards broken one at a time) | 38058ec630 source | same | own-action check, late start, owner check, route table, SHA-256, page path, signature, unreadable state, busy, failed update | AC-002/003/006, BEH-008 | Pass (10/10 caught) | `IMP-04-negative-controls.log` | each line "caught by: ['× …']" |
| IMP-05 | `pnpm -C autobyteus-web test:nuxt --run`; affected specs rerun on 38058ec630 and cc3094a0cb | d2934d630f → cc3094a0cb | same | whole web suite; stores, components, bridge, client, migration step, demo coverage | AC-001…AC-008 | Pass after fixes (2 caused by this change: boundaries, demo coverage; 1 load-timing test cause fixed in cc3094a0cb) | `IMP-05-web-suite.log` | "Tests  2 failed \| 6296 passed" then the fixes |
| IMP-06 | `pnpm -C autobyteus-web test:electron --run` | d2934d630f | same | Electron main after the removal | removal plan | Pass except one load-timing failure (cause recorded; rerun alone 11/11; not touched by this change) | `IMP-06-electron-suite.log` | "542 passed"; the ENOENT cause |
| IMP-07 | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck` | cc3094a0cb | same | both packages, cross-package tests | — | Pass | `IMP-07-typechecks.log` | "[typecheck] PASS" twice, production errors 0 |
| IMP-08 | `npm test` in `autobyteus-extensions`; unpacker on the real 0.3.2 archives | extensions 4d00904 | same | voice server part (scripted worker), pack, check-catalog, sign-catalog | AC-002, AC-007, QR-001 | Pass | `IMP-08-extensions-repo.log` | "# pass 9"; both archives' file lists |
| IMP-R | `node tests/e2e/extensions-page-probe.mjs --extensions-repo=<…/autobyteus-extensions> --skip-server-build` (run 5) | 38058ec630 (server dist built from it by `codegen:local`) | real node (desktop node flag, dev-signed catalog), Nuxt dev, headless Chrome 1440×900, 390×844, zh-CN, fake microphone | page, card, frame + bridge through the real node, microphone panel, voice surface, voice store re-reads, Remove | AC-001, AC-002 (incl. page check), AC-005, AC-007, VIS-V1-01, V2-01…05, V4, V5-01, V7-01, V8-01…04, V10, V11-01, L-01/02, N-01/02 | Pass (8/8) | `IMP-render/IMP-R-*.png`, `IMP-render/IMP-R-evidence.json` | `"result": "Pass"`, `"refusedRequests": []`, `"browserErrors": []`, `testResult` "Please summarize the meeting notes…", `timings` |

- Not run, and why:
  - AC-009 (a remote node's window dictating with this computer's Voice Input against a real second node) and AC-010 (a Docker node's window): need a second node or a container. Left to API/E2E.
  - The packaged desktop app (`isolated-app`): its embedded node gets only a system-baseline environment, so a development catalog cannot be given to it, and with an empty public key the catalog is `unverified`. The real desktop credential attacher and the packaged `file://` origin are therefore not exercised. The probe stood in for both: the browser context sends the credential, and the Electron shell is a stand-in object.
  - QR-002 (warm transcription no more than 0.5 s slower than before): not measured before/after. Warm Test transcription through the full path took 818 ms for a 5.7 s clip (IMP-R).
  - The iOS demo build (`autobyteus-ios/scripts/prepare-demo-web.sh --build`). Its source-level coverage spec passes.
  - The release workflows of `autobyteus-extensions` (no GitHub repository yet; releases only on the founder's word).

## Frontend Rendered-Result Check

- Affected surfaces / journeys: Settings → Extensions (UXJ-001…UXJ-007, UXJ-020); the voice surfaces' microphone availability and slow note (UXJ-004).
- Approved references: `ui-ux-spec.md`, VIS-V1…V13, VIS-L-01/02, VIS-N-01…03; Product catalogs `extensionsDesign.ts` (en, zh-CN); reference components in the design repository `personal` @ 825434bc.
- Design system and adjacent surfaces reviewed: Settings shell, existing card, switch and dialog patterns, Memory search, the old card's real microphone states.
- Surface used: TESTING.md browser probe pattern (probe-owned real node, Nuxt dev, headless Chrome) via `tests/e2e/extensions-page-probe.mjs`.
- States inspected:
  - Not installed; Installing ("Preparing the speech model…" with a moving bar); Installed and on with spinner; On/Ready.
  - Page in place: language saved, runtime 0.3.2, folder with Copy, frame resized to 226 px.
  - Microphone panel and Test recording/result; Memory search button; log dialog; Off, and Memory without the button; On again.
  - Chinese card and page; phone width 390 (page and frame); Remove confirmation and Not installed.
  - Unit and component specs cover Failed, notAvailableHere (platform, newer contract), the update states, Removing, and the catalog notes.
- Issues found and corrected: the voice store was not re-read when an install ended, so the Test refused right after an install (fixed in 38058ec630). The rest were probe defects (shell stand-in, selector).
- Limitations: the red "app updates" toasts in the screenshots come from the probe's shell stand-in, not the product. The narrow Settings section list above the content is FU-002. The "Downloading Voice Input 1.0.0" phase was too short to sample in the probe; it is unit-tested. Not rendered against live states: the catalog notes (unverified, unreachable), Failed, and the update states.

## Downstream Coverage Hints / Suggested Scenarios

- AC-009: a desktop window bound to a second node, dictating, with the WAV going to the embedded node (credential by origin). Then Voice Input Off on this computer: no button in that window after focus.
- AC-010 and AC-004: a Docker node's window lists that node's extensions without Voice Input, with the voice note; install and remove act on that node.
- AC-008 on a packaged build: an isolated instance whose base data folder holds a synthesized old install. It must be gone after start, and Voice Input must show Not installed.
- AC-003 with a development catalog: publish 1.0.1 of the package (version bump only) and run Update. It must stay On and keep the language. Then publish a broken 1.0.2: "Update to 1.0.2 failed: …", with the old version still dictating.
- Catalog unreachable or unverified on the page: the notes, Install disabled, installed extensions listed.
- An extension that fails `status()` or cannot be loaded, beside a working one: only that card Failed, nothing deleted (V12-01).
- Phone credential against every extension route and GraphQL operation (AC-006; NAS-43).

## API / E2E / Executable Coverage Investigation And Execution Still Required

AC-003 through the page, AC-004, AC-008 (packaged), AC-009, AC-010 and QR-002, plus the real desktop credential attacher with a packaged window (AC-002's page check through the real attacher). The probe (`test:e2e:extensions-page`) and the real-release test (`test:voice-input-real-release`) are reusable with a development catalog; both need `--extensions-repo` or the catalog variables.
