# Implementation Handoff — node-vocabulary (autobyteus-290)

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/node-vocabulary`, branch `codex/node-vocabulary`, base
`origin/personal` `c78ffb15a2`, target `origin/personal`. No release in this ticket.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Large / High → independent architecture review (ARCH-REV-005 pass) → implementation → Code Reviewer (`/software_engineering_team/code_reviewer`).
- Requirements doc: `tickets/in-progress/node-vocabulary/requirements-doc.md` (Approved, SR-006; U-3 decided)
- Investigation notes: `tickets/in-progress/node-vocabulary/investigation-notes.md`
- Solution revision record: `tickets/in-progress/node-vocabulary/solution-revision-record.md` (SR-007)
- Design spec: `tickets/in-progress/node-vocabulary/design-spec.md` (SR-007, `f75d537365`; N-910 / N-911 at `9bc90eff80`)
- Supplemental task artifacts: `follow-ups.md` (FU-001 pulled in as Step 1b; FU-002 open; FU-003 added by this implementation)
- Design review report: `tickets/in-progress/node-vocabulary/design-review-report.md` (ARCH-REV-005 pass)
- Architecture review revision record: `tickets/in-progress/node-vocabulary/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `tickets/in-progress/node-vocabulary/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-007 (SR-006 for U-3)
- Related architecture-review revision IDs: ARCH-REV-005
- Related code-review / API/E2E / delivery revision IDs: N/A
- Triggering finding IDs: N/A

One vocabulary across server, web, desktop shell, phone apps, tools and docs (`GLOSSARY.md`): `nodeId` is only a
node's ID (`srv_…`); a client's own record of a node is an **entry** (`entryId`); **peer** only means a registered
remote node; the connecting address is the **client address**; Memory Sync's import identity is the **source ID**.
Stored names follow the code through sealed one-time migrations with backups (SM-1 … SM-10); the node identity and
Memory Sync are held back with one stated reason until their migrations succeed.

Commits (oldest first): `ad36e4d61e` Step 1 · `232e847ed3` SM-1 + `node_identity` hold-back · `b085e15a02` Step 1b ·
`075ce323ca` Step 2 · `437da24719` Step 3 · `32cf99830e` Step 4 + SM-6 … SM-10 · `92ff02df4a` Step 5 ·
`4b7d13b8c7` SM-1 backup · `3692422aef` Step 5b + SM-2 … SM-5 + `memory_sync` hold-back · `cb37d82fab` Step 6.
Note: the Solution Designer's docs commit `b3d9c758f2` also carries the Step 1 file rename
`server-instance-identity-service(.test).ts` → `node-identity-service(.test).ts` (it was in the shared index when that
commit was made); Step 1 `ad36e4d61e` builds on it.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: stored-data migrations in four stores (server, desktop/browser, iOS, Android), two capability hold-backs, a wire rename (status answer, hub protocol, GraphQL), a tool rename that changes agent definitions' selection (REQ-906 exception), about 250 files.
- Selected route: `Code Review`
- Lightweight self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None` blocking. Design-document discrepancies and findings are listed under Important Assumptions and Known Risks for the Solution Designer.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| REQ-902 / Step 1 | The node's ID is `nodeId` (service, wire, web, iOS) | `src/remote-access/services/node-identity-service.ts` (`getNodeId`), `api/rest/remote-access.ts` (status answers `nodeId`), `remote-collaboration/channel/peer-client.ts` (`fetchNodeId`), web `types/node.ts` (`isNodeId`, `NODE_ID_PATTERN`), `utils/nodeIdentityProbe.ts`, iOS `ConnectionValidator.swift` (`nodeID` ↔ `"nodeId"`) | Done |
| REQ-909 / Step 1b | No version field on the status answer | `api/rest/remote-access.ts`; web `types/remoteAccess.ts`, `utils/remoteAccess/mobileConnectionDiagnostics.ts`; iOS `ConnectionValidator.swift` (decode and `minimumCompatibilityVersion` guard removed), `ConnectionDiagnostic.swift`; Android `ConnectionValidator.kt`, `ConnectionDiagnostic(Mapper).kt` | Done; also removed the dead 426 / version-incompatible diagnostics on web, iOS and Android (no server sends them) |
| REQ-903 / Step 2 | Registered-peer names say peer | `agent-collaboration/execution/remote/peer-discovery-channel.ts` (`PeerDiscoveryChannel`, `PeerNodeStatus`, `listPeerNodes`, bind/release/find), `remote-collaboration/discovery/peer-node-discovery.ts` (`PeerNodeDiscovery`), `remote-run-channel.ts` (`PeerNodeRef`) | Done |
| REQ-903 / Step 3 | Tool `list_peer_nodes`; abilities and exposure unchanged | `agent-tools/agent-discovery/list-peer-nodes-{contract,tool}.ts`, `agent-tools/mcp/providers/list-peer-nodes-mcp-adapter-provider.ts`, `runtime-agent-tool-exposure.ts` (`listPeerNodesEnabled`), `claude-session-tooling-options.ts`, `remote-refusals.ts` | Done. No alias, no migration (REQ-906). Release-note text for delivery: "`list_available_nodes` is now `list_peer_nodes`; agents that use it need the new name selected." |
| REQ-901, REQ-905 / Step 4 | A client's record is an entry; `isSystem` gone | web `types/node.ts` (`NodeEntry`, `WindowNodeContext.entryId`, registry changes `entryId`, `EMBEDDED_ENTRY_ID`), `electron/nodeRegistryStore.ts`, `electron/application/electronApplication.ts` and the AR-902 carriers (`preload.ts`, `shell/workspace-shell-window(-registry).ts`, `rendererConsoleDiagnostics.ts`, `types.d.ts`), `stores/nodeStore.ts` (`getEntryById`, `getEntryBaseUrl`), `stores/windowNodeContextStore.ts`, `stores/nodeListStore.ts` (`entryIds`), `stores/mobileNodeSessionStore.ts` (`MOBILE_ENTRY_ID`), `types/remoteAccess.ts` (`MobileNodeSession.entryId`); iOS / Android `SavedNodeEntry` and store methods | Done. AC-901 list: `evidence/implementation/ac901-nodeId-inventory.md` |
| REQ-904 / Step 5 | "peer" only for registered nodes | `api/security/remote-access-local-trust.ts` (`normalizeClientAddress`, `isLoopbackClientAddress`, `NormalizedClientAddress`) and its callers; web `stores/runHistoryTeamExecutionRows.ts` comment; probe `tests/e2e/task-agent-sibling-sidebar-probe.mjs` + fixture; `collaboration_model.md` § 2.2 | Done |
| REQ-910 / Step 5b | Memory Sync's identity is the source ID | `memory-sync/shared/source-id.ts`, config/state/credential/import stores, hub client and REST (`sourceId` query and batch body), GraphQL `memory-sync-schema.ts` / `memory-explorer-schema.ts`, web types/stores/card/GraphQL documents, `generated/graphql.ts`, en / zh-CN "Source ID" | Done |
| REQ-911 SM-1 | `server-instance.json {serverInstanceId}` → `node-identity.json {nodeId}` | `app-data-migrations/migrations/node-identity-file-name/`, `frozen/released-node-identity-file.ts` | Done, with a `.backup-<timestamp>` copy (`4b7d13b8c7`) |
| REQ-911 SM-2 … SM-5 | Memory Sync stored names | `app-data-migrations/migrations/memory-sync-source-id-names/`, `frozen/released-memory-sync-files.ts`; startup-only, registered last | Done, backups per file |
| REQ-911 SM-6 / SM-7 / SM-8 | Desktop file, browser node list, mobile session | `autobyteus-web/client-data-migrations/` (`migrations/node-registry-entry-names/`, `migrations/mobile-session-entry-names/`, `frozen/`), `electron-file-runner.ts` (called in `electronApplication.start()` before `loadNodeRegistrySnapshot`), `browser-storage-runner.ts` (`plugins/19.clientDataMigrations.client.ts`); boundary spec `client-data-migrations/__tests__/boundaries.spec.ts` | Done. `.bak` / `:backup` |
| REQ-911 SM-9 / SM-10 | Phone saved-entry keys | iOS `AutoByteusMobileCore/DataMigrations/SavedNodeEntryKeysMigration.swift` called in `AppShellCoordinator.init` before `SavedNodeStore(...)`; Android `datamigrations/SavedNodeEntryKeysMigration.kt` called in `MainActivity.onCreate` before `SavedNodeStore(this)`; each with a boundary unit test | Done |
| REQ-913 `node_identity` | No new node ID while held back; stated reason | `NodeIdentityNotMigratedError`; status route 503 `{code: NODE_IDENTITY_NOT_MIGRATED, message}`; gateway 503 answer; `PeerClient` refusal; settings error; observation end; web probe cause `identity_pending` | Done (N-910) |
| REQ-913 `memory_sync` | Memory Sync held back the same way | `memory-sync/shared/memory-sync-capability.ts` (`MemorySyncNotMigratedError`, `requireMemorySyncReady`); every Memory Sync store refuses before touching a file; REST 503 `{error: MEMORY_SYNC_NOT_MIGRATED, message}`; worker does not schedule; GraphQL reads/saves fail with the text (the card shows it); Memory page lists only local memory | Done |
| REQ-912 / REQ-907 / Step 6 | Glossary and docs | `GLOSSARY.md`, `DESIGN.md` pointer, `collaboration_model.md` § 1 links, `remote_collaboration.md`, web `docs/settings.md`, `agent_tools.md`, `agent_communication.md`, `memory_sync.md`, `remote_access.md` | Done |
| REQ-906 | Behavior unchanged except the two exceptions | — | No behavior change apart from REQ-909 and the tool name; the hold-backs are new states only reachable after a failed migration |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. One extra meaning found outside the Change Scope was recorded as FU-003, not changed.

## Key Files Or Areas

- Server: `src/remote-access/services/node-identity-service.ts`, `src/app-data-migrations/migrations/{node-identity-file-name,memory-sync-source-id-names}/`, `src/app-data-migrations/frozen/released-{node-identity-file,memory-sync-files}.ts`, `src/startup/app-data-capability-readiness.ts`, `src/memory-sync/shared/memory-sync-capability.ts`, `src/remote-collaboration/**`, `src/agent-tools/agent-discovery/list-peer-nodes-*`.
- Web: `types/node.ts`, `electron/nodeRegistryStore.ts`, `electron/application/electronApplication.ts`, `stores/{nodeStore,windowNodeContextStore,nodeListStore,mobileNodeSessionStore}.ts`, `client-data-migrations/**`, `plugins/19.clientDataMigrations.client.ts`.
- Phones: `autobyteus-ios/AutoByteusMobileCore/{SavedNodeEntry,SavedNodeStore}.swift`, `DataMigrations/`; `autobyteus-android/.../connection/{SavedNodeEntry,SavedNodeStore}.kt`, `datamigrations/`.

## Important Assumptions

Design-document discrepancies found while building (the code follows the more specific, later section; for the Solution Designer):

1. **Pairing does not embed the node ID** (Hold-back chains 4: "Phone-access pairing … refuses to issue a pairing while held back (it embeds the node ID)"). The pairing payload has no node ID (`RemoteAccessPairingPayload`: version, serverBaseUrl, pairingCode, expiresAt, serverName), so no pairing gate was added.
2. **No GraphQL field serves the node ID** (Hold-back chains 4: "GraphQL showing the node ID … the field is null"). The Nodes tab gets it from the window's probe of `/rest/remote-access/status`, which now reports `identity_pending`.
3. **Android did read `compatibilityVersion`** (`ConnectionValidator.kt:58`, unused); removed in Step 1b. The web and iOS 426 / version-incompatible branches and Android's `ServerVersionIncompatible` were dead (no server answers 426) and were removed with it.
4. **Change Scope "Left alone" is stale**: it lists `EMBEDDED_NODE_ID` and the localStorage value `autobyteus.node_registry.v1`; Step 4 and SM-7 rename both. Implemented per Step 4 / SM-7.
5. **Step 1 ordering:** `NodeProfile.serverInstanceId` could not be renamed in Step 1 (`nodeId` still meant the entry there) and it is a stored name, so it moved with Step 4 / SM-6.
6. **SM-1 backup:** REQ-911 / AC-905 ask for a backup; the design's server retry text didn't mention one for SM-1. Added (`server-instance.json.backup-<timestamp>`, reported as `backupPath`).
7. **SM-2 … SM-5 are `STARTUP_ONLY`** (hub ingestion may write these files while the server runs), so `memory_sync` readiness changes only at startup; the background worker therefore checks readiness once per reload.
8. **SM-6 / SM-7 recognition when both names exist:** the desktop saves its list right after loading it, so after a failed conversion the new file exists too. Both present **with** the backup → a finished step (old removed); **without** the backup → the old file is kept for recovery with a warning. This keeps a failed list from being deleted on the next start.
9. **The settings "status" while Memory Sync is held back** is the GraphQL error text "Memory Sync is waiting for its data migration.", which the existing card shows in its error line; no new GraphQL field.
10. **`generated/graphql.ts`** was already behind the schema (about 1,700 lines of unrelated drift). Only the Memory Sync names were changed in it; every Memory Sync line was compared identical to a fresh codegen from the printed schema.

## Known Risks

- **FU-003 (new):** the message gateway uses "peer" for the chat counterpart (`peerId` in its stored inbox/outbox records, `SessionPeerCandidate`, the channel adapters). Outside the Change Scope; recorded in `follow-ups.md`.
- **Other observations for the glossary (not changed):** `sourceId` also names an update notification's source (`UpdateNotification.sourceId`) and a skill source (`skillStore` source `sourceId`), different IDs; the run tree calls its elements nodes (`TeamRunAgentNode`, `sourceNode` in team execution) and the file explorer has `nodeIdToNode` for tree nodes — "node" as a tree node is a separate, long-standing meaning. The file explorer's context-menu `nodeId` (a tree node) was renamed `treeNodeId` in Step 4 because it sat in `utils/`/`components/` under AC-901.
- **Memory Sync config keeps `schemaVersion: 1`** (and state / manifest / source records keep theirs); the design renames only the source fields. A follow-up could drop them under rule 9 if wanted.
- **`*PeerAddress` names remain** (`resolvePeerAddress`, `changePeerAddress`, `PeerAddressResolver`, `PeerAddressAttempt`, `peerAddressCandidates`): each is a registered peer's address, the correct meaning. The word list's `PeerAddress` targeted the client-address names, which are gone.
- **Agent definitions selecting `list_available_nodes`** lose the tool until updated (accepted REQ-906 exception; the Agent Package Creator updates packages in a separate ticket).
- **Load-dependent tests (unrelated to this ticket):** `agent-org-context-file-locator-transition.test.ts` and `agent-provider-composition-boundaries.test.ts` failed once under a narrow parallel run and pass alone and in the full suites (IMP-02, IMP-04). `application-framework-boundaries.test.ts` (SR-011 host definition) fails before and after this ticket (IMP-04).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: rename-only steps plus sealed migrations and hold-backs.
- Reviewed root-cause classification: naming drift (Principle 15), stored names out of sync (rule 10).
- Reviewed refactor decision: `Refactor Needed Now` (the renames themselves).
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the discrepancies above did not change any decision; they are documentation corrections.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no aliases, no dual reads; old names exist only in migration folders, frozen shapes, their tests and released-data fixtures)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes` — `isEmbeddedNode` (only its spec used it), the 426 / version-incompatible diagnostics (web, iOS, Android), `memory-sync/hub/memory-import-path-resolver.ts` (no importer).
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied (including the updated Principle 5 / 15 text, `7bbbf15`): `Yes`
- Changed source files within size guardrails: `Yes` (largest touched: `electronApplication.ts` 407 effective lines; new files ≤ 210)
- Notes: the remote-nodes page probe keeps seeding the released list shape on the released key on purpose, so it exercises SM-7 on pre-change data.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Migration Required` (U-3, SR-006)
- Design-spec decision reference: § Stored Names Migration, § Hold-back chains
- Implementation follows the approved decision without a version-specific runtime fallback: `Yes`
- Migration implementation and focused checks: SM-1 (7 tests), SM-2 … SM-5 (5 tests), SM-6 / SM-7 / SM-8 (19 tests incl. boundary), SM-9 (6 iOS tests incl. boundary), SM-10 (6 Android tests incl. boundary); hold-backs: `node-identity-hold-back.test.ts` (7), `memory-sync-hold-back.test.ts` (5).
- Deviation from the reviewed transition decision: `None` (see assumptions 6 – 8 for details the design left open)

## Environment Or Dependency Notes

- macOS (Darwin 25.5), Node 22.23.1, pnpm; Xcode with the iPhone 17 simulator; Android SDK at `~/Library/Android/sdk`.
- No check touched the user's running AutoByteus or `~/.autobyteus`; schema printing used a temporary data directory (`/tmp/n290-schema/data`).

## Checks Run

Evidence folder: `tickets/in-progress/node-vocabulary/evidence/implementation/` (committed with the handoff; the
commit is named in the handoff message). Environment for all: macOS Darwin 25.5 (arm64), Node 22.23.1, pnpm.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `cb37d82fab` | as above | server `src` | all | Pass | `IMP-01-server-typecheck.log` | `TYPECHECK_EXIT=0` |
| IMP-02 | `pnpm -C autobyteus-server-ts test:unit` | `cb37d82fab` | as above | server unit + `tests/app-data-migrations` (SM-1 … SM-5, hold-backs, renames) | REQ-901 … REQ-913, AC-905 | Pass | `IMP-02-server-unit.log` | `Test Files  814 passed \| 4 skipped (818)`, `Tests  6743 passed \| 7 skipped (6750)` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:integration:prepare` then `test:integration` | `cb37d82fab` | as above | server integration | REQ-906 | Pass | `IMP-03-server-integration.log` | `Test Files  78 passed \| 20 skipped (98)`, `INTEGRATION_EXIT=0` |
| IMP-04 | `pnpm -C autobyteus-server-ts exec vitest run tests/architecture`; the SR-011 test again at base `c78ffb15a2` | `cb37d82fab`; base `c78ffb15a2` | as above | boundaries incl. `app-data-migration-boundaries`, `tracked-imports` | AC-905 (sealed area) | Pass except one existing failure | `IMP-04-server-architecture.log` | `Tests  1 failed \| 48 passed (49)`; the one failure `guards the exact SR-011 host definition` also fails at base (`Tests  1 failed \| 19 passed (20)`) |
| IMP-05 | `pnpm -C autobyteus-web exec cross-env NUXT_TEST=true vitest run` | `cb37d82fab` | as above | web components, stores, utils, `client-data-migrations` (SM-6 … SM-8 + boundary) | REQ-901, REQ-905, REQ-910, REQ-911 | Pass | `IMP-05-web-nuxt-excerpt.log` (full log untracked under `full/`) | `Test Files  685 passed \| 2 skipped (687)`, `Tests  4877 passed \| 5 skipped (4882)` |
| IMP-06 | `pnpm -C autobyteus-web exec vitest run --config ./electron/vitest.config.ts` | `cb37d82fab` | as above | Electron main, preload, shell registry, node registry store | REQ-901 (AR-902 carriers) | Pass | `IMP-06-web-electron.log` | `Test Files  40 passed \| 1 skipped (41)` |
| IMP-07 | `pnpm -C autobyteus-web exec tsc -p electron/tsconfig.json --noEmit` | `cb37d82fab` | as above | Electron main incl. `../client-data-migrations/electron-file-runner.ts` | REQ-911 SM-6 | Pass | `IMP-07-electron-typecheck.log` | `ELECTRON_TSC_EXIT=0` |
| IMP-08 | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `cb37d82fab` | as above | web guards; en/zh-CN keys | REQ-910 UI | Pass | `IMP-08-web-guards.log` | `Passed with zero unresolved findings.` |
| IMP-09 | `vue-tsc --noEmit`, filtered to files changed since `c78ffb15a2` | `cb37d82fab` | as above | web types | REQ-901 | Pass (no new errors) | `IMP-09-web-vuetsc.log` | total `457` (existing, unchanged); the listed errors in changed files are existing ones (Apollo module types, stubs, fetch mocks), none name a renamed identifier |
| IMP-10 | `generate-project.sh` + `xcodebuild … -only-testing:AutoByteusMobileCoreTests test`; IMP-10b app `build` | `32cf99830e` (no iOS change since) | as above, iPhone 17 simulator | iOS core incl. SM-9 and its boundary test; app target incl. the call site | REQ-901, REQ-909, REQ-911 SM-9 | Pass | `IMP-10-ios-core-tests.log`, `IMP-10b-ios-app-build.log` | `Executed 27 tests, with 0 failures`, `** TEST SUCCEEDED **`; `** BUILD SUCCEEDED **` |
| IMP-11 | `./gradlew :app:testDebugUnitTest :app:assembleDebug`; `:app:compileDebugAndroidTestKotlin` | `32cf99830e` (no Android change since) | as above, Android SDK | Android incl. SM-10 and its boundary test | REQ-901, REQ-909, REQ-911 SM-10 | Pass | `IMP-11-android.log` | `BUILD SUCCESSFUL`, `ANDROID_EXIT=0`; SM-10 report `tests="6" … failures="0"` |
| IMP-12 | the design's § Verification word list over the repository | `cb37d82fab` | as above | all code and docs | AC-901 | Pass | `IMP-12-word-list.log` | each remaining hit is in a migration folder, its tests or released fixtures, a migration note in docs, the published 1.5.8 release notes, or a `*PeerAddress` name for a registered peer's address |
| IMP-13 | the four in-process memory e2e files (Memory Sync API, imported / collaboration / view GraphQL) | `3692422aef` | as above | Memory Sync wire (`sourceId`), GraphQL, readiness set by the test | REQ-910 | Pass | `IMP-13-memory-e2e-in-process.log` | `Test Files  4 passed (4)`, `Tests  16 passed (16)` |
| IMP-14 | `grep -rnw nodeId` over web `electron/ stores/ utils/ services/ components/` | `cb37d82fab` | as above | web | AC-901 / AR-902 | Pass | `IMP-14-ac901-nodeId-inventory.md` | every row "the node's ID" |

- Not run, and why: the two-server E2E, the browser probes (remote-nodes page, Docker address, electron launch profile, sibling sidebar), `memory-sync-multiprocess.e2e` (needs a server build), the full `tests/e2e` folder, the packaged Electron harness and the phone UI tests — API/E2E's scope (AC-902 … AC-905).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: the Memory Sync card's label "Source ID" and its description sentence (en, zh-CN); every other web change is a rename with no rendered difference (the Nodes tab, phone shell and window switcher behave as before).
- Approved references: design § Step 5b (UI text).
- Design system / adjacent surfaces reviewed: the card's existing label and description keys (`memorySyncSettings.ts`), unchanged layout.
- Surface used: the component spec `components/settings/__tests__/MemorySyncCard.spec.ts` (mounts the card and checks the label), part of IMP-05.
- States inspected: the source form's label and description text through the spec; no visual browser inspection.
- Visual or interaction issues found: none (text-only change, same length class).
- Limitation: not rendered in a browser here. The Nodes-tab and Memory Sync browser checks need a running server and are API/E2E's (AC-902, AC-904).

## Downstream Coverage Hints / Suggested Scenarios

- Two-server E2E (AC-902/AC-905) starting from **pre-change data**: a node with `remote-access/server-instance.json`, `peers.json`, Memory Sync config/state/credentials and an import folder with `source-node.json`; after start: same node ID, peers still recognize it, Memory Sync continues with the same source, backups present.
- Failure paths: an unreadable `server-instance.json` → status 503 `NODE_IDENTITY_NOT_MIGRATED`, peers refuse with that reason, the Nodes tab shows "waiting for its data migration"; an unreadable `hub-credentials.json` → hub ingestion 503 `MEMORY_SYNC_NOT_MIGRATED`, the Memory Sync card shows the reason, the Memory page lists only local memory.
- Desktop start with a pre-change `userData/node-registry.v1.json` (0, 1, several entries, with and without `serverInstanceId`) → `node-registry.json` with `nodeId`, the `.bak` kept for one start; the Nodes tab joins entries and peers as before.
- Browser mode and phone web shell with the released `localStorage` keys (`autobyteus.node_registry.v1`, `autobyteus.remote_access.mobile_session.v1`) → converted on load; the phone stays paired.
- iOS and Android apps upgraded over saved entries under the old keys → same saved nodes and selection.
- An agent with `list_peer_nodes` selected lists its peers; one with only `list_available_nodes` no longer gets the tool.

## API / E2E / Executable Coverage Investigation And Execution Still Required

The two-server E2E, the Nodes-tab and Memory Sync browser checks, the remote-nodes-page probe (now seeding released data for SM-7), the electron launch-profile probe, the sibling-sidebar probe, the multiprocess Memory Sync E2E (needs a server build), and the phone UI tests are left to API/E2E.
