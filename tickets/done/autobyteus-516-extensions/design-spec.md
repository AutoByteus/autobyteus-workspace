# Design Spec — autobyteus-516 Stage 1: the extension foundation on every node, proven by Voice Input

## Solution And Approval Basis

- Current solution revision ID: `SR-007` (design, with the 2026-11-26 updates: DEC-016…DEC-019, runtime 0.3.2, final check), on requirements `SR-006`.
- Approved requirements baseline: `requirements-doc.md` at SR-006 with DEC-017…DEC-019 and the AC-003 failure wording of the final check. Approved by the founder: SR-001/002 (2026-11-21), contract SR-005 (2026-11-22), DEC-015 delegated, DEC-016, DEC-018, DEC-019 (2026-11-26).
- Behavior-defining supplements: [extension-contract.md](extension-contract.md) (approved SR-005; DEC-015/016 changes); Product's final package (founder approved 2026-11-26; merged into the design repository's `personal` @ 825434bc): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/extensions-ui-516/ui-ux-spec.md`, normative references `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/extensions-ui-516/visual-references/` (VIS-V* for Stage 1), spine coverage `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/extensions-ui-516/round-5-coverage.md`. Component names in this design follow the spec's component table. Superseded by DEC-016 (decided after the package): the spec's REQ-007/AC-008 row ("an existing install is adopted") and VIS-V3-01; after the update Voice Input shows the normal Not installed card (VIS-V2-01).
- User approval of the design: **Obtained.** Founder, 2026-11-26, in the Solution Designer's conversation: "Did you update your contract and then validate yourself if you think like the data flow spine works for every use case then it's approved". The contract was updated and every use case walked (use-case-spines.md, "Final check of Stage 1"; three gaps fixed before this record). Release-time item still open with the founder (not needed to build): he creates the catalog signing key himself and stores it only as a secret of `autobyteus-extensions` (recommended; asked 2026-11-26). Releases only on his word.
- Design status: `Ready` (approved by the founder).
- Canonical investigation notes: [investigation-notes.md](investigation-notes.md).
- Authorities read (design reading gate, 2026-11-26): `references/architecture-design.md`, `references/design-principles.md` (incl. Principle 17), `templates/design-spec-template.md`; project `DESIGN.md` (rules 7–13; rule 13 added in this ticket), `autobyteus-server-ts/docs/design/data_migration_guideline.md` (§§1–4, 6, 7, 9), `node_access_model.md` (route permissions; earlier §1, §5).
- Project design-principle conflicts: none. One deliberate exception already approved: the extension contract is frozen across versions (DESIGN.md rule 9 exception, DEC-012); this change writes it into DESIGN.md.

## Current-State Read

- **Extensions live only in the desktop app's Electron main process** and are typed for one extension: `ExtensionId = 'voice-input'` (`autobyteus-web/electron/extensions/types.ts:1`), voice settings in the generic record (`types.ts:68-86`), IPC channels per operation including `extensions:update-voice-input-settings` and `voice-input:transcribe` (`electron/extensionIpcHandlers.ts:5-55`), created in `electronApplication.ts:398` with `profile.baseDataRoot`, wired at `:371` (imports `:38-39`, field `:68`). Registry `<baseDataRoot>/extensions/registry.json`; every list call inspects files and writes the registry (`managedExtensionService.ts:218-242`).
- **The renderer gates voice on `window.electronAPI`** (`stores/voiceInputStore.ts:21,128`) and transcribes through IPC (`:387`); the Extensions page reads Electron state (`stores/extensionsStore.ts:55-130`).
- **A node has no extension concept** (server `src/` has no extensions area). Server structure the design uses: one composition root `src/compositions/build-studio-server.ts` (owners created and passed in; REST routes registered with their dependencies at `:429`; `registerGraphql(app)` at `:447`, also called by two tests: `tests/integration/api/run-file-changes-api.integration.test.ts:199`, `team-communication-api.integration.test.ts:196`), startup sequence `src/server-runtime.ts` (listen at `:236`, background work after), route permissions `src/api/security/node-route-permissions.ts:60-100` (deny-by-default to owner+phone; a new `/rest/extensions/...` route would be open to phones, SP-1), GraphQL owner check precedent `api/graphql/types/remote-collaboration-settings.ts:77-81`, per-request GraphQL context `api/graphql/graphql-request-context.ts:11-18`. Base for these citations: `origin/personal` @ fdde5406fa (worktree fast-forwarded 2026-11-26 after ARCH-REV-001).
- **The node knows whether it is the desktop's own node**: `isDesktopEmbeddedNode()` (`src/config/desktop-embedded-node.ts:10`), set by the desktop's server environment (`electron/server/serverRuntimeEnv.ts:149`). The embedded node's data dir is `<baseDataRoot>/server-data` (`electron/server/services/AppDataService.ts:21`), its PATH is the user's login-shell PATH (`serverRuntimeEnv.ts:136`).
- **Every window can reach the embedded node**: its address is in the node registry (`stores/nodeStore.ts:171-173`), the desktop attaches the owner credential by request origin (`electron/nodeAccess/nodeCredentialAttacher.ts:30-42`), a window calls another node's GraphQL with `directNodeApolloClient` (`services/nodeCollaboration/directNodeApolloClient.ts:17-31`).
- **Signed-description precedent (C3)**: Ed25519 over exact bytes with Node built-ins (`autobyteus-server-ts/docker/starter/package-verifier.mjs:35-41`), signing script `scripts/server-package/sign-server-package.mjs` (key only from an environment secret, checked against the public key).
- **Client-data migrations of the desktop** run first in `start()` (`electronApplication.ts:391`, `client-data-migrations/electron-file-runner.ts:71-79`), a sealed area as the Data Migration Guideline §3 requires for client stores.
- **The voice worker** ends when its stdin closes (`autobyteus-voice-runtime/runtime/voice_input_worker.py:180`), so it does not outlive the process that spawned it.
- Constraints: DESIGN.md rules 7 (contain bad data), 9 (one release; extension contract exception), 11 (no test-only production code), 12 (gates), 13 (contract first); node access model; Data Migration Guideline.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`.
- Size rationale: a new server subsystem (catalog, package installer, server-part host, state, log, manager), new GraphQL and REST surfaces with route permissions, a sandboxed page bridge in the web app, a rewritten Extensions page and voice transport, removal of the Electron extension manager (~1,640 lines incl. tests) and its IPC, a desktop client-data deletion step, a new extension package repository with a signed catalog and release workflow, docs (GLOSSARY, module doc, DESIGN.md, node access model).
- Architectural risk: `High`.
- Risk rationale: new owner-only routes and a download-and-run path for code (security); a contract frozen across versions (DESIGN.md rule 9 exception); code loaded into the node's own process; a new long-lived child process owned by the node; deletion of the founder's existing install (approved, DEC-016); a cross-repository release with a new signing key.
- Escalation trigger: anything that needs a contract field not in extension-contract.md, a second process model for server parts, a change to the node access gate beyond the route table, or keeping any part of the old Electron path.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| contract-probe (31/31) | `probes/contract-probe/README.md` | Signed catalog, refusals, install/update/remove, actions, bridge (sandbox, CSP, `event.source`) work with the real runtime | Contract parts 1–6; host and bridge shapes | Probe is not product code |
| use-case probe (12/12) | `probes/contract-probe/run-usecase-probe.sh` | Fresh install 75 s / 1.7 GB, dictation after; broken extension contained; log readable | V2, V11, V12; DEC-016 basis | — |
| warm-up probe | `probes/contract-probe/run-warmup-probe.mjs` | Cold first dictation ~30 s on 0.3.0; warm 0.25 s; warm worker ~846 MB | `start` runs the worker; stop after 30 min idle; runtime 0.3.2 (PRE-001, delivered: ready ~1.3 s, first dictation ~0.19 s, runtime team) | re-measured on this Mac in validation |
| spine-probes SP-1, SP-2 | `probes/spine-probes/README.md` | `/rest/extensions/...` defaults to owner+phone; Fastify refuses `audio/wav` without a route-scoped parser | Route table entry; route-scoped parser and limit | — |
| Code | `build-studio-server.ts:429-447`, `server-runtime.ts:236` | Composition root; listen then background work | Manager created in the root; start step after listen | — |
| Code | `node-route-permissions.ts:60-95` | Owner actions by path prefix | Add `/rest/extensions` | — |
| Code | `graphql-request-context.ts:12-18`, `remote-collaboration-settings.ts:77-81` | Per-request context with the client identity; owner check in resolvers | Owner check in the extensions resolver; the manager reaches resolvers through the context | — |
| Code | `desktop-embedded-node.ts:10`, `serverRuntimeEnv.ts:149` | Node knows it is the desktop's own node | `offeredOn: desktop-node` filter | — |
| Code | `AppDataService.ts:21` | Embedded data dir `<baseDataRoot>/server-data` | Extensions folder `<data dir>/extensions` everywhere; old folder `<baseDataRoot>/extensions` is distinct | — |
| Code | `nodeCredentialAttacher.ts:30-42` | Credential attached to every request to a node origin, including frame subresources | Page CSP limits loads to its own `ui/` path; `connect-src 'none'` | — |
| Code (review MP-001) | `api/security/remote-access-request-origin.ts:25-50`, `web-origin.ts`, `node-access-plugin.ts:44-56` | A sandboxed page's CORS-mode loads (fonts, module scripts) send `Origin: null`, which the origin rule refuses before any route; loads without `Origin` (the frame document, classic scripts, stylesheets, images) pass | Contract §2/§5 state the load kinds a page may use; CSP without file fonts or module scripts; the node gate unchanged (AR-003) | Checked through the real node in validation (AC-002) |
| Code | `stores/voiceInputStore.ts:43-46` | Today the microphone gate reads the same window's `extensionsStore.voiceInput` | `voiceInputStore` reads the embedded node's item itself (AR-001) | — |
| Code | `managedExtensionService.ts`, git history | Released registry shapes v1 (v1.2.25), v2 (v1.2.28), v2+`audioInputDeviceId` (v1.2.29) | Deletion step recognises the folder, not the shapes (nothing is read) | — |
| Code | `package-verifier.mjs:35-41`, `sign-server-package.mjs` | Ed25519 verify with Node built-ins; signing from an env secret | Same technique for the catalog, separate key | Founder creates the key (release time) |
| Code | `voice_input_worker.py:180` | Worker loop ends on stdin EOF | No orphan worker when the node process dies | — |

## Intended Change

Move the extension concept from the desktop app to every node: a node-side Extension Manager installs AutoByteus-signed extension packages from a signed catalog, runs their server parts inside the node, routes their actions, serves their pages, and keeps one fact per extension (`enabled`). The desktop shows the extensions of each window's node through owner-only GraphQL and REST. Voice Input becomes the first package (wrapping voice runtime 0.3.2), offered only on the desktop's own node and used by every window. The Electron extension manager and its IPC are removed; the old desktop install is deleted once (DEC-016).

## Change Scope (Mandatory)

- In scope: UC-001…UC-006. Areas: new `autobyteus-server-ts/src/extensions/`; `src/api/graphql/types/extensions.ts`, `src/api/rest/extensions.ts`, route permissions, GraphQL context, composition and startup/shutdown wiring; web Extensions page, extension card/frame/log/bridge, extensions store, voice store transport and microphone setting; Electron removal and one client-data deletion step; one new repository `AutoByteus/autobyteus-extensions` (DEC-018): the `voice-input` package, the signed catalog, packing, checking, signing and release workflows; docs (GLOSSARY, `docs/modules/extensions.md`, DESIGN.md rule 9 exception, `node_access_model.md`).
- Derived consumers (Principle 11): the old `ManagedExtensionState` feeds `extensionsStore`, `voiceInputStore`, `VoiceInputExtensionCard`, `ExtensionsManager`, `types/electron.d.ts`, `preload.ts`, localization keys and two integration tests; each is replaced or removed (Removal plan). The new list payload is read only by the Extensions page and `voiceInputStore`.
- Deliberately left alone: the voice engine (runtime 0.3.2, delivered by autobyteus-655), the recorder worklet and Test panel behavior, Integrations, node access gate logic (only the route table changes), Docker launcher, anything of the Private Network and Shared File System stages (their designs come later), the Product Team's Manage Nodes changes (Private Network stage).
- Follow-ups: FU-001 (phone "pairing" vocabulary), FU-002 (Settings narrow width). None new from design.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger / Contract | Existing Behavior And Evidence | Approved Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001/002/003/011, AC-001/002/003/004/010 | Settings → Extensions | Electron card (investigation BEH-001) | List of the window's node from the signed catalog; install/update/remove/on-off | DS-001, DS-002, DS-003 |
| BEH-002 | System | REQ-006/012, AC-007 | Microphone button | IPC → Electron worker (BEH-002) | Embedded node's Voice Input via action route; warm at start | DS-004, DS-007 |
| BEH-003 | User | REQ-006, AC-007 | Five voice surfaces | gated on Electron (BEH-003) | Same surfaces, gated on the embedded node's Voice Input installed+on+ready | DS-004 |
| BEH-004 | User | REQ-008, AC-009 | Remote node window | uses this computer's runtime | Unchanged for the user: WAV goes to the embedded node | DS-004 |
| BEH-005 | Operational | REQ-001, AC-010 | Docker/Linux node window | none | That node's list (Voice not offered there) | DS-001 |
| BEH-006 | Contract | REQ-005, AC-006 | Phone / no credential | — | Refused (owner only) | DS-001…DS-006 |
| BEH-007 | Data | REQ-007, AC-008 | App update | founder's install | Old folder deleted once; Install again | DS-008 |
| BEH-008 | System | REQ-004/009, AC-005/011 | Broken package, bad state file, failing status | "incomplete" error | Only that card Failed; node and others work; nothing deleted | DS-001, DS-006 |
| BEH-009 | User | REQ-010, AC-012 | Docs | — | GLOSSARY + module doc | — |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| [extension-contract.md](extension-contract.md) | The data contract (parts 1–7) | REQ-002..007, 011, 012 | The design's data contract; this spec adds the internal shapes of part 6 | Approved (SR-005) + DEC-015/016 |
| [use-case-spines.md](use-case-spines.md) Part V | Business flow and validated spine per use case | UC-001..005 | The spine inventory below derives from V1–V13 | Validated; V3 replaced (DEC-016) |
| `probes/` | Contract, use-case, warm-up, spine probes | — | Validation evidence | Throwaway; not product code |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/extensions-ui-516/ui-ux-spec.md` + `visual-references/` | Approved UI (VIS-V* for Stage 1) | REQ-001..012 | Page, card, frame, dialogs, microphone panel and texts the implementation follows (Implementation Fidelity Boundary) | Approved, final; REQ-007 row and VIS-V3-01 superseded by DEC-016 |
| [staged-plan.md](staged-plan.md) | Later stages | REQ-010 | Shows Private Network will join as an `every-node` extension with `start` | Informative |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement` (feature + relocation).
- Current design issue found: `Yes`.
- Structural triggers that fire:
  - **Boundary or ownership**: the extension owner sits in the desktop shell, so a headless node cannot have one (DEC-001). Response: one owner per node (Extension Manager) on the server; Electron keeps none.
  - **Shared-structure tightness**: the generic record carries voice settings (`types.ts:68-86`). Response: AutoByteus keeps only `enabled`; each extension keeps its own settings in its folder (contract §7).
  - **Data contract** (Principle 17): contract written and validated first (extension-contract.md, probes); the internal list payload is written here.
  - **Persisted-data transition**: old desktop registry and install → `Discard` (DEC-016); new `state.json` is new data.
  - **Capability-area reuse**: startup/shutdown (reuse the composition root and `closeProcessResources`), logging (an extension's own file log, see reuse check), signature verification (same Node built-in technique as C3, not the starter's code, which is a separate package).
  - **Several kinds**: extensions offered on `desktop-node` vs `every-node`; windows of the embedded node vs another node; JSON vs audio actions. Each traced below.
  - **Hidden dependency** (Principle 16): GraphQL resolvers are created by type-graphql. Response: the manager reaches them through the per-request GraphQL context built in the composition root, not a process binding.
  - **Empty indirection**: the server-part host is a real boundary (loads foreign modules, validates their shape, wraps their failures); no other port is added.
- Deliberate deviations: (1) server parts run inside the node's process, not in a child process: first-party signed code (DEC-011), and the probes show the shape works; a child-process host would add IPC and lifecycle machinery for a threat the signature already covers. Cost accepted: a server part that blocks the event loop blocks the node (risk below). (2) The GraphQL context carries the manager while other resolvers use process bindings (`getProcessRemoteCollaboration`): the context keeps the dependency visible and needs no global; it does not change the existing resolvers.
- Root cause classification: `Boundary Or Ownership Issue`.
- Refactor needed now: `Yes`.
- Evidence: Current-State Read.
- Design response: new server subsystem as owner; Electron manager removed; web talks to nodes.
- Refactor rationale: adding Private Network/Shared File System on the Electron manager would need a second manager on servers.
- Intentional deferrals: process isolation of server parts; events pushed to pages; a CLI for headless nodes (DEC-006).

## Terminology

Domain words this design uses (GLOSSARY gets **Extension**, **Extension catalog**, **Server part**, **Extension page** in this change; existing: node, this node, owner credential, integration):

- **Extension**: an AutoByteus-signed package a node installs from the signed catalog: its description (`extension.json`), its server part, its page, and the programs it downloads (contract §1–2).
- **Extension catalog**: the signed list of extensions AutoByteus offers (contract §3).
- **Server part**: the extension's `server/index.mjs`, run by the node (contract §4).
- **Extension page**: the extension's `ui/index.html`, shown in its card in a sandboxed frame (contract §5).
- **Action**: one named operation of a server part, called by AutoByteus or the extension page.
- **Offered on**: `desktop-node` (the desktop app's own node, "this computer") or `every-node`.

## Data Contract (Mandatory When The Change Stores Or Exchanges Data)

- Contract location: [extension-contract.md](extension-contract.md) parts 1–7 (authoritative; parts 1–5 frozen across versions). This section adds the AutoByteus-internal shapes of part 6 (list payload, action route errors) and the desktop's microphone setting, which the contract names but does not spell out.
- Shown to the user: contract approved 2026-11-22 (SR-005); DEC-015 additions informed 2026-11-26; DEC-016 storage change decided by the founder 2026-11-26. The additions below are presented with this design for approval.

| Record / Message | Stored Where / Boundary | Field | Meaning | Written By | Read By |
| --- | --- | --- | --- | --- | --- |
| `extension.json` / catalog entry | package root / catalog | per contract §1, §3 | — | author / catalog build | Catalog, Package Installer, list |
| `state.json` | `<data dir>/extensions/state.json` | `{ [id]: { enabled } }` | the only fact AutoByteus keeps per extension; an entry exists only for an installed extension | Extension Manager (install success, on/off, remove) | Extension Manager (list, start, actions) |
| package | `<id>/package/` | unpacked package | installed version = `package/extension.json` | Package Installer (atomic rename) | Server Part Host, list |
| extension data | `<id>/data/` | the extension's own files (`ctx.dir`) | — | the server part | the server part |
| extension log | `<id>/extension.log` | `<ISO time> <line>` per line | what the extension and the manager did | Extension Log (manager + `ctx.log`) | `extensionLog` query |
| **ExtensionList** (GraphQL `extensions`) | node → window | `catalog` | `verified` · `unverified` · `unreachable` | Catalog | page notes (V13-01/03); Install/Update enabled only when `verified` |
| | | `platform` | this node's `<os>-<cpu>` (`thisPlatform()`, the same value the platform check uses) | Manager | card text for `notAvailableHere`/`platform` (VIS-V1-05: "There is no build for this computer, {platform}…") |
| | | `extensions[]` | one **ExtensionItem** per extension offered on this node (catalog entries for this node's offer; installed ones always) | Extension Manager | page, voice store |
| **ExtensionItem** | node → window | `id` | contract id | — | page, voice store |
| | | `name`, `description`, `translations` | from the installed package, else the catalog entry; `translations` is the contract's optional map | Manager | card |
| | | `platforms` | contract `platforms` | Manager | "Not available" text |
| | | `state` | `notAvailableHere` · `notInstalled` · `installing` · `updating` · `installed` · `failed` | Manager | card, voice store |
| | | `catalogVersion` | the catalog's version, `null` when no verified catalog lists it | Catalog | Install / Update labels, "needs a newer AutoByteus" |
| | | `notAvailableReason` | `platform` · `newerAutoByteus` (only in `notAvailableHere`) | Manager | card text (V1-05, V13-04) |
| | | `progress` | `{ message, percent \| null }` (only `installing`, `updating`) | Manager (from `ctx.progress`) | card |
| | | `installedVersion` | from `package/extension.json` (`installed`, `updating`, `failed` when readable) | Manager | card |
| | | `enabled` | `state.json` (installed, failed with a package) | Manager | switch, voice store |
| | | `ready`, `message` | from `status()`; `message` also carries a start failure | server part / Manager | card, voice store (button only when `ready`) |
| | | `starting` | `start()` is running now | Manager | card spinner (DC-089, Private Network later) |
| | | `update` | `available` · `needsNewerAutoByteus` · `none` (installed only) | Manager (catalog vs installed) | Update button / note (V9-01, V13-05) |
| | | `failureMessage` | why `failed` (unreadable package, `status()` threw, install/update failed) | Manager | card |
| `extensionLog(id)` | node → window | `lines[]` | last 200 lines | Extension Log | log dialog |
| Action call | `POST /rest/extensions/:id/actions/:action` | body JSON or `audio/wav` (≤ 100 MB, about 17 minutes at 48 kHz; today's dictation has no length limit, so the limit is generous and refused with `RECORDING_TOO_LONG`) | contract §6 | page bridge, voice store | Server Part Host |
| | response | `200 { output }` · `4xx/5xx { code, message }` with `code` ∈ `EXTENSION_NOT_INSTALLED`, `EXTENSION_OFF`, `EXTENSION_BUSY`, `UNKNOWN_ACTION`, `RECORDING_TOO_LONG`, `ACTION_FAILED` | Action route | bridge (→ `{ok:false,error}`), voice store (failure state) |
| Microphone choice | renderer `localStorage['autobyteus.voiceInput.microphone']` | device id or absent (system default) | this computer's choice; all windows share the packaged renderer's origin | Microphone section | recorder |

- Identities and relationships: an extension is identified by `id` everywhere (catalog entry, `state.json` key, folder name, routes). Installed ⇔ `<id>/package/extension.json` is valid; `state.json[id].enabled` says On/Off, and an installed extension without an entry is Off (an unreadable `state.json` therefore shows every installed extension Off, V12-02). The catalog is not stored; the node keeps the last verified copy in memory for the process.
- Invariants and lifecycle: `notInstalled →(Install) installing →(success) installed{enabled:true}`: unpack into `<id>/package.new/`, load the server part from there, `install(ctx)`, rename to `package/`, write `enabled: true`, `start()`. An install cut short (app closed) leaves no `package/`: `notInstalled`, and the next Install removes `package.new/` first. Install failure → `failed` in memory (log keeps the reason; `data/` kept for the next Install); after a restart `notInstalled`. `installed →(Update) updating → installed`: stop, new package into `package.new/`, `install(ctx)`, swap folders, start if On; `data/` and `enabled` kept. Update failure → the old package stays and runs again if On; the card is `installed` with the message "Update to x failed: reason" and Update still offered. `installed →(Remove) notInstalled` (stop, delete `<id>/`, then the entry). On/off writes `enabled`; off stops the server part. An unreadable `state.json` reads as "no entries" and is not rewritten until a change (V12); a present but unreadable package is `failed` and never deleted.
- Examples (one per case): see the contract's examples, plus:

```json
{ "catalog": "verified", "extensions": [
  { "id": "voice-input", "name": "Voice Input", "state": "installed", "catalogVersion": "1.0.0", "installedVersion": "1.0.0",
    "enabled": true, "ready": true, "starting": true, "message": "Getting ready: the speech model is loading (about 30 seconds).",
    "update": "none", "platforms": ["darwin-arm64","darwin-x64","linux-x64","win32-x64"], "translations": {"zh-CN": {"name": "语音输入", "description": "…"}} } ] }
{ "catalog": "unreachable", "extensions": [] }
{ "id": "voice-input", "state": "notAvailableHere", "notAvailableReason": "newerAutoByteus", "catalogVersion": "2.0.0" }
{ "id": "voice-input", "state": "installing", "progress": { "message": "Preparing the speech model (downloads about 2 GB once)…", "percent": null } }
{ "id": "voice-input", "state": "failed", "failureMessage": "server/index.mjs could not be loaded: …", "installedVersion": null }
```

### Data Contract Validation

| Use Case | Flow Step (Refusals Included) | Reads | Writes | Served? |
| --- | --- | --- | --- | --- |
| V1 list | catalog fetch + verify; offer filter; state; package; status | catalog, `state.json`, `package/extension.json`, `status()` | — | Yes (CP, UP) |
| V1 | Docker window: desktop-node entries absent | `offeredOn`, `isDesktopEmbeddedNode()` | — | Yes |
| V1 | catalog offline / unverified | fetch error / signature | — | Yes: `catalog` field added (V13-01/03 need it) |
| V2 install | download, sha256, unpack, compare, `install(ctx)` with progress, then On | catalog entry | `package/`, `data/`, `state.json`, log | Yes; entry written last (no half-installed entry) |
| V2 | checksum / mismatch / contract / platform refusals | entry, package | log | Yes (CP) |
| V3 | old install | `<baseDataRoot>/extensions` exists | deletes it | Yes (DEC-016) |
| V4 on/off | switch | `state.json` | `enabled`; `stop()` / `start()` | Yes |
| V5/V6 dictate | WAV → embedded node → `transcribe` | `enabled`, package, `actions` | temp WAV in `data/temp` | Yes (CP, SP-2) |
| V7 language | bridge → `setLanguage` | `actions` | `data/settings.json` | Yes |
| V8 microphone, Test | renderer setting; Test = V5 | localStorage | localStorage | Yes |
| V9 update | catalog higher → replace package, `install(ctx)` | entry vs installed | `package/` | Yes; `updating` state added (V9-02 text) |
| V10 remove | stop, delete | — | removes `<id>/`, entry | Yes |
| V11 log | tail | `extension.log` | — | Yes |
| V12 broken | unreadable package / state / throwing status | files | log warning only | Yes (UP) |
| V13 refusals | phone/no credential; unknown or inherited action; off; busy | identity, `actions` own keys | — | Yes |
| REQ-012 warm | `start()` at node start and on turn-on; `starting` shown | `enabled` | — | Yes: `starting` field added (DC-089) |

- Checks run: contract-probe 31/31, use-case probe 12/12 (real downloads, real runtime), warm-up probe, SP-1/SP-2 against this repository (all read-only to the founder's data; evidence paths above).
- Contract changes the validation caused: `server/index.mjs` (CP); `event.source` check (CP); delete archives after unpacking (UP); route-scoped audio parser (SP-2); owner-only route entry (SP-1); optional `start` (REQ-012); this design adds `catalog`, `updating`, `starting` and `update` to the internal list payload, and the action error codes.

## Persisted Data / State Transition Decision

- Stored subjects: (1) the old desktop install `<baseDataRoot>/extensions/{registry.json, voice-input/}` (~1.7 GB on the founder's Mac; released shapes v1 since v1.2.25, v2 since v1.2.28, v2 + `audioInputDeviceId` since v1.2.29); (2) new `<data dir>/extensions/`.
- Decision (1): `Discard or Rebuild` — approved by the founder (DEC-016). Rebuild mechanism: Install from the catalog; runtime and model are re-downloaded from pinned, checksummed releases; language and microphone chosen again. Nothing reads the old files.
- Decision (2): `Not Affected` (new data). Reader is tolerant (a projection of `enabled` per id; unknown fields ignored); writer writes the exact shape by temp file + rename.
- Data Migration Guideline checklist (§2): 1 Need: no conversion; one deletion of discarded data. 2 Availability: the deletion never blocks startup (background, failure logged). 3 Source/target: recognised by structure (the folder exists); the shapes are not read, so every released shape is handled the same; fixtures: v1, v2, v2+device, plus an unrelated `.DS_Store`. 4 Disposition: deleted, or kept and retried at the next start on failure. 5 Commit/retry: `fs.rm` recursive; idempotent (absent → nothing). 6 Current-only: lives in `client-data-migrations/migrations/remove-desktop-voice-input-install/`; current code never names the old folder. 7 Cost: one recursive delete, once. 8 References: none. 9 Evidence: AC-008 desktop startup test on synthesized data. 10 Lessons: `remove-external-messaging-data-migration.ts` (deletion after an explicit approval); no backup (approved discard).

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior IDs | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001/005/006/008 | Extensions page opens | cards with states | Extension Manager | What a node offers and has |
| DS-002 | Primary | BEH-001 | Install / Update | installed, On | Extension Manager | Download-and-run path |
| DS-003 | Primary | BEH-001 | Switch / Remove | Off+stopped / gone | Extension Manager | Lifecycle |
| DS-004 | Primary | BEH-002/003/004 | Microphone button | text in the draft | Extension Manager (route) → Voice server part | The proving use |
| DS-005 | Primary | BEH-001 | Extension page call | reply in the page | Extension Page Bridge (web) → Manager | Extension-owned UI |
| DS-006 | Bounded local | BEH-008 | node start | each extension started or failed | Extension Manager | Start/stop and containment |
| DS-007 | Bounded local | BEH-002 (REQ-012) | `start()` / transcribe | warm worker / unloaded after idle | Voice server part | Warm-up and memory |
| DS-008 | Primary | BEH-007 | desktop start | old folder gone | Desktop client-data migration | One-time discard |
| DS-009 | Return | BEH-001 | install progress / start | page refresh | Extension Manager | Long operations without holding a request |

## Primary Execution Spine(s)

- DS-001: `Extensions page (open) → extensionsStore → node GraphQL extensions(refreshCatalog: true) (owner check) → Extension Manager.list → Extension Catalog (fetch + verify, ≤ 10 s; polls and voice reads: the copy in memory) + Extension State Store + Server Part Host.status → ExtensionList → cards`
- DS-002: `Card Install → GraphQL installExtension (owner) → Extension Manager.install → Extension Catalog fetch (must verify) → Package Installer (download, sha256, unpack, compare, rename into package/) → Server Part Host.load + install(ctx) → Extension State Store.write(enabled:true) → Server Part Host.start → (page polls DS-009)`
- DS-003: `Switch / Remove → GraphQL setExtensionEnabled / removeExtension (owner) → Extension Manager → Server Part Host.stop → State Store (enabled / delete entry) → delete <id>/ (remove)`
- DS-004: `voiceInputStore.refreshAvailability → directNodeApolloClient(embedded node) → extensions query (owner, cached catalog only) → voice-input item installed && enabled && ready → Microphone button shown → voiceInputStore → recorder (chosen microphone) → Extension Action Client POST <embedded node>/rest/extensions/voice-input/actions/transcribe (audio/wav; owner credential attached by the desktop) → route permission (owner) → action route → Extension Manager.callAction (installed, on, not busy, own action) → Server Part Host → voice server part.transcribe → worker → { text, noSpeech, detectedLanguage } → draft`
- DS-005: `Extension page (sandboxed frame) → postMessage {id, call, input} → Extension Page Bridge (only its frame's event.source) → Extension Action Client POST <window's node>/rest/extensions/:id/actions/:call (JSON) → (as DS-004 from the route) → reply → postMessage {id, ok, output|error}`
- DS-008: `Desktop start → runElectronFileMigrations(userData, baseDataRoot) → remove-desktop-voice-input-install (background rm of <baseDataRoot>/extensions) → log`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The page asks the window's node for its extensions. The manager takes the verified catalog's entries offered on this node, joins each with `state.json`, the installed package and `status()`, and returns one item per extension. Installed extensions are listed even when the catalog is unreachable or unverified. | page, store, resolver, manager | Extension Manager | catalog fetch/verify, state read, status call with containment, log |
| DS-002 | Install starts and returns at once with `installing`; the manager downloads and verifies the package, renames it into place, loads the server part and runs `install(ctx)` with progress, writes `{enabled:true}` last, then runs `start`. Update is the same with the old package kept until the new one is in place. | resolver, manager, installer, host | Extension Manager | download, checksum, unpack, log |
| DS-003 | Off stops the server part and writes `enabled:false`; On writes `true` and starts it. Remove stops, deletes the extension's folder, then its entry. | resolver, manager, host | Extension Manager | state write |
| DS-004 | Every window records with this computer's microphone and sends the WAV to the embedded node's action route; the node checks owner, installed, on and the action name, and the voice server part transcribes with its worker. | voice store, action client, route, manager, host, server part | Extension Manager | route permission, audio parser, temp file |
| DS-005 | The extension page can only post messages; its card's bridge accepts them from its own frame and turns each into an action call on the window's node. | page, bridge, action client, route | Extension Page Bridge | `locale` on load, `resize` |
| DS-008 | Before the embedded node starts, the desktop deletes the old install once, in the background. | runner, migration | client-data migration | log |

## Spine Actors / Main-Line Nodes

Extensions page · `extensionsStore` · Extensions GraphQL resolver · Action route · Extension Manager · Extension Catalog · Package Installer · Server Part Host · Extension State Store · voice server part · `voiceInputStore` · Extension Action Client · Extension Page Bridge · desktop client-data migration.

## Ownership Map

- **Extension Manager** (server): the lifecycle of each extension on this node: the list's states, the order of install/update/remove/on/off/start/stop, one lifecycle operation per extension at a time (`EXTENSION_BUSY` otherwise), in-memory progress, install/update failures and start failures, the gate of every action call (installed, on, not busy). The only writer of `state.json`.
- **Extension Catalog**: fetching `extensions-catalog.json` + `.sig`, Ed25519 verification over the exact bytes with the built-in public key, parsing entries, the last verified copy in memory; answers `verified`/`unverified`/`unreachable` (the result of the latest fetch; entries from the last verified copy). **Fetch policy (AR-002):** a fetch happens only (1) once in the background after the node listens, (2) when the Extensions page opens (`extensions(refreshCatalog: true)`; the approved UI has no "Try again" control, so opening the page again is the retry), and (3) at the start of Install and Update, which refuse unless that fetch verifies. Each fetch is bounded by 10 s; fetches running at the same time share one request. Every other call (the page's 1 s polls, the voice availability reads, `refreshCatalog: false`) uses the copy in memory and never waits on the network; with no copy yet it answers `unreachable` and still lists installed extensions.
- **Package Installer**: download of `packageUrl`, SHA-256, unpack into `<id>/package.new/` (entries outside it refused), layout check (`extension.json`, `server/index.mjs`, `ui/index.html`), equality of `extension.json` with the entry (minus `packageUrl`, `sha256`); after the Manager's `install(ctx)` succeeds, the swap into `package/` (update: old package renamed aside and deleted after the swap; on failure `package.new/` is deleted and the old package stays).
- **Server Part Host**: loading `package/server/index.mjs` (a fresh import URL per installed version), checking its shape, building each `ctx` (`dir`, `platform`, `log`, `progress`), calling `install`/`start`/`status`/`stop`/actions with failures turned into results; only own `actions` keys are callable.
- **Extension State Store**: tolerant read and exact atomic write of `state.json`; folder paths of an extension.
- **Extension Log**: appending lines to `<id>/extension.log` (capped at 1 MB: the older half dropped), reading the last lines.
- **Extensions resolver / action route / page route**: thin transport entries (owner check, parsing, error mapping); no policy.
- **Voice server part** (`autobyteus-extensions/voice-input/`): its runtime and model in `ctx.dir`, its worker (start, warm, idle unload after 30 min, stop), its settings file, its actions.
- **`extensionsStore`** (web): the list of the window's node and its calls; polls while an item is `installing`, `updating` or `starting`.
- **`voiceInputStore`** (web): **this computer's Voice Input availability** — it reads the embedded node's `voice-input` item itself, in every window, with the `extensions` query through `directNodeApolloClient(<embedded node address from nodeStore>)` (no catalog fetch, AR-002), and shows the microphone button only when it is `installed && enabled && ready`. Refreshed: when the window starts; when a voice surface mounts; when the window regains focus (covers a change made in another window); right after this window's Extensions page changes `voice-input` on the embedded node (the page calls `voiceInputStore.refreshAvailability()`); and when an action call answers `EXTENSION_OFF` or `EXTENSION_NOT_INSTALLED` (then the button hides at once). Also recording, the transcription call, the microphone choice.
- **Extension Page Bridge** (web): the frame's message protocol (contract §5).

## Thin Entry Facades / Public Wrappers

| Facade | Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ExtensionsResolver` | Extension Manager | GraphQL transport, owner check | lifecycle rules, state |
| `registerExtensionRoutes` (action + page) | Extension Manager / Server Part Host via manager | REST transport, body parsing, CSP headers | action gating |

## Removal / Decommission Plan (Mandatory)

| Item To Remove | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/electron/extensions/` (types, catalog, managedExtensionService, voice-input/*, tests; ~1,640 lines) | The node owns extensions | `autobyteus-server-ts/src/extensions/` + voice package | Download/unpack helpers reappear in the voice server part, not shared |
| `electron/extensionIpcHandlers.ts`; `electron/application/electronApplication.ts:38-39,68,371,398` | Same | GraphQL/REST to nodes | — |
| `preload.ts:147-158` members and `types/electron.d.ts` extension/voice members | Same | — | — |
| `components/settings/VoiceInputExtensionCard.vue` (+ spec) | Generic card + extension page + AutoByteus microphone section | `ExtensionCard.vue`, voice package `ui/index.html`, `VoiceMicrophonePanel.vue` | Language moves to the page |
| `stores/extensionsStore.ts` Electron transport (rewritten in place) | Same | GraphQL | Reinstall / Open folder removed (DEC-015) |
| `voiceInputStore.ts` `window.electronAPI` gating and IPC transcribe | Same | action client to the embedded node | — |
| `tests/integration/voice-input-extension.integration.test.ts`, `composer-voice-lifetime…` (IPC mocks) | Their transport is gone | rewritten against the action client (outcomes unchanged) | AC-007 |
| Localization keys of the old card (`settings.ts`) not used by the new card | Dead after the change | new keys | generated files regenerated |
| Old install on disk | DEC-016 | deletion step | once |
| `autobyteus-web/package.json:29` script `test:voice-input-real-release` (→ `managedExtensionService.realRelease.spec.ts`) | Its test is removed | AC-002's real-release install test moves to the server: `autobyteus-server-ts/tests/real-release/voice-input-extension.real-release.test.ts`, script `test:voice-input-real-release` in `autobyteus-server-ts/package.json`, opt-in like today's: installs `voice-input` through a catalog (the published one, or before the first release a development catalog via `AUTOBYTEUS_EXTENSIONS_CATALOG_URL/_PUBLIC_KEY`), with the real runtime 0.3.2 download, then transcribes a clip | — |
| `vi.mock` of the removed modules in `electron/application/__tests__/ElectronAutomaticUpdateWiring.spec.ts:31-32` and `ElectronInstallPreparation.spec.ts:27-28` | Modules gone | — (mocks deleted) | — |
| `stores/__tests__/voiceInputStore.spec.ts` IPC `transcribeVoiceInput` mocks | Transport gone | mocks of `extensionActionClient` and the embedded-node read | outcomes unchanged |
| `tests/e2e/fixtures/composer-voice-lifetime.page.vue:55`, `tests/e2e/projects-voice-cases.mjs:19` | Use the IPC transport | the action route / embedded-node read | outcomes unchanged |
| `types/electron.d.ts:27-31,109` | Extension and voice members of `electronAPI` | — | — |

## Return Or Event Spine(s)

DS-009: long operations (install 75 s+, update, start ~30 s) return at once; the page refreshes the list every 1 s while any item is `installing`, `updating` or `starting` (today's polling pattern, `stores/extensionsStore.ts:72-77`). No push events in Stage 1.

## Bounded Local / Internal Spines

- **DS-006, inside Extension Manager**: `node listening → for each state entry with enabled → load server part → start() (background, one per extension, not awaited by startup) → starting=false; failure → message "Could not start: …" + log`; `node closing → for each loaded → stop() (bounded 5 s each) → done`.
- **DS-007, inside the voice server part**: `start(ctx) → spawn worker (backend by platform) → await ready (0.3.2: written only after the model is loaded and one transcription is done; a failed start writes no ready, one stderr line with the reason and exits 1 → the server part rejects with that reason, the card shows "Could not start: <reason>" and `status()` reports not ready, so the microphone button is hidden) → idle timer`; `transcribe → (spawn if absent) → write temp WAV → request line → response → delete temp → reset idle timer`; `idle 30 min → stop worker`; `stop() → kill worker, await exit`.
- **Install inside Extension Manager**: `busy(id) → remove leftover package.new/ → progress "Downloading {name} {version}" → installer (into package.new/) → host.load(package.new) → install(ctx) → rename package.new → package → state write enabled:true → busy cleared → host.load(package) → start`.

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves | Responsibility | Why | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| Route permission entry | DS-004/005, pages | node access gate | `/rest/extensions` owner only | SP-1 | phones reach actions |
| Audio body parser | DS-004 | action route | `audio/wav` ≤ 100 MB, route-scoped | SP-2 | global parser changes other routes |
| Page CSP | DS-005 | page route | `sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline' <node>/rest/extensions/<id>/ui/; style-src 'unsafe-inline' <node>/rest/extensions/<id>/ui/; img-src <node>/rest/extensions/<id>/ui/ data:; font-src data:; connect-src 'none'; form-action 'none'`. Matches contract §2: inline code, classic scripts, stylesheets and images from `ui/`, fonts as `data:` only; no module scripts loaded from files (they and file fonts are CORS loads with `Origin: null`, which the node's origin rule refuses; the gate stays unchanged, AR-003) | credential attached to node-origin loads | page reaches node APIs |
| Catalog source | DS-001/002 | Catalog | URL + public key built in; `AUTOBYTEUS_EXTENSIONS_CATALOG_URL` / `…_PUBLIC_KEY` for an extension developer's own catalog (read once at startup) | developing a package before release | test-only code (rule 11) |
| Extension Log | all | Manager, server parts | file per extension | V11 | logs mixed with server log |
| Platform | DS-001/002 | Manager | `${process.platform}-${process.arch}` | contract `platforms` | — |

## Ownership Boundaries

Authority changes hands at: the window → node boundary (GraphQL/REST with the owner credential); the Manager → Server Part Host boundary (AutoByteus code → extension code; everything the extension returns or throws is checked or contained here); the AutoByteus page → extension page boundary (postMessage only). The Manager is the only entry for lifecycle and actions; routes never call the host, installer or state store directly.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| Extension Manager | Catalog, Package Installer, Server Part Host, State Store, Log | resolver, action route, page route, composition (start/stop) | a route calling the host or reading `state.json` | add a Manager method |
| Server Part Host | imported module objects | Manager | Manager touching `module.actions` directly | host method |
| Extension Page Bridge | frame messaging | ExtensionCard | the page calling REST itself (blocked by CSP anyway) | bridge message |

## Dependency Rules

- `api/*` → `extensions/services/extension-manager` only. Manager → catalog, installer, host, state store, log. Host → nothing of AutoByteus beyond the log. Extensions code imports no agent, run, Project or credential code (contract §4: no such access).
- Composition: `composeExtensions({ dataDir, platform, offeredHere, catalogSource })` in `build-studio-server.ts` creates the Manager with its collaborators (constructor arguments). The Manager goes to `registerRestRoutes` (dependency argument) and to `registerGraphql(app, { extensions })`, which puts it in each request's context. `server-runtime.ts` calls `extensions.startEnabled()` after `app.listen` (background, never awaited by startup); `closeProcessResources` awaits `extensions.stopAll()`.
- Process-wide bindings added: none. Values read process-wide: platform, `isDesktopEmbeddedNode()`, catalog source env (configuration fixed before startup).
- Web: the Extensions page calls the window's node through `extensionsStore`; `voiceInputStore` reads the embedded node's list through `directNodeApolloClient` (the existing client for a node other than the window's) and posts actions through `extensionActionClient`; `extensionsStore` calls `voiceInputStore.refreshAvailability()` after a lifecycle change of `voice-input` (a notification, no data passed); the extension page reaches nothing but the bridge.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `query extensions(refreshCatalog: Boolean = false): ExtensionList` | this node's extensions | list; `refreshCatalog` fetches the catalog first (≤ 10 s), otherwise the copy in memory | — | owner only |
| `query extensionLog(id): [String]` | one extension | last 200 lines | `id` | owner only |
| `mutation installExtension(id)`, `updateExtension(id)`, `removeExtension(id)`, `setExtensionEnabled(id, enabled)` | one extension | lifecycle; return its `ExtensionItem` | `id` | owner only; install/update return at once |
| `POST /rest/extensions/:id/actions/:action` | one action of one extension | call | `id` + `action` | owner only (route table) |
| `GET /rest/extensions/:id/ui/*` | one extension's page files | serve from `package/ui/` | `id` + path inside `ui/` | owner only; path traversal refused |
| `ExtensionManager` methods | as above + `startEnabled()`, `stopAll()` | — | `id` | — |
| `ServerPartHost.load(id, packageDir, dataDir)` → `LoadedServerPart` with `install/start/status/stop/call(action, input)` | one loaded server part | wraps foreign code | — | real boundary (foreign code), not an empty port |

## Interface Boundary Check

All interfaces take one subject (`id`, plus `action` for the route); no generic selectors. Responsibility singular: Yes. Ambiguous selector risk: Low.

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Same Everywhere? | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| extension | Extension | Yes | Yes (GLOSSARY added) | integration confusion | GLOSSARY entry with the difference |
| catalog | Extension Catalog | Yes | Yes | — | — |
| server part | Server part / `ServerPartHost` | Yes | Yes | "plugin" | not used |
| page | Extension page | Yes | Yes | "panel" | not used |
| state file | `state.json` / `enabled` | Yes | Yes | old `status` field | old registry discarded |
| desktop-node | `offeredOn: desktop-node` | Yes | contract word | "embedded" in code | Manager maps `desktop-node` ⇔ `isDesktopEmbeddedNode()` in one place |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| startup / shutdown | composition root, `closeProcessResources` | Reuse | one order |
| owner check | node access gate + route table; resolver `clientIdentity` | Extend | one entry in the table |
| signature verify | C3 technique (Node `crypto.verify`) | Reuse technique | the starter is a separate package; ~10 lines |
| logs | server app logger | Create New (per-extension file) | the card shows one extension's log (V11); the server log mixes everything |
| capability switch | `application-capability` | Not reused | an extension's state is its own record, not a server setting |
| client migration | `client-data-migrations` | Extend | sealed area for desktop files |
| polling list | today's extensions page polling | Reuse pattern | — |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/extensions/` | catalog, packages, server parts, state, log, manager | DS-001…DS-006 | Create New |
| `src/api/graphql/types/extensions.ts`, `src/api/rest/extensions.ts` | transport | DS-001…DS-005 | Create New |
| `src/api/security/node-route-permissions.ts` | permission | DS-004/005 | Extend |
| web `components/settings/extensions/`, `stores/extensionsStore.ts`, `services/extensions/` | page, card, frame, bridge, action client | DS-001…DS-005 | Create New / rewrite |
| web `stores/voiceInputStore.ts`, `components/voice/…` | voice surfaces | DS-004 | Extend |
| `autobyteus-web/client-data-migrations/` | old install deletion | DS-008 | Extend |
| `AutoByteus/autobyteus-extensions` (one public repository, DEC-018) | every extension's package (wrapper) in its own folder, released per extension; the signed catalog and the only signing key | DS-001/002/007 | Create New |

## Draft File Responsibility Mapping → Reusable Owned Structures → Final

Reusable structures: the contract types (`ExtensionDescription`, catalog entry = description + `packageUrl` + `sha256`) are used by catalog, installer and manager → one file `domain/extension-description.ts` with the tolerant reader; the list item type is used by manager and resolver → `domain/extension-item.ts` (the GraphQL type maps it 1:1, no recomputation). Shared Structure Tightness: each list field has one meaning and is set only in the states listed in the contract table (Yes/Yes/Low). No other shared base.

## Final File Responsibility Mapping

| File | Owner | Concern |
| --- | --- | --- |
| `src/extensions/domain/extension-description.ts` | contract | `extension.json`/entry types, reader, `SUPPORTED_CONTRACT_VERSION = 1`, `thisPlatform()` |
| `src/extensions/domain/extension-item.ts` | contract | list item and list types |
| `src/extensions/catalog/extension-catalog.ts` | Extension Catalog | fetch, verify, parse, last verified copy |
| `src/extensions/catalog/extension-catalog-source.ts` | config | built-in URL `https://github.com/AutoByteus/autobyteus-extensions/releases/download/catalog/extensions-catalog.json` (+ `.sig`) and the public key; development overrides |
| `src/extensions/packages/extension-package-installer.ts` | Package Installer | download, sha256, unpack with the `tar` package the server already uses (`tar` 7.5.22, `src/skills/installers/skill-repository-archive.ts:4`), refusing entries outside the target, compare, rename |
| `src/extensions/server-parts/server-part-host.ts` | Server Part Host | load, shape check, ctx, calls |
| `src/extensions/storage/extension-state-store.ts` | State Store | `state.json` read/write, folder paths |
| `src/extensions/storage/extension-log.ts` | Extension Log | append, cap, tail |
| `src/extensions/services/extension-manager.ts` | Extension Manager | lifecycle, list, gates, start/stop |
| `src/compositions/extensions-composition.ts` | composition | builds the Manager |
| `src/api/graphql/types/extensions.ts` | transport | resolver + GraphQL types, owner check |
| `src/api/rest/extensions.ts` | transport | action route (JSON + audio parser), page route (CSP) |
| `src/api/graphql/index.ts`, `graphql-request-context.ts` | transport | context carries `extensions` |
| `src/api/security/node-route-permissions.ts` | permissions | `/rest/extensions` owner |
| `autobyteus-web/stores/extensionsStore.ts` | page store | list + lifecycle calls to the window's node |
| `autobyteus-web/services/extensions/extensionActionClient.ts` | transport | POST action (JSON / WAV) to a node, error codes |
| `autobyteus-web/services/extensions/extensionPageBridge.ts` | bridge | frame messages, `locale` on load, `resize` clamp |
| `autobyteus-web/components/settings/ExtensionsManager.vue` | page | sections and notes (V1, V13) |
| `autobyteus-web/components/settings/extensions/ExtensionCard.vue` | card | frame of states/actions |
| `autobyteus-web/components/settings/extensions/ExtensionPageFrame.vue` | frame | sandboxed iframe + bridge |
| `autobyteus-web/components/settings/extensions/ExtensionDialogs.vue` | dialogs | log and Remove confirmation |
| `autobyteus-web/components/settings/extensions/VoiceMicrophonePanel.vue` | voice | microphone choice + Test (AutoByteus's own) |
| `autobyteus-web/stores/voiceInputStore.ts` | voice | availability, record, transcribe via action client, microphone setting |
| `autobyteus-web/graphql/queries/extensions.ts`, `mutations/extensions.ts` | transport | documents |
| `autobyteus-web/client-data-migrations/migrations/remove-desktop-voice-input-install/` + runner call | migration | DS-008 |
| `autobyteus-extensions/voice-input/{extension.json, server/index.mjs, ui/index.html}`, `scripts/pack.mjs`, package release workflow (tag `voice-input-v<version>`) | voice package | DS-007 and actions; publishes `voice-input-<version>.tar.gz` and its SHA-256 |
| `autobyteus-extensions/catalog.json` (source list), `scripts/check-catalog.mjs` (downloads each package, checks its SHA-256 and that its `extension.json` equals the entry), `scripts/sign-catalog.mjs`, release workflow | release | replaces the two assets of the fixed release tag `catalog` (never marked Latest; package releases use their own tags `<id>-v<version>` and never touch it, so `releases/latest` plays no part) with `extensions-catalog.json` + `.sig`, signed with `EXTENSIONS_CATALOG_SIGNING_KEY` (checked against the public key, like `sign-server-package.mjs`); adding or updating an extension is a change to `catalog.json` |
| `GLOSSARY.md`, `autobyteus-server-ts/docs/modules/extensions.md`, `DESIGN.md` (rule 9 exception: the extension contract), `node_access_model.md` (route + scenario) | docs | REQ-010 |

## Applied Patterns

Manager (Extension Manager: lifecycle owner); Adapter (Server Part Host around foreign modules); Repository-like store (State Store); polling for long operations.

## Target Subsystem / Folder / File Mapping

The folder layout follows the file table: `src/extensions/{domain,catalog,packages,server-parts,storage,services}/` (structural depth: contract types, remote source, unpacking, foreign-code boundary, persistence, governing owner). Web components under `components/settings/extensions/`. Must not contain: transport in `src/extensions/`; node-access logic in the extensions area.

## Folder Boundary Check

| Folder | Depth | Clear? | Risk | Note |
| --- | --- | --- | --- | --- |
| `src/extensions/domain` | contract | Yes | Low | types and reader only |
| `src/extensions/catalog`, `packages` | provider | Yes | Low | network/files |
| `src/extensions/server-parts` | off-spine boundary | Yes | Low | foreign code |
| `src/extensions/storage` | persistence | Yes | Low | — |
| `src/extensions/services` | main-line | Yes | Low | one owner |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Action gating | route → `manager.callAction(id, action, input)`; Manager checks installed/on/busy, host checks own key | route reads `state.json` and calls `module.actions[action]` | one gate, no bypass |
| Long install | mutation returns `installing`; page polls | GraphQL request held 75 s | proxies, retries, closed windows |
| Voice availability | `voiceInputStore` reads the embedded node's `voice-input` item (`installed && enabled && ready`) | keeping `window.electronAPI` as the gate | headless rule, one source |
| Server part import | `import(pathToFileURL(file) + '?v=' + version)` | plain import (cached across update) | update must load the new code |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep the Electron manager for Voice and add the node manager for others | smaller change | Rejected | one manager per node (DEC-001) |
| Read the old registry to keep language/microphone | continuity | Rejected (DEC-016) | choose again |
| IPC transcribe as a fallback when the node route fails | robustness | Rejected | node route only |
| Version negotiation between app and extension | separate releases | N/A: `contractVersion` refusal is the contract (rule 9 exception) | — |

## Change / Refactor Sequence

1. Server: domain, state store, log, catalog (test key), installer, host, manager with unit tests; composition, GraphQL, REST, route table, start/stop wiring; node access model doc + scenario.
2. Voice package in `autobyteus-extensions/voice-input/`, pinning voice runtime **0.3.2** (`voice-input-runtime-manifest.json`, runtimeVersion 0.3.2, release `v0.3.2` of `AutoByteus/autobyteus-voice-runtime`; not 0.3.1, which published nothing); no warm-up clip; the catalog with its check, signing and release workflow in the same repository (no release without the founder's word).
3. Web: extensions store, card, frame, bridge, log dialog, page; voice store transport and microphone section; localization.
4. Desktop: remove the Electron extension manager, IPC, preload/types members; add the deletion step.
5. Docs: GLOSSARY, module doc, DESIGN.md rule 9 exception.
6. Tests: AC-001…AC-012 per requirements; existing voice outcome tests rewritten to the new transport.

## Key Tradeoffs

- In-process server parts (simple, proven) vs child processes (isolation): in-process; signed first-party code.
- Polling vs push: polling while busy (existing pattern), push later if needed.
- Discard vs move (founder): discard.
- Separate catalog key vs reusing the server package key: separate (only `autobyteus-extensions` holds it, as a repository secret; one can be rotated without the other). The signed list carries each package's SHA-256, so packages need no signature of their own.
- Paid extensions (DEC-013, later stage): the contract already allows a package from another source (`packageUrl`); a paid one adds optional fields then (for example that its download needs the owner's AutoByteus account). For a hosted service such as our own private network, the paid part is the service (it checks the subscription when a node joins), not the package.

## Risks

- A server part that blocks the event loop or crashes the process affects the node (in-process). Mitigation: first-party review; every call wrapped; consider a child-process host if a real case appears.
- Voice runtime 0.3.2 (PRE-001, delivered 2026-11-26): on Apple Silicon the worker needs Homebrew `ffmpeg` on PATH (mlx-whisper decodes with it; the runtime neither ships nor checks it); without it the worker refuses to start with that reason, which the card shows. The founder's Mac has it (`/opt/homebrew/bin/ffmpeg`). A runtime Task to remove the dependency is being created by the PM; Stage 1 does not wait for it. The faster-whisper bundles (Linux, Windows, Intel Mac) were not run live by the runtime team (their DEC-006).
- Memory: the warm worker holds ~850 MB from its start, so it is started at node start and on turn-on only while Voice Input is on, and stopped after 30 minutes without dictation (REQ-012). The runtime team measured ready ~1.3 s after start and a first dictation ~0.19 s on the released Apple Silicon bundle; validation re-measures on this Mac (cold, after a restart).
- The founder must create the catalog signing key and the `autobyteus-extensions` repository (release-time). Rule for every extension (DEC-018): anything valuable lives in the program it downloads or a service AutoByteus runs, never in the public wrapper; a private program's download is gated later (DEC-013).
- QR-002 (≤ 0.5 s slower warm transcription): one loopback HTTP hop added; measured in validation.
- The catalog URL is on GitHub releases: a public repository is needed for unauthenticated download (DEC-013 later for paid ones).

## Guidance For Implementation

- Reproduction to start from: `None` (feature). Use `probes/contract-probe` as a working reference for host, bridge and voice server part shapes (not production code).
- Tests never touch `~/.autobyteus`; the deletion step and the node use isolated temporary folders; catalog tests use a test key pair generated in the test.
- Keep the contract types exactly as extension-contract.md; any new field goes back to the Solution Designer.
- Review notes (ARCH-REV-001 residuals), decided:
  - **Import cache:** the Server Part Host imports with a per-load counter in the URL (`?load=<n>`), so Remove + Install of the same version gets fresh module state.
  - **Stop during start:** turning Off while `start()` runs calls `stop()`; the Manager ignores the late result of that `start()` (no "Could not start" for an extension that is now Off). `start` is not a lifecycle "busy" operation, so actions are not blocked by it.
  - **`message` precedence:** "Update to x failed: …" (until the next successful update or a restart), else "Could not start: …" (until the next successful start), else `status().message`.
  - **Catalog overrides:** the module doc says `AUTOBYTEUS_EXTENSIONS_CATALOG_URL` / `…_PUBLIC_KEY` let whoever controls the node's environment trust another key; that person already controls the computer, so it is not a way around DEC-011.
  - **Base:** the worktree is on `origin/personal` @ fdde5406fa; `registerGraphql(app, { extensions })` changes two test callers (named above).
- AC-002 includes a check of the packaged Voice Input page through the real node (origin rule, gate) and the desktop's credential attacher: the page loads, the language changes, nothing is refused (AR-003).

