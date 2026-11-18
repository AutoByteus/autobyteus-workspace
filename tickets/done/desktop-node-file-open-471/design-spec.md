# Design Spec — desktop-node-file-open-471 (autobyteus-471)

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements: `requirements-doc.md` SR-002 (the user, 2026-11-11; DEC-001 = C).
- Behavior-defining supplements: `node_access_model.md` (unchanged: NAS-39 already covers the owner credential on the node-file route).
- User approval of the design: `Not required` (no visible behavior beyond the approved requirements).
- Design status: `Ready`
- Investigation notes: `investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, `/DESIGN.md` (read in this conversation; rules 1, 4, 5, 11), `GLOSSARY.md` ("Node file", 436).
- Conflicts or discrepancies: none.

## Current-State Read

- Desktop link handler: `useEventMonitorFilePreview.ts:66-118` chooses `local-absolute` (embedded window with trusted capability) or a workspace-relative path mapped by `mapAbsolutePathToWorkspaceRelative`; otherwise `file_available_on_host`.
- Desktop Files panel: `fileExplorerContentActions._openFileWithMode` / `_reloadOpenFile` (`stores/fileExplorerContentActions.ts:61-128`) load an absolute path locally only in the embedded window, else as a workspace path (GraphQL `fileContent`) or an external URL.
- Phone: `mobileFileOpening.ts` owns the phone rule (workspace file, node file, or `unavailable` for a remote run). `useMobileNodeFile.ts` fetches a node file once (`nodeFileContentUrl`, refusal codes → messages, text as content, anything else as an object URL revoked on close).
- The node-file route (`/rest/node-files/content`, 436) accepts owner and phone credentials; the desktop window's requests to a node carry its owner credential (437).
- Phone limit: `MobileFileViewer.vue:30,46` (`MOBILE_FILE_VIEW_MAX_CHARS`, `isTooLarge`).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium` (about 10 web files and their tests; no server change).
- Architectural risk: `Low`: the existing node-file route, credentials and viewers absorb it; no new route, contract, persistence or security behavior (the desktop reads what its owner credential could already read).
- Escalation trigger: any need for a server change, or a viewer that cannot show a node file from an object URL.

## Intended Change

The desktop opens a node file the same way the phone does, through one shared node-file loader; remote-run paths say where the file is; the phone shows text files of any size.

## Change Scope (Mandatory)

- In scope: UC-001…UC-003. Files below.
- Derived consumers: `useMobileNodeFile` moves its fetch-and-classify logic into the shared loader (behavior unchanged); `MobileFileOpenOutcome.unavailable` gains the remote node's name.
- Deliberately left alone: the node-file route and permissions; the embedded window's local-file path; inside-folder workspace files; the desktop viewer (no size limit).
- Follow-ups: none.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Requirement / AC | Change | Spine |
| --- | --- | --- | --- |
| BEH-001 | REQ-001, REQ-002; AC-001, AC-002 | Desktop node file through the shared loader | DS-001 |
| BEH-004 | REQ-003; AC-003 | True message on both clients | DS-002 |
| BEH-005 | REQ-004; AC-004 | Limit removed | — |
| BEH-002, BEH-003 | AC-005 | Preserved | — |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`.
- Current design issue found: `Yes`: two parallel paths (phone, desktop) serve one capability "open a file a conversation names" with different gates (Principle 1, "a gate on one path only").
- Triggers: *Several kinds or forms* (desktop windows: embedded vs node; phone) fires → one rule per window kind, written once; *Repeated coordination*: the node-file fetch/classify/refusal mapping would be written twice → one shared loader (`utils/fileExplorer/nodeFileContent.ts`); *Legacy cleanup*: the host-workspace text and key are removed.
- Root cause classification: `Missing Invariant` (the desktop never got the 436 rule).
- Refactor needed now: `Yes`, small: extract the shared loader from `useMobileNodeFile`.

## Terminology

"Node file" (GLOSSARY, 436). "Remote run" (existing: a run another node runs).

## Legacy Removal Policy (Mandatory)

- Removed: `file_available_on_host` (key, both locales, both callers, tests); `MOBILE_FILE_VIEW_MAX_CHARS`, `isTooLarge` and the "too large" branch in `MobileFileViewer.vue` (and its tests).
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- `Not Affected`.

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | Desktop click on a path | Read-only file in the Files panel, or a reason | `useEventMonitorFilePreview` → `fileExplorerContentActions` → `loadNodeFile` |
| DS-002 | Primary | Click on a remote run's path (desktop or phone) | Message naming the node | `useEventMonitorFilePreview` / `mobileFileOpening` |
| DS-003 | Bounded local | Shared loader | `{ text } \| { blob } \| { refusal code }` | `nodeFileContent.ts` |

## Primary Execution Spine(s)

- DS-001: `Click → useEventMonitorFilePreview.openPath → remote run? (DS-002) : embedded window with local capability? local-absolute (as today) : inside the run's folder? workspace-relative (as today) : node file → fileExplorerStore.openFilePreview(absolutePath, workspaceId, { accessIntent: read-only }) → _openFileWithMode: absolute path in a non-embedded window → _loadNodeFile → loadNodeFile(restBaseUrl, path) → Text: content; other types: object URL; refusal: the REQ-002 message as the file's error → Files panel shows it`
- DS-002: `Click → remote run (useRemoteRunsStore().runOfAgentRun(runId)) → "This file is on {{node}}, where this run runs." (desktop status line; phone toast/status as today for links and path attachments)`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | The handler keeps its two existing ways and adds the third: any other absolute path on the run's node opens as a node file. The Files panel store decides how to load a path by its form and the window: an absolute path is local in the embedded window with local capability, a node file in every other window; a relative path is a workspace file; an `http(s)` URL is external. A node file is fetched once by the shared loader (the window's owner credential is attached by the desktop app); text becomes content, anything else an object URL the store revokes when the file is closed or reloaded; a refusal becomes the plain message. | `fileExplorerContentActions` (load), `loadNodeFile` (fetch and classify) |
| DS-002 | The remote-run check runs first in both clients and names the node from the remote runs store. | `useEventMonitorFilePreview`, `mobileFileOpening` |

## Ownership Map

- `utils/fileExplorer/nodeFileContent.ts` (new): `nodeFileContentUrl` (moved), `loadNodeFile(restBaseUrl, absolutePath)` → `{ kind: 'text', content } | { kind: 'blob', blob, type } | { kind: 'refused', code }`, using `authorizedFetch` (adds the phone credential on the phone; on the desktop the app attaches the owner credential), and `nodeFileRefusalMessageKey(code)`.
- `useMobileNodeFile.ts`: uses the loader (phone behavior unchanged).
- `fileExplorerContentActions.ts`: `_loadNodeFile` and the routing rule in `_openFileWithMode` and `_reloadOpenFile`; object URL revoked in `closeFile` and on reload.
- `useEventMonitorFilePreview.ts`: node-file fallback; remote-run message; host-workspace text removed.
- `mobileFileOpening.ts`: `unavailable` carries `nodeName`; callers word the new message.
- `MobileFileViewer.vue`: no size limit.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced by |
| --- | --- | --- |
| `file_available_on_host` key and uses | Not true anymore | Node file open; remote-run message `file_on_other_node` |
| `MOBILE_FILE_VIEW_MAX_CHARS`, `isTooLarge`, "too large" branch | User decision C | — |
| Fetch/classify code inside `useMobileNodeFile.ts` | One loader | `nodeFileContent.ts` |

## Interface Boundary Mapping

| Interface | Subject | Shape |
| --- | --- | --- |
| `loadNodeFile(restBaseUrl, absolutePath)` | Node file | absolute path → tagged result |
| `fileExplorerStore.openFilePreview(path, workspaceId, { accessIntent })` | Open file | unchanged signature; an absolute path in a non-embedded window means a node file |
| `MobileFileOpenOutcome` | Phone open result | `unavailable` → `{ status: 'unavailable', nodeName }` |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Node file fetch, types, messages | `useMobileNodeFile` | Extract to `nodeFileContent.ts`, reuse on both clients |
| Credential | `authorizedFetch`, Electron attacher | Reuse |
| Viewer | `FileViewer` (desktop and phone) | Reuse |
| Remote run lookup | `useRemoteRunsStore().runOfAgentRun` | Reuse |

## Final File Responsibility Mapping

| File | Concern |
| --- | --- |
| `autobyteus-web/utils/fileExplorer/nodeFileContent.ts` (new) | Shared node-file loader and refusal keys |
| `autobyteus-web/composables/mobile/useMobileNodeFile.ts` | Uses the loader |
| `autobyteus-web/stores/fileExplorerContentActions.ts` | Node file loading and routing; object URL revoke |
| `autobyteus-web/composables/useEventMonitorFilePreview.ts` | Node file fallback; remote-run message |
| `autobyteus-web/composables/mobile/mobileFileOpening.ts`, `useMobileAttachmentOpening.ts` | `nodeName` in `unavailable`; message |
| `autobyteus-web/components/mobile/views/MobileFileViewer.vue` | No limit |
| `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts` | Remove `file_available_on_host`; add `file_on_other_node` ("This file is on {{node}}, where this run runs."); reuse the 436 node-file messages for the desktop |
| Tests: the specs of the files above; `tests/e2e/mobile-shell-probe.mjs` (AC-004, AC-003); an Electron + Docker probe case (AC-001, AC-002) | Verification |
| `autobyteus-web/docs/remote_access.md`, `autobyteus-web/docs/` file-explorer doc if it names the host-workspace notice | Docs |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| Load routing | `isAbsoluteLocalPath(path) ? (embedded && capable ? local : nodeFile) : (http ? external : workspace)` in one place | A second "is node file" decision in the link handler and the store |
| Shared loader | phone and desktop call `loadNodeFile` | Two fetch-and-map copies |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep the host-workspace notice for some case | Rejected: replaced by true messages |

## Change / Refactor Sequence

1. Extract `nodeFileContent.ts` from `useMobileNodeFile.ts` (phone tests stay green).
2. Store: node-file routing, `_loadNodeFile`, revoke on close/reload; specs.
3. Link handler: node-file fallback, remote-run message, remove host-workspace text; phone outcome `nodeName`; locales; specs.
4. Phone viewer: remove the limit; specs.
5. Probes: Electron + test-owned Docker node (AC-001, AC-002), phone shell (AC-003, AC-004); docs.

## Key Tradeoffs

- No phone size limit (user decision): a very large text file may be slow on the phone.
- Non-text node files are fetched once into an object URL (same as the phone), so every refusal shows a plain reason.

## Risks

- RSK-001: very large files on the phone (accepted).
- RSK-002: object URLs must be revoked on close and reload, or memory grows while many node files are opened.

## Guidance For Implementation

- Reproduction to start from: the user's case: an isolated desktop instance with a test-owned Docker node, a run whose folder does not contain the file, and a conversation naming a path outside it (today: the host-workspace notice).
- Isolated instances and test-owned containers only (TESTING.md); no file contents or credentials in logs.
