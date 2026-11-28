# Design Spec

## Basis

- SR-001. Requirements approved by the Solution Designer within the direction (requirements-doc.md, DEC-001…007).
- Authorities read: architecture-design, design-principles (7, 11, 13, 16, 17), `DESIGN.md` (rules 9, 11, 12), the node access model (route table), design cases 21 and 31.

## Data Contract (Principle 17)

| Surface | Change | Validation |
| --- | --- | --- |
| Package folder (new convention) | `avatar.png`, `avatar.jpg`, `avatar.jpeg` or `avatar.webp` in an agent's, team's or org's definition folder. At most 1 MiB; the bytes' signature must match the extension (PNG `89 50 4E 47`, JPEG `FF D8 FF`, WebP `RIFF….WEBP`). More than one candidate is invalid | Read by the node per folder; nothing is stored |
| Definition domain (agent, team, org; derived, never persisted) | `packageAvatar: { fileName; mimeType; version } \| null`. `version` is the first 12 hex digits of the picture's SHA-256 | Derived at each read |
| GraphQL `avatarUrl` on agent, team and org definitions | Type unchanged (`String`, nullable). Value: the personal setting if set, else the config's `avatarUrl`, else `/rest/definition-avatars/<kind>/<encodeURIComponent(definitionId)>?v=<version>` when `packageAvatar` exists, else null | An address the node serves (below) |
| REST `GET /rest/definition-avatars/:kind/:definitionId` (new) | `kind` is `agent`, `agent_team` or `agent_org`. 200: the package picture's bytes, `Content-Type` from `packageAvatar`, ETag and `Cache-Control: no-cache` (`sendUserFile`). 404: no such definition or no package picture. The file path comes only from the definition's own folder and the fixed name, never from the request. Access: the default rule, owner and phone; a peer gets 403 | Route spec, with a peer credential |
| `RunTreeRowDto` (`autobyteus-collaboration-stream-contracts`, tracked `dist`) | Adds `definitionId: string` (optional): the definition of the row's agent run (`agent`, `team_member`, `org_agent`) or team run (`team`, `org_team`). Absent for peer rows and when the run's record names none | Schema spec; `check:contract-dist` |
| Stored data | **None.** Personal settings, configs and run files are unchanged, so no migration | — |

- Rule 9 (no compatibility between versions): web and node ship together. The optional field is the contract as built, not a compatibility shim.

## Task Size And Architectural Risk

- Size: `Large`.
  - Server: three definition readers, the effective address, a new file route, the run tree's records and rows, a contract package.
  - Web: one avatar component and cache replacing about 15 renderers, a definition-avatar source, the phone rows.
- Risk: `High`. A new route reads files on the node's disk for phones (security), a shared contract changes, and a cross-cutting replacement of every avatar renderer.
- Escalation triggers:
  - a run's record has no definition ID available without reading more than its own file;
  - the light definitions query is not available to the phone.

## Design

### Server

| D | Owner | Change |
| --- | --- | --- |
| S-1 | New `agent-package-definitions/domain/definition-avatar-file.ts` (one rule, three kinds) | `readDefinitionAvatar(folder)`: lists the folder's `avatar.*` files of the four names. None: null. One valid: `{ fileName, mimeType, version, hash }`. Otherwise `invalid` with a reason. The agent, team and org node readers call it; a valid picture's hash joins the definition's `fingerprintOf` parts, so a changed or added picture reloads the definition like a changed `agent.md`. An invalid picture: `packageAvatar = null` and one `console.warn` with the folder and reason per read (REQ-002) |
| S-2 | The definition services or converters (one function per kind, or one shared `effectiveBaseAvatarUrl(config, packageAvatar, kind, id)`) | The base `avatarUrl` = config's `avatarUrl` ?? the package-picture address. The personal-settings overlay is unchanged. **An edit whose `avatarUrl` equals the definition's package-picture address means "no user picture":** for a package definition no personal setting is written (already so, since it equals the base); for an own definition the config's `avatarUrl` is written null, never the route address. A form that saves other fields therefore never pins the package picture |
| S-3 | New `api/rest/definition-avatars.ts` | The route of the contract. It finds the definition through its kind's service, takes `packageAvatar` and the definition's folder (`sourceInfo`), and sends `path.join(folder, packageAvatar.fileName)` with `sendUserFile` (`kind: 'file'`; Range and 304 come with it). Registered under the same access gate as `/rest/files` (default owner-and-phone; no new permission entry) |
| S-4 | `agent-collaboration/delegation/run-tree-records.ts`, `run-tree-view.ts`; `autobyteus-collaboration-stream-contracts` `run-tree-dtos.ts` | The records gain the definition IDs their run files already hold: an agent run's `agentDefinitionId`, a team run's `teamDefinitionId`, each member's `agentDefinitionId`, read with the record (no extra read). The run's own parts in `ownRows` take theirs from the own tree. Rows carry `definitionId`; peer rows none. Contract `dist` rebuilt |

### Web

| D | Owner | Change |
| --- | --- | --- |
| W-1 | New `components/common/DefinitionAvatar.vue` (the one renderer) | Props: `kind` (`agent`, `team` or `org`), `name`, `avatarUrl` (nullable), size and shape from the slot. It resolves a node-relative address (`/rest/…`) against `windowNodeContextStore.getBoundEndpoints().rest` (absolute addresses as given), loads it through W-2, and shows the picture `object-cover` in the slot. With no address, a failed load or a load error, it shows the fallback: initials for an agent, the team icon, the org icon (the current marks). It replaces the `<img>` and broken-image state of every avatar renderer: `AgentCard`, `AgentDetail`, `AgentTeamCard`, `AgentTeamDetail`, `AIMessage`, `EventMonitorBrowseAssistantRow`, `AgentWorkspaceSurface`, `TeamWorkspaceSurface`, `RunListRow`, `WorkspaceDelegatedRunRow`, the Workspaces tree rows, `ChatNewSurface`, `RunTargetSwitcher`, `AgentOrgAvatar`, the forms' previews and `MobileRunRow`. `useRunHistoryAvatarState`'s broken maps go |
| W-2 | New `composables/useAvatarObjectUrl.ts` with a module-level cache (one per page) | Keyed by the absolute address. A protected address with a phone credential is read once by `fetchAuthorizedResourceBlob` into one object URL, shared by every avatar that shows it (reference-counted), and revoked a short while after its last user unmounts or when the credential changes. Otherwise the address is used directly (Electron attaches the credential). A failure is remembered per key for the session (no retry storm; a new version is a new key) |
| W-3 | New `stores/definitionAvatarStore.ts` (the rows' source) | `avatarOf(kind, definitionId)` for agents, teams and orgs. One light GraphQL read (`id` and `avatarUrl` of each definition kind) on first use, desktop and phone alike. Read again on the agent package definitions feed (`agentPackageDefinitionChangeFeed`) and after a definition's avatar is saved or reset (the forms call it). Cards, details and forms show the definition they render (the same server value) |
| W-4 | `utils/mobile/mobileRunListRows.ts`, `MobileRunRow.vue` | Each row gets `avatarUrl` from W-3: top-level rows by their item's definition ID, tree rows by `definitionId`, peer rows null. `MobileRunRow` renders `DefinitionAvatar` in its slot. No other change to the row |
| W-5 | Desktop rows (`RunListRow`, `WorkspaceDelegatedRunRow`, the tree's team member rows) | Their avatar slot renders `DefinitionAvatar` with W-3's address (tree rows by `definitionId`). No other change |

### Order of preference (REQ-003)

The server computes it once (S-2), and every client shows the `avatarUrl` it gets. The fallback is W-1's, the only one.

## Change Scope

- In scope:
  - the server files above, with their specs and the contract package;
  - the web components above, the new component, composable and store, and their specs;
  - the docs: `autobyteus-server-ts/docs/modules/agent_packages.md`, `agent_definition.md`, and the web docs on avatars;
  - a probe with synthetic pictures (no realistic person), desktop and phone.
- Left alone:
  - the flat list (648) and every row's structure;
  - upload and reset (unchanged flows);
  - personal-settings storage;
  - the official packages' content.
- Follow-ups: none yet.
- 648 collision: `MobileRunRow.vue`, `mobileRunListRows.ts`, `WorkspaceDelegatedRunRow.vue` and `RunListRow.vue` are touched here only in their avatar slot. 648 has no implementation branch, so there is no collision now; the PM is told the files.

## Removal

- The per-component `<img>` and broken-image state.
- `useRunHistoryAvatarState`'s broken maps.
- The phone row's hard-coded initials and icons. These move into W-1's fallback.

## Guidance

- Make the synthetic pictures plain coloured shapes with a letter. Never a realistic person.
- Check the installed desktop window (`file://`) as well as `nuxt dev`: the relative-address premise (investigation) is unproven, and the design must hold in both.
- AC-005: assert on the network that the phone's request carries `Authorization` and no key in the address, and that twenty rows of one definition make one request.
