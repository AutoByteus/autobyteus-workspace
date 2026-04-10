# Implementation

## Scope Classification

- Classification: `Large`
- Reasoning: The feature crosses Electron browser runtime ownership, Electron IPC and persisted node state, remote-node UX, server runtime capability registration, live tool advertisement, and Codex/browser execution-time gating.
- Workflow Depth:
  - `Large` -> proposed design doc -> future-state runtime call stack -> future-state runtime call stack review (iterative deep rounds until `Go Confirmed`) -> `implementation.md` baseline -> implementation execution

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/remote-browser-bridge-pairing/workflow-state.md`
- Investigation notes: `tickets/in-progress/remote-browser-bridge-pairing/investigation-notes.md`
- Requirements: `tickets/in-progress/remote-browser-bridge-pairing/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/in-progress/remote-browser-bridge-pairing/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/in-progress/remote-browser-bridge-pairing/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `tickets/in-progress/remote-browser-bridge-pairing/proposed-design.md`

## Document Status

- Current Status: `In Execution`
- Notes: Stage 5 is `Go Confirmed`; Stage 6 reopened once for a design-impact re-entry and is now back in execution with v3 design guidance for authoritative remove-node cleanup, renderer decomposition, and local-state alignment when remove-node cleanup succeeds remotely but local node deletion fails. Stage 8 round 1 then found two bounded local-fix issues: duplicated listener-host policy ownership and localization-subsystem bypass in the new renderer/store text path.

## Plan Baseline (Freeze Until Replanning)

### Preconditions (Must Be True Before Finalizing The Baseline)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Future-state runtime call stack review has `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

### Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope: `UC-001` through `UC-007`
- Spine Inventory In Scope: `DS-001`, `DS-002`, `DS-003`, `DS-004`, `DS-005`
- Primary Spine Span Sufficiency Rationale: The implementation keeps three end-to-end business paths visible: pairing enablement and live advertisement (`DS-001`), browser execution from paired remote runs (`DS-002`), and revoke/expiry denial plus UI-state visibility (`DS-003` with `DS-004` and `DS-005` support).
- Primary Owners / Main Domain Subjects:
  - Electron browser subsystem owns listener mode, token issuance, local expiry state, and bridge execution.
  - Electron node registry and renderer stores own user-visible node metadata and UI refresh.
  - Server browser subsystem owns runtime binding, effective support resolution, tool-registry synchronization, and execution-time transport.
  - Server GraphQL owns runtime pair/unpair mutation boundaries.
- Requirement Coverage Guarantee (all requirements mapped to at least one use case): `R-001` to `R-011` remain covered by `UC-001` to `UC-007`; implementation tasks below preserve those mappings.
- Design-Risk Use Cases (if any, with risk/objective): `None beyond the explicit expiry-visibility risk already resolved in Stage 5.`
- Target Architecture Shape:
  - Electron: `NodeManager -> preload IPC -> BrowserPairingStateController -> BrowserBridgeAuthRegistry / NodeRegistryStore -> BrowserBridgeServer`
  - Server: `RemoteBrowserBridgeResolver -> RuntimeBrowserBridgeRegistrationService -> BrowserToolRegistrySync`
  - Execution: `BrowserToolService -> BrowserBridgeConfigResolver -> BrowserBridgeClient -> Electron BrowserBridgeServer`
- New Owners/Boundary Interfaces To Introduce:
  - `BrowserPairingStateController`
  - `RemoteBrowserSharingSettingsStore`
  - `BrowserBridgeConfigResolver`
  - `RuntimeBrowserBridgeRegistrationService`
  - `BrowserToolRegistrySync`
  - GraphQL resolver `remote-browser-bridge.ts`
- Primary file/task set: see `Implementation Work Table`.
- API/Behavior Delta:
  - Electron exposes advanced browser-sharing settings and pair/unpair IPC APIs.
  - Remote nodes can register or clear a runtime browser bridge without restart.
  - Server browser capability becomes env-or-runtime resolved instead of env-only.
  - Browser tool advertisement becomes runtime-synchronized instead of startup-only.
- Key Assumptions:
  - First delivery keeps remote runtime binding in memory only.
  - Electron remains the sole browser runtime owner.
  - Same expiry deadline can be enforced independently by Electron and the remote server.
- Known Risks:
  - Pairing drift between Electron and remote runtime if either side misses cleanup.
  - Tool-registry synchronization mistakes could expose browser tools when capability is not live.
  - UI scope can sprawl if advanced controls are not kept inside the node-management boundary.

### Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Fail | Yes | No | Yes | `Design Impact` | `Stage 3 -> Stage 4 -> Stage 5` | `Reset` | 0 |
| 2 | Pass | No | No | Yes | `N/A` | `N/A` | `Candidate Go` | 1 |
| 3 | Pass | No | No | Yes | `N/A` | `N/A` | `Go Confirmed` | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `3`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`
- If `No-Go`, required refinement target:
  - `Medium/Large`: refine proposed design document, then regenerate call stack and re-review.

### Principles

- Bottom-up: implement foundational browser bridge and runtime-binding owners before UI wiring.
- Test-driven: add unit and integration coverage as each ownership slice lands.
- Spine-led implementation rule: execute by ownership spine, not by arbitrary file order.
- Mandatory modernization rule: remove startup-only/env-only/single-token assumptions instead of wrapping them.
- Mandatory cleanup rule: remove replaced assumptions and any dead helpers/tests in touched scope before Stage 6 closes.
- Mandatory ownership/decoupling/SoC rule: renderer stays orchestration-only; auth stays separate from visible pairing state; server runtime binding stays separate from GraphQL and execution transport.
- Mandatory `Authoritative Boundary Rule`: callers use `BrowserPairingStateController`, `RemoteBrowserBridgeResolver`, and `BrowserToolService` instead of bypassing to their internals.
- Mandatory `Spine Span Sufficiency Rule`: implementation must keep add/pair, execute, and revoke/expiry paths visible from initiating UI or agent run to downstream business effect.
- Mandatory shared-principles implementation rule: if real file boundaries disagree with reviewed design, stop and classify `Design Impact`.
- Mandatory proactive size-pressure rule: large touched source files are split early if they trend toward Stage 8 size or delta gates.
- Stage 6 re-entry note: `NodeManager.vue` crossed the Stage 8 size gate during the first implementation pass, so remote-browser-sharing UX must be decomposed before Stage 6 can close.

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | `DS-001`, `DS-005` | Electron browser subsystem | `remote-browser-sharing-settings-store.ts`, `browser-bridge-auth-registry.ts`, `browser-pairing-state-controller.ts`, `browser-runtime.ts`, `browser-bridge-server.ts` | None | Electron must own the bridge endpoint, auth records, and local expiry lifecycle before remote pairing can exist. |
| 2 | `DS-001`, `DS-003` | Electron node/IPC boundary | `main.ts`, `preload.ts`, `electron/types.d.ts`, `nodeRegistryTypes.ts`, `nodeRegistryStore.ts` | Order 1 | IPC and persisted node metadata depend on the new Electron-side owners and status model. |
| 3 | `DS-001`, `DS-003` | Renderer/node UX | `types/node.ts`, `stores/nodeStore.ts`, `components/settings/NodeManager.vue`, `utils/nodeRemoteBrowserPairingClient.ts` | Orders 1-2 | Renderer flows depend on new IPC contracts and node metadata shape. |
| 4 | `DS-001`, `DS-004` | Server browser runtime capability | `browser-bridge-config-resolver.ts`, `runtime-browser-bridge-registration-service.ts`, `browser-tool-registry-sync.ts`, `register-browser-tools.ts`, `api/graphql/types/remote-browser-bridge.ts` | Order 1 | Runtime registration and live tool advertisement are the remote capability foundation. |
| 5 | `DS-002` | Server browser execution | `browser-tool-service.ts`, `browser-bridge-client.ts` | Order 4 | Execution-time support resolution should land only after the runtime capability owner exists. |
| 6 | `DS-001` to `DS-005` | Validation | Electron/web/server test files and targeted integrations | Orders 1-5 | Validation closes coverage only after the final contracts exist. |

### File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| Remote browser sharing settings persistence | `N/A` | `autobyteus-web/electron/browser/remote-browser-sharing-settings-store.ts` | Electron browser subsystem | `Keep` | Electron unit tests |
| Pairing lifecycle owner | `N/A` | `autobyteus-web/electron/browser/browser-pairing-state-controller.ts` | Electron browser subsystem | `Keep` | Electron unit tests + NodeManager flow tests |
| Runtime browser capability registration | `N/A` | `autobyteus-server-ts/src/agent-tools/browser/runtime-browser-bridge-registration-service.ts` | Server browser subsystem | `Keep` | Server unit tests + integration tests |
| Runtime pair/unpair API boundary | `N/A` | `autobyteus-server-ts/src/api/graphql/types/remote-browser-bridge.ts` | Server GraphQL boundary | `Keep` | GraphQL unit/integration tests |

### Implementation Work Table (Primary Tracker)

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `C-001,C-002,C-003,C-004,C-005` | `DS-001`,`DS-005` | Electron browser subsystem | Bridge listener mode, multi-token auth, local expiry lifecycle, embedded env preservation | `autobyteus-web/electron/browser/browser-runtime.ts`, `autobyteus-web/electron/browser/browser-bridge-server.ts` | Same paths plus new Electron browser files | `Create/Modify` | None | `Completed` | `autobyteus-web/electron/browser/__tests__/browser-pairing-state-controller.spec.ts`, `autobyteus-web/electron/__tests__/nodeRegistryStore.spec.ts` | `Passed` | `N/A` | `N/A` | `Planned` | Re-entry follow-up added explicit remove-node cleanup in the pairing controller. |
| `C-006,C-007,C-008,C-009,C-010` | `DS-001`,`DS-003` | Electron app boundary | IPC, node metadata, and persisted pairing status | `autobyteus-web/electron/main.ts`, `autobyteus-web/electron/preload.ts`, `autobyteus-web/electron/nodeRegistryStore.ts`, `autobyteus-web/electron/nodeRegistryTypes.ts`, `autobyteus-web/types/node.ts`, `autobyteus-web/stores/nodeStore.ts` | Same paths | `Modify` | `C-001,C-002,C-003,C-004,C-005` | `Completed` | `autobyteus-web/electron/__tests__/nodeRegistryStore.spec.ts`, `autobyteus-web/electron/browser/__tests__/browser-pairing-state-controller.spec.ts` | `Passed` | `N/A` | `N/A` | `Planned` | `main.ts` now routes remove-node cleanup through `BrowserPairingStateController` before registry deletion. |
| `C-011,C-012,C-013` | `DS-001`,`DS-003` | Renderer/node UX | Pair/unpair client actions and remote-browser-sharing panel decomposition | `autobyteus-web/components/settings/NodeManager.vue` | Same path plus `autobyteus-web/components/settings/RemoteBrowserSharingPanel.vue`, `autobyteus-web/components/settings/RemoteNodePairingControls.vue`, `autobyteus-web/stores/remoteBrowserSharingStore.ts`, and `autobyteus-web/utils/nodeRemoteBrowserPairingClient.ts` | `Create/Modify` | `C-006,C-007,C-008,C-009,C-010` | `Completed` | `autobyteus-web/components/settings/__tests__/NodeManager.spec.ts`, `autobyteus-web/components/settings/__tests__/RemoteBrowserSharingPanel.spec.ts`, `autobyteus-web/components/settings/__tests__/RemoteNodePairingControls.spec.ts`, `autobyteus-web/stores/__tests__/remoteBrowserSharingStore.spec.ts` | `Passed` | `N/A` | `N/A` | `Planned` | `NodeManager.vue` is back to `488` effective non-empty lines and acts as the screen host instead of the pairing owner; remove-node failure now revokes stale local pairing state if remote cleanup already completed. |
| `C-014,C-015,C-016,C-020` | `DS-001`,`DS-003`,`DS-004` | Server browser subsystem | Runtime binding storage, expiry, registry sync, and GraphQL mutation boundary | `autobyteus-server-ts/src/agent-tools/browser/register-browser-tools.ts` | Same path plus new server browser files and `autobyteus-server-ts/src/api/graphql/types/remote-browser-bridge.ts` | `Create/Modify` | `C-001,C-002,C-003,C-004,C-005` | `Completed` | `autobyteus-server-ts/tests/unit/agent-tools/browser/runtime-browser-bridge-registration-service.test.ts`, `autobyteus-server-ts/tests/unit/agent-tools/browser/browser-bridge-config-resolver.test.ts` | `Passed` | `autobyteus-server-ts/tests/integration/...` | `Planned` | `Planned` | Runtime tool advertisement is reversible and restart-free; trusted-LAN mutation hardening remains a later enhancement. |
| `C-017,C-018,C-019` | `DS-002` | Server browser execution | Effective support resolution and execution-time transport | `autobyteus-server-ts/src/agent-tools/browser/browser-tool-service.ts`, `autobyteus-server-ts/src/agent-tools/browser/browser-bridge-client.ts`, `autobyteus-server-ts/src/agent-tools/browser/register-browser-tools.ts` | Same paths | `Modify` | `C-014,C-015,C-016,C-020` | `Completed` | `autobyteus-server-ts/tests/unit/agent-tools/browser/browser-bridge-client.test.ts`, `autobyteus-server-ts/tests/unit/agent-tools/browser/register-browser-tools.test.ts` | `Passed` | `autobyteus-server-ts/tests/integration/...` | `Planned` | `Planned` | Execution-time support now resolves env-or-runtime config through one boundary. |
| `C-021` | `DS-001` to `DS-005` | Validation | End-to-end coverage for positive and negative paths | Existing Electron/web/server test paths | Same paths plus new tests as needed | `Modify/Create` | All prior work | `In Progress` | Multiple targeted unit suites | `Passed` | Multiple targeted integration suites | `Planned` | `Planned` | Serial Stage 6 coverage now includes the renderer/store remove-node mismatch regression in addition to pair/unpair, expiry, and server runtime-binding tests; Stage 7 executable validation is still pending. |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R-001`,`R-002` | `AC-001`,`AC-002` | `DS-001` | `Future-State Design`, `Concrete Pairing Flow` | `UC-001`,`UC-002` | `C-001,C-003,C-006,C-011` | Unit + Integration | `AV-001`,`AV-002` |
| `R-003`,`R-004`,`R-005` | `AC-002`,`AC-005`,`AC-006` | `DS-001`,`DS-003`,`DS-005` | `Concrete Pairing Flow`, `Concrete Unpair / Expiry Flow` | `UC-002`,`UC-005` | `C-002,C-005,C-009,C-012,C-014` | Unit + Integration | `AV-002`,`AV-005`,`AV-006` |
| `R-006`,`R-007` | `AC-003`,`AC-006`,`AC-008` | `DS-001`,`DS-004` | `Future-State Design`, `Concrete Pairing Flow` | `UC-002`,`UC-003`,`UC-005` | `C-014,C-015,C-016,C-020` | Unit + Integration | `AV-003`,`AV-006`,`AV-008` |
| `R-008`,`R-009` | `AC-004`,`AC-005` | `DS-002` | `Concrete Execution Flow` | `UC-004`,`UC-007` | `C-017,C-018,C-019` | Unit + Integration | `AV-004`,`AV-005`,`AV-007` |
| `R-010` | `AC-002`,`AC-005`,`AC-006` | `DS-003`,`DS-005` | `Concrete Unpair / Expiry Flow` | `UC-002`,`UC-005` | `C-005,C-009,C-010,C-013` | Unit + Integration | `AV-002`,`AV-005`,`AV-006` |
| `R-011` | `AC-007` | `DS-002` | `Future-State Design`, `Concrete Execution Flow` | `UC-006` | `C-003,C-004,C-017` | Unit + Integration | `AV-007` |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- | --- |
| `AC-001` | `R-001`,`R-002` | `DS-001` | Remote sharing disabled keeps bridge loopback-only and remote nodes unsupported | `AV-001` | `API` | `Planned` |
| `AC-002` | `R-002`,`R-003`,`R-004`,`R-010` | `DS-001`,`DS-003` | Pairing applies only to the selected node and updates visible node state | `AV-002` | `API` | `Planned` |
| `AC-003` | `R-006`,`R-007` | `DS-001`,`DS-004` | Browser tool advertisement becomes available without remote restart | `AV-003` | `API` | `Planned` |
| `AC-004` | `R-004`,`R-008`,`R-009` | `DS-002` | Paired remote node can execute browser tools only when tool names are configured | `AV-004` | `API` | `Planned` |
| `AC-005` | `R-003`,`R-005`,`R-008`,`R-010` | `DS-003`,`DS-005` | Missing or invalid pairing fails safely and state is visible | `AV-005` | `API` | `Planned` |
| `AC-006` | `R-005`,`R-006`,`R-010` | `DS-003`,`DS-004`,`DS-005` | Revocation or expiry removes access and status updates without restart | `AV-006` | `API` | `Planned` |
| `AC-007` | `R-009`,`R-011` | `DS-002` | Embedded browser path remains unchanged | `AV-007` | `API` | `Planned` |
| `AC-008` | `R-007` | `DS-001`,`DS-002`,`DS-003` | Validation covers positive and negative runtime behavior and live configuration | `AV-008` | `API` | `Planned` |

### Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- |
| `C-001` to `C-005` | Electron bridge foundation task | `No` | Unit + `AV-001`,`AV-002`,`AV-006` |
| `C-006` to `C-013` | Electron app boundary and UI task | `No` | Unit + `AV-002`,`AV-006` |
| `C-014` to `C-020` | Server runtime capability and execution task | `No` | Unit + Integration + `AV-003`,`AV-004`,`AV-005` |
| `C-021` | Validation task | `No` | Unit + Integration + all `AV-*` |

### Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| `T-DEL-001` | `BrowserBridgeServer.authToken` single-token field | `Remove` | Replace with registry-backed token lookup and delete stale single-token code paths | Auth failures if request authorization is not updated consistently |
| `T-DEL-002` | Env-only browser support assumption in server browser capability | `Remove` | Route support resolution through the new config resolver and delete direct env checks from callers | Execution path drift if one caller bypasses the resolver |
| `T-DEL-003` | Startup-only browser tool registration assumption | `Remove` | Make register/unregister runtime-usable and remove one-way startup dependency in live remote pairing path | Tool advertisement drift if unregister logic is incomplete |

### Step-By-Step Plan

1. Implement Electron browser foundations for multi-token bridge auth, remote sharing settings, and local pairing lifecycle ownership.
2. Extend Electron IPC and persisted node registry state for advanced remote sharing settings and per-node pairing status.
3. Add renderer pair/unpair client flow and scoped NodeManager controls.
4. Implement server runtime registration, expiry, config resolution, and live tool-registry synchronization.
5. Rewire server execution-time browser support to use runtime-or-env config resolution.
6. Add and pass targeted Electron, web, and server unit tests.
7. Add and pass integration tests for pair, advertisement without restart, execute, revoke, expiry, and embedded non-regression.

### Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight (no kitchen-sink base or overlapping parallel shapes introduced): `Yes`
- Shared design/common-practice rules reapplied during implementation (and any file-level design weakness routed as `Design Impact` when needed): `Yes`
- Spine Span Sufficiency preserved (implementation still follows a global enough primary spine, not only a local touched path): `Yes`
- Authoritative Boundary Rule preserved (no boundary bypass / no mixed-level dependency): `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`
- Changed source implementation files kept within proactive size-pressure guardrails (`>500` avoided; `>220` pressure assessed/acted on): `Yes`

### Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/in-progress/remote-browser-bridge-pairing/code-review.md`
- Required scorecard shape:
  - overall `/10`
  - overall `/100`
  - all ten categories in canonical priority order with `score + why this score + what is weak + what should improve`
  - clean pass target: no category below `9.0`
  - overall summary is trend-only; it is not the pass/fail rule
- Scope (source + tests): Electron browser subsystem, Electron IPC/node registry wiring, renderer node-management UX, server browser capability/runtime registration, and targeted tests.
- line-count measurement command (`effective non-empty`):
  - effective non-empty line count: `rg -n "\\S" <file-path> | wc -l`
  - changed-line delta: `git diff --numstat <base-ref>...HEAD -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action: split or extract owners before Stage 8 if `NodeManager.vue`, `main.ts`, or browser service files grow too far.
- per-file diff delta gate (`>220` changed lines) assessment approach: monitor large touched source files after each ownership slice and extract helpers/controllers before validation closes.
- Hard-limit handling details in `code-review.md` (required re-entry path and split/refactor plan): `Required`
- file-placement review approach (how wrong-folder placements will be detected and corrected): keep Electron browser logic under `autobyteus-web/electron/browser/`, renderer orchestration in `autobyteus-web/`, server runtime capability in `autobyteus-server-ts/src/agent-tools/browser/`, and GraphQL boundary in `autobyteus-server-ts/src/api/graphql/types/`.
- scorecard evidence-prep notes (which changed files, boundaries, tests, and edge-case paths support each Stage 8 category): use pairing, execution, revoke, expiry, and embedded regression tests plus ownership boundary review of controller/resolver/service splits.

| File | Current Line Count | Adds/Expands Functionality (`Yes`/`No`) | Ownership/SoC Risk (`Low`/`Medium`/`High`) | Required Action (`Keep`/`Split`/`Move`/`Refactor`) | Expected Review Classification if not addressed |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/NodeManager.vue` | `TBD` | `Yes` | `High` | `Split` if advanced settings and pair/unpair logic start to dominate existing sync UI | `Separation of Concerns and File Placement` |
| `autobyteus-web/electron/main.ts` | `TBD` | `Yes` | `Medium` | `Refactor` by keeping pairing wiring behind dedicated handlers/controllers | `Ownership Clarity and Boundary Encapsulation` |
| `autobyteus-server-ts/src/agent-tools/browser/browser-tool-service.ts` | `TBD` | `Yes` | `Medium` | `Keep` if config resolution stays delegated; otherwise `Split` | `API / Interface / Query / Command Clarity` |

### Test Strategy

- Unit tests:
  - Electron browser settings, auth registry, local expiry controller, node registry migration, preload and IPC contracts
  - Renderer node store and NodeManager pair/unpair UI logic
  - Server config resolver, runtime registration service, registry sync, GraphQL resolver, and browser service support resolution
- Integration tests:
  - Pair remote browser bridge and observe live tool advertisement without restart
  - Execute browser work on a paired node with configured browser tool names
  - Reject browser work when pairing is missing, revoked, or expired
  - Preserve embedded browser behavior
- Stage 6 boundary: file and service-level verification, while preserving readable subsystem grouping, only (unit + integration).
- Stage 7 handoff notes for API/E2E and executable validation:
  - canonical artifact path: `tickets/in-progress/remote-browser-bridge-pairing/api-e2e-testing.md`
  - expected acceptance criteria count: `8`
  - critical flows to validate (API/E2E/executable validation): settings off, pair, advertisement refresh, execute, reject unpaired, expire, revoke, embedded non-regression
  - expected scenario count: `8`
  - known environment constraints: remote-pairing integration may need targeted mocks or local harnesses for Electron bridge reachability
  - detailed scenario execution results, failure history, and escalation records belong in the Stage 7 artifact, not here
- Stage 8 handoff notes for code review:
  - canonical artifact path: `tickets/in-progress/remote-browser-bridge-pairing/code-review.md`
  - expected scorecard drag areas: `NodeManager.vue` size pressure, `main.ts` wiring concentration, browser capability dual-source resolution clarity
  - predicted design-impact hotspots: Electron pairing lifecycle vs auth ownership, runtime registry sync idempotency
  - predicted file-placement hotspots: renderer helpers vs Electron browser subsystem, GraphQL resolver vs browser runtime service
  - predicted interface/API/query/command/service-method boundary hotspots: preload contract shape, GraphQL mutation inputs, browser support resolver API
  - files likely to exceed size/ownership/SoC thresholds: `NodeManager.vue`, `main.ts`

### Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/NodeManager.vue` | `autobyteus-web/utils/nodeRemoteBrowserPairingClient.ts`, Electron preload APIs | UI must orchestrate both local Electron and remote node actions for pairing | Keep the component orchestration-only and move transport/state logic into helpers and stores | Pair/unpair flow is implemented and component remains action-focused | `Not Needed` | Renderer/node UX |
| `autobyteus-web/electron/browser/browser-pairing-state-controller.ts` | `autobyteus-web/electron/nodeRegistryStore.ts` | Pairing lifecycle owns visible node state transitions | Keep controller as the only writer of pairing lifecycle state outside explicit node add/remove/rename operations | Node pairing states are persisted without renderer-side duplication | `Not Needed` | Electron browser subsystem |

### Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| `Renderer ownership drift and source-file size gate breach` | `autobyteus-web/components/settings/NodeManager.vue`, Stage 6 implementation review | `Ownership Map`, `Change Inventory`, `Concrete Pairing Flow`, `File Responsibility Draft` | Split remote-browser-sharing UX into dedicated renderer owners and return `NodeManager` to a host/composition role | `Resolved` |
| `Paired-node removal left local token/timer cleanup implicit` | `autobyteus-web/electron/main.ts` remove path, `browser-pairing-state-controller.ts` expiry path | `DS-003`, `Concrete Unpair / Expiry Flow`, `Ownership-Driven Dependency Rules` | Make Electron main route node deletion through authoritative pairing cleanup before registry removal | `Resolved` |

## Execution Tracking (Update Continuously)

### Kickoff Preconditions Checklist

- Workflow state is current (`tickets/in-progress/<ticket-name>/workflow-state.md`): `Yes`
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Yes`
- Scope classification confirmed (`Small`/`Medium`/`Large`): `Yes`
- Investigation notes are current (`tickets/in-progress/<ticket-name>/investigation-notes.md`): `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes`
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- Future-state runtime call stack review reached `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- 2026-04-10: Implementation kickoff baseline created.
- 2026-04-10: Completed Stage 6 design-impact re-entry and refreshed the investigation, design, future-state runtime call stack, and review artifacts to v3.
- 2026-04-10: Extracted `RemoteBrowserSharingPanel.vue`, `RemoteNodePairingControls.vue`, and `remoteBrowserSharingStore.ts`; `NodeManager.vue` dropped to `488` effective non-empty lines and now acts as the host/composition surface.
- 2026-04-10: Added authoritative local cleanup for paired-node removal in `autobyteus-web/electron/main.ts` and `autobyteus-web/electron/browser/browser-pairing-state-controller.ts`.
- 2026-04-10: Serial web validation passed with:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web exec vitest run components/settings/__tests__/RemoteBrowserSharingPanel.spec.ts`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web exec vitest run components/settings/__tests__/RemoteNodePairingControls.spec.ts`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web exec vitest run stores/__tests__/remoteBrowserSharingStore.spec.ts`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web exec vitest run components/settings/__tests__/NodeManager.spec.ts`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web exec vitest run electron/browser/__tests__/browser-pairing-state-controller.spec.ts`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web exec vitest run electron/__tests__/nodeRegistryStore.spec.ts`
- 2026-04-10: Stage 7 durable validation assets added:
  - `autobyteus-web/electron/browser/__tests__/remote-browser-sharing-settings-store.spec.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/remote-browser-bridge-runtime.e2e.test.ts`
- 2026-04-10: Stage 7 serial executable validation passed with:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web exec vitest run electron/browser/__tests__/remote-browser-sharing-settings-store.spec.ts`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web exec vitest run electron/browser/__tests__/browser-pairing-state-controller.spec.ts`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web exec vitest run stores/__tests__/remoteBrowserSharingStore.spec.ts`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web exec vitest run components/settings/__tests__/NodeManager.spec.ts`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts exec vitest run tests/e2e/runtime/remote-browser-bridge-runtime.e2e.test.ts`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts exec vitest run tests/unit/agent-tools/browser/runtime-browser-bridge-registration-service.test.ts`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts`
  - `RUN_CODEX_E2E=1 pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts exec vitest run tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts -t "executes open_tab through the live Codex browser dynamic tool path"`
- 2026-04-10: Serial Electron TypeScript validation passed with:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web exec tsc -p electron/tsconfig.json --noEmit`
- 2026-04-10: Earlier Stage 6 server validation remained green from the first implementation pass with:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts exec vitest run tests/unit/agent-tools/browser/browser-bridge-client.test.ts`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts exec vitest run tests/unit/agent-tools/browser/register-browser-tools.test.ts`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts exec vitest run tests/unit/agent-tools/browser/runtime-browser-bridge-registration-service.test.ts`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts exec vitest run tests/unit/agent-tools/browser/browser-bridge-config-resolver.test.ts`
- 2026-04-10: Stage 8 round 1 failed with two `Local Fix` findings recorded in `code-review.md`:
  - `CR-001`: listener-host policy is owned twice across `remote-browser-sharing-settings-store.ts` and `browser-runtime.ts`
  - `CR-002`: new remote-browser-sharing UI/store messages bypass the existing localization subsystem
- 2026-04-10: Stage 6 local-fix re-entry plan:
  - drive browser-runtime startup from one authoritative listener-host value
  - move new user-visible remote-browser-sharing text onto the existing localization path
  - rerun targeted renderer/Electron tests plus TypeScript validation before Stage 7 revalidation
- 2026-04-10: Moved the ticket into dedicated worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-browser-bridge-pairing` on branch `codex/remote-browser-bridge-pairing`; the root `personal` worktree was cleaned of the ticket-owned paths.
- 2026-04-10: Completed the Stage 6 local fixes:
  - `browser-runtime.ts` now consumes the authoritative listener-host value from Electron bootstrap instead of recomputing the bind-host policy locally.
  - `RemoteBrowserSharingPanel.vue`, `RemoteNodePairingControls.vue`, `remoteBrowserSharingStore.ts`, and the remove-node warning path in `NodeManager.vue` now use localized text.
- 2026-04-10: Serial isolated-worktree validation passed with:
  - `pnpm -C autobyteus-web exec vitest run electron/browser/__tests__/browser-runtime.spec.ts`
  - `pnpm -C autobyteus-web exec vitest run electron/browser/__tests__/remote-browser-sharing-settings-store.spec.ts`
  - `pnpm -C autobyteus-web exec vitest run electron/browser/__tests__/browser-pairing-state-controller.spec.ts`
  - `pnpm -C autobyteus-web exec vitest run components/settings/__tests__/RemoteBrowserSharingPanel.spec.ts`
  - `pnpm -C autobyteus-web exec vitest run components/settings/__tests__/RemoteNodePairingControls.spec.ts`
  - `pnpm -C autobyteus-web exec vitest run stores/__tests__/remoteBrowserSharingStore.spec.ts`
  - `pnpm -C autobyteus-web exec vitest run components/settings/__tests__/NodeManager.spec.ts`
  - `pnpm -C autobyteus-web exec tsc -p electron/tsconfig.json --noEmit`
