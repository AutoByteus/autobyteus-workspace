# Investigation Notes

## Investigation Status

- Bootstrap Status: Completed
- Current Status: Architecture review previously passed after the route-visit-scoped host-launch contract revision, but live local validation then surfaced a new `Design Impact`: the hosted Brief Studio homepage can still expose pre-bootstrap placeholder copy (`Waiting for the host bootstrap payload…`). The upstream package is being revised again to define an explicit post-click launch/bootstrap transition gate before the app homepage is revealed.
- Investigation Goal: Determine how the present launch-setup-first application flow is implemented, why it feels host-heavy, and how to restructure it so configuration happens before immersive entry without violating current application/runtime ownership or leaking host/bootstrap lifecycle state into the app homepage.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The request is focused on one UX flow in `autobyteus-web`, but it likely spans the application shell, launch setup panel, immersive presentation state, localization, docs, and tests.
- Scope Summary: Redesign Applications open/setup UX so setup is a prerequisite step, entering the app lands in immersive mode, and the post-click launch/bootstrap transition is visually gated before the application homepage appears.
- Primary Questions To Resolve:
  1. How does the current `ApplicationShell.vue` combine launch setup, pre-entry gating, and immersive app rendering?
  2. Which earlier immersive-mode ownership decisions still apply after the newer app-owned runtime refactor?
  3. What is the cleanest authoritative owner for setup-first vs immersive-in-app presentation state?
  4. Should already-valid saved setup still land on a setup screen first, or can it deep-link into immersive entry while preserving configurability?
  5. How should host launch/bootstrap progress and failure be gated so app business surfaces never show host-bootstrap placeholder content as normal homepage UI?

## Request Context

- User feedback: clicking `Open app` currently reveals the right-side launch configuration experience, which feels badly designed because the application resource configuration dominates the page instead of feeling like a prerequisite step before entry.
- The user explicitly referenced the earlier immersive-mode ticket as conceptually relevant even if its exact implementation is outdated.
- The requested target experience is: configure first, save, then enter the app directly into immersive mode.
- Additional clarification from the user: in immersive mode they expect a very small setup/control icon; clicking it should open a side menu/panel that pushes or narrows the application canvas and exposes setup/actions, then closing it should return to the full immersive app view.
- Further clarification from the user: that small panel should include menu items such as `Exit`; choosing `Configure/Setup` should render the configuration form inside the same panel; and the panel should be horizontally resizable so the user can widen it for direct configuration work.
- Further clarification from the user: panel items should feel immediate and nested — for example clicking `Details` should immediately reveal detail content below that menu item, and clicking another item should extend its own content inline in the same panel.
- Follow-on live-validation feedback from the user: after `Enter/Open application`, the in-app homepage can still render host lifecycle messaging like `Waiting for the host bootstrap payload…`; the desired lifecycle is `setup -> launch/bootstrap in progress -> app ready`, with loading/failure staying outside the normal homepage.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/tickets/in-progress/application-launch-setup-immersive-flow`
- Current Branch: `codex/application-launch-setup-immersive-flow`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin` completed without reported errors on 2026-04-22.
- Task Branch: `codex/application-launch-setup-immersive-flow`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Earlier archived ticket `tickets/done/application-immersive-mode-refactor/` is likely relevant background, but current design must be based on present code and newer launch-setup/app-owned runtime behavior.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-22 | Command | `pwd && git rev-parse --is-inside-work-tree && git branch --show-current && git status --short` | Bootstrap workspace/repo context | Repo root is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; current shared checkout was on `personal`; working tree was clean. | No |
| 2026-04-22 | Command | `git symbolic-ref --short refs/remotes/origin/HEAD && git remote -v` | Resolve bootstrap base branch | `origin/HEAD` points to `origin/personal`; remote is GitHub repo `AutoByteus/autobyteus-workspace`. | No |
| 2026-04-22 | Command | `git fetch origin` | Refresh tracked remote refs before creating dedicated worktree | Fetch completed with no reported errors. | No |
| 2026-04-22 | Setup | `git worktree add -b codex/application-launch-setup-immersive-flow /Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow origin/personal` | Create dedicated task worktree/branch | Dedicated worktree created successfully from `origin/personal`. | No |
| 2026-04-22 | Command | `find tickets -maxdepth 3 -iname '*immersive*' -o -type f | sed -n '/immersive/p'` | Locate prior immersive-related artifacts | Found archived `tickets/done/application-immersive-mode-refactor/` package. | Yes |
| 2026-04-22 | Command | `rg -n "Launch setup|Saved resource and launch defaults|Confirm launch setup before opening the app|Enter application|Refresh setup|The generic host now boots only the application backend and iframe" autobyteus-web --glob '!node_modules'` | Find current launch-setup flow files and strings | Current launch setup and pre-entry gate live in `ApplicationShell.vue`, `ApplicationLaunchSetupPanel.vue`, localization, tests, and docs. | Yes |
| 2026-04-22 | Command | `find autobyteus-web/components/applications autobyteus-web/pages autobyteus-web/stores -maxdepth 3 \( -name '*Application*.vue' -o -name '*application*Store.ts' -o -name '*applications*.ts' \) | sort` | Inventory current application-related files | Relevant files include `ApplicationCard.vue`, `ApplicationLaunchDefaultsFields.vue`, `ApplicationLaunchSetupPanel.vue`, `ApplicationShell.vue`, `ApplicationSurface.vue`, and application stores. | Yes |
| 2026-04-22 | Doc | `tickets/done/application-immersive-mode-refactor/requirements.md`, `tickets/done/application-immersive-mode-refactor/design-spec.md` | Reuse valid immersive-mode concepts and identify drift | Prior ticket established app-first immersive ownership with `ApplicationShell.vue` as page owner and layout suppression through `appLayoutStore`. Need verify how current code diverged after launch-setup changes. | Yes |
| 2026-04-22 | Code | `autobyteus-web/components/applications/ApplicationShell.vue` | Inspect the authoritative current route owner and entry flow | Current shell stacks banner, metadata, setup panel, pre-entry gate, and `ApplicationSurface` in one page; it uses `applicationHostStore`, not `appLayoutStore`, and has no immersive post-entry state. | No |
| 2026-04-22 | Code | `autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue` | Verify ownership of host-managed setup flow | Panel owns persisted slot configuration load/save/reset and emits gate state upward; it already has the correct authoritative setup boundary. | No |
| 2026-04-22 | Code | `autobyteus-web/components/applications/ApplicationSurface.vue` | Confirm iframe/bootstrap owner survives current flow | Surface still owns descriptor commit, ready/failed state, and bootstrap delivery; redesign should not pull that logic upward. | No |
| 2026-04-22 | Code | `autobyteus-web/stores/appLayoutStore.ts`, `autobyteus-web/layouts/default.vue` | Check whether immersive layout suppression infrastructure still exists | `hostShellPresentation === 'application_immersive'` still suppresses host shell in the default layout, but no current application route component uses that boundary. | No |
| 2026-04-22 | Doc | `autobyteus-web/docs/applications.md` | Compare current durable docs with user feedback | Docs describe save setup -> enter application -> iframe bootstrap -> app-owned run creation, but they do not describe immersive post-entry viewing. | No |
| 2026-04-22 | Repo | `git diff 552bba61..614825f3 -- autobyteus-web/components/applications/ApplicationShell.vue autobyteus-web/layouts/default.vue autobyteus-web/stores/appLayoutStore.ts autobyteus-web/docs/applications.md` | Identify how current flow diverged from earlier immersive design | The application-owned-runtime-orchestration merge removed the older immersive/session shell and replaced it with a standard-shell setup-first page while leaving the layout suppression boundary in place but unused. | No |
| 2026-04-22 | Doc | `tickets/done/application-owned-runtime-orchestration/design-spec.md`, `requirements.md`, `implementation-handoff.md` | Verify the intent behind the current pre-entry gate | That ticket intentionally introduced the pre-entry setup gate and explicitly allowed a simple first-cut UX that may show the form on every launch; current user feedback is asking for the next UX step beyond that first cut. | No |
| 2026-04-22 | Other | User clarification in this thread about earlier immersive interaction pattern | Refine the post-entry control-surface expectation | User wants a very small immersive setup/control icon that opens a secondary side menu/panel and pushes or narrows the app canvas temporarily. | No |
| 2026-04-22 | Other | User follow-up clarification in this thread about panel contents and resizing | Refine side-panel behavior requirements | User wants the side panel/menu to include actions such as `Exit`, show `Configure/Setup` inside the same panel, and support horizontal resizing for direct configuration. | No |
| 2026-04-22 | Other | User clarification in this thread about panel interaction feel | Refine menu/panel interaction model | User wants menu items like `Details` or `Configure` to expand content inline immediately below the clicked item inside the same panel, like a disclosure/accordion pattern. | No |
| 2026-04-22 | Doc | `tickets/in-progress/application-launch-setup-immersive-flow/design-review-report.md` | Capture architecture-review feedback and required redesign impact | Round-1 review failed on missing host-launch reuse/invalidation contract between `ApplicationShell.vue` and `applicationHostStore.ts`. | No |
| 2026-04-22 | Code | `autobyteus-web/stores/applicationHostStore.ts` | Verify whether current launch state already tracks setup compatibility | `startLaunch(applicationId)` accepts only `applicationId`, `ApplicationHostLaunchState` tracks readiness / launch identity only, and `clearLaunchState(applicationId)` is the explicit teardown hook. | No |
| 2026-04-23 | Doc | `tickets/in-progress/application-launch-setup-immersive-flow/implementation-handoff.md` | Understand the implemented flow and the live-validation gap reported after implementation | Implementation already split setup vs immersive, added the right-side control panel, and touched Brief Studio homepage copy, so the remaining issue is now specifically the post-click launch/bootstrap reveal behavior. | No |
| 2026-04-23 | Command | `rg -n "Waiting for the host bootstrap payload|bootstrap payload|host bootstrap" /Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow -S` | Locate the exact source of the leaked host/bootstrap placeholder text | Found `Waiting for the host bootstrap payload…` in `applications/brief-studio/frontend-src/index.html` and `brief-studio-runtime.js`; the same pattern also exists in other sample apps and in packaged outputs. | No |
| 2026-04-23 | Code | `autobyteus-web/components/applications/ApplicationShell.vue`, `ApplicationSurface.vue`, `ApplicationIframeHost.vue` | Inspect the implemented immersive flow and where launch/bootstrap visuals now live | `ApplicationShell.vue` now owns setup vs immersive route phases and shows host-launch loading before a `launchInstanceId` exists. `ApplicationSurface.vue` mounts the iframe once a descriptor exists and shows a semi-opaque non-bootstrapped overlay, so underlying app DOM can still exist before bootstrap completes. `ApplicationIframeHost.vue` still posts the existing bootstrap envelope without any later app-ready event. | No |
| 2026-04-23 | Code | `applications/brief-studio/frontend-src/index.html`, `applications/brief-studio/frontend-src/brief-studio-runtime.js` | Verify whether the sample app homepage itself still contains host-bootstrap waiting content | Brief Studio initializes its homepage `#status-banner` with `Waiting for the host bootstrap payload…` and keeps that in the normal business DOM until bootstrap arrives and `refresh()` updates the status text. | No |
| 2026-04-23 | Doc | `tickets/done/application-bundle-agent-architecture-analysis/design-spec.md` (section `DS-012`) | Reconfirm the reviewed host/bootstrap boundary so the UX fix does not drift into protocol redesign | Prior reviewed architecture explicitly says host bootstrap completion ends when the bootstrap envelope is delivered to the matching iframe launch instance; any first query/read-model load after that is app-local UI. This means the current UX issue should be solved by a reveal gate around the existing boundary, not by inventing a new protocol. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `autobyteus-web/components/applications/ApplicationCard.vue` launch affordance into `pages/applications/[id].vue` / `ApplicationShell.vue`.
- Current execution flow: `ApplicationCard` open action -> `/applications/:id` -> `ApplicationShell.vue` setup phase -> `ApplicationLaunchSetupPanel.vue` gate readiness -> `applicationHostStore.startLaunch(applicationId)` -> shell switches to immersive phase and shows host-launch loading until a `launchInstanceId` exists -> `ApplicationSurface.vue` mounts `ApplicationIframeHost.vue`, waits for the existing ready/bootstrap handshake, and overlays non-bootstrapped state until bootstrap succeeds or fails.
- Ownership or boundary observations: `ApplicationShell.vue` is the governing route owner and now correctly owns setup vs immersive route phases. `ApplicationLaunchSetupPanel.vue` still owns setup-form orchestration and emits gate readiness upward. `ApplicationSurface.vue` still owns iframe/bootstrap lifecycle. `appLayoutStore` plus `layouts/default.vue` again own immersive shell suppression.
- Current behavior summary: The major page-level immersive redesign is now in place, but there is still no explicit user-visible post-click launch/bootstrap transition gate between immersive entry and the business homepage. `ApplicationSurface.vue` mounts the iframe before bootstrap completes and uses a semi-opaque overlay, while Brief Studio still initializes its homepage DOM with host-bootstrap waiting text. As a result, host lifecycle messaging can leak into what should feel like the normal app homepage.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/applications/ApplicationShell.vue` | Main application route shell | Direct inspection shows it renders the app notice, app summary/details, `ApplicationLaunchSetupPanel`, and then either the pre-entry gate, loading/error state, or `ApplicationSurface` in one standard-shell page. | Governing owner for the new setup-vs-immersive route presentation split. |
| `autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue` | Launch-setup form container | Owns loading/saving/reset of persisted resource-slot configuration and emits authoritative gate readiness upward. | Should remain the authoritative setup boundary while being presented only in the pre-entry/setup phase and secondary revisit flows. |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | Embedded application surface | Still owns iframe launch descriptor commit, ready handshake, bootstrap delivery, retry, and failure overlay. | Must stay the iframe/bootstrap owner while the shell regains immersive presentation control around it. |
| `autobyteus-web/components/applications/ApplicationIframeHost.vue` | Iframe bridge boundary | Owns the one-time ready/bootstrap handshake and posts the existing bootstrap envelope, but it does not expose any later app-ready signal after bootstrap delivery. | The redesign should solve the visible leak around this existing contract boundary instead of expanding the iframe protocol in this ticket. |
| `applications/brief-studio/frontend-src/index.html` + `brief-studio-runtime.js` | Built-in sample app homepage + startup runtime | The business homepage DOM still contains a `status-banner` initialized to `Waiting for the host bootstrap payload…`, and runtime state starts with the same host-bootstrap waiting copy. | Hosted UX needs a reveal gate so this placeholder never appears as the normal immersive homepage during launch/bootstrap. |
| `autobyteus-web/docs/applications.md` | Durable Applications behavior doc | Describes the configure-then-enter flow but not an immersive post-entry shell; current docs stop at `Enter application -> iframe bootstrap`. | Docs will need extension so the post-entry experience is documented as immersive rather than host-heavy. |
| `tickets/done/application-immersive-mode-refactor/design-spec.md` | Prior immersive design rationale | Documents the still-valid boundary shape: `ApplicationShell` owns page presentation and `appLayoutStore` / `default.vue` own host-shell suppression. | Reuse the boundary concept while replacing the obsolete live-session/session-specific implementation. |
| `tickets/done/application-bundle-agent-architecture-analysis/design-spec.md` (`DS-012`) | Reviewed application-bootstrap boundary rationale | States that host bootstrap completes at bootstrap-envelope delivery and first app data load after that is app-local. | The fix should introduce a reveal/loading gate around that boundary, not redesign the protocol itself. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-22 | Repro | User-provided screenshots | The current page shows metadata, launch setup, and a “Confirm launch setup before opening the app” gate in one long host page; the enter button appears below the setup form. | Confirms the UX issue is real and not just conceptual. |
| 2026-04-23 | Trace | User-reported live local validation of Brief Studio plus code trace against `ApplicationSurface.vue` and `brief-studio-runtime.js` | After `Enter application`, the hosted app can still show `Waiting for the host bootstrap payload…` because the iframe business DOM exists before bootstrap completes and the built-in app initializes that waiting text in-page. | The revised design needs an explicit immersive launch/bootstrap transition gate that keeps host lifecycle UI outside the homepage until bootstrap succeeds. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None yet.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: This task appears repo-local so far.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None yet.
- Required config, feature flags, env vars, or accounts: None yet.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin`; `git worktree add -b codex/application-launch-setup-immersive-flow ... origin/personal`.
- Cleanup notes for temporary investigation-only setup: None yet.

## Findings From Code / Docs / Data / Logs

- `ApplicationShell.vue` is now a setup-first page owner, but it lost the earlier immersive post-entry state entirely; it never requests `application_immersive` from `appLayoutStore` and never changes host-shell presentation after entry.
- `ApplicationLaunchSetupPanel.vue` already owns the right setup boundary: persisted slot configuration, host-understood launch defaults, save/reset actions, and gate-state emission. The main UX problem is not setup ownership; it is that the shell never transitions out of a host-heavy page presentation after entry.
- `ApplicationSurface.vue` remains cleanly isolated as the iframe/bootstrap owner and should stay that way.
- `applicationHostStore.ts` is currently setup-agnostic: it owns backend-ready state plus `launchInstanceId`, not launch-setup compatibility. The revised design therefore resolves the review finding by defining host-launch lifetime through route-visit / reload / exit rules instead of inventing setup-compatibility state.
- `appLayoutStore.ts` and `layouts/default.vue` still contain the immersive host-shell suppression branch from the earlier immersive refactor, so the authoritative outer-layout boundary still exists and can be reused.
- The `application-owned-runtime-orchestration` package intentionally treated the pre-entry gate as a valid first cut, including showing it on every launch with saved values prefilled. The current user request is a follow-on UX refinement: keep setup-first, but make post-entry viewing immersive.
- The current docs still explain configure-then-enter but do not explain any immersive post-entry state, which means requirements and docs now need to explicitly add that second phase.
- The implemented route now correctly enters immersive mode immediately on click, but it still lacks a distinct user-visible post-click launch/bootstrap transition between immersive entry and homepage reveal.
- `ApplicationSurface.vue` currently mounts the iframe before bootstrap completes and shows a translucent non-bootstrapped overlay. That means the underlying iframe DOM can still exist during bootstrap, which is enough for pre-bootstrap placeholder copy to leak visually.
- Brief Studio still initializes its normal homepage DOM with host-bootstrap waiting text. Even if that text was acceptable for standalone debugging, it is not acceptable as the visible hosted immersive homepage during launch/bootstrap.
- Prior reviewed application-bootstrap architecture remains valid: bootstrap completion is still defined as successful delivery of the bootstrap envelope, and any later initial data load is app-local. Therefore the correct fix is a reveal/loading gate around the existing boundary, not a new iframe/backend handshake.

## Constraints / Dependencies / Compatibility Facts

- The host no longer creates runtime runs directly from the generic application shell; runs are now app-owned according to current banner copy.
- The current UI already has explicit save/setup gating, so the redesign must preserve the validation logic while improving structure.
- The revised design must preserve the existing iframe/bootstrap contract and boundary ownership; the UX fix should be implemented without redefining transport payloads or adding a new post-bootstrap protocol event.

## Open Unknowns / Risks

- The leading preferred shape for minimal in-app host controls is now clearer from the user: a very small setup/control icon that opens a side menu/panel and pushes or narrows the app canvas temporarily.
- That panel is expected to hold menu actions including `Exit`, render `Configure/Setup` directly inside the panel, allow horizontal resizing for more comfortable editing, and use an inline disclosure/accordion interaction where clicking a menu item expands its content directly below that item. Remaining design work is about the exact component/file boundary and resize/menu behavior details.
- Existing tests and localization still reflect the current mixed page or older removed immersive/session concepts, so implementation will need intentional cleanup rather than incremental patching.
- Because the built-in sample app currently contains visible pre-bootstrap standby copy, downstream implementation must be deliberate about whether the authoritative prevention mechanism lives entirely in `ApplicationSurface.vue`, includes touched sample-app cleanup, or both. The design needs to make that contract explicit so validation knows what to expect.

## Notes For Architect Reviewer

- Expect the final design to compare the previous immersive-mode ownership package against the current launch-setup/app-owned-runtime architecture and explicitly state which boundaries remain authoritative.
- The likely architectural through-line is: keep `ApplicationLaunchSetupPanel.vue` authoritative for setup, keep `ApplicationShell.vue` as the governing route owner, reuse `appLayoutStore` / `default.vue` for immersive shell suppression, and extend `ApplicationSurface.vue` with an explicit bootstrap reveal gate so host loading/failure remains outside the app homepage until bootstrap succeeds.
