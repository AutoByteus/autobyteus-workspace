# Implementation Handoff — agent-avatars-669 (autobyteus-669)

## Upstream Package

Paths are relative to the ticket folder `<worktree>/tickets/in-progress/agent-avatars-669`.

- **Requirements:** `requirements-doc.md`, approved, SR-002 (REQ-001…008, AC-001…007, DEC-001…007).
- **Investigation:** `investigation-notes.md`.
- **Design:** `design-spec.md`, SR-002 (S-1…S-4, W-1…W-6, N-1…N-6).
- **Solution history:** `solution-revision-record.md`.
- **Architecture review:** `design-review-report.md` (ARCH-REV-002, Pass) and `architecture-review-revision-record.md`.
  These two files are the reviewer's; they stay untracked here and I left them alone.
- **Where:** worktree `<worktree>`, branch `codex/agent-avatars-669`, base `origin/personal` @ `ea787a37b1`, design commit
  `7234ae4a2c`.

## Summary

**Implementation Complete, IR-001.** Ready for code review; this is not runtime acceptance or delivery.

A definition's package picture now shows on every surface, desktop and phone:
- the file is `avatar.{png,jpg,jpeg,webp}` beside `agent.md`, `team.md` or `org.md`;
- the order is the user's picture, then the package's, then the fallback;
- one shared avatar component draws it in every existing slot;
- the phone reads it with its credential in the `Authorization` header, once per address;
- the editors edit only the user's own picture.

Commits on `codex/agent-avatars-669`:

| Commit | What |
| --- | --- |
| `785fa286a9` | contracts: `RunTreeRowDto.definitionId` and rebuilt dist (S-4) |
| `4654dacd68` | server: S-1…S-4 |
| `30132f3351` | server: the watcher watches `avatar.*` (S-1, found while writing the docs; see Deviations) |
| `ebba269dbc` | web: W-1…W-6, the phone demo answers, spec updates |
| `5a2ff965e6` | docs (REQ-008, AC-007) |
| the next commit | the probe script, this handoff, the revision record and the evidence |

Revision: IR-001 in `implementation-revision-record.md`.

## Routing

- `task_size`: Large; `architectural_risk`: High, unchanged from the design.
- Next: `/code_reviewer`.
- No Design Impact. Neither escalation trigger fired:
  - every run record names its definition from its own file: an agent run's metadata, a team run's
    `teamDefinitionId`, and each member's `agentDefinitionId`. An Org's units come from the container file
    `containerTreeOf` already reads (N-5/N-6);
  - the light definitions query is served to the phone. P-001 reads it through the paired phone, and the phone demo
    answers it.

## What Was Built (by design item)

| D | Files | What it does |
| --- | --- | --- |
| S-1 | `agent-package-definitions/domain/definition-avatar-file.ts` (new); the agent, team and org node readers and file providers; the three domain models (`packageAvatar`); `monitor/agent-package-layout.ts` | `readDefinitionAvatar(folder)` returns none, valid or invalid. It reads the four names only and accepts one at most. It refuses a non-regular file or a symlink (`lstat`, then an `O_NOFOLLOW` read; N-1). It rejects anything over 1 MiB and checks the signature (PNG, JPEG, WebP). The hash is cached per path while size and mtime are unchanged (N-3). `readPackageAvatar` warns `DEFINITION_AVATAR_IGNORED` only when a folder's reason changes (N-2). The hash joins each definition's `fingerprintOf`. The watcher's allow-list now holds the four names |
| S-2 | `agent-package-definitions/domain/definition-avatar-address.ts` (new); `api/graphql/types/definition-avatar-fields.ts` (new); the agent, team and org converters and GraphQL types; the agent, team and org services; `personal-settings-service.ts` | One module owns the address rules: `definitionAvatarAddress`, `isDefinitionAvatarAddress` (by path, any origin or version), `userAvatarInput`, `effectiveBaseAvatarUrl` and `userAvatarUrlOf`. GraphQL `avatarUrl` is display only: the user's picture, else the config's, else the package's address. The new `userAvatarUrl` is the user's own picture. **Input:** absent keeps; `null`, `''` or a definition-picture address clears, storing nothing. It applies in agent, team and org create and update, `personalEditsOf` and `PersonalSettingsService.setEdited`. The team update keeps an absent `avatarUrl` undefined (it was defaulted to null before) |
| S-3 | `api/rest/definition-avatars.ts` (new), `api/rest/index.ts` | `GET /rest/definition-avatars/:kind/:definitionId` for `agent`, `agent_team` and `agent_org`. It takes no path from the request: it looks the definition up, re-reads its picture with `readDefinitionAvatar`, and sends it with `sendUserFile` (type, ETag, `no-cache`, `nosniff`, 304). Access is the default owner-and-phone class; a peer gets 403 and no credential 401 |
| S-4 | `run-tree-dtos.ts` (contract), `run-tree-records.ts`, `run-tree-view.ts`, `run-own-agents-reader.ts` | Every local row carries `definitionId`; peer rows have none. **Child records:** from metadata `agentDefinitionId`, `team.teamDefinitionId`, and each member's. **Own trees:** from the agent and team runs. **Org container:** a unit's `definitionId` and a team unit's members |
| W-1 | `components/common/DefinitionAvatar.vue` (new) | One avatar: `kind`, `name`, `avatarUrl`, `initials`, `iconClass`, `alt`, and a `#fallback` slot. It fills the slot the caller sizes (`class`) with `object-cover`; the fallback is initials, the team icon or the org icon. A late `<img>` error from a picture since replaced is ignored (the error carries the `src` it showed). Used by every renderer the design lists; `ChatNewSurface` is reached through `RunTargetSwitcher` |
| W-2 | `composables/useAvatarObjectUrl.ts` (new); `utils/remoteAccess/authorizedResourceUrl.ts` | `/rest/…` resolves against the bound node (also a phone's paired node). A protected address with a phone credential is read once per address and credential by `fetchAuthorizedResourceBlob`, then shared through one reference-counted object URL, revoked 60 s after the last user. A changed credential drops the old entries. A failure is remembered for the session |
| W-3 | `stores/definitionAvatarStore.ts`, `graphql/queries/definitionAvatarQueries.ts` (new); `agentPackageDefinitionChangeFeed.ts`; the three definition stores | `avatarOf(kind, id)` reads a kind on first use. The feed's `reloadIfLoaded` and the stores' own saves and resets read it again. Reads chain, so a change during a read is not lost (N-4) |
| W-4 | `utils/mobile/mobileRunListRows.ts`, `useMobileRunTree.ts`, `MobileRunRow.vue` | Rows get `avatarUrl`: top-level rows by their item's definition, tree rows by `definitionId`, peers null |
| W-5 | `RunListRow`, `RunDefinitionGroups`, `WorkspaceAgentOrgHistoryCollection`, `WorkspaceStableExecutionRow`, `WorkspaceDelegatedRunRow`, `WorkspaceTeamExecutionTree`, `runTreeDisplayRows.ts`, `runHistoryTypes.ts`; `useRunHistoryAvatarState.ts`, `workspaceHistorySectionContracts.ts`, `RunSectionPanel`, `RunListPanel` | The slots render `DefinitionAvatar` with the store's address. The tree's team members take `definitionId` from the server's tree. The broken-image maps and their bindings are removed: the bindings are only initials and names now |
| W-6 | `AgentDefinitionForm.vue`, `AgentTeamDefinitionForm.vue`, `AgentOrgExperience.vue`, `AgentOrgAvatarEditor.vue`, `AgentOrgPersonalSettings.vue`, the GraphQL documents, `generated/graphql.ts`, the store types, en and zh-CN messages | The forms fill and save only `userAvatarUrl`. With none, they preview the package's picture with the caption "From the package" (zh-CN "来自软件包") and no Remove. Remove shows only for the user's picture and saves `null`. The Org editor sends `null` for an explicit clear (it sent `''`) |
| Demo | `demo/graphql/operations.ts`, `definitions.ts` | The phone demo answers the three light queries; its definitions have no pictures |
| Docs | server `agent_packages.md` (Package Pictures), `agent_definition.md` (Avatar), `agent_package_definitions.md`, `personal_settings.md`; web `agent_management.md` (Avatars), `agent_orgs.md`, `agent_teams.md` | The convention, the checks, the route and its access, the watched files, the order, the fallback, the two fields, the input rule, the phone fetch and the editors |

## Deviations And Implementation Choices

1. **The route serves `packageAvatar.folder`, not `sourceInfo`.** S-3 said to take the definition's folder from
   `sourceInfo`. The reader records the folder it read the picture from (`PackageAvatar.folder`), and the route sends
   only `folder/fileName` after reading it again with the same rule. This is the same boundary with one source of truth.
   Team-local and org-owned agents keep their own folders without the route resolving `sourceInfo` per kind.
2. **The watcher allow-list (`30132f3351`).** S-1 says a changed picture "reloads the definition like a changed
   `agent.md`". The fingerprint gave that at any reload, but the folder watcher did not see `avatar.*`, so a picture
   replaced by hand in a watched local package waited for a manual reload. The allow-list now takes the four names from
   `DEFINITION_AVATAR_FILES`. It is shown red then green in IMP-001, and A-002 shows it live.
3. **An unsaved Remove.** After Remove and before Save, the preview shows the fallback, not the package's picture. The
   refill after the save shows the package's picture, captioned. This follows W-6 (Remove clears the user's picture; the
   package caption belongs to a definition with no user picture).
4. **`data-test` on the avatar.** A caller's `data-test` (for example `agent-avatar-preview` or `run-target-avatar`)
   replaces the component's own `data-test="definition-avatar"` on its root. `data-avatar-kind` and `data-avatar-state`
   stay, so specs and the probe select by those.
5. **AC-005 in the probe uses twenty copies of one team, not twenty runs of one agent.** The run history lists 6 runs
   per agent (`limitPerAgent`, unchanged), so an agent's runs cannot make twenty rows. Twenty delegated copies of one
   team are twenty rows of one definition: one fetch, with the header and no key in the address (P-001).

## Validation

- **IMP-001 (red on the base):**
  - web: 10 of the changed or added cases fail on the base;
  - server: 14 fail;
  - the watcher fix: 5 cases red, then green;
  - the new modules' specs fail on the base by import.
- **IMP-002 (checks):** `check:contract-dist`, the contracts suite (40/40), the server typecheck (production 0, tests at
  baseline), the server unit suite (9308 passed), the web typecheck (production 0, tests at baseline), `codegen:check`,
  both guards and the literal audit pass. The web suite has 3 failures and electron 1, none of them this ticket's; each
  cause is recorded there.
- **IMP-003 (probe, 6 of 6):** AC-001…AC-006 on an owned stack:
  - import, replace and reload, and an invalid picture;
  - the user picture rules;
  - `nuxt dev` at 1440×900;
  - the installed `file://` window, an app built from this worktree, at 1440×900;
  - the phone at 390×844.

  All pictures are synthetic. The JSON and 12 screenshots are beside it.

## Notes For Review

- **Peer fallback:** shown by specs, not in the probe; see IMP-003 "Not in this probe".
- **Spec changes:** where the design changed what a spec pinned, the spec changed with it; IMP-002 lists each. The
  biggest one: `useRunHistoryAvatarState.spec` is rewritten, because the broken-image maps are removed (design
  "Removal").
- **Server design choice, kept:** the domain `avatarUrl` stays the config's value, so package-update capture
  (`PackageEditCapture`) compares files as before. The effective address is computed only at GraphQL output.
- **The fetch exception:** an Electron window or `nuxt dev` uses the address directly, as the desktop's other
  `/rest/files` images do. Only a page with a phone credential uses the authorized fetch, as W-2 says.
