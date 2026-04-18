# Investigation Notes

Write this artifact to a canonical file path in the assigned task workspace before any handoff message.

## Investigation Status

- Bootstrap Status: Completed
- Current Status: Current-state investigation completed enough to support a design-ready requirements basis; design work pending user approval.
- Investigation Goal: Understand the current Application page, live-session shell, app surface sizing, and surrounding host layout well enough to design an immersive application mode refactor.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The change is frontend-only but touches multiple ownership boundaries: the live application shell, application surface sizing/launch presentation, and the surrounding host layout/sidebar behavior.
- Scope Summary: Refactor the launched Application-mode experience so the bundled app feels like the primary full-window experience with only minimal host escape controls.
- Primary Questions To Resolve:
  - Which boundary should own immersive mode state and mode switching?
  - How should operational controls move out of the default above-the-fold application canvas?
  - How should the default layout/sidebar react while an immersive application session is active?
  - Which files currently constrain the app canvas height and host chrome composition?

## Request Context
- User is actively testing the Brief Studio application and reported that the current launched view still feels like the host application with an embedded app panel.
- User explicitly wants an immersive app mode where the application feels like it takes over the whole screen/window, with only a very minimal UI to exit that mode.
- User approved proceeding with refactoring after reviewing the proposed immersive-mode direction.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-immersive-mode-refactor`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-immersive-mode-refactor/tickets/in-progress/application-immersive-mode-refactor`
- Current Branch: `codex/application-immersive-mode-refactor` (rebased onto latest `origin/personal`)
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-immersive-mode-refactor`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin` completed without reported error before worktree creation; later refreshed again before rebase to newest `origin/personal`.
- Task Branch: `codex/application-immersive-mode-refactor`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Authoritative artifact work for this task must stay in the dedicated worktree above, not in the shared `personal` checkout.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-18 | Command | `pwd && cd /Users/normy/autobyteus_org/autobyteus-workspace-superrepo && git rev-parse --show-toplevel && git branch --show-current` | Confirm workspace and bootstrap starting point | Shared repo root is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; shared branch was `personal` | No |
| 2026-04-18 | Command | `cd /Users/normy/autobyteus_org/autobyteus-workspace-superrepo && git remote -v && git symbolic-ref refs/remotes/origin/HEAD && git branch -a --list 'origin/*' | sed -n '1,40p'` | Resolve base branch/default remote head | `origin/HEAD` points to `origin/personal` | No |
| 2026-04-18 | Command | `cd /Users/normy/autobyteus_org/autobyteus-workspace-superrepo && git fetch origin` | Refresh tracked remote refs before task branch creation | Fetch completed without reported error | No |
| 2026-04-18 | Command | `cd /Users/normy/autobyteus_org/autobyteus-workspace-superrepo && git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/application-immersive-mode-refactor -b codex/application-immersive-mode-refactor origin/personal` | Create dedicated task worktree/branch | Dedicated worktree/branch created successfully from `origin/personal` | No |
| 2026-04-18 | Doc | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/docs/applications.md` | Check intended Applications UX architecture | Docs already say Application mode should be app-first with minimal host chrome and near-full-screen canvas | Yes |
| 2026-04-18 | Code | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/components/applications/ApplicationShell.vue` | Inspect current live-session shell behavior | Current live-session template still renders a large host session card above `ApplicationSurface` | Yes |
| 2026-04-18 | Code | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/components/applications/ApplicationSurface.vue` | Inspect application canvas sizing | Current app surface uses `h-[calc(100vh-11rem)] min-h-[38rem]`, which constrains immersive feeling | Yes |
| 2026-04-18 | Code | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/layouts/default.vue` | Inspect surrounding host shell layout | Main layout always renders left panel or left sidebar strip next to main content | Yes |
| 2026-04-18 | Code | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/composables/useLeftPanel.ts` | Check current left-panel visibility control ownership | Left panel visibility is global composable state with toggle support; no immersive-mode integration exists | Yes |

| 2026-04-18 | Command | `cd /Users/normy/autobyteus_org/autobyteus-worktrees/application-immersive-mode-refactor && git stash push -u -m 'pre-rebase application-immersive-mode-refactor bootstrap artifacts' && git rebase origin/personal && git stash pop` | Rebase task branch after remote `origin/personal` advanced | Task branch rebased cleanly onto latest `origin/personal` and draft artifacts restored | No |
| 2026-04-18 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/application-immersive-mode-refactor/autobyteus-web/stores/applicationPageStore.ts` | Verify whether immersive state should live in page store | Store currently owns Application vs Execution mode and selected member only; local immersive presentation can stay in `ApplicationShell.vue` | Yes |
| 2026-04-18 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/application-immersive-mode-refactor/autobyteus-web/stores/appLayoutStore.ts` | Verify authoritative layout boundary candidate | Store is currently minimal but is the correct shared boundary for outer-shell presentation state | Yes |
| 2026-04-18 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/application-immersive-mode-refactor/autobyteus-web/components/applications/__tests__/ApplicationShell.spec.ts` | Check current live-session shell expectations | Existing tests already assert metadata hidden by default for live sessions; coverage will need to shift toward immersive default behavior | Yes |
| 2026-04-18 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/application-immersive-mode-refactor/autobyteus-web/layouts/__tests__/default.spec.ts` | Check layout test coverage style | Layout currently has source-level tests; immersive-shell branch assertions can extend the same test file | Yes |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `pages/applications/[id].vue` delegates to `ApplicationShell.vue` for the live application page.
- Current execution flow: Application page -> `ApplicationShell.vue` loads application/session state -> active session shows large host-managed live-session header -> Application tab renders `ApplicationSurface.vue` -> `ApplicationIframeHost.vue` hosts the app iframe.
- Ownership or boundary observations: `ApplicationShell.vue` currently owns both session-management chrome and the Application vs Execution mode switch. The surrounding `default.vue` layout independently owns the left navigation shell, and `ApplicationSurface.vue` owns iframe launch/bootstrap plus the current viewport height container.
- Current behavior summary: Even with a live session, the application is visually nested underneath substantial host chrome and next to the persistent left navigation shell, which weakens the “inside the app” feeling the user expects.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/applications/ApplicationShell.vue` | Application page-shell for loading, launch state, session controls, mode switching | Live session still renders large session card and top controls above the app surface | Likely authoritative owner for immersive live-session page composition |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | App iframe launch/bootstrap surface | Hard-coded viewport-height subtraction and framed container limit immersion | Owns app-surface sizing / overlay host presentation concerns |
| `autobyteus-web/components/applications/ApplicationIframeHost.vue` | Generic iframe bridge | Not yet inspected deeply for this task; likely unaffected by shell UX redesign | Probably should stay bridge-only, not absorb immersive shell concerns |
| `autobyteus-web/components/applications/execution/ApplicationExecutionWorkspace.vue` | Host-native execution/inspection view | Execution view intentionally separate from app-first Application mode per docs | Useful contrasting mode; likely unchanged except mode transition behavior |
| `autobyteus-web/layouts/default.vue` | Main app shell with left panel/strip and content slot | Always shows left shell variant while page content renders | Needs explicit immersive-shell integration point or route-aware behavior |
| `autobyteus-web/composables/useLeftPanel.ts` | Global left-panel visibility/width state | Current control model can hide panel but has no application immersive owner | Potential reuse point for shell collapse/hide behavior if design chooses it |
| `autobyteus-web/docs/applications.md` | Product/architecture documentation | Already states Application mode should be app-first with minimal host chrome | Current implementation appears drifted from documented target; docs can anchor refactor |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-18 | Repro | User-provided screenshots of Brief Studio live session page | Screenshots show large host header plus left shell competing with the app surface | Confirms user-facing mismatch between desired immersive mode and actual UI |

## External / Public Source Findings
- None needed so far; current task is internal UX refactor rooted in code and internal docs.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: User already has a working Brief Studio live session for manual repro.
- Required config, feature flags, env vars, or accounts: Applications feature enabled on the bound node; Brief Studio package installed.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation command above.
- Cleanup notes for temporary investigation-only setup: None yet.

## Findings From Code / Docs / Data / Logs
- The product docs already describe the intended state as “Application mode is app-first” with minimal host chrome and near-full-screen canvas.
- The current implementation still renders enough host UI to conflict with that intended experience.
- The default layout keeps the platform navigation visibly present even while an application session is active.

## Constraints / Dependencies / Compatibility Facts
- The current one-live-session-per-application backend model is already aligned with immersive mode; no backend session redesign is implied.
- Application vs Execution modes already exist and can be used as the primary separation between immersive app experience and host-native operational experience.
- The left panel is controlled in a shared composable outside the application subsystem, so any immersive-shell behavior must respect an authoritative boundary and avoid ad hoc layout bypasses.

## Open Unknowns / Risks
- Whether immersive mode should fully hide the shell, collapse to the narrow strip, or route through a dedicated layout state.
- Whether the active application route should auto-enter immersive mode every time or whether the minimal control should simply collapse/expand a non-default shell state.
- Whether any existing tests or assumptions depend on the current live-session card remaining visible.

## Notes For Architect Reviewer
- Current docs and current implementation appear misaligned; this refactor likely needs to restore the documented “app-first Application mode” rather than invent a brand-new product direction.
- Special attention is needed on the authoritative owner for immersive-shell state so the application page does not directly bypass layout internals.
