# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

The product already supports sharing/importing agents and agent teams through the package system, but it still does **not** support sharing/importing custom applications as first-class bundles with their own product-facing UI model.

Today, the application subsystem is still too narrow:

- backend application discovery is bundle-aware now, but the application page is still basically a launch shell around one iframe,
- application sessions are frontend-owned and bootstrap only the bundled UI; there is no authoritative backend-owned application session projection,
- there is no typed application-visible artifact/delivery event contract,
- the current runtime streams expose agent/team internals, but there is no clean promotion boundary from internal runtime activity to application/member-visible achieved state,
- there is no authoritative backend-owned active-session binding shape for reconnect/page-refresh on `/applications/[id]`,
- the current publication/projection concept is not yet family-tight enough to retain member artifact and progress simultaneously without ambiguity,
- there is no frontend SDK for bundled applications, so app authors would otherwise need to understand raw iframe messaging and internal platform runtime details.

The clarified target model is now larger than “importable custom applications.”

The target is a **bundle-driven application platform** where:

- one application folder is the installable bundle unit,
- one imported repository/package root may contain one or more such application bundle folders,
- each application bundle folder is identified by its own `application.json`,
- the application bundle contains the application UI,
- the supporting runtime agent team or single agent lives **inside that application bundle itself**,
- the Applications catalog is a first-class platform surface beside Agents and Agent Teams,
- opening an application lands in a dedicated **application page/UI**, not directly in the raw workspace runtime view,
- the application page can still collect input/context from the user,
- the application page has an **Application view** and an **Execution view**,
- the Application view renders the highest meaningful achieved application state,
- the Execution view shows supporting members and their artifact/status views before deeper runtime details,
- the current workspace/running view remains the deepest technical inspection surface,
- agents/team members publish typed application-visible artifact/delivery events through one standard platform tool contract,
- the backend records and projects those events into stable application/member state,
- the application UI reacts to those projected events and renders application-specific output,
- and app authors get a small frontend SDK instead of building directly on raw iframe/bootstrap/runtime internals.

## Investigation Findings

- The existing agent/team package import architecture is mature enough to reuse:
  - local path import,
  - public GitHub import,
  - app-managed install storage,
  - package registry metadata,
  - cache refresh.
- The Applications catalog and detail routes already exist in the frontend:
  - `autobyteus-web/components/AppLeftPanel.vue`,
  - `autobyteus-web/pages/applications/index.vue`,
  - `autobyteus-web/pages/applications/[id].vue`.
- The current application detail page is still thin:
  - it loads catalog metadata,
  - launches an agent/team runtime,
  - creates an in-memory frontend `ApplicationSession`,
  - and hosts only the bundled iframe UI.
- Current application sessions are frontend-generated and ephemeral:
  - `applicationSessionId` is currently created in the browser,
  - the backend does not own authoritative application-session state,
  - and there is no backend projection of application-visible/member-visible artifact state.
- Team-based application launch already has a useful runtime foundation:
  - global model selection,
  - per-member model overrides,
  - wrapping the existing team-run runtime.
- Agent and team runtime streaming infrastructure already exists and should be reused:
  - `AgentStreamingService`,
  - `TeamStreamingService`,
  - live artifact events/touched-file projection,
  - runtime WebSocket/event handling.
- The backend already has a live artifact event path for raw runtime artifacts, but not for application-visible promoted delivery state.
- The current built-in bundled application (`socratic-math-teacher`) is still only a placeholder bootstrap demo; it proves iframe contract wiring but not an event-driven application UX.
- The platform already natively supports standalone agent and team testing, so exposing embedded application-owned agents/teams in those same surfaces remains a good fit.
- User clarification on 2026-04-13 tightened the intended UI model:
  - Applications remain a first-class top-level module beside Agents and Agent Teams,
  - opening an app should enter that application’s own UI,
  - that UI should expose an Application view and an Execution view,
  - member views should be artifact/status-first before raw runtime details,
  - and the current workspace/running page should remain the deepest technical drill-down surface.
- User clarification on 2026-04-13 also introduced a new architectural requirement:
  - agents/members should publish typed artifact/delivery events,
  - the application UI should react to those events,
  - and a frontend SDK should hide raw bootstrap/runtime wiring from app authors.
- Architecture review round 4 added two authoritative tightening requirements:
  - reconnect/page-refresh on `/applications/[id]` needs one backend-owned active-session binding/lookup shape instead of frontend-only active-session lookup,
  - and the publication/projection contract must be family-tight so `MEMBER_ARTIFACT` and `PROGRESS` coexist deterministically without a free-form metadata escape hatch.
- Validation had already established one important topology constraint that still remains in force:
  - the packaged Electron shell runs from `file://`,
  - bundle assets are served from the bound backend over loopback HTTP,
  - so app asset URLs must stay backend-relative/host-resolved and the iframe contract cannot assume same-origin equality.

## Recommendations

- Keep the **application bundle folder** as the authoritative distribution unit for custom apps.
- Keep one imported repository/package root as a container that may expose one or more self-contained application bundle folders.
- Keep each application bundle folder self-contained:
  - application manifest,
  - application UI assets,
  - embedded supporting agent team or embedded supporting agent,
  - any child agents required by that embedded team.
- Keep embedded application-owned agents/teams visible and editable in the native Agents/Teams surfaces.
- Evolve the application detail route into a real **application shell** with:
  - Application view,
  - Execution view,
  - member navigation,
  - drill-down into the current runtime workspace.
- Introduce one standard **application publication tool contract** for agent/member-produced application-visible events.
- Keep the tool semantic state-oriented rather than UI-command-oriented:
  - publish artifact/delivery state,
  - do not let agents directly instruct UI layout.
- Make backend application session ownership authoritative:
  - the backend should own application-session identity,
  - active-session indexing and route-level binding/reattachment,
  - application-visible/member-visible projection state,
  - and validation/persistence of publication events.
- Keep frontend app UIs reactive to **projected state**, not raw transient tool-call strings.
- Tighten projected state by publication family:
  - member artifact retention is separate from member progress retention,
  - application delivery retention is separate from member retention,
  - and v1 does not allow free-form metadata to drive rendering behavior.
- Provide a frontend SDK that wraps:
  - bootstrap,
  - application/member state subscription,
  - runtime input APIs,
  - artifact resolution helpers,
  - and shared types.
- Keep the SDK above internal Pinia/context/store details.
- Add one small reference application bundle that demonstrates:
  - bundle import,
  - application session launch,
  - member artifact publication,
  - application delivery publication,
  - and SDK-driven rendering.

## Scope Classification (`Small`/`Medium`/`Large`)

Large

## In-Scope Use Cases

- `UC-001`: User imports one repository/package root from a local path or supported public GitHub repository, and all application bundles plus their embedded runtime definitions in that repository are installed together as one managed unit.
- `UC-002`: After import, bundled applications appear in the Applications catalog without rebuilding or repackaging the host app.
- `UC-003`: One imported repository/package root can contribute multiple application bundle folders, and each valid application bundle appears as a separate application in the Applications catalog.
- `UC-004`: A bundled application declares that it runs against one embedded agent team that lives inside the same application bundle.
- `UC-005`: A bundled application declares that it runs against one embedded agent that lives inside the same application bundle.
- `UC-006`: Team-based applications launch with shareable default model settings and allow runtime per-member overrides.
- `UC-007`: Single-agent applications launch with shareable default model settings and allow runtime override.
- `UC-008`: Imported application UI loads from bundle-provided runtime assets rather than a hardcoded compile-time component.
- `UC-009`: Bundled application runtime dependencies resolve from the same owning application bundle, even if similarly named or identically-id’d definitions exist elsewhere.
- `UC-010`: Removing an imported repository/package root removes its applications and embedded runtime definitions from discovery together.
- `UC-011`: Invalid application bundle folders fail import with clear validation errors when required UI assets or embedded runtime definitions are missing.
- `UC-012`: Embedded application-owned agent teams appear in the normal Agent Teams system surfaces so developers can inspect, launch, and edit them independently.
- `UC-013`: Embedded application-owned agents appear in the normal Agents system surfaces so developers can inspect, launch, and edit them independently.
- `UC-014`: Import or native editing of an embedded application-owned team rejects member references that point outside the same owning application bundle.
- `UC-015`: Imported application UI bootstraps through one versioned host-to-iframe contract, and the host fails initialization deterministically when the contract is not completed correctly.
- `UC-016`: A packaged Electron host window running from `file://` still loads bundled application icons and iframe entry HTML from the bound backend asset origin and completes the documented bootstrap contract successfully.
- `UC-017`: User opens the Applications catalog, clicks one application card, and lands in that application’s dedicated application page/UI.
- `UC-018`: The application page shows an Application view that renders the highest meaningful promoted delivery state, or a waiting/progress state if no final delivery artifact is ready yet.
- `UC-019`: The application page shows an Execution view where the user can inspect supporting members and open member artifact/status views without dropping immediately into raw runtime logs.
- `UC-020`: The user can drill from the application page or selected member view into the current full runtime/workspace inspection surface when deeper technical detail is needed.
- `UC-021`: A member publishes a typed artifact event and the application/member UI reacts by resolving and rendering that artifact.
- `UC-022`: A final/delivery-capable member publishes a typed delivery-state event and the application view reacts by switching from waiting/progress to the delivered renderer.
- `UC-023`: A bundled application author builds against a platform frontend SDK instead of raw iframe `postMessage` and internal frontend stores.
- `UC-024`: A small reference application bundle demonstrates the publication flow and is runnable by downstream validation.
- `UC-025`: User refreshes or reconnects while on `/applications/[id]`, and the application page reattaches to the current live application session through a backend-owned binding lookup rather than frontend memory.
- `UC-026`: A member publishes both a member artifact and progress updates for the same live application session, and the projected state retains both families simultaneously so native Execution and SDK consumers can render them together deterministically.

## Out of Scope

- `OOS-001`: Automatic build/compile of raw frontend source code during import.
- `OOS-002`: Private repository authentication beyond the currently supported public GitHub-style import path.
- `OOS-003`: Mixed runtime kinds across members of one team run.
- `OOS-004`: Full hard-refresh/session-restoration redesign for application runs beyond the scoped backend-owned application-session projection.
- `OOS-005`: General plugin execution beyond the imported application bundle model.
- `OOS-006`: Local dev-server mode for bundled applications; this can be a follow-up developer-experience slice after the SDK and bundle model land.

## Functional Requirements

- `REQ-001`: The product must support importable self-contained application bundles.
- `REQ-002`: Application bundle import must reuse the same managed distribution pattern already used for imported agent/team packages, including local-path import and supported public GitHub import.
- `REQ-003`: One imported repository/package root must be installable and removable as one managed unit and must not require the user to import supporting app-owned agent/team dependencies separately.
- `REQ-004`: One imported repository/package root may contain one or more application bundle folders, and each application bundle folder must be identified by an application manifest file inside that folder.
- `REQ-005`: An application bundle folder must contain the application UI and its supporting runtime definitions inside the application bundle itself.
- `REQ-006`: An application bundle must be able to embed either:
  - one supporting agent team, or
  - one supporting agent.
- `REQ-007`: If the embedded runtime target is an agent team, the bundle must also be able to carry the child agents required by that team inside the same application bundle.
- `REQ-008`: Application discovery must read from registered/imported application bundles and not only from the server app-root `applications/` directory.
- `REQ-009`: Imported applications must become discoverable in the Applications catalog after successful bundle import without requiring a new host build.
- `REQ-010`: Multiple application bundle folders from the same imported repository/package root must be registered as distinct application entries in the Applications catalog.
- `REQ-011`: Application runtime bindings must use stable bundle-local identity and must not depend on global `teamDefinitionName`-style lookup.
- `REQ-012`: Imported application UI must be loaded from bundle-provided runtime assets instead of compile-time hardcoded application component imports.
- `REQ-013`: Agent definition config must support shareable default launch configuration for distributable bundles, at minimum:
  - default model identifier,
  - default runtime kind,
  - optional model/runtime config payload.
- `REQ-014`: Team-based application launch must support both:
  - a default model selection for the application launch, and
  - per-member runtime model overrides.
- `REQ-015`: Single-agent application launch must support runtime override on top of the bound agent’s shareable default launch configuration.
- `REQ-016`: Launch-time model/config resolution must be deterministic, with runtime launch overrides taking precedence over distributable definition defaults.
- `REQ-017`: Bundle import and removal must update application discovery and agent/team discovery atomically so the catalog does not show stale application entries or stale embedded runtime definitions.
- `REQ-018`: Application catalog/list data must expose enough metadata to render imported applications and distinguish which owning bundle they came from.
- `REQ-019`: Existing built-in applications must continue to appear through the same application catalog during migration to the bundle-driven model.
- `REQ-020`: Application bundle import validation must fail when an application entry is missing required UI entry assets or references an embedded runtime target that does not exist inside the same owning application bundle.
- `REQ-021`: The first slice must support prebuilt static application UI assets and must not require host-side build tooling during import.
- `REQ-022`: Embedded application-owned agent teams must also appear in the normal Agent Teams system surfaces for independent testing.
- `REQ-023`: Embedded application-owned agents must also appear in the normal Agents system surfaces for independent testing.
- `REQ-024`: System surfaces that show embedded application-owned agents/teams must expose owning-application or owning-bundle provenance so users can distinguish them from standalone definitions.
- `REQ-025`: Independent native launch/testing of embedded application-owned agents/teams must not break application-local binding semantics; the application must still resolve its own embedded runtime targets from its owning bundle.
- `REQ-026`: Embedded application-owned agent teams shown in the normal Agent Teams system surfaces must be editable there using the same editing workflow expected for normal team definitions, with edits persisting back to the owning application bundle when the source is writable.
- `REQ-027`: Embedded application-owned agents shown in the normal Agents system surfaces must be editable there using the same editing workflow expected for normal agent definitions, with edits persisting back to the owning application bundle when the source is writable.
- `REQ-028`: Application bundle import validation must reject any embedded application-owned team whose member references target agents or teams outside the same owning application bundle.
- `REQ-029`: Backend persistence for embedded application-owned team updates must reject member references that target agents or teams outside the same owning application bundle, regardless of client-side filtering behavior.
- `REQ-030`: The host application and bundled iframe UI must communicate through one explicit versioned bootstrap contract that defines exact message names, payload schema, and trust/origin validation rules.
- `REQ-031`: If the bundled iframe UI does not complete the required bootstrap contract successfully, including timeout, unsupported contract version, invalid origin/source, or malformed payload cases, the host must fail initialization deterministically and surface an application initialization error instead of running partially bootstrapped UI.
- `REQ-032`: Application catalog asset references for bundled UI entry HTML and icons must be transport-neutral asset paths resolved by the host runtime against the current bound backend REST base, so the same application catalog works under both browser-hosted and packaged Electron `file://` shells.
- `REQ-033`: The iframe bootstrap contract must support packaged desktop topology where the host shell origin and bundled iframe asset origin differ; host validation must trust the resolved iframe origin plus current iframe window identity, and bundled UIs must receive enough serialized host-origin/session context to validate the bootstrap message deterministically.
- `REQ-034`: Applications must remain a first-class top-level product surface beside Agents and Agent Teams, with an Applications catalog page that lists discovered bundled applications.
- `REQ-035`: Opening one application from the catalog must land the user on that application’s dedicated application page/UI, not directly in the raw workspace runtime view.
- `REQ-036`: The application page must support a top-level Application view and Execution view for the current launched application session.
- `REQ-037`: The Application view must render the highest meaningful promoted application delivery state, or an application-oriented waiting/progress state when no final delivery artifact is ready yet.
- `REQ-038`: The Execution view must expose supporting members for the current application session and allow the user to select a member without immediately defaulting to the raw runtime log surface.
- `REQ-039`: For a selected member in the Execution view, the first-class member surface must support artifact/status-first rendering before full runtime detail inspection.
- `REQ-040`: The current workspace/running surface must remain available as the deepest technical inspection surface, and the application/member UI must provide a deterministic handoff to that runtime surface for the current session/run/member.
- `REQ-041`: The platform must provide one standard application publication tool contract for agent/member-produced application-visible events.
- `REQ-042`: The application publication contract must support at minimum typed publication families for:
  - member artifact publication,
  - top-level delivery-state publication,
  - optional progress/status updates.
- `REQ-043`: Publication payloads must be typed and versioned and must not be arbitrary free-form UI command objects.
- `REQ-044`: Publication payloads must include authoritative session binding plus producer provenance sufficient to identify the emitting member even inside nested teams.
- `REQ-045`: The backend must validate, persist, and project published application events into stable application-session state and member state; frontend applications must not depend on transient raw tool-call strings as the authoritative state source.
- `REQ-046`: Application-visible/member-visible artifact state must be addressable through stable artifact handles/references that the frontend can resolve through platform APIs.
- `REQ-047`: The application page and member views must react to projected application publication state and choose renderers by artifact/delivery type rather than by hardcoded member-name-specific UI commands.
- `REQ-048`: The platform must provide a frontend SDK for bundled applications and application authors.
- `REQ-049`: The SDK must own/bootstrap the iframe host contract and hide raw `postMessage` envelope handling from application authors.
- `REQ-050`: The SDK must expose typed access to:
  - application session metadata,
  - application-level projected state,
  - member-level projected state,
  - runtime input/send APIs,
  - artifact resolution helpers.
- `REQ-051`: The SDK must ship shared types for bootstrap/session payloads, publication events, artifact references, delivery-state projections, member artifact projections, and member progress projections.
- `REQ-052`: The SDK must wrap existing runtime APIs/streams instead of exposing internal platform stores, internal component structure, or undocumented raw transport details as the primary authoring interface.
- `REQ-053`: The scoped delivery must include one small reference application bundle that demonstrates the frontend SDK plus typed application publication/rendering flow.
- `REQ-054`: The reference application bundle must be importable/runnable through the normal Applications catalog and must exercise at least one member artifact renderer and one top-level application delivery renderer so downstream API/E2E validation has a concrete target.
- `REQ-055`: The backend application-session boundary must maintain the authoritative active-session index for live application sessions and expose a backend-owned binding lookup for `applicationId`-scoped page reattachment.
- `REQ-056`: Reconnect/page-refresh on `/applications/[id]` must resolve the live application session through the backend binding lookup shape, optionally using a route/query session hint, and must not depend on prior frontend in-memory active-session lookup.
- `REQ-057`: The publication contract v1 must be a family-specific discriminated union whose allowed and required fields are explicit for each supported family.
- `REQ-058`: The publication contract v1 must not include free-form `metadata`, generic renderer-driving maps, or equivalent escape hatches that bypass typed family-specific fields.
- `REQ-059`: Member projection state must retain `MEMBER_ARTIFACT` and `PROGRESS` in separate family-specific retained fields or keyed maps with deterministic coexistence and upsert/overwrite rules.
- `REQ-060`: Application-level delivery projection must use explicit delivery-family retention rules that are separate from member artifact/progress retention and must not overwrite member family state.

## Acceptance Criteria

- `AC-001`: Given a valid local or supported public GitHub repository/package root containing application bundles, importing it installs all valid applications and their embedded runtime definitions together as one managed unit.
- `AC-002`: Given a successful application bundle import, the Applications page lists the bundled application without requiring a rebuilt desktop/web app.
- `AC-003`: Given one imported repository/package root that contains multiple valid application bundle folders, each application appears as its own catalog entry.
- `AC-004`: Given an imported team-based application bundle, the application resolves its bound team from inside its own bundle even when another discovered team elsewhere has the same name or id.
- `AC-005`: Given an imported single-agent application bundle, the application resolves and launches the bound embedded agent successfully.
- `AC-006`: Given an imported application, opening the application uses bundle-served UI assets instead of a hardcoded built-in component path.
- `AC-007`: Given a bundled agent definition with default model/runtime launch config, the application launch UI prepopulates from those defaults.
- `AC-008`: Given a runtime launch override, the launched application run uses the override instead of the distributable default.
- `AC-009`: Given a team-based application launch, the UI allows a default launch model plus per-member model overrides.
- `AC-010`: Given a valid bundle import or removal, application discovery and embedded runtime discovery both refresh so catalog contents stay consistent.
- `AC-011`: Given an application bundle whose UI entry assets or embedded runtime target are missing, import fails with a clear validation error and does not register the bundle partially.
- `AC-012`: Given the migration, current built-in applications still appear in the application catalog.
- `AC-013`: Given the first-slice bundle format, importing an application bundle does not trigger a frontend build/compile step on the host machine.
- `AC-014`: Given an imported application bundle with an embedded team, that team appears in the normal Agent Teams system surfaces with owning-application/bundle provenance visible.
- `AC-015`: Given an imported application bundle with an embedded agent, that agent appears in the normal Agents system surfaces with owning-application/bundle provenance visible.
- `AC-016`: Given an embedded application-owned agent or team shown in the native system surfaces, the user can launch it independently for testing, and the parent application still binds to its own embedded runtime target correctly.
- `AC-017`: Given removal of an imported repository/package root, that package root’s application entries and embedded agent/team entries disappear from the native system surfaces together.
- `AC-018`: Given an embedded application-owned team in the native Agent Teams surface, the user can edit it there and the changes persist back to the owning application bundle when the source is writable.
- `AC-019`: Given an embedded application-owned agent in the native Agents surface, the user can edit it there and the changes persist back to the owning application bundle when the source is writable.
- `AC-020`: Given an imported application bundle whose embedded team references an agent or team outside its owning application bundle, import fails with a clear validation error and the package root is not registered partially.
- `AC-021`: Given an embedded application-owned team edited through the native Agent Teams surface, if the submitted member references point outside the same owning application bundle, the backend rejects the update with a clear validation error even if the client UI attempted to submit it.
- `AC-022`: Given a valid bundled iframe application, the iframe sends the required versioned ready event and receives the matching bootstrap payload defined by the host/iframe contract.
- `AC-023`: Given an iframe bootstrap timeout, unsupported contract version, invalid message origin/source, or malformed bootstrap message, the host does not mark the application UI ready and instead shows an initialization failure state.
- `AC-024`: Given a packaged Electron host shell running from `file://`, bundled application icon and entry asset paths resolve against the current bound backend REST base instead of becoming `file:///rest/...` paths.
- `AC-025`: Given the packaged Electron topology where the host origin is opaque/file-based and the bundled iframe origin is the backend asset origin, the documented ready/bootstrap contract still completes successfully for a valid application session.
- `AC-026`: Given discovered applications in the catalog, clicking one application card opens that application’s dedicated application page.
- `AC-027`: Given a launched application session whose top-level delivery artifact is not ready yet, the Application view shows an application-oriented waiting/progress state rather than defaulting to raw runtime logs.
- `AC-028`: Given a valid top-level delivery-state publication for the running application session, the Application view resolves the published artifact/reference and renders it with the appropriate renderer.
- `AC-029`: Given the Execution view for a launched application session, the user sees the supporting members for that session and can select one member without being forced immediately into the deepest runtime details.
- `AC-030`: Given a selected member with a published artifact/status, the member view renders that artifact/status first and only shows raw runtime details when the user explicitly drills deeper.
- `AC-031`: Given the user requests deeper inspection from the application/member UI, the product opens the current workspace/running inspection surface for the bound run/member deterministically.
- `AC-032`: Given a member or delivery-capable agent invokes the application publication tool with a valid payload, the backend validates/persists it and the projected application/member state is observable after reconnect or page refresh for that live application session.
- `AC-033`: Given a nested team member publishes an application-visible event, the projected state retains producer provenance sufficient for the frontend to attribute the artifact/status to the correct member/team path.
- `AC-034`: Given a bundled application built against the platform SDK, the UI can bootstrap, subscribe to application/member projected state, resolve published artifacts, and send runtime input without author-written raw iframe `postMessage` handling.
- `AC-035`: Given the delivered reference application bundle, downstream API/E2E validation can import it, launch it, observe at least one member artifact renderer, and observe one application-level delivery renderer driven by the publication contract.
- `AC-036`: Given a live application session and a page refresh or reconnect on `/applications/[id]`, the application shell reattaches to the live session through the backend-owned application-session binding lookup without relying on stale frontend memory.
- `AC-037`: Given an optional requested session id in the route/query, the backend binding lookup deterministically resolves either that live session for the same application, the current active live session for that application, or no session, and the shell updates to the resolved result.
- `AC-038`: Given a member publishes both `MEMBER_ARTIFACT` and `PROGRESS` for the same live application session, the projected member state retains both families simultaneously and they remain observable after reconnect or page refresh.
- `AC-039`: Given a publication payload includes fields not allowed for its declared family or attempts to include free-form metadata in v1, the backend rejects the publication with a clear validation error and does not mutate the projected state.

## Constraints / Dependencies

- Existing application discovery currently loads from `application-bundles` and already feeds the catalog.
- Existing imported package validation already knows about agents/teams and now also about application bundles.
- Existing frontend application rendering is now generic iframe-host-based, but the detail page is still only a thin launch shell.
- Existing agent/team discovery is already package-root aware and can be reused if bundle-local resolution is preserved for app-owned dependencies.
- Existing team runtime creation supports per-member model configuration but still enforces one runtime kind per team run.
- Existing single-agent runtime creation already exists separately and can be reused for single-agent applications.
- Existing runtime streaming infrastructure and live artifact projection exist and should be reused rather than replaced.
- Existing application sessions are frontend-only today, so application-visible/member-visible publication state will require a new authoritative backend owner and backend-owned active-session binding/reattachment shape.
- Existing global discovery order shadows duplicate ids by earlier roots, so provenance and bundle-local resolution rules must stay explicit.

## Assumptions

- `ASM-001`: Imported application UI can be shipped as prebuilt static assets within each application bundle folder.
- `ASM-002`: A first-slice application bundle binds to one runtime target: either one embedded team or one embedded agent.
- `ASM-003`: Shareable default model/runtime launch config belongs in distributable definition config, not only in browser-local launch profiles.
- `ASM-004`: Reusing the existing package import/install subsystem is preferable to building a second independent application importer.
- `ASM-005`: Embedded supporting definitions remain owned by the application bundle even when they are exposed in the normal Agents/Teams system surfaces and edited there.
- `ASM-006`: In the first slice, each application bundle folder remains self-contained and does not share embedded agents/teams across sibling application bundle folders in the same imported repository/package root.
- `ASM-007`: The first SDK slice should wrap existing platform runtime APIs/streams rather than introducing a second parallel runtime transport protocol.
- `ASM-008`: Application/member renderers react to typed projected publication state; they do not receive direct UI-imperative commands from agents.
- `ASM-009`: In v1, publication families should remain tightly typed even if that means omitting generic metadata extensibility until a later contract version.

## Risks / Open Questions

- `Q-001`: Should the product rename `Agent Packages` to a broader `Packages` / `Bundles` concept once self-contained application bundles are added?
  - Why it matters:
    - The current package name becomes semantically narrow.
- `Q-002`: Should application manifests also be allowed to define app-specific launch defaults on top of agent-definition defaults?
  - Why it matters:
    - This affects configuration precedence and reuse.
- `Q-003`: Should the first SDK slice also include a local application dev-server mode, or should that remain a separate follow-up after the static bundle + SDK authoring model stabilizes?
  - Why it matters:
    - It affects developer experience, trust/origin policy, and backend local-dev access rules.
- `Q-004`: Should the deepest drill-down handoff always open the existing workspace/running view, or should some applications also support an intermediate native runtime-summary view before that handoff?
  - Why it matters:
    - It affects screen model complexity and naming (`Execution` vs `Runtime Details`).

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| `REQ-001`–`REQ-005` | `UC-001` |
| `REQ-004`, `REQ-010` | `UC-003` |
| `REQ-006`, `REQ-007`, `REQ-011`, `REQ-025` | `UC-004`, `UC-005`, `UC-009` |
| `REQ-008`, `REQ-009`, `REQ-010`, `REQ-018`, `REQ-019`, `REQ-034` | `UC-002`, `UC-003`, `UC-017` |
| `REQ-012`, `REQ-021`, `REQ-030`–`REQ-033` | `UC-008`, `UC-015`, `UC-016` |
| `REQ-013`–`REQ-016` | `UC-006`, `UC-007` |
| `REQ-022`–`REQ-029` | `UC-012`, `UC-013`, `UC-014` |
| `REQ-035`–`REQ-040` | `UC-017`, `UC-018`, `UC-019`, `UC-020` |
| `REQ-041`–`REQ-047` | `UC-021`, `UC-022` |
| `REQ-048`–`REQ-052` | `UC-023` |
| `REQ-053`, `REQ-054` | `UC-024` |
| `REQ-055`, `REQ-056` | `UC-025` |
| `REQ-057`–`REQ-060` | `UC-026` |

## Acceptance-Criteria-To-Use-Case Coverage

| Acceptance Criteria ID | Intended Use Cases |
| --- | --- |
| `AC-001`–`AC-003` | `UC-001`, `UC-002`, `UC-003` |
| `AC-004`–`AC-010` | `UC-004`, `UC-005`, `UC-006`, `UC-007`, `UC-009`, `UC-010` |
| `AC-011`–`AC-017` | `UC-011`, `UC-012`, `UC-013` |
| `AC-018`–`AC-025` | `UC-014`, `UC-015`, `UC-016` |
| `AC-026`–`AC-031` | `UC-017`, `UC-018`, `UC-019`, `UC-020` |
| `AC-032`, `AC-033` | `UC-021`, `UC-022` |
| `AC-034` | `UC-023` |
| `AC-035` | `UC-024` |
| `AC-036`, `AC-037` | `UC-025` |
| `AC-038`, `AC-039` | `UC-026` |
