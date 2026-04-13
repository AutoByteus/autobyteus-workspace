# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Small`
- Triage Rationale:
  - The behavior gap is localized to the artifact content pane.
  - The existing file explorer and browser panes already implement the desired maximize pattern.
  - The expected change is UI wiring plus targeted tests, not a cross-subsystem architecture rewrite.
- Investigation Goal:
  - Identify why the artifact viewer lacks maximize behavior and define the smallest change that matches the file explorer experience without coupling unrelated tab state.
- Primary Questions To Resolve:
  - Where does the file explorer maximize control live and how is it implemented?
  - Is the artifact viewer missing only the button, or also the full-view teleport container and escape/restore handling?
  - Can artifact maximize safely reuse existing state, or does it require dedicated display-mode state?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-10 | Command | `git fetch origin personal && git rev-parse origin/personal && git rev-parse HEAD` | Verify clean bootstrap base | Ticket worktree is on the latest `origin/personal` commit `00ec506665123a5a9ac00b15506d7e0dfe3d3ffc` | No |
| 2026-04-10 | Code | `autobyteus-web/components/fileExplorer/FileExplorerTabs.vue` | Inspect existing maximize UX | File explorer uses a `Teleport` overlay plus a header maximize button wired to `useFileContentDisplayModeStore()` and exits on `Escape` | No |
| 2026-04-10 | Code | `autobyteus-web/stores/fileContentDisplayMode.ts` | Find state ownership for file viewer maximize | File viewer maximize state is a dedicated Pinia store, not component-local state | No |
| 2026-04-10 | Code | `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | Inspect artifact viewer behavior | Artifact viewer has edit/preview controls and state-specific content rendering, but no maximize button, no teleport wrapper, and no escape handling | No |
| 2026-04-10 | Code | `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | Confirm artifact pane composition | Artifacts tab is a split pane with list left and viewer right; maximize belongs inside the right-side viewer, not the parent split pane | No |
| 2026-04-10 | Code | `autobyteus-web/components/layout/RightSideTabs.vue` | Understand tab mounting behavior | Only the active right-side tab is mounted via `v-if`, so tab-local maximize state should not leak across panes | No |
| 2026-04-10 | Code | `autobyteus-web/components/workspace/tools/BrowserPanel.vue` and `autobyteus-web/stores/browserDisplayMode.ts` | Check precedent for non-file maximize behavior | Browser panel uses its own dedicated display-mode store and exits zen mode on unmount, which is a safer pattern than sharing file viewer state | No |
| 2026-04-10 | Code | `autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts` and `autobyteus-web/components/workspace/agent/__tests__/ArtifactsTab.spec.ts` | Identify validation surface | Artifact viewer already has focused rendering tests and is the right place to add maximize assertions; tab tests do not need structural change for this feature | No |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - `autobyteus-web/components/layout/RightSideTabs.vue`
  - `autobyteus-web/components/workspace/agent/ArtifactsTab.vue`
  - `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue`
- Execution boundaries:
  - Right-side tab selection controls whether `ArtifactsTab` mounts.
  - `ArtifactsTab` owns split-pane selection and resize behavior.
  - `ArtifactContentViewer` owns artifact header controls and rendered content state.
- Owning subsystems / capability areas:
  - Workspace right-side panel layout
  - Artifact viewer UI
  - Viewer display-mode state
- Optional modules involved:
  - None needed for this scope.
- Folder / file placement observations:
  - The maximize behavior should stay in the artifact viewer concern.
  - Display-mode state fits the existing `stores/` pattern used by Files and Browser.

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/fileExplorer/FileExplorerTabs.vue` | `toggleZenMode`, `<Teleport>` block | File content viewer tabs and maximize UX | Implements the target UX pattern to mirror | Artifact viewer should mirror the interaction, not duplicate a different control model |
| `autobyteus-web/stores/fileContentDisplayMode.ts` | `useFileContentDisplayModeStore` | File viewer maximize state | Scoped specifically to file content viewer | Artifact viewer should not reuse this store directly |
| `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | Header buttons and content states | Artifact viewer rendering | Missing maximize button, maximize wrapper, and escape handling | Primary implementation file |
| `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | Split-pane layout | List/viewer composition | No maximize logic here today | Likely unchanged |
| `autobyteus-web/components/workspace/tools/BrowserPanel.vue` | `toggleZenMode`, `onBeforeUnmount` | Browser maximize UX | Demonstrates dedicated display-mode store plus cleanup on unmount | Good reference for artifact maximize state lifecycle |

### Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-10 | Probe | Static inspection of file explorer and artifact components | Artifact pane renders a standard in-panel viewer only | Missing maximize is a code gap, not a configuration flag |
| 2026-04-10 | Probe | Static inspection of right-side tab mounting | Tabs mount conditionally with `v-if` | Artifact maximize state can be safely cleaned on unmount to avoid stale overlays |

## External Code / Dependency Findings

- Upstream repo / package / sample examined:
  - None
- Version / tag / commit / release:
  - N/A
- Files, endpoints, or examples examined:
  - N/A
- Relevant behavior, contract, or constraint learned:
  - N/A
- Confidence and freshness:
  - High / current repository state on `2026-04-10`

## Reproduction / Environment Setup

- Required services, mocks, or emulators:
  - None for code investigation
- Required config, feature flags, or env vars:
  - None
- Required fixtures, seed data, or accounts:
  - None
- External repos, samples, or artifacts cloned/downloaded for investigation:
  - None
- Setup commands that materially affected the investigation:
  - `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/artifact-maximize-button -b codex/artifact-maximize-button origin/personal`
  - `git fetch origin personal`
- Cleanup notes for temporary investigation-only setup:
  - None yet

## Constraints

- Technical constraints:
  - Artifact viewer must preserve all existing state branches and mode toggles.
  - Maximize must not couple artifact viewer state to file viewer maximize state.
- Environment constraints:
  - Work must stay inside the dedicated ticket worktree because the original `personal` worktree is dirty.
- Third-party / API constraints:
  - None

## Unknowns / Open Questions

- Unknown:
  - Whether maximize titles should be localized or follow the existing hardcoded file/browser button pattern.
- Why it matters:
  - It affects translation file churn, but not the core UX behavior.
- Planned follow-up:
  - Prefer the existing local pattern with minimal scope unless tests or surrounding conventions require localization.

## Implications

### Requirements Implications

- The requirement should explicitly call out parity with the file explorer maximize interaction and restore flow.
- The requirement should explicitly forbid cross-tab display-state bleed.

### Design Implications

- Introduce a dedicated artifact display-mode store mirroring the browser/file display-mode pattern.
- Keep maximize rendering and controls inside `ArtifactContentViewer.vue`.

### Implementation / Placement Implications

- Primary source changes should stay limited to:
  - `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue`
  - `autobyteus-web/stores/artifactContentDisplayMode.ts`
  - `autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts`
- `ArtifactsTab.vue` should remain unchanged unless testing reveals a layout dependency.
