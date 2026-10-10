# Skills Management - Frontend

This document describes the design and implementation of the **Skills Management** module in the autobyteus-web frontend.

## Overview

The Skills module allows users to:

- View available global skills and bundled package skills (file-based
  capabilities from configured skill directories and imported agent packages).
- Reload the visible skill catalog after files in already configured skill
  source folders are changed on disk, without restarting the application.
- View the content of skill files (scripts, docs) using the **generic File Explorer**.
- Create new skills.
- Edit skill files directly in the browser with **Monaco Editor**.
- Assign catalog skills to agents during agent creation.

Package-private agent skills and owning-team shared package skills are also
listed as normal rows on the Skills page when their package roots are available.
Opening them uses the same Skill Detail and File Explorer flow as other skills;
read/write behavior is determined by the underlying filesystem permissions.

## Local and GitHub Sources

Open **Sources** to manage where skills come from. The dialog lists the sources
as compact rows, Default first and then by path. Each row shows a folder or
GitHub icon, a short name (`owner/repository` for GitHub; the last folder name
for a folder, or `parent/skills` when that name is `skills`), the skill count
(**No skills**, **1 skill**, **N skills**) and the full path or URL, truncated,
with a tooltip and a copy button. Only the list scrolls; the add area and the
**Done** footer stay in place. Esc, ×, **Done** and a click outside close the
dialog, and focus returns to **Sources**. Focus moves into the dialog when it
opens and Tab stays inside it. After a confirmation, an operation or a
duplicate-name dialog ends, focus comes back into the dialog. Esc is ignored
while a confirmation is open.

The **Add skill source** input takes either a folder path or a public HTTPS
GitHub repository-root URL. A value starting with `http://`, `https://`,
`www.` or `github.com/` is imported as a GitHub repository, and the hint then
shows the trust warning; any other value is added as a local folder. In the
desktop app, **Browse…** opens the native folder picker and fills the input
without adding it. The input is cleared after a successful add and kept when
the add fails. GitHub imports use the default branch; private repositories,
branch/tree URLs and subfolder selection are not supported. A root `SKILL.md`
imports one skill. Otherwise, immediate skill folders and conventional nested
`skills/` collections are discovered. Invalid collection candidates are
reported as skipped; an empty or conflicting repository is rejected as a whole.

The dialog checks GitHub sources every time it opens, so each GitHub row shows
one status line (*Up to date*, *Update available*, *Check failed*, …). After a
failed check, **Try again** runs the check once more. The installed and latest
revisions, branch and last check time are in the status tooltip and in the
Update confirmation. Checking does not download or replace installed files.
**Update** appears for *Update available* and *Update failed* and requires
confirmation: the entire downloaded copy is replaced, including local edits
and upstream deletions. Failed preparation retains the previous usable copy.
A post-commit cleanup warning means the update succeeded; it is not a rollback.
Use local folders if you want to maintain your own edits.

The trash button removes a source after confirmation; for a GitHub source it
deletes only the managed copy. **Retry removal** completes an
interrupted/failed removal after the reported filesystem problem is corrected.
A source marked **Removal incomplete** is already excluded from the catalog,
including after restart; retry does not remove unrelated local sources. Local
removal only unlinks the folder, and the default source has no trash button.
Import only sources you trust; downloading a skill does not endorse its
instructions.

Source changes refresh cards, name-based selections and transient file views.
A later agent run uses the current catalog generation, including in the same
workspace while an older run remains open. Existing agent contexts are not
hot-refreshed, and old-generation snapshot isolation is not promised.
**Reload** remains an installed-files rescan, not a remote update check.

A repeated equivalent repository URL returns the existing source row rather
than downloading another copy. A same-revision Update preserves local edits;
there is no force-reset action. A registry diagnostic is separate from an
individual check/update failure: local skills remain usable, and corrupt
managed metadata is not silently replaced with an empty registry.

## One Skill Per Name (D-19)

The server keeps exactly one copy of every skill name (its skills folder, then
agent packages, then added local/GitHub sources, then runtime default folders such as
`~/.codex/skills`). The Skills page, `/` tags, agents and the Daily Assistant
all use that copy, and opening, editing or deleting a skill acts on it.

- **Duplicates are rejected at import.** Adding a skill folder
  or GitHub source (`SkillSourcesModal`), importing, updating or reloading an agent package
  (`AgentPackagesManager`) and creating a skill (`SkillsList`) run through
  `skillNamesStore.runWithSkillNameChecks`. A `SKILL_NAME_CONFLICT` error
  (parsed from `extensions.conflicts` by the stores; `utils/skills/skillNames.ts`)
  opens `SkillNameConflictDialog.vue`, mounted once in `app.vue` on
  `components/common/Modal.vue`: "Duplicate skill names", one row per name with
  the existing and the new path, and an OK button (Esc and a backdrop click also
  close it). Nothing is added or changed, and the store shows no error of its own.
- **Runtime default copies are notices.** A duplicate only against a runtime
  default folder is accepted; the store compares `skillNameIssues` before and
  after the action and shows a toast such as "Ignored 2 skills from the Codex
  default folder because your own copies take precedence."
- **Out-of-band duplicates** (a `git pull`, a Finder copy) are listed by the
  amber `SkillNameIssuesBanner.vue` on the Skills page, fed by the
  `skillNameIssues` query: "Some skills share a name. AutoByteus uses one copy
  per name." with "Show details" (name, used path, ignored paths). Conflicts ask
  the user to rename or remove one copy; ignored runtime default copies are
  informational. Ignored copies are read-only there.

## Module Structure

```
autobyteus-web/
├── pages/
│   └── skills.vue                      # Main skills management page
├── components/skills/
│   ├── SkillsList.vue                  # Skills listing with cards
│   ├── SkillCard.vue                   # Individual skill card
│   ├── SkillSourcesModal.vue           # Sources dialog: add input (folder/URL), Browse…, checks, confirmations, focus
│   ├── SkillSourceRow.vue              # One source: name, count, path/URL + copy, GitHub status and actions
│   ├── SkillDetail.vue                 # Skill explorer & file viewer
│   ├── SkillDescriptionSummary.vue     # Compact description summary + inline More/Less disclosure
│   ├── SkillNameConflictDialog.vue     # "Duplicate skill names" pop-up (D-19)
│   ├── SkillNameIssuesBanner.vue       # Skills page banner for ignored same-name copies
│   └── SkillWorkspaceLoader.vue        # Transient workspace lifecycle manager
├── stores/
│   ├── skillStore.ts                   # Skills CRUD operations
│   ├── skillSourcesStore.ts            # Source operations, pending state and diagnostics
│   ├── skillNamesStore.ts              # Ignored copies, conflict pop-up state, tier-4 notices
│   └── workspace.ts                    # Workspace registration (incl. skill workspaces)
├── utils/skills/
│   └── skillSourceDisplay.ts           # Short display name of a skill source
└── graphql/
    ├── queries/skillQueries.ts
    └── mutations/skillMutations.ts
```

## Navigation

Skills is a **standalone top-level module** accessible via the main sidebar (wrench/screwdriver icon). It is independent from the agent/team definition modules.

**Route:** `/skills`

## View Modes

The skills page uses component-based navigation (not URL query parameters):

| View             | Component   | Description                    |
| ---------------- | ----------- | ------------------------------ |
| `list` (default) | SkillsList  | Browse available skills        |
| `detail`         | SkillDetail | View/edit files within a skill |

The list view starts directly with the search/action toolbar (`Search skills`,
`Sources`, `Reload`, and `Create Skill`) and then renders alerts plus the skill
card grid. It intentionally does not render a duplicate page-level `Skills`
heading or explanatory subtitle in the main content because the sidebar already
communicates the active top-level module.


## Skill Detail Header

`SkillDetail.vue` uses a compact header so the file workspace remains close to
the top of the page. The header owns navigation, skill identity, and the skill
description summary. The description is one line by default with truncation and
a localized `More` control.

`SkillDescriptionSummary.vue` owns the description disclosure state. Clicking
`More` expands the full description inline in normal document flow and changes
the control to `Less`; clicking `Less` collapses back to the one-line summary.
This disclosure must not use an overlay/popover because the skill workspace
(file explorer, tabs, and document content) should never be covered by the
description panel.

## Architecture: Skill Workspaces

Skills integrate with the **workspace-agnostic File Explorer** architecture. When viewing a skill's files, a **transient SkillWorkspace** is created on-demand.

```mermaid
flowchart TD
    subgraph "SkillDetail View"
        SkillDetail[SkillDetail.vue]
        Loader[SkillWorkspaceLoader.vue]
        FileExplorer[FileExplorer.vue]
        FileViewer[FileContentViewer.vue]
    end

    subgraph "Stores"
        WorkspaceStore[workspace.ts]
        FileExplorerStore[fileExplorer.ts]
    end

    subgraph "Backend"
        SkillWorkspace[SkillWorkspace]
        FileExplorerWS[WebSocket]
    end

    SkillDetail --> Loader
    Loader --> |"registerSkillWorkspace()"| WorkspaceStore
    Loader --> FileExplorer
    Loader --> FileViewer

    FileExplorer --> |":workspaceId prop"| FileExplorerStore
    FileViewer --> |":workspaceId prop"| FileExplorerStore

    WorkspaceStore --> |"skill_ws_{name}"| SkillWorkspace
    WorkspaceStore <--> FileExplorerWS
```

### SkillWorkspaceLoader.vue

A lifecycle component that manages transient skill workspaces:

```vue
<SkillWorkspaceLoader :skillId="skill.name" :rootPath="skill.rootPath">
    <template #default="{ workspaceId }">
        <FileExplorer :workspaceId="workspaceId" />
        <FileContentViewer :workspaceId="workspaceId" />
    </template>
</SkillWorkspaceLoader>
```

**Lifecycle:**

1. `onMounted`: Calls `workspaceStore.registerSkillWorkspace(skillId)` → returns `skill_ws_{skillId}`
2. Provides `workspaceId` to child components via scoped slot
3. A changed skill name or `rootPath` unregisters the old workspace and registers
   the new one; a catalog root replacement also discards stale explorer state.
4. `onBeforeUnmount`: Calls `workspaceStore.unregisterSkillWorkspace(workspaceId)` → cleans up

### Workspace ID Convention

Skill workspaces use the prefix `skill_ws_` followed by the skill name:

```typescript
const workspaceId = `skill_ws_${skillId}`; // e.g., "skill_ws_brand-guidelines"
```

This prefix allows the backend `WorkspaceManager.get_or_create_workspace()` to dynamically create `SkillWorkspace` instances on first connection.

## Data Models

### Skill

```typescript
interface Skill {
  name: string;
  description: string;
  content: string; // Content of SKILL.md
  rootPath: string;
  fileCount: number;
  createdAt: string;
  updatedAt: string;
}
```

## State Management

### skillStore.ts

Manages skill metadata (NOT file operations - those are delegated to the FileExplorer):

| Action                 | Description                              |
| :--------------------- | :--------------------------------------- |
| `fetchAllSkills()`     | Load all skills from the server.         |
| `reloadSkillCatalog()` | Explicitly rescan configured skill sources and bundled package skill roots, replace the visible skill list, and refresh cached skill-source metadata. |
| `fetchSkill(name)`     | Load a specific skill by name.           |
| `createSkill(payload)` | Create a new skill directory + SKILL.md. |
| `deleteSkill(name)`    | Delete the entire skill directory.       |

> **Note:** File operations (view, edit, save) are now handled by the generic `FileExplorerStore` via the skill's transient workspace.

The Skills list toolbar exposes a localized **Reload** action backed by the
GraphQL `reloadSkillCatalog` mutation. Reload updates card metadata such as
description, file count, added skills, removed skills, and source counts after
external file edits. The button has its own `reloading` state and success/error
feedback; duplicate concurrent reloads are ignored. If the currently selected
skill disappears during reload, `skillStore` clears `currentSkill` so the page
can return to the list state.

Reload is intentionally a catalog/UI refresh. It affects the Skills page and
future agent selections, but it does not claim to update skill content that has
already been materialized inside active agent runs.

### workspace.ts (Skill Registration)

| Action                            | Description                                  |
| :-------------------------------- | :------------------------------------------- |
| `registerSkillWorkspace(skillId)` | Creates transient workspace, returns ID.     |
| `unregisterSkillWorkspace(wsId)`  | Cleans up workspace and file explorer state. |

## Agent Integration

### Agent Creation Form

The `AgentDefinitionForm.vue` component includes a "Skills Configuration" section.
It calls `skillStore.fetchAllSkills()` to populate available skills, including
bundled package skills that are visible in the normal Skills catalog.

- **Component**: `GroupableTagInput`
- **Data Field**: `skillNames` (List of strings)

When an agent is created, the selected `skillNames` are sent to the backend
`AgentDefinition`. The **Use all installed skills** checkbox sets
`skillScope: ALL_INSTALLED` instead; the picker is then disabled and the backend
binds every enabled installed skill from its own discovered root at run start.
In Chat, `/` offers the skills the current agent can use (enabled installed
skills for `ALL_INSTALLED`, configured names otherwise).

The backend treats `skillNames` as logical names at runtime. For package-authored
agents, runtime resolution is context-first: those names may resolve to
package-private canonical folders such as
`agents/<agent-id>/skills/<skill-name>/SKILL.md`, team-local private folders
under `agent-teams/<team-id>/agents/<agent-id>/skills/<skill-name>/SKILL.md`, or
an owning-team shared skill under
`agent-teams/<team-id>/skills/<skill-name>/SKILL.md` before falling back to the
global skill directories. The Skills page catalog also scans package roots so
users can browse and open those bundled skill files normally. Duplicate skill
names use first-seen catalog precedence, so package authors should choose unique
logical skill names.

## Skill Improvement And Skill Files

Manual Skill Improvement is a skill-first workflow. When the backend deems a run or
team agent-member eligible, the visible improver helper may edit only the exact
configured skill root directories returned by backend eligibility. `SKILL.md`
is the package entry file; supporting files inside the same listed root may be
changed when a reusable improvement needs them. Agent/team definitions, MCP/tool
config, source code, run memory, sibling skills, and files outside the listed
roots are out of MVP scope.

The frontend does not decide whether a skill is eligible for Skill Improvement. The
composer-adjacent **Improve skills** CTA lazy-loads backend eligibility for the
selected active run or team member and stays hidden when the backend says the
current target is ineligible. Run-history rows and start surfaces do not own
Skill Improvement actions. Before messaging the visible improver, the backend
projects the target's raw trace corpus into readable work trace files and sends
the improver a concise task packet with paths, editable skill roots, and a
bounded relative package tree that marks each `SKILL.md` as `[entry]`; it does
not inline the work trace body or ask the improver to read raw trace JSONL. The
backend records minimal provenance and does not compute changed paths or
policy-violation metrics in the MVP. After launch, the workspace may show only a
short transient start status. Only after meaningful durable skill package file
changes, the improver reports through one direct `send_message_to` call with
`message_type: "skill_update"` to the still-active target run. Its content should
explain what changed, why it matters, and how the target should use or reload the
updated guidance, while dynamic references are absolute paths to changed or
directly relevant surviving files inside editable roots; the backend record
distinguishes sent, rejected, target-inactive, and not-attempted outcomes. That
helper-authored message is not a runtime/model skill-refresh instruction;
next-run correctness is the MVP baseline. Users should still inspect any
Git-backed skill changes directly before treating them as accepted improvements.

Git-backed skill packages remain the recommended testing and rollback mode for
this MVP when a skill source is owned by an external repository. AutoByteus does
not expose built-in history controls in Skill Detail; direct editing is
controlled by prompt/tool contract plus manual Git inspection/revert, not by a
separate proposal/apply UI or product audit service.

## Related Documentation

- **[Server Skill Improvement](../../autobyteus-server-ts/docs/modules/skill_improvement.md)**: Backend Skill Improvement workflow, shared work-trace package consumption, improver lifecycle, skill-root edit, and minimal provenance contract.
- **[Agent Management](./agent_management.md)**: Skills are attached to agents to provide capabilities.
- **[File Explorer](./file_explorer.md)**: Skills use the generic, workspace-agnostic File Explorer.
