# Design Review Report — Node Vocabulary And Data Model Cleanup (autobyteus-290)

## Review Round Meta

- Upstream Requirements Doc: `…/requirements-doc.md` (Approved, SR-002; REQ-909 and the extended REQ-901 / REQ-906 at SR-004, at the user's request)
- Upstream Investigation Notes: `…/investigation-notes.md` (V-01 … V-10)
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001 … SR-004)
- Reviewed Design Spec: `…/design-spec.md` at commit `2b11eb4169` (SR-005)
- Supplemental Task Artifacts Reviewed: `follow-ups.md` (FU-001 pulled in as Step 1b; FU-002)
- Relevant Solution Revision IDs: SR-001 … SR-005
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: the Solution Designer's SR-005 (commit `2b11eb4169`), answering ARCH-REV-001 (AR-901 … AR-903, N-901 … N-904)
- Prior Review Round Reviewed: round 1 (`ARCH-REV-001`, `Fail`)
- Latest Authoritative Round: 2
- Review method: the shared principles as updated 2026-10-24, including Principle 15 "One Vocabulary" and the "Vocabulary drift" trigger (`autobyteus-agents` `b87a507`), and the updated design examples.
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

## Persisted-Data Transition Verdict

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

`Fail` (round 2; `Design Impact`, AR-904, text only). AR-901 … AR-903 and N-901 … N-904 are resolved in the authoritative sections:
- AR-901, by the user's decision: updating agent configs is out of this ticket, REQ-906 states the exception, and Step 3 carries the release-note text;
- AR-902: the string carriers are listed with citations, and AC-901's per-identifier list is checked by code review;
- AR-903: REQ-910 and Step 5b rename Memory Sync's ID to `sourceId` / "Source ID" in code, GraphQL, the hub wire (a clean cut) and the UI, with the stored names kept through their three owners;
- N-901: `GLOSSARY.md`, with § 1 linking to it for Node and Peer and `DESIGN.md` pointing to it;
- N-902: the iOS 426 branch and `incompatibleServer` are removed;
- N-903: FU-001 is marked as pulled in;
- N-904: the mapping owners are named.

Two places in the documents still contradict these decisions; the implementation and code review check against them.

## Findings

### AR-904 — Two places still contradict the resolved decisions

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

`Design Impact` (AR-904).

## Recommended Recipient

Solution Designer (`/software_engineering_team/solution_designer`)

## Residual Risks

- RSK-901: an older phone app or desktop can't identify an updated node until it updates (U-2 and REQ-909, rule 9; accepted by the user).
- Memory Sync's identity semantics: FU-002.

## Latest Authoritative Result

- Review Decision: `Fail` (round 2; AR-904, text only)
- Material-Premise Gate: `Pass` (MP-901 handled by the user's decision: a stated REQ-906 exception plus the release note)
- Notes: classification `Large` / `High`. Design at commit `2b11eb4169` (SR-005).
