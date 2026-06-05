# Skills Management - Frontend

This document describes the design and implementation of the **Skills Management** module in the autobyteus-web frontend.

## Overview

The Skills module allows users to:

- View available global skills and bundled package skills (file-based
  capabilities from configured skill directories and imported agent packages).
- View the content of skill files (scripts, docs) using the **generic File Explorer**.
- Create new skills.
- Edit skill files directly in the browser with **Monaco Editor**.
- Assign catalog skills to agents during agent creation.

Package-private agent skills and owning-team shared package skills are also
listed as normal rows on the Skills page when their package roots are available.
Opening them uses the same Skill Detail and File Explorer flow as other skills;
read/write behavior is determined by the underlying filesystem permissions.

## Module Structure

```
autobyteus-web/
├── pages/
│   └── skills.vue                      # Main skills management page
├── components/skills/
│   ├── SkillsList.vue                  # Skills listing with cards
│   ├── SkillCard.vue                   # Individual skill card
│   ├── SkillDetail.vue                 # Skill explorer & file viewer
│   ├── SkillWorkspaceLoader.vue        # [NEW] Transient workspace lifecycle manager
│   ├── SkillVersioningPanel.vue        # Versioning actions & status
│   └── SkillVersionCompareModal.vue    # Per-file version diff viewer
├── stores/
│   ├── skillStore.ts                   # Skills CRUD operations
│   └── workspace.ts                    # Workspace registration (incl. skill workspaces)
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
<SkillWorkspaceLoader :skillId="skill.name">
    <template #default="{ workspaceId }">
        <FileExplorer :workspaceId="workspaceId" />
        <FileContentViewer :workspaceId="workspaceId" />
    </template>
</SkillWorkspaceLoader>
```

**Lifecycle:**

1. `onMounted`: Calls `workspaceStore.registerSkillWorkspace(skillId)` → returns `skill_ws_{skillId}`
2. Provides `workspaceId` to child components via scoped slot
3. `onBeforeUnmount`: Calls `workspaceStore.unregisterSkillWorkspace(workspaceId)` → cleans up

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
  isVersioned: boolean;
  activeVersion?: string | null;
}
```

## State Management

### skillStore.ts

Manages skill metadata (NOT file operations - those are delegated to the FileExplorer):

| Action                 | Description                              |
| :--------------------- | :--------------------------------------- |
| `fetchAllSkills()`     | Load all skills from the server.         |
| `fetchSkill(name)`     | Load a specific skill by name.           |
| `createSkill(payload)` | Create a new skill directory + SKILL.md. |
| `deleteSkill(name)`    | Delete the entire skill directory.       |
| `fetchSkillVersions(name)` | Load skill versions for versioned skills. |
| `fetchSkillVersionDiff(name, from, to)` | Fetch unified diff between two versions. |
| `enableSkillVersioning(name)` | Initialize git versioning for a skill. |
| `activateSkillVersion(name, version)` | Activate a specific skill version. |

> **Note:** File operations (view, edit, save) are now handled by the generic `FileExplorerStore` via the skill's transient workspace.

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
`AgentDefinition`.

The backend treats `skillNames` as logical names at runtime. For package-authored
agents, runtime resolution is context-first: those names may resolve to
package-private layouts such as
`agents/<agent-id>/skills/<skill-name>/SKILL.md`, a colocated
`agents/<agent-id>/SKILL.md`, or an owning-team shared skill under
`agent-teams/<team-id>/skills/<skill-name>/SKILL.md` before falling back to the
global skill directories. The Skills page catalog also scans package roots so
users can browse and open those bundled skill files normally. Duplicate skill
names use first-seen catalog precedence, so package authors should choose unique
logical skill names.

## Skill Versioning (Frontend)

The Skill Detail view exposes versioning controls when the backend reports `isVersioned`:

- **Enable Versioning**: Creates the initial tag (e.g., `0.1.0`) for existing skills.
- **Activate Version**: Switches the checked-out version.
- **Compare Versions**: Opens a modal with a per-file diff viewer (no summary counts).

The compare modal uses `skillVersionDiff` to fetch a unified diff, parses it into file sections, and renders a focused diff view for the selected file.


## Self-Evolution And Skill Files

Manual self-evolution is a skill-first workflow. When the backend deems a run or
team agent-member eligible, the visible evolver helper may edit only the exact
configured skill root directories returned by backend eligibility. `SKILL.md`
is the primary guidance file, but supporting files inside the same listed root
may be changed when a reusable improvement needs them. Agent/team definitions,
MCP/tool config, source code, run memory, sibling skills, and files outside the
listed roots are out of MVP scope.

The frontend does not decide whether a skill is eligible for evolution.
Workspace history calls backend eligibility, which returns writable target
roots, primary `SKILL.md` paths, warnings, and reasons. The backend launches a
visible helper run with anonymized work-history evidence and records minimal
provenance; it does not compute changed paths or policy-violation metrics in
the MVP.

Git-backed skill packages remain the recommended testing and rollback mode for
this MVP. The feature is globally disabled by default and direct editing is
controlled by prompt/tool contract plus manual Git inspection/revert, not by a
separate proposal/apply UI or product audit service.

## Related Documentation

- **[Server Self-Evolution](../../autobyteus-server-ts/docs/modules/self_evolution.md)**: Backend capability, snapshot, skill-root edit, anonymized evidence, and minimal provenance contract.
- **[Agent Management](./agent_management.md)**: Skills are attached to agents to provide capabilities.
- **[File Explorer](./file_explorer.md)**: Skills use the generic, workspace-agnostic File Explorer.
