# Investigation Notes

## Metadata

- Ticket: `message-gateway-quality-review`
- Date: `2026-03-24`
- Investigator: `Codex`
- Scope Triage: `Small`

## Review Inputs

- Shared workflow references:
  - `shared/design-principles.md`
  - `shared/common-design-practices.md`
- Reviewed package: `autobyteus-message-gateway`
- Initial survey:
  - Source tree shape under `src/`
  - Largest source/test files
  - `src/http/routes/channel-admin-route.ts`
  - `tests/integration/http/routes/channel-admin-route.integration.test.ts`
  - Session and peer-discovery application services

## Current-State Observations

- The gateway already has a clear top-level layering split (`domain`, `application`, `http`, `infrastructure`, `bootstrap`).
- The most immediate quality risk in the reviewed slice sits in the HTTP admin boundary rather than in a deep provider adapter.
- `src/http/routes/channel-admin-route.ts` is large and mixes multiple subjects:
  - gateway capability endpoints,
  - WeCom account listing,
  - Discord peer discovery,
  - Telegram peer discovery,
  - WhatsApp personal session lifecycle,
  - WeChat personal session lifecycle,
  - shared parsing and error mapping.
- The Discord and Telegram peer-discovery route bodies are nearly identical.
- The WhatsApp and WeChat personal-session route bodies are also heavily duplicated.

## Concrete Findings

### F-001 Repeated route coordination created a real copy-paste bug

- The Telegram peer-candidates endpoint resolves its `limit` with `wechatDefaultPeerCandidateLimit` and `wechatMaxPeerCandidateLimit` instead of the general peer-discovery limits.
- That means Telegram route behavior can be unintentionally changed by WeChat-specific configuration, which violates ownership clarity and boundary clarity.
- This is not theoretical: the wrong variables are wired directly into the Telegram route implementation.

### F-002 The `channel-admin` route file owns too many provider-specific variations directly

- The file is acting as both:
  - the HTTP boundary owner for admin routes, and
  - a repeated provider-specific coordinator for several similar route families.
- Under the workflow design principles, the route boundary should own HTTP registration and request/response translation, but repeated subject-specific coordination should be extracted into support structures that clearly serve that owner.
- The current shape makes it easy for one provider block to drift from another without an obvious reason.

### F-003 Existing tests cover happy-path Telegram discovery but miss the configuration-isolation contract

- There is an integration test for Telegram peer discovery.
- There is a WeChat-specific peer-candidate limit test.
- There is no test asserting that Telegram discovery continues to use the general/default peer-candidate limit configuration rather than the WeChat override configuration.
- That gap allowed the copy-paste bug to survive.

## Spine Inventory

| Spine ID | Scope | Start | End | Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `S1` | `Primary End-to-End` | `GET /api/channel-admin/v1/telegram/peer-candidates` | `TelegramPeerDiscoveryService.listPeerCandidates(...)` result sent to client | `channel-admin-route` HTTP boundary | This is the concrete bug path under review. |
| `S2` | `Primary End-to-End` | `GET /api/channel-admin/v1/discord/peer-candidates` | `DiscordPeerDiscoveryService.listPeerCandidates(...)` result sent to client | `channel-admin-route` HTTP boundary | This is the parallel route whose structure should match Telegram except for the subject-specific service. |
| `S3` | `Primary End-to-End` | `GET/POST/DELETE /api/channel-admin/v1/{whatsapp|wechat}/personal/...` | Session service call result sent to client | `channel-admin-route` HTTP boundary | This parallel family shows the same duplication pattern and explains why the file is drift-prone. |

## Design Assessment Against Shared Principles

- `Data-Flow Spine Clarity`: acceptable at the endpoint level, but the file hides repeated parallel spines inside one mixed route registrar.
- `Ownership Clarity`: the HTTP boundary owns too much provider-by-provider duplication instead of delegating repeated route-family wiring to owned helpers.
- `Support Structure Around The Spine`: missing. The file needs small support helpers for repeated peer-discovery and personal-session route families.
- `Repeated coordination trigger`: present. Provider-specific route registration is repeated with minor parameter variation.
- `Ambiguous-boundary trigger`: partially present. The Telegram route currently uses WeChat-specific limit values, which shows the boundary is not tightly aligned to its subject.

## Chosen Refactor Slice

- Refactor `channel-admin-route` so repeated route-family registration is moved into small helper functions with explicit subject configuration.
- Fix the Telegram peer-candidate limit bug as part of that refactor.
- Add focused integration coverage proving Telegram discovery uses the correct limit configuration.

## Why This Slice

- It fixes a real behavioral defect.
- It directly addresses a design-principle violation instead of only cleaning formatting.
- It is small enough to carry through the full workflow, including tests and code review, in one iteration.

## Review Cycle 2: Full-Project Deep Review

### Additional Survey

- Re-ran a project-wide hotspot scan across `src/` and `tests/`.
- Reviewed:
  - `src/bootstrap/create-gateway-app.ts`
  - `src/infrastructure/adapters/session/session-supervisor.ts`
  - `src/infrastructure/adapters/session/session-supervisor-registry.ts`
  - `tests/integration/bootstrap/create-gateway-app.integration.test.ts`

### Current-State Observations

- `create-gateway-app.ts` is still one of the largest and most central files in the package.
- It currently owns all of these concerns directly:
  - Fastify app construction and common hooks
  - provider and adapter construction
  - discovery/service construction
  - queue store and worker construction
  - session supervisor construction and registration
  - startup sequencing
  - lock heartbeat management
  - shutdown sequencing
  - route registration
- Those branches all serve bootstrap, but they are not clearly separated into support structures around a bootstrap owner.

### New Concrete Findings

#### F-004 Bootstrap ownership is overloaded in `create-gateway-app`

- The bootstrap owner is currently a mixed-concern blob.
- Under the workflow design principles, the main bootstrap spine should stay readable while support branches serve it explicitly.
- Right now the startup, shutdown, adapter construction, and route wiring branches are interleaved inside one function, which makes lifecycle reasoning harder than it needs to be.

#### F-005 Startup lacks a clear rollback owner after partial success

- In `onReady`, the app:
  - acquires queue locks,
  - restores persisted sessions,
  - starts workers,
  - marks reliability state,
  - then starts supervised runtime sessions.
- If `sessionSupervisorRegistry.startAll()` fails after the earlier steps succeeded, the startup path has no explicit local rollback sequence for:
  - stopping the workers,
  - clearing running status,
  - releasing queue locks,
  - clearing any started supervisors.
- This is a concrete lifecycle-risk, not only a readability issue.

#### F-006 Existing tests cover lock-acquire failure but not partial-startup rollback

- There is integration coverage for:
  - lock pair acquire failure,
  - close-path lock release,
  - WeChat restore ordering,
  - sidecar route registration.
- There is no focused test proving that a provider startup failure during `onReady` triggers rollback of already-started resources.

### Spine Inventory For Active Slice

| Spine ID | Scope | Start | End | Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `S4` | `Primary End-to-End` | `createGatewayApp(config)` | Fastify app with configured lifecycle hooks | bootstrap owner | This is the main bootstrap spine under review. |
| `S5` | `Bounded Local` | `app.onReady` | startup success or startup failure | bootstrap lifecycle support | This is where partial startup and rollback semantics live. |
| `S6` | `Bounded Local` | `app.onClose` | all owned runtime resources released | bootstrap lifecycle support | This is the paired shutdown path and should mirror startup ownership. |

### Active Slice Decision

- The next refactor slice should focus on bootstrap lifecycle ownership in `create-gateway-app`.
- The likely direction is:
  - introduce explicit startup/shutdown support helpers,
  - give partial-startup rollback one clear owner,
  - add regression coverage for startup failure cleanup.
