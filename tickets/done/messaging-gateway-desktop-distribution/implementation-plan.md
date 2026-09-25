# Implementation Plan

## Scope Classification

- Classification: `Medium`
- Reasoning: the change crosses release automation, server runtime ownership, lifecycle supervision, GraphQL API shape, and node-scoped frontend UX.
- Workflow Depth:
  - `Medium` -> proposed design doc -> future-state runtime call stack -> future-state runtime call stack review (iterative deep rounds until `Go Confirmed`) -> implementation plan -> implementation progress tracking -> API/E2E testing (implement + execute) -> code review gate -> docs sync

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/messaging-gateway-desktop-distribution/workflow-state.md`
- Investigation notes: `tickets/in-progress/messaging-gateway-desktop-distribution/investigation-notes.md`
- Requirements: `tickets/in-progress/messaging-gateway-desktop-distribution/requirements.md`
  - Current Status: `Refined`
- Runtime call stacks: `tickets/in-progress/messaging-gateway-desktop-distribution/future-state-runtime-call-stack.md`
- Runtime review: `tickets/in-progress/messaging-gateway-desktop-distribution/future-state-runtime-call-stack-review.md`
- Proposed design: `tickets/in-progress/messaging-gateway-desktop-distribution/proposed-design.md`

## Plan Maturity

- Current Status: `Ready For Implementation`
- Notes: planning artifacts are complete through the Stage 5 `Go Confirmed` gate; source-code edits have not started yet.

## Preconditions (Must Be True Before Finalizing This Plan)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Runtime review has `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

## Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope:
  - `UC-001` enable on embedded node with missing artifact
  - `UC-002` enable on remote node with installed artifact
  - `UC-003` restore on server restart
  - `UC-004` install verification/extraction failure handling
  - `UC-005` managed status and diagnostics read
  - `UC-006` compatibility rejection
  - `UC-007` provider configuration write
  - `UC-008` disable managed messaging
  - `UC-009` update managed gateway with rollback
- Requirement Coverage Guarantee (all requirements mapped to at least one use case): `Yes`
- Design-Risk Use Cases (if any, with risk/objective): `None`
- Target Architecture Shape:
  - `web UI/store -> server GraphQL -> managed messaging service -> manifest resolver / installer / supervisor / internal gateway admin client -> gateway runtime`
- New Layers/Modules/Boundary Interfaces To Introduce:
  - `ManagedMessagingGatewayService`
  - `MessagingGatewayReleaseManifestService`
  - `MessagingGatewayInstallerService`
  - `MessagingGatewayProcessSupervisor`
  - `MessagingGatewayAdminClient`
  - GraphQL managed messaging resolver/types
  - `managedMessagingGatewayStore`
  - `ManagedGatewayStatusCard.vue`
- Touched Files/Modules:
  - `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/*`
  - `autobyteus-server-ts/src/api/graphql/types/managed-messaging-gateway.ts`
  - `autobyteus-server-ts/src/api/graphql/types/external-channel-setup/resolver.ts`
  - `autobyteus-message-gateway/scripts/build-runtime-package.mjs`
  - `.github/workflows/release-messaging-gateway.yml`
  - `autobyteus-web/components/settings/messaging/*`
  - `autobyteus-web/stores/*`
  - remove `autobyteus-web/services/messagingGatewayClient.ts`
- API/Behavior Delta:
  - remove direct browser-to-gateway contract
  - add node-scoped status/config/lifecycle/update mutations and queries
  - add server-managed install/update/rollback behavior
- Key Assumptions:
  - gateway artifact is downloadable on demand
  - server version determines compatible gateway version
  - the gateway remains a separate process
- Known Risks:
  - release-manifest publishing is a delivery critical path
  - runtime-install verification/extraction helpers do not exist yet
  - config apply vs restart semantics may vary by provider

## Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Fail | Yes | Yes | Yes | Requirement Gap | `2 -> 3 -> 4 -> 5` | Reset | 0 |
| 2 | Pass | No | No | N/A | N/A | `N/A` | Candidate Go | 1 |
| 3 | Pass | No | No | N/A | N/A | `N/A` | Go Confirmed | 2 |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `3`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`
- If `No-Go`, required refinement target:
  - `Medium/Large`: refine proposed design document, then regenerate call stack and re-review.

## Principles

- Bottom-up: implement release/install/runtime dependencies before API and UI.
- Test-driven: write unit and integration tests with each server-side boundary.
- Mandatory modernization rule: no backward-compatibility shims or legacy direct-gateway browser flow.
- Mandatory decoupling rule: keep dependencies one-way and avoid coupling web code to gateway transport details.
- Mandatory module/file placement rule: move lifecycle ownership into `autobyteus-server-ts` and delete obsolete web-side gateway client code.
- Choose the proper structural change for architecture integrity; do not prefer local hacks just because they are smaller.
- One file at a time is the default; limited parallel work is acceptable only where dependency edges are clear.

## Planned Task Catalog

| Task ID | Summary |
| --- | --- |
| `T-001` | Build the gateway runtime packaging script and artifact contract |
| `T-002` | Publish the standalone gateway artifact and compatibility manifest through CI/release automation |
| `T-003` | Implement server-side compatibility manifest resolution |
| `T-004` | Implement installer verification, extraction, activation, and rollback helpers |
| `T-005` | Implement process supervision, diagnostics collection, and internal admin-client runtime calls |
| `T-006` | Implement the managed messaging orchestration service |
| `T-007` | Implement GraphQL API surface and external-channel integration touchpoints |
| `T-008` | Implement the managed web store and replacement messaging settings UI |
| `T-009` | Remove legacy direct-gateway web flow and obsolete persisted settings |
| `T-010` | Implement Stage 6 unit/integration coverage for managed lifecycle boundaries |
| `T-011` | Implement Stage 7 API/E2E scenarios for acceptance-criteria closure |

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `autobyteus-message-gateway/scripts/build-runtime-package.mjs` | Existing gateway build | Packaging format must exist before installer/release automation can target it |
| 2 | `.github/workflows/release-messaging-gateway.yml` | Runtime package script | Manifest/artifact publishing is required for the install model |
| 3 | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-release-manifest-service.ts` | Release manifest contract | Other server services need stable artifact resolution |
| 4 | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-installer-service.ts` | Manifest resolver, download helpers | Install/verify/extract is a foundational runtime dependency |
| 5 | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts` | Install layout and runtime config contract | Lifecycle orchestration depends on process control |
| 6 | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-admin-client.ts` | Supervisor/port knowledge | Config writes and readiness checks need server-owned runtime calls |
| 7 | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts` | Manifest resolver, installer, supervisor, admin client | Central orchestration should compose stable lower layers |
| 8 | `autobyteus-server-ts/src/api/graphql/types/managed-messaging-gateway.ts` | Managed service | API should stay thin over the orchestration boundary |
| 9 | `autobyteus-server-ts/src/api/graphql/types/external-channel-setup/resolver.ts` | Managed API availability | Binding UX should adapt only after lifecycle/status API exists |
| 10 | `autobyteus-web/stores/managedMessagingGatewayStore.ts` | GraphQL API | Web state layer depends on stable server contract |
| 11 | `autobyteus-web/components/settings/messaging/ManagedGatewayStatusCard.vue` | Managed store | UI should land after state/actions are defined |
| 12 | Remove legacy web gateway files | Managed store/component/API | Delete obsolete flow only after replacement path exists |

## Module/File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| Managed lifecycle backend | N/A | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/*` | Server-owned lifecycle/install/runtime | Keep/Add | Unit + integration tests |
| Managed GraphQL boundary | N/A | `autobyteus-server-ts/src/api/graphql/types/managed-messaging-gateway.ts` | Server API | Add | API tests |
| Gateway packaging script | N/A | `autobyteus-message-gateway/scripts/build-runtime-package.mjs` | Gateway distribution | Add | Packaging verification |
| Release workflow | N/A | `.github/workflows/release-messaging-gateway.yml` | CI/release automation | Add | CI dry-run / workflow review |
| Connection card | `autobyteus-web/components/settings/messaging/GatewayConnectionCard.vue` | `autobyteus-web/components/settings/messaging/ManagedGatewayStatusCard.vue` | Web managed lifecycle/config UI | Move | UI tests + E2E |
| Session setup store | `autobyteus-web/stores/gatewaySessionSetupStore.ts` | `autobyteus-web/stores/managedMessagingGatewayStore.ts` plus provider/session-specific stores | Web managed lifecycle/config state | Split | Store tests |
| Direct web gateway client | `autobyteus-web/services/messagingGatewayClient.ts` | N/A | Obsolete direct transport | Remove | Compile + test |

## Requirement And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| `FR-001`, `FR-002` | `AC-001` | `Target Architecture Shape And Boundaries`, `File And Module Breakdown` | `UC-003`, `UC-005`, `UC-008` | `T-005`, `T-006`, `T-007` | Integration | `AV-001`, `AV-013` |
| `FR-003`, `FR-003A`, `FR-003B` | `AC-002`, `AC-002A`, `AC-002B` | `Summary`, `Use-Case Coverage Matrix` | `UC-001`, `UC-002`, `UC-006` | `T-001`, `T-002`, `T-003`, `T-004`, `T-006` | Integration | `AV-002`, `AV-003`, `AV-004` |
| `FR-004`, `FR-005`, `FR-005A` | `AC-004`, `AC-009` | `Target State`, `Error Handling And Edge Cases` | `UC-001`, `UC-004`, `UC-008`, `UC-009` | `T-004`, `T-005`, `T-006` | Unit + integration | `AV-006`, `AV-014` |
| `FR-006` | `AC-003` | `Legacy Removal Policy`, `Backward-Compatibility Rejection Log` | `UC-005`, `UC-007` | `T-008`, `T-009` | Unit | `AV-005` |
| `FR-007`, `FR-007A` | `AC-003`, `AC-003A` | `Target Architecture Shape And Boundaries`, `Use-Case Coverage Matrix` | `UC-007` | `T-005`, `T-006`, `T-007`, `T-008` | Integration | `AV-005`, `AV-012` |
| `FR-008` | `AC-005` | `Goals`, `Target State` | `UC-001`, `UC-002`, `UC-003` | `T-005`, `T-006`, `T-007`, `T-008` | Integration | `AV-009` |
| `FR-009`, `FR-009A`, `FR-009B` | `AC-001`, `AC-004A`, `AC-004B`, `AC-003A` | `Summary`, `Error Handling And Edge Cases` | `UC-004`, `UC-005`, `UC-007`, `UC-009` | `T-005`, `T-006`, `T-007`, `T-008` | Integration | `AV-001`, `AV-007`, `AV-008`, `AV-012`, `AV-014` |
| `FR-010`, `FR-011`, `FR-012` | `AC-002B`, `AC-006`, `AC-007` | `Change Inventory`, `Use-Case Coverage Matrix` | `UC-006`, `UC-009` | `T-001`, `T-002`, `T-003`, `T-004` | Unit + integration | `AV-004`, `AV-010`, `AV-011`, `AV-014` |
| `FR-013` | `AC-008` | `Use-Case Coverage Matrix` | `UC-008` | `T-005`, `T-006`, `T-007`, `T-008` | Integration | `AV-013` |
| `FR-014` | `AC-009` | `Error Handling And Edge Cases`, `Use-Case Coverage Matrix` | `UC-009` | `T-004`, `T-005`, `T-006`, `T-007` | Integration | `AV-014` |

## Acceptance Criteria To Stage 7 Mapping (Mandatory)

| Acceptance Criteria ID | Requirement ID | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- |
| `AC-001` | `FR-001`, `FR-002` | Node-scoped status query reports managed capability state and support | `AV-001` | API | Planned |
| `AC-002` | `FR-003` | Enabling messaging triggers server-owned activation | `AV-002` | E2E | Planned |
| `AC-002A` | `FR-003A` | Missing artifact is downloaded automatically before startup | `AV-003` | E2E | Planned |
| `AC-002B` | `FR-003B`, `FR-010` | Exact compatible artifact version is selected from explicit compatibility data | `AV-004` | API | Planned |
| `AC-003` | `FR-006`, `FR-007` | Managed flow needs no raw gateway URL/token input | `AV-005` | E2E | Planned |
| `AC-003A` | `FR-007`, `FR-007A` | Provider configuration saves through server-managed flow and updates readiness state | `AV-012` | E2E | Planned |
| `AC-004` | `FR-004`, `FR-005` | Gateway runs as separate supervised process with persisted config/state/logs | `AV-006` | API | Planned |
| `AC-004A` | `FR-009A` | Diagnostics include bind host/port and active version as read-only data | `AV-007` | API | Planned |
| `AC-004B` | `FR-009`, `FR-009B` | Install/start progress and failure messages reach the frontend | `AV-008` | E2E | Planned |
| `AC-005` | `FR-008` | Managed capability model works for embedded and remote nodes | `AV-009` | E2E | Planned |
| `AC-006` | `FR-010` | Compatibility rules prevent mismatched server/gateway versions | `AV-010` | API | Planned |
| `AC-007` | `FR-011` | WeChat remains excluded from the managed capability surface | `AV-011` | API | Planned |
| `AC-008` | `FR-013` | Disable action stops the managed gateway and exposes inactive state | `AV-013` | E2E | Planned |
| `AC-009` | `FR-014` | Update action activates a newer version or rolls back cleanly on activation failure | `AV-014` | API | Planned |

## Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| `C-001` | Add | `T-003`, `T-004`, `T-005`, `T-006` | No | Unit + integration + API |
| `C-002` | Add | `T-007` | No | API + E2E |
| `C-003` | Add | `T-002` | No | CI/release validation |
| `C-004` | Add | `T-001` | No | Packaging verification |
| `C-005` | Modify | `T-008` | Yes | UI/unit + E2E |
| `C-006` | Modify | `T-008`, `T-009` | Yes | Store/unit + API/E2E |
| `C-007` | Remove | `T-009` | Yes | Compile + regression tests |
| `C-008` | Modify | `T-007` | No | API integration |

## Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| `T-DEL-001` | `GatewayConnectionCard.vue` | Rename/Move | Replace imports/routes/tests with `ManagedGatewayStatusCard.vue` and delete raw connection form paths | UI references may be spread across settings screens |
| `T-DEL-002` | `gatewaySessionSetupStore.ts` direct lifecycle logic | Split/Remove | Move managed lifecycle/config actions into `managedMessagingGatewayStore.ts`; keep only still-relevant session concerns if any | Risk of leaving stale persisted state keys |
| `T-DEL-003` | `messagingGatewayClient.ts` | Remove | Delete client, callers, and direct transport assumptions | Compile failures will reveal residual references |
| `T-DEL-004` | Raw gateway URL/token persistence | Remove | Delete storage schema keys, migrations, and tests that support the legacy manual flow | Must avoid accidental compatibility branch retention |

## Step-By-Step Plan

1. `T-001`: Implement the gateway runtime packaging script and define the release-manifest artifact contract.
2. `T-002`: Add CI/release workflow for publishing the standalone gateway package and compatibility manifest inputs.
3. `T-003` + `T-004`: Implement server-side manifest resolution, install verification/extraction, active-version switching, and rollback helpers.
4. `T-005`: Implement process supervision, diagnostics collection, restart/disable behavior, and internal admin-client runtime calls.
5. `T-006` + `T-007`: Build the managed lifecycle application service plus GraphQL/status integration for enable, disable, update, and config-save operations.
6. `T-008`: Implement the web managed store and replace the current settings card with the managed status/config UI.
7. `T-009`: Remove the legacy direct gateway browser client, direct connection card flow, and obsolete persisted settings.
8. `T-010`: Add unit/integration coverage for server services and store logic.
9. `T-011`: Implement and execute Stage 7 API/E2E scenarios.
10. Run code review gate and docs sync after execution artifacts are complete.

## Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-message-gateway/scripts/build-runtime-package.mjs` | Produces deterministic runtime archive + manifest metadata | Packaging helper tests | Archive extraction smoke check | Must match installer expectations |
| `.github/workflows/release-messaging-gateway.yml` | Publishes artifact and compatibility data | N/A | Workflow validation / dry-run review | Release auth/config may need secrets wiring |
| `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-release-manifest-service.ts` | Resolves exact descriptor or explicit block reason | Resolver unit tests | API scenario for compatibility resolution | No "latest" fallback |
| `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-installer-service.ts` | Installs, verifies, extracts, activates, and rolls back safely | Installer unit tests | Integration tests with staged archives | Must preserve last known-good version |
| `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts` | Starts/stops/restarts and collects diagnostics | Supervisor unit tests | Integration tests with child-process lifecycle | Must surface bind port/version |
| `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts` | Orchestrates enable/disable/update/config/status correctly | Service unit tests | Integration tests across installer + supervisor + admin client | Central policy owner |
| `autobyteus-server-ts/src/api/graphql/types/managed-messaging-gateway.ts` | Exposes correct GraphQL contract and error mapping | Resolver unit tests | API tests | Thin boundary only |
| `autobyteus-web/stores/managedMessagingGatewayStore.ts` | Handles lifecycle/config/update status transitions and errors | Store unit tests | N/A | No direct gateway transport calls |
| `autobyteus-web/components/settings/messaging/ManagedGatewayStatusCard.vue` | Renders status/progress/config actions and dispatches store actions | Component unit tests | E2E tests | Must not ask for raw gateway URL/token |

## Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/in-progress/messaging-gateway-desktop-distribution/code-review.md`
- Scope (source + tests): server managed-capability modules, GraphQL boundary, gateway packaging/release workflow, web store/UI replacement, and legacy removals
- line-count measurement command (`effective non-empty`):
  - effective non-empty line count: `rg -n "\\S" <file-path> | wc -l`
  - changed-line delta: `git diff --numstat <base-ref>...HEAD -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action:
  - split oversized orchestration or UI files by concern before review passes
- per-file diff delta gate (`>220` changed lines) assessment approach:
  - require explicit SoC justification and likely split/cleanup plan in review artifact
- module/file placement review approach:
  - compare touched files against the ownership rules in `proposed-design.md`; treat wrong-folder additions as review failures, not cleanup later

| File | Current Line Count | Adds/Expands Functionality (`Yes`/`No`) | SoC Risk (`Low`/`Medium`/`High`) | Required Action (`Keep`/`Split`/`Move`/`Refactor`) | Expected Review Classification if not addressed |
| --- | --- | --- | --- | --- | --- |
| `managed-messaging-gateway-service.ts` | `TBD` | Yes | High | Keep small or split orchestration helpers early | Design Impact |
| `messaging-gateway-installer-service.ts` | `TBD` | Yes | High | Split verification/extraction helpers if it grows too large | Design Impact |
| `ManagedGatewayStatusCard.vue` | `TBD` | Yes | Medium | Split subcomponents if config + diagnostics bloat the file | Design Impact |
| `managedMessagingGatewayStore.ts` | `TBD` | Yes | Medium | Keep lifecycle/config/update state cohesive but not overloaded | Design Impact |

## Test Strategy

- Unit tests:
  - manifest resolution
  - checksum verification / extraction / rollback helpers
  - supervisor state transitions
  - managed service orchestration and status mapping
  - web store state transitions
- Integration tests:
  - install + start flow with staged artifact
  - restart restore flow
  - config save + readiness update flow
  - disable flow
  - update + rollback flow
- Stage 6 boundary: file/module/service-level verification only (unit + integration).
- Stage 7 handoff notes for API/E2E testing:
  - expected acceptance criteria count: `14`
  - critical flows to validate (API/E2E): enable/install, status/diagnostics, config save, disable, update rollback, embedded vs remote behavior
  - expected scenario count: `14`
  - known environment constraints: remote-node E2E harness and artifact hosting may need fixtures/mocks before full automation is practical
- Stage 8 handoff notes for code review:
  - predicted design-impact hotspots: managed service size, installer complexity, UI scope creep
  - predicted module/file placement hotspots: accidental logic leakage into resolver/UI or leftover direct gateway imports
  - files likely to exceed size/SoC thresholds: managed service, installer service, status card

## API/E2E Testing Scenario Catalog (Stage 7 Input)

| Scenario ID | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Test Level (`API`/`E2E`) | Expected Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| `AV-001` | Requirement | `AC-001` | `FR-001`, `FR-002` | `UC-005` | API | Status query reports support, lifecycle state, and readiness fields for the selected node. |
| `AV-002` | Requirement | `AC-002` | `FR-003` | `UC-001`, `UC-002` | E2E | Enabling messaging from the UI triggers server-owned activation without manual gateway startup. |
| `AV-003` | Requirement | `AC-002A` | `FR-003A` | `UC-001` | E2E | Missing artifact is downloaded automatically before startup and progress is surfaced. |
| `AV-004` | Requirement | `AC-002B`, `AC-006` | `FR-003B`, `FR-010` | `UC-006`, `UC-009` | API | Compatibility source resolves the exact artifact version and rejects mismatches or unsupported combinations. |
| `AV-005` | Requirement | `AC-003` | `FR-006`, `FR-007` | `UC-005`, `UC-007` | E2E | Managed messaging setup completes without raw gateway URL/token input in the default UX. |
| `AV-006` | Requirement | `AC-004` | `FR-004`, `FR-005` | `UC-001`, `UC-008` | API | Managed gateway runs as a separate supervised process with persisted config/state/log locations. |
| `AV-007` | Requirement | `AC-004A` | `FR-009A` | `UC-005` | API | Runtime diagnostics expose bind host/port, running version, and related read-only metadata. |
| `AV-008` | Requirement | `AC-004B` | `FR-009`, `FR-009B` | `UC-001`, `UC-004` | E2E | Frontend shows downloading/installing/starting/error messages from the server-managed flow. |
| `AV-009` | Requirement | `AC-005` | `FR-008` | `UC-001`, `UC-002`, `UC-003` | E2E | Embedded and remote nodes follow the same managed capability model and status semantics. |
| `AV-010` | Requirement | `AC-006` | `FR-010` | `UC-006`, `UC-009` | API | Release compatibility rules prevent mismatched server/gateway versions and enforce manifest-based selection. |
| `AV-011` | Requirement | `AC-007` | `FR-011` | `UC-006` | API | WeChat remains absent from the managed capability surface and compatibility resolution path. |
| `AV-012` | Requirement | `AC-003A` | `FR-007`, `FR-007A` | `UC-007` | E2E | Provider credentials/options save through the server-managed flow and readiness updates accordingly. |
| `AV-013` | Requirement | `AC-008` | `FR-013` | `UC-008` | E2E | Disable action stops the managed gateway and exposes an inactive lifecycle state. |
| `AV-014` | Requirement | `AC-009` | `FR-014` | `UC-009` | API | Update action activates a newer compatible version or restores the previous active version if activation fails. |

## API/E2E Testing Escalation Policy (Stage 7 Guardrail)

- Classification rules for failing API/E2E scenarios:
  - choose exactly one classification for the current failure event: `Local Fix`, `Design Impact`, `Requirement Gap`, or `Unclear`
  - do not allow any in-scope acceptance criterion to remain `Unmapped`, `Not Run`, `Failed`, or `Blocked` at Stage 7 close unless explicitly waived by the user
  - if root cause is cross-cutting or confidence is low, update `investigation-notes.md` before persisting classification
- Required action:
  - `Local Fix` -> update implementation/review artifacts first, then implement fix, rerun `Stage 6 -> Stage 7`
  - `Design Impact` -> return to `Stage 1 -> Stage 3 -> Stage 4 -> Stage 5 -> Stage 6 -> Stage 7`
  - `Requirement Gap` -> return to `Stage 2 -> Stage 3 -> Stage 4 -> Stage 5 -> Stage 6 -> Stage 7`
  - `Unclear` -> return to `Stage 0 -> Stage 1 -> Stage 2 -> Stage 3 -> Stage 4 -> Stage 5 -> Stage 6 -> Stage 7`

## Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| `managed-messaging-gateway-service.ts` | `messaging-gateway-installer-service.ts`, `messaging-gateway-process-supervisor.ts`, `messaging-gateway-admin-client.ts` | Central orchestration must coordinate install/runtime/config boundaries | Keep orchestration only in the service; push IO detail back down immediately | All lifecycle/config/update branches tested through service boundary | `Not Needed` | Server runtime layer |
| `ManagedGatewayStatusCard.vue` | `managedMessagingGatewayStore.ts` | UI must dispatch lifecycle/config/update actions | Keep component presentation-focused; move state branching into the store | Store contract stabilizes and component tests stay thin | `Not Needed` | Web settings layer |

## Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| Missing provider config and disable/update use cases were discovered in Stage 5 Round 1 | `future-state-runtime-call-stack-review.md`, `UC-007`, `UC-008`, `UC-009` | `Requirements And Use Cases`, `Use-Case Coverage Matrix` | Completed classified Requirement Gap re-entry and regenerated v2 artifacts | Closed |
