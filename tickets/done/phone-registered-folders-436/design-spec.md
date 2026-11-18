# Design Spec — phone-registered-folders-436 (autobyteus-436): the phone opens any file a conversation names, read-only

## Solution And Approval Basis

- Current solution revision ID: `SR-005`
- Approved requirements: `requirements-doc.md` SR-004, approved by the user on 2026-11-09 (reference in the requirements doc).
- Behavior-defining supplements: `autobyteus-server-ts/docs/design/node_access_model.md`; this design adds NAS-39 and NAS-40 (consistent with NA-7, which already lets phones use every endpoint except owner actions).
- User approval of the design: `Not required`. The Task says "building follows on his word"; the user gave it ("let's drop this limitation now … open any files … read only") on the approved behavior, and this design adds no visible behavior beyond it.
- Design status: `Ready`
- Investigation notes: `investigation-notes.md` (including "Resumed 2026-11-09").
- Authorities read (2026-11-08/09, this conversation): `references/architecture-design.md`, `references/design-principles.md`, `/DESIGN.md` (rules 1, 4, 5, 9, 11; "Node access and security" contract entry), `node_access_model.md`, `GLOSSARY.md` (Nodes).
- Conflicts or discrepancies: none.

## Current-State Read

- The phone decides whether a file link opens: `openMobilePath` maps the absolute path into the active run's workspace and otherwise shows `file_available_on_host` (`autobyteus-web/composables/useEventMonitorFilePreview.ts:46-63`). Inside the workspace, the phone opens `screen=files&workspace=&file=` (`composables/mobile/useMobileNavigation.ts:70-71`), and `MobileFiles.vue` shows `MobileFileViewer` with the workspace explorer's open-file state (`components/mobile/views/MobileFiles.vue:69-75,117-124`).
- Workspace text files load through GraphQL `fileContent`; other types through `/rest/workspaces/:id/content` (`stores/fileExplorerContentActions.ts:128-150,242-268`). On the phone, protected `/rest/` URLs are fetched as blobs with the phone credential (`utils/remoteAccess/authorizedResourceUrl.ts:6-18,52-79`).
- The node has no route that reads a file by absolute path; files are read inside registered workspaces (`autobyteus-server-ts/src/api/rest/workspaces.ts:13-58`). User files answer through `sendUserFile` (`api/rest/user-file-reply.ts`). The gate (437) sets a `ClientIdentity`; an unlisted route is open to owner and phone credentials only (`api/security/node-route-permissions.ts`, `routeAccessFor`).
- `compositions/build-studio-server.ts` is 509 lines; routes are registered in `api/rest/index.ts` (68 lines), so nothing is added to the composition.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: server: one reader and one route (+ e2e); web: one composable, navigation and Files screen changes, the link handler, the protected prefix list, two messages (+ tests and a phone probe case); contract and glossary rows. About 12–15 files in existing owners.
- Architectural risk: `High`
- Risk rationale: a new route that returns any file on the node's computer to a phone credential is a security-contract change (user-approved); path resolution must hold (absolute only, real path, regular file, read-only).
- Escalation trigger: a file type the phone viewer cannot show from a blob URL; any need to write or list.

## Intended Change

A read-only node route returns one file by absolute path to owner and phone credentials; the phone's file link opens any path through it when the path is outside the run's folder.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002. Server: `src/node-files/` (new), `src/api/rest/node-files.ts` (new), `api/rest/index.ts`, `api/security/node-route-permissions.ts` (explicit row). Web: `composables/useEventMonitorFilePreview.ts`, `composables/mobile/useMobileNavigation.ts`, `composables/mobile/useMobileNodeFile.ts` (new), `components/mobile/views/MobileFiles.vue`, `utils/remoteAccess/authorizedResourceUrl.ts`, localization (en, zh-CN). Docs: `node_access_model.md` (NAS-39, NAS-40; §5), `GLOSSARY.md` ("Node file"), `autobyteus-web/docs/remote_access.md` (phone file links).
- Derived consumers: `MobileFileNavigation` type (`useMobileNavigation.ts:85`) gains `openNodeFile`; its users (`useEventMonitorFilePreview`, phone tests) updated. `PROTECTED_REST_PREFIXES` gains `/rest/node-files/`.
- Deliberately left alone: the desktop app's file opening (`useEventMonitorFilePreview` non-phone branch), the Files tab and workspaces, the `file_available_on_host` message (still used by the desktop branch, lines 98 and 118), phone credential limits (441), relative Markdown images for node files.
- Follow-ups: none found.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind | Requirement / AC | Trigger | Existing evidence | Change | Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, 004, 005; AC-001, 004 | Tap a path on the phone | `useEventMonitorFilePreview.ts:46-63` | Outside the run's folder: open by absolute path | DS-001 |
| BEH-002 | Contract | REQ-002, 003, 006; AC-002, 003, 005 | GET node-file route | — (new) | Read-only, one file | DS-002 |
| BEH-003/004 | User | AC-006 | — | — | Preserved | — |

## Relevant Supplemental Task Artifacts

| Artifact | Relationship |
| --- | --- |
| `probes/abx436-phone-file-reach.probe.e2e.test.ts`, `evidence/PROBE-01-phone-file-reach.log` | Historical evidence (pre-437); not a reproduction to turn green |
| `node_access_model.md` | Contract updated with NAS-39, NAS-40 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`.
- Current design issue found: `No`.
- Structural triggers: *Several kinds or forms*: the route serves owner and phone kinds, refused for peer and memory sync source (permission row, AC-002); two paths open phone files (workspace and node file): both read-only, each with its own owner (workspace explorer, `useMobileNodeFile`). *Capability-area reuse*: `sendUserFile`, the gate, `authorizedFetch`, `determineFileType`, `MobileFileViewer` reused. *Vocabulary*: "node file" added to the glossary. Others (shared folder, empty indirection, legacy) checked: none.
- Root cause classification: `No Design Issue Found`: existing owners absorb the feature.
- Refactor needed now: `No`.

## Terminology

- **Node file:** a file on the node's computer (a Docker node: inside its container) addressed by its absolute path, not through a workspace. Added to `GLOSSARY.md`.

## Legacy Removal Policy (Mandatory)

- Obsolete: the phone branch's two `file_available_on_host` returns (`useEventMonitorFilePreview.ts:50,58`) become node-file opens; the key stays for the desktop branch.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- `Not Affected`: nothing stored.

## Data-Flow Spine Inventory

| Spine | Scope | Behaviors | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001 | Phone taps a path | File shown read-only | `useEventMonitorFilePreview` → `useMobileNodeFile` | The user journey |
| DS-002 | Primary | BEH-002 | GET `/rest/node-files/content?path=` | Content or refusal | `NodeFileReader` behind the route | The read-only door |

## Primary Execution Spine(s)

- DS-001: `Tap (Event Monitor link) → useEventMonitorFilePreview.openMobilePath → inside the run's folder? openFile (as today) : MobileNavigation.openNodeFile(absolutePath) → route screen=files&nodeFile=<path> → MobileFiles shows MobileFileViewer → useMobileNodeFile(path) → authorizedFetch(<rest>/node-files/content?path=) → state { type, content | object URL, error }`
- DS-002: `GET /rest/node-files/content?path= → 437 gate (admission, credential, permission: owner|phone) → node-files route → NodeFileReader.open(path) → sendUserFile(stream) | refusal { code, message }`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner | Off-spine |
| --- | --- | --- | --- |
| DS-001 | When the tapped path is inside the run's folder, nothing changes. Otherwise the phone pushes a Files history entry for the node file; `useMobileNodeFile` fetches it once with the phone credential, takes the type from the path (`determineFileType`), keeps text as content and anything else as an object URL (revoked when the viewer closes), and maps the refusal code to a message. | `useMobileNodeFile` | message mapping |
| DS-002 | The gate has already admitted the client and checked it is an owner or a phone. The reader accepts only an absolute path without `..` segments, resolves its real path (symbolic links followed), and requires a regular file; the route streams it through `sendUserFile` with its MIME type. Every refusal is `{ code, message }`. | `NodeFileReader` | MIME lookup |

## Spine Actors / Main-Line Nodes

`useEventMonitorFilePreview`, `useMobileNavigation`, `MobileFiles`, `useMobileNodeFile`, the node-files route, `NodeFileReader`.

## Ownership Map

- `NodeFileReader` (`autobyteus-server-ts/src/node-files/node-file-reader.ts`): path validation, real-path resolution, regular-file check, stream and MIME type, refusal codes. No HTTP.
- Node-files route (`src/api/rest/node-files.ts`): GET only; query parsing; maps reader results to `sendUserFile` or `{ code, message }` with 400/404.
- `useMobileNodeFile` (`autobyteus-web/composables/mobile/useMobileNodeFile.ts`): the phone's open-file state for one node file (fetch, type, object URL lifetime, message).
- `useMobileNavigation`: the `nodeFile` route query and `openNodeFile`.
- `useEventMonitorFilePreview`: decides workspace file vs node file on the phone.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced by | Notes |
| --- | --- | --- | --- |
| Phone branch `file_available_on_host` returns (`useEventMonitorFilePreview.ts:50,58`) | Every path now opens | `openNodeFile` | Desktop branch keeps the key |

## Off-Spine Concerns Around The Spine

| Concern | Serves | Responsibility |
| --- | --- | --- |
| Message mapping | `useMobileNodeFile` | `NODE_FILE_NOT_FOUND` / `NODE_FILE_IS_FOLDER` / other → REQ-004 messages |
| MIME lookup | `NodeFileReader` | `mime-types` on the real path, as the workspace route does |

## Ownership Boundaries

- The gate alone decides who may call the route (no credential or kind check in the route). The reader alone decides which path is servable.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden bypass |
| --- | --- | --- | --- |
| `NodeFileReader` | `fs.realpath`, `fs.stat`, stream | node-files route | Route touching `fs` directly |
| `useMobileNodeFile` | fetch, object URL, messages | `MobileFiles.vue` | Component fetching itself |

## Dependency Rules

- `api/rest/node-files.ts` → `node-files/node-file-reader.ts` → Node `fs`, `mime-types`. `node-files` imports nothing from workspaces or the gate.
- Web: `MobileFiles.vue` → `useMobileNodeFile` → `authorizedTransport`, `fileUtils.determineFileType`.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity shape | Notes |
| --- | --- | --- | --- | --- |
| `GET /rest/node-files/content?path=<absolute>` | Node file | Return one file read-only | Absolute path (URL-encoded) | 400 `NODE_FILE_PATH_INVALID` / `NODE_FILE_IS_FOLDER`, 404 `NODE_FILE_NOT_FOUND`; owner and phone only (permission row) |
| `NodeFileReader.open(path)` | Node file | Validate and open | Absolute path | Returns `{ realPath, mimeType, stream }` or a refusal |
| `MobileNavigation.openNodeFile({ path })` | Phone route | History entry `screen=files&nodeFile=` | Absolute path | Back closes it |
| `useMobileNodeFile(path)` | Phone open-file state | Load and present | Absolute path | Shaped like the viewer's open-file state |

## Interface Boundary Check

All singular; identity explicit (an absolute path, never a workspace-relative one); ambiguity low: `nodeFile` and `workspace`+`file` are separate route queries.

## Main Domain Subject Naming Check

| Subject | Name | Same everywhere | Action |
| --- | --- | --- | --- |
| File by absolute path | node file (`node-files`, `nodeFile`, `NodeFileReader`) | New; distinct from `/rest/files/` (media files) | Glossary entry |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Who may call | 437 gate, route permissions | Reuse (+ explicit row) |
| Safe file answer | `sendUserFile` | Reuse |
| Phone credential on fetch and blob | `authorizedFetch`, `PROTECTED_REST_PREFIXES` | Reuse / extend |
| File type | `determineFileType` | Reuse |
| Viewer | `MobileFileViewer` | Reuse |

## Final File Responsibility Mapping

| File | Concern |
| --- | --- |
| `autobyteus-server-ts/src/node-files/node-file-reader.ts` (new) | Validate, resolve, open one file |
| `autobyteus-server-ts/src/api/rest/node-files.ts` (new) | GET route |
| `autobyteus-server-ts/src/api/rest/index.ts` | Register it |
| `autobyteus-server-ts/src/api/security/node-route-permissions.ts` | Explicit `/rest/node-files` → owner and phone |
| `autobyteus-server-ts/tests/e2e/node-access/…` or a new `tests/e2e/node-files/node-files.e2e.test.ts` | AC-002, AC-003, NAS-39, NAS-40 |
| `autobyteus-web/composables/mobile/useMobileNodeFile.ts` (new) | Phone open-file state |
| `autobyteus-web/composables/mobile/useMobileNavigation.ts` | `nodeFile` query, `openNodeFile` |
| `autobyteus-web/components/mobile/views/MobileFiles.vue` | Show the node file viewer |
| `autobyteus-web/composables/useEventMonitorFilePreview.ts` | Phone branch: node file outside the run's folder |
| `autobyteus-web/utils/remoteAccess/authorizedResourceUrl.ts` | `/rest/node-files/` prefix |
| `autobyteus-web/localization/messages/{en,zh-CN}/…` | REQ-004 messages |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | AC-001, AC-004 case (the existing "outside the workspace" case changes from the status line to opening the file) |
| `node_access_model.md`, `GLOSSARY.md`, `autobyteus-web/docs/remote_access.md` | Docs |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| Request | `GET /rest/node-files/content?path=%2FUsers%2Fnormy%2Fautobyteus_org%2Fautobyteus-worktrees%2Fpackage-personal-settings%2Ftickets%2Fin-progress%2Fpackage-personal-settings%2Fdata-contract.md` | Registering the worktree as a workspace to read it |
| Refusal | 404 `{ "code": "NODE_FILE_NOT_FOUND", "message": "No file exists at this path." }` | A 500 with a stack trace |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep the "available only on the host workspace" status on the phone | Rejected: replaced (user decision) |

## Change / Refactor Sequence

1. Server reader and route, permission row, e2e (AC-002, AC-003, NAS-39, NAS-40).
2. Phone: navigation query, `useMobileNodeFile`, `MobileFiles`, link handler, prefix, messages, unit/component tests.
3. Phone shell probe: change the outside-the-workspace case to opening the file (AC-001, AC-004); Docker case (AC-005).
4. Docs and glossary; contract §5.

## Key Tradeoffs

- No folder limit (user decision); a paired phone reads any file until revoked (already true through workspaces).
- One fetch for all types on the phone, so every refusal shows the same messages (vs. letting the viewer fetch media itself).

## Risks

- RSK-001: very large binary files are fetched whole into a blob on the phone (same as workspace media today).
- RSK-002: a path the operating system denies to the node's user (permissions) answers 404/500; mapped to "could not be opened".

## Guidance For Implementation

- Reproduction to start from: `None` (new behavior); start from the e2e cases AC-002/AC-003.
- Use the gate's identity only through the permission row; the route does not read credentials.
- Tests on isolated nodes and test-owned containers; no file contents or credentials in logs.
