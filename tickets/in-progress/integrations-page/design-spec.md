# Design Spec — Integrations page (autobyteus-337)

## Solution And Approval Basis

- Current solution revision ID: `SR-009` (revises SR-008 after ARCH-REV-001: AR-001…AR-006)
- Approved requirements: `requirements-doc.md` at SR-006. Approved by the **User**: DEC-001 (2026-10-31), DEC-002, DEC-011 and DEC-012 (2026-11-01), the import change (2026-11-01) and local folders (2026-11-01, in the Product review). Quotes are in the decision rows.
- Behavior-defining supplements:
  - the UI/UX: **r2 approved** (`/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/integrations-page-r2/ui-ux-spec.md`, VIS-001…VIS-035, commits `6ad06427f1`/`2f31380eb9`; the user: "If you think the UI is consistent, now I would say I'm fine with the UI."), plus the first design's VIS-019;
  - the manifest contract `AutoByteus/autobyteus-integrations` `8887475` `docs/integration-manifest.md`.
- User approval of the design: `Obtained`. The user, 2026-11-01: "if you think it's reasonable, then I would already approve. Because if you think all of the things are consistent now, and I would also approve". He was told it is consistent, with DEC-016 added. r2 was approved the same day. SR-009 fixes review findings within that approved intent
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/integrations-page/tickets/in-progress/integrations-page/investigation-notes.md`
- Authorities read, all in this conversation:
  - `references/architecture-design.md` and `references/design-principles.md` (2026-10-30);
  - `DESIGN.md`, rules 1–10;
  - the updated `SKILL.md` and `templates/design-spec-template.md` (2026-11-01).
- Conflicts: none.

## Current-State Read

- **Delivery definitions** (`credential-proxy/integration-definitions.ts` L26-61) hold the routes, auth formats and shell variables, plus `displayName` and `description`.
- **Run access is the tick list:**
  - `IntegrationRunAccess.environmentForRun` → `store.allowedIntegrations(agentDefinitionId)` (`integration-run-access.ts` L29-41);
  - the proxy route checks `store.isAllowed` on every call;
  - the ticks are `connections.json` `agentDefinitionIds` (`integration-connection-store.ts` L9-66).
- **The GitHub card** sits in Server Settings → Basics (`ServerSettingsBasicsPanel.vue` L14, L37). Its GraphQL is GitHub-specific (`api/graphql/types/github-integration.ts`).
- **Skill sources** (`skills/services/skill-source-service.ts`):
  - `addSkillSource(path)` (L96-108) checks that the directory exists and is not a duplicate or a name clash, then adds it to `AUTOBYTEUS_SKILLS_PATHS`. `removeSkillSource(path)` (L110-118) only edits that list; it never touches files.
  - `importGitHubSkillSource(url)` (L120-151) prepares the download, inspects it ("No valid skills found" is refused **before publication**), then publishes.
  - `removeGitHubSkillSource(id)` (L211-220) marks REMOVING and deletes the managed files.
  - `getSkillSources()` (L50-80) lists DEFAULT, LOCAL_PATH and GITHUB_REPOSITORY sources with their paths.
  - One state listener exists (`setGitHubSourceStateListener`, L92-94; called in `announcing`, L279-284).
- **Skills:**
  - effective skills come from `SkillService.resolveConfiguredSkillBindingsForAgent` (`skill-service.ts` L262-275), covering both scopes;
  - a `Skill` has `rootPath` and `managedSource` (`skills/domain/models.ts`);
  - **the catalog is rebuilt from disk on every lookup** (`loadCatalog`, L127-137).
- **The left menu section** is sized once at mount and persisted (`useAppLeftPanelSectionResize.ts` L3, L25, L38-46, L106).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`. A new server capability (the integration catalog over the imported sources), a changed access rule in the proxy, an integrations-aware import, connection cleanup on source removal, a GraphQL clean cut, a new web page with dialogs and navigation, and removals.
- Architectural risk: `High`. It changes the security boundary's access rule; repository content from a user-chosen source (any repository or folder) reaches the UI (an icon SVG and text); it is a contract change.
- Escalation trigger:
  - the access rule can't be checked cheaply per call;
  - repository content would reach the UI as anything but inert data;
  - a removal path could leave a token behind.

## Intended Change

1. **An integration catalog** lists the integrations in the imported skill sources (local folders and GitHub repositories), validated by the manifest contract and joined with the app's delivery definitions and the connections.
2. **The page imports a GitHub link or a folder** as a skill source, refusing one with no integration folder. **Manage** lists those sources, with Update (GitHub) and Remove.
3. **Removing a source removes its integrations' connections,** from either page.
4. **Access follows the integration's skill** in the agent's effective skills.
5. **The web page and dialogs** follow the approved design; the old card, its GraphQL and the ticks are removed.

## Change Scope (Mandatory)

- **Server:**
  - new `credential-proxy/integration-catalog.ts`, `integration-manifest.ts`, `tool-presence.ts`, `integration-access-rule.ts`;
  - changes to `integration-run-access.ts`, the route's per-call check, `integration-connection-service.ts` and `-store.ts`;
  - `integration-definitions.ts` renamed to `delivery-definitions.ts` and trimmed;
  - in `skills/services/skill-source-service.ts`: the `requireIntegrationFolder` import option and the removal observer;
  - GraphQL: new `api/graphql/types/integrations.ts`; `github-integration.ts` removed.
- **Web:**
  - new `pages/integrations.vue`, `components/integrations/*` and `stores/integrationsStore.ts`;
  - GraphQL documents, the navigation key, and the left-menu height fix;
  - the "Integration" label on the Skills page (approved in r2);
  - removed: `GitHubIntegrationCard.vue`, `githubIntegrationStore.ts`, `githubIntegrationQueries.ts`, and the card in `ServerSettingsBasicsPanel.vue`;
  - locales en and zh-CN.
- **Docs:**
  - `credential_proxy.md` (the access rule, the catalog);
  - `skills.md` (the import option, the removal observer);
  - new `autobyteus-web/docs/integrations.md`;
  - `autobyteus-web/docs/settings.md` (the GitHub section removed);
  - `GLOSSARY.md`.

- **The integrations repository** (`/Users/normy/autobyteus_org/autobyteus-integrations`, `AutoByteus/autobyteus-integrations` `main`): the README's install steps are rewritten to the page (AC-009). Docs only, finalized on that repository's `main` with its own commit; the Task allows giving it to the Agent Package Creator.

Deliberately left alone:
- the proxy forwarding, passes, routes, redaction and activity log (311);
- the skill-source download, inspection and update machinery (reused);

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Trigger | Path | Spine |
| --- | --- | --- | --- | --- |
| List | REQ-001, REQ-002, REQ-008, REQ-009 | The page opens | `integrations` → `IntegrationCatalog.list()` | DS-001 |
| Import | REQ-003 | Import with a link or a folder | `importIntegrations(location)` → skill-source import with `requireIntegrationFolder` | DS-002 |
| Manage | REQ-003 | Manage: Update / Remove | `integrationSources` / the skill-source update and remove | DS-002, DS-005 |
| Connect | REQ-004 | Connect, Test, Replace, Remove in the dialog | `connectIntegration` / `testIntegration` / `disconnectIntegration` | DS-003 |
| Access | REQ-005, REQ-006 | A run starts; each proxied call | `IntegrationAccessRule` | DS-004 |
| Source removed | DEC-015 | Remove on either page | The removal observer → disconnect | DS-005 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature` + `Behavior change` (the access rule).
- Root cause classification: `Shared Structure Looseness` for one fact (name and description in two places, P11), so the delivery definitions lose them. Otherwise `No Design Issue Found`.
- Refactor needed now: `Yes`, bounded:
  - trim and rename the delivery definitions;
  - make the connection service per integration;
  - remove the ticks;
  - two named extensions to `SkillSourceService` (an import option and a removal observer), not a parallel importer.
- Structural triggers fired:
  - **Derived data (P11):** the access fact is derived once by `IntegrationAccessRule`.
  - **Capability-area reuse (P4):** skill sources (import, inspection, update, remove), `SkillService` effective skills, the vault.
  - **Several kinds or forms (P1):** two source kinds (local folder, GitHub repository) and two removal entry points (Integrations, Skills). Removal is handled in `SkillSourceService` so both pages are covered. There are also two skill scopes and application-owned agents.
  - **Legacy cleanup (P8):** the GitHub-specific GraphQL and the ticks.
  - **Persisted data (P5):** `connections.json`.
  - **Vocabulary (P15):** glossary words.

## Terminology (added to `GLOSSARY.md`, "Integrations")

| Word | Meaning |
| --- | --- |
| **integration manifest** | An integration folder's `integration.json` (name, description, `token.help`, prerequisites) |
| **integration source** | An imported skill source (a local folder or a GitHub repository) that holds at least one integration folder. It is a skill source; "integration source" names only this role |
| **integration skill** | The skill in an integration's folder (its `SKILL.md` `name`) |
| **delivery definition** (311's "integration definition", renamed) | The app-owned part: routes, auth formats, shell variables, token check |
| **integration state** | `NEEDS_TOKEN` (shown "Installed, needs a token"), `CONNECTED`, `NEEDS_NEWER_APP` |

## Persisted Data / State Transition Decision (Mandatory)

- **`connections.json`:** `Directly Usable — No Migration`. The tolerant reader ignores an existing `agentDefinitionIds`, and the next write leaves it out. `login` and `connectedAt` keep their meaning.
- **The vault entry** is unchanged.
- **Skill-source storage** (`AUTOBYTEUS_SKILLS_PATHS`, `skill-sources/github/registry.json`) is unchanged in shape.
- **The beta.4 user:** a GitHub token saved on the old card is kept. If the integrations repository is already imported (as in integrations-1's check), the GitHub card shows "Connected as @login" at once. If not, the connection is not shown until he imports the repository; then the card appears already connected. This is the only way a token can exist without a card, and it ends at the first import. The vault entry is deleted only by Disconnect or a source removal (DEC-015).

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | The page opens (or after an action) | Cards with state | `IntegrationCatalog` |
| DS-002 | Primary | Import, or Update in Manage | The source registered or updated; cards refreshed | `IntegrationCatalog` → `SkillSourceService` |
| DS-003 | Primary | Connect, Test, Remove token | The vault entry and `connections.json`; the card state | `IntegrationConnectionService` |
| DS-004 | Primary | Run preparation; each proxied call | Variables, or none; a call allowed or refused | `IntegrationAccessRule` |
| DS-005 | Return/lifecycle | Remove of a source on either page | Its integrations disconnected, then the source removed | `SkillSourceService` → removal observer → `IntegrationConnectionService` |
| DS-006 | Bounded local | Reading one source folder | Valid integration entries; invalid ones skipped with a warning | `IntegrationManifest.parse` |

## Primary Execution Spines

- **DS-001 (list):** `IntegrationsPage` → GraphQL `integrations` → `IntegrationCatalog.list()`:
  1. `SkillSourceService.getSkillSources()`: the LOCAL_PATH sources and the ACTIVE GITHUB_REPOSITORY sources, with their paths.
  2. For each source, every top-level folder with an `integration.json` → `IntegrationManifest.parse(folder)` (DS-006).
  3. Per entry, the state:
     - no delivery definition for its ID → `NEEDS_NEWER_APP`;
     - no vault entry → `NEEDS_TOKEN`;
     - otherwise `CONNECTED` with the login.
  4. The tools: `ToolPresence.check(prerequisites)`, a lookup on the server's `PATH` (with `PATHEXT` on Windows). No shell is spawned; agent shells inherit this environment.
  5. Each entry also carries its `sourceId` and source label (owner/repo, or the folder path) for "Imported from".
  6. Two entries with the same ID (only possible through a Skills-page import, DEC-017): the entry from the source that comes first in the skill catalog's source precedence (the order `listSkillCatalogSources` uses) is kept (AR-008; no import time is stored) and the other is skipped with a logged warning naming both sources.
  7. Sorted by name. No network. Empty means nothing imported.
- **DS-002 (import and update):** `importIntegrations(location)` → `IntegrationCatalog.import(location)`:
  - a GitHub URL → `SkillSourceService.importGitHubSkillSource(url, {requireIntegrationFolder: {reservedIds}})`. In the prepared-inspection step (L134-135), besides "No valid skills found", **a prepared repository with no top-level folder holding both `SKILL.md` and `integration.json` is refused** ("No integrations in this repository"), before publication. Nothing is published;
  - a path → `SkillSourceService.addSkillSource(path, {requireIntegrationFolder: {reservedIds}})`, with the same check on the folder before it is added to the list ("No integrations in this folder"; "Directory not found: <path>" as today).

  The option checks presence only. Validity is the catalog's job: an invalid manifest is a skipped card with a logged warning (rule 7). Errors come back coded, for example `SKILL_NAME_CONFLICT` and `GITHUB_UNREACHABLE` with the reason.

  **`IntegrationCatalog.import` owns the classification of the input and of the outcomes (AR-002):**

  | Input or outcome | Detected by | Result |
  | --- | --- | --- |
  | `http://` or `https://` that `parseGitHubSkillRepository` accepts | the catalog | GitHub import |
  | any other `http(s)://` text (not a GitHub repository URL) | the catalog | `NOT_A_LINK_OR_PATH` |
  | an absolute path, or one starting with `~` | the catalog | folder import |
  | anything else (a relative path, empty, other schemes) | the catalog | `NOT_A_LINK_OR_PATH` |
  | GitHub re-import: `duplicate()` returns a warning result (`skill-source-service.ts` L245-248) | the catalog reads that case from the result | `ALREADY_IMPORTED {kind: GITHUB_REPOSITORY}` |
  | folder re-import: throws "Skill source already exists" (L100-102) | the catalog maps it | `ALREADY_IMPORTED {kind: LOCAL_PATH}` |
  | "Directory not found" / "Path is not a directory" (L97-98) | mapped | `DIRECTORY_NOT_FOUND` |
  | a name clash (`assertNoIncomingSkillNameConflicts`, or the GitHub inspection) | mapped | `SKILL_NAME_CONFLICT` with the importer's text |
  | the `requireIntegrationFolder` refusal | mapped | `NO_INTEGRATIONS_FOUND` |
  | an integration ID already in another source (DEC-017) | `requireIntegrationFolder.reservedIds`: the catalog passes its current IDs, and the skills service refuses a source with a folder of that name | `INTEGRATION_ALREADY_IMPORTED {id, existingSource}` |
  | GitHub metadata or download failure | mapped | `GITHUB_UNREACHABLE {reason}` |

  The result lists **only the newly imported integrations** (IDs after the import minus IDs before), for the success notice.

  `integrationSources` lists the sources from DS-001 that contain integrations. Update of a GitHub source → `updateGitHubSkillSource(id)`. Local sources have no Update (DEC-014).
- **DS-003 (connect):** `connectIntegration(id, token)` → `IntegrationConnectionService.connect`:
  1. `deliveryDefinitions.get(id).verifyToken` (GitHub `/user` → login; 401 → `TOKEN_REJECTED`);
  2. vault `saveForConsumer({kind: "integration", integrationId: id})`;
  3. the store saves the login.

  `testIntegration` re-verifies. `disconnectIntegration` removes the vault entry and the login.
- **DS-004 (access):** `IntegrationAccessRule`:
  - **At run preparation** (full): the integration exists in the catalog and has a delivery definition. The agent's effective skills (`resolveConfiguredSkillBindingsForAgent`, both scopes, disabled excluded) contain a resolved skill named as the integration skill **whose `rootPath` is that integration's folder**. A same-named skill from anywhere else does not count. Allowed → pass and variables (311).
  - **On each proxied call** (cheap, without rebuilding the catalog):
    1. the pass is valid;
    2. the agent definition, re-read, still has the skill (`CONFIGURED` with the name in `skillNames`, or `ALL_INSTALLED`);
    3. the skill is not disabled;
    4. the source recorded for the run at preparation is still registered (in the local paths, or an ACTIVE GitHub record);
    5. the token is present.

    Refusal is `INTEGRATION_NOT_ALLOWED`.
- **DS-005 (source removal):** `SkillSourceService.removeSkillSource(path)` or `removeGitHubSkillSource(id)`, from either page:
  1. **before** removing, it calls its one `SkillSourceRemovalObserver.sourceRemoving(sourceRootPath)`;
  2. `IntegrationCatalog` finds the integration IDs whose **kept** entry is in that root (DEC-017) → `IntegrationConnectionService.disconnect(id)` for each that is connected;
  3. if a disconnect fails, the removal is refused with that error, so no token is left without a card;
  4. otherwise the removal proceeds as today.

  This is a lifecycle hook (a notification before the change), not a function passed into the removal. The observer is set once at composition, like `setGitHubSourceStateListener`.
- **Update dropping an integration (DEC-016):** `updateGitHubSkillSource` calls `observer.sourceChanging(oldRoot, newPreparedRoot)` before publication. The catalog disconnects the integration IDs that are in the old root and missing from the new one; a failure refuses the update. Automatic updates (the update pass) go through the same `updateGitHubSkillSource`, so they are covered.

## Ownership Map

| Node | Owns |
| --- | --- |
| `IntegrationManifest` | Parsing one folder by the contract: the ID pattern, required fields, no unknown fields, the `SKILL.md` `name`, an `icon.svg` kept only if it parses as SVG and is under 64 KB. Invalid → skipped with a warning naming the folder and the reason |
| `IntegrationCatalog` | The list, import, update, the sources view, and "which integrations are in this root". The only integrations caller of `SkillSourceService` |
| `ToolPresence` | `PATH` lookup |
| `IntegrationConnectionService` | Connect, test, disconnect per integration; the only writer of the vault entry and `connections.json` |
| `IntegrationAccessRule` | The one access fact, used by `IntegrationRunAccess` and the route |
| `DeliveryDefinitions` | Routes, auth formats, shell variables, `verifyToken`. No name or description |
| `SkillSourceService` | As today, plus the import option and the removal observer call |

## Interface Boundary Mapping

| Interface | Shape |
| --- | --- |
| Query `integrations` | `[IntegrationView!]!`, where `IntegrationView {id, name, description, iconDataUrl: String, state: NEEDS_TOKEN \| CONNECTED \| NEEDS_NEWER_APP, login: String, connectedAt: String, tokenHelp: String, skillName: String!, source: {sourceId, kind: LOCAL_PATH \| GITHUB_REPOSITORY, label}, tools: [{tool, found}]!}` |
| Query `integrationSources` | `[IntegrationSourceView {sourceId, kind, label, integrationNames, github: {status, installedRevision, latestRevision} \| null}]` |
| Mutations | `importIntegrations(location: String!): [IntegrationView!]!`; `updateIntegrationSource(sourceId): …`; `removeIntegrationSource(sourceId): …` (returns the removed connection names for the confirmation result); `connectIntegration(id, token)`; `testIntegration(id)`; `disconnectIntegration(id)`. Coded errors: `NO_INTEGRATIONS_FOUND`, `DIRECTORY_NOT_FOUND`, `SKILL_NAME_CONFLICT`, `GITHUB_UNREACHABLE`, `TOKEN_REJECTED` |
| `SkillSourceService` | `importGitHubSkillSource(url, options?: {requireIntegrationFolder?: {reservedIds: readonly string[]}})`; `addSkillSource(path, options?)` and `removeSkillSource(path)` become **async** (`Promise<SkillSourceInfo[]>`), because they now await the observer (AR-006). Their GraphQL resolvers (`api/graphql/types/skills.ts` L305-313) and callers become async too. `setSourceChangeObserver(observer: {sourceRemoving(rootPath): Promise<void>; sourceChanging(oldRoot, newRoot): Promise<void>})`. The presence rule "a top-level folder holding both `SKILL.md` and `integration.json`" and the reserved-folder-name check stay in `skills/` as plain rules, with no integration types imported |
| Removed (rule 9) | `githubIntegration`, `connectGitHubIntegration`, `testGitHubIntegration`, `disconnectGitHubIntegration`, `setGitHubIntegrationAgentAccess`, `agentDefinitionIds` |

## Web (the approved r2 spec and its references are normative)

| Piece | Responsibility |
| --- | --- |
| Navigation | The `integrations` key, last after Nodes |
| `pages/integrations.vue` | The grid; Import and Manage actions; the empty state that invites Import |
| `components/integrations/ImportIntegrationsDialog.vue` | One field "GitHub repository link or folder path": a web address is a repository, anything else a folder. Browse… where the native picker exists (the Skills source dialog's existing pattern). The hint follows the input (the trust text for a link; "nothing is copied" for a folder). Errors under the field; a success notice naming the integrations and the source |
| `components/integrations/IntegrationSourcesDialog.vue` | "Manage sources": a repository row has Update (the product's existing update confirmation) and Remove; a folder row ("Local folder") has Remove. The Remove confirmation follows the spec's texts and adds "This also removes your GitHub connection." when connected |
| `components/integrations/IntegrationCard.vue`, `IntegrationDialog.vue`, `TokenConnectStep.vue` | As in the approved design. The icon only as an `<img>` data URL, never inline SVG. Focus returns to the opening button on close; all three dialogs use the product's shared modal behavior (Tab stays in the dialog) |
| Skills page | The "Integration" label on an integration skill, linking to `/integrations#integration-<id>`, which scrolls to and focuses the card (VIS references). The skills GraphQL gains `integrationId: String` per skill, set by `IntegrationCatalog` for a skill whose `rootPath` is an integration folder (one owner of the fact, P11). Skills → Manage Skill Sources lists the imported sources as today; Remove there goes through DS-005 |
| `useAppLeftPanelSectionResize.ts` | Follows the menu's height until the user drags the divider |
| Removed | The GitHub card files and their entry in Basics |

## Proxy Refusal Texts (AR-005)

`credential-proxy-routes.ts` L35-44 used the definition's `displayName` (removed, DEC-006) and pointed to "the … card in Settings". The name now comes from the integration's manifest through `IntegrationCatalog.nameOf(id)`, read only when a refusal is written (refusals are rare); the ID is the fallback when the integration is no longer imported. New texts:

- `INTEGRATION_NOT_ALLOWED`: "This agent has no access to {name}. Add the {skill} skill to the agent."
- `INTEGRATION_NOT_CONNECTED`: "{name} is not connected on this node. Connect it on the Integrations page."
- `UPSTREAM_REJECTED_TOKEN`: "{name} rejected the stored token. Check it on the Integrations page."
- `PATH_NOT_ALLOWED` and `UPSTREAM_UNREACHABLE`: unchanged, apart from the name.

`credential_proxy.md`'s error table is updated to match.

## Removal / Decommission Plan (Mandatory)

| Item | Replaced by |
| --- | --- |
| `api/graphql/types/github-integration.ts` | `integrations.ts` |
| `IntegrationConnectionStore.allowedIntegrations`, `isAllowed`, `agentDefinitionIds`; `IntegrationConnectionService.setAgentAccess` | `IntegrationAccessRule` |
| `displayName` and `description` in the delivery definitions | The manifest |
| Web GitHub card, store and queries; the Basics entry | The page |

## Dependency Rules

- The web never reads a source; only the server catalog does.
- `skills/` does not import `credential-proxy/`. It knows only the observer interface and the presence check ("a folder with `SKILL.md` and `integration.json`").
- Repository text is shown as text. In `token.help`, only `https:` URLs become links (AR-003). The text is split into text nodes and link elements, never through `v-html`. A link opens through the existing external-link path (`window.electronAPI.openExternalLink`, as in `MarkdownRenderer.vue` L143-146; in a browser build, `window.open` with `noopener`). `javascript:`, `data:`, `http:` and other schemes stay plain text; tests cover them. An icon is shown only as an `<img>`.
- Backends keep depending only on `IntegrationRunAccess`.

## Good And Avoided Shapes

| Topic | Good | Avoided |
| --- | --- | --- |
| Removal | The observer in `SkillSourceService`, so both pages are covered | The Integrations page removing tokens itself (Skills-page removals would leave tokens behind) |
| Skill identity | The resolved skill's `rootPath` is the integration's folder | Any skill with that name |
| Empty import | Refused before publication | Import, then remove again |

## Change / Refactor Sequence

1. **Server:**
   - manifest parser;
   - catalog and tool presence;
   - the `SkillSourceService` option and observer;
   - delivery definitions renamed and trimmed;
   - connection service;
   - access rule, run access and the route check;
   - GraphQL clean cut.
2. **Web** per the approved r2 design; removals; locales; codegen.
3. **Docs and glossary.**
4. **Tests:**
   - deterministic:
     - the parser rules;
     - the states;
     - import refusals (GitHub and folder);
     - Update;
     - Remove on each page removes the token, and a failed disconnect refuses the removal;
     - access in both scopes, a same-named skill elsewhere refused, disabled refused, removing the skill refusing the next call, removing the source refusing the next call;
     - tool presence;
   - web component tests against the references;
   - **AC-008 (the teammate's way):** on an isolated instance, Import `https://github.com/AutoByteus/autobyteus-integrations` on the page, connect with the test-vault token (now read/write on `ryan-zheng-teki/autobyteus-mcp-test`), add `github-integration` to an agent, and the agent's `issues.sh list` and `issues.sh comment` on the test repository go through the proxy (activity records); a scan finds no token;
   - live on an isolated instance with its own vault: Import the real repository by its link, connect with the test-vault token (read by the test), add `github-integration` to an agent, its shell's `curl` reaches issue #1 through the proxy, and a scan finds no token. The same flow from a local folder copy of the repository, with no token in the scan.

## Key Tradeoffs

- **Integrations reuse skill sources.** There is one machinery, at the cost of two small, named extensions in `SkillSourceService`.
- **Two checks of one rule** (full at run start, cheap per call), with no catalog cache to invalidate.

## Risks

- **R-4 (recorded by the review):** a local integration folder deleted by hand leaves its token in the vault with no card, the same shape as the accepted beta.4 case. It ends when the folder comes back or the source is removed (DEC-015).

- **R-1:** a user-chosen repository may contain misleading text. It is shown as text only, with the trust note on Import.
- **R-2:** "all installed skills" agents get access once connected (the user's DEC-002); the docs say so.
- **R-3:** the per-call re-read of the agent definition; implementation measures its cost.

## Guidance For Implementation

- **Prove first:**
  - the agent definition read per call is cheap;
  - application-owned and team-local agents resolve through `resolveConfiguredSkillBindingsForAgent`;
  - a run's source can be recorded at preparation.
- Dummy tokens everywhere except the gated live check. Never print the token.
