# Design Review Report — phone-registered-folders-436 (autobyteus-436): the phone opens any file a conversation names, read-only

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-registered-folders-436/tickets/in-progress/phone-registered-folders-436/requirements-doc.md` (SR-004, Approved)
- Upstream Investigation Notes: `…/tickets/in-progress/phone-registered-folders-436/investigation-notes.md` (including "Resumed 2026-11-09" and "Design Evidence")
- Upstream Solution Revision Record: `…/tickets/in-progress/phone-registered-folders-436/solution-revision-record.md`
- Reviewed Design Spec: `…/tickets/in-progress/phone-registered-folders-436/design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed: `autobyteus-server-ts/docs/design/node_access_model.md` (uncommitted diff: NAS-39, NAS-40, §5 row); `follow-ups.md` (FU-001); `evidence/PROBE-01-phone-file-reach.log` (historical, before 437); `handoff-architecture-review.md`
- Relevant Solution Revision IDs: SR-004 (requirements), SR-005 (design)
- Architecture Review Revision Record: `…/tickets/in-progress/phone-registered-folders-436/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Solution Designer handoff, `Architecture Design Complete`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `codex/phone-registered-folders-436` @ `34ea6e36bb` (437 slice 1 delivered); documents uncommitted; no source changes.

## Routing Classification Review

- Task size: `Medium`. About 12–15 files inside existing owners: one new server reader and route, one new phone composable.
- Architectural risk: `High`. A new route returns any file on the node's computer to a phone credential (security-contract change).
- Independent Architecture Review required: `Yes`. High risk alone selects review.
- Design approval: `Not required`, with a reason: the design adds no visible behavior beyond SR-004, which the user approved. It is not `Pending`, so there is no routing inconsistency.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`.
- Approved intent: the user dropped the folder list (DEC-001 = S). Outside the run's folder, the phone opens any absolute path, read-only. The node serves one file per GET to owner and phone credentials (DEC-002); peers and memory sync sources get 403.
- Existing behavior confirmed in code:
  - The phone branch returns `file_available_on_host` at `useEventMonitorFilePreview.ts:49-51` (no target, no root or no navigation) and `:57-59` (path outside the workspace).
  - `sendUserFile` sets `sandbox allow-scripts` and `nosniff` and sends a stream (`api/rest/user-file-reply.ts:8-21`).
  - The workspace content route checks `isFile` and streams (`api/rest/workspaces.ts:13-58`).
  - In 437's `routeAccessFor`, an unlisted route is owner+phone, `/rest/remote` is peer and `/rest/memory-sync` is memory sync source; permission is decided by route pattern (`node-route-permissions.ts:5-6,19-20,74-85`).
  - The phone's HTML preview iframe is `sandbox="allow-scripts"` with no `allow-same-origin` (`HtmlPreviewer.vue:4-10`). Blob HTML therefore runs in an opaque origin, not the phone app's origin, which holds the credential.
- Supporting claim checked: "the phone credential already reaches every folder" is true. `createWorkspace` plus `/rest/workspaces/:id/content` are still owner+phone after 437 (investigation "Resumed 2026-11-09"; FU-001, sent 2026-11-08). The new route widens no reach that a phone credential does not already have.
- Scope guardrail confirmed: folder lists, credential limits (autobyteus-441), writes and folder listing, the desktop path, and relative Markdown images are out of scope. Preserved: inside-folder behavior, BEH-003/004, NA-1…NA-15.
- Statements about existing code the design relies on: all cited lines match. One detail is below (R-2): line 49's `!mobileNavigation` case cannot become a node-file open.

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass (DS-001) | Confirmed | — (R-2 non-blocking) |
| BEH-002 | Contract | Pass | Pass | Pass (DS-002) | Confirmed | — (R-1 non-blocking) |
| BEH-003 | User | Pass | Pass | Pass (unchanged) | Confirmed | — |
| BEH-004 | User | Pass | Pass | Pass (desktop branch untouched) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose Clear? | Linked? | Complete? | Consistent? | Status Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `node_access_model.md` (NAS-39, NAS-40, §5) | Pass | Pass | Pass | Pass | Pass | — (R-3 suggests one sentence) |
| PROBE-01 log and probe | Pass | Pass | Pass | Pass | Pass | Correctly marked historical (before 437) |
| `follow-ups.md` FU-001 | Pass | Pass | Pass | Pass | Pass | Already sent; now autobyteus-441 |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Present; posture Feature | Pass | design-spec | — |
| Root cause `No Design Issue Found`, evidence-backed | Pass | Existing owners: the gate (permission row), `sendUserFile`, `authorizedFetch`, `MobileFileViewer` | — |
| Refactor `No`, explained | Pass | New reader owner; `build-studio-server.ts` (509 lines) not grown | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade Vs Owner? | Naming Clear? | One Owner Per Node, In Order? | Off-Spine Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Phone tap → viewer | Pass | Pass | Pass | Pass | Pass | Pass (message mapping) | Pass |
| DS-002 | GET → gate → reader → `sendUserFile` | Pass | Pass | Pass (route thin; `NodeFileReader` owns path rules) | Pass | Pass | Pass (MIME lookup) | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear? | Internals Stay Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| 437 gate (permission row) | Pass | Pass | Pass | Pass | The route reads no credential |
| `NodeFileReader` | Pass | Pass | Pass | Pass | The route never touches `fs` |
| `useMobileNodeFile` | Pass | Pass | Pass | Pass | `MobileFiles.vue` never fetches |

## Dependency Direction / Forbidden Shortcut Verdict

Pass. `api/rest/node-files.ts` → `node-files/node-file-reader.ts` → `fs`, `mime-types`; `node-files` imports neither workspaces nor the gate. On the web: `MobileFiles.vue` → `useMobileNodeFile` → `authorizedTransport`, `determineFileType`.

## Interface Boundary Verdict

| Interface | Subject Clear? | Singular? | Identity Explicit? | Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `GET /rest/node-files/content?path=<absolute>` | Pass | Pass (read one file) | Pass (absolute path only) | Low | Pass |
| `NodeFileReader.open(path)` | Pass | Pass | Pass | Low | Pass |
| `MobileNavigation.openNodeFile({ path })` / `nodeFile` query | Pass | Pass | Pass (separate from `workspace`+`file`) | Low | Pass |
| `useMobileNodeFile(path)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

Pass. Reused or extended: the gate, `sendUserFile`, `authorizedFetch` and `PROTECTED_REST_PREFIXES`, `determineFileType`, `MobileFileViewer`, `mime-types`. The new `node-files` area is justified: workspaces are the wrong owner for paths outside any workspace.

## Subsystem / Capability-Area Allocation Verdict

Pass. The server gets `src/node-files/` (new), the `api/rest` route and the `api/security` row. The web gets `composables/mobile`, `MobileFiles.vue` and the link handler.

## Reusable Owned Structures Verdict

Pass. No repeated structure. The reader's result `{ realPath, mimeType, stream }` maps onto `UserFileContent`.

## Shared Structure / Data Model Tightness Verdict

Pass. The refusal is `{ code, message }`, as in 437's refusal shape. The phone's node-file state is "shaped like the viewer's open-file state", with no new shared type. Derived consumers: `MobileFileNavigation` users and `PROTECTED_REST_PREFIXES` are listed (`Pass`). Vocabulary: "node file" is distinct from `/rest/files/` (media) and is added to the glossary (`Pass`).

## File Responsibility Mapping Verdict

Pass. Each listed file has one concern.

## Subsystem / Folder / File Placement Verdict

Pass.

## Removal / Decommission Completeness Verdict

| Item | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Phone-branch `file_available_on_host` returns | Pass | Pass | Pass | Pass | The key stays for the desktop branch. R-2: the line-49 no-navigation case keeps a non-open result |

## Legacy / Backward-Compatibility Verdict

Pass. The old phone status is replaced outright; no wrapper.

## Persisted-Data Transition Verdict

N/A. Nothing is stored (`Not Affected`).

## Change / Refactor Safety Verdict

Pass. Order: server and e2e first, then phone, probe, docs.

## Example Adequacy Verdict

Pass. The request URL and refusal body are given. The path rule (absolute, no `..`, real path, regular file) is concrete, and AC-003 lists the cases.

## Material Premise Validation

- P-001 — a phone credential reads the node's own stored secrets through the route, such as `remote-collaboration/peers.json` (peer secrets, plain, 0600) or `mcp-gateway/token.json`.
  - Basis: Contract. NA-7 lists the MCP gateway token among owner actions. 437 M-5 says "Phones and peers cannot read it."
  - Path: owner's phone → `GET /rest/node-files/content?path=<data dir>/mcp-gateway/token.json` → owner+phone row → regular file → 200.
  - Reachability: `Reachable`, but not new. The same file is reachable today through `createWorkspace(<data dir>)` and `/rest/workspaces/:id/content`, both owner+phone after 437, and through any agent run the phone starts. The requirements' non-goal ("No protection against the paired phone itself … until it is revoked", accepted by the user) covers it.
  - Consequence: no finding. Recorded as R-3, a recommendation for the contract and autobyteus-441.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None blocking. Non-blocking recommendations for implementation (no design revision needed):

- R-1 (QR-001, REQ-003/004): define `NodeFileReader`'s mapping for every `fs` failure, so RSK-002's "404/500" is not left open. Suggested:
  - `ENOENT`/`ENOTDIR` → 404 `NODE_FILE_NOT_FOUND`;
  - `EACCES`/`EPERM`/`ELOOP` and invalid-path errors (for example a NUL byte) → a defined 4xx code that the phone shows as "could not be opened";
  - never log the path or `String(error)` with the path. The workspace route logs `filePath` on 500 (`workspaces.ts:54-56`); do not copy that.
- R-2 (REQ-001): in `openMobilePath`, the `!mobileNavigation` case (line 49) cannot open a node file and keeps a non-open result. The node-file branch keeps the existing `isOriginCurrent()` / context check before navigating (lines 60-61).
- R-3 (contract clarity, non-blocking): NAS-39 / the §5 row could say that "any file" includes the node's own data folder (peer secrets, the MCP gateway token), already reachable through workspaces. That way autobyteus-441 starts from the full picture.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation engineer (`/software_engineering_team/implementation_engineer`).

## Residual Risks

- RSK-001: large files are fetched whole into a blob on the phone. "Too large" is decided after loading (`MobileFileViewer.vue:44`), as for workspace files today.
- RSK-002: OS-denied paths (R-1).
- On a Windows node, an absolute UNC path (`\\host\share\…`) would make the node open an SMB connection. This is within the accepted non-goal (only the owner's paired phone can ask); worth noting for autobyteus-441.
- Same-origin safety of node files on the phone relies on the viewer: HTML stays in `sandbox="allow-scripts"` without `allow-same-origin`. The server's CSP does not carry over to blob URLs, so keep that attribute.
- autobyteus-440 is merging on another copy. The PM asked to read `origin/personal` before touching phone code.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (P-001 Reachable, not new, covered by the approved non-goal)
- Notes: the design is small, concrete and owner-aligned, and ready for implementation in its stated order.
