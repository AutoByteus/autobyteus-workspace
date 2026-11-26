# Code Review Report — autobyteus-516 Stage 1 (extension foundation, Voice Input)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-006; DEC-015…DEC-019)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (cited sections only)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-007/SR-008, with `ExtensionList.platform`)
- Supplemental Task Artifacts Reviewed As Context: `extension-contract.md` (parts 1–7), `follow-ups.md`; Product UI spec referenced by the handoff (VIS-V*)
- Relevant Solution Revision IDs: SR-006, SR-007, SR-008
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: 2
- Review Scope: `Targeted Delta Review` (round 2); round 1 was a `Full Review`
- Review Scope Evidence (round >1): `git diff 909ede3f3f 3961790ab6` touches only the CR-001 and CR-002 lines: 5 files, +2/−11. It changes no spine, interface, data shape or behavior. Every round-1 check carries forward unchanged except the cleanup, dead-code and naming rows, which were rechecked.
- Trigger: implementation handoff IR-002 (CRR-001 Local Fixes)
- Prior Review Round Reviewed: round 1 (CRR-001)
- Latest Authoritative Round: 2
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed. The change adds a new server subsystem, owner-only routes, and a download-and-run code path. It also freezes a contract across versions, runs a long-lived child process, deletes user data, and adds a second repository with a signing key.

## Review Scope

- Changed implementation and behavior reviewed: commits `60a02aa667..909ede3f3f` on `codex/autobyteus-516-extensions` (base `origin/personal` @ fdde5406fa), and the local repository `/Users/normy/autobyteus_org/autobyteus-extensions` @ 4d00904.
- Files / areas reviewed:
  - Server: all of `src/extensions/**`, `extensions-composition.ts`, `build-studio-server.ts`, `server-runtime.ts`, the GraphQL context and index, `types/extensions.ts`, `rest/extensions.ts`, `rest/index.ts`, `node-route-permissions.ts`, the architecture test exception, and the extension unit and route tests.
  - Web: `extensionsStore`, `voiceInputStore`, the action client, the page bridge, `ExtensionsManager`, `ExtensionCard`, `ExtensionPageFrame`, `VoiceMicrophonePanel` (structure only), the voice status components, the availability plugin, the client-data deletion step and its spec, the `electronApplication.ts` removal, and the demo coverage file.
  - Extensions repository: `voice-input/server/index.mjs`, `extension.json`, the page's bridge use, `sign-catalog.mjs`, and both workflows.
  - Docs: GLOSSARY, DESIGN.md (rule 9 exception), `node_access_model.md`, the module doc's section layout.
- Explicit exclusions:
  - Pixel fidelity of the rendered page, which the IMP-R probe and the Product spec cover.
  - The generated GraphQL file.
  - Localization texts beyond the key guards.
  - I reran no checks. The handoff's checks ran on the reviewed commits, and no finding needed a new one.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. Stage 1 is one Extension Manager per node with a signed catalog and owner-only management. Voice Input moves onto it with the same five surfaces and dictates through the embedded node from every window. The old desktop install is deleted once (DEC-016).
- Design-spec behavior map verified against the implementation: Yes (DS-001…DS-009 traced in code).
- Design review report and round confirmed: ARCH-REV-002 Pass.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none. `ExtensionList.platform` is a design addition that the Solution Designer confirmed; it is now in the design spec's Data Contract table, with one reader (VIS-V1-05).
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / New Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `ExtensionsManager.vue` → `extensionsStore.open/refresh/lifecycle` → `ExtensionsResolver` (`requireOwner`) → `ExtensionManager.list/install/update/remove/setEnabled` (`extension-manager.ts:66-158`) → catalog, installer, host, state store. Install and Update return at once; polling runs while `installing`/`updating`/`starting` (`extensionsStore.ts:126-130`). | — |
| BEH-002 | Confirmed | `voiceInputStore.transcribe` → `callExtensionAction(<embedded>, 'voice-input', 'transcribe', {wav})` → `POST /rest/extensions/:id/actions/:action` (audio parser, 100 MB) → `callAction` gate (`:164-186`) → voice `transcribe` → worker. Warm-up: `startEnabled()` after listen (`server-runtime.ts:256-259`) and `startInBackground` after install and turn-on. | — |
| BEH-003 | Confirmed | `isAvailable` = installed && enabled && ready (`voiceInputStore`). Re-read at window start (plugin 22), on surface mount, on focus, after this window's change and a followed change, and on `EXTENSION_OFF`/`NOT_INSTALLED`. | — |
| BEH-004 | Confirmed (code) | The voice store always reads and posts to `getEntryById(EMBEDDED_ENTRY_ID)`. A live second node is left to API/E2E (AC-009). | — |
| BEH-005 | Confirmed (code) | `isOfferedHere` is decided in one place (`extension-manager.ts:85-87`) from `isDesktopEmbeddedNode()`, read once in the root. The voice note shows on other nodes' windows. A Docker run is left to API/E2E (AC-010). | — |
| BEH-006 | Confirmed | `/rest/extensions` is an owner action (`node-route-permissions.ts:76-77`). The resolvers call `requireOwner` (`types/extensions.ts:59-63`). Phone and no-credential refusals are tested (NAS-43). | — |
| BEH-007 | Confirmed | `runElectronFileMigrations(userData, baseDataRoot)` → `removeFolderInBackground(<baseDataRoot>/extensions)`. Absent folder: nothing to do; failure: logged and retried next start. The node's `<baseDataRoot>/server-data/extensions` is distinct and asserted untouched. | — |
| BEH-008 | Confirmed | `itemOf`/`failed()` turn an unreadable package, a load failure, or a `status()` throw or 5 s timeout into Failed, warned once, nothing deleted. An unreadable `state.json` reads as everything Off and is not rewritten. | — |
| BEH-009 | Confirmed | GLOSSARY Extensions section, module doc with contract parts 1–5, DESIGN.md rule 9 exception, NA-7 and NAS-42/43. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal / Event | Entry | Shape | Forward Path | Expected Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001/002 | BEH-001, AC-001…003 | User | Owner | See and manage this node's extensions | Settings → Extensions | Normal | DS-001…DS-003 | Cards, lifecycle, polling | IMP-R R1/R2/R8; unit | Supported Normal | Use |
| SCN-003/005 | BEH-002…004, AC-007/009 | User | Owner | Dictate in any window | Microphone button | Normal | DS-004 | Text in draft | IMP-03, IMP-R R4 | Supported Normal | Use |
| SCN-004 | BEH-007, AC-008 | Operational | Founder | Use voice after update | App start | Normal | DS-008 | Old folder gone once | runner spec (4 cases) | Supported Normal | Use |
| SCN-007 | BEH-006, AC-006 | Contract | Phone / none | Change extensions | API | Explicit Edge | route table + resolver | Refused | NAS-43 test, N3/N4 | Supported Explicit Edge | Use |
| SCN-008 | BEH-008, AC-011 | System | Node | Start with a broken extension | Start / list | Explicit Edge | DS-006, `itemOf` | Only that card Failed | unit V12, N8 | Supported Explicit Edge | Use |
| CT-001 | DESIGN.md data-migration "current-only"; design-spec Persisted Data checklist item 6 ("current code never names the old folder"); Principle 7 | Contract | — | The retired desktop extensions folder appears only in the sealed deletion step | — | — | — | — | design-spec.md:198 | Governing contract | Use |
| SCN-X1 | — | User | Owner | Two windows transcribing at the same moment | Two microphone buttons | — | voice `transcribe` concurrently | — | none | Technically Possible but Unsupported/Contrived | Reject |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason / Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `ExtensionList.platform` added during implementation | SCN-001, VIS-V1-05 | Card for `notAvailableHere/platform` | One reader, one writer (`thisPlatform()`, the same value the platform check uses) | design-spec.md:134; `extension-item.ts:51-56` | Reject | — | Confirmed by the Solution Designer and now in the design's contract; internal part 6. |
| C-02 | Third named exception in `user-file-replies.test.ts` for `rest/extensions.ts` | Contract §2/§5 | Page route | The page is served with `sandbox allow-scripts` plus `default-src 'none'`, `connect-src 'none'` and ui/-only sources, `nosniff`, `no-store`. `sendUserFile` would give only `sandbox allow-scripts` (`user-file-reply.ts:9,69`), which lets the page reach the network with the attached credential. | `rest/extensions.ts:29-38,84-95` | Reject | — | Deviation recorded; the reason holds. Same kind as `application-bundles.ts`. |
| C-03 | Voice store also re-read when the polled list shows a `voice-input` change | BEH-003 | Install or start ends after its mutation | `extensionsStore.ts:106-112`: notification only (no data passed), embedded window only | IMP-R found the gap (Test refused right after install) | Reject | — | Stays within the design's rule that `extensionsStore` notifies `voiceInputStore`. It closes a real gap. Costs one extra read when the page opens. |
| C-04 | Empty `EXTENSIONS_CATALOG_PUBLIC_KEY_PEM` | REQ-002, release | Founder creates the key | Every node answers `unverified` until set | `extension-catalog-source.ts:25`; handoff Known Risks | Reject (as code finding) | — | Correct fail-closed default; a release gate already with the Solution Designer. Residual risk. |
| C-05 | "Try again" not drawn; the catalog code comment still names it | Approved UI (VIS-V13-03); contract §6 | Reader of `extension-catalog.ts` | `extension-catalog.ts:23-24` says the catalog is fetched "when the Extensions page opens or the owner presses Try again"; no such control exists. Following the approved UI is right; the new file's text is wrong. | grep: only this comment | Promote → CR-002 | This ticket | One-line comment fix. Design-spec line 241 carries the same words: docs impact for the Solution Designer and delivery. |
| C-06 | Current Electron code still names the retired desktop extensions folder, and nothing reads it | CT-001, Principle 7 | — | (1) `electron/appDataPaths.ts:12-14` `getCanonicalExtensionsPath()` (only its own spec reads it: `electron/__tests__/appDataPaths.spec.ts:4,15`). (2) `electron/launch-profile/electronLaunchProfile.ts:26,106`: `E2EElectronPathPlan.extensions` has no reader, and only `tests/e2e/electron-launch-profile-probe.mjs:311` asserts it. With the Electron extension manager removed, these are the only names of `<base data folder>/extensions` outside the sealed deletion step. That contradicts the design's "current code never names the old folder" and keeps dead code in the area this ticket retires. | `git grep getCanonicalExtensionsPath`, `paths.extensions` (0 product readers, at base and now) | Promote → CR-001 | This ticket | The design's own current-only claim fails. Fix: remove both and their test or probe expectations (a few lines). |
| C-07 | Voice `transcribe` builds `requestId` from the shared `requests` counter after awaits (`index.mjs:267,273`) | SCN-X1 | Two simultaneous dictations in two windows | Two requests could share an id | — | Reject | — | No product goal for two simultaneous dictations (Principle 6). An optional one-line hardening (take the id with the file name) is not required. |
| C-08 | A Failed card (status throws) has no On/Off switch | V12-01, BEH-008 | Broken extension | Install again, View log, Remove (`ExtensionCard.vue:87-148`) | approved Failed state | Reject | — | Matches the approved Failed state and "Reinstall path" (BEH-008). |
| C-09 | An Update's `install(ctx)` writes into shared `data/`; whether the old version keeps working after a failed update depends on the extension | AC-003 | Future package release | Voice 1.0.0 keeps runtime and model when the runtime version is unchanged (`index.mjs:200-205`) | Only 1.0.0 exists | Reject | — | Not reachable in Stage 1. A later package version that changes the runtime is its own change. |
| C-10 | `setEnabled(false)` awaits `stop()` without a time bound | DS-003 | Owner turns Off | Voice `stop` kills the child and awaits `close` | `index.mjs:183-193,255-258` | Reject | — | No supported hang; first-party code. Shutdown is bounded at 5 s. |
| C-11 | Frame has `allow="clipboard-write"`, beyond contract §5's wording | DEC-015 (3) | Copy folder on the page | Approved Copy control; no network or credential reach | `ExtensionPageFrame.vue:8` | Reject | — | The frame's attributes are AutoByteus-internal, and an approved control needs this one. |
| C-12 | `gunzipSync` in the in-process voice part | Accepted in-process deviation | Install | The runtime archives hold 5 small files (IMP-08 listing); the model is prepared in the runtime's child process | IMP-08 | Reject | — | No material event-loop block. |
| C-13 | The 413 handler words every oversized body as "recording too long" | Contract §6 | — | Only a WAV can approach 100 MB | — | Reject | — | No supported JSON action that large. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | One owner per node; the Electron manager, its IPC, preload and types are removed (`electronApplication.ts` diff); the web talks to nodes | — |
| Matches approved behavior-defining supplements | Pass | Contract §1–§7: tolerant reader, equality check minus `packageUrl`/`sha256`, `?load=n` import, own-key actions, CSP per design, `state.json` only `enabled`, install order unpack → `install(ctx)` → rename → `enabled:true` → `start` | — |
| Data-flow spine clarity | Pass | DS-001…DS-009 traceable 1:1; the Manager is the single entry (`extension-manager.ts`) | — |
| Ownership boundary preservation | Pass | Routes and resolvers call only `ExtensionManager`; the Manager alone writes `state.json`; the host alone touches `module.actions` | — |
| Off-spine concern clarity | Pass | Catalog, installer, host, state store and log each own one concern; route permission, audio parser and CSP stay at transport | — |
| Existing capability reuse | Pass | Composition root and `closeProcessResources`; route table; GraphQL context; the `tar` package; the C3 Ed25519 technique; the sealed `client-data-migrations` area | — |
| Reusable owned structures | Pass | `domain/extension-description.ts` (description, entry, reader, comparison, platform), `domain/extension-item.ts`; the GraphQL type maps them 1:1 | — |
| Shared-structure tightness | Pass | `ExtensionItem` flat, fields per state as the contract table says; `GraphqlServices` carries only `extensions` | — |
| Repeated coordination ownership | Pass | The offer filter, the busy gate and message precedence each live in one place in the Manager | — |
| Empty indirection | Pass | `ServerPartHost` is a real boundary (foreign module load, shape check, containment, bounded status); no other port added | — |
| Separation of concerns / file responsibility | Pass | One concern per file; `extension-manager.ts` 414 lines, one owner | — |
| Ownership-driven dependency | Pass | `api → manager → {catalog, installer, host, store, log}`; extensions code imports nothing of agents, runs or credentials | — |
| Visible dependencies (P16) | Pass — deviation recorded, reason holds | Constructor injection everywhere. The GraphQL context carries the manager instead of a process binding (design deviation 2). `isDesktopEmbeddedNode()`, platform and catalog env are read once in the root as fixed configuration. `registerGraphql`'s parameter is required. | — |
| Authoritative Boundary Rule | Pass | No caller uses both the Manager and its internals; `rest/extensions.ts` asks `pageFile()`, not the store | — |
| File placement | Pass | `src/extensions/{domain,catalog,packages,server-parts,storage,services}`; web `components/settings/extensions/`, `services/extensions/` | — |
| Flat-vs-over-split | Pass | Each folder has a real owner | — |
| Interface clarity | Pass | Every method takes `id` (plus `action`); separate query and mutations; one route per subject | — |
| Naming / one vocabulary | Pass | Extension, catalog, server part, page, action and offered-on are used the same way in code, GLOSSARY and UI. CR-002 is resolved (`extension-catalog.ts:23-24`). | — |
| No unjustified duplication | Pass | The voice part's unpacker is deliberately its own (the package is self-contained, Node built-ins only; design removal plan) | — |
| Patch-on-patch complexity | Pass | 38058ec630 adds one notification line and the suite fixes; no layering | — |
| Dead code in touched files and modules | Pass | CR-001 is resolved. A grep for `getCanonicalExtensionsPath` and `paths.extensions` finds nothing; `'extensions'` in `electron/` and `client-data-migrations/` (tests excluded) appears only as the sealed step's `folderName` | — |
| Test scenarios clear and requirement-aligned | Pass | Manager and route tests are named by AC/NAS/V-ids; traversal includes `..` and `%2e%2e`; 10/10 negative controls caught | — |
| Fixtures and helpers reusable | Pass | `tests/fixtures/extension-packages.ts`, `tests/helpers/test-extension-manager.ts` | — |
| No stale or compatibility-only tests | Pass | Old card spec, real-release spec and removed-module mocks deleted; voice tests rewritten to the action client | — |
| API/E2E readiness | Pass | Probe (`test:e2e:extensions-page`) and real-release test (`test:voice-input-real-release`) are reusable with a dev catalog; AC-009, AC-010, packaged attacher and QR-002 named for API/E2E | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/voiceInputStore.ts` | 453 | 496 | Pass | +43 | Capture plus this computer's availability, microphone and transport: two concerns in one store, already recorded | OK | FU-003 (recorded by implementation): the next change must split | none now |
| `autobyteus-server-ts/src/compositions/build-studio-server.ts` | 464 | 478 | Pass | +14 | root wiring | OK | Pass | — |
| `autobyteus-server-ts/src/extensions/services/extension-manager.ts` | 0 | 414 | Pass | new | one owner: lifecycle, list, gates | OK | Pass | — |
| `autobyteus-web/stores/extensionsStore.ts` | 275 | 183 | Pass | rewritten smaller | page store | OK | Pass | — |
| `autobyteus-web/components/settings/extensions/ExtensionCard.vue` | 0 | 207 | Pass | new | card frame | OK | Pass | — |
| Other new server files (host 123, resolver 122, installer 113, catalog 115, description 113) | 0 | ≤123 | Pass | new | one concern each | OK | Pass | — |
| `autobyteus-extensions/voice-input/server/index.mjs` | 0 | ~260 | Pass | new | one self-contained server part (contract §2) | OK | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | No IPC fallback; nothing reads the old registry |
| No legacy old-behavior retention | Pass | Electron manager, IPC, preload, types and old card all removed |
| Dead code removed in touched files and modules | Pass | CR-001 resolved (IR-002) |
| Approved persisted-data transition followed | Pass | Discard (DEC-016): sealed step holds only the folder name and texts; background `rm`; retried on failure |
| No dual reads/writes or old-shape fallback | Pass | — |
| Transition mechanics match design | Pass | Runner spec: v1, v2, v2+device and `.DS_Store`; deleted once; second start silent; failure retried |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why | Required Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/electron/appDataPaths.ts:12-14` `getCanonicalExtensionsPath` and its expectation `electron/__tests__/appDataPaths.spec.ts:4,15` | UnusedHelper | `git grep getCanonicalExtensionsPath`: only the definition and its own spec | Names the retired `<base data folder>/extensions` outside the sealed step; nothing uses it | Remove the function and the spec line |
| `autobyteus-web/electron/launch-profile/electronLaunchProfile.ts:26,106` `E2EElectronPathPlan.extensions`, and `tests/e2e/electron-launch-profile-probe.mjs:311` | DeadCode | No reader of `paths.extensions` (the Electron extension manager, which owned that folder, is removed) | Same | Remove the field and the probe's expected key |

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: the change adds GLOSSARY, the module doc, DESIGN.md rule 9's second exception and NA-7/NAS-42/43, all present and consistent with the code.
- Lines for delivery's doc sync or the Solution Designer:
  - `design-spec.md:241` ("when the Extensions page opens or the owner presses Try again") does not match the approved UI, which has no Try again control (implementation assumption 5).
  - The catalog public key is a release step (README of `autobyteus-extensions`, design Risks).

## Additional Material Premise Validation

None new or reclassified. The architecture review's residual decisions (import cache, stop during start, message precedence, catalog overrides) are implemented as the design states (`server-part-host.ts:72-73`; `extension-manager.ts:403-423,279`; `extension-catalog-source.ts`).

## Review Scorecard (Mandatory)

- Overall score: 9.41 / 10 (simple average; not the decision rule)

| Priority | Category | Score | Why | Weak / Holding Down | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Every design spine is traceable in code, and the Manager is the one entry | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Manager, host, catalog, installer and store own distinct things; no bypass | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | One subject per call; explicit codes per route; install and update return at once | The 413 wording covers JSON too (rejected C-13) | — |
| 4 | Separation of Concerns and File Placement | 9.3 | Clean folders; files small | `voiceInputStore` at 496, already FU-003 | Split on its next change |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | Flat item with per-state fields; one reader for each contract shape | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | One vocabulary across code, docs and UI; CR-002 resolved | — | — |
| 7 | API/E2E Readiness | 9.4 | Reusable probe and real-release test; gaps named | Packaged attacher not yet exercised (left to API/E2E) | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Lifecycle races handled (busy, start tokens, removing); real runtime and rendered evidence | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.4 | No fallback; old install discarded once | — | — |
| 10 | Cleanup Completeness | 9.4 | About 3,670 lines removed, including dead keys and mocks; the retired folder is now named only in the sealed deletion step (CR-001 resolved) | — | — |

## Findings

No open findings. Both findings are resolved in IR-002 (commit 3961790ab6), verified against the code. See the CRR-002 resolution table in `code-review-revision-record.md`.

- CR-001: resolved. The dead names of the retired desktop extensions folder are removed: `getCanonicalExtensionsPath` and its spec line, `E2EElectronPathPlan.extensions` and the probe's expected key. Evidence: the diff, a repository grep, and IMP-09 (specs 10/10, typechecks pass, probe syntax ok).
- CR-002: resolved. The catalog comment now names the real fetch triggers.

## Follow-ups

- Follow-ups this review added: None. FU-003 (voice store split) was already recorded by implementation and is correctly a follow-up: the file is still under the limit.

## Classification

- None: the review passes. Round 1's `Local Fix` (CR-001, CR-002) is resolved.

## Recommended Recipient

- `/api_e2e_engineer`: implementation review passes, and the package is ready for API/E2E and executable coverage. `/implementation_engineer` gets an informational notice.

## Residual Risks

- **Release blocker:** the catalog public key is empty, so every node is `unverified` until the founder creates the key and it is built in. This is with the Solution Designer.
- Server parts run in-process (accepted deviation): a blocking or crashing server part affects the node.
- Not yet exercised: AC-009, AC-010, the packaged desktop credential attacher and `file://` origin, QR-002, and the iOS demo build. API/E2E owns these.
- The voice runtime needs Homebrew `ffmpeg` on Apple Silicon. The failed-start reason is unit-tested with a scripted worker, not against the real runtime.
- Future package updates that change the runtime must keep the old version working if their `install(ctx)` fails (C-09). This is a note for the next package release, not Stage 1.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 2, Targeted Delta Review)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.41 average; every category ≥ 9.3.
- Recommended Recipient: `/api_e2e_engineer`
- Notes:
  - Still open for API/E2E: AC-003 through the page, AC-004, AC-008 on a packaged build, AC-009, AC-010, QR-002, the packaged desktop credential attacher, and the iOS demo build.
  - The packaged launch-profile probe (`test:e2e:electron`) was not run after the CR-001 edit; its only change is the expected key matching the removed plan key.
  - The empty catalog public key is still a release blocker, with the Solution Designer.
