# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/design-spec.md`
- Supplemental task artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/application-agent-communication-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/application-backend-websocket-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/application-communication-boundaries.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/socratic-math-live-journey.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/design-review-report.md`
- Implementation-source review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/code-review-report.md`
- Current expanded-scope implementation source/test commit: `e9c130a52b9f790505a4fd472149790ddcaecafd`
- CR-005 lifecycle-fix commit: `6896bd413f62ec887884a579648ed83c71cb59a5`
- Round-11 initial expanded-scope source/test commit: `4732df357706a9dfa1798193ed02162cae715b13`
- Round-11 reviewed source base: `69fae2e424a708fe9a0d038077346d5b95b41df6`
- Prior deterministic-framework implementation source/test commit: `b9fb82e23b7a94131e45627907bb7d5ff45c5bb8`
- CR-001–CR-003 source-fix commit: `5e824f8de8fea67ae8da820b7f5134b78923907e`
- Initial implementation source commit: `8d93ee5c1fb27dc910496626d6ef4aa38da4fb94`
- Recorded implementation base: `534210b9e1dffff6c22855ae89ddb3d2afef5a9b`

## What Changed

### Round-11 Socratic Math Live Acceptance Expansion

- Extended `buildConfiguredTeamRunLaunch(...)` and member-config construction with optional transport-neutral `llmConfig`. Preset output and every member output receive independent structured clones; existing host-saved runtime/model/workspace precedence remains unchanged. Added a package-owned Vitest suite and generated declaration/runtime output.
- Set the Socratic tutor source and importable-package defaults to the exact `codex_app_server` / `gpt-5.6-sol` / `{ reasoning_effort: "high" }` configuration with no service tier or fallback.
- Changed new-lesson start to persist the student prompt and create the configured team with no `initialInput`. Socratic still uses the existing `startAgentTeam(...)` API; optional launch-time input remains valid for other callers.
- Added the derived nullable `LessonDetail.tutorTargetAddress` using the shared `{ bindingId, target: { kind: "AGENT_TEAM_MEMBER", memberRouteKey: "tutor" } }` contract. Closed, terminating, failed, terminated, orphaned, and unbound lessons expose `null`; GraphQL schema/client propagation carries the shared JSON shape without a second DTO.
- Added the mounted Socratic standard connection journey: listeners register immediately, READY precedes one stored-problem input, only increasing provider-neutral TEXT deltas / publish-tool lifecycle / completion state enter live UI state, and artifact-notification refresh clears the draft in favor of the existing durable transcript.
- Added deterministic listener/cancellation/input/failure/durable-convergence tests, target/GraphQL tests, DOM-rendering tests, exact launch/config assertions, and no-initial-input assertions. Split the application-specific live session into `socratic-tutor-session.js` so changed production files remain below the source-size and changed-line pressure guardrails.
- Regenerated only through the Socratic build owner: runtime backend/UI, backend SDK vendor, generated GraphQL client, importable source/runtime mirrors, and agent config. Source/generated comparisons and a second-build hash check passed.

### Implementation-Source Review Round 11 Resolution

- `CR-005` resolved with one Socratic-runtime lifecycle/selection generation. Selection replacement and disposal invalidate every captured operation; all post-await detail/list mutations, connection attempts, errors, session closes, and refreshes first prove that their originating generation and lesson are still current.
- Rapid selection now closes the prior tutor session immediately and prevents an out-of-order prior lesson response from overwriting or reconnecting after the replacement. Pending start, follow-up, hint, close, notification refresh, manual refresh, and initial refresh work suppress stale/disposed completions instead of mutating the replacement session.
- Added mounted JSDOM coverage for the exact reviewer reproduction (dispose during a deferred initial lessons request), out-of-order `A -> B` detail resolution, a stale follow-up error, and a stale lesson-close completion. The tests prove no post-dispose connection, latest-selection retention, no stale error presentation, no replacement-session close, and no stale refresh.
- Regenerated the runnable UI and both importable-package runtime mirrors through the existing Socratic build owner. All four runtime files are byte-identical and a second build preserved the combined SHA-256 input hash.
- CR-005 source/test commit: `6896bd413f62ec887884a579648ed83c71cb59a5`.

### Implementation-Source Review Round 5 Resolution

- `CR-006` resolved inside the same lifecycle-generation invariant with one explicit `pendingStartOperation`. Notification and manual refreshes may update the lesson list while a start is pending, but they do not replace the selected lesson, overwrite the “Starting” status, or steal the only initial-send owner; an older pre-start refresh remains generation-fenced.
- When the GraphQL response arrives, the still-current start operation alone selects the returned lesson, connects through the standard session, awaits READY, and sends the stored problem once. The pending marker is rebased across that owned selection and cleared immediately after the one send is accepted; there is no resend, fallback, launch-time input, or second send path.
- Explicit lesson selection and disposal still increment/invalidate the lifecycle generation, clear pending-start ownership, close the prior session where applicable, and make the late start response inert.
- Mounted coverage now composes both real transport orders: GraphQL-response-first and `lesson.started`-refresh-first each produce exactly one connection and one post-READY input, never zero or two. Additional tests prove explicit selection and disposal cancel the pending start without sending.
- Regenerated all four Socratic runtime mirrors through the existing build owner; they are byte-identical and idempotent.
- CR-006 source/test commit: `e9c130a52b9f790505a4fd472149790ddcaecafd`.

### Preserved Standard Framework Baseline

- Added the exact two public binding types, shared application-agent address/input/event contracts, standard v1 connection frames, fixed target-path codec, and generic backend WebSocket contracts.
- Added the desktop-only `applicationClient.agentCommunication.connect(address)` path and exact sibling frontend capability groups: `backend`, `notifications.subscribe(listener)`, and `agentCommunication.connect(address)`. No `backend.subscribeNotifications` alias remains. The SDK owns strict frame parsing, request correlation, readiness, listener isolation, safe close/error mapping, and 1 MiB frame bounds without exposing a raw socket or authentication surface.
- Added Orchestration-owned exact target authorization, listener-before-final-read lifecycle leases, addressed input, one-shot lifecycle fan-out, and keyed terminal transitions reused by explicit, observed, and recovery terminal writers.
- Added Streaming-owned provider-neutral projection, producer attribution, target filtering, paused activation, per-consumer sequencing/FIFO/backpressure, terminal draining, and failure isolation.
- Added Communication-owned standard WebSocket sessions and the synchronous READY-versus-terminal/cancel/failure commit. Pending transport closure is observed before asynchronous route establishment.
- Added backend event observation through the Engine Host/Backend Host reverse protocol with a host `PENDING -> ACTIVE` activation barrier and no pre-activation observer callback.
- Added the separate optional custom backend WebSocket path through Backend API Gateway, Engine Host, Backend Host, worker session registry, strict readiness protocol, ordered text/binary transport, bounded queues, and exactly-once cleanup. Gateway preflight now enforces the bundle `supportedExposures.webSockets` authority before any worker-open attempt.
- Replaced the obsolete worker/runtime and notification-stream owners with `ApplicationBackendHost` and `ApplicationBackendNotificationHub`; preserved native agent/team streams, notification semantics, and artifact behavior as separate planes.
- Advanced the strict current contract chain to `ApplicationManifestV4 -> ApplicationBackendBundleManifestV1` with seven required exposure flags -> backend definition v4 -> derived exposure summary. Removed v3 readers/symbols, flat frontend APIs, generic public binding aliases, obsolete owner files, and dual-path compatibility.
- Regenerated contracts, SDK declarations, both built-in application runtime packages, vendor copies, and importable packages. Updated devkit templates/validation and current application framework documentation.
- Removed stopped-proposal mobile/application-auth machinery. No credential lookup/injection, token-query composer/collision behavior, mobile error contract, or `ApplicationClient` authentication surface was introduced; existing platform/network security remains unchanged.

## Implementation-Source Review Round 1 Resolution

- `CR-001` resolved: moved public notification subscription from `applicationClient.backend.subscribeNotifications(...)` to the exact sibling `applicationClient.notifications.subscribe(...)` API with no alias; updated active docs, both built-in generated clients, declarations, vendor trees, and importable packages; added exact runtime key and compile-time capability-shape proof.
- `CR-002` resolved: the Gateway-owned custom WebSocket preflight now checks the active bundle's `backend.supportedExposures.webSockets` flag before `openApplicationWebSocket`; focused negative coverage proves a disabled flag produces only the safe rejection and no Engine/worker open, while positive coverage proves enabled entry reaches readiness.
- `CR-003` resolved: removed the unreachable `ApplicationAgentCommunicationSession.closeByClient()` duplicate; socket close/error observation remains the only reachable transport-close path.
- Local-fix source commit: `5e824f8de8fea67ae8da820b7f5134b78923907e`.

## Implementation-Source Review Round 2 Resolution

- `CR-004` resolved across all five active test files: every ignored `notificationStreamService` constructor property now uses the exact `notificationHub` dependency, and the REST/WS plus Brief integration hoisted state and initialization errors now use Notification Hub terminology. No production compatibility alias was added.
- The required full five-file run exposed two already-stale integration harness assumptions after the production REST route split and V4 exposure-summary extension. The harnesses now register the existing `registerApplicationAvailabilityRoutes` module alongside backend routes and assert the current `webSocketRoutes: []` derived field; no production behavior changed.
- Final focused result: `5 files / 25 tests` passed in one run. Active source/test/docs obsolete notification-stream owner inventory is empty.
- CR-004 test-fix commit: `b9fb82e23b7a94131e45627907bb7d5ff45c5bb8`.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| `DS-001` | Application business still starts and persists a bound runtime. | backend handler -> `ApplicationEngineHostService` -> `ApplicationOrchestrationHostService` / launch service / stores | Preserved with exact agent/team public returns. |
| `DS-002` | App business returns an address; it does not proxy the standard socket. | shared binding/address contracts plus built-in app correlation services | One business mapping only. |
| `DS-003` | Desktop host and SDK establish the direct standard path with one READY winner. | `applicationHostTransport.ts`, frontend connection/transport, standard WS adapter, Communication, Streaming, Orchestration | Implemented; no Gateway/Engine/worker traversal. |
| `DS-004` | Addressed input is accepted/rejected through the same target authority. | frontend connection -> Communication session/parser -> Orchestration `sendRunInput` | Correlated acknowledgement and exact runtime validation. |
| `DS-005` | Closed provider-neutral events reach frontend listeners. | runtime source -> projector/mapper -> stream subscription -> Communication -> strict SDK parser | Exact envelope/data validation; native/provider fields are not spread. |
| `DS-006` | Terminal state fails pending consumers or drains/closes active consumers. | terminal transition owner -> lifecycle hub -> lease/subscription -> adapter close | One-shot detach/drain/close behavior. |
| `DS-007` | Optional backend observation reuses Streaming. | handler context -> Backend Host registry -> Engine Host activation barrier -> Streaming | Public subscribe promise precedes callbacks; pending abort is typed and callback-free. |
| `DS-008` | Custom realtime remains a separate escape hatch. | frontend custom connection -> custom WS adapter -> Backend API Gateway exposure preflight -> Engine Host -> Backend Host | Bundle exposure is enforced before worker open; independent readiness, routing, queues, and cleanup. |
| `DS-009` | Notifications remain separate one-way fan-out. | backend publish -> Engine Host -> `ApplicationBackendNotificationHub` -> `applicationClient.notifications.subscribe` | Preserved as an exact sibling capability; not reused for agent events. |
| `DS-010` | Artifacts remain durable and projected independently. | runtime/store/relay/Orchestration existing artifact path | Preserved; event projector excludes artifact/file families. |
| `DS-011` | One Communication serializer chooses READY versus pre-ready first cause. | `application-agent-communication-session.ts` + paused stream | READY write precedes drain; terminal/cancel/transport failure cannot activate late. |
| `DS-012` | Source callback only projects/accepts; async drain transports. | `application-agent-stream-subscription.ts` | Contiguous sequence on successful bounded acceptance; isolated overflow/failure. |
| `DS-013` | Unique open-session input requests settle and clean correlation. | Communication frame parser/session request registry | Duplicate/malformed/binary/oversized input fails safely. |
| `DS-014` | Worker observer activation is atomic. | observer registry + activation barrier + handler context factory | Host PENDING-to-ACTIVE ordering and pending cancellation implemented. |
| `DS-015` | All reachable terminal causes converge before fan-out. | terminal transition service used by host, observer, and recovery services | Keyed serialization; store/journal then one terminal signal. |
| `DS-016` | Custom socket sessions correlate and clean up independently. | Gateway and worker WebSocket session services + JSON-line protocol | Ordered bounded delivery and scope-local failure cleanup. |
| `DS-017` | The real Socratic UI starts without input, connects to its selected tutor, sends after READY, renders safe live progress, and converges on the durable artifact transcript. | backend SDK launch helper -> Socratic runtime lifecycle/selection generation plus singular pending-start owner -> read/GraphQL and notification returns -> `applicationClient.agentCommunication` -> Socratic live session/renderer -> existing artifact notification refresh | Implemented deterministically, including both start/notification orderings and stale/disposed async completion suppression. The real mounted Codex run required by `AC-018` remains downstream API/E2E work. |

## Key Files Or Areas

- Shared contracts: `autobyteus-application-sdk-contracts/src/application-agent-*.ts`, `application-websockets.ts`, `application-iframe-contract.ts`, `manifests.ts`.
- Frontend SDK: `autobyteus-application-frontend-sdk/src/application-agent-*.ts`, `application-backend-websocket-*.ts`, `application-client*.ts`.
- Standard server path: `autobyteus-server-ts/src/api/websocket/application-agent-communication.ts`, `src/application-agent-communication/**`, `src/application-agent-streaming/**`.
- Orchestration authority: `src/application-orchestration/services/application-agent-target-authorization-service.ts`, lifecycle hub, terminal transition service, and host/observer/recovery integrations.
- Backend observation/custom sockets: `src/application-engine/**`, `src/application-backend-api-gateway/websockets/**`, `src/api/websocket/application-backends.ts`.
- Strict compatibility chain: contracts manifests, server bundle parsers/definition loader, devkit config/validators/templates, and both built-in apps.
- Expanded Socratic source: `autobyteus-application-backend-sdk/src/launch-profile.ts`, `applications/socratic-math-teacher/backend-src/{domain,repositories,services}/**`, `api/graphql/schema.graphql`, `frontend-src/socratic-{runtime,tutor-session,renderer}.js`, `frontend-src/styles.css`, and exact tutor `agent-config.json`.
- Expanded deterministic coverage: `autobyteus-application-backend-sdk/tests/launch-profile.test.ts`, four focused Socratic server unit files including `socratic-runtime-lifecycle.test.ts`, plus the existing launch-correlation and GraphQL executor suites.

## Important Assumptions

- Applications are desktop-only. There is no supported paired-mobile/phone application entry path; existing remote-access security code is outside this application API and remains unchanged.
- Application binding/artifact/database stored meanings and physical schemas are unchanged. Connection/subscription/session/queue state is transient.
- Native agent/team sockets remain native product APIs and are not an application compatibility path.
- Host-saved application execution-resource runtime/model values intentionally retain priority over bundled tutor defaults; only the previously missing neutral `llmConfig` reasoning value is supplied by the Socratic launch helper call.
- The live draft is transient and future-only. Durable transcript messages remain artifact-projected application data, and no replay or draft persistence is introduced.

## Known Risks

- `AC-018` is not satisfied by these implementation checks. API/E2E must still preflight the exact Codex model/login, import and mount a fresh generated Socratic package, execute one bounded real turn, verify effective config/live/durable/cleanup evidence, apply the approved one-clean-retry classification, and recalculate confidence.
- Rendered self-validation used a deterministic hosted-application-state preview rather than the actual imported desktop mount. Real SDK/socket/provider interaction and mounted browser behavior remain independently unverified here.
- The worktree intentionally remains dirty only in upstream/design/review/delivery-owned ticket artifacts and logs. They were neither staged nor committed; source, tests, and generated implementation paths are clean at commit `e9c130a52b9f790505a4fd472149790ddcaecafd`.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Larger Requirement` plus focused `Behavior Change`.
- Reviewed root-cause classification: `Missing Invariant` and `File Placement Or Responsibility Drift`.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`.
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`; the stopped proxy/auth proposal was discarded per the fresh reviewed basis.
- Evidence / notes: the helper owns neutral launch construction, Socratic owns target selection/business sequence/presentation, and Communication/Streaming/Orchestration/artifacts keep their implemented subjects. The application uses only the standard SDK path and adds no mapper, queue, target authority, transport, or transcript store.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`; Socratic's now-obsolete `buildTutorPrompt` / launch-time initial-input branch was removed, while optional initial input remains unchanged in the framework API.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`.
- Notes: expanded-scope changed production sources remain at or below `438` effective non-empty lines. The application-specific tutor session is `198` effective lines, and CR-006 leaves `socratic-runtime.js` at `328`; the CR-006 local-fix delta is `38` changed lines, below the `>220` changed-line pressure signal. The existing split continues to avoid the `>500` source limit without introducing a generic framework abstraction. No compatibility alias, resend/replay path, custom/raw/native socket, migration, auth/mobile surface, or fallback was added.

## Persisted Data Transition Check (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`): `Directly Usable — No Migration`.
- Design-spec decision reference: `design-spec.md`, “Persisted Data / State Transition Decision”.
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`.
- Direct-use evidence or discard/rebuild result, when applicable: binding JSON fields/values and runtime-subject semantics remain unchanged; `tutorTargetAddress` is derived at read time, `llmConfig` already exists in launch contracts, and live state is memory-only. Existing lesson/message/binding/artifact records remain readable. No migration/schema file changed.
- Migration implementation and focused checks, only when `Migration Required`: `N/A`.
- Deviation from the reviewed transition decision: `None`.

## Environment Or Dependency Notes

- Dependencies were provisioned in the shared worktree with pnpm before checks.
- `vitest ^4.0.18` was added as a development-only dependency of `@autobyteus/application-backend-sdk` so its focused helper behavior has an owning package test command; the lockfile changed only in that workspace importer.
- Server checks follow `pnpm exec vitest run ... --no-watch` per repository instructions.
- Implementation-owned numeric bounds:
  - event consumer FIFO `256`; event text `256 KiB`; summary `8 KiB`; public arrays `256`; serialized event/frame `1 MiB`;
  - standard client/server frame `1 MiB`; socket buffered amount `2 MiB`;
  - input request ID `256 B`; text `256 KiB`; context files `64`; context URI `8 KiB`; context file name/type `1 KiB`; metadata `64 KiB`;
  - worker observer activation FIFO `128`; active observer FIFO `128`;
  - custom WebSocket frame `1 MiB`; Gateway inbound FIFO `64`; early outbound FIFO `64`; worker outbound FIFO `64`; network buffered amount `2 MiB`.

## Local Implementation Checks Run

### CR-006 Start/Notification Interleaving Local Fix

- `autobyteus-server-ts`: `pnpm exec vitest run --no-watch` across launch correlation, GraphQL executors, target projection, tutor session, tutor renderer, and mounted runtime lifecycle — `6 files / 29 tests` passed.
- Mounted runtime lifecycle suite — `1 file / 8 tests` passed, including GraphQL-response-first exactly-one-send, notification-refresh-first exactly-one-send, explicit-selection cancellation, disposal cancellation, and all four retained CR-005 stale/disposed cases.
- Socratic Math Teacher: `pnpm build` passed and a no-edit second build preserved the combined runtime-mirror SHA-256 `0b44d25007a69284857e243b49cf192a9284d2d20a1f271ca28bf619524763c2`. All four mirrors are byte-identical and pass `node --check`.
- `autobyteus-server-ts`: `pnpm build` passed, including shared-package builds, Prisma generation, production TypeScript compilation, and built-in-agent bootstrap smoke.
- `git diff --check` passed; backend source, migration, and Prisma schema diffs are empty for this local fix.

### CR-005 Lifecycle Local Fix

- `autobyteus-server-ts`: `pnpm exec vitest run --no-watch` across launch correlation, GraphQL executors, target projection, tutor session, tutor renderer, and the new mounted runtime lifecycle suite — `6 files / 25 tests` passed.
- Mounted runtime lifecycle suite alone — `1 file / 4 tests` passed for dispose-during-refresh, out-of-order `A -> B` selection, stale follow-up failure, and stale close completion.
- Socratic Math Teacher: `pnpm build` passed twice through the existing owner. Source/UI/importable runtime files are byte-identical; pre/post second-build combined SHA-256 was `983eede22504aafab23b5a859b072f58511b76d03f414e3ef72994cae254ebe5`.
- `autobyteus-server-ts`: `pnpm build` passed, including shared-package builds, Prisma generation, TypeScript build, and built-in-agent bootstrap smoke.
- JavaScript syntax checks for all four regenerated Socratic runtime mirrors passed; `git diff --check` passed.
- `autobyteus-server-ts`: a fresh `pnpm typecheck` attempt did not reach semantic checking because the repository's current `tsconfig.json` combines `rootDir: src` with `include: tests`, producing existing `TS6059` errors for repository-wide test files outside `src`. This local-fix source is JavaScript, its mounted TypeScript test executes successfully under Vitest, and the server build's production TypeScript compile passed. No unrelated tsconfig change was made.

### Round-11 Expanded Scope

- `@autobyteus/application-backend-sdk`: `pnpm test` — `1 file / 3 tests` passed for preset/member/null propagation, independent deep clones, omitted optional field, and preserved saved runtime/model/workspace precedence.
- `@autobyteus/application-backend-sdk`: `pnpm build` — passed; checked-in JavaScript, source maps, exact optional `llmConfig` declarations, and Socratic vendor copies regenerated.
- Socratic Math Teacher: `pnpm typecheck:backend` — passed.
- Socratic Math Teacher: `pnpm build` — passed through the existing sole build owner; runtime/importable package regenerated. Source-to-runtime/importable `cmp` checks passed, and a second full generated-tree SHA-256 comparison proved build idempotency.
- `autobyteus-server-ts`: focused Vitest run of launch correlation, GraphQL executor, target projection, live tutor session, and live tutor renderer — `5 files / 21 tests` passed. Coverage includes no launch-time input, high-effort propagation with saved runtime/model precedence, active/terminal address projection, READY-before-one-send, ordered TEXT-only state, provider/raw-field exclusion, publish tool state, completion, durable convergence, pending selection cancellation, future-only existing connection, safe failure/no resend, listener cleanup, and rendered streaming/saved states.
- `autobyteus-server-ts`: `pnpm typecheck` — passed after shared package preparation; no TypeScript error in the changed backend/application contract path.
- JavaScript syntax checks: source Socratic tutor session, runtime, renderer, and generated GraphQL client — passed.
- Frontend rendered-result self-check: deterministic live Socratic state rendered in headless Chrome at `1440x1200` and `720x1200`; direct visual inspection found the hierarchy, wrapping, panel state, status cues, and responsive one-column behavior coherent. DOM tests separately cover streaming/saved accessibility and HTML escaping.
- Final inventories: tracked and new-file diff hygiene passed; exact source/generated tutor config passed; no Socratic start `initialInput`, service tier, raw/native/custom socket, migration/schema, mobile/auth, replay, or compatibility machinery was found; all expanded production source files are `<=438` effective non-empty lines.

### Prior Deterministic Framework Baseline

- `autobyteus-application-sdk-contracts`: `pnpm test` — `6/6` passed.
- `autobyteus-application-frontend-sdk`: local-fix rerun of `pnpm test` — `11/11` runtime tests plus the compile-time type test passed, including exact public capability keys, sibling notification routing, absence of the old backend member, READY/input correlation, strict nested event parsing, unsupported frame handling, and local unsafe/oversized input rejection.
- `autobyteus-application-backend-sdk`: `pnpm build` — passed.
- `autobyteus-application-devkit`: `pnpm test` — `17/17` passed, including strict v4/v4 and seven-flag negative validation.
- Built-ins: local-fix rerun of `pnpm build` in Brief Studio and Socratic Math Teacher — both passed; runtime/vendor/importable outputs regenerated with the sibling notification capability.
- `autobyteus-server-ts`: initial selected implementation-owned unit run across Communication, Streaming, Gateway WebSockets, Engine/worker observation, Orchestration, bundle/package/storage boundaries — `22 files / 138 tests` passed.
- `autobyteus-server-ts`: local-fix focused rerun for Gateway preflight and Communication session cleanup — `2 files / 12 tests` passed, including disabled/no-open and enabled/READY custom WebSocket cases.
- `autobyteus-server-ts`: CR-004 final focused run across all five affected unit/integration files — `5 files / 25 tests` passed. The first run exposed stale integration harness registration/summary assumptions (`23/25`); after aligning those fixtures to the existing split availability route and current V4 exposure summary, the full rerun passed.
- `autobyteus-server-ts`: local-fix rerun of `pnpm build` — TypeScript, shared-package preparation, Prisma client generation, and built-in agent bootstrap smoke passed.
- `autobyteus-web`: exact changed four-file Vitest run — `4 files / 11 tests` passed.
- Local-fix hygiene: `git diff --check` passed; exact `applicationClient.backend.subscribeNotifications`, dead `closeByClient`, and active notification-stream-owner inventories are empty; broader v3/obsolete-owner/flat-client inventory passed; generated SDK/vendor/importable byte-or-normalized-declaration propagation passed; prohibited migration/schema diff is empty; changed implementation sources are `54`, `273`, and `183` effective non-empty lines (all `<=500`).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: mounted Socratic Math Teacher lesson composer, lesson detail, focused live tutor status/draft/tool/completion region, durable transcript convergence, and selection/unload cleanup. CR-005 changes lifecycle sequencing only; it adds no styling or visual state.
- Approved UI/UX, interaction, requirement, or design references: `REQ-018`, `AC-018`, `DS-017`, and `socratic-math-live-journey.md` sections 3–5.
- Existing design system, shared components, and adjacent product surfaces reviewed: current Socratic card, badge, workspace status, lesson list/detail, transcript, action, spacing, color, and responsive patterns; no new framework-wide chat component was introduced.
- Project development / preview instructions and rendered surface used: the application has a source-first build but no standalone hostless preview. I rendered the actual Socratic shell/detail renderer and stylesheet with deterministic hosted state, then inspected it directly in headless Chrome; Vitest/JSDOM exercised the renderer and application-specific session state machine.
- States, layouts, viewports, and interactions inspected: streaming state at `1440x1200` and `720x1200`; connecting/ready/streaming/saved/failed/closed transition outputs and one-send/listener cleanup through deterministic tests; saved-state draft clearing and accessible `aria-live="polite"` through DOM tests; mounted dispose-during-load and rapid-selection/stale-operation interactions through the new JSDOM lifecycle suite.
- Visual or interaction issues found and corrected: added a distinct but design-consistent live tutor panel, concise safe publication/completion cues, disabled duplicate start controls during connection/input acceptance, responsive wrapping/one-column behavior, and root-scoped detail event binding.
- Supporting evidence and remaining unverified states or limitations: focused renderer/session tests passed (`5` tests across their two files), and mounted runtime lifecycle tests passed (`8/8`), including both notification/GraphQL orderings. This was not a real imported desktop mount or live provider run; the exact mounted Codex journey, natural model output variation, and real artifact notification timing remain downstream `AC-018` work.

## Downstream Coverage Hints / Suggested Scenarios

- Exercise all three standard target variants through a real desktop-host bootstrap and child worker: agent root, team root, and exact static team member.
- Race actual socket close/abort/transport failure and persisted terminal signals before source attach, during paused activation, during READY write, and during retained-event drain.
- Verify whole-team provider/task-agent attribution, selected-member filtering/input routing, exact public projection, contiguous sequence, and scope-local overflow/failure behavior.
- Verify backend observer promise-before-callback and pending abort through real host/worker IPC.
- Exercise custom WebSocket route/query/params, readiness-first early backend sends, text/binary ordering, exact/above bounds, worker/network close races, and exactly-once cleanup.
- Import fresh Brief and Socratic packages, reject stale v3/six-flag/definition-v3 packages, and verify derived exposures.
- Confirm standard agent traffic never reaches Backend API Gateway/Engine Host/worker and that notifications/artifacts remain independent.
- Confirm desktop bootstrap and `ApplicationClient` expose no application authentication/credential surface while existing platform/network security continues unchanged.
- Import the newly generated Socratic package into isolated data, preserve/inspect the configured slot's saved runtime/model precedence, and prove the effective member still receives `reasoning_effort: high`.
- Execute the supplement's exact `Solve 3x + 5 = 20` mounted journey: start with no initial input, verify the returned `tutor` member address, READY before one acceptance, increasing nonempty TEXT deltas, response completion, successful `publish_artifacts`, notification refresh, durable transcript, and exact close/process/workspace cleanup.
- Apply the supplement's preflight/redaction/timing/cost/retry classification exactly. Do not substitute a model, use API-key auth, retry deterministic failures, or resend uncertain input on the same connection.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Required. No implementation check above is API/E2E sign-off. The prior `96.7%` deterministic framework confidence is historical only and does not satisfy expanded `AC-018`. After source review passes, `api_e2e_engineer` must update coverage decisions, perform the exact model/login preflight and one bounded real mounted Socratic/Codex journey, preserve redacted evidence and cleanup, apply the classified one-clean-retry policy, and recalculate confidence.
