# Investigation Notes

## Investigation Meta

- Package identifier: `phone-registered-folders-436`
- Request / ticket: Project Task `autobyteus-436` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), "Phone: open a file an agent names outside the run's folder … (investigate first)", with the user's two comments of 2026-11-09
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-registered-folders-436`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-registered-folders-436`, `codex/phone-registered-folders-436`
- Resolved base remote / branch / revision: `origin/personal` @ `b690a5dfdb` (fetched 2026-11-08)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created; `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild` exit 0
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; 2026-11-08): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`; `TESTING.md` (Environments, credentials and data); `references/handoff.md`
- Investigation status: Requirements-phase investigation complete. Architecture investigation not started (waits for the user's decision DEC-001).

## Initial Request And Clarifications

- Original request: on the phone, a click on the path of `data-contract.md` (in the `package-personal-settings` worktree, `/Users/normy/autobyteus_org/autobyteus-worktrees/package-personal-settings/tickets/in-progress/package-personal-settings/data-contract.md`, verified to exist) shows "This file is available only on the host workspace." The user wants the phone to open such files without changing how teams create worktrees.
- Clarifications received (Task comments, 2026-11-09): the user prefers design A, a Settings entry where he adds, by hand on the desktop, the folders the phone may open (for example a Project's worktrees folder); anything under a listed folder opens, worktrees created later included; nothing registered per worktree; "on the phone only the folders I add are allowed".
- User-supplied facts and constraints: do not widen what a phone can read without his explicit decision (autobyteus-403, 416); no change to how teams create worktrees; no change to stored data; release only on his word.
- Initial ambiguity: the Task assumes that the node already limits the phone to the run's workspace ("a safety rule: a phone credential must not be a window into the whole computer"). The investigation shows that this premise does not hold on the node (BEH-002, PROBE-01).

## Product And Domain Understanding

- Product area: Phone Access (paired phone shell at `/mobile`), file links in conversations (Event Monitor absolute paths), workspaces, Settings.
- Affected actors or systems: the node owner on the desktop; the paired phone; every node kind (embedded, Docker, remote).
- Relevant terminology: *workspace* = a folder registered on the node (`createWorkspace`); *run's workspace* = the folder a run works in; *worktrees parent* = `/Users/normy/autobyteus_org/autobyteus-worktrees` (69 git worktrees today, `git worktree list | grep -c autobyteus-worktrees` → 69).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-08 | Code | `autobyteus-web/composables/useEventMonitorFilePreview.ts:46-63` | Who shows the host-only message on the phone | `openMobilePath` maps the absolute path to the **active run's workspace root** only (`mapAbsolutePathToWorkspaceRelative`); no match → `file_available_on_host`. The decision is made in the phone shell. | BEH-001 |
| 2026-11-08 | Code | `autobyteus-web/localization/messages/en/workspace.ts:108-109` | Current wording | "This file is available only on the host workspace." | DEC-004 |
| 2026-11-08 | Code | `autobyteus-server-ts/src/api/rest/workspaces.ts:13-58` | The file route the phone uses | `GET /rest/workspaces/:workspaceId/content?path=` serves any file inside **any active workspace**; the only check is containment in that workspace's root (`resolveWorkspaceRelativePath`). No check of the caller or of the run. | BEH-002 |
| 2026-11-08 | Code | `autobyteus-server-ts/src/api/graphql/types/workspace.ts:113-130`, `src/workspaces/workspace-manager.ts:55-96`, `workspace-folder-check.ts` | Can a caller register a folder | `createWorkspace(rootPath)` registers any existing absolute folder; the only checks are absolute/exists/is a folder. | BEH-002 |
| 2026-11-08 | Code | `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts:37-123,159-205` | What a phone credential may call | `POST /graphql` and `/rest/workspaces/*` are `TRUSTED_NETWORK_PROTECTED`; a valid `mra_` credential passes; a request **without** a credential also passes (`trustedNetworkContext`, `isAuthenticated` false but `ok: true`). Only owner-management routes (`/rest/remote-access/settings`, devices, pairing sessions, node-update) refuse phone credentials. | BEH-002, DEC-002 |
| 2026-11-08 | Code | `grep -rn isAuthenticated autobyteus-server-ts/src` | Does any route require authentication | No route reads `isAuthenticated`; `upload-file.ts:129` only passes the context on. | BEH-002 |
| 2026-11-08 | Doc | `autobyteus-server-ts/docs/features/remote_access.md:3,98,231` | Documented product model | "Trusted-network owner/protected/WebSocket routes are reachable without an additional credential under the product model"; Phase One "does not complete least-privilege mobile backend authorization … or backend hard denial of every high-risk mobile operation". | BEH-002 |
| 2026-11-08 | Doc | `docs/future-tickets/mobile-backend-authorization-hardening.md` | Planned hardening | Phase Two lists R-P2-AUTH-009 "Mobile file viewing must be read-only and limited to allowed run artifacts or allowed workspace files" and R-P2-AUTH-010 "Arbitrary `createWorkspace(rootPath)` must be denied for standard mobile auth contexts". Not built. | FU-001, DEC-001 |
| 2026-11-08 | Code | `autobyteus-web/composables/mobile/useMobileLaunchWorkspaces.ts:59-80`, `useMobileRunSetupController.ts:98` | Supported phone feature | The phone's new-run setup lets the user type any server-side path and registers it (`createWorkspace`): registering an arbitrary folder from the phone is a supported phone feature today. | BEH-003 |
| 2026-11-08 | Doc | `tickets/done/websocket-origin-and-phone-route-guard/handoff-summary.md` (autobyteus-403) | Prior phone limits | 403 limited a phone credential to the phone WebSocket routes, including `/ws/file-explorer/:workspaceId` (any workspace) and `/ws/node-desktop` (view and **control** of the computer's desktop, API-09). | BEH-003 |
| 2026-11-08 | Doc | `tickets/done/node-web-page-and-file-security/handoff-summary.md`, `requirements-doc.md` (autobyteus-416) | Prior file rules | 416 added the Host rule, localhost-origin rule and safe file-answer headers (`sendUserFile`). It did not limit which files a phone may read. | — |
| 2026-11-08 | Code | `autobyteus-server-ts/src/remote-access/stores/remote-access-settings-store.ts`; `autobyteus-web/components/settings/phone/` | Where a phone-related owner setting lives | Phone Access settings are an owner route (phones refused); the desktop has a phone settings area (`PhonesPanel.vue`, `ConnectedPhones.vue`). | DEC-002 |
| 2026-11-08 | Code | `autobyteus-server-ts/src/projects/domain/models.ts:5-9,72` | Design B basis | A Project has `workspaces: ProjectWorkspaceLink[]` (`workspaceRootPath`, `description`); registration not required. | DEC-005 |
| 2026-11-08 | Doc | `autobyteus-server-ts/docker/README.md:73-91` | Docker nodes | A Docker node's server sees container paths: `/home/autobyteus/workspace` (host-backed node workspace), `/home/autobyteus/shared`, private volumes. Host paths such as `/Users/...` do not exist in the container. | BEH-004 |
| 2026-11-08 | Command | `git worktree list \| grep -c autobyteus-worktrees` | Size of the worktree parent | 69 worktrees | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Phone owner taps an absolute file path in a conversation | Phone shell maps the path against the active run's workspace root; inside → opens on the Files screen via the workspace content route; outside → status line | Only files inside the run's own folder open from a link; others show "This file is available only on the host workspace." | `useEventMonitorFilePreview.ts:46-63`; `mobile-shell-probe.mjs:1327` (MSP case) | Read; the user observed it |
| BEH-002 | Contract | Node file and workspace routes | `createWorkspace(rootPath)` registers any existing folder; `GET /rest/workspaces/:id/content` returns any file inside any registered workspace; both accept a phone credential and also a trusted-network request with no credential | The node does **not** limit a phone to the run's folder; it limits a read only to "inside some registered workspace", and anyone who can call it can register any folder. Path traversal out of a workspace is refused (400). | PROBE-01 P1–P5; route policy; `remote_access.md:98,231` | Reproduced |
| BEH-003 | User | Phone owner starts a run, browses files, uses the node desktop | The phone can type any server path for a new run (registers it), browse that workspace's files, and view/control the computer's desktop | A paired phone already has reach to the whole computer by design (Phase One) | `useMobileLaunchWorkspaces.ts:59-80`; 403 API-09 | Read (+403's evidence) |
| BEH-004 | Operational | Phone paired with a Docker node | Same rules as BEH-001/002 on the container's paths | A Docker node can only serve paths inside its container (its volumes and host-backed `/home/autobyteus/workspace`, `/home/autobyteus/shared`) | `docker/README.md:73-91` | Read |
| BEH-005 | User | Desktop app (Electron, same computer) | The embedded window with trusted local-file capability opens any local absolute path | Unaffected by phone rules | `useEventMonitorFilePreview.ts:102-104` | Read |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `autobyteus-web/composables/useEventMonitorFilePreview.ts` | Phone link → run-workspace mapping | The new rule (run folder + listed folders) is applied here | How the phone learns the listed folders (read-only query a phone may call) |
| `autobyteus-server-ts/src/api/rest/workspaces.ts` | Serves files inside a workspace | A listed folder needs a read path; registering it as a workspace would make it show in the folder chooser and Workspaces list | Separate read route for listed folders vs. reuse workspace machinery (DEC-003) |
| `src/api/security/remote-access-route-policy.ts` | Route classes; owner routes refuse phones | The list must be edited only from the desktop (REQ-002) | Put list edits on an owner route (`TRUSTED_NETWORK_OWNER`) |
| `src/remote-access/stores/remote-access-settings-store.ts` | Phone Access settings file `remote-access/settings.json` | A natural home for the list | Adding a field to an existing settings file: new optional field, absent = empty (the Task says "no change to stored data": a new optional setting is new data, not a change to existing data; to confirm in design) |
| `autobyteus-web/components/settings/phone/*` | Desktop phone settings | Natural place for the page | Product layout detail (DEC-002) |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: user files under listed folders (read-only, through `sendUserFile`).
- Existing readers, writers: phone shell file viewer; `sendUserFile`.

### Structural Surfaces

- Routes: workspace content route, GraphQL, owner REST family `/rest/remote-access/*`.
- Settings: `remote-access/settings.json`.

### Potential Structural Impacts To Investigate

- API or external-contract change: yes (a list read for the phone, a list edit for the owner, a file read for listed folders).
- Persistence schema or invariant change: one new optional setting (absent = empty list).
- Security or privacy boundary change: under DEC-001 option 1, none on the node (BEH-002 already allows more); under option 2, a new node-enforced boundary for phone credentials.
- Concurrency or lifecycle change: a listed folder can disappear and reappear (REQ-006).
- Confirmed absent: no existing "extra folders" setting.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| PROBE-01: copy `probes/abx436-phone-file-reach.probe.e2e.test.ts` to `autobyteus-server-ts/tests/e2e/remote-access/`, then `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-access/abx436-phone-file-reach.probe.e2e.test.ts --no-watch` | Real studio server on loopback, isolated app-data folder, phone paired through the real pairing routes, requests from trusted-network address `100.64.1.2` | P1: phone credential `createWorkspace(<temp folder outside any run>)` → 200. P2: phone reads `secret.txt` and `worktree-a/data-contract.md` → 200 with contents. P3: no credential at all → register + read 200. P4: `../secret.txt` → 400 "Access denied: Path resolves outside the workspace boundary." P5: phone lists every registered workspace root. 4/4 passed. | Reproduced | The "only the run's folder" limit exists only in the phone shell (BEH-001); the node lets a phone (and any trusted-network client) read any folder | `evidence/PROBE-01-phone-file-reach.log` (credentials redacted; none present) |

- Temporary diagnostics: the probe file was placed under `autobyteus-server-ts/tests/e2e/remote-access/` to run, then moved into this ticket's `probes/` folder (not part of the test suite). No source change.
- Reproduction for implementation to start from: `probes/abx436-phone-file-reach.probe.e2e.test.ts` (P1–P5 describe today's node reach; under DEC-001 option 2 they become the failing cases).

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (Task, 2026-11-09) | Open files in team worktrees from the phone; keep worktrees where they are | Direct | UC-001 | — |
| User (comment 2) | A Settings entry; he adds the parent folder by hand on the desktop, once; "on the phone only the folders I add are allowed" | Direct | REQ-001…REQ-004 | Whether "allowed" means the link rule (option 1) or a node-enforced boundary (option 2): DEC-001 |
| PM (Task) | Premise "a phone credential must not be a window into the whole computer" | Contradicted by PROBE-01 and BEH-003 | Must be brought to the user (requirements-engineering: challenge what the evidence contradicts) | DEC-001 |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Phone Access product model | `remote_access.md` (Phase One) | Trusted private network; no least-privilege mobile authorization yet | `remote_access.md:3,98,231` | Phase Two not scheduled |

## Persisted Data And State Facts

- Affected stored subject: none existing. A new optional list would be added (absent = empty).
- Existing data changed: No.

## Design B (Project linked folders) — facts

- A Project stores linked folders (`workspaces: ProjectWorkspaceLink[]`); they appear in the Projects view and `list_projects`; delegated copies run in the Task's first linked folder (Task comment; not re-verified here).
- To serve "folders linked to the run's Project", the phone would have to know which Project a run belongs to; standalone runs and runs outside Projects would get nothing. Not verified whether every run carries its Project; not needed for the comparison.

## Supplement Inventory

| Path | Purpose | Owner | Scope | Related IDs | Status | Approval applicability |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/abx436-phone-file-reach.probe.e2e.test.ts` | Reproduction of BEH-002 | Solution Designer | Evidence | BEH-002, DEC-001, FU-001 | Current | Evidence only |
| `evidence/PROBE-01-phone-file-reach.log` | Probe output | Solution Designer | Evidence | BEH-002 | Current | Evidence only |
| `follow-ups.md` | Follow-ups | Solution Designer | FU-001 | — | Current | N/A |

## Unknowns

- UNK-001: whether every run's workspace is known to the phone for runs started on another node (remote runs); the current rule already depends on it; unchanged.
- UNK-002 (design): reuse the workspace machinery for listed folders, or a separate read route.

## Resumed 2026-11-09 on top of autobyteus-437 slice 1

- Base moved: branch `codex/phone-registered-folders-436` fast-forwarded to `origin/personal` @ `34ea6e36bb` (437 slice 1 merged as `ec2380485c`, beta v1.5.12-beta.9). Authorities re-read: Task autobyteus-436 (with the 2026-11-09 comments), this folder's documents.
- What slice 1 changed for this ticket (Read): every request needs a credential and passes network admission (`autobyteus-server-ts/docs/design/node_access_model.md` NA-1, NA-3); PROBE-01 P3 (no credential) is now refused (437 AC-001). The gate sets a `ClientIdentity` (`owner` / `phone` / `peer` / `memory_sync_source`) on every request (`src/api/security/node-access-gate.ts:85-90`), so a route can tell the phone from the desktop.
- What slice 1 did not change (Read): a phone credential may still use `POST /graphql` and `/rest/workspaces/*` (`src/api/security/node-route-permissions.ts`, `routeAccessFor` → `OWNER_AND_PHONE`), so it can still `createWorkspace` any folder and read it (PROBE-01 P1/P2 path). Phone credential limits are slice 2 (autobyteus-441).
- Unchanged since the investigation (`git diff --stat b690a5dfdb..HEAD`): `api/rest/workspaces.ts`, `api/graphql/types/workspace.ts`, `src/workspaces/`, `useEventMonitorFilePreview.ts`, `useMobileLaunchWorkspaces.ts`; `components/settings/phone/` only a test.

## Design Evidence (2026-11-09)

| Source | Finding | Design use |
| --- | --- | --- |
| `autobyteus-web/composables/mobile/useMobileNavigation.ts:70-71,85` | Phone file route is `screen=files&workspace=&file=`; `MobileFileNavigation` exposes `openFile` | New `nodeFile` query and `openNodeFile` |
| `autobyteus-web/components/mobile/views/MobileFiles.vue:69-75,117-124` | Viewer reads the workspace explorer's open-file state | Node file state from `useMobileNodeFile` |
| `autobyteus-web/stores/fileExplorerContentActions.ts:128-150,242-268` | Text via GraphQL `fileContent`, other types via the workspace content URL | Node files: one REST fetch for all types |
| `autobyteus-web/utils/remoteAccess/authorizedResourceUrl.ts:6-18` | Protected prefixes get the phone credential on blob loads | Add `/rest/node-files/` |
| `autobyteus-server-ts/src/api/rest/user-file-reply.ts` | `sendUserFile` sets sandbox CSP and `nosniff` | Reused |
| `autobyteus-server-ts/src/compositions/build-studio-server.ts` (509 lines) | Over the size limit already | Nothing added there; route registered in `api/rest/index.ts` |
