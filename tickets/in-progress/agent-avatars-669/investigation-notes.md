# Investigation Notes

## Meta

- Package: `agent-avatars-669`. Task autobyteus-669, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`. The founder sent it straight to Software Engineering on 2026-11-28; the avatar scope moves here from autobyteus-648.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-avatars-669`
- Branch: `codex/agent-avatars-669`
- Base: `origin/personal` @ `ea787a37b1` (2026-11-28). Finalization target: `origin/personal`.
- Authorities read:
  - the solution-designer skill;
  - requirements-engineering, architecture-design and design-principles (incl. 17);
  - `DESIGN.md`;
  - `autobyteus-server-ts/docs/design/node_access_model.md`, by its route table in code;
  - the 648 product ticket (context file).
- Every finding below is Read (code), unless marked otherwise.

## What exists

- **The definition's `avatarUrl`:**
  - Agent, team and org definitions carry `avatarUrl` (`agent-definition-config.ts:19,52`; team and org configs alike).
  - For a definition from a package or a built-in, the user's picture is a personal setting, kept outside the package files (`PERSONAL_FIELDS` has `avatarUrl`, `agent-definition-service.ts:64`; `personal-setting-record.ts:24,45-52` for agent, team and org). It overlays the base (`personal-settings-service.ts:154`), and a reset removes it.
  - For the user's own definitions, the form writes `avatarUrl` into the folder's `agent-config.json`.
- **Upload:**
  - `POST /upload-file` stores the image in the node's media storage and returns `/rest/files/images/<uuid>.<ext>`, relative by default (`upload-file.ts:127-135`; `resolveRestResourceUrl` with `prefer: "relative"`).
  - The forms save that string (`AgentDefinitionForm.vue:494-514`; the team form alike).
- **Packages:**
  - 0 of 79 package configs set `avatarUrl` (PM's count).
  - A definition is read per folder from `agent.md` plus `agent-config.json` (teams and orgs alike), with a content fingerprint for reload detection (`agent-definition-node-reader.ts:68-117`, `fingerprintOf`).
  - No other file of the folder is read, so there is no convention for a picture file.
- **Desktop rendering:**
  - About 15 components draw `<img :src="avatarUrl">` with an error fallback to initials or the team icon, each with its own small state: `AgentCard`, `AgentDetail`, `AgentTeamCard`, `AgentTeamDetail`, `AIMessage`, `EventMonitorBrowseAssistantRow`, `AgentWorkspaceSurface`, `TeamWorkspaceSurface`, `RunListRow` (the Runs view), `ChatNewSurface`, `RunTargetSwitcher`, `AgentOrgAvatar`, and the forms; `useRunHistoryAvatarState` holds the list's broken-image state.
  - In Electron, `nodeCredentialAttacher.ts:30-40` adds the node's credential to every request to the node, so an `<img>` loads there.
- **Phone rendering:**
  - `MobileRunRow.vue:26-35` draws only initials, a team icon or an org icon. Its rows come from `utils/mobile/mobileRunListRows.ts` (`avatar: 'agent' | 'team' | 'org'`).
  - A phone page cannot put the credential on an `<img>`. The page already loads protected files by an authorized fetch into an object URL: `useAuthorizedObjectUrl` with `shouldLoadResourceThroughAuthorizedFetch` (`/rest/files/` is protected), used by `ImageViewer` and `MediaSegment`. That is the "no key in the address" way of autobyteus-574 for images.
- **Access:** `/rest/files/*` falls to `OWNER_AND_PHONE` (`node-route-permissions.ts`, the default). A peer node (`/rest/remote`, `PEER`) cannot read it.
- **Relative addresses:**
  - The upload's address is relative, and components use it as given.
  - The installed desktop window is a `file://` page (`electronApplication.ts:118-126`), where `/rest/files/…` resolves to `file:///rest/files/…`.
  - Other node files are made absolute from `windowNodeContextStore.getBoundEndpoints().rest` (`fileExplorerContentActions.ts:214`, `useMobileNodeFile.ts:58`).
  - **Unproven:** whether the installed desktop shows an uploaded avatar today. The design resolves every avatar address against the bound REST base, which is right in `nuxt dev`, the installed window and the phone alike, so it holds either way. API/E2E checks it in the installed window (design case 21).
- **Rows without a definition:**
  - The server builds the delegated-run and member rows (`run-tree-view.ts`; `RunTreeRowDto`, `run-tree-dtos.ts:37-56`). The rows name kind, name, address and open target, but **no definition**. Their records (`run-tree-records.ts:32-44`) have none either.
  - So neither client can show a delegated task agent's, task team's or member's picture today.
  - The top-level list items carry `agentDefinitionId` / `teamDefinitionId`, and the web fills their avatar from its definition stores (`runListProjection.ts:73-106`, `runHistoryStoreSupport.ts:82`).
- **Definitions on the phone:** the phone loads `agentDefinitionStore` only for run setup. GraphQL lets it ask only for `id` and `avatarUrl`.

## Scope judgements

- The relative-address problem is this ticket: the avatar must show on the desktop the Task names, and the one avatar component owns the resolution.
- The duplicated `<img>` state in about 15 components is this ticket: every renderer must use the same resolution, protected loading and fallback.
- The flat run list (648) is not this ticket. `MobileRunRow.vue` and the desktop rows get an avatar slot, and their structure is unchanged. A later flat-list change keeps the slot because it is the row component's. **Collision risk:** 648 has no implementation branch yet (design only), so nothing collides now. The PM is told the files.
