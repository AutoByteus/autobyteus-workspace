# Investigation Notes — Standard Application-Bound Agent Communication

## Investigation Status

`Current through 2026-07-22 at stopped source HEAD 3e48c0ea2c9ccabe52c3126f0db799b3865186a3. The framework, Socratic integration/fixes, target-address builders, and builder handoff are committed. A real mounted Codex journey was subsequently executed: READY/input/tool/artifact/durable transcript/config/cleanup paths worked, native backend observation contained 135 assistant-text characters, but the standard application selected-member stream exposed zero text and no completion. Source comparison proves a broad application-projector semantic divergence, not a Codex adapter or transport failure. The user approved a minimal five-variant application stream. Architecture round 16 confirmed that framework boundary and the corrected sibling-return join, then returned one bounded Socratic-local sequential-turn admission correction. Implementation remains halted. Two uncommitted projector/test edits are preserved but unapproved; all attempted Codex adapter edits were reverted.`

## Request Evolution And Current Reset

The request evolved through these approved product decisions:

1. preserve durable application artifact processing while adding live agent/team information;
2. use a standard application-scoped agent connection rather than forcing each application to invent a WebSocket proxy;
3. expose exactly two binding concepts, one canonical target address, provider-neutral application events, and a desktop-only frontend SDK connection;
4. retain custom backend WebSockets and backend event subscriptions as optional advanced capabilities;
5. after the framework was implemented and deterministically validated, prove it in the real Socratic Math Teacher application with the requested Codex tutor configuration and a complete live UI journey; and
6. standardize deterministic agent, whole-team, and static-team-member target-address construction in the backend SDK, while deferring less-proven correlation and live-output accumulation abstractions; and
7. after real execution exposed projector drift, contract application streaming v1 to exact text deltas plus minimal turn/error lifecycle instead of reproducing the native AutoByteus chat event surface.

The last decision is a user-approved design reset grounded in an observed product path. The previous framework transport/authorization/lifecycle evidence remains useful, but the broad event projection and Socratic consumption contract are superseded. The prior `96.7%` score remains historical for the earlier deterministic scope.

The dictated model phrase “codex gpt 5.6 solr high” was investigated rather than copied literally. The installed Codex App Server catalog identifies the model as `gpt-5.6-sol`; `high` is a supported explicit reasoning effort; there is no `solr` identifier or unsuffixed `gpt-5.6` alias in the observed catalog.

## Environment / Bootstrap Context

| Item | Value |
| --- | --- |
| Repository mode | Git workspace/super-repository |
| Dedicated task worktree | `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming` |
| Ticket branch | `codex/application-agent-streaming` |
| Authoritative base/finalization branch | `origin/personal` |
| Current task HEAD | `3e48c0ea2c9ccabe52c3126f0db799b3865186a3` |
| Current tracked base | `origin/personal` at `dd815ee9d83d253ab9bb586a7391b5ba6da18d53` (task branch currently ahead 20 / behind 13) |
| Merge base | `965f97685c08569a98186b2a894243c0b3f602d3` |
| Ticket artifact folder | `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming` |
| Persisted-data decision | `Directly Usable — No Migration` |

Bootstrap/current-stage commands:

```text
git status --short --branch
git branch --show-current
git rev-parse HEAD
git rev-parse origin/personal
git merge-base HEAD origin/personal
git log --oneline --decorate -15
```

The current HEAD contains the implemented framework, round-11 Socratic integration/fixes, target-address builder implementation `cee41e917...`, and builder handoff `3e48c0ea2...`. The worktree is intentionally dirty: downstream artifacts/evidence plus implementation-owned partial changes to `application-agent-stream-public-event-projector.ts` and its focused test. Those partial edits preserve exact whitespace and read `segment_type`, but they retain the superseded broad projector and are not design authority. All attempted Codex source/test edits were reverted; zero Codex diffs remain. Solution design must preserve downstream-owned evidence and may not treat dirty source as approved.

## Downstream Reset Evidence

Prior and current downstream evidence is preserved with exact commit scope:

- architecture review round 9: `Pass` for the desktop-only standard framework;
- deterministic framework API/E2E: `Pass`, final historical confidence `96.7%`, followed by proportional test-code review `Pass`;
- pre-Socratic integrated baseline: `69fae2e424a708fe9a0d038077346d5b95b41df6`;
- round-11 Socratic source/test implementation: `4732df357706a9dfa1798193ed02162cae715b13`;
- lifecycle source-review fix: `6896bd413f62ec887884a579648ed83c71cb59a5`;
- start-ownership source-review fix: `e9c130a52b9f790505a4fd472149790ddcaecafd`;
- builder implementation: `cee41e91788d97d98955c3d960f9d1e511d19eb0`;
- current implementation-handoff HEAD: `3e48c0ea2c9ccabe52c3126f0db799b3865186a3`;
- code-review round 7 passed the builder delta and preserved earlier source fixes;
- API/E2E then executed the real mounted Socratic/Codex journey. READY, one accepted input, tool lifecycle, artifact notification/projection, durable transcript, effective config, qualitative response, and cleanup succeeded. The standard selected-member application stream remained at `textLength: 0` and `responseCompleted: false` for 180 seconds, while native backend event monitoring observed 135 assistant-text characters; and
- code review initially proposed CR-007 as a Codex adapter local fix. Implementation/source comparison disproved that ownership: Codex already emitted canonical `SEGMENT_CONTENT`/`TURN_COMPLETED`, the native mapper/frontend consumed them successfully, and the broad application projector independently missed/changed those semantics. Implementation stopped and returned `Design Impact`.

The canonical downstream reports remain authoritative for their exact commit/scope. The live failure evidence under `evidence/ac018-ac019-round3/` is the current runtime authority. The code-review report's earlier Codex-fix ownership is superseded by the implementation engineer's source comparison and this revised design; downstream-owned reports are preserved rather than rewritten by solution design.

## Supplemental Task Artifact Inventory

| Artifact | Canonical Path | Purpose / Scope | Status | Approval Applicability | Related IDs |
| --- | --- | --- | --- | --- | --- |
| Application agent communication contract | `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/application-agent-communication-contract.md` | exact bindings/address/builders/connection plus revised five-variant stream, projector, backend subscription, lifecycle/failure contract | implemented baseline plus user-approved design-ready stream contraction | approved revised requirements basis | `REQ-001`–`REQ-009`, `REQ-013`–`REQ-019` |
| Application backend WebSocket contract | `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/application-backend-websocket-contract.md` | optional custom desktop backend WebSocket contract | implemented reviewed baseline | approved requirements basis | `REQ-010`, `REQ-011`, `REQ-015`, `REQ-016` |
| Application communication boundaries | `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/application-communication-boundaries.md` | framework entity/module boundaries and `DS-001`–`DS-016`, including shared canonical event source and minimal projector in `DS-005`/`DS-012` | implemented baseline plus user-approved design-ready stream contraction | approved revised requirements basis | `BEH-001`–`BEH-012`, `UC-001`–`UC-009` |
| Socratic Math live journey | `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/socratic-math-live-journey.md` | exact tutor config/address, mounted UI journey, minimal text/turn/error stream, durable convergence, assertions, preflight, retry, cleanup, generated propagation | committed application path plus user-approved design-ready stream-consumer correction; live rerun pending | approved revised requirements basis | `BEH-004`, `BEH-011`, `UC-008`, `REQ-018`, `AC-018`, `DS-017` |

`application-agent-streaming-contract.md` remains superseded by `application-agent-communication-contract.md` and is not part of the package.

## Relevant Behavior And Current Production Evidence

| Behavior ID | Current Evidence | Current / Target Consequence |
| --- | --- | --- |
| `BEH-001` | Current contracts, backend SDK, Engine Host, and Application Orchestration implement precise agent/team binding creation and lifecycle. | Preserve; Socratic continues to create a team binding through application business logic. |
| `BEH-002` | Frontend SDK exposes `applicationClient.agentCommunication.connect(address)`, and current Socratic source consumes it through its focused tutor session. | Preserve connection/input/lifecycle; contract only the application stream events. |
| `BEH-003` | Native raw-ID agent/team sockets remain separate. | Do not use them in the Socratic journey. |
| `BEH-004` | Shared address/builders and Socratic member-builder adoption are committed. Follow-up/hint paths separately construct one-shot whole-team input DTOs from persisted binding ID. | Preserve unchanged. |
| `BEH-005` | The broad projector independently maps 23 agent and 4 team variants. It originally ignored `segment_type`, trimmed delta through generic string normalization, and maps AutoByteus-only `ASSISTANT_COMPLETE` to invented `AGENT_RESPONSE_COMPLETED`. Native mapping preserves canonical text and treats `TURN_COMPLETED`/idle as completion. | Replace the broad mapper with a five-variant projector over canonical `AgentRunEvent`; exact text becomes `TEXT_DELTA`, `TURN_COMPLETED` is sole success, and all rich/internal events are dropped. |
| `BEH-006` | Notification hub remains a separate one-way application plane. | Existing `lesson.response_received` refresh remains unchanged. |
| `BEH-007` | Artifacts remain durably stored, authorized, projected, and read. | Durable lesson transcript stays source of truth after live draft rendering. |
| `BEH-008` | Grouped backend/notifications/agentCommunication frontend APIs, strict v4 manifests, custom backend WebSockets, and focused Backend Host/Gateway owners are implemented. | Preserve runtime/network owners; only event contracts/projector/consumers/generated copies change. |
| `BEH-009` | Streaming, lifecycle, backpressure, and backend observer paths are implemented and passed deterministic live-socket/worker coverage. | Reuse exactly; do not create a Socratic-specific stream mapper/queue. |
| `BEH-010` | Application features remain desktop-only with no application-client authentication/mobile path. | Live acceptance uses the mounted desktop application only; no credential/mobile work. |
| `BEH-011` | Current source/config/builders are committed. The real mounted Codex journey executed and proved native text/artifact success but no public application text/completion. | Socratic consumes only `TEXT_DELTA`, `TURN_COMPLETED`, `TURN_INTERRUPTED`, and `ERROR`; remove tool status and `AGENT_RESPONSE_COMPLETED`; rerun live acceptance. |
| `BEH-012` | Brief Studio and Socratic keep application-owned business correlation. Socratic's prior rich reducer was not a universal vertical-application need. | Defer generic correlation/chat accumulation; retain a small explicit projector boundary for future evidence-backed variants. |

## Implemented Framework Source Read

Representative implemented framework owners inspected at current HEAD:

- `autobyteus-application-sdk-contracts/src/application-agent-bindings.ts`
- `autobyteus-application-sdk-contracts/src/application-agent-communication.ts`
- `autobyteus-application-sdk-contracts/src/application-agent-events.ts`
- `autobyteus-application-sdk-contracts/src/application-agent-target-path.ts`
- `autobyteus-application-frontend-sdk/src/application-client.ts`
- `autobyteus-application-frontend-sdk/src/application-agent-connection.ts`
- `autobyteus-server-ts/src/application-agent-communication/**`
- `autobyteus-server-ts/src/application-agent-streaming/services/application-agent-streaming-service.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-agent-target-authorization-service.ts`

The current framework path is:

```text
mounted desktop application frontend
→ ApplicationClient.agentCommunication.connect(address)
→ standard application WebSocket adapter
→ ApplicationAgentCommunicationService
→ ApplicationAgentStreamingService
→ Application Orchestration authorization/lifecycle lease
→ bound AgentRun/TeamRun source
→ current broad public projector/ordered bounded subscription
→ ApplicationAgentConnection event listeners
```

Input travels over the same connection through Communication and Orchestration to the addressed bound target. Durable artifacts and application notifications remain separate return paths.

## Observed Live Failure And Event-Ownership Comparison

Retained API/E2E evidence records the supported mounted path:

```text
desktop Socratic UI
→ selected tutor-member standard connection READY
→ exactly one accepted input
→ real Codex gpt-5.6-sol/high turn
→ tool execution + publish_artifacts + notification + durable transcript
→ cleanup
```

The standard public stream received tool events but accumulated `textLength: 0` and never set completion within 180 seconds. The native backend event monitor observed 135 assistant-text characters for the same run, and the durable transcript converged. This rules out address authorization, input routing, provider execution, artifact processing, and absence of model output as the primary failure.

Exact source comparison:

| Boundary | Current behavior | Consequence |
| --- | --- | --- |
| Codex converter | emits `AgentRunEventType.SEGMENT_CONTENT` with `segment_type: "text"` and exact `delta`; emits `TURN_COMPLETED` plus status | already supplies canonical text and completion |
| Claude converter | emits the same canonical text fields and `TURN_COMPLETED` | same internal semantics |
| AutoByteus converter | converts native stream segments to `AgentRunEvent`, carries canonical `segment_type`, and emits `TURN_COMPLETED`; also emits `ASSISTANT_COMPLETE` as an extra native event | common turn completion plus one provider-specific duplicate |
| `AgentRunEventMessageMapper` | preserves segment payload/delta and maps `TURN_COMPLETED` directly | native transport receives working semantics |
| native web `AgentStreamingService` | appends nonempty segment delta exactly; completes on `TURN_COMPLETED`, idle status, or assistant-complete | explains why normal AutoByteus works |
| application public projector | separately infers many aliases/kinds/errors, previously omitted canonical `segment_type`, trim-normalizes general strings, and maps only `ASSISTANT_COMPLETE` to `AGENT_RESPONSE_COMPLETED` | duplicates semantic interpretation and drifts from the working path |
| Socratic tutor session | appends only public `SEGMENT_CONTENT`/`kind=TEXT`, waits for `AGENT_RESPONSE_COMPLETED`, and renders tool lifecycle | depends on projector-only concepts unavailable on the Codex completion path |

Root-cause classification: `Boundary Or Ownership Issue` plus `Duplicated Policy Or Coordination`. Provider-native conversion already has owners and `AgentRunEvent` is the shared internal event boundary. The application layer still needs redaction, but not a second general event interpreter.

User-approved proportional response:

- keep provider adapters, native mapper/frontend, transport, authorization, lifecycle, and queues unchanged;
- replace the broad application projector with `ApplicationAgentStreamEventProjector`;
- expose only `TURN_STARTED`, exact `TEXT_DELTA`, `TURN_COMPLETED`, `TURN_INTERRUPTED`, and stable `ERROR`;
- drop thinking, tools, status, segment structure, team coordination, provider data, artifacts/files, and `ASSISTANT_COMPLETE`;
- remove `AGENT_RESPONSE_COMPLETED`; use canonical `TURN_COMPLETED` as sole application success;
- keep artifacts as the durable whole/structured business result; and
- keep the projector as a closed internal extension boundary without adding a plugin/strategy registry or generic chat accumulator.

The preserved dirty projector/test edit only repairs `segment_type` and whitespace in the broad model. It must be discarded/reimplemented from the approved contracted design; no partial Codex changes remain or are allowed.

## Socratic Math Teacher Current Source Read

Authoritative application sources inspected:

- `applications/socratic-math-teacher/agent-teams/socratic-math-team/agents/socratic-math-tutor/agent-config.json`
- `applications/socratic-math-teacher/agent-teams/socratic-math-team/agents/socratic-math-tutor/agent.md`
- `applications/socratic-math-teacher/agent-teams/socratic-math-team/team-config.json`
- `applications/socratic-math-teacher/application.json`
- `applications/socratic-math-teacher/backend-src/services/lesson-runtime-service.ts`
- `applications/socratic-math-teacher/backend-src/services/lesson-read-service.ts`
- `applications/socratic-math-teacher/backend-src/services/lesson-projection-service.ts`
- `applications/socratic-math-teacher/backend-src/event-handlers/on-artifact.ts`
- `applications/socratic-math-teacher/backend-src/domain/lesson-model.ts`
- `applications/socratic-math-teacher/backend-src/graphql/index.ts`
- `applications/socratic-math-teacher/api/graphql/schema.graphql`
- `applications/socratic-math-teacher/frontend-src/socratic-runtime.js`
- `applications/socratic-math-teacher/frontend-src/socratic-renderer.js`
- `applications/socratic-math-teacher/scripts/build-package.mjs`

Observed committed journey at current HEAD (Socratic source introduced/fixed at `e9c130a52`, builder adopted at `cee41e917`):

```text
frontend start form
→ GraphQL startLesson(prompt)
→ persist lesson + student message
→ resolve required lessonTutorTeam slot
→ build configured team launch with llmConfig.reasoning_effort = high
→ startAgentTeam(no initialInput)
→ persist binding correlation
→ return lesson + tutorTargetAddress
→ frontend focused tutor session connects and registers listeners
→ READY → send stored problem exactly once
→ broad application text/tool/completion reducer
→ artifact publish/handler/projection
→ application notification
→ frontend GraphQL refresh
```

Material findings:

- source and generated tutor configs contain exact `codex_app_server`, `gpt-5.6-sol`, and `llmConfig.reasoning_effort: "high"`;
- backend-SDK launch helpers accept/clone neutral `llmConfig`, and Socratic passes high effort while preserving saved runtime/model precedence;
- `startLesson` creates the team without launch-time `initialInput`;
- the lesson projection exposes a typed `tutorTargetAddress` through the committed backend-SDK member builder;
- `askFollowUp` and `requestHint` are mounted-product-reachable GraphQL paths that own only `bindingId`, immediately construct an `AGENT_TEAM_RUN` DTO for `sendInput`, and depend on Orchestration for current authorization;
- `frontend-src/socratic-tutor-session.js` owns standard connection/listeners/READY/send-once/public-event state, while `socratic-runtime.js` owns mounted selection/start/disposal coordination; the session currently consumes broad text/tool/`AGENT_RESPONSE_COMPLETED` events and is the intended minimal-consumer change site;
- mounted **Request hint** and **Send follow-up** remain enabled throughout an active lesson, and both runtime handlers call `beginObservedTurn(...)` before GraphQL without checking whether the prior one-slot join remains unresolved;
- the standard frontend/server input protocol supports distinct pending request IDs, so Socratic cannot rely on hidden framework single-flight behavior;
- `6896bd413` prevents stale async work from reconnecting after disposal/selection changes, and `e9c130a52` preserves exactly one initial send across notification-first and GraphQL-first start returns;
- the one static team member has route key `tutor`, so the business-selected member target is unambiguous;
- the tutor instructions require one `publish_artifacts` call for every response using the allowed normal/hint paths; the tool executes inside the still-active turn and does not establish delivery order against later live events; and
- artifact projection plus notification already creates the durable tutor transcript and must remain authoritative.

## Exact Codex Model And Configuration Probe

Repository/config sources:

- `autobyteus-server-ts/docs/modules/codex_integration.md`
- `autobyteus-ts/docs/provider_model_catalogs.md`
- `autobyteus-server-ts/src/launch-preferences/default-launch-config.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/codex-app-server-model-normalizer.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/codex-thread-bootstrapper.ts`

Local live probe commands on 2026-07-22:

```text
codex --version
codex login status

cd autobyteus-server-ts
node --input-type=module <<'NODE'
import { CodexModelCatalog } from './dist/llm-management/services/codex-model-catalog.js';
import { getCodexAppServerClientManager } from './dist/runtime-management/codex/client/codex-app-server-client-manager.js';
try {
  const models = await new CodexModelCatalog().listModels(process.cwd());
  console.log(models);
} finally {
  await getCodexAppServerClientManager().close();
}
NODE
```

Observed:

- Codex CLI: `codex-cli 0.144.6`;
- login: `Logged in using ChatGPT`;
- real App Server `model/list`: seven models, including exact identifier/value `gpt-5.6-sol`;
- that row supports `low`, `medium`, `high`, `xhigh`, `max`, and `ultra`; current default is `low`;
- `llmConfig.reasoning_effort` is accepted and reaches the Codex turn-start boundary; and
- `service_tier` is independent and is intentionally omitted.

This proves current local catalog and authentication preflight, not a successful live tutor turn. Solution design did not spend a live inference turn.

## Effective Launch Propagation — Closed In Current Source

Inspected:

- `autobyteus-application-backend-sdk/src/launch-profile.ts`
- shared `ApplicationTeamRunPreset` / `ApplicationTeamMemberLaunchConfig` contracts;
- Socratic `resolveConfiguredTeamLaunchProfile(...)` and `buildConfiguredTeamRunLaunch(...)` call.

Current facts at `e9c130a52`:

- shared team preset/member launch contracts support optional `llmConfig`;
- `buildConfiguredTeamRunLaunch(...)` and member construction accept optional neutral `llmConfig`, structured-clone it into produced preset/member outputs, and preserve saved application runtime/model precedence;
- Socratic passes `{ reasoning_effort: "high" }` through the helper;
- backend-SDK tests cover propagation, omission, cloning, and saved runtime/model/workspace precedence; and
- no manifest, profile-persistence, platform GraphQL, or standard connection contract was expanded.

Design consequence: preserve this committed helper and its tests unchanged. The builder delta does not reopen launch configuration design.

## Target-Address Builder And Deferred-Pattern Evidence

Focused source searches inspected:

- `autobyteus-application-sdk-contracts/src/application-agent-bindings.ts` and `src/index.ts`;
- `autobyteus-application-backend-sdk/src/index.ts`;
- Brief Studio and Socratic `scripts/build-package.mjs` backend-SDK vendor synchronization;
- Socratic `backend-src/domain/lesson-model.ts` and its focused projection tests;
- standard communication integration tests that instantiate all three address variants;
- Brief Studio and Socratic `backend-src/services/run-binding-correlation-service.ts`; and
- Socratic `frontend-src/socratic-tutor-session.js`.

Observed address-construction facts at the pre-builder review baseline (now resolved by committed `cee41e917`):

- the canonical type and target discriminants originally existed without backend-SDK construction functions;
- Socratic originally repeated `{ bindingId, target: { kind: "AGENT_TEAM_MEMBER", memberRouteKey: "tutor" } }`; current source uses the member builder;
- framework integration tests also instantiate agent/team/member variants, confirming that the shared address remains a valid direct DTO as well as a candidate for typed builder construction;
- the application backend is the correct public owner because it chooses the binding/member exposed to its frontend; the frontend should continue receiving an already-selected address; and
- construction cannot replace authorization. Active application, same-application binding, nonterminal status, member validity at use time, and runtime availability remain Orchestration decisions.
- current Socratic follow-up/hint input paths do not retain a precise `ApplicationAgentTeamBinding`; fetching one only to invoke the whole-team builder would add an unnecessary authority/network step without improving their one-shot DTO semantics.
- both built-in application build scripts copy every backend-SDK `dist/*.js`/map into their checked-in runtime/importable vendor layers, so adding one public SDK module requires regenerating both applications' vendor mirrors even though only Socratic business source consumes the builder.

Resolved consequence: the three explicit pure backend-SDK functions and Socratic member adoption are committed. They remain preserved behavior and are not part of the pending event-projector refactor.

Observed extraction-pressure facts:

- Brief Studio and Socratic contain similar pending-launch/binding-correlation services, but ephemeral applications do not require durable business-record correlation and different vertical applications can need one-to-one, one-to-many, or no relationship;
- Socratic's live session handles connection readiness, sequence suppression, text/tool/completion presentation, and cleanup, but the user clarified that vertical applications need a much smaller text-stream experience rather than the native product's rich chat surface; and
- the existing framework already supports both direct provider-neutral frontend events and advanced backend `subscribeEventStream(...)` plus optional custom WebSockets for app-specific transformation.

Decision: do not add a correlation repository/protocol or generic live-output accumulator. Contract the standard application stream itself to minimal text/turn/error variants and retain optional backend/custom transformation for special cases. This is deliberate proportionality, not a framework capability blocker.

## Current And Target Spine Findings

| Evidence ID | Finding | Design Consequence |
| --- | --- | --- |
| `CS-001` | standard agent communication framework is implemented and reviewed | preserve; use directly |
| `CS-002` | deterministic socket/worker coverage proves the framework without a provider | retain as regression evidence, not final live proof |
| `CS-003` | Current Socratic source uses the framework-supported two-phase flow: start without input, connect/READY, then send | preserve; optional `initialInput` remains valid elsewhere |
| `CS-004` | Socratic business owns lesson↔binding correlation and chooses static member `tutor`; committed builder returns its exact address | preserve |
| `CS-005` | focused frontend tutor session/live state and mounted lifecycle coordination are committed; broad event consumption failed the real provider journey | retain connection/lifecycle/send-once, replace only broad reducer semantics with minimal stream consumption |
| `CS-006` | artifact/notification transcript path is already durable and healthy | preserve; reconcile ephemeral live draft to durable record |
| `CS-007` | tutor source/generated config already has exact Codex defaults; application configuration intentionally retains higher runtime/model precedence | preserve and configure the application slot exactly for live acceptance |
| `CS-008` | backend SDK helper already propagates/clones optional neutral `llmConfig` | preserve; no parallel Socratic launcher |
| `CS-009` | current source/generated mirrors are synchronized by existing build owners | contracted shared event type/validator and Socratic reducer require normal regeneration/drift checks |
| `CS-010` | mounted desktop application is a real supported product surface | browser-equivalent/full hosted journey is reachable and required |
| `CS-011` | live provider output is nondeterministic but bounded | separate deterministic assertions from qualitative assertions; one clean retry only for defined external causes |
| `CS-012` | previous final score explicitly retained live-provider inference as residual uncertainty | recalculate confidence after `AC-018`; do not copy 96.7% forward |
| `CS-013` | target-address builders/adoption are committed and working | preserve; no reopening |
| `CS-014` | rich chat accumulation is not a universal vertical-application need; exact text streaming is the proven common need | expose five minimal stream variants; defer generic accumulator/rich variants |
| `CS-015` | native backend observation saw 135 assistant-text characters while the standard application stream exposed zero text/completion | projector semantic divergence is the observed root cause; provider/transport/artifact paths stay unchanged |

## Material Premise Classifications

| Premise ID | Premise | Classification | Witness / Consequence |
| --- | --- | --- | --- |
| `MP-001`–`MP-012` | previously reviewed standard framework lifecycle, scope, migration, and mobile premises | Unchanged | implemented round-9 baseline remains authoritative; paired-mobile application access remains Not Reachable |
| `MP-013` | a user starts a lesson in the mounted Socratic desktop application | Reachable / user-required | real application form → GraphQL start → bound tutor team; drives `DS-017` |
| `MP-014` | a live Codex tutor emits nondeterministic delta boundaries/wording | Reachable | exact requested runtime/model; assert contract/liveness deterministically and pedagogy qualitatively |
| `MP-015` | source agent defaults can be overridden by configured resource launch data | Reachable | required `lessonTutorTeam` slot resolves a saved launch profile before helper construction; require effective-config proof |
| `MP-016` | transient Codex service/rate/transport failure | Reachable under external service contract | permit one clean new-run retry; persistent dependency failure is Blocked with evidence |
| `MP-017` | mobile application credential handling is required for the live journey | Not Reachable | application product surface is desktop-only; add no token/auth machinery |
| `MP-018` | build/package validation alone proves the user journey | Contradicted by user acceptance | execute the mounted application and real live model |
| `MP-019` | mounted Socratic follow-up/hint actions construct whole-team input addresses from persisted binding ID | Reachable | desktop UI → GraphQL `askFollowUp`/`requestHint` → lesson runtime → inline `AGENT_TEAM_RUN` DTO → `sendInput` → Orchestration; preserve without a builder-only binding fetch |
| `MP-020` | vertical applications require the complete native AutoByteus chat event surface | Not Reachable / rejected by user | current Socratic business journey needs immediate answer text plus durable artifact; do not project thinking/tools/status/team internals speculatively |
| `MP-021` | standard application text/completion can diverge from the native path | Reachable and observed | same canonical Codex `AgentRunEvent` produced native text/completion while broad application interpretation produced neither; drives projector contraction/parity coverage |
| `MP-022` | Socratic durable refresh can precede later live text/completion for the same active turn | Reachable and observed product path | mounted Start lesson → READY/input → in-turn `publish_artifacts` → asynchronous artifact relay/notification/refresh, independently of later canonical live return; drives only an app-local two-fact join and order-permutation tests |
| `MP-023` | mounted follow-up/hint can be invoked while the prior one-slot join is unresolved | Reachable current product path | active lesson renderer exposes both controls → runtime calls `beginObservedTurn` → GraphQL/sendInput while prior live/artifact returns still target the same session; drives a local synchronous admission guard and re-entry tests only |

The product-reachability rule is applied from supported user journeys, not imaginative technical states. `MP-013` is reachable because the current application menu/mount and lesson form are actual desktop product paths. `MP-019` separately records the mounted follow-up/hint paths so construction policy does not erase or overcomplicate them. Mobile/token scenarios remain excluded.

## Revised Composite Journey / `DS-017`

```text
desktop user
→ mounted Socratic frontend
→ GraphQL startLesson (persist prompt; start team without initial input)
→ Application Orchestration (binding)
→ backend-SDK static-member target-address builder
→ lesson projection with tutor-member target address
→ ApplicationClient.agentCommunication.connect
→ Socratic synchronously reserves its one local turn slot
→ Communication/Streaming READY
→ connection.sendInput(stored problem)
→ bound Codex tutor member gpt-5.6-sol/high
   ├─ sibling live return: canonical events → TEXT_DELTA(s) → live terminal
   └─ sibling durable return: in-turn publish_artifacts → async relay → notification/GraphQL refresh
→ Socratic local join using pre-input tutor-message baseline
→ visibly streamed draft, then one authoritative durable tutor transcript in either order
→ release one next follow-up/hint only if lesson/connection remain active
→ closeLesson/terminate → BINDING_ENDED → exact cleanup
```

There is no ordering edge between the two sibling returns. Live-first retains the completed draft until durable observation. Durable-first records the new row but presentation-defers only newly added tutor rows so later deltas remain visibly streamed; live terminal then reveals the row and clears the draft. Durable success remains monotonic across later interruption/error/close, while a later durable result upgrades an earlier live failure. Because the reducer owns one baseline, the session admits only `available`, synchronously rejects double/cross-action attempts before mutation/GraphQL, keeps ambiguous request failures locked, and leaves Close lesson available. The standard connection remains multi-request capable. This is local Socratic session/runtime/renderer state, not a framework queue, correlation store, public turn ID, single-flight rule, or accumulator.

The detailed sequence, UI states, assertion split, timing/retry policy, and propagation map are authoritative in [`socratic-math-live-journey.md`](./socratic-math-live-journey.md).

## Executable Coverage Evidence And New Gap

The previous API/E2E report remains authoritative for the implemented framework and records:

- live loopback standard agent WebSocket integration;
- custom backend WebSocket and real child worker IPC;
- backend observer activation/delivery;
- deterministic public projection, sequencing, lifecycle, backpressure, authorization, and failure coverage;
- strict v4/generated-package validation;
- independent notifications/artifacts; and
- desktop bootstrap/no-auth scope.

Expanded-scope preparation against the committed Socratic source and later builder HEAD records:

1. exact Codex binary/login/model/high preflight: `Pass`;
2. backend-SDK/package build and source/generated idempotency: `1 file / 3 tests` plus drift checks `Pass`;
3. focused Socratic deterministic suite: `6 files / 29 tests` `Pass`;
4. server production build: `Pass`;
5. affected application/framework regressions: `18 files / 146 tests` `Pass`;
6. web-host regressions: `5 files / 13 tests` `Pass`; and
7. builder implementation/source review/package propagation: `Pass` at `cee41e917` / `3e48c0ea2`.

The next retained run under `evidence/ac018-ac019-round3/` executed the real mounted journey. It proved exact model/config, READY, one input/acceptance, tool activity, nonempty native backend text (`135` characters), artifact publication, notification, durable transcript, mathematical relevance, and cleanup. It failed only the standard selected-member public stream assertion: no application text and no completion within `180s`. No retry was allowed because this was deterministic framework behavior, not provider nondeterminism.

These are preserved execution facts, not final sign-off. After the revised event contract/projector/Socratic consumer passes architecture and source review, API/E2E must proportionately rerun contract/socket/package coverage and the same bounded live journey, then recalculate confidence. It must assert `TEXT_DELTA`/`TURN_COMPLETED`, not the superseded broad event union.

## Persisted Data Evidence

Decision: `Directly Usable — No Migration`.

| Area | Evidence |
| --- | --- |
| application lessons/messages | no new column or stored-format requirement; target address is transiently built from the authoritative binding plus static member key |
| framework bindings/artifacts | unchanged implemented reader/writer semantics |
| launch defaults | source/package configuration and in-memory launch object, not application database schema |
| live UI state | memory-only connection/draft state |
| build outputs | regenerated artifacts, not migrated user data |
| preservation | existing lesson/binding/artifact data remains readable without version branching |

Forbidden: new DDL, migration service/script, replay/checkpoint store, compatibility reader, credential/grant persistence, or mobile-specific path.

## Exact User-Approved Expanded Direction

1. Use exact `codex_app_server` / `gpt-5.6-sol` / `reasoning_effort: high` for the Socratic tutor.
2. Prove the effective team-member launch configuration, not only source JSON.
3. Make the real Socratic mounted UI use the standard application-agent connection.
4. Start the team without initial input, then connect/READY/send so the first response is observable.
5. Let Socratic business select static member `tutor` and return the exact address produced by the backend-SDK member builder.
6. Render only ordered `TEXT_DELTA` and minimal turn/error lifecycle while retaining the artifact transcript as durable source of truth.
7. Execute one bounded real Codex application journey with clear deterministic/qualitative assertions, environment dependencies, retry policy, and cleanup.
8. Recalculate API/E2E confidence; preserve `96.7%` only as historical prior-scope evidence.
9. Preserve desktop-only/no-application-auth scope and all existing framework boundaries.
10. Preserve the committed typed target-address builders and Socratic member adoption.
11. Do not add generic binding/business correlation support, a chat accumulator, or rich native event projection; revisit only with more vertical-application evidence.
12. Use `ApplicationAgentStreamEventProjector` as a small closed extension boundary: text plus turn/error now, additional transformations only after a reachable product journey proves them.

No open user requirement question blocks fresh architecture review.

## Material Investigation Commands

```text
git status --short --branch
git rev-parse HEAD origin/personal
git log --oneline --decorate -15
rg -n "agentCommunication|ApplicationAgentTargetAddress|ApplicationAgentStreamingService" autobyteus-* applications
rg -n -U "bindingId:\s*[^,]+,\s*\n\s*target:\s*\{" applications autobyteus-* --glob '!**/dist/**' --glob '!**/vendor/**'
rg -n "createApplicationAgent(Target|TeamTarget|TeamMemberTarget)Address" autobyteus-* applications
find applications -path '*/backend-src/services/run-binding-correlation-service.ts' -not -path '*/dist/*' -print
rg -n "lastSequence|SEGMENT_CONTENT|AGENT_RESPONSE_COMPLETED|connection.ready" applications/socratic-math-teacher/frontend-src/socratic-tutor-session.js
find applications/socratic-math-teacher -maxdepth 5 -type f | sort
rg -n "startLesson|startAgentTeam|initialInput|buildConfiguredTeamRunLaunch|lessonTutorTeam" applications/socratic-math-teacher autobyteus-application-backend-sdk/src/launch-profile.ts
sed -n ... applications/socratic-math-teacher/backend-src/services/lesson-runtime-service.ts
sed -n ... applications/socratic-math-teacher/frontend-src/socratic-runtime.js
sed -n ... autobyteus-application-backend-sdk/src/launch-profile.ts
cat applications/socratic-math-teacher/agent-teams/socratic-math-team/agents/socratic-math-tutor/agent-config.json
cat applications/socratic-math-teacher/dist/importable-package/applications/socratic-math-teacher/agent-teams/socratic-math-team/agents/socratic-math-tutor/agent-config.json
codex --version
codex login status
# real Codex App Server model/list probe shown above
```

No internet research was required; repository source plus the locally installed Codex App Server catalog are the relevant authorities.

## Documentation Validation Status

Completed for the revised seven-artifact solution-designer package after architecture round-16 rework:

- every relative Markdown link resolves; all fences are balanced; all files end with a newline;
- stable IDs remain continuous and unique: `BEH-001`–`BEH-012`, `REQ-001`–`REQ-019`, `AC-001`–`AC-019`, `UC-001`–`UC-009`, and `DS-001`–`DS-018`;
- all `27` Mermaid blocks rendered successfully with `@mermaid-js/mermaid-cli` `11.9.0`; extraction manifest and SVG evidence are under `/tmp/app-stream-r16-mermaid.DPOvLL`;
- `git diff --check` passes for all seven solution-designer-owned core/supplement artifacts;
- focused searches find no active assertion that builders remain unimplemented, that the real Codex journey was not run, or that Socratic must consume the superseded broad completion/text contract;
- removed event/type names appear only in current-state evidence, explicit removal rules, negative tests, or compatibility rejection; and
- no production source, generated package, provider runtime, or live inference was changed/run by solution design during this revision.

Architecture round 16 resolved `DR-015`/`DR-016`, confirmed the minimal framework event boundary and sibling-return join, and returned `DR-017`. This revision defines the bounded Socratic-local sequential-turn admission invariant and is ready for a fresh architecture gate. Downstream-owned dirty reports/logs/evidence and the two implementation-owned uncommitted broad-projector edits remain preserved; repository-wide cleanliness is not claimed.
