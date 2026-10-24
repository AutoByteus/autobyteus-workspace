# Design Review Report — Node Vocabulary And Data Model Cleanup (autobyteus-290)

## Review Round Meta

- Upstream Requirements Doc: `…/requirements-doc.md` (Approved, SR-002; REQ-909 and the extended REQ-901 / REQ-906 at SR-004, at the user's request)
- Upstream Investigation Notes: `…/investigation-notes.md` (V-01 … V-10)
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001 … SR-004)
- Reviewed Design Spec: `…/design-spec.md` at commit `f92030a027` (SR-006; the project rule change `b3d9c758f2`)
- Supplemental Task Artifacts Reviewed: `follow-ups.md` (FU-001 pulled in as Step 1b; FU-002)
- Relevant Solution Revision IDs: SR-001 … SR-006
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: 4
- Trigger: SR-006 widens the scope by the user's decision U-3, which reverses U-1. Stored names follow the code through sealed migrations SM-1 … SM-8 (server and client). The project rule changed: `DESIGN.md` rule 10 and Data Migration Guideline § 2 / § 3.
- Prior Review Round Reviewed: round 3 (`ARCH-REV-003`, `Pass`)
- Latest Authoritative Round: 4
- Review method: the shared principles as updated 2026-10-24, including Principle 15 "One Vocabulary" and the "Vocabulary drift" trigger (`autobyteus-agents` `b87a507`), and the updated design examples.
- Round-4 evidence (at `f92030a027`):
  - `autobyteus-server-ts/src/server-runtime.ts:183-206` (`runPending` → `applyCapabilityReadiness` → `buildStudioServer`: confirmed);
  - `remote-access/services/node-identity-service.ts:23-50` (`getNodeId()` creates and writes a new ID when the file has none);
  - callers `api/rest/remote-access.ts:31`, `compositions/remote-collaboration-composition.ts:58`;
  - `app-data-migrations/domain/app-data-migration-types.ts:42-54` (today's capabilities: `token_usage_history`, `custom_llm_providers`);
  - `startup/app-data-capability-readiness.ts:15-20` (one configure call per capability);
  - `autobyteus-web/electron/nodeRegistryStore.ts:100-158` (a tolerant per-record reader; an invalid file regenerates the default registry);
  - `electron/application/electronApplication.ts:362` (the registry load);
  - `plugins/20.windowNodeBootstrap.client.ts`, `21.mobileRemoteAccessBootstrap.client.ts` (renderer bootstrap order);
  - `stores/nodeStore.ts:44-198` (localStorage only without `electronAPI`);
  - iOS `SavedNodeProfile.swift:7-17`, `SavedNodeStore.swift:65-68` (keys `autobyteus.saved-node-profiles`, `autobyteus.selected-node-profile-id`);
  - Android `SavedNodeProfile.kt:9-19`, `SavedNodeStore.kt:84-86` (`saved_nodes`, `profiles`, `selected_profile_id`).
- Current-State Evidence Basis: code read in the worktree at `0b72123468`:
  - `autobyteus-server-ts/src/agent-execution/shared/runtime-agent-tool-exposure.ts:47-80` (the exposure is `requestedToolNameSet.has(LIST_AVAILABLE_NODES_TOOL_NAME)`; an unknown name is silently ignored);
  - `agent-definition/providers/agent-definition-node-reader.ts:65-73`, `file-agent-definition-provider.ts:73` (definitions are stored `agent-config.json` files under the node's agents directory, with `toolNames`);
  - `git tag --contains 93dc932920` (the commit that added `list_available_nodes`) → `v1.5.8`, `v1.5.8-beta.6`, `v1.5.8-beta.7`: the tool has shipped;
  - `/Users/normy/autobyteus_org/autobyteus-agents/agents/project-task-manager/agent-config.json` and its `SKILL.md` select or name it;
  - `autobyteus-web/electron/application/electronApplication.ts:123-150, 254-274`, `electron/preload.ts:45-48`, `electron/types.d.ts:37`, `electron/nodeRegistryTypes.ts:1-12` (shared types at the IPC boundary; separate option types and plain `string` parameters);
  - `autobyteus-server-ts/src/memory-sync/source/memory-sync-service.ts:55-129`, `memory-sync-config-service.ts:81` (`sourceNodeId` in code);
  - `autobyteus-ios/AutoByteusMobileCore/ConnectionValidator.swift:65-136`, `ConnectionDiagnostic.swift:95-145` (the version guard; the HTTP 426 → `incompatibleServer` branch); `grep 426` in the server: no path answers 426;
  - `autobyteus-web/stores/nodeStore.ts:53, 94`, `utils/remoteAccess/mobileCredentialStorage.ts:27, 42` (the localStorage owners).

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/node-vocabulary/tickets/in-progress/node-vocabulary`

## Routing Classification Review

- Task size: `Large`; architectural risk: `High`
- Classification rationale reviewed: yes. Renames across server, web, Electron, iOS and Android; an identity wire field; an agent-facing tool name; stored-name mapping owners; one intended behavior change (REQ-909).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`, with one contradiction inside the approved basis (AR-901).
- Approved requirements / intended behavior understood: one vocabulary (node, remote, peer, embedded local, entry, client address); renames only; stored names kept (U-1); the identity wire field renamed (U-2); the status version field removed (REQ-909); behavior unchanged otherwise (REQ-906).
- Relevant existing behavior and evidence confirmed: the audit V-01 … V-10 is accurate where I spot-checked it.
- Scope guardrail confirmed: yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes`.
- Remaining material ambiguity: AR-901 (REQ-906 and the tool rename cannot both hold for stored definitions without a decision).

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Path / Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-901 entry vs node ID | Contract (code) | Pass | Pass | Fail | Needs Correction | AR-902 (the guard), AR-903 (Memory Sync) |
| REQ-902 node ID one name / U-2 wire | Contract | Pass | Pass | Pass | Confirmed | N-904 (the mapping-owner list) |
| REQ-903 peer names / tool rename | Contract (tool) | Pass | Pass | Fail | Needs Correction | AR-901 (stored definitions) |
| REQ-904 other "peer" meanings | Code / docs | Pass | Pass | Pass | Confirmed | — |
| REQ-905 `isSystem` | Stored (U-1) | Pass | Pass | Pass | Confirmed | — |
| REQ-906 behavior unchanged | All | Pass | Pass | Fail | Needs Correction | AR-901 |
| REQ-909 no version field | Contract | Pass | Pass | Pass | Confirmed | N-902 (the 426 branch) |

## The Five Points The Handoff Asks About

1. **Stored-name mapping owners, one per stored shape: sound, with one stored shape missing.**
   - The node files each have one owner: the identity file (`NodeIdentityService`), the desktop registry file plus its localStorage copy (one `nodeEntryStorage` used by both; Electron already imports `../types`, so importing a `utils` owner is feasible), the mobile session (`mobileCredentialStorage.ts`), and the iOS and Android saved-node stores.
   - The missing stored shape is not a node file: **stored agent and team definitions that name the tool** (AR-901).
   - The verification list should name every mapping owner (N-904).
2. **Step 4, entry vs node, with the compiler as the guard: partly.**
   - The compiler does catch renamed fields on the shared types, including across Electron IPC (`nodeRegistryTypes.ts` re-exports `types/node`, and `getWindowContext` is typed `Promise<WindowNodeContext>`).
   - It does not catch plain `string` parameters, separate option types, or names: `createNodeBoundWindow(nodeId)`, `openNodeWindow` / `focusNodeWindow(nodeId: string)`, `shellWindowRegistry.getNodeIdForShell`, the `WorkspaceShellWindow` and `rendererConsoleDiagnostics` options, and the log lines.
   - "The compiler finds every entry-meaning use" (RSK-902) is the "the compiler enforces" signal of Principle 1 / design-examples Case 5 (AR-902).
3. **Step 3 as one step, coordinated with 260: sound for the code**, with no aliases (Principle 8). But the tool name is also a stored value in definitions, and in a shipped agent package (AR-901).
4. **The glossary location and the `DESIGN.md` pointer: acceptable; a better home is recommended (N-901).** `collaboration_model.md` § 1 is the existing vocabulary section, and one home beats two. But it lives in `autobyteus-server-ts/docs/design/`, while the glossary now governs web, Electron, iOS and Android words ("entry", "client address") that are not collaboration concepts.
5. **V-10 left as FU-002: partly (AR-903).**
   - The semantic question (should a Memory Sync source be identified by its node ID?) is rightly the user's: FU-002.
   - The names are not. `sourceNodeId` in code contradicts the approved REQ-901 and the new glossary, and the Nodes window shows "Source node id" beside "Node ID".
   - The design's reason ("renaming changes stored data and the hub protocol") does not hold if the stored key and the wire field are kept through their owners, the same U-1 pattern the design uses for the identity file.

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose Clear? | Linked? | Complete? | Consistent? | Status Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `follow-ups.md` | Pass | Pass | Pass | Fail | Pass | FU-001 is pulled in (Step 1b): mark it so. FU-002: see AR-903 |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | Principle 15 audit, V-01 … V-10 | — |
| Root cause explicit | Pass | Vocabulary drift: two meanings per word, two names per concept | — |
| Refactor decision explicit | Pass | Six steps, each with no behavior change, plus Step 1b | — |
| Supported by concrete sections | Fail | Stored definitions are a consumer of the tool rename that the steps omit | AR-901 |

## Spine Inventory Verdict

N/A for runtime spines: this is a rename, and no data flow changes, except Step 1b's one decision point (iOS validation without the version guard). Its call order stays one owner: `ConnectionValidator` → status decode → identity check → result.

## Boundary / Dependency / Interface Verdicts

| Area | Verdict | Notes |
| --- | --- | --- |
| Mapping owners at each stored boundary | Pass | One owner per stored shape; old files load unchanged (rule 7); `isSystem` ignored |
| Electron IPC boundary | Pass (types shared) | Renamed fields are caught; names on plain parameters are not (AR-902) |
| Identity wire (`nodeId`) and the status answer (no `compatibilityVersion`) | Pass | Clean cut (rule 9); every reader named, iOS included; Android has no reader |
| Tool contract `list_peer_nodes` | Fail | AR-901: stored definitions are consumers of the name |

## Shared Structure / Vocabulary Verdict (Principle 15)

| Word / Concept | One Meaning? | One Name? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| node ID (`srv_…`) | Fail | Pass | Fail | AR-903: Memory Sync's `sourceNodeId` / "Source node id" is a third ID with the same name |
| entry ID | Pass | Pass | Pass (with AR-902 for completeness) | — |
| peer | Pass | Pass | Pass | Client address, siblings and "a run of its own" are split out |
| remote | Pass | Pass | Pass | — |

Each domain word the design uses or introduces keeps one meaning, and each concept one name, across code, data, wire, tools, UI and docs (Principle 15): `Fail` (AR-903).

## Removal / Decommission Completeness Verdict

| Item | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `isSystem`, the version field and guard | Pass | N/A | Pass | Pass | — |
| iOS `incompatibleServer()` and the 426 case | Pass | N/A | Fail | Fail (non-blocking) | N-902: decide now. No server path answers 426, so it is a version-handshake remnant |

## Persisted-Data Transition Verdict (round 4, SR-006)

| Stored Subject | Approved Decision | Evidence | Proportionate? | Migration Safety Complete? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| SM-1 identity file | Migration Required (U-3) | Pass | Pass | Fail | Fail | AR-905 (hold-back owner and consumers); N-906 |
| SM-2 … SM-5 Memory Sync | Migration Required | Pass | Pass | Fail | Fail | AR-905 (`memory_sync` is a new capability without a consumer) |
| SM-6 … SM-8 client stores | Migration Required | Pass | Pass | Pass | Pass | N-907, N-908; SM-7 scope confirmed (N-909) |
| iOS / Android saved lists | No migration (claimed) | Fail | — | — | Fail | AR-906 |

## Persisted-Data Transition Verdict (rounds 1 … 3, superseded by SR-006)

| Stored Subject | Decision | Evidence | Proportionate? | Migration | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Identity file, desktop registry plus localStorage, mobile session, phone saved nodes | Directly Usable — No Migration (U-1) | Pass | Pass | N/A | Pass | One mapping owner each |
| Stored agent and team definitions naming `list_available_nodes` | **Undecided** | Fail | — | — | Fail | AR-901 |
| Memory Sync stored state (`sourceNodeId`) | Not touched (FU-002) | Pass | Pass | N/A | Pass | AR-903 keeps it stored as is |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic? | Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1, 1b, 2 … 6, each green | Pass | Pass | Pass | Pass (once AR-901 adds its step) |

## Claims Verified (Principle 1)

| Claim in the design | Cited / Checked | Holds? |
| --- | --- | --- |
| "The type change makes the compiler find every entry-meaning use" (RSK-902) | `electronApplication.ts:123-150, 254-274`; `preload.ts:45-48` | Partly (AR-902) |
| "Renaming [Memory Sync] changes stored data and the hub protocol" | `memory-sync-service.ts:55-129` | Not if the stored key and the wire field are kept through their owners (AR-903) |
| "Agent definitions in this repository that select the tool: none found" | true for the workspace repo; but stored definitions in users' data and the shipped `autobyteus-agents` PTM package select it | Incomplete (AR-901) |
| `incompatibleServer()` "keep it only if that path is live" | `ConnectionDiagnostic.swift:110` (426); no server answers 426 | Decidable now (N-902) |
| iOS guard at `ConnectionValidator.swift:135` | opened | Yes |

## Material Premise Validation

### `MP-901` — A user's own agent definition selected `list_available_nodes`, then the node updates

- Initiating basis: `User`. The tool shipped in v1.5.8 as opt-in by definition (autobyteus-261). A user who added it to a definition has `toolNames: [..., "list_available_nodes"]` in the stored `agent-config.json` on their node.
- Path after Step 3: `buildRuntimeAgentToolExposure` → `requestedToolNameSet.has(LIST_PEER_NODES_TOOL_NAME)` → `false`. The old name matches nothing and raises no error.
- Consequence: the agent silently loses the tool. Its prompt or skill may still tell it to call `list_available_nodes`. This contradicts REQ-906 ("the tools' abilities and exposure" unchanged). The same holds for the shipped Project Task Manager package until it is updated.
- Reachability: `Reachable`.
- Review consequence: AR-901.

## Review Decision

`Fail` (round 4; `Design Impact`, AR-905 and AR-906). The migration design is sound in shape:
- server migrations in the existing sealed area, run before the services;
- a client sealed area with two runners and a boundary spec;
- recognition by structure, with no version field;
- new name first, then the old one removed;
- backups;
- a checklist answered item by item;
- the mapping owners removed, as rule 10 requires.

Two gaps remain: who applies the two hold-backs (and how `NodeIdentityService` refuses to create an ID), and the phone apps' stored keys under the new rule 10. AR-901 … AR-904 stay resolved.

## Findings

### AR-905 — The hold-backs have no named consumers; REQ-913 depends on the identity service refusing

- Type: Design Impact
- Severity: Medium (blocking)
- Protects: REQ-913 ("never gives a node a new node ID … the features that need the node's ID are held back, the rest of the app works"), AC-905, REQ-911; Principle 11 (derived consumers); Principle 13 (behavior by absence)
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Evidence:
  - `NodeIdentityService.getNodeId()` creates and writes a fresh `srv_…` ID whenever the identity file has no valid ID (`node-identity-service.ts:32-50`). After a failed SM-1, the new file is absent, so the next caller (the status route at `api/rest/remote-access.ts:31`, or remote collaboration's `ownNodeId` at `remote-collaboration-composition.ts:58`) would create a **new** node ID. That is exactly what REQ-913 forbids.
  - A capability takes effect only through its configure call in `applyCapabilityReadiness` (`startup/app-data-capability-readiness.ts:15-20`, one per capability). Today's capabilities are `token_usage_history` and `custom_llm_providers` (`app-data-migration-types.ts:42-43`). So `memory_sync` is new too, not only `node_identity`.
  - The design says remote access and remote collaboration "report 'not available …'" but names no owner that does it.
- Required update: in § Stored Names Migration, name the hold-back chain for each capability.
  - **`node_identity`:**
    - `applyCapabilityReadiness` configures `NodeIdentityService` (for example `configureNodeIdentityAvailability(ready)`);
    - while it is not ready, `getNodeId()` throws one explicit "node identity not migrated" error and never creates or writes. This is the single owner of REQ-913;
    - name each consumer's answer: the status route (an explicit unavailable answer, not a new ID), `PeerGateway` admission and `PeerClient` (the remote-collaboration refusal), phone-access pairing, and the GraphQL that shows this node's ID.
    - On a fresh install (no file at either name), the migration is "already current" and the service creates the ID as today. Say so.
  - **`memory_sync`:** add it to `AppDataCapability`; configure the Memory Sync source loop, the hub ingestion route and the settings GraphQL, with their "not available until migrated" answer.
  - Add unit cases: a held-back identity creates no file, and the status route returns the unavailable answer.
- Why proportionate: one configure call per capability plus one guard in the identity service, on the existing readiness mechanism.
- Recommended recipient: Solution Designer

### AR-906 — The phone apps' stored keys still say "profile"; under rule 10, decide

- Type: Design Impact
- Severity: Low (blocking: the claim governs the AC-901 word list and the "no migration" for phones)
- Protects: REQ-911 ("Stored names follow the renames"), REQ-901 (an entry is an entry); `DESIGN.md` rule 10; Principle 15
- Scope status: Within Approved Scope (a decision within U-3)
- Changes approved behavior: No
- Evidence:
  - The design says "The iOS and Android saved lists change no stored key (only the type is renamed; the type name isn't stored)".
  - The records' fields are safe: there is no node-ID field, and `id` stays (`SavedNodeProfile.swift:7-17`, `SavedNodeProfile.kt:9-19`).
  - But the storage **keys** carry the word the rename removes: iOS `autobyteus.saved-node-profiles` and `autobyteus.selected-node-profile-id` (`SavedNodeStore.swift:65-68`); Android `profiles` and `selected_profile_id` (`SavedNodeStore.kt:84-86`).
  - Rule 10 renames stored keys when a rename removes a second name for one concept, and skips them when the change is "pure style".
- Required update: decide and state it.
  - (a) "Profile" → "entry" is a second name for one concept (as D-1 and REQ-901 treat it). The phone keys are then renamed by a sealed step in each app, with that app's own runner, the same order and a backup. Add them to REQ-911's list and to the AC-901 word list.
  - (b) It is pure style for these keys. Then say so in § Stored Names Migration with that reasoning, and accept that the keys say "profile" while the code says "entry". That contradicts Principle 15's "one concept, one name", so (b) needs a sentence the user can see.

  Either way, Step 4's "rename the type" must not touch the key strings by accident.
- Why proportionate: a decision and, for (a), two small native steps.
- Recommended recipient: Solution Designer

### Round-4 notes (non-blocking)

- N-906, SM-1 edge cases:
  - "Both files present with the same value → keep the new one" covers the crash between write and remove. Both present with *different* values is not reachable through the product. If it is seen anyway, treat it as a failure (hold back, log), never "keep the new one".
  - The released identity file also has `createdAt` (`node-identity-service.ts:45-47`). The new shape should keep it (`{nodeId, createdAt}`); § Stored Names Migration lists only `{nodeId}`.
- N-907, SM-6 tolerance: today's reader normalizes record by record and drops invalid records (`nodeRegistryStore.ts:100-158`), so files written by older releases load. SM-6 should rename only the named fields per record (`serverInstanceId` → `nodeId`, drop `isSystem`) and copy every other field unchanged, failing only for unreadable JSON. Then older-release records migrate, and a failure has the same consequence as today: an unreadable file regenerates the default registry. Otherwise, a structurally strict migration that fails on an older record would let current code write `node-registry.json` with the embedded entry only, and the next start's structural check (old and new both present) would never retry.
- N-908, call sites (handoff point 2): cite them. The Electron runner goes before `loadNodeRegistrySnapshot` at `electron/application/electronApplication.ts:362`. The browser runner goes in a client plugin ordered before `20.windowNodeBootstrap.client.ts` and `21.mobileRemoteAccessBootstrap.client.ts` (for example `19.clientDataMigrations.client.ts`). Several tabs of one origin may run it at once; the structural check makes that idempotent, so state it.
- N-909, SM-7 scope (handoff point 3): confirmed. `nodeStore.ts` writes the key only when `window.electronAPI` is absent (`:130-198`). In Electron windows the runner finds no old key, a no-op.

### Round-3 note (non-blocking)

- N-905: § Risks RSK-902 still says the type change "makes the compiler find every entry-meaning use". AR-902 asked to reword it: the compiler finds renamed fields on the shared types, and Step 4's carrier list plus AC-901's per-identifier list cover what it can't see. Align the sentence; the implementation follows Step 4 and AC-901.

### AR-904 (resolved in ARCH-REV-003) — Two places still contradict the resolved decisions

- Type: Design Impact
- Severity: Low (blocking: text only, but AC-901's check and the scope are read from these lines)
- Protects: AC-901, REQ-906; design principles 14 and 15 (one place per decision)
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Evidence:
  - `design-spec.md` § Verification: "the word-list search (AC-901): `serverInstanceId` only in the two mapping owners". Step 1's "Mapping owners of stored names (N-904)" now names seven owners, and Step 5b adds `sourceNodeId` (kept only in its three owners), which the word list does not include.
  - `requirements-doc.md` REQ-903 ("the docs and agent configs that name it change with it") and § Scope Guardrail ("… and agent configs that name the tool") contradict REQ-906's exception: updating stored agent configs and packages is out of this ticket, by the user's decision.
- Required update:
  - § Verification: point to Step 1's owner list ("old names only in the mapping owners listed in Step 1"), and add `sourceNodeId` to the word list (allowed only in Step 5b's three owners) and `list_available_nodes` outside the release-note text.
  - REQ-903 and the Scope Guardrail: drop "agent configs", or say "agent configs in this repository (none found)" with a pointer to REQ-906.
- Why proportionate: three sentences.
- Recommended recipient: Solution Designer

The round-1 text follows, kept for traceability (AR-901 … AR-903 resolved in ARCH-REV-002).

### AR-901 (resolved) — The tool name is a stored value in definitions; renaming it silently removes the tool from them

- Type: Requirement Gap (it needs the user's decision: a migration of stored definitions, or an accepted behavior change)
- Severity: Medium (blocking)
- Protects: REQ-906 ("the tools' abilities and exposure" unchanged), REQ-903; Principle 15 ("a stored name changes only through the persisted-data decision"); Principle 5
- Scope status: Requirement Gap — User Approval Required
- Changes approved behavior: Yes, unless stored definitions are migrated
- Evidence: MP-901.
  - `runtime-agent-tool-exposure.ts:80` matches by name and ignores unknown names.
  - Definitions are stored `agent-config.json` files with `toolNames`.
  - The tool shipped in `v1.5.8`.
  - The shipped PTM package selects it (`autobyteus-agents/agents/project-task-manager/agent-config.json`, `SKILL.md`).
  - U-1 decided only the node files.
- Required update: add a persisted-data decision for **stored definitions that name `list_available_nodes`**: agent definitions; team definitions if they carry member tool lists; team-local and application-owned definitions if they can select it. Present the options to the user:
  - (a) A one-time sealed startup migration renames the name in stored definition configs, with a completion marker, per the Data Migration Guideline. No alias in runtime code.
  - (b) Accept that such definitions lose the tool until the user re-selects it. This is a behavior change, so REQ-906 needs a stated exception and a release note.

  Either way, schedule the shipped PTM package's update with this release, not after it. That coordination is the PTM's, but the design should name it as a consumer with its timing.
- Why proportionate: one decision and, for (a), one small isolated migration. No compatibility alias (Principle 8).
- Recommended recipient: Solution Designer (to obtain the user's decision)

### AR-902 (resolved) — "The compiler finds every entry-meaning use" is only partly true; name the carriers it can't see

- Type: Design Impact
- Severity: Low (blocking: it is the method behind AC-901's "entry-meaning `nodeId`" check)
- Protects: REQ-901, AC-901; Principle 1 (claims about code)
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Evidence:
  - The compiler catches renamed fields on `WindowNodeContext` / `NodeEntry` and the shared IPC types.
  - It cannot see entry IDs carried by plain `string` parameters or separate option types: `electronApplication.ts:130-150` (`createNodeBoundWindow(nodeId)`, the `WorkspaceShellWindow({nodeId})` option, the `rendererConsoleDiagnostics` option, the log lines), `:254-258` (`open-node-window` / `focus-node-window` handlers), `preload.ts:45-46`, `shellWindowRegistry.getNodeIdForShell`.
  - The same applies to window-scoped resolvers that take a `string`.
- Required update: in Step 4, list these carriers by file (Electron main, preload, the window registry, diagnostics, window-scoped resolvers taking `string`) with their classification. Make AC-901's entry-meaning check concrete: the implementation handoff lists every remaining `nodeId` identifier in `autobyteus-web/electron/`, `stores/` and `utils/` with its meaning. Reword RSK-902 accordingly.
- Why proportionate: a list and a check method; no new mechanism.
- Recommended recipient: Solution Designer

### AR-903 (resolved) — Memory Sync's `sourceNodeId` and "Source node id" contradict REQ-901 and the new glossary; rename the names, keep the data

- Type: Design Impact
- Severity: Low (blocking)
- Protects: REQ-901 ("In code, `nodeId` means only the node's ID"), REQ-907 (the docs and glossary state one rule); Principle 15 ("two different IDs never share a name")
- Scope status: Within Approved Scope (names only; the semantic question stays FU-002)
- Changes approved behavior: No
- Evidence:
  - `memory-sync-service.ts:55-129` and `memory-sync-config-service.ts:81` use `sourceNodeId` for a user-entered import identity.
  - The UI label "Source node id" (`memorySyncSettings.ts:29`) appears in the same Nodes window that shows "Node ID: srv_…".
  - The design's reason for leaving it ("changes stored data and the hub protocol") does not apply to renaming code and UI names. The stored key and the hub wire field can be kept through their owners, as U-1 does for the identity file.
- Required update: rename the code identifiers (for example `sourceId`) and the UI label (for example "Source ID") now. Keep the stored state key and the hub request field unchanged through their one owners (the Memory Sync config and state stores, and the hub client), documented there. FU-002 keeps only "should a source be identified by its node ID?". If the Solution Designer prefers to leave even the names, REQ-901 needs an explicit, user-approved exception.
- Why proportionate: renames within the ticket's own pattern; no data or protocol change.
- Recommended recipient: Solution Designer

### Non-blocking notes

- N-901, glossary home: `collaboration_model.md` § 1 is the existing vocabulary, but it sits in `autobyteus-server-ts/docs/design/` and now governs web, Electron, iOS and Android words ("entry", "client address") that are not collaboration concepts. Consider a repository-level glossary (for example `docs/glossary.md` beside `DESIGN.md`, or a `DESIGN.md` § Vocabulary), with § 1 pointing to it. Either way, keep one home per word.
- N-902, Step 1b: no server path answers HTTP 426 (`grep 426` in `autobyteus-server-ts/src`). The `case 426: return incompatibleServer()` branch in `ConnectionDiagnostic.swift:110` is therefore a version-handshake remnant. Remove it with the guard and `incompatibleServer()`, so 426 falls into the default mapping, rather than leaving "if live" to implementation.
- N-903, follow-ups: mark FU-001 as pulled in (Step 1b, SR-004).
- N-904, verification: Step 1's consumer check and AC-901 say `serverInstanceId` remains only in "the two mapping owners". With the mobile session and the iOS and Android stores, name every mapping owner that keeps a stored `serverInstanceId` or `id` key.

## Classification

`Design Impact` (AR-905, AR-906).

## Recommended Recipient

Solution Designer (`/software_engineering_team/solution_designer`). Implementation is holding the mapping owners and continuing the plain renames; that may go on.

## Residual Risks

- RSK-901: an older phone app or desktop can't identify an updated node until it updates (U-2 and REQ-909, rule 9; accepted by the user).
- Memory Sync's identity semantics: FU-002.

## Latest Authoritative Result

- Review Decision: `Fail` (round 4; AR-905, AR-906)
- Material-Premise Gate: `Pass` (MP-901 handled by the user's decision: a stated REQ-906 exception plus the release note)
- Notes: classification `Large` / `High`, now with migrations. Design at commit `f92030a027` (SR-006).
