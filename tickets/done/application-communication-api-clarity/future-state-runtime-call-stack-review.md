# Future-State Runtime Call Stack Review

## Review Meta

- Scope Classification: `Medium`
- Current Round: `2`
- Current Review Type: `Deep Review`
- Clean-Review Streak Before This Round: `1`
- Clean-Review Streak After This Round: `2`
- Round State: `Go Confirmed`
- Missing-Use-Case Discovery Sweep Completed This Round: `Yes`
- New Use Cases Discovered This Round: `No`
- This Round Classification: `N/A`
- Required Re-Entry Path Before Next Round: `N/A`

## Review Basis

- Requirements: `tickets/application-communication-api-clarity/requirements.md` (status `Design-ready`)
- Runtime Call Stack Document: `tickets/application-communication-api-clarity/future-state-runtime-call-stack.md`
- Source Design Basis: `tickets/application-communication-api-clarity/design-spec.md` (proposed design for Medium)
- Shared Design Principles: `shared/design-principles.md`
- Artifact Versions In This Round:
  - Requirements Status: `Design-ready`
  - Design Version: `v1`
  - Call Stack Version: `v1`
- Required Persisted Artifact Updates Completed For This Round: `N/A`

## Review Intent (Mandatory)

- Primary check: Is the future-state runtime call stack a coherent and implementable future-state model?
- Not a pass criterion: matching current-code call paths exactly.
- Shared-principles rule: review uses the same design principles as Stage 3 (`data-flow spine inventory and clarity`, `ownership clarity and boundary encapsulation`, `off-spine concerns around the spine`, ownership-driven dependency validation, and the `Authoritative Boundary Rule`).

## Round History

| Round | Requirements Status | Design Version | Call Stack Version | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification | Required Re-Entry Path | Clean Streak After Round | Round State | Gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Design-ready | v1 | v1 | No | No | N/A | N/A | N/A | 1 | Candidate Go | No-Go (need 2 clean rounds) |
| 2 | Design-ready | v1 | v1 | No | No | N/A | N/A | N/A | 2 | Go Confirmed | Go |

## Round Artifact Update Log (Mandatory)

| Round | Findings Requiring Updates | Updated Files | Version Changes | Changed Sections | Resolved Finding IDs |
| --- | --- | --- | --- | --- | --- |
| 1 | No | N/A | N/A | N/A | N/A |
| 2 | No | N/A | N/A | N/A | N/A |

## Missing-Use-Case Discovery Log (Mandatory Per Round)

| Round | Discovery Lens | New Use Case IDs | Source Type | Why Previously Missing | Classification | Upstream Update Required |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Requirement coverage | None | N/A | N/A | N/A | N/A |
| 1 | Boundary crossing | None | N/A | N/A | N/A | N/A |
| 1 | Fallback-error | None | N/A | N/A | N/A | N/A |
| 1 | Design-risk | None | N/A | N/A | N/A | N/A |
| 2 | Requirement coverage | None | N/A | N/A | N/A | N/A |
| 2 | Boundary crossing | None | N/A | N/A | N/A | N/A |
| 2 | Fallback-error | None | N/A | N/A | N/A | N/A |
| 2 | Design-risk | None | N/A | N/A | N/A | N/A |

### Round 1 Discovery Sweep Details
- **Requirement coverage**: All FR-001 through FR-010 map to at least one use case in the call stack index. No unmapped requirement found.
- **Boundary crossing**: The call stacks explicitly cross the boundaries: worker→engine host→gateway→stream service (DS-001), frontend SDK→transport→gateway→engine→worker (DS-002), artifact subsystem→relay service→engine→worker (DS-004). All boundary crossings are modeled.
- **Fallback-error**: UC-001 covers no-listeners fallback and broken-websocket error. UC-002 covers application-not-found error. UC-003 covers optional publishNotification, failed handler delivery, and query reconciliation. UC-006 covers compilation failure, dangling references, and test failure. Sufficient for scope.
- **Design-risk**: UC-006 covers the primary design risk (rename regression). No additional design-risk use case needed: the rename is mechanically straightforward and there is no cross-cutting runtime behavior change.

### Round 2 Discovery Sweep Details
- **Requirement coverage**: Re-verified all FR-001 through FR-010 mapping. FR-001 (canonical doc) → UC-005. FR-002/FR-003 (notification semantics) → UC-001. FR-004 (artifact path) → UC-003. FR-005 (frontend request/response) → UC-002. FR-006/FR-008 (naming/tests) → UC-004, UC-006. FR-007 (public naming) → UC-005. FR-009 (first-party app docs) → UC-005. FR-010 (future stream positioning) → UC-005. Complete.
- **Boundary crossing**: Re-verified that DS-001 gateway/stream boundary, DS-002 gateway/engine boundary, DS-003 engine/orchestration boundary (documented in design-spec spine narratives), and DS-004 artifact relay/engine boundary are all modeled. DS-005 is positioning-only. No missing boundary crossing.
- **Fallback-error**: Re-verified. The notification disconnect/reconnect lifecycle (websocket close→disconnect from registry) is modeled in UC-001 bounded local spine in the design-spec. No additional fallback/error paths need call stack modeling.
- **Design-risk**: Re-verified. The only design risk is rename regression (UC-006). No additional design-risk scenario needed: no runtime behavior changes, no public API changes, no schema changes.

## Per-Use-Case Review

| Use Case | Spine ID(s) | Architecture Fit | Data-Flow Spine Clarity | Spine Inventory Completeness | Ownership Clarity | Support Structure Clarity | Existing Capability Reuse | Ownership-Driven Dependency | Authoritative Boundary Rule | File Placement Alignment | Flat-Vs-Over-Split Layout | Interface/API Boundary Clarity | Existing-Structure Bias | Anti-Hack | Local-Fix Degradation | Example-Based Clarity | Terminology & Concept Naturalness | File And API Naming Clarity | Name-to-Responsibility Alignment | Future-State Alignment | Use-Case Coverage Completeness | Use-Case Source Traceability | Design-Risk Justification Quality | Business Flow Completeness | Scope-Appropriate SoC | Dependency Flow Smells | Redundancy/Duplication | Simplification Opportunity | Remove/Decommission Completeness | Legacy Retention Removed | No Compatibility Wrappers | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | None | Pass | Pass | Pass | Pass | Pass | Pass |
| UC-002 | DS-002 | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | None | Pass | Pass | N/A | Pass | Pass | Pass |
| UC-003 | DS-004 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | None | Pass | Pass | N/A | Pass | Pass | Pass |
| UC-004 | DS-001 | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | None | Pass | Pass | Pass | Pass | Pass | Pass |
| UC-005 | DS-001..DS-005 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | None | Pass | Pass | N/A | Pass | Pass | Pass |
| UC-006 | DS-001 | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | None | Pass | Pass | Pass | Pass | Pass | Pass |

### Round 1 Detailed Review Rationale Per Use Case

**UC-001 (Backend notification publish and live fan-out)**
- Architecture fit: The spine accurately models the backend-published notification path from handler context through engine host, gateway bridge, and stream service to frontend websocket. The architecture shape is appropriate for live non-durable fan-out.
- Ownership: `ApplicationBackendNotificationStreamService` clearly owns connection registry and fan-out. Engine host owns notification event dispatch. Gateway service owns the bridge. Handler context owns the publish entrypoint. No ownership confusion.
- Authoritative boundary: Frontend uses `subscribeNotifications` (SDK boundary). Backend uses `publishNotification` (handler context boundary). Neither bypasses internal stream service directly.
- Naming: `ApplicationBackendNotificationStreamService` precisely describes the backend-published frontend notification fan-out responsibility. No naming drift.
- Coverage: Primary path (publish→fan-out), fallback (no listeners), and error (broken websocket) all modeled.

**UC-002 (Frontend request/response without implicit runtime control)**
- Architecture fit: The spine correctly models that `client.command(...)` flows through gateway and engine host to worker handler without inherent `runtimeControl` involvement.
- Ownership: Gateway owns transport boundary, engine host owns dispatch, worker runtime owns handler invocation. `context.runtimeControl` is available in handler context but not automatically called.
- Authoritative boundary: Frontend uses `client.command(...)` (SDK boundary). Backend handler decides whether to call `context.runtimeControl.*`. No bypass.
- Coverage: Primary path modeled. Error path (application not found) modeled. No fallback path needed.

**UC-003 (Artifact relay with optional notification)**
- Architecture fit: The spine correctly models artifact relay as a separate path from notification stream. `artifactHandlers.persisted` is invoked through engine host, not through notification stream.
- Ownership: `ApplicationPublishedArtifactRelayService` owns relay dispatch. App backend handler owns artifact processing and the optional `publishNotification` decision.
- Authoritative boundary: Artifact relay does not directly push to frontend notification stream. App backend decides whether to notify frontend, preserving the notification boundary authority.
- Coverage: Primary path, optional notification fallback, handler failure/recovery all modeled.

**UC-004 (Internal service rename)**
- Architecture fit: The rename is well-scoped to class/file/import/type/accessor names. No runtime behavior change.
- File placement: Target path `application-backend-notification-stream-service.ts` matches the `streaming/` folder under `application-backend-gateway/`.
- Decommission: Old file `application-notification-stream-service.ts` explicitly removed. No alias retained.

**UC-005 (Communication model document creation)**
- Architecture fit: Documentation creation covers all 5 spines and all requirements (FR-001 through FR-010).
- File placement: `application_communication_model.md` goes under existing `docs/modules/` directory. Cross-links to gateway and orchestration docs.
- Simplification: One canonical doc avoids duplication across multiple module docs.

**UC-006 (No-regression verification)**
- Design-risk justification: Rename must not introduce import resolution failures, compilation errors, or test regressions. The verification steps (TypeScript compilation, dangling reference search, integration tests) are concrete and testable.
- Coverage: Compilation failure, dangling references, and test failure error paths all modeled with clear fix classification.

### Round 2 Detailed Review Rationale

Round 2 deep review re-read all persisted artifacts from file and applied the same review criteria. Key Round 2 observations:

**UC-001**: Re-verified spine DS-001 against the actual source code (`application-notification-stream-service.ts` lines 1–72). The call stack accurately models the `connect()`, `publish()`, and `disconnect()` methods. The bounded local spine in design-spec (connect→store→publish→filter→send→disconnect) matches the modeled behavior. The `toJson()` helper is correctly an off-spine utility. No new finding.

**UC-002**: Re-verified spine DS-002 against actual gateway service source (`application-backend-gateway-service.ts`). The `normalizeRequestContext()` and `requireApplication()` pre-check flows are present in both source and call stack. The call stack correctly shows that `runtimeControl` is not automatically invoked. No new finding.

**UC-003**: Re-verified spine DS-004. The design-spec correctly identifies `ApplicationPublishedArtifactRelayService` as the relay owner. The call stack correctly models the optional `publishNotification` as an app-owned decision downstream, not part of relay behavior. The best-effort delivery and query reconciliation recovery path is consistent with the design-spec spine narrative. No new finding.

**UC-004**: Re-verified the rename scope against the actual `rg` results from investigation. All 7 files (source + tests + docs) that reference `ApplicationNotificationStreamService` are covered in the call stack rename inventory. No missing file. No new finding.

**UC-005**: Re-verified the documentation scope against the existing `docs/modules/` directory listing. The target files (new `application_communication_model.md`, updated `application_backend_gateway.md`, updated `application_orchestration.md`, updated `README.md`) all exist in the directory or are correctly marked as CREATE. No new finding.

**UC-006**: Re-verified the verification commands. The TypeScript compilation check, dangling reference search, and integration test execution are concrete and sufficient for the scope. The error classification paths (Local Fix vs Design Impact) are clear and correct. No new finding.

**Cross-use-case Round 2 checks**:
- Authoritative Boundary Rule: No use case bypasses an authoritative boundary. `subscribeNotifications` uses the SDK boundary. `publishNotification` uses the handler context boundary. Artifact relay uses the relay service boundary. All clean.
- Ownership-driven dependency: No new coupling introduced. The rename preserves the same dependency graph. Gateway depends on stream service (same folder). Route depends on stream service (cross-folder but within gateway boundary). Both are existing allowed dependencies.
- Spine inventory completeness: All 5 spines from the design basis are represented. DS-005 is correctly modeled as positioning-only with no runtime call stack needed.
- No-backward-compat: The old name is fully removed with no alias. No dual-name compatibility wrapper. Clean.
- Legacy retention: No legacy path retained. Clean.

## Findings

None.

## Blocking Findings Summary

- Unresolved Blocking Findings: `No`
- Remove/Decommission Checks Complete For Scoped `Remove`/`Rename/Move`: `Yes`

## Gate Decision

- Implementation can start: `Yes`
- Clean-review streak at end of this round: `2`
- Gate rule checks:
  - Architecture fit is `Pass` for all in-scope use cases: `Yes`
  - Data-flow spine clarity within declared inventory is `Pass` for all in-scope use cases: `Yes`
  - Spine inventory completeness is `Pass` for the design basis: `Yes`
  - Combined `Data-Flow Spine Inventory and Clarity` reasoning is clean enough for later Stage 8 review: `Yes`
  - Ownership clarity is `Pass` for all in-scope use cases: `Yes`
  - Support structure clarity is `Pass` for all in-scope use cases: `Yes`
  - Existing capability/subsystem reuse is `Pass` or `N/A` for all in-scope use cases: `Yes`
  - Ownership-driven dependency check is `Pass` for all in-scope use cases: `Yes`
  - Authoritative Boundary Rule check is `Pass` for all in-scope use cases: `Yes`
  - File-placement alignment is `Pass` for all in-scope use cases: `Yes`
  - Flat-vs-over-split layout judgment is `Pass` for all in-scope use cases: `Yes`
  - Interface/API/method boundary clarity is `Pass` for all in-scope use cases: `Yes`
  - Existing-structure bias check is `Pass` for all in-scope use cases: `Yes`
  - Anti-hack check is `Pass` for all in-scope use cases: `Yes`
  - Local-fix degradation check is `Pass` for all in-scope use cases: `Yes`
  - Example-based clarity is `Pass` or `N/A` for all in-scope use cases: `Yes`
  - Terminology and concept vocabulary is natural/intuitive across in-scope use cases: `Yes`
  - File/API naming clarity is `Pass` across in-scope use cases: `Yes`
  - Name-to-responsibility alignment under scope drift is `Pass` across in-scope use cases: `Yes`
  - Future-state alignment with target design basis is `Pass` for all in-scope use cases: `Yes`
  - Scope-appropriate separation of concerns is `Pass` for all in-scope use cases: `Yes`
  - Use-case coverage completeness is `Pass` for all in-scope use cases: `Yes`
  - Use-case source traceability is `Pass` for all in-scope use cases: `Yes`
  - Requirement coverage closure is `Pass` (all requirements map to at least one use case): `Yes`
  - Design-risk justification quality is `Pass` for all design-risk use cases: `Yes`
  - Redundancy/duplication check is `Pass` for all in-scope use cases: `Yes`
  - Simplification opportunity check is `Pass` for all in-scope use cases: `Yes`
  - All use-case verdicts are `Pass`: `Yes`
  - No unresolved blocking findings: `Yes`
  - Required persisted artifact updates completed for this round: `N/A`
  - Missing-use-case discovery sweep completed for this round: `Yes`
  - No newly discovered use cases in this round: `Yes`
  - Remove/decommission checks complete for scoped `Remove`/`Rename/Move` changes: `Yes`
  - Legacy retention removed for impacted old-behavior paths: `Yes`
  - No compatibility wrappers/dual paths retained for old behavior: `Yes`
  - Two consecutive deep-review rounds have no blockers, no required persisted artifact updates, and no newly discovered use cases: `Yes` (Round 1 + Round 2)
  - Findings trend quality is acceptable across rounds: `Yes` (zero findings in both rounds)

## Speak Log (Optional Tracking)

- Stage/gate transition spoken after `workflow-state.md` update: `No` (text only)
- Review gate decision spoken after persisted gate evidence: `No` (text only)
- Re-entry or lock-state change spoken (if applicable): `N/A`
- If any required speech was not emitted, fallback text update recorded: `Yes` — text notification provided inline.
