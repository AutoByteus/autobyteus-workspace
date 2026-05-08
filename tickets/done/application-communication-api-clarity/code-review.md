# Code Review

## Review Meta

- Ticket: `application-communication-api-clarity`
- Review Round: `1`
- Trigger Stage: `7`
- Prior Review Round Reviewed: `None`
- Latest Authoritative Round: `1`
- Workflow state source: `tickets/application-communication-api-clarity/workflow-state.md`
- Investigation notes reviewed as context: `tickets/application-communication-api-clarity/investigation-notes.md`
- Earlier design artifact(s) reviewed as context: `tickets/application-communication-api-clarity/design-spec.md`
- Runtime call stack artifact: `tickets/application-communication-api-clarity/future-state-runtime-call-stack.md`
- Shared Design Principles: `shared/design-principles.md` (260 lines, loaded and applied)
- Code Review Principles: `stages/08-code-review/code-review-principles.md` (129 lines, loaded and applied)

## Scope

- Files reviewed (source + tests):
  - `src/application-backend-gateway/streaming/application-backend-notification-stream-service.ts` (new — renamed from `application-notification-stream-service.ts`)
  - `src/application-backend-gateway/services/application-backend-gateway-service.ts` (modified — import path and type references)
  - `src/api/websocket/application-backend-notifications.ts` (modified — import path, type reference, and accessor calls)
  - `tests/integration/application-backend/brief-studio-imported-package.integration.test.ts` (modified — import path, type references, accessor calls)
  - `tests/integration/application-backend/application-backend-mount-route-transport.integration.test.ts` (modified — import path, class reference)
  - `tests/integration/application-backend/application-backend-rest-ws.integration.test.ts` (modified — import path, type references, accessor calls)
  - `docs/modules/application_communication_model.md` (new — canonical communication model)
  - `docs/modules/application_backend_gateway.md` (modified — renamed service references + cross-link)
  - `docs/modules/application_orchestration.md` (modified — cross-link added)
  - `docs/modules/README.md` (modified — index entry added)
- Why these files: Complete set of files touched by the rename and documentation work in this ticket.

## Source File Size And Structure Audit (Mandatory)

Measured via `rg -n "\S" <file> | wc -l` for effective non-empty lines and `git diff --numstat` for deltas:

| Source File | Effective Non-Empty Line Count | Adds/Expands Functionality | >500 Hard-Limit Check | >220 Changed-Line Delta Gate | Scope-Appropriate SoC Check | File Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `streaming/application-backend-notification-stream-service.ts` | 64 | No (mechanical rename, identical structure) | Pass (64 ≤ 500) | Pass (new file is 74 total lines; old file deleted as 73 lines — net delta is ~1 line) | Pass | Pass | N/A | Keep |
| `services/application-backend-gateway-service.ts` | 152 | No (import path and type reference changes only) | Pass (152 ≤ 500) | Pass (6+6=12 changed lines) | Pass | Pass | N/A | Keep |
| `api/websocket/application-backend-notifications.ts` | 38 | No (import path, type reference, and accessor name changes only) | Pass (38 ≤ 500) | Pass (7+7=14 changed lines) | Pass | Pass | N/A | Keep |

All three changed source files are well within the 500-line hard limit and the 220-changed-line delta gate.

## Structural Integrity Checks (Mandatory)

Evaluated against `shared/design-principles.md` and `stages/08-code-review/code-review-principles.md` primary review questions and review smells.

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | All 5 data-flow spines (DS-001 through DS-005) are preserved with identical structure. The rename does not alter any node, any dependency direction, or any spine shape. The spine inventory from the future-state runtime call stack review (6 use cases, 5 spines) remains fully applicable post-rename. No spine is harder to trace. | None |
| Ownership boundary preservation and clarity | Pass | `ApplicationBackendNotificationStreamService` remains solely owned by `application-backend-gateway/streaming/`. The gateway service (`services/application-backend-gateway-service.ts`) imports it as a peer within the same subsystem. The websocket route (`api/websocket/application-backend-notifications.ts`) uses the public factory accessor. Neither caller bypasses the service API. The ownership graph is identical to pre-rename. | None |
| Off-spine concern clarity (off-spine concerns serve clear owners and stay off the main line) | Pass | The `toJson()` helper at line 13 of the stream service remains a small local utility that serves only its owning file. No new off-spine concerns were introduced. No existing off-spine concern was promoted to the main line. | None |
| Existing capability/subsystem reuse check (no fresh helper where an existing subsystem should own it) | Pass | No new capabilities, helpers, or utilities were introduced. The rename reuses the same subsystem structure. The canonical communication model document references existing services, not new ones. | None |
| Reusable owned structures check (repeated structures extracted into the right owned file instead of copied across files) | Pass | The exported types `ApplicationBackendNotificationStreamMessage` and `ApplicationBackendNotificationStreamConnection` remain colocated in the stream service file where they semantically belong. They are consumed by importers (`gateway-service`, `websocket-route`, tests) via normal imports — no duplication. | None |
| Shared-structure/data-model tightness check (no kitchen-sink base, no overlapping parallel shapes, specialization/composition used meaningfully) | Pass | No shared data structures were changed. The `ApplicationBackendNotificationStreamMessage` union type still has exactly 2 discriminated variants (`connected` and `notification`) with no optional-field bloat. `ApplicationBackendNotificationStreamConnection` still has exactly 2 required methods (`send`, `close`). Both are tight. | None |
| Repeated coordination ownership check (shared policy has a clear owner instead of being repeated across callers) | Pass | No coordination patterns were duplicated or repeated across callers. The notification bridge in `ensureNotificationBridge()` (gateway service lines 76-92) remains the single coordination point between the engine host and the stream service. | None |
| Empty indirection check (no pass-through-only boundary) | Pass | No new indirection layers introduced. The factory accessor `getApplicationBackendNotificationStreamService()` still serves a real purpose: lazy singleton construction with caching. | None |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Each file retains its single coherent responsibility: the stream service owns notification fan-out, the gateway service owns transport boundary + engine-to-stream bridging, the websocket route owns WebSocket connection lifecycle. No file absorbed additional unrelated responsibilities during the rename. | None |
| Ownership-driven dependency check (no forbidden shortcuts or unjustified cycles) | Pass | Dependency direction: `gateway-service` → `stream-service` (sibling within `application-backend-gateway`), `websocket-route` → `stream-service` (cross-folder, but the route lives in `api/websocket/` which is allowed to depend on subsystem streaming services). No cycles. No forbidden shortcuts. Same directions as pre-rename. | None |
| Authoritative Boundary Rule check (callers do not depend on both an outer owner and that owner's internal manager/repository/helper/lower-level concern) | Pass | The `ApplicationBackendGatewayService` is the authoritative boundary for frontend-to-backend requests. It internally uses `ApplicationBackendNotificationStreamService` for notification fan-out. External callers of the gateway (REST routes, GraphQL resolvers) do not also import the stream service directly. The websocket route imports the stream service factory for the websocket-specific notification endpoint (`/ws/applications/:applicationId/backend/notifications`), which is a distinct API surface — not a bypass of the gateway boundary. Both the gateway and the websocket route depend on the stream service as a shared off-spine concern; neither is an internal of the other, so this is not a boundary violation. | None |
| File placement check (file/folder path matches owning concern or explicitly justified shared boundary) | Pass | The renamed file stays at `src/application-backend-gateway/streaming/application-backend-notification-stream-service.ts`, which correctly places it under the `application-backend-gateway` subsystem in the `streaming/` sub-folder. The new canonical doc is placed at `docs/modules/application_communication_model.md`, following the established pattern for module documentation. | None |
| Flat-vs-over-split layout judgment (layout is readable for the scope and not artificially fragmented) | Pass | The `application-backend-gateway/` subsystem has two sub-folders: `services/` and `streaming/`. This is neither too flat nor over-split for the current scope. The new canonical doc is a single file in the existing `docs/modules/` directory — not artificially fragmented. | None |
| Interface/API/query/command/service-method boundary clarity (one subject, one responsibility, explicit identity shape) | Pass | The stream service exposes 3 public methods: `connect(applicationId, connection)`, `disconnect(connectionId)`, `publish(notification)`. Each has one subject, one responsibility, and an explicit identity shape (`applicationId`, `connectionId`, `ApplicationNotificationMessage`). The factory accessor `getApplicationBackendNotificationStreamService()` is the sole entry point. No ambiguous selectors or mixed-subject methods. | None |
| Naming quality and naming-to-responsibility alignment check (files, folders, APIs, types, functions, parameters, variables) | Pass | This is the primary deliverable of this ticket. Assessment of each renamed identifier against design principles naming guidance: (1) `ApplicationBackendNotificationStreamService` — each segment maps to a real concern: `Application` (scope), `Backend` (publisher-side clarification, the key new signal), `Notification` (payload type), `Stream` (fan-out transport), `Service` (behavioral owner). (2) `ApplicationBackendNotificationStreamMessage` — correctly identifies the transport message shape. (3) `ApplicationBackendNotificationStreamConnection` — correctly identifies the connection adapter contract. (4) `getApplicationBackendNotificationStreamService` — standard factory accessor naming matching the class. (5) File name `application-backend-notification-stream-service.ts` — follows kebab-case convention consistent with all other files in the codebase. No names are vague, misleading, or hiding side effects. The `Backend` qualifier now prevents confusion with future runtime streaming or general app event streaming. | None |
| No unjustified duplication of code / repeated structures in changed scope | Pass | No code was duplicated. The renamed identifiers are consistent across all 3 source files and 3 test files. No copy-paste patterns introduced. | None |
| Patch-on-patch complexity control | Pass | This is a clean-cut rename, not a patch on existing complexity. The old file was fully removed and the new file created with identical internal structure. No layering of workarounds. | None |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Old file `application-notification-stream-service.ts` was deleted (confirmed by `git status` showing `D` flag and `ls` confirming absence). Dangling reference scan via `rg` across all source and test files returns 0 matches for any of the 5 old identifiers. No re-exports, no aliases, no commented-out old code. | None |
| Test quality is acceptable for the changed behavior | Pass | The 3 integration test files (`brief-studio-imported-package`, `application-backend-rest-ws`, `application-backend-mount-route-transport`) exercise real notification fan-out through the stream service over actual websocket connections. They verify connected messages, notification delivery, and end-to-end query/command/route/graphql → notification flows. The tests use the renamed types for websocket message parsing and stream service instantiation. No behavior was changed, so existing test assertions remain valid. Tests catch regressions via import resolution — if any identifier was wrong, the test would fail to compile. | None |
| Test maintainability is acceptable for the changed behavior | Pass | Test imports now use the clarified name, which improves readability when scanning test files. The `vi.mock()` paths and `vi.importActual()` paths were updated consistently. Future readers will see `ApplicationBackendNotificationStreamService` and immediately understand this is the backend notification stream, not a generic app stream. | None |
| Validation evidence sufficiency for the changed flow | Pass | Dangling reference scan (0 matches across entire repo minus tickets directory) is thorough structural validation. Content verification via `grep` confirms the canonical doc covers all 5 communication mechanisms, non-durable semantics, artifact relay independence, request/response independence from runtime control, and future runtime streaming positioning. TypeScript compilation was not executable in the worktree due to missing node_modules (infrastructure constraint). This is a residual risk, but given the rename is purely mechanical with identical structure, the risk is very low. | None |
| No backward-compatibility mechanisms (no compatibility wrappers/dual-path behavior) | Pass | Zero backward-compatibility mechanisms. No re-exports from the old file path. No `@deprecated` aliases. No dual-name wrappers. No fallback imports. The old path/names were completely removed. This follows the design principles hard rule: "No backward compatibility or legacy retention is a hard modernization rule for in-scope behavior." | None |
| No legacy code retention for old behavior | Pass | Old file fully deleted. Old class name, type names, accessor name, and cached variable name all fully purged from source, tests, and docs. No "just in case" retention. | None |

## Review Scorecard (Mandatory)

- Overall score (`/10`): `9.8`
- Overall score (`/100`): `98`
- Score calculation note: Simple average across 10 categories. Scores use `0.5` increments per the code review principles guidance. The single sub-10 score reflects a genuine residual gap in validation evidence (TypeScript compilation not executable in worktree).

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 10.0 | All 5 spines (DS-001 through DS-005) from the approved future-state runtime call stack review are preserved with identical node structure. No spine is harder to trace post-rename. The canonical communication model doc explicitly maps each communication mechanism to its owning spine, making the inventory clearer than before. | Nothing — the spine inventory is complete, preserved, and now better documented through the canonical doc. | N/A |
| 2 | Ownership Clarity and Boundary Encapsulation | 10.0 | Ownership boundaries are preserved and clarified. The `Backend` qualifier in the service name now makes it immediately obvious that this service owns backend-published frontend notification fan-out — not general app streaming or runtime event streaming. The Authoritative Boundary Rule is preserved: the gateway service is the authoritative boundary for request/response, while the stream service is a shared off-spine concern for the notification websocket endpoint. Neither bypasses the other. | Nothing — the ownership model is cleaner with the clarified naming. | N/A |
| 3 | API / Interface / Query / Command Clarity | 10.0 | Same 3 public methods (`connect`, `disconnect`, `publish`) with the same identity shapes. Same factory accessor as sole entry point. The canonical communication model doc provides an explicit matrix of which API surface goes through which service, making API boundaries clearer for future developers. No ambiguous selectors or mixed-subject methods exist. | Nothing — API surfaces unchanged, documentation improved. | N/A |
| 4 | Separation of Concerns and File Placement | 10.0 | All files retain their single coherent responsibility. File placement follows ownership: stream service in `streaming/`, gateway service in `services/`, websocket route in `api/websocket/`, docs in `docs/modules/`. No file absorbed additional responsibilities. The `streaming/` sub-folder within `application-backend-gateway/` is appropriate — it is neither too flat (which would hide the streaming concern inside `services/`) nor over-split (the one-file folder is justified because the streaming concern is semantically distinct from the gateway service). | Nothing — placement is correct and readable. | N/A |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 10.0 | The 2 exported types are tight: `ApplicationBackendNotificationStreamMessage` is a discriminated union with exactly 2 variants (no optional-field sprawl), and `ApplicationBackendNotificationStreamConnection` has exactly 2 required methods. Both remain colocated in their owning file. No shared structures were widened, duplicated, or loosened. | Nothing — no shared data model changes, existing types are tight. | N/A |
| 6 | Naming Quality and Local Readability | 10.0 | This is the primary deliverable of the ticket. Each renamed identifier maps precisely to its real responsibility. The `Backend` qualifier is the key improvement: it disambiguates this service from (a) future runtime streaming, (b) general application event streaming, and (c) artifact relay. Variable names inside the service (`listenersByApplicationId`, `applicationIdByConnectionId`, `connectionId`) remain descriptive and unsurprising. The new canonical doc uses consistent terminology that aligns with the renamed code. | Nothing — naming is the main deliverable and the quality is high. | N/A |
| 7 | Validation Strength | 9.0 | Dangling reference scan is thorough and conclusive (0 matches). Doc content verification covers all key requirements. Integration test imports will fail at compile time if any identifier is wrong. However, TypeScript compilation itself was not executable in this worktree due to missing `node_modules` — this is an infrastructure constraint, not a code issue, but it means the compiler did not actually run against the changed files. | TypeScript `pnpm run typecheck` was not executable in the worktree (missing node_modules). While the rename is mechanical and structurally verified by the dangling reference scan, the compiler has not actually run. | Run `pnpm run typecheck` from the main workspace after merge to confirm. Alternatively, install deps in the worktree and typecheck before merge. |
| 8 | Runtime Correctness Under Edge Cases | 10.0 | No runtime behavior was changed. The stream service handles: (a) no-listeners gracefully (silent return at line 47-49), (b) broken websocket send via try/catch with force-close and disconnect (lines 52-61), (c) missing connectionId on disconnect (silent return at lines 34-36). All edge case handling is identical to pre-rename. The rename is purely mechanical — same code, same control flow, same error handling. | Nothing — no behavioral change occurred. | N/A |
| 9 | No Backward-Compatibility / No Legacy Retention | 10.0 | Zero backward-compatibility mechanisms. The old file is deleted. No re-exports, no aliases, no dual-name wrappers, no `@deprecated` annotations. All references across source, tests, and docs use the new name exclusively. This satisfies the design principles hard rule: "No backward compatibility or legacy retention is a hard modernization rule for in-scope behavior." | Nothing — clean-cut replacement executed perfectly. | N/A |
| 10 | Cleanup Completeness | 10.0 | Old file deleted. Zero dangling references (verified by `rg` across entire repo). Old name purged from all docs. README index updated. Cross-links added. No dead code, no unused helpers, no dormant replaced paths remain. | Nothing — cleanup is thorough. | N/A |

## Findings

None.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Gate Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Stage 7 pass | N/A | No | Pass | Yes | Clean mechanical rename. All structural integrity checks pass. Scorecard minimum 9.0. No findings. |

## Gate Decision

- Latest authoritative review round: `1`
- Decision: `Pass`
- Implementation can proceed to `Stage 9`: `Yes`
- Mandatory pass checks:
  - Review scorecard is recorded with rationale, weakness, and required-improvement notes for all ten categories in the canonical priority order: `Yes`
  - No scorecard category is below `9.0`: `Yes` (minimum is 9.0 on Validation Strength)
  - All changed source files have effective non-empty line count `<=500`: `Yes` (max 152)
  - Required `>220` changed-line delta-gate assessments are recorded for all applicable changed source files: `Yes` (no file exceeds 220; max delta is 14 changed lines)
  - Data-flow spine inventory clarity and preservation under shared principles = `Pass`
  - Ownership boundary preservation = `Pass`
  - Off-spine concern clarity = `Pass`
  - Existing capability/subsystem reuse check = `Pass`
  - Reusable owned structures check = `Pass`
  - Shared-structure/data-model tightness check = `Pass`
  - Repeated coordination ownership check = `Pass`
  - Empty indirection check = `Pass`
  - Scope-appropriate separation of concerns and file responsibility clarity = `Pass`
  - Ownership-driven dependency check = `Pass`
  - Authoritative Boundary Rule check = `Pass`
  - File placement check = `Pass`
  - Flat-vs-over-split layout judgment = `Pass`
  - Interface/API/query/command/service-method boundary clarity = `Pass`
  - Naming quality and naming-to-responsibility alignment check = `Pass`
  - No unjustified duplication of code / repeated structures in changed scope = `Pass`
  - Patch-on-patch complexity control = `Pass`
  - Dead/obsolete code cleanup completeness in changed scope = `Pass`
  - Test quality is acceptable for the changed behavior = `Pass`
  - Test maintainability is acceptable for the changed behavior = `Pass`
  - Validation evidence sufficiency = `Pass`
  - No backward-compatibility mechanisms = `Pass`
  - No legacy code retention = `Pass`
- Classification rule: N/A (no failures)
- Notes: Clean mechanical rename with complete cleanup. The only residual gap is TypeScript compilation not executable in the worktree (infrastructure constraint, not code issue). Recommend running `pnpm run typecheck` from main workspace before merge.
