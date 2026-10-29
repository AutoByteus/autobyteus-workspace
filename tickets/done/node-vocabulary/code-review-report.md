# Code Review Report — node-vocabulary (autobyteus-290)


## Round 2 — Targeted Delta Review of F-001 and F-002 (CRR-002, authoritative)

- Review Entry Point: `Implementation Review`, round 2, `Targeted Delta Review`
- Trigger: implementation engineer, IR-002 (SR-008 at `8e3512429b`, ARCH-REV-006 Pass)
- Range: `1fee50708e..260df99337` (code `127fc4806e`)
- Review Scope Evidence: the code commit renames only the Step 5b files and `remote-run-view-provider.ts`:
  - `memory-sync/**` and the SM-2 … SM-5 migration targets;
  - GraphQL `memory-sync-schema.ts` / `memory-explorer-schema.ts`;
  - the web memory types, stores, card and documents;
  - `generated/graphql.ts` (Memory Sync types only);
  - en/zh-CN strings, `GLOSSARY.md` and the Memory Sync docs.

  These are F-001's and F-002's files and behavior; no other shape changes.

### Prior Finding Resolution

| Finding | Fix | Verification | Status |
| --- | --- | --- | --- |
| F-001 | Memory Sync's identity is `memorySyncSourceId` (credentials `boundMemorySyncSourceId`, import file `memory-sync-source.json`, UI "Memory Sync source ID" / 记忆同步源 ID), per SR-008. SM-2 … SM-5 write these targets, changed in place (unreleased) | No `sourceId` / `boundSourceId` / `source.json` remains in the Memory Sync code, API, web memory files or docs (my search). The skill, update-notification and package `sourceId`s are untouched (no change under those folders). `GLOSSARY.md` now names the term and states it is not those `sourceId`s. `generated/graphql.ts` Memory Sync lines match a fresh codegen (IMP-18) | Resolved |
| F-002 | `RemotePeerStartedRunViews` → `PeerStartedRunViews` | `git grep RemotePeer` finds nothing outside the tickets | Resolved |

### Notes (not findings)

- Two design-document slips for the Solution Designer (the code follows the design's body):
  - the SM-5 row reads `sync-memory-sync-source.json`, while § Current-only boundary and the code say `memory-sync-source.json`;
  - ARCH-REV-006's report still says `syncSourceId`.
- N-912: dev or test data that already ran the earlier, unreleased SM-2 … SM-5 needs a manual reset. No runtime handling is added, which is correct (no released data has the interim names).

### Round 2 Result

- Review Decision: `Pass`. F-001 and F-002 are resolved; no new findings.
- Score Summary: 9.4/10. Naming (Principle 15) 7.5 → 9.0 and Cleanup 9.0 → 9.5; the other categories are as at CRR-001.
- Checks relied on (IR-002):
  - server typecheck and unit (IMP-15);
  - web Nuxt and guards (IMP-16);
  - vue-tsc, with no new errors (IMP-17);
  - generated types matching codegen (IMP-18);
  - the word list clean (IMP-19);
  - focused memory, remote-collaboration and architecture tests (the existing SR-011 failure only).
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`; informational notice to the implementation engineer.

## Round 1 — Implementation Review (CRR-001; superseded by round 2)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-006; REQ-901 … 913, AC-901 … 905, U-1 … U-3, D-1, D-2)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (V-01 … V-10)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-007)
- Design Spec Reviewed As Context: `design-spec.md` (SR-007: Steps 1 … 6, § Glossary, § Stored Names Migration SM-1 … SM-10, § Hold-back chains)
- Supplemental Task Artifacts Reviewed As Context: `GLOSSARY.md`; `DESIGN.md` rules 7, 8, 9, 10 and its Domain vocabulary pointer; `follow-ups.md` (FU-002, FU-003)
- Relevant Solution Revision IDs: SR-006, SR-007
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-005 Pass; AR-901 … 906, N-901 … 911)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-005
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (Important Assumptions 1–10, Known Risks, IMP-01 … IMP-14)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`. Range `c78ffb15a2..bfd8beda9e`: 264 files outside tickets and dist, +3,785 / −1,733.
- Trigger: implementation engineer, "autobyteus-290 (node vocabulary) is ready for source review. Large / High, IR-001".
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Authorities re-read this round (skill update): `design-principles.md` Principle 15 "One Vocabulary" and the Vocabulary drift trigger; Principle 5's stored-name text; `design-examples.md` Case 6 "One Word, Two Meanings"; `ticket-scope.md`; the report template's naming row.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`. The change covers a wire rename, ten sealed migrations across four stores, two new capability hold-backs, and a tool rename.
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none

## Review Scope

- Changed implementation and behavior reviewed:
  - **Step 1:** `NodeIdentityService`, the status route, `PeerClient.fetchNodeId`, web `isNodeId` / `nodeIdentityProbe`, iOS `ConnectionValidator`.
  - **Step 1b:** `compatibilityVersion` removed on the server, web, iOS and Android, with the dead 426 / version branches.
  - **Step 2:** `PeerDiscoveryChannel`, `PeerNodeStatus`, `PeerNodeDiscovery`, `PeerNodeRef`.
  - **Step 3:** `list_peer_nodes` (contract, tool, MCP provider, exposure, refusal texts).
  - **Step 4:** `NodeEntry` / `entryId`, the Electron carriers, the stores, `MobileNodeSession.entryId`, phone `SavedNodeEntry`.
  - **Step 5:** client address; siblings.
  - **Step 5b:** source ID.
  - **Step 6:** `GLOSSARY.md`, the `DESIGN.md` pointer, docs.
  - **The migrations:**
    - SM-1: `node-identity-file-name`;
    - SM-2 … 5: `memory-sync-source-id-names`;
    - SM-6/7/8: `client-data-migrations/`, with the Electron and browser runners and the plugin `19.clientDataMigrations.client.ts`;
    - SM-9: the iOS `SavedNodeEntryKeysMigration`;
    - SM-10: the Android `SavedNodeEntryKeysMigration`.
  - **The hold-backs:**
    - `node_identity`: the status route 503, the gateway 503, `PeerClient` refusals, settings errors, the observation client, the web probe's `identity_pending`;
    - `memory_sync`: `requireMemorySyncReady` in every store, the worker, the explorer source service, REST 503.
  - **The capability owner:** `startup/app-data-capability-readiness.ts`, applied by both startup hosts and the manual retry.
- Files / areas reviewed:
  - every migration and runner file in full;
  - the identity service and readiness owner;
  - the remote-collaboration hold-back diff;
  - the Memory Sync gate's callers and all readers of its files;
  - the client migration call sites and store keys;
  - the phone call sites and the released value types (from the base);
  - `GLOSSARY.md`;
  - the AC-901 inventory, spot-checked against `grep -w nodeId` over the web folders, `types/` and the rest.
- Reviewer checks (not rerunning recorded checks):
  - my own AC-901 word-list search over the repository, outside the migration folders;
  - a `sourceId` use search, current and at the base;
  - a check that the removed `isEmbeddedNode` and `memory-import-path-resolver.ts` had no source importer;
  - changed-file sizes.
- Explicit exclusions: the two-server E2E from pre-change data, the browser probes, the multiprocess Memory Sync E2E and the phone UI tests (API/E2E's); AC-904 (the user's check).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: yes.
- Design-spec behavior map verified against the implementation: yes, with the handoff's Important Assumptions 1–10 checked (below).
- Design review report and round confirmed: ARCH-REV-005 Pass.
- Behavior-basis status: `Confirmed`, apart from the vocabulary premise in F-001.
- Changed or newly discovered behavior: none
- Remaining material ambiguity: F-001 (which name Memory Sync's identity takes).

| Behavior ID | Status | Implementation Path And Lifecycle Evidence |
| --- | --- | --- |
| REQ-902 / U-2 (Step 1) | Confirmed | `NodeIdentityService.getNodeId`; the status route answers `nodeId`; all readers renamed (`PeerClient.fetchNodeId`, web probe, iOS `nodeId` key) |
| REQ-909 (Step 1b) | Confirmed | Removed from the server answer and every reader. The iOS test `testDoesNotRefuseAServerForAVersionNumber` pins that an extra field is ignored. Dead 426 / incompatible branches removed (web, iOS, Android) |
| REQ-903 (Steps 2–3) | Confirmed | No `AvailableNode`, `RemoteNodeDiscovery`, `RemoteDiscoveryChannel`, `list_available_nodes` or `listAvailableNodesEnabled` remains. The texts name `list_peer_nodes`. No alias (REQ-906 exception) |
| REQ-901 / REQ-905 (Step 4) | Confirmed | `NodeEntry` / `entryId`; `isSystem` gone from current code; `EMBEDDED_ENTRY_ID`, `MOBILE_ENTRY_ID`. My `grep -w nodeId` over `composables`, `plugins`, `pages`, `layouts`, `types` and `middleware` found only the node's-ID meaning (`types/node.ts` `NodeEntry.nodeId`, the identify change; `types/remoteAccess.ts`). The IMP-14 inventory of the other folders matches |
| REQ-904 (Step 5) | Confirmed | `normalizeClientAddress`, `isLoopbackClientAddress`, `NormalizedClientAddress`; the sibling fixture and probe; `collaboration_model.md` § 2.2 |
| REQ-910 (Step 5b) | Confirmed as designed; see F-001 | `sourceId` across code, GraphQL, the hub wire and the UI "Source ID" |
| REQ-911 SM-1 | Confirmed | Structure-recognized. Backup → atomic write of `node-identity.json` → old file removed. Both files present: the same ID removes the old one; different IDs fail with both kept (N-906). `createdAt` copied. An unreadable or ID-less old file fails and is kept (REQ-913: no new ID) |
| REQ-911 SM-2 … SM-5 | Confirmed | `renameKey` by structure (key order kept); both names: the same value drops the old, a different value fails. Each rewrite backed up. `source-node.json` → `source.json`: new file first, old removed last, both present compared by `sourceId`. `STARTUP_ONLY` (assumption 7, justified: hub ingestion writes these files while the server runs) |
| REQ-911 SM-6 / SM-7 / SM-8 | Confirmed | **The Electron runner:** convert first (a failure writes nothing), then `.bak`, then a temp file renamed to the new name, then the old removed. A new file without the backup keeps the old file for recovery (assumption 8). The backup is removed at the next start that finds only the new file. **The browser runner:** the same order with `:backup`. **Call sites:** `electronApplication.ts:363`, before `loadNodeRegistrySnapshot`; plugin `19.` sorts before `20.windowNodeBootstrap` and `21.mobileRemoteAccessBootstrap`. **Current stores:** they know only `node-registry.json`, `autobyteus.node_registry` and `autobyteus.remote_access.mobile_session` |
| REQ-911 SM-9 / SM-10 | Confirmed | Key renames by structure with `:backup`. Each is called right before its store is created (`AppShellCoordinator.swift:19`, `MainActivity.kt:41`). The released value types match the copy calls: Android's two keys are strings (`putString`); iOS copies the object as stored (data and string) |
| REQ-913 `node_identity` | Confirmed | `nodeIdentityReady` is false until the capability owner applies it, and while held back `getNodeId()` throws `NodeIdentityNotMigratedError` and writes nothing. `markCapabilitiesPending` / `applyCapabilityReadiness` are called by both startup hosts (`server-runtime.ts:160,194`, `start-standalone-application-host.ts:142,163`) and by the manual retry (`app-data-migrations.ts:120`). Every consumer states the one reason: the status 503, the gateway 503, `PeerClient` (`NODE_IDENTITY_NOT_MIGRATED`, local and peer texts), settings errors, the observation client ending, the probe's `identity_pending` |
| REQ-913 `memory_sync` | Confirmed | `requireMemorySyncReady()` sits at the entry of every Memory Sync store (config, state, import, credential); the worker skips; the explorer lists only local memory; REST 503. No other reader of these files exists (search) |
| REQ-912 / REQ-907 (Step 6) | Confirmed | `GLOSSARY.md`; the `DESIGN.md` Domain vocabulary pointer; `collaboration_model.md` § 1 links to the glossary; the listed docs |

### The handoff's Important Assumptions

| # | Assumption | Review |
| --- | --- | --- |
| 1 | Pairing doesn't embed the node ID, so there is no pairing gate | Accepted. The design's hold-back chain 4 is wrong on this point; the design text needs correcting (Solution Designer) |
| 2 | No GraphQL field serves the node ID; the Nodes tab uses the probe's `identity_pending` | Accepted. The design text needs correcting |
| 3 | Android read `compatibilityVersion`; the dead version branches were removed | Accepted (Principle 7, touched files) |
| 4 | The Change Scope's "Left alone" list is stale (`EMBEDDED_NODE_ID`, the storage key value) | Accepted. Steps 4 / SM-7 govern; the design text needs correcting |
| 5 | `NodeProfile.serverInstanceId` moved with Step 4 / SM-6 | Accepted |
| 6 | SM-1 backup added | Accepted (REQ-911 / AC-905 ask for a backup) |
| 7 | SM-2 … 5 `STARTUP_ONLY` | Accepted (concurrent writers) |
| 8 | SM-6/7: "both present" is decided by whether the backup exists | Accepted. It prevents deleting a failed list on the next start |
| 9 | The Memory Sync hold-back is shown through the GraphQL error text | Accepted |
| 10 | `generated/graphql.ts` edited only for Memory Sync names, compared with a fresh codegen | Accepted |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal | Entry Surface | Shape | Forward Path | Expected Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-V1 | REQ-911, AC-905 | Operational | The user upgrades a node, the desktop or a phone app | Keep their node ID, peers, Memory Sync source, node list, session and saved entries | App start | Normal | migrations before the stores are read → current code reads the new names | Same values, new names, backups | the migration code and its call sites | Supported Normal | Use |
| SCN-V2 | REQ-913 | Operational | A node whose identity file can't be converted | Nothing gets a new node ID; the rest works | Startup | Explicit Edge | SM-1 FAILED → `node_identity` held → every consumer states the reason | No new ID; stated refusals | the hold-back chain | Supported Explicit Edge (REQ-913) | Use |
| SCN-V3 | Principle 15, REQ-910, `GLOSSARY.md` | Contract | Developers, reviewers and docs readers | One word, one meaning | The glossary and the code | Contract | Memory Sync's identity named `sourceId` beside the existing `sourceId`s (skills, update notifications, packages) | One meaning per name | `git grep -w sourceId` (145 non-Memory-Sync uses at the base) | Supported (contract) | Use |
| SCN-V4 | AC-901 | Contract | Reviewer / CI | The word list finds no old name | The repository | Contract | the word search | No hit outside migrations | my search | Supported (contract) | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-1 (F-001) | The ticket renames Memory Sync's identity `sourceNodeId` → `sourceId`, but `sourceId` already names three different IDs in the server and web: a skill source (`skills/domain/skill-source.ts:23`, GraphQL `skills.ts:93`, `managedSource.sourceId`), an update notification's source (`update-notifications/domain/update-notification.ts:26`, GraphQL `update-notifications.ts:41,128`), and a package source (`agent-package-mappers.ts:183`). `GLOSSARY.md` then defines "**Source ID:** a Memory Sync source's own import identity", which the code contradicts | Principle 15 ("Name an ID for what it identifies; two different IDs never share a name"); design-examples Case 6; `GLOSSARY.md` | The ticket's own rename (SR-007 REQ-910 / AR-903) | It trades a wrong name for one that collides. The stored names are migrated to `sourceId` / `boundSourceId` / `source.json` and the hub wire and UI follow. Once released, changing it needs another migration | `git grep -w sourceId` outside Memory Sync: 145 uses at base `c78ffb15a2`; the handoff's Known Risks notes the collision but leaves it | Promote | This ticket (the change introduced the collision) | Decide the name against its other uses: for example `syncSourceId` / "Sync source ID" in code, stored names, wire and UI, or another unambiguous name. Correct REQ-910, Step 5b, SM-2 … SM-5 targets and the glossary. While unreleased, the migration targets change in place; no extra migration is needed. This is a requirement-level name (REQ-910) and a design choice (AR-903), so the Solution Designer owns it |
| C-2 (F-002) | `RemotePeerStartedRunViews` (`remote-collaboration/inbound/remote-run-view-provider.ts:22,53`) still contains the word list's `RemotePeer`, and "Remote" repeats "Peer" (a qualifier that repeats the noun, Principle 15) | AC-901; Principle 15 | The word list | AC-901's search is not clean | my search | Promote | This ticket | Rename it, for example `PeerStartedRunViews` |
| C-3 | FU-003: the message gateway's chat "peer" (`peerId`, stored) | REQ-904; Principle 15 | — | Outside the Change Scope; stored names need their own migration; the ticket's ACs pass | `follow-ups.md` FU-003 | Reject as a finding: a follow-up already recorded | Follow-up | Recorded by implementation. The glossary's "Peer" sentence stays true for this ticket's words |
| C-4 | A single unreadable Memory Sync file holds back all of Memory Sync | Principle 6 (corruption is out of scope by default) | — | Corrupted files only | — | Reject | — | Not a supported scenario |
| C-5 | Historical design docs under `autobyteus-web/tickets/multi_node*` mention `NodeProfile` / `isSystem` | AC-901 ("code or docs") | — | They are ticket archives, not current docs | — | Reject | — | Not current documentation |
| C-6 | `Memory Sync config keeps schemaVersion` (handoff Known Risks) | Guideline § 3 | — | Not in this ticket's design; pre-existing | — | Reject (the handoff notes it) | — | A possible follow-up if wanted |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | Rename-only steps plus sealed migrations; no behavior change beyond the two approved exceptions | — |
| Matches behavior-defining supplemental artifacts | Fail | `GLOSSARY.md` "Source ID" contradicts the code's other `sourceId`s (F-001) | F-001 |
| Data-flow spine clarity | Pass | Startup: migrations → the readiness owner → services; client: runner → store; phone: migration → store | — |
| Ownership boundary preservation | Pass | Each hold-back has one owner of the readiness and one error, and every consumer translates it | — |
| Off-spine concerns | Pass | The migrations are sealed (boundary tests on server, web, iOS and Android) | — |
| Existing capability reuse | Pass | The app-data migration runner and capability hold-backs, the existing readiness owner (Case 7's shape) | — |
| Reusable owned structures | Pass | The client runners share one per-item order per medium | — |
| Data-model tightness | Pass | `isSystem` dropped; no compatibility fields | — |
| Repeated coordination ownership | Pass | `applyCapabilityReadiness` / `markCapabilitiesPending` are the one owner for the two hosts and the retry | — |
| Empty indirection | Pass | — | — |
| SoC / file responsibility | Pass | — | — |
| Ownership-driven dependencies | Pass | Old names only in sealed folders (my search) | — |
| Authoritative Boundary Rule | Pass | — | — |
| File placement | Pass | `app-data-migrations/migrations/<name>/`, `client-data-migrations/`, `DataMigrations/`, `datamigrations/` | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface boundary clarity | Pass | — | — |
| Naming; one meaning per word and one name per concept (Principle 15) | Fail | F-001 (`sourceId` collides); F-002 (`RemotePeerStartedRunViews`). Everything else is consistent with the glossary (`nodeId`, `entryId`, peer, remote, client address, sibling) | F-001, F-002 |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity | Pass | — | — |
| Dead code removed | Pass | `isEmbeddedNode` (spec-only), `memory-import-path-resolver.ts` (no source importer), the 426 / version branches | — |
| Tests clear and requirement-aligned | Pass | Migration tests per shape with re-run and interruption cases; boundary tests on every platform; hold-back tests | — |
| Test fixtures/helpers coherent | Pass | Released-writer fixtures | — |
| No stale / compatibility-only tests | Pass | — | — |
| API/E2E readiness | Pass | The handoff lists the pre-change-data scenarios | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` | `>220` Delta | SoC / Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/application/electronApplication.ts` | — | 407 | Pass | Pass | Pass | OK | — |
| `autobyteus-web/components/fileExplorer/FileItem.vue` | — | 397 | Pass | Pass | Pass | OK | — |
| all other changed source | — | ≤ 380 | Pass | Pass | Pass | OK | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | No aliases, no dual reads. The old names are only in sealed migrations, frozen shapes, their tests and released fixtures |
| No legacy old-behavior retention | Pass | — |
| Dead code removed | Pass | — |
| Persisted-data transition followed | Pass | `Migration Required` (U-3), done as sealed migrations with backups |
| No version-specific dual reads/writes | Pass | Recognition is by structure |
| Transition mechanics | Pass | Order, backups, interruption handling, failure keeps the original, hold-backs |

## Dead / Obsolete / Legacy Items Requiring Removal

None (beyond F-002's rename).

## Docs-Impact Verdict

- Docs impact: `Yes`, and done.
- What needs correcting, all from F-001 or the design text:
  - `GLOSSARY.md` "Source ID" changes with F-001;
  - the design spec's hold-back chain 4 (pairing, GraphQL) and the Change Scope's "Left alone" list need correcting by the Solution Designer (assumptions 1, 2 and 4).

## Additional Material Premise Validation

### `V-1` — "source ID" names one thing (SR-007 REQ-910 / AR-903)

- Origin: `New`
- Related approved requirement or established contract: REQ-910; Principle 15; `GLOSSARY.md`
- Scenario validity: contract
- Initiating basis kind: `Contract`
- Evidence: `sourceId` is already a skill source's, an update notification's and a package's ID (145 non-Memory-Sync uses at the base)
- Reachability: `Reachable`. Every reader of the code and glossary meets two meanings.
- Review consequence: Design Impact (F-001)

## Review Scorecard (Mandatory)

- Overall score: 8.9/10 (89/100)

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine | 9.5 | Startup, client and phone migration paths are clear and ordered | — | — |
| 2 | Ownership / Boundaries | 9.5 | One readiness owner; one error per capability; sealed migration areas | — | — |
| 3 | API / Interface Clarity | 9.0 | The renamed boundaries are clear | — | — |
| 4 | SoC / File Placement | 9.5 | — | — | — |
| 5 | Data-Model Tightness / Reuse | 9.5 | `isSystem` dropped; no compatibility fields | — | — |
| 6 | Naming / Readability (Principle 15) | 7.5 | Most of the vocabulary is now one-meaning | F-001's `sourceId` collision; F-002 | Rename per the Solution Designer's decision |
| 7 | API/E2E Readiness | 9.0 | Wired; scenarios listed | E2E from pre-change data pending | API/E2E |
| 8 | Runtime Correctness | 9.5 | The migrations and hold-backs are correct by reading, including interruption and both-present cases | — | — |
| 9 | No Backward Compat | 9.5 | Clean cut, with old names only in sealed folders | — | — |
| 10 | Cleanup | 9.0 | Dead branches removed | F-002 leaves one word-list hit | F-002 |

## Findings

| Finding ID | Severity | Path | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- | --- |
| F-001 | Medium | REQ-910 / design Step 5b / SM-2 … SM-5 targets / `GLOSSARY.md` "Source ID"; code `memory-sync/**`, GraphQL `memory-sync-schema.ts`, `memory-explorer-schema.ts`, web `types/memory.ts`, stores, `MemorySyncCard.vue`, hub wire | C-1, V-1 | Choose Memory Sync's identity name against its other uses in the system (Principle 15, Case 6), for example `syncSourceId` / "Sync source ID". Update REQ-910, Step 5b and the SM-2 … SM-5 targets (unreleased, so they change in place) and the glossary. Implementation then renames code, stored targets, wire and UI together | `Design Impact` / Solution Designer |
| F-002 | Low | `autobyteus-server-ts/src/remote-collaboration/inbound/remote-run-view-provider.ts:22,53` | C-2 | Rename `RemotePeerStartedRunViews` (for example `PeerStartedRunViews`) so the AC-901 search is clean | `Local Fix` / implementation (can travel with F-001's rework) |

## Follow-ups

- Follow-ups this review added: None. FU-002 and FU-003 stand.

## Classification

- `Design Impact` (F-001): the design's chosen name collides with existing uses.
- F-002 is a small Local Fix that goes with the rework.

## Recommended Recipient

- `/software_engineering_team/solution_designer`

## Residual Risks

- The E2E from pre-change data, the browser probes, multiprocess Memory Sync and the phone UI tests are API/E2E's.
- AC-904 is the user's check.
- The release note for delivery: "`list_available_nodes` is now `list_peer_nodes`; agents that use it need the new name selected."

## Latest Authoritative Result

- Review Decision: `Fail`, Design Impact (with one Local Fix)
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Fail` (V-1)
- Score Summary: 8.9/10; Naming 7.5
- Recommended Recipient: `/software_engineering_team/solution_designer`
- Notes:
  - The migrations (SM-1 … SM-10) and both hold-backs are correct by reading, including the interruption, both-present and failure cases.
  - All 10 assumptions are accepted. Assumptions 1, 2 and 4 need design-text corrections.
  - After the revision: a Targeted Delta Review of F-001 and F-002.
