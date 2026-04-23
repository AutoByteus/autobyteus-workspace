# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Simplify `publish_artifact` into one file-based cross-runtime artifact publication contract and make published artifacts a first-class platform concept that is distinct from generic run file changes.

Today the platform mixes two different ideas:
1. low-level file changes that happen while an agent works, and
2. intentional final outputs that an agent explicitly wants to publish as artifacts.

The user clarified that these are not the same thing. An agent may create or edit many files during execution, but only a smaller set of intentionally published files should count as artifacts. The current `publish_artifact` tool is also overly application-specific and asks the agent to provide internal/publication-management fields (`contractVersion`, `artifactKey`, `artifactType`, `title`, `summary`, `metadata`, `artifactRef`) instead of the real product meaning: the agent publishes a file it produced.

## Investigation Findings

- The current `publish_artifact` tool is defined in the application-orchestration layer and currently accepts a rich application publication payload instead of a simple file path (`autobyteus-server-ts/src/application-orchestration/tools/publish-artifact-tool.ts`, `autobyteus-server-ts/src/application-orchestration/services/application-artifact-publication-validator.ts`).
- `contractVersion` is currently only validated against the literal string `"1"`; no multi-version runtime behavior exists behind the tool today (`autobyteus-server-ts/src/application-orchestration/services/application-artifact-publication-validator.ts`).
- `artifactKey` is described as an upsert key, but current downstream usage is weak: Brief Studio stores it, yet its repository conflict key is `(brief_id, artifact_kind)` rather than `artifact_key`, and Socratic Math does not use it for projection logic (`applications/brief-studio/backend-src/repositories/artifact-repository.ts`, `applications/socratic-math-teacher/backend-src/services/lesson-projection-service.ts`).
- `artifactType`, `title`, `summary`, and `metadata` are currently application-authored fields that Brief Studio and Socratic Math use because the tool was designed around application projection payloads instead of file publishing (`applications/brief-studio/backend-src/services/brief-projection-service.ts`, `applications/socratic-math-teacher/backend-src/services/lesson-projection-service.ts`).
- The current `publish_artifact` tool is only available through the native AutoByteus registry-instantiation path. Codex and Claude runtimes expose only selected dynamic/allowed tools and do not currently surface `publish_artifact` (`autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts`, `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`, `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts`).
- The broader platform already has file-based run-change artifact projections (`ARTIFACT_PERSISTED`, `ARTIFACT_UPDATED`, run-file-changes normalization, artifact viewer UI), but that path currently represents file-change state and not intentional published artifacts (`autobyteus-server-ts/src/agent-execution/domain/agent-run-event.ts`, `autobyteus-server-ts/src/services/run-file-changes/run-file-change-projection-normalizer.ts`, `autobyteus-web/stores/runFileChangesStore.ts`).
- The user explicitly clarified that published artifacts must become their own authoritative artifact boundary and that run file changes must no longer be treated as artifacts for product semantics.
- Current application-bound `publish_artifact` semantics are coupled to the application execution journal: the tool does not return success until `appendRuntimeArtifactEvent(...)` succeeds, and apps receive artifact business input through `eventHandlers.artifact` on the journal path rather than through a shared published-artifact boundary (`autobyteus-server-ts/src/application-orchestration/tools/publish-artifact-tool.ts`, `autobyteus-server-ts/src/application-orchestration/services/application-execution-event-ingress-service.ts`, `autobyteus-application-sdk-contracts/src/index.ts`).
- The application engine can already invoke application handlers directly, and application workers already have `lifecycle.onStart` plus `context.runtimeControl.*`, so applications can reconcile against a durable published-artifact store without requiring artifact-specific journal append/retry semantics (`autobyteus-server-ts/src/application-engine/services/application-engine-host-service.ts`, `autobyteus-server-ts/src/application-engine/worker/application-worker-runtime.ts`, `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts`).
- Brief Studio and Socratic Math currently teach agents to use the old payload shape and project inline JSON/body-based artifacts rather than published files (`applications/brief-studio/agent-teams/brief-studio-team/agents/researcher/agent.md`, `applications/brief-studio/agent-teams/brief-studio-team/agents/writer/agent.md`, `applications/socratic-math-teacher/agent-teams/socratic-math-team/agents/socratic-math-tutor/agent.md`).

## Recommendations

- Redefine the agent-facing `publish_artifact` contract to a file-based shape:
  - required: `path`
  - optional: `description`
- Remove `contractVersion`, `artifactKey`, `artifactType`, `title`, `summary`, `metadata`, and agent-authored `artifactRef` from the agent-facing contract.
- Make `publish_artifact` available across all supported run runtimes (`autobyteus`, `codex_app_server`, `claude_agent_sdk`) with one shared user-facing contract.
- Treat published artifacts as a dedicated authoritative platform boundary, not as a synonym for generic run file changes.
- Keep run file changes as low-level workspace-change telemetry. Published-artifact truth moves to the dedicated published-artifact path, but the current frontend Artifacts tab remains a run-file-change surface in this ticket and must not be repurposed.
- Treat any published-artifact display in the web UI as follow-up only; no current frontend surface changes are in scope for this ticket.
- Use one authoritative live/runtime artifact event shape: `ARTIFACT_PERSISTED`. Do not keep a second `ARTIFACT_UPDATED` artifact event for this product boundary.
- Let the platform/application derive file kind, preview type, and renderer selection from the published file path and resolved file content instead of asking the agent to provide type metadata.
- Let applications consume published artifacts directly from the shared published-artifact boundary rather than appending artifact entries into the application execution journal.
- Keep artifact publication success dependent only on durable published-artifact persistence. Any application-facing live artifact notification must be non-blocking relative to publish success.
- Let application backends treat live artifact delivery as a low-latency hint and use runtime-control published-artifact queries plus app-owned revision-id reconciliation to recover missed deliveries.
- Update Brief Studio and Socratic Math to consume file-based published artifacts and stop depending on the old payload fields.

## Scope Classification (`Small`/`Medium`/`Large`)

Large

## In-Scope Use Cases

- `UC-PA-001`: An agent publishes one produced file as an artifact using a minimal file-based tool contract.
- `UC-PA-002`: The same `publish_artifact` contract works across AutoByteus, Codex, and Claude runtimes.
- `UC-PA-003`: The platform distinguishes intentional published artifacts from generic file changes produced during work.
- `UC-PA-004`: A downstream application/runtime consumer or future separately designed product surface can later query published artifacts without inferring them from run file changes.
- `UC-PA-005`: Brief Studio publishes and projects file-based artifacts without the old application-specific payload fields.
- `UC-PA-006`: Socratic Math publishes and projects file-based artifacts without the old application-specific payload fields.
- `UC-PA-007`: For an application-bound run, the application receives live `ARTIFACT_PERSISTED` notifications directly from the shared artifact boundary instead of through application-journal artifact append semantics.
- `UC-PA-008`: If a live application artifact notification is missed or fails, including after the producing bound run has already terminated or become orphaned, the application can reconcile from durable published-artifact queries without redefining artifact truth through application-journal retry state.

## Out of Scope

- Review Mode / Team Board UI implementation.
- New artifact-review UI behavior beyond the platform/artifact boundary needed to support it later.
- Repointing, redesigning, or reinterpreting the current frontend `Artifacts` tab; that tab remains a legacy run-file-change surface in this ticket.
- Any published-artifact display in the existing web UI unless/until a separate design explicitly introduces one.
- Redesign of generic file-change telemetry or removal of file-change tracking itself.
- Broad application-shell redesign.

## Functional Requirements

- `REQ-PA-001`: The agent-facing `publish_artifact` tool contract must accept exactly one required field, `path`, plus one optional field, `description`.
- `REQ-PA-002`: The agent-facing `publish_artifact` contract must not require or accept `contractVersion`, `artifactKey`, `artifactType`, `title`, `summary`, `metadata`, or agent-authored `artifactRef`.
- `REQ-PA-003`: `publish_artifact.path` must identify a concrete file produced by the run and resolvable by the platform within the run's accessible workspace context.
- `REQ-PA-004`: The platform must derive producer provenance, timestamps, and other internal publication metadata from runtime context and publication time instead of asking the agent to provide them.
- `REQ-PA-005`: Published artifacts must become a dedicated authoritative artifact boundary distinct from generic run file changes.
- `REQ-PA-006`: Run file changes must remain available as low-level workspace-change telemetry, but artifact-facing product behavior must not treat generic file-change projections as the source of truth for published artifacts.
- `REQ-PA-007`: The platform must expose `publish_artifact` with the same user-facing contract across `autobyteus`, `codex_app_server`, and `claude_agent_sdk` runtimes for supported single-agent and team-member runs.
- `REQ-PA-008`: The platform must persist and surface published artifact events independently of the generic run-file-change path so application/runtime consumers in this ticket, and any future separately designed artifact UI later, can consume real published artifacts directly.
- `REQ-PA-009`: File kind / preview / renderer behavior for published artifacts must be derived by the system from the published file path and resolved content rather than agent-provided artifact-type metadata.
- `REQ-PA-010`: Brief Studio must be redesigned to publish and project file-based artifacts and must stop depending on `contractVersion`, `artifactKey`, `artifactType`, `title`, `summary`, `metadata`, and inline-JSON `artifactRef` payloads.
- `REQ-PA-011`: Socratic Math Teacher must be redesigned to publish and project file-based artifacts and must stop depending on `contractVersion`, `artifactKey`, `artifactType`, `title`, `summary`, `metadata`, and inline-JSON `artifactRef` payloads.
- `REQ-PA-012`: The target design must remove the old agent-facing publication contract instead of preserving it behind backward-compatibility wrappers or dual-path behavior.
- `REQ-PA-013`: The authoritative published-artifact event emitted for product/runtime consumers must be `ARTIFACT_PERSISTED`; the target design must not require a parallel `ARTIFACT_UPDATED` event for the published-artifact boundary.
- `REQ-PA-014`: Application-bound artifact business handling must consume the shared published-artifact boundary directly rather than relying on artifact append into the application execution journal.
- `REQ-PA-015`: Live application artifact delivery must be best-effort and must not gate or roll back successful published-artifact persistence.
- `REQ-PA-016`: The platform must expose runtime-control published-artifact list/read methods so application backends can reconcile from durable published-artifact truth for any bound run status, including `TERMINATED` and `ORPHANED` bindings.
- `REQ-PA-017`: Application reconciliation must not scope missed-delivery catch-up to active/nonterminal bindings only; it must continue across terminated/orphaned bindings until all unprojected published `revisionId`s for those bindings are projected, using an app-owned completion checkpoint or equivalent safe selector.
- `REQ-PA-018`: Brief Studio and Socratic Math must treat published artifact `revisionId` as the app-owned idempotent projection key so missed or repeated live deliveries do not duplicate business artifacts/history rows.
- `REQ-PA-019`: The existing frontend `Artifacts` tab must remain backed by run file changes only; this ticket must not repurpose that tab to display published artifacts.
- `REQ-PA-020`: Published-artifact display in the web UI is out of scope for this ticket and must not be introduced implicitly through hydration, streaming, or source-of-truth rewiring.

## Acceptance Criteria

- `AC-PA-001`: A valid `publish_artifact` agent call consists of `path` plus optional `description`, and no longer requires any old publication payload fields.
- `AC-PA-002`: Supplying removed legacy fields to the agent-facing `publish_artifact` contract is no longer the normal required path for successful publication.
- `AC-PA-003`: Publishing a path that does not resolve to a concrete run-accessible file is rejected with a clear validation failure.
- `AC-PA-004`: AutoByteus, Codex, and Claude runtime agents can all invoke `publish_artifact` using the same user-facing contract.
- `AC-PA-005`: A generic file change that was not intentionally published does not appear as a published artifact solely because it was written or edited during the run.
- `AC-PA-006`: An application/runtime consumer can query/observe published artifacts without reconstructing them from run file changes, and any future artifact UI can reuse that same boundary later.
- `AC-PA-007`: The platform derives artifact file-kind / preview behavior without requiring the agent to supply artifact-type metadata.
- `AC-PA-008`: Brief Studio no longer teaches or depends on the old application-specific publish payload shape.
- `AC-PA-009`: Socratic Math Teacher no longer teaches or depends on the old application-specific publish payload shape.
- `AC-PA-010`: The old agent-facing publish-artifact payload shape is removed rather than retained as a parallel legacy path.
- `AC-PA-011`: Published artifact live/runtime delivery uses `ARTIFACT_PERSISTED` as the single authoritative artifact event rather than splitting the published-artifact boundary across `ARTIFACT_PERSISTED` and `ARTIFACT_UPDATED`.
- `AC-PA-012`: Application-bound artifact handling no longer depends on appending artifact payloads into the application execution journal.
- `AC-PA-013`: If artifact persistence succeeds but live application artifact delivery fails or the application worker is unavailable, the artifact still remains durably queryable as published and the publish operation still reports success.
- `AC-PA-014`: Application backends can list published artifacts for a bound run and read one published revision through runtime control even after that binding is `TERMINATED` or `ORPHANED`.
- `AC-PA-015`: Application reconciliation does not stop at active bindings only; a missed live relay followed by run termination still gets recovered from durable published-artifact truth before the terminal binding is considered catch-up complete.
- `AC-PA-016`: Brief Studio and Socratic Math project artifact revisions idempotently by `revisionId`, so replay/reconciliation does not create duplicate application-side records.
- `AC-PA-017`: After this ticket, the current frontend `Artifacts` tab still shows run file changes rather than published artifacts.
- `AC-PA-018`: No new published-artifact hydration/streaming path is wired into the existing web UI in this ticket.

## Constraints / Dependencies

- Existing app-owned publication/projector code in Brief Studio and Socratic Math depends on the current payload shape and must be updated in this ticket.
- Existing file-change telemetry and file viewers remain useful, and the current frontend Artifacts tab remains one of those legacy file viewers in this ticket, but they cannot define published-artifact semantics.
- Cross-runtime exposure must fit the real runtime tooling models of AutoByteus, Codex, and Claude rather than assuming one registry-instantiation path is enough.
- The file-based artifact boundary must remain compatible with later artifact-review surfaces, but those UI changes are out of scope here and must not alter the current web UI in this ticket.
- Application artifact business handling will move off the current application execution journal `ARTIFACT` path and onto a direct published-artifact boundary plus app-owned reconciliation.

## Assumptions

- `description` remains optional; the file path itself is the primary artifact identity visible to the agent.
- The product meaning of an artifact is an intentional published file, not every intermediate file mutation.
- Applications that need richer business semantics should derive them from file location/content/producer/application logic rather than requiring the agent to send a larger publication payload.
- For applications, live artifact callbacks are convenience signals; the durable source of truth is the published-artifact store plus revision reads.

## Risks / Open Questions

- Brief Studio currently uses old semantic labels to drive business status transitions, so its redesign must choose a new derivation rule that does not reintroduce artifact-type payloads under another name.
- Socratic Math currently distinguishes hints from normal responses through `artifactType`; redesign should use a clearer non-artifact publication signal if that distinction still matters.
- App-owned reconciliation must be explicit enough that a missed live artifact callback does not leave Brief Studio or Socratic silently stale, especially once the producing binding has already become `TERMINATED` or `ORPHANED`.

## Requirement-To-Use-Case Coverage

- `REQ-PA-001` -> `UC-PA-001`
- `REQ-PA-002` -> `UC-PA-001`, `UC-PA-005`, `UC-PA-006`
- `REQ-PA-003` -> `UC-PA-001`
- `REQ-PA-004` -> `UC-PA-001`, `UC-PA-004`
- `REQ-PA-005` -> `UC-PA-003`, `UC-PA-004`
- `REQ-PA-006` -> `UC-PA-003`, `UC-PA-004`
- `REQ-PA-007` -> `UC-PA-002`
- `REQ-PA-008` -> `UC-PA-004`
- `REQ-PA-009` -> `UC-PA-001`, `UC-PA-004`
- `REQ-PA-010` -> `UC-PA-005`
- `REQ-PA-011` -> `UC-PA-006`
- `REQ-PA-012` -> `UC-PA-001`, `UC-PA-002`, `UC-PA-003`
- `REQ-PA-013` -> `UC-PA-003`, `UC-PA-004`
- `REQ-PA-014` -> `UC-PA-007`
- `REQ-PA-015` -> `UC-PA-007`
- `REQ-PA-016` -> `UC-PA-008`
- `REQ-PA-017` -> `UC-PA-008`
- `REQ-PA-018` -> `UC-PA-008`
- `REQ-PA-019` -> `UC-PA-003`
- `REQ-PA-020` -> `UC-PA-004`

## Acceptance-Criteria-To-Scenario Intent

- `AC-PA-001` -> agent author publishes one intentional file artifact.
- `AC-PA-002` -> platform no longer burdens the agent with internal publication-management fields.
- `AC-PA-003` -> invalid file publication is caught early and clearly.
- `AC-PA-004` -> runtime choice does not change the artifact publication contract.
- `AC-PA-005` -> file editing noise is kept separate from real artifacts.
- `AC-PA-006` -> application/runtime consumers consume real published artifacts directly and future UI can reuse the same boundary later.
- `AC-PA-007` -> renderer/type semantics are system-derived, not agent-authored.
- `AC-PA-008` -> Brief Studio migrates off the legacy contract.
- `AC-PA-009` -> Socratic Math migrates off the legacy contract.
- `AC-PA-010` -> modernization is a clean-cut replacement, not dual behavior.
- `AC-PA-011` -> published-artifact transport stays singular and unambiguous for downstream consumers.
- `AC-PA-012` -> applications no longer redefine artifact truth through journal append.
- `AC-PA-013` -> live app delivery failure does not change artifact publish success.
- `AC-PA-014` -> apps can reconcile from durable artifact truth even after run termination.
- `AC-PA-015` -> terminal/orphaned bindings stay in catch-up scope until revision recovery is complete.
- `AC-PA-016` -> app projection remains duplicate-free under replay/reconciliation.
- `AC-PA-017` -> current web file-change UI remains unchanged.
- `AC-PA-018` -> published-artifact web UI stays out of scope in this ticket.

## Approval Status

Approved by user on 2026-04-21, with subsequent clarifications that `ARTIFACT_PERSISTED` is the only authoritative published-artifact event, application-journal artifact forwarding is removed in favor of direct application consumption of the shared published-artifact boundary, and the existing frontend `Artifacts` tab must remain a run-file-change surface rather than a published-artifact viewer in this ticket.
