# Requirements

## Status

- Current Status: `Refined (Post-Round-92; UC-016..UC-024 implemented with expanded UC-021/UC-022 validation depth)`
- Updated On: `2026-02-25`

## Goal / Problem Statement

Continue the Codex app server integration redesign so it is explicitly based on the `personal` branch architecture, correcting ticket assumptions that were inherited from enterprise-era distributed team command flow.
Also close the discovered frontend requirement gap so runtime selection is user-visible and actually propagated into run creation/continuation payloads.

## Scope Classification

- Classification: `Medium`
- Rationale:
  - Cross-cutting design impact across backend runtime command ingress plus frontend run-configuration UI/state/GraphQL artifacts.
  - No new storage schema change is required in this pass.
  - This pass now includes requirement/design/implementation correction for runtime-selection UX parity.

## In-Scope Use Cases

- UC-001: Create run with runtime kind selection.
- UC-002: Send user turn through runtime command ingress.
- UC-003: Continue inactive run via migrated runtime reference.
- UC-004: Stop generation via runtime interrupt.
- UC-005: Team tool approval/denial through runtime command ingress using personal direct routing (`invocation_id` + target member identity), not approval tokens.
- UC-006: Runtime event normalization to websocket with deterministic envelope identity and pre-connect policy.
- UC-007: Runtime-scoped model listing/reload/preload via runtime model catalog.
- UC-008: Runtime transport/session failure handling and cleanup.
- UC-009: Codex App Server notification methods are explicitly mapped to core/runtime event primitives (or deterministic fallback), including legacy alias normalization, with no silent-drop path.
- UC-010: Frontend run configuration exposes runtime selection and propagates it end-to-end (UI -> store -> GraphQL mutation -> backend runtime ingress), with deterministic defaulting and resume display semantics.
- UC-011: Existing-run runtime immutability is explicitly surfaced in resume/edit-config UX; runtime selector is locked when backend editable flags disallow runtime changes.
- UC-012: Run termination lifecycle is explicitly modeled end-to-end (UI terminate action -> GraphQL terminate mutation -> runtime/local shutdown -> run-history inactive state update), with deterministic failure handling.
- UC-013: Reopen/reconnect live-handoff behavior is explicitly modeled (projection replay + resume config hydration + live-stream handoff without clobbering subscribed live context).
- UC-014: Runtime method alias normalization is applied consistently for both websocket mapping and run-history status persistence so ACTIVE/IDLE lifecycle tracking is deterministic across canonical and legacy method forms.
- UC-015: Runtime notification adaptation remains backend-owned and segment-first: Codex methods are isolated behind a dedicated adapter boundary, and backend streaming contracts keep `SEGMENT_EVENT` as canonical core flow with no legacy `ASSISTANT_CHUNK` websocket path.
- UC-016: Reopened Codex runs can hydrate conversation history from Codex thread APIs (`thread/read` / `thread/list`) when local projection is incomplete, while keeping frontend runtime-agnostic.
- UC-017: Codex model thinking metadata is surfaced and executable end-to-end: model list exposes reasoning options/defaults, run config supports reasoning selection, and Codex turn dispatch applies selected reasoning effort.
- UC-018: Codex thread-history projection transformation is deterministic and complete: turn/item ordering, text/reasoning segment folding, and tool-call/result stitching map to existing projection conversation schema.
- UC-019: Codex model metadata normalization is deterministic: reasoning capability fields from `model/list` become backend `display_name` labels and schema-driven `configSchema.reasoning_effort` with validated enum/default values.
- UC-020: Codex reasoning effort persistence/application parity is deterministic across lifecycle: selected reasoning effort persists in manifest, is restored into runtime session defaults, and is applied to every Codex `turn/start`.
- UC-021: Reopen reasoning-config reconciliation is deterministic: persisted reasoning config from manifest is validated against current model schema on reopen, invalid values are sanitized without runtime-specific frontend branches, and run continuity is preserved.
- UC-022: Continuation config source-of-truth is deterministic: when continuing inactive runs without explicit overrides, manifest-stored `llmModelIdentifier` + `llmConfig` (including reasoning settings) are restored and used as runtime defaults.
- UC-023: Runtime capability gating is deterministic: runtime availability is backend-owned and runtime selector/options are filtered by backend capability state (for example Codex disabled/unavailable), with no runtime-specific hardcoded checks in frontend.
- UC-024: Runtime degradation command policy is deterministic: capability gating is operation-scoped so send/approve paths fail fast when unavailable, while safety/read paths (terminate/cleanup/projection open) remain available with explicit degraded behavior.

## Acceptance Criteria

1. Personal baseline alignment
- Design and call-stack artifacts do not depend on enterprise distributed team command ingress/token abstractions.
- UC-005 contract aligns with personal `agent-team-stream-handler` style inputs and routing semantics.

2. Runtime architecture continuity
- Server-owned runtime adapter architecture remains the target (`runtime-execution` + adapter registry + command ingress).
- Existing design goals for run-history/runtime parity and websocket determinism remain intact.

3. Review gate integrity
- Runtime call-stack review records the personal-alignment finding and write-back.
- `Go` is reconfirmed only after two consecutive clean rounds after the write-back.

4. Documentation completeness for current stage
- `investigation-notes.md` and `requirements.md` exist and are current for this ticket.
- `proposed-design.md`, `proposed-design-based-runtime-call-stack.md`, and `runtime-call-stack-review.md` are version-aligned after the update.

5. Core-event compatibility sufficiency
- Design/call-stack artifacts include explicit method-level coverage mapping for Codex App Server notifications (for example `turn/started`, `item/outputText/delta`, `item/commandExecution/requestApproval`, `error`) to core/runtime event primitives.
- Legacy aliases (`turn.*`, `item.*`) must be normalized to canonical method names before mapper branching.
- Known methods must map to typed server/runtime events; unknown methods must follow deterministic non-silent fallback behavior.

6. Data workflow clarity
- `proposed-design.md` includes explicit end-to-end data workflow for command ingress, runtime event normalization/persistence/mapping/fanout, and reconnect replay/live handoff.

7. Frontend runtime-selector parity
- Agent run configuration UI includes a runtime selector (minimum values: `autobyteus`, `codex_app_server`) before first run.
- Selected runtime is persisted in run-config state and sent as `runtimeKind` in run-launch/continue payload.
- Resume config fetch includes runtime fields (`runtimeKind`, `runtimeReference`) and UI reflects runtime for existing runs.
- Frontend GraphQL generated types are refreshed and include runtime fields for send/continue/resume shapes.

8. Real Codex runtime transport (no stub path)
- Codex runtime adapter and runtime model provider execute against real `codex app-server` transport via server-owned client/session service.
- Live e2e validation (`RUN_CODEX_E2E=1`) covers model listing and run create/continue/terminate for `codex_app_server`.
- Ticket artifacts must not report Codex runtime as "not configured" once real transport tests are green.

9. Runtime immutability parity across backend/frontend
- Backend resume config exposes explicit runtime editability (`editableFields.runtimeKind`).
- Frontend run-open flow consumes runtime editability and disables runtime switching for existing runs.
- Attempted runtime changes for existing runs are prevented in UI before mutation dispatch, matching backend invariant enforcement.

10. Termination lifecycle completeness
- A dedicated use case models runtime/local termination as distinct from interrupt/stop-generation behavior.
- Termination path updates run-history status to inactive and cleans runtime session bindings when termination succeeds.
- Failure path preserves context/history state and surfaces deterministic error messaging.

11. Reconnect/live-handoff completeness
- Opening an active run must choose the correct handoff strategy (`KEEP_LIVE_CONTEXT` vs projection hydration) based on existing subscribed context state.
- Subscribed live context is not overwritten by projection hydration during reopen.
- Active run reopen still ensures stream attachment and deterministic config patching.

12. Runtime-status alias parity completeness
- Run-history runtime status derivation must use the same canonical method normalization policy as websocket runtime-event mapping.
- Alias-form methods (`turn.started`, `turn.completed`) and canonical methods (`turn/started`, `turn/completed`) must produce equivalent ACTIVE/IDLE status transitions.
- Verification must include explicit alias-form runtime-event status assertions in run-history service/unit or integration coverage.

13. Codex event-adapter and segment-flow strictness
- Codex method-to-websocket mapping must be implemented in a dedicated adapter module, not mixed into generic stream-event mapper branching.
- Codex text/reasoning runtime notifications (`item/outputText/*`, `item/reasoning/*`) must map to segment-compatible websocket envelopes (`SEGMENT_CONTENT`/`SEGMENT_END`) with deterministic `id` + `delta`.
- Backend websocket protocol must not expose `ASSISTANT_CHUNK` message type in steady state; `SEGMENT_EVENT` remains the canonical core-stream input for assistant deltas.
- Frontend streaming path must not contain runtime-specific `ASSISTANT_CHUNK` dispatch/bridge logic in steady state.
- Segment-content events that arrive before start events must follow deterministic fallback behavior (auto-create text segment) instead of dropping content.

14. Codex history replay and continue-chat parity
- For `runtimeKind=codex_app_server`, reopen/run-projection flow must provide deterministic conversation replay even when local raw traces are partial.
- Backend must own Codex-thread history ingestion/projection; frontend remains runtime-agnostic and consumes the same projection contract.
- When Codex thread history cannot be fetched, backend must fallback deterministically to local projection and continue-chat must still work.
- Continue-run flow must keep using persisted `runtimeReference.threadId` and update manifest thread id when runtime emits newer id.

15. Runtime-pluggable run projection separation of concern
- Run projection retrieval must be runtime-pluggable (provider/adapter style) instead of embedding Codex-specific branching directly in generic projection service logic.
- Default local-memory projection remains a provider, and Codex thread-history projection is a separate provider selected by runtime kind.
- Provider fallback order must be deterministic (`runtime provider -> local projection provider`) and visible in logs for diagnosis.

16. Codex thinking metadata/config parity
- Runtime model list for `codex_app_server` must expose reasoning capability metadata in a model-agnostic contract (`configSchema` + display label metadata) so frontend can render without runtime-specific conditionals.
- Frontend model selector should display model names from backend metadata (not raw identifier-only rendering), including reasoning default label when available.
- Codex runtime send-turn must consume selected `llmConfig` reasoning parameters (minimum: `reasoning_effort`) and pass them to app-server turn start payload.
- Reasoning-effort adaptation must remain runtime-owned: generic runtime send-turn ingress contracts should not be expanded for Codex-specific config keys.
- Reopened runs must preserve previously selected reasoning config from manifest for subsequent turns.

17. Codex thread-history transformation completeness
- Codex thread-history provider must transform `thread/read(includeTurns=true)` payloads to projection conversation entries with deterministic ordering by turn/item chronology.
- Text and reasoning deltas must fold into canonical projection message entries without introducing runtime-specific frontend message types.
- Tool-call and tool-result events from Codex history must map to existing projection tool entry shapes (`toolName`, `toolArgs`, `toolResult`, `toolError`) so frontend remains unchanged.

18. Codex model metadata normalization completeness
- Reasoning metadata ingestion from `model/list` must validate/normalize enum values and defaults before exposing schema to frontend.
- Invalid or unknown reasoning defaults from runtime must be dropped or coerced deterministically to prevent invalid UI config state.
- Backend should expose stable display names that can include compact reasoning default hints without requiring frontend runtime-specific formatting logic.

19. Codex reasoning effort lifecycle parity
- Runtime session creation/restore must normalize persisted `llmConfig.reasoning_effort` into session defaults once per session lifecycle.
- Codex send-turn should consume only session-default effort (not ad-hoc frontend fields) to keep ingress contracts runtime-agnostic.
- If session-default effort is invalid/missing, runtime should fallback to null effort deterministically and continue turn dispatch.

20. Reopen reasoning-config reconciliation parity
- Reopen run config hydration must preserve persisted reasoning config when schema-compatible.
- If persisted reasoning config is no longer schema-valid (for example removed enum value), reconciliation must sanitize deterministically and keep run usable.
- Reconciliation must remain schema-driven and runtime-agnostic in frontend; backend stays the source of model schema truth.

21. Continuation manifest source-of-truth parity
- Inactive-run continuation must treat persisted manifest config as source-of-truth when request overrides are omitted.
- Manifest-stored model + thinking config must be rehydrated into runtime restore/session defaults before dispatching subsequent turns.
- Active-run continuation may ignore config overrides by policy, but this behavior must be explicit and deterministic in API response (`ignoredConfigFields`).

22. Runtime capability gating parity
- Runtime availability must be published by backend as explicit capability metadata per runtime kind (`enabled`, `reason`).
- Frontend runtime selector/options must be driven by backend capability metadata, not local hardcoded runtime availability assumptions.
- If `codex_app_server` runtime is unavailable, create/continue flows must fail fast with deterministic runtime-unavailable error semantics instead of transport-time failures deep in execution.

23. Runtime degradation policy parity
- Runtime capability gating must be operation-scoped, not a single global dispatch gate.
- Command-plane policy must explicitly allow safety operations (`terminate`, session cleanup) to proceed best-effort during runtime degradation.
- Read-plane paths (`getRunProjection`, history open/hydration) must remain available even when runtime command-plane capability is degraded.
- API/UX must expose deterministic degraded reasons and command outcomes (for example `RUNTIME_UNAVAILABLE_FOR_SEND`, `TERMINATE_BEST_EFFORT`) without runtime-specific frontend branching.

## Constraints / Dependencies

- Source of truth for this pass is `personal` branch code in `autobyteus-server-ts/src/**`.
- Source of truth for frontend parity is `personal` branch code in `autobyteus-web/**` plus backend GraphQL schema in `autobyteus-server-ts/src/api/graphql/types/**`.
- No backward-compatibility retention for enterprise-only token routing assumptions.
- Final Codex app server payload details for approval/interrupt idempotency are still an external dependency.
- Runtime verification that launches `node dist/app.js` depends on fresh build parity (`build:full`) after source-level mapper/adapter changes.
- Codex history hydration depends on app-server thread-history API behavior (`thread/read`, optionally `thread/list`) and payload shape stability.
- Codex thinking metadata parity depends on app-server model metadata fields (`reasoningEffort`, `defaultReasoningEffort`) being available from `model/list`.

## Assumptions

- Team approval routing can be represented by direct invocation/member-target resolution without token indirection.
- Agent runtime selection is in-scope in this ticket phase; team runtime-kind selection remains out-of-scope for this phase because team GraphQL contracts currently have no runtime-kind input.

## Decisions Captured In This Round

- Route-level websocket readiness policy (`SESSION_NOT_READY`) is implemented and no longer a pending requirement risk.
- UC-010 scope is confirmed as agent run flow in this phase (form selector + store + mutation/query/codegen parity).
- Team runtime selector is explicitly deferred to a follow-up phase tied to team GraphQL contract expansion.
- "Runtime not configured" wording is treated as stale artifact state; runtime transport implementation is now concrete and validation-backed in this ticket.
- Future-state runtime code stack artifacts were re-synced in round `55` to remove non-existent module assumptions and now reflect implemented personal-branch files/functions.
- Runtime immutability parity drift found in round `58` was resolved with backend/frontend contract write-back; review stability reconfirmed in rounds `59` and `60`.
- Existing-run runtime immutability is now part of explicit parity scope; resume editable flags and run-config UX lock runtime changes for reopened runs.
- Explicit termination lifecycle use-case coverage was added in round `61` to avoid lifecycle-coverage blind spots in future test planning.
- Explicit reconnect/live-handoff use-case coverage was added in round `64` so projection replay and live-context preservation are first-class in future-state runtime call stacks.
- Round `67` deep review found runtime alias-parity drift: websocket mapper normalizes aliases, but run-history status derivation still branches on raw runtime methods; UC-014 was added to close this gap.
- Round `69` verification confirmed UC-014 implementation: run-history lifecycle status derivation now shares canonical runtime-method normalization with websocket mapping.
- Round `70` deep review found separation-of-concern and event-contract drift: Codex method mapping was still embedded in generic mapper flow and emitted `ASSISTANT_CHUNK` messages that frontend runtime path no longer dispatched, causing console errors and dropped content.
- Round `72` verification confirmed UC-015 implementation baseline: Codex mapping routes through a dedicated adapter and segment-first envelopes; out-of-order segment content recovery is deterministic.
- Workflow re-entry investigation confirmed a stale-build operational risk: old `dist` output can mimic unresolved chunk-contract regressions, so runbook verification now includes explicit rebuild-before-runtime checks.
- Architecture-cleanup iteration confirmed frontend-minimality target: backend now normalizes core `ASSISTANT_CHUNK` events into segment envelopes and frontend chunk-dispatch compatibility paths are removed.
- Round `76` deep-review stability confirmation closed frontend-minimality write-back from round `74`; no unresolved blockers remain for UC-015 in this ticket phase.
- Round `77` deep review confirmed core production emission is already segment-first and identified residual dead compatibility surface in backend (`ASSISTANT_CHUNK` enum + mapper branch), so UC-015 was refined to decommission that legacy path.
- Round `80` investigation added UC-016 to close Codex session-history replay parity gap for reopen flows while preserving frontend minimality and separation of concerns.
- Round `82` investigation added UC-017 for Codex thinking metadata/config parity and refined UC-016 to runtime-projection provider architecture for stronger separation of concern.
- Round `82` investigation refined architecture boundary: run projection should follow runtime-provider separation (same style as runtime model catalog) and added UC-017 for Codex reasoning metadata/config parity.
- Round `83` investigation refined runtime boundary details: Codex history replay should use a dedicated thread-history reader interface for projection providers, and reasoning-effort propagation should be resolved at Codex session defaults (create/restore) to keep generic send-turn contracts runtime-agnostic.
- Round `84` design iteration expanded coverage granularity by splitting UC-016/UC-017 into detailed architecture-validation use cases (UC-018/UC-019/UC-020) and mapping them to future-state call stacks for stricter separation-of-concern review.
- Round `85` deep review added UC-021 for reopen reasoning-config reconciliation so persisted config/schema drift is explicitly covered in future-state architecture and verification.
- Round `86` refinement clarified semantics of `turn/start.effort = null` and added UC-022 so continuation manifest-source-of-truth behavior for model/thinking config is explicitly covered.
- Round `87` refinement added UC-023 so runtime capability gating (enable/disable visibility + deterministic runtime-unavailable handling) is explicit and backend-owned, preserving frontend/runtime separation of concerns.
- Round `88` refinement added UC-024 so runtime capability checks are operation-scoped and do not block safety/read flows during runtime degradation.
- Round `90` write-back synchronized requirements/design/call-stack artifacts to implemented `C-058..C-062` behavior and closed the previous UC-016..UC-024 implementation blockers.
- Round `91` deep review provided consecutive clean confirmation (`Go Confirmed`) with no unresolved blocking findings.
- Round `92` deep review re-validated use-case coverage, separation-of-concern boundaries, and artifact/code parity after additional UC-021/UC-022 validation-depth evidence; no new blockers were found.

## Open Questions / Risks

1. Approval idempotency contract risk
- Need confirmation of Codex app server semantics for repeated approve/deny calls on the same invocation.

2. Team scope sequencing risk
- Team-level runtime command ingress may need phased delivery after single-agent path if adapter complexity grows.

3. Team runtime selector follow-up risk
- Team run creation GraphQL contracts currently do not expose runtime kind; a follow-up ticket is required to add team-level runtime selection without violating separation of concerns.

4. Codex history API contract risk
- Codex thread-history payload shape (`thread/read` with `includeTurns`) must be validated against live runtime to avoid replay projection mismatches.

5. Codex reasoning metadata contract risk
- Need to validate `model/list` metadata fields for reasoning labels/defaults across all Codex models; some models may omit reasoning capability fields.

6. Runtime capability drift risk
- Runtime selector can expose unavailable runtimes if capability state is not backend-sourced, causing noisy runtime failures and mixed concern leakage into frontend checks.

7. Runtime degradation policy risk
- A single global runtime availability gate can unintentionally block terminate/cleanup paths during outages, leaving stale sessions/runs and violating lifecycle safety expectations.
