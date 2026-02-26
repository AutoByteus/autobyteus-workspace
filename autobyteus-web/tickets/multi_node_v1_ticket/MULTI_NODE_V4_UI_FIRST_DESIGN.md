# Multi-Node Frontend UI Design (UI-First, Iteration v4)

## Purpose
Define a frontend-first UX and information architecture for multi-node AutoByteus, based on the **current real UI structure** and the new requirement: users must be able to run and inspect work on multiple nodes without losing context.

This document focuses on UI/UX and frontend boundaries first. Runtime simulation and implementation sequencing should follow this approved UI model.

## Current UI Baseline (Observed)

### App Shell
- Global shell is in `/Users/normy/autobyteus_org/autobyteus-web/layouts/default.vue`:
  - left icon-only sidebar (`Sidebar.vue`),
  - main content area,
  - mobile header/menu.
- Primary route redirect is `/` -> `/agents` in `/Users/normy/autobyteus_org/autobyteus-web/pages/index.vue`.
- Top-level sidebar navigation is in `/Users/normy/autobyteus_org/autobyteus-web/components/Sidebar.vue`.

### Workspace UX
- Main daily-run screen is `/Users/normy/autobyteus_org/autobyteus-web/pages/workspace.vue`.
- Desktop layout is 3-zone (`LeftSidePanel` + center interaction + right tabs) in `/Users/normy/autobyteus_org/autobyteus-web/components/layout/WorkspaceDesktopLayout.vue`.
- Mobile layout uses tab-like panel switching in `/Users/normy/autobyteus_org/autobyteus-web/components/layout/WorkspaceMobileLayout.vue`.
- Running/config panel currently assumes a single selected context (`agent` or `team`) via `/Users/normy/autobyteus_org/autobyteus-web/stores/agentSelectionStore.ts`.

### Settings UX
- Settings sections are managed by `/Users/normy/autobyteus_org/autobyteus-web/pages/settings.vue`.
- Today it has API keys, token usage, conversation history, server settings, server status.
- No dedicated node management section yet.

### Electron UX Constraints Today
- Current Electron main process creates one main window and blocks `window.open` (`setWindowOpenHandler`) in `/Users/normy/autobyteus_org/autobyteus-web/electron/main.ts`.
- Practical meaning: multi-window is possible in Electron generally, but current app behavior is intentionally single-window.

## Problem To Solve
If frontend remains “single active node globally,” switching nodes disrupts user context and prevents practical concurrent multi-node operation.

User expectation:
- Add Node A and Node B.
- Run work on A.
- Switch/view B.
- Return to A and continue without losing A context.

## UX Principles
1. Preserve current UI familiarity when users do not use remote nodes.
2. Introduce node context as a first-class visible concept.
3. Keep node provenance visible (which node this run/data belongs to).
4. Avoid forced modal setup; keep entry smooth.
5. Mobile and desktop must both support node context selection.

## Proposed Information Architecture

### New UI Concept: Node Context
A **node context** is a UI scope containing node-specific data/state (agents, teams, runs, workspaces, prompts, streams).

- One context is active for viewing.
- Multiple contexts can stay alive in memory concurrently.
- User can switch visible context without destroying others.

### Navigation Changes (Minimal Surface Disruption)
- Keep existing left sidebar icons and page routes.
- Add a **global Node Context Bar** above page content (desktop) and in mobile header drawer.
- Add **Nodes** section in Settings for CRUD/health management.

## Entry Flow Design

### Case A: No User-Added Nodes (Embedded-Only)
Goal: keep current UX almost unchanged.

- App opens as today.
- Node Context Bar is collapsed/minimal (or hidden).
- Embedded node acts as default context.
- CTA available: “Add Node” (non-blocking).

### Case B: First Remote Node Added
- Node Context Bar becomes visible.
- User can switch between `Embedded Local` and remote node contexts.
- Last-used context is restored at startup.

### Case C: Multiple Nodes in Use
- Node Context Bar shows open node contexts as tabs/chips.
- Switching changes visible context only; background contexts are retained.
- Running activity badges per node show unseen updates.

## Text-Based UI Wireframes

### Desktop Shell
```text
+----------------------------------------------------------------------------------+
| Sidebar | Node Context Bar: [Embedded] [Node A*] [Node B] [+ Add Node] [Manage] |
| Icons   |-----------------------------------------------------------------------|
|         | Page Content (Agents / Workspace / Tools / Settings)                  |
|         | Node badge shown in page headers and run cards                         |
+----------------------------------------------------------------------------------+
```

### Workspace (Desktop)
```text
+----------------------+------------------------------+---------------------------+
| Left Panel           | Main Interaction             | Right Tabs                |
| Node: Node A         | Header: Agent X (Node A)    | Files / Terminal / ...   |
| Running Agents/Teams | Conversation + Input         |                           |
| (node-scoped list)   |                              |                           |
+----------------------+------------------------------+---------------------------+
```

### Mobile
```text
+------------------------------------------------------+
| AutoByteus | Node: Node A v | Menu                   |
+------------------------------------------------------+
| Node contexts (drawer/sheet): Embedded / Node A / B  |
| Current mobile panel tabs remain (Running/Files/Main)|
+------------------------------------------------------+
```

## User Journeys

### Journey 1: Existing Embedded-Only User
1. Opens app.
2. Works as before (no forced migration).
3. Optional discovery CTA for multi-node.

### Journey 2: Add and Use First Remote Node
1. Go to Settings -> Nodes.
2. Add node (`name`, `baseUrl`, type=`remote`), validate health.
3. Select node context from Node Context Bar.
4. Continue using existing pages with the same interaction model.

### Journey 3: Concurrent Multi-Node Work
1. Start run on Node A in Workspace.
2. Switch to Node B context and start another run.
3. Return to Node A context; existing run state is still present.
4. Use node activity badge to identify which context has updates.

## Frontend Responsibility and Naming Design

### New/Changed UI Components
- `/Users/normy/autobyteus_org/autobyteus-web/components/nodes/NodeContextBar.vue`
  - Global node context switch, open contexts, badges.
- `/Users/normy/autobyteus_org/autobyteus-web/components/nodes/NodeContextChip.vue`
  - Displays node name/type/status/activity.
- `/Users/normy/autobyteus_org/autobyteus-web/components/nodes/NodeSwitcherMenu.vue`
  - Quick select/open/close node context actions.
- `/Users/normy/autobyteus_org/autobyteus-web/components/settings/NodeManager.vue`
  - Node CRUD/health/metadata.

### Store Layer Design (Node-Scoped)
- `/Users/normy/autobyteus_org/autobyteus-web/stores/nodeStore.ts`
  - Node registry, node metadata, health status.
- `/Users/normy/autobyteus_org/autobyteus-web/stores/nodeContextStore.ts` (new)
  - Open/active node contexts, badges, last-used context.
- `/Users/normy/autobyteus_org/autobyteus-web/stores/agentSelectionStore.ts` -> `nodeScopedSelectionStore.ts` (rename recommended)
  - Reason: current name hides critical scope; must support per-node selection state.
- `/Users/normy/autobyteus_org/autobyteus-web/stores/serverStore.ts` -> `embeddedServerStore.ts` (rename recommended)
  - Reason: distinguish embedded process lifecycle from general node runtime.

### Why Naming Changes Matter
These renames prevent ambiguity in future code reviews: “server” means embedded process; “node context” means remote/embedded frontend routing scope.

## UX Rules by Node Type
- `embedded`:
  - Supports native folder picker and local-file conveniences.
  - Shows embedded runtime controls/status.
- `remote`:
  - Manual path input only.
  - No local-file direct path fallback.

## Electron Multi-Window Policy
- Phase 1 (default): single window + multi-context tabs/chips.
- Phase 2 (optional): allow “Open Node In New Window” if needed.
  - Requires updating `/Users/normy/autobyteus_org/autobyteus-web/electron/main.ts` window policy and context handoff model.

## Rollout Strategy (UI-First)
1. Add Settings -> Nodes UI.
2. Add global Node Context Bar in shell.
3. Make pages node-context aware (header badges + scoped content).
4. Add activity badges and context persistence.
5. Optional multi-window follow-up.

## UX Acceptance Criteria
1. Embedded-only users can continue without learning a new flow.
2. User can add/select nodes without leaving current navigation model.
3. User can switch between node contexts and preserve ongoing runs per node.
4. Node provenance is visible in key places (headers, cards, panels).
5. Mobile supports node switching with equivalent capability.

## Open Decisions (UI)
1. Should Node Context Bar always show, or show only after first user-added node?
   - Default: hide/collapse until first user-added node to preserve current feel.
2. Should per-node contexts be closable tabs or persistent fixed chips?
   - Default: persistent chips for v1 UI stability; closable tabs can come later.
