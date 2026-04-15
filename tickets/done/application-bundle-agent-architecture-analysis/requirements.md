# Requirements Doc

Write this artifact to a canonical file path in the assigned task workspace before any handoff message.

## Status (`Draft`/`Design-ready`/`Refined`)
Design-ready

## Goal / Problem Statement
Produce an independent architecture analysis and design basis for the AutoByteus application-bundle platform, grounded in the current repository implementation and aligned with the article _Rethinking Application Architecture In The Agent Era_.

The goal is not to rubber-stamp the junior engineer's requirements. The goal is to determine what the platform already implements, what is still missing, and what the correct target architecture should be for agent-native imported applications.

Follow-on refinement after the platform implementation: the ticket now also needs to define one simple but realistic sample full-stack application and a cleaner canonical repo-local application layout so app packages are treated uniformly whether they are repo-shipped or later imported by users.

## Investigation Findings
- The current repository already implements a meaningful portion of the article's model:
  - application bundle discovery and validation,
  - application-owned embedded agents/teams,
  - backend-owned application sessions,
  - runtime-to-application publication promotion through `publish_application_event`,
  - retained application/member projections,
  - application capability gating,
  - layered frontend shell with `Application` and `Execution` modes.
- The current implementation is therefore beyond a naive iframe/plugin system.
- However, the platform is still incomplete relative to the article's target:
  - there is no real app-author-facing frontend SDK package,
  - there is no imported application backend logic runtime,
  - there is no app-scoped persistence/runtime contract for imported backend logic,
  - application-session state is still in-memory rather than durable,
  - layered UI rendering stops short of a full per-agent artifact/log inspection model inside Applications.
- The junior requirements mix three different things that should be separated:
  1. current-state analysis requirements,
  2. target-state product requirements,
  3. exact v1 design decisions.
- Several items in the junior requirements are really design-spec content rather than requirements-basis content.
- The article makes clear that a frontend SDK alone is not the architecture. The correct top-level decomposition is:
  1. application logic,
  2. application agent runtime,
  3. layered UI rendering,
  plus a delivery/promotion boundary between runtime detail and application-visible state.
- The active implementation worktree now contains real platform code for:
  - `@autobyteus/application-sdk-contracts`,
  - `@autobyteus/application-frontend-sdk`,
  - `@autobyteus/application-backend-sdk`,
  - application engine/storage/gateway/session docs and services.
- The current import/registration UI and top-layer service/API are still agent-package-oriented even when application discovery benefits from the same registered roots. That is acceptable as a bootstrap implementation, but it is not the clean long-term ownership model.
- Live Electron launch evidence now shows a deeper host-side launch-spine weakness: `ApplicationIframeHost` currently mixes iframe identity, launch-descriptor derivation, ready timeout ownership, ready/bootstrap message handling, and session-store mutation, so normal reactive changes can destabilize bootstrap delivery.
- The current web launch boundary also mixes three different kinds of state that should be separated:
  - backend-owned session binding/runtime snapshot state,
  - host-owned iframe/bootstrap transport state,
  - host-owned visual loading/error state.
- Live user feedback after Brief Studio launch succeeds shows a second host-UX weakness: the Applications page is still too metadata-heavy above the fold, and the current page chrome foregrounds package id, local app id, runtime target id, writable/source state, and raw session/run metadata before the launched app UI itself.
- The current UX split between `Application` and `Execution` modes is therefore still incomplete: the host technically separates the iframe surface from retained execution artifacts, but page-level metadata/debug information is not yet intentionally placed.
- The current session model is single-live-session-per-application: relaunch replaces the previous live session instead of creating multiple concurrent launched versions. The UX must make that model explicit instead of implying a multi-launch surface that does not exist.
- The current built-in `socratic-math-teacher` sample remains useful as a lightweight bootstrap proof, but it is too shallow to serve as the main author-teaching example because it does not yet show:
  - a two-member team,
  - app-owned migrations/schema,
  - repositories/services,
  - query/command flows,
  - or realistic persisted domain projection from promoted runtime events.
- The current repo still splits sample-app paths between host-owned built-in roots and external example roots, but the cleaner target is one canonical repo-local `applications/` root where all app packages share the same architecture and differ only by provisioning/install path.
- That canonical repo-local `applications/<application-id>/` root must itself be a bundle-valid runnable application root, not only an authoring workspace, because discovery/validation operates on manifest-relative files in place.
- Any nested `dist/importable-package/applications/<application-id>/` roots should therefore be treated as packaging-only artifacts unless that path is explicitly provisioned/imported as its own package source.

## Recommendations
- Do not treat the junior engineer's requirements or design as authoritative.
- Reframe the ticket around the article's architecture model and the codebase's actual implemented state.
- Design from scratch, but reuse the real foundations that already exist in the repo.
- Treat the frontend SDK as only one subsystem in the larger platform, not as the main answer.
- Separate requirements from design:
  - requirements should lock target behavior and scope,
  - design should later define exact bundle contracts, storage identity, worker topology, and interface shapes.
- Treat the sample-app slice as an additive requirement on the original ticket, not as a separate platform redesign ticket.
- Use the implementation worktree as the active code context for the sample-app slice because the SDKs and platform surfaces now live there.
- Prefer a separate pedagogical sample app over overloading the existing shallow bootstrap sample, but place repo-local sample apps under one shared `applications/` root and treat built-in vs imported as a provisioning distinction rather than a different app architecture.
- Separate application-package management from agent-package management at the higher layers:
  - separate application-facing UI,
  - separate application package API surface,
  - separate application package service boundary.
- Reuse lower-level filesystem / source-acquisition plumbing only where the concern is truly mechanism-level rather than application-vs-agent business intent.
- Add one explicit host-side application launch surface owner so iframe identity, launch waiting/ready/failed state, bootstrap delivery, and retry/remount policy are governed in one place instead of being spread across `ApplicationSurface`, `ApplicationIframeHost`, and `ApplicationSessionStore`.
- Keep backend-owned session binding/runtime state separate from host launch/bootstrap transport state, and keep both separate from app-local first-query/loading state after bootstrap.
- Make the default Application View app-first: show the launched app UI itself as the primary surface, and intentionally demote platform/runtime metadata out of the default above-the-fold page chrome.
- Keep runtime/execution detail in the Execution surface, and move operational metadata into an explicit details/debug surface rather than mixing it into the main launched-app presentation.
- Make the current single-live-session model explicit in UX copy and actions: launching again replaces the current live session instead of creating parallel launched versions.
- Keep the first teaching sample focused on query/command + event-handlers + migrations + frontend SDK usage, rather than trying to teach every transport surface at once.

## Proposed Teaching Sample Direction
- Working sample concept: **Brief Studio** (name still adjustable)
- Delivery model: canonical runnable application package under repo-root `applications/brief-studio/`, with in-place `ui/` and `backend/` bundle payloads plus optional authoring helper folders that discovery ignores
- Why this concept:
  - simple enough to teach clearly,
  - naturally fits a two-member agent team,
  - naturally produces inspectable artifacts,
  - naturally benefits from app-owned persisted review state.
- Proposed two-member team:
  - `researcher` — produces research-note / source-summary artifacts
  - `writer` — produces the draft/final brief artifact
- Proposed app-owned backend responsibilities:
  - persist brief records, artifact records, review notes, and review status in `app.sqlite`
  - project promoted runtime events into domain tables through event handlers
  - expose app-owned queries for list/detail/history views
  - expose app-owned commands for actions such as approve/reject/add-review-note
  - optionally emit one notification when a final brief becomes ready for review
- Proposed app-owned frontend responsibilities:
  - use `@autobyteus/application-frontend-sdk`
  - list briefs
  - open one brief detail view
  - show current generated artifacts + review state
  - submit one or more app-owned review commands
- Important teaching boundary:
  - platform owns import/install, launch/session/runtime binding, storage provisioning, migrations, gateway, and host execution view
  - the application package owns UI, backend logic, schema, repositories, services, domain projections, and app-specific review workflow
- Canonical repo-local application rule:
  - a directory containing a valid `application.json` is an application root
  - all manifest-relative paths resolve from that root
  - repo-local sample/shipped apps should live under a shared repo-root `applications/` container rather than split built-in vs external roots
  - the repo-local `applications/<application-id>/` root itself must satisfy the bundle contract in place (`ui/`, `backend/`, and embedded runtime assets as required)
  - nested `dist/importable-package/**` roots are packaging artifacts only and are ignored by repo-local discovery unless explicitly imported/provisioned as a separate package source

## Scope Classification (`Small`/`Medium`/`Large`)
Large

## In-Scope Use Cases
- Evaluate the current application-bundle/application-session/application-view architecture against the article's model.
- Identify what already exists today for:
  - application logic,
  - application agent runtime integration,
  - layered UI rendering,
  - delivery/promotion boundaries.
- Define the correct target architecture boundaries for imported agent-native applications.
- Define whether the platform needs:
  - a frontend SDK,
  - a backend application runtime,
  - an app-scoped data/service boundary,
  - a more complete layered execution UI.
- Recommend a staged roadmap from current implementation to target architecture.
- Define the follow-on teaching sample slice that shows app authors how to use the implemented SDK/contracts and platform boundaries in one small full-stack app.

## Out of Scope
- Implementing the architecture in this ticket.
- Locking exact manifest/backend/worker/storage contracts before the requirements basis is confirmed.
- Treating speculative v1 details as already-approved requirements.
- Demonstrating every backend exposure style in the first teaching sample.

## Functional Requirements
- `REQ-001`: The analysis shall describe the current AutoByteus application platform in terms of the article's architecture model: application logic, application agent runtime, layered UI rendering, and delivery/promotion boundary.
- `REQ-002`: The analysis shall identify which of those architecture parts are already implemented, partially implemented, missing, or misplaced in the current repository.
- `REQ-003`: The requirements basis shall distinguish current-state facts from future-state target behavior.
- `REQ-004`: The requirements basis shall define the target architecture scope for imported applications without collapsing the problem into only a frontend SDK.
- `REQ-005`: The requirements basis shall evaluate whether imported applications need a platform-owned backend application runtime in addition to the existing bundle UI and agent-runtime integration.
- `REQ-006`: The requirements basis shall evaluate whether imported applications need an app-scoped persistence/data-service boundary instead of direct access to AutoByteus internal repositories or schema.
- `REQ-007`: The requirements basis shall define the required layered UI outcomes, including at minimum application view and execution view, and shall assess whether deeper agent artifact/log layers belong in-scope for the target platform.
- `REQ-008`: The requirements basis shall preserve and reuse existing implemented foundations where they already match the article's architecture.
- `REQ-009`: The requirements basis shall recommend a staged roadmap from the current platform to the target agent-native application platform.
- `REQ-010`: The ticket shall also define one pedagogical sample application slice that teaches app authors how to build on the implemented platform.
- `REQ-011`: The teaching sample shall include a two-member application-owned team with distinct roles and distinct produced artifacts.
- `REQ-012`: The teaching sample shall include app-owned backend logic using `@autobyteus/application-backend-sdk`, including readable model/repository/service/event-handler structure.
- `REQ-013`: The teaching sample shall include at least one app-owned SQL migration and persisted domain schema in `app.sqlite`.
- `REQ-014`: The teaching sample shall demonstrate one runtime-publication-to-domain-state flow and one frontend-action-to-command flow.
- `REQ-015`: The teaching sample shall explicitly teach idempotent event handling using stable `eventId` under at-least-once dispatch semantics.
- `REQ-016`: The teaching sample frontend shall use `@autobyteus/application-frontend-sdk` for app-backend interaction and shall expose a small but real app-specific UI.
- `REQ-017`: The teaching sample documentation shall map platform-owned concerns vs app-owned concerns honestly and must not imply that the iframe app owns launch/session boundaries that are still host-owned.
- `REQ-018`: The teaching sample shall define one explicit app-owned correlation identity that maps related runtime publications into the same logical domain row.
- `REQ-019`: The teaching sample shall teach one explicit app-owned owner for atomic event dedupe plus domain projection, so app authors do not learn a racy check-then-write pattern under at-least-once delivery.
- `REQ-020`: The requirements/design shall define one canonical application-root rule: a directory containing a valid `application.json` is an application root and anchors all manifest-relative paths.
- `REQ-021`: The requirements/design shall define one shared repo-root `applications/` container for repo-local application packages instead of maintaining separate built-in-vs-external sample roots.
- `REQ-022`: The requirements/design shall treat repo-local shipped sample apps and later imported apps as the same bundle architecture, with provisioning/install path as the primary difference rather than different app types.
- `REQ-023`: The teaching sample shall include app-local documentation inside the app root itself so authors can learn from the package in place.
- `REQ-024`: The canonical repo-local `applications/<application-id>/` directory shall itself be a bundle-valid runnable application root with the required in-place `ui/`, `backend/`, and runtime-target assets referenced by its manifest.
- `REQ-025`: Nested `dist/importable-package/applications/<application-id>/` outputs, if retained, shall be defined as packaging-only artifacts and shall not participate in repo-local discovery unless explicitly provisioned/imported as separate package roots.
- `REQ-026`: The architecture shall separate application package management from agent package management at the higher layers, with application-specific UI/API/service boundaries for listing, importing, and removing application package sources.
- `REQ-027`: The architecture shall define one dedicated `ApplicationPackageService` as the authoritative application-package-management boundary above discovery/validation internals.
- `REQ-028`: Application import UX shall belong to an application-specific management surface rather than only the existing Agent Packages surface, even if lower-level source registration or acquisition logic is shared.
- `REQ-029`: The design shall explicitly state which lower-level concerns may be shared between agent-package and application-package management and shall reject a generic mixed-intent top-layer package service.
- `REQ-030`: The primary author-facing runtime publication contract shall be artifact-centric: runtime members publish artifacts, while the platform enriches those publications with producer/session/application provenance.
- `REQ-031`: The design shall make producer identity a platform-enriched provenance concern rather than forcing agents to encode member identity in the primary publication family name.
- `REQ-032`: The target v1 author-facing runtime publication model shall remove separate agent-published `memberArtifact`, `deliveryState`, and `progress` publication families in favor of one artifact publication contract plus platform-generated lifecycle events.
- `REQ-033`: Application package import/refresh validation shall fail when an application-owned agent definition inside the package is malformed or unreadable; the platform shall not silently skip that agent and defer the failure to application launch time.
- `REQ-034`: Embedded application-owned runtime validation shall cover application-owned agent definitions transitively, not only runtime-target existence and application-owned team wiring.
- `REQ-035`: The Brief Studio teaching sample shall use valid application-owned agent definition files and shall explicitly expose the `publish_artifact` tool in the artifact-producing agents' `toolNames` so the sample is launchable and coherent with its own instructions.
- `REQ-036`: The architecture shall define one authoritative host-side application launch surface boundary that owns iframe identity, launch waiting/ready/failed state, bootstrap delivery, and retry/remount policy after a live application session is resolved.
- `REQ-037`: The design shall define one stable application iframe launch descriptor and explicit remount invariants: once launch inputs are fixed for a launch instance, iframe identity shall remain stable until explicit retry/relaunch/termination or an actual launch-descriptor change.
- `REQ-038`: The architecture shall separate backend-owned session binding/runtime snapshot state from host-owned iframe/bootstrap transport state and from host-owned visual loading/error state; session snapshot types/stores shall not be the authoritative owner of bootstrap waiting/failed state.
- `REQ-039`: The iframe bootstrap contract shall define a host-generated `launchInstanceId` plus explicit Electron packaged-host (`file://`) origin-normalization and ready/bootstrap acceptance rules so stale or cross-generation messages cannot satisfy the current launch attempt.
- `REQ-040`: The design shall inventory the full application launch spine from screen activation through route binding, launch-descriptor resolution, iframe ready acceptance, bootstrap delivery, and first app-owned backend call, including timeout/failure paths and the boundary between host bootstrap completion and app-local initial loading.
- `REQ-041`: The host Applications page shall make `Application View` app-first by default: when a live session exists, the launched application UI shall dominate the default above-the-fold surface rather than package/runtime/session diagnostics.
- `REQ-042`: The design shall define an explicit metadata-placement policy for the host page: package id, local application id, runtime target id, writable/source state, raw session ids, run ids, and backend transport URLs shall be intentionally classified as either default user-facing, secondary details, or developer/debug-only information.
- `REQ-043`: The design shall define one clear UX owner for page-level application chrome and session presentation so the split between `Application View`, `Execution View`, and optional details/debug surfaces is governed explicitly rather than emerging ad hoc inside `ApplicationShell.vue`.
- `REQ-044`: The current single-live-session-per-application model shall be made explicit in the UX: relaunch replaces the current live session, the host shall not imply multiple concurrent launched versions, and raw `applicationSessionId` shall not be the primary default user-facing concept.
- `REQ-045`: The Brief Studio teaching sample and its host presentation guidance shall default to an end-user/app-first mental model and shall not foreground backend gateway URLs, raw ids, or similar platform/debug metadata in the primary sample UI.
- `REQ-046`: When a live application session exists, `Application View` shall use a near-full-screen, self-contained app layout: host chrome is limited to minimal navigation/title/status/actions, while the launched app canvas occupies the primary remaining surface.
- `REQ-047`: `Execution View` shall be explicitly artifact/member-focused rather than a duplicate of the full workspace monitor: it shall show members, the selected member's retained artifact-first view, and only lightweight runtime context needed for that inspection task.
- `REQ-048`: Deeper execution inspection from an application shall navigate into the existing main workspace/monitor rather than rebuilding the full execution-monitoring experience inside the application module.
- `REQ-049`: The design shall define one authoritative Applications-to-Workspace execution-deep-link contract that carries run/member identity and is consumed by one workspace-route selection boundary instead of ad hoc router/store mutations spread across application components.
- `REQ-050`: The application information architecture shall make the current one-live-session-per-application model explicit: the page is application-centric, not session-list-centric; `Launch` creates or replaces the one live session, `Stop` returns the page to a non-live state, and multi-session browsing/history is not implied in the current Application surface.

## Acceptance Criteria
- `AC-001`: The analysis explicitly maps the current codebase to the article's architecture model instead of discussing the system only in generic terms.
- `AC-002`: The analysis clearly states why a frontend SDK by itself is insufficient as the complete architecture answer.
- `AC-003`: The analysis identifies which existing subsystems are already reusable foundations.
- `AC-004`: The analysis distinguishes requirements-level decisions from exact design-spec decisions.
- `AC-005`: The user can review a concise independent requirements basis before full design work proceeds.
- `AC-006`: A developer can inspect the chosen teaching sample and identify the files responsible for manifest, team definition, migrations, repositories/services, event handlers, frontend SDK usage, and backend SDK registration.
- `AC-007`: The teaching sample shows one complete runtime-publication -> app event handler -> persisted app state -> frontend query story.
- `AC-008`: The teaching sample shows one complete frontend action -> app command -> persisted app state story.
- `AC-009`: The teaching sample demonstrates safe idempotent event handling against stable event ids.
- `AC-010`: The teaching sample makes the correlation key and the atomic projection/dedupe owner explicit enough that app authors can see how related researcher/writer publications land in one logical row safely.
- `AC-011`: A developer can inspect the canonical sample-app layout and determine which folder is the application root because `application.json` anchors the app package and its relative paths.
- `AC-012`: The requirements/design make clear that repo-local sample apps and imported apps share the same application-bundle architecture and differ primarily by provisioning/install path.
- `AC-013`: The canonical teaching sample contains app-local README guidance in the app root itself.
- `AC-014`: The canonical sample placement shows `applications/<application-id>/` as an in-place bundle-valid application root with the payload shape required by `application.json`.
- `AC-015`: The design explicitly states that nested `dist/importable-package/applications/<application-id>/` roots are packaging-only and are ignored by repo-local discovery unless explicitly provisioned/imported.
- `AC-016`: A reviewer can identify separate application-package-management UI/API/service boundaries without needing to route application import through `AgentPackageService` or `AgentPackagesManager`.
- `AC-017`: The design makes `ApplicationPackageService` the authoritative application-package-management boundary and keeps `ApplicationBundleService` focused on discovery/validation/catalog ownership.
- `AC-018`: The design explicitly distinguishes shared mechanism-level infrastructure from higher-layer business-intent boundaries for package management.
- `AC-019`: A reviewer can identify one primary author-facing runtime publication tool/contract centered on artifact publication rather than on multiple agent-facing family names such as member-artifact, delivery-state, and progress.
- `AC-020`: The design makes clear that producer/member identity is attached by the platform from runtime context and is available to app event handlers without requiring the agent to publish a member-specific family.
- `AC-021`: The sample-app event flow teaches application-domain projection from artifact publications plus producer provenance, without relying on separate member-artifact, delivery-state, or progress publication families to make the sample coherent.
- `AC-022`: A malformed application-owned `agent.md` or `agent-config.json` causes application package validation/import to fail before the app appears launchable in the catalog.
- `AC-023`: A reviewer can see that embedded application-owned runtime integrity validation includes application-owned agents as well as teams.
- `AC-024`: The Brief Studio sample clearly shows valid `agent.md` frontmatter-based agent definitions and explicit `publish_artifact` tool exposure for the researcher and writer agents.
- `AC-025`: A reviewer can identify one authoritative host-side launch owner responsible for iframe identity, bootstrap waiting/ready/failed state, and bootstrap delivery after session binding resolves.
- `AC-026`: The design explicitly lists the exact launch-descriptor inputs and the allowed iframe-remount triggers, and it clearly states which ordinary session/runtime updates must not recreate the iframe.
- `AC-027`: The design keeps host bootstrap state out of authoritative session snapshot state and explains where visual loading/error state lives instead.
- `AC-028`: The iframe contract shows `launchInstanceId` in launch hints plus ready/bootstrap envelopes and defines explicit packaged-host `file://` origin-normalization/matching rules.
- `AC-029`: A reviewer can trace the full application launch spine from screen activation to bootstrap delivery and can see that first app-owned backend queries belong to app-local loading after host bootstrap, not to the host launch handshake itself.
- `AC-030`: A reviewer can identify an explicit page-level owner that keeps the default launched-app surface app-first and prevents host metadata from dominating the page above the embedded app UI.
- `AC-031`: The design explicitly classifies package/source/runtime/session/backend-transport metadata into default-visible, secondary-details, and developer/debug-only tiers, with raw backend URLs excluded from the default Application View.
- `AC-032`: The design makes the difference between `Application View` and `Execution View` clear enough that runtime/member/execution details are discoverable without crowding out the primary launched-app experience.
- `AC-033`: The UX design clearly communicates the current single-live-session-per-application model and uses launch/relaunch terminology that matches replacement semantics rather than implying multiple concurrent launched versions.
- `AC-034`: The Brief Studio teaching sample guidance makes the sample app UI end-user/app-first by default and places platform/debug metadata behind an explicit details/debug affordance or outside the primary app UI entirely.
- `AC-035`: A reviewer can identify one live-session Application View layout that behaves like a self-contained app canvas with only minimal host chrome remaining visible around it.
- `AC-036`: The design makes `Execution View` clearly artifact/member-focused and explicitly rejects duplicating the full workspace monitor inside the Applications module.
- `AC-037`: A reviewer can identify an explicit Applications-to-Workspace execution-deep-link contract, including the carried run/member identity and the authoritative consumer boundary on the workspace side.
- `AC-038`: The design shows how existing workspace selection/opening logic is reused behind one route-selection boundary instead of having Application components mutate workspace selection stores directly.
- `AC-039`: The application information architecture and terminology make the one-live-session-per-application model clear enough that users are not led to expect multiple concurrent launched versions inside the Applications module.

## Constraints / Dependencies
- The analysis must be grounded in the current repository implementation.
- The article provided by the user is an authoritative framing input for the target architecture.
- The independent review must not rely on the junior engineer's requirements/design as authoritative input.
- The canonical ticket artifact folder is now `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/tickets/done/application-bundle-agent-architecture-analysis`.
- The active code context for the follow-on teaching sample slice is `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation`.
- The implementation worktree is now the authoritative ticket workspace for both the platform implementation and the teaching-sample refinement.
- Long-term architecture should not keep application import hidden behind agent-package naming or boundaries just because some underlying root-registration mechanics are reusable.

## Assumptions
- Imported applications are intended to become first-class agent-native applications hosted by AutoByteus rather than lightweight UI plugins.
- The current platform should evolve forward from the implemented bundle/session/publication foundations rather than restart as a greenfield system.
- The eventual platform likely requires both application-specific UI and application-specific backend logic boundaries.
- The best first teaching sample is likely a separate simple app package under a shared repo-root `applications/` container rather than a full replacement of the existing lightweight bootstrap sample.

## Risks / Open Questions
- The correct v1 boundary between "requirements" and "design details" must stay disciplined; otherwise the ticket will become prematurely over-specified.
- The target scope may be too large if it includes frontend SDK, backend runtime, persistence contract, and full layered execution UX in one implementation slice.
- It is still open whether v1 should include full custom backend logic hosting or only define its architecture direction.
- The sample name can still be adjusted later, but the confirmed teaching concept is the simple two-step artifact/review app direction (`researcher -> writer -> review`).
- Moving the repo-local sample-app paths to a canonical `applications/` root will require a clean follow-up path migration in docs and implementation artifacts.
- If the teaching sample tries to show every possible transport style, it will stop being a clear teaching example.
- If import validation does not fail fast on malformed application-owned agent definitions, users will experience confusing launch-time failures even when package import appeared to succeed.
- If the launch surface continues to mix session snapshots, iframe identity, and bootstrap error state in one reactive store path, Electron packaged launch failures will keep surfacing as fragile whack-a-mole bugs instead of one governable host-launch boundary.
- If the iframe contract keeps correlating only by `applicationSessionId`, retries or remounts for the same live session can race with stale ready/bootstrap messages because the current launch attempt has no explicit host-generated instance identity.
- If the host page keeps foregrounding package/runtime/session metadata above the iframe surface, Application View will continue to feel like a diagnostic shell instead of the delivered app experience the user actually came for.
- If the UX does not explicitly reflect the current single-live-session model, users will keep forming incorrect expectations about multiple concurrent launches and where those launched versions should appear.

## Requirement-To-Use-Case Coverage
- `REQ-001` -> article-aligned current-state framing
- `REQ-002` -> implemented-vs-missing gap analysis
- `REQ-003` -> fact-vs-target separation
- `REQ-004` -> broader platform scope beyond frontend SDK
- `REQ-005` -> backend runtime need evaluation
- `REQ-006` -> app-scoped data/service boundary evaluation
- `REQ-007` -> layered UI target evaluation
- `REQ-008` -> foundation reuse
- `REQ-009` -> staged roadmap
- `REQ-010` -> teaching sample inclusion
- `REQ-011` -> two-member team teaching
- `REQ-012` -> backend structure teaching
- `REQ-013` -> migration/schema teaching
- `REQ-014` -> end-to-end teaching flows
- `REQ-015` -> idempotency teaching
- `REQ-016` -> frontend SDK teaching
- `REQ-017` -> honest ownership-boundary teaching
- `REQ-018` -> correlation identity teaching
- `REQ-019` -> atomic projection ownership teaching
- `REQ-020` -> canonical application-root rule
- `REQ-021` -> unified repo-local app container
- `REQ-022` -> shared bundle architecture across repo-local and imported apps
- `REQ-023` -> app-local teaching documentation
- `REQ-024` -> in-place repo-local runnable root contract
- `REQ-025` -> packaging-only nested-root rule
- `REQ-026` -> higher-layer application-package boundary separation
- `REQ-027` -> authoritative ApplicationPackageService ownership
- `REQ-028` -> application-specific import UX boundary
- `REQ-029` -> shared plumbing vs mixed-intent service rejection
- `REQ-030` -> artifact-centric author-facing publication contract
- `REQ-031` -> platform-enriched provenance ownership
- `REQ-032` -> reject over-modeled delivery/progress-centered v1 contract
- `REQ-033` -> fail-fast validation for malformed application-owned agents
- `REQ-034` -> transitive embedded runtime integrity validation
- `REQ-035` -> launchable coherent sample agent definitions and tool exposure
- `REQ-036` -> authoritative host-side launch owner
- `REQ-037` -> stable launch descriptor and remount invariants
- `REQ-038` -> separation of session state, launch transport state, and visual state
- `REQ-039` -> explicit launch-instance and packaged-host handshake contract
- `REQ-040` -> full application launch spine inventory and host-vs-app loading boundary
- `REQ-041` -> app-first default Application View
- `REQ-042` -> explicit metadata placement policy
- `REQ-043` -> page-level Application/Execution/details UX ownership
- `REQ-044` -> explicit single-live-session UX semantics
- `REQ-045` -> end-user-first teaching sample presentation
- `REQ-046` -> immersive app-first Application View layout
- `REQ-047` -> artifact/member-focused Execution View scope
- `REQ-048` -> deeper execution inspection via workspace deep-linking
- `REQ-049` -> authoritative Applications-to-Workspace deep-link contract
- `REQ-050` -> explicit application-centric single-live-session information architecture

## Acceptance-Criteria-To-Scenario Intent
- `AC-001` -> article-grounded architecture analysis
- `AC-002` -> correct problem framing
- `AC-003` -> pragmatic reuse
- `AC-004` -> clean upstream artifact quality
- `AC-005` -> user confirmation before design lock
- `AC-006` -> source discoverability for app authors
- `AC-007` -> event-driven persistence story
- `AC-008` -> user-driven command story
- `AC-009` -> safe at-least-once handler pattern
- `AC-010` -> explicit safe projection ownership pattern
- `AC-011` -> manifest-anchored application-root discoverability
- `AC-012` -> provisioning-vs-architecture clarity
- `AC-013` -> app-local documentation discoverability
- `AC-014` -> in-place bundle-valid root clarity
- `AC-015` -> nested packaging-artifact discovery exclusion
- `AC-016` -> separate application-package management boundary discoverability
- `AC-017` -> ApplicationPackageService vs ApplicationBundleService ownership clarity
- `AC-018` -> high-layer separation / low-layer sharing clarity
- `AC-019` -> artifact-centric publication discoverability
- `AC-020` -> producer provenance ownership clarity
- `AC-021` -> sample-app simplification around artifact-driven projection
- `AC-022` -> fail-fast validation visibility for broken app-owned agents
- `AC-023` -> embedded-runtime validation completeness
- `AC-024` -> sample agent-definition/tool-exposure clarity
- `AC-025` -> single authoritative launch owner clarity
- `AC-026` -> stable remount trigger clarity
- `AC-027` -> session-vs-launch-state separation clarity
- `AC-028` -> launch-instance handshake and packaged-host origin clarity
- `AC-029` -> full launch-spine and host-vs-app loading clarity
- `AC-030` -> app-first page-shell ownership clarity
- `AC-031` -> intentional metadata placement clarity
- `AC-032` -> Application-vs-Execution split clarity
- `AC-033` -> single-live-session UX clarity
- `AC-034` -> end-user-first sample presentation clarity
- `AC-035` -> immersive Application View chrome clarity
- `AC-036` -> Execution View scope clarity
- `AC-037` -> execution deep-link contract clarity
- `AC-038` -> authoritative workspace route-selection reuse clarity
- `AC-039` -> application-centric single-live-session information architecture clarity

## Approval Status
User-confirmed direction on 2026-04-14: platform-hosted real apps with app-owned frontend/backend/schema/repos/services, platform-owned App Engine/worker hosting, platform-run migrations and per-app DB provisioning, runtime-event to app-logic bridge, and frontend/backend SDK boundaries.

User-confirmed follow-on refinement on 2026-04-14: fold one full-stack teaching sample into the original ticket scope, using the implementation worktree as the active code context and teaching app authors query/command + event-handler + migration + frontend SDK usage through a small two-member sample app.

User-confirmed design-impact refinement on 2026-04-15: repo-local sample/shipped apps should move under one canonical repo-root `applications/` container, built-in-vs-imported should not imply a different architecture, and a valid `application.json` should define the application root that anchors manifest-relative paths.

User-confirmed long-term architecture refinement on 2026-04-15: application package management should be separated from agent package management at the higher layers, using application-specific service/API/UI naming and ownership (for example `ApplicationPackageService`), while lower-level source-acquisition plumbing may still be shared where appropriate.

User-confirmed publication-model refinement on 2026-04-15: the target v1 agent/runtime publication contract should be `publish_artifact`-style and artifact-centric, with the platform enriching producer/member/session provenance automatically and without exposing separate author-facing `memberArtifact` / `deliveryState` / `progress` publication families.

User-confirmed application-surface refinement on 2026-04-15: launched applications should feel app-first and near full-screen, `Execution View` should stay member/artifact-focused, deeper execution monitoring should deep-link into the main workspace instead of being rebuilt inside Applications, and the current one-live-session-per-application model should be explicit in the UX.

Current recommended teaching concept: **Brief Studio** (`researcher -> writer -> review`), with scope intentionally narrowed to query/command + event-handlers + migrations + frontend SDK rather than teaching GraphQL/routes in the first sample.
