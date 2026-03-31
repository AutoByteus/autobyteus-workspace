# Implementation

Use this single artifact for both:
- the stable Stage 6 implementation baseline
- the live Stage 6 execution/progress record
- brief downstream handoff/status pointers for Stages 7, 8, and 9

## Scope Classification

- Classification: `Large`
- Reasoning: new cross-project preview capability spanning Electron shell ownership, server-side tooling, and three runtime-adapter paths.
- Workflow Depth:
  - `Large` -> proposed design doc -> future-state runtime call stack -> future-state runtime call stack review (iterative deep rounds until `Go Confirmed`) -> `implementation.md` baseline -> implementation execution

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md`
- Investigation notes: `tickets/in-progress/preview-session-multi-runtime-design/investigation-notes.md`
- Requirements: `tickets/in-progress/preview-session-multi-runtime-design/requirements.md`
  - Current Status: `Refined`
- Runtime call stacks: `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack-review.md`
- Proposed design: `tickets/in-progress/preview-session-multi-runtime-design/proposed-design.md`

## Document Status

- Current Status: `In Execution`
- Notes: `v6` design basis accepted; implementation starts from the narrowed dedicated-preview-window MVP with Electron main as lifecycle owner.

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

### Solution Sketch

- Use Cases In Scope: `UC-001` through `UC-007`
- Spine Inventory In Scope: `DS-001` through `DS-005`
- Primary Owners / Main Domain Subjects: `PreviewSessionManager`, preview bridge server/client, `PreviewToolService`, runtime adapters for `autobyteus`, `codex_app_server`, and `claude_agent_sdk`
- Requirement Coverage Guarantee: `R-001` through `R-009` each map to at least one in-scope use case and at least one planned task in the tables below
- Design-Risk Use Cases: `UC-007`
  - Risk / objective: preserve authoritative session invariants and deterministic closed-vs-not-found semantics under mixed bridge commands and native close events
- Target Architecture Shape:
  - Electron preview subsystem under `autobyteus-web/electron/preview`
  - server-side preview tool subsystem under `autobyteus-server-ts/src/agent-tools/preview`
  - thin runtime adapters under existing Codex and Claude backend folders
- New Owners / Boundary Interfaces To Introduce:
  - `PreviewSessionManager`
  - preview window factory
  - preview console log buffer
  - preview screenshot artifact writer
  - preview bridge server
  - preview tool contract
  - `PreviewToolService`
  - preview bridge client
- Primary file/task set: see `Implementation Work Table`
- API / Behavior Delta:
  - add `open_preview`, `navigate_preview`, `capture_preview_screenshot`, `get_preview_console_logs`, and `close_preview`
  - expose preview tools only when the packaged local Electron shell bridge is available
  - return opaque `preview_session_id` values and canonical preview errors across all runtimes
- Key Assumptions:
  - v1 remains local-shell-only and does not attempt remote-node preview
  - dedicated preview windows are the only preview surface in v1
  - renderer continues to learn preview outcomes through the existing tool-result/activity stream only
- Known Risks:
  - Electron security defaults for preview windows must remain strict
  - `main.ts` and `claude-session.ts` are already near Stage 8 size-pressure thresholds
  - runtime exposure differences could drift if adapters take on policy instead of translation only

### Runtime Call Stack Review Gate Summary

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 13 | Fail | Yes | No | Yes | `Design Impact` | `3 -> 4 -> 5` | `Reset` | 0 |
| 14 | Pass | No | No | N/A | `N/A` | `N/A` | `Candidate Go` | 1 |
| 15 | Pass | No | No | N/A | `N/A` | `N/A` | `Go Confirmed` | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `15`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

### Principles

- Bottom-up: implement owners and boundaries before dependents.
- Test-driven: add unit and integration coverage alongside implementation slices.
- Spine-led implementation rule: sequence by spine and owner first; files are derived from ownership.
- Mandatory modernization rule: no backward-compatibility shims or legacy branches.
- Mandatory cleanup rule: remove dead paths and avoid introducing renderer-preview or node-window-preview side tracks.
- Mandatory ownership/decoupling/SoC rule: keep shell lifecycle in Electron, shared preview semantics in the server tool layer, and runtime differences at adapters only.
- Mandatory shared-structure coherence rule: keep canonical preview contract tight; do not expand it into runtime-specific kitchen-sink shapes.
- Mandatory file-placement rule: preview-specific semantics stay out of `autobyteus-ts`; native lifecycle stays under Electron.
- Mandatory shared-principles implementation rule: if file-level reality breaks the approved boundary model, classify `Design Impact` instead of patching around it locally.
- Mandatory proactive size-pressure rule: `autobyteus-web/electron/main.ts` and `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` must be kept under tight diff control.

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | `DS-005` | `PreviewSessionManager` | `autobyteus-web/electron/preview/preview-session-manager.ts` + support files | None | lifecycle truth must exist before bridge/server/tool layers can delegate to it |
| 2 | `DS-001`, `DS-002`, `DS-003` | Electron preview subsystem | `preview-window-factory.ts` and `preview-bridge-server.ts` | 1 | shell boundary and native surface depend on the owner |
| 3 | `DS-001` | Electron shell | `autobyteus-web/electron/main.ts` and shell runtime-env integration | 2 | packaged bridge startup and env injection gates all later tool exposure |
| 4 | `DS-001`, `DS-002`, `DS-003` | `PreviewToolService` | `preview-tool-contract.ts`, `preview-bridge-client.ts`, `preview-tool-service.ts` | 3 | server-side contract and delegation layer depends on the shell bridge shape |
| 5 | `DS-002`, `DS-003` | `autobyteus` native tool layer | `autobyteus-server-ts/src/agent-tools/preview/*.ts` | 4 | local tool registration is the simplest runtime path and validates the shared service first |
| 6 | `DS-001`, `DS-002`, `DS-003` | Codex runtime adapter | `autobyteus-server-ts/src/agent-execution/backends/codex/preview/*` and bootstrap wiring | 4, 5 | dynamic-tool exposure should reuse the already-proven canonical service |
| 7 | `DS-001`, `DS-002`, `DS-003` | Claude runtime adapter | `autobyteus-server-ts/src/agent-execution/backends/claude/preview/*` and `claude-session.ts` merge | 4, 5 | run-level MCP merge is the last dependent path and touches a larger existing file |

### File Placement Plan

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| Preview lifecycle owner | `N/A` | `autobyteus-web/electron/preview/preview-session-manager.ts` | Electron preview lifecycle | `Keep` | verify session truth never leaves Electron main |
| Preview window construction | `N/A` | `autobyteus-web/electron/preview/preview-window-factory.ts` | Electron preview window boundary | `Keep` | verify no preview navigation is added to node-bound shell windows |
| Preview bridge server | `N/A` | `autobyteus-web/electron/preview/preview-bridge-server.ts` | Electron shell boundary | `Keep` | verify bridge file does translation only |
| Preview contract | `N/A` | `autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts` | server-side preview tool semantics | `Keep` | verify no preview-specific code lands in `autobyteus-ts` |
| Preview shared service | `N/A` | `autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts` | server-side repeated coordination owner | `Keep` | verify adapters remain translation-only |
| Preview bridge client | `N/A` | `autobyteus-server-ts/src/agent-tools/preview/preview-bridge-client.ts` | server-side preview transport boundary | `Keep` | verify transport details do not leak into adapters |
| `autobyteus` tool handlers | `N/A` | `autobyteus-server-ts/src/agent-tools/preview/*.ts` | native runtime tool exposure | `Keep` | verify registry-backed tools call canonical service only |
| Codex preview adapter | `N/A` | `autobyteus-server-ts/src/agent-execution/backends/codex/preview/*` | Codex dynamic tool translation | `Keep` | verify JSON-text result shaping stays adapter-local |
| Claude preview adapter | `N/A` | `autobyteus-server-ts/src/agent-execution/backends/claude/preview/*` | Claude MCP translation | `Keep` | verify MCP assembly stays run-level and session-owned lifecycle stays elsewhere |
| Claude run-level MCP merge | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | same path | Claude run assembly | `Keep` | verify only merge wiring lands here; preview semantics stay outside |

### Implementation Work Table

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | `DS-002`, `DS-003`, `DS-004`, `DS-005` | `PreviewSessionManager` | authoritative lifecycle owner + support files | `N/A` | `autobyteus-web/electron/preview/preview-session-manager.ts` | `Create` | None | `Completed` | `autobyteus-web/electron/preview/__tests__/preview-console-log-buffer.spec.ts`, `autobyteus-web/electron/preview/__tests__/preview-screenshot-artifact-writer.spec.ts` | `Passed` | `autobyteus-web/electron/preview/__tests__/preview-session-manager.integration.spec.ts` | `Planned` | `Planned` | lifecycle owner plus support files landed; dedicated session-manager executable validation remains deferred to later validation slices |
| C-002 | `DS-002` | Electron preview subsystem | preview window construction | `N/A` | `autobyteus-web/electron/preview/preview-window-factory.ts` | `Create` | C-001 | `Completed` | `autobyteus-web/electron/preview/__tests__/preview-window-factory.spec.ts` | `Planned` | `autobyteus-web/electron/preview/__tests__/preview-session-manager.integration.spec.ts` | `Planned` | `Planned` | preview windows stay separate from shell node windows |
| C-003 | `DS-001`, `DS-002`, `DS-003` | Electron preview subsystem | local authenticated bridge server | `N/A` | `autobyteus-web/electron/preview/preview-bridge-server.ts` | `Create` | C-001 | `Completed` | `autobyteus-web/electron/preview/__tests__/preview-bridge-server.spec.ts` | `Planned` | `autobyteus-web/electron/preview/__tests__/preview-bridge-server.integration.spec.ts` | `Planned` | `Planned` | boundary-only file; lifecycle ownership remains in `PreviewSessionManager` |
| C-004 | `DS-001` | Electron shell + Electron server owner | bridge startup plus packaged server runtime-env injection | `autobyteus-web/electron/main.ts` | same path plus `autobyteus-web/electron/server/serverRuntimeEnv.ts` and platform server managers | `Modify` | C-003 | `Completed` | `autobyteus-web/electron/server/__tests__/serverRuntimeEnv.spec.ts` | `Passed` | `autobyteus-web/electron/server/__tests__/BaseServerManager.spec.ts` | `Planned` | `Planned` | env injection moved through `buildServerRuntimeEnv(...)`; preview startup/error handling extracted into `preview-runtime.ts` to keep `main.ts` under the Stage 8 hard limit |
| C-005 | `DS-002`, `DS-003` | server-side preview tool subsystem | canonical preview contract | `N/A` | `autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts` | `Create` | C-004 | `Completed` | `autobyteus-server-ts/tests/unit/agent-tools/preview/preview-tool-contract.test.ts` | `Passed` | `autobyteus-server-ts/tests/integration/preview/preview-contract-parity.integration.test.ts` | `Planned` | `Planned` | keep runtime-neutral but server-local; preview-specific unit coverage is in place |
| C-006 | `DS-001`, `DS-002`, `DS-003` | `PreviewToolService` | support gating, validation, normalization, delegation | `N/A` | `autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts` | `Create` | C-003, C-004, C-005 | `Completed` | `autobyteus-server-ts/tests/integration/preview/preview-tool-service.integration.test.ts` | `Planned` | `autobyteus-server-ts/tests/e2e/runtime/runtime-capability-preview.e2e.test.ts` | `Planned` | `Planned` | adapters call the canonical service only; executable validation still pending environment setup |
| C-007 | `DS-002`, `DS-003` | server-side preview tool subsystem | bridge client transport | `N/A` | `autobyteus-server-ts/src/agent-tools/preview/preview-bridge-client.ts` | `Create` | C-003, C-005 | `Completed` | `autobyteus-server-ts/tests/unit/agent-tools/preview/preview-bridge-client.test.ts` | `Passed` | `autobyteus-server-ts/tests/integration/preview/preview-bridge-roundtrip.integration.test.ts` | `Planned` | `Planned` | transport-only owner; no server-side business ownership added here |
| C-008 | `DS-002`, `DS-003` | `autobyteus` native tool layer | registry-backed preview tools | `N/A` | `autobyteus-server-ts/src/agent-tools/preview/*.ts` | `Create` | C-005, C-006, C-007 | `Completed` | `autobyteus-server-ts/tests/integration/preview/autobyteus-preview-tools.integration.test.ts` | `Planned` | `autobyteus-server-ts/tests/e2e/runtime/autobyteus-preview-tools.e2e.test.ts` | `Planned` | `Planned` | open, navigate, screenshot, logs, and close handlers are implemented |
| C-009 | `DS-001`, `DS-002`, `DS-003` | Codex runtime adapter | dynamic tool exposure and result translation | `N/A` | `autobyteus-server-ts/src/agent-execution/backends/codex/preview/*` | `Create` | C-005, C-006, C-007 | `Completed` | `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/preview/build-preview-dynamic-tool-registrations.test.ts` | `Passed` | `autobyteus-server-ts/tests/e2e/runtime/codex-preview-tools.e2e.test.ts` | `Planned` | `Planned` | JSON-text result shaping remains at the Codex adapter boundary |
| C-010 | `DS-001`, `DS-002`, `DS-003` | Claude runtime adapter | preview MCP tool definitions | `N/A` | `autobyteus-server-ts/src/agent-execution/backends/claude/preview/*` | `Create` | C-005, C-006, C-007 | `Completed` | `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/preview/build-claude-preview-mcp-servers.test.ts` | `Passed` | `autobyteus-server-ts/tests/e2e/runtime/claude-preview-tools.e2e.test.ts` | `Planned` | `Planned` | run-level preview MCP support is implemented without adding preview policy into the adapter |
| C-011 | `DS-001` | Claude runtime | run-level MCP merge | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | same path | `Modify` | C-010 | `Completed` | `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/preview/build-claude-run-mcp-servers.test.ts` | `Passed` | `autobyteus-server-ts/tests/e2e/runtime/claude-preview-tools.e2e.test.ts` | `Planned` | `Planned` | existing team MCP merge behavior remains intact; preview MCP merge is run-level only |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R-001` | `AC-002` | `DS-002`, `DS-003` | `Canonical Preview Contract (Concrete Example)` | `UC-002`, `UC-005` | `C-001`, `C-005`, `C-006`, `C-008`, `C-009`, `C-010` | Unit + Integration | `AV-002`, `AV-005` |
| `R-002` | `AC-003`, `AC-008` | `DS-001`, `DS-002`, `DS-003` | `Summary`, `Architecture Direction Decision`, `Adapter Matrix` | `UC-001`, `UC-002`, `UC-003`, `UC-004` | `C-005` through `C-011` | Integration | `AV-001`, `AV-003`, `AV-004`, `AV-008` |
| `R-003` | `AC-001` | `DS-004`, `DS-005` | `Ownership Map` | `UC-006`, `UC-007` | `C-001`, `C-003`, `C-006` | Unit + Integration | `AV-006`, `AV-007` |
| `R-004` | `AC-004` | `DS-004` | `Summary`, `Return / Event Spine(s)` | `UC-006` | `C-001`, `C-004` | Integration | `AV-006` |
| `R-005` | `AC-004`, `AC-006` | `DS-001`, `DS-004` | `Goal / Intended Change`, `Architecture Direction Decision` | `UC-001`, `UC-006` | `C-001`, `C-002`, `C-004` | Integration | `AV-001`, `AV-006` |
| `R-006` | `AC-003`, `AC-005`, `AC-008` | `DS-001`, `DS-002`, `DS-003` | `Architecture Direction Decision`, `MCP Fit Evaluation` | `UC-001`, `UC-002`, `UC-003`, `UC-004` | `C-005` through `C-011` | Integration | `AV-001`, `AV-003`, `AV-004`, `AV-008` |
| `R-007` | `AC-001`, `AC-002` | `DS-003`, `DS-004`, `DS-005` | `Session Lifecycle / Error Rules` | `UC-005`, `UC-006`, `UC-007` | `C-001`, `C-006`, `C-007`, `C-008` | Unit + Integration | `AV-005`, `AV-006`, `AV-007` |
| `R-008` | `AC-006` | `DS-002`, `DS-003` | `Summary`, `Removal / Decommission Plan` | `UC-002`, `UC-005` | `C-001` through `C-011` | Integration | `AV-002`, `AV-005` |
| `R-009` | `AC-002`, `AC-008` | `DS-002`, `DS-003` | `Canonical Preview Contract (Concrete Example)` | `UC-002`, `UC-003`, `UC-004`, `UC-005` | `C-005` through `C-011` | Unit + Integration | `AV-003`, `AV-004`, `AV-005`, `AV-008` |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- | --- |
| `AC-001` | `R-003`, `R-007` | `DS-004`, `DS-005` | Electron main remains the authoritative preview-session owner and enforces deterministic close semantics | `AV-006`, `AV-007` | `E2E` | `Planned` |
| `AC-002` | `R-001`, `R-009` | `DS-002`, `DS-003` | all runtimes use one opaque `preview_session_id` contract | `AV-002`, `AV-003`, `AV-004`, `AV-005` | `API` | `Planned` |
| `AC-003` | `R-002`, `R-006` | `DS-001`, `DS-002`, `DS-003` | preview core is shared while runtime exposure differs only at adapters | `AV-001`, `AV-003`, `AV-004`, `AV-008` | `API` | `Planned` |
| `AC-004` | `R-004`, `R-005` | `DS-004` | preview lifecycle requires no preview-specific renderer event/store path in v1 | `AV-006` | `E2E` | `Planned` |
| `AC-005` | `R-006` | `DS-001`, `DS-002`, `DS-003` | Claude reaches preview through run-level MCP while other runtimes use their native exposure style | `AV-004`, `AV-008` | `API` | `Planned` |
| `AC-006` | `R-005`, `R-008` | `DS-002`, `DS-003` | v1 remains limited to dedicated preview windows plus the five MVP tools | `AV-001`, `AV-002`, `AV-005` | `E2E` | `Planned` |
| `AC-007` | workflow | `DS-001` through `DS-005` | implementation proceeds only from the approved review gate | `AV-009` | `API` | `Planned` |
| `AC-008` | `R-002`, `R-009` | `DS-001`, `DS-002`, `DS-003` | runtime adapters preserve semantic parity for success and error shapes | `AV-003`, `AV-004`, `AV-008` | `API` | `Planned` |

### Design Delta Traceability

| Change ID (from proposed design doc) | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- |
| `C-001` | `C-001` | `No` | Unit + Integration + `AV-002`/`AV-006`/`AV-007` |
| `C-002` | `C-002` | `No` | Unit + Integration + `AV-002` |
| `C-003` | `C-003` | `No` | Unit + Integration + `AV-001` |
| `C-004` | `C-004` | `No` | Unit + Integration + `AV-001` |
| `C-005` | `C-005` | `No` | Unit + Integration + `AV-002`/`AV-008` |
| `C-006` | `C-006` | `No` | Unit + Integration + `AV-001`/`AV-005` |
| `C-007` | `C-007` | `No` | Unit + Integration + `AV-001`/`AV-005` |
| `C-008` | `C-008` | `No` | Integration + `AV-002` |
| `C-009` | `C-009` | `No` | Integration + `AV-003` |
| `C-010` | `C-010` | `No` | Integration + `AV-004` |
| `C-011` | `C-011` | `No` | Integration + `AV-004`/`AV-008` |

### Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| `T-DEL-001` | preview navigation in shell node-window helpers | `Remove` | verify no preview-specific logic is added to existing node-bound window creation paths | preview could accidentally inherit shell restrictions or mixed ownership |
| `T-DEL-002` | preview-specific renderer IPC/store path in v1 | `Remove` | verify no new `preload.ts` preview API or renderer preview store is introduced | would violate v1 scope discipline and minimal event surface |
| `T-DEL-003` | dynamic outer right-side preview tabs in v1 | `Remove` | verify no static-tab shell modifications are added for per-session previews | would add UI complexity without serving the MVP |

### Step-By-Step Plan

1. Inspect the actual Electron shell startup and server-runtime-env code paths to confirm the minimal touch set for bridge startup and env injection.
2. Implement the Electron preview owner and support files under `autobyteus-web/electron/preview`.
3. Wire preview bridge startup and lifecycle into the Electron shell without reusing node-bound shell windows.
4. Implement the server-side preview contract, bridge client, and `PreviewToolService`.
5. Add `autobyteus` preview tools and validate canonical contract behavior locally.
6. Add Codex preview dynamic tools and bootstrap gating.
7. Add Claude preview MCP adapter plus run-level MCP merge in `claude-session.ts`.
8. Run unit/integration validation for each slice, update Stage 6 tracking, and classify re-entry immediately if the approved boundaries prove incomplete.

### Backward-Compat And Decoupling Guardrails

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight (no kitchen-sink base or overlapping parallel shapes introduced): `Yes`
- Shared design/common-practice rules reapplied during implementation (and any file-level design weakness routed as `Design Impact` when needed): `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`
- Changed source implementation files kept within proactive size-pressure guardrails (`>500` avoided; `>220` pressure assessed/acted on): `Yes`; preview startup/error handling was extracted into `preview-runtime.ts`, and `main.ts` now measures `497` effective non-empty lines

### Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/in-progress/preview-session-multi-runtime-design/code-review.md`
- Scope (source + tests): Electron preview subsystem, server-side preview tool subsystem, Codex/Claude adapter wiring, and any touched supporting tests
- line-count measurement command (`effective non-empty`):
  - effective non-empty line count: `rg -n "[^[:space:]]" <file-path> | wc -l`
  - changed-line delta: `git diff --numstat <base-ref>...HEAD -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action: split new preview owners/support files or extract helpers before Stage 8 if any changed source file trends toward the hard limit
- per-file diff delta gate (`>220` changed lines) assessment approach: measure after each implementation slice and split support logic or adapter wiring if a single file accumulates too much mixed-concern change
- Hard-limit handling details in `code-review.md` (required re-entry path and split/refactor plan): record any file that approaches the limit and the mitigating split/refactor taken during Stage 6
- file-placement review approach (how wrong-folder placements will be detected and corrected): compare each touched file to the approved ownership map and refuse preview-specific additions in `autobyteus-ts`, renderer stores, or generic shell node-window helpers

| File | Current Line Count | Adds/Expands Functionality (`Yes`/`No`) | Ownership/SoC Risk (`Low`/`Medium`/`High`) | Required Action (`Keep`/`Split`/`Move`/`Refactor`) | Expected Review Classification if not addressed |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/main.ts` | `497` | `Yes` | `High` | `Keep` after extracting preview startup/error handling into `preview-runtime.ts`; continue diff-pressure watch | `Design Impact` |
| `autobyteus-web/electron/server/baseServerManager.ts` | `340` | `Maybe` | `Medium` | `Keep` only because runtime-env ownership already lives there | `Local Fix` |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | `428` | `Yes` | `High` | `Keep` with merge-only changes; preview builder stays extracted | `Design Impact` |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | `224` | `Maybe` | `Medium` | `Keep`; preview hook remains bootstrap-only and below hard-limit pressure | `Local Fix` |
| `autobyteus-web/electron/preview/preview-session-manager.ts` | `376` | `Yes` | `Medium` | `Keep`; support concerns already split into dedicated helper files | `Design Impact` |
| `autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts` | `351` | `Yes` | `Medium` | `Keep`; Stage 8 must explicitly assess whether contract/schema/error-shape density is still one-owner coherent | `Local Fix` |

### Test Strategy

- Unit tests:
  - Electron preview owner and support files under `autobyteus-web/electron/preview/__tests__`
  - preview contract/service/bridge-client behavior under `autobyteus-server-ts/tests/integration/preview`
- Integration tests:
  - Electron bridge round-trip and runtime-env injection in `autobyteus-web/electron/server/__tests__` and `autobyteus-web/electron/preview/__tests__`
  - server-side preview tool and runtime-adapter parity in `autobyteus-server-ts/tests/integration/preview`
- Stage 6 boundary: file and service-level verification only (unit + integration)
- Stage 7 handoff notes for API/E2E and executable validation:
  - canonical artifact path: `tickets/in-progress/preview-session-multi-runtime-design/api-e2e-testing.md`
  - expected acceptance criteria count: `8`
  - critical flows to validate (API/E2E/executable validation):
    - capability exposure gating
    - preview open across three runtimes
    - screenshot/log/close semantics
    - native close invalidation
    - Claude run-level MCP merge parity
  - expected scenario count: `9`
  - known environment constraints:
    - packaged Electron shell or an equivalent test harness is required for real preview validation
    - remote-node preview is intentionally out of scope
- Stage 8 handoff notes for code review:
  - canonical artifact path: `tickets/in-progress/preview-session-multi-runtime-design/code-review.md`
  - predicted design-impact hotspots:
    - `main.ts` preview startup wiring
    - `claude-session.ts` MCP merge
    - `PreviewSessionManager` scope creep
  - predicted file-placement hotspots:
    - any attempt to place preview semantics in `autobyteus-ts`
    - any renderer-side preview store or preload API in v1
  - predicted interface/API/query/command/service-method boundary hotspots:
    - contract parsing vs service validation
    - bridge client/server vs lifecycle owner responsibilities
  - files likely to exceed size/ownership/SoC thresholds:
    - `autobyteus-web/electron/main.ts`
    - `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts`
    - `autobyteus-web/electron/preview/preview-session-manager.ts`

### Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/main.ts` | `autobyteus-web/electron/server/baseServerManager.ts` | preview bridge env injection may sit across existing shell-startup and server-startup owners | keep preview-specific logic in helper functions and push env mutation to the existing server owner | actual source ownership is confirmed during first implementation slice | `Not Needed` | Electron shell |

### Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| `main.ts` size pressure exceeded the hard limit during preview wiring | `autobyteus-web/electron/main.ts`, `autobyteus-web/electron/preview/preview-runtime.ts` | `implementation.md` code-review gate plan | extract preview startup/error handling into `preview-runtime.ts`; re-measure after edit and keep ownership unchanged | `Updated` |

## Execution Tracking (Update Continuously)

### Kickoff Preconditions Checklist

- Workflow state is current (`tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md`): `Yes`
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Yes`
- Scope classification confirmed (`Small`/`Medium`/`Large`): `Yes`
- Investigation notes are current (`tickets/in-progress/preview-session-multi-runtime-design/investigation-notes.md`): `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes`
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- Future-state runtime call stack review reached `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- 2026-03-31: Implementation kickoff baseline created and Stage 6 unlocked.
- 2026-03-31: Electron preview subsystem implemented under `autobyteus-web/electron/preview`, including `PreviewSessionManager`, dedicated preview window creation, screenshot artifact writing, console-log buffering, and the local authenticated preview bridge server.
- 2026-03-31: Electron server runtime-env injection was wired through `buildServerRuntimeEnv(...)`, `BaseServerManager` runtime overrides, and the platform server managers; preview startup/error handling was extracted into `preview-runtime.ts`, bringing `autobyteus-web/electron/main.ts` back to `497` effective non-empty lines.
- 2026-03-31: Server-side preview tool subsystem and runtime adapters were implemented under `autobyteus-server-ts`, including registry-backed preview tools, Codex dynamic tool registrations, Claude preview MCP tooling, and the run-level MCP merge path in `claude-session.ts`.
- 2026-03-31: Workspace dependencies were hydrated with `pnpm install --frozen-lockfile`, clearing the earlier package-install blocker.
- 2026-03-31: Focused Electron-side validation passed with `pnpm dlx vitest@3.2.4 --config electron/vitest.config.ts run electron/server/__tests__/serverRuntimeEnv.spec.ts electron/preview/__tests__/preview-console-log-buffer.spec.ts electron/preview/__tests__/preview-screenshot-artifact-writer.spec.ts`.
- 2026-03-31: Electron compile validation passed with `pnpm transpile-electron`.
- 2026-03-31: Preview-specific server-side unit validation passed with `pnpm exec vitest run tests/unit/agent-tools/preview/preview-tool-contract.test.ts tests/unit/agent-tools/preview/preview-bridge-client.test.ts tests/unit/agent-execution/backends/codex/preview/build-preview-dynamic-tool-registrations.test.ts tests/unit/agent-execution/backends/claude/preview/build-claude-preview-mcp-servers.test.ts tests/unit/agent-execution/backends/claude/preview/build-claude-run-mcp-servers.test.ts`.
- 2026-03-31: Package-wide `autobyteus-server-ts` typecheck/build checks remain noisy due existing repository baseline issues outside preview scope, including `tests` vs `rootDir` configuration errors in `tsconfig.json` and unrelated package-resolution/Prisma typing failures.

### Scope Change Log

| Date | Previous Scope | New Scope | Trigger | Required Action |
| --- | --- | --- | --- | --- |
| 2026-03-31 | `Large` | `Large` | Initial Stage 6 baseline | Continue against approved `v6` design basis |

### Implementation Work Updates

| Change ID | Last Failure Classification | Last Failure Investigation Required | Cross-Reference Smell | Design Follow-Up | Requirement Follow-Up | Last Verified | Verification Command | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `N/A` | `No` | `None` | `Not Needed` | `Not Needed` | `2026-03-31` | `pnpm dlx vitest@3.2.4 --config electron/vitest.config.ts run electron/server/__tests__/serverRuntimeEnv.spec.ts electron/preview/__tests__/preview-console-log-buffer.spec.ts electron/preview/__tests__/preview-screenshot-artifact-writer.spec.ts` | Owner and owner-local support files landed; dedicated session-manager executable coverage still pending |
| `C-004` | `N/A` | `No` | `main.ts <-> baseServerManager.ts` | `Not Needed` | `Not Needed` | `2026-03-31` | `pnpm dlx vitest@3.2.4 --config electron/vitest.config.ts run electron/server/__tests__/serverRuntimeEnv.spec.ts electron/preview/__tests__/preview-console-log-buffer.spec.ts electron/preview/__tests__/preview-screenshot-artifact-writer.spec.ts` | Actual env injection seam confirmed in Electron server runtime-env builders; `main.ts` reduced to 497 effective lines after extracting `preview-runtime.ts` |
| `C-009` | `N/A` | `No` | `None` | `Not Needed` | `Not Needed` | `2026-03-31` | `pnpm exec vitest run tests/unit/agent-tools/preview/preview-tool-contract.test.ts tests/unit/agent-tools/preview/preview-bridge-client.test.ts tests/unit/agent-execution/backends/codex/preview/build-preview-dynamic-tool-registrations.test.ts tests/unit/agent-execution/backends/claude/preview/build-claude-preview-mcp-servers.test.ts tests/unit/agent-execution/backends/claude/preview/build-claude-run-mcp-servers.test.ts` | Codex dynamic preview registrations and result shaping are validated with the preview-specific server unit suite |
| `C-011` | `Validation Gap` | `Yes` | `None` | `Not Needed` | `Not Needed` | `2026-03-31` | `pnpm exec vitest run tests/unit/agent-tools/preview/preview-tool-contract.test.ts tests/unit/agent-tools/preview/preview-bridge-client.test.ts tests/unit/agent-execution/backends/codex/preview/build-preview-dynamic-tool-registrations.test.ts tests/unit/agent-execution/backends/claude/preview/build-claude-preview-mcp-servers.test.ts tests/unit/agent-execution/backends/claude/preview/build-claude-run-mcp-servers.test.ts` | Preview-specific runtime merge logic is validated; remaining package-wide `autobyteus-server-ts` typecheck/build noise is repo baseline, not preview-specific |

### Downstream Stage Status Pointers

| Stage | Canonical Artifact | Current Status | Last Updated | Notes |
| --- | --- | --- | --- | --- |
| 7 API/E2E + Executable Validation | `tickets/in-progress/preview-session-multi-runtime-design/api-e2e-testing.md` | `Not Started` | `2026-03-31` | Scenario IDs `AV-001` through `AV-009` reserved in this baseline |
| 8 Code Review | `tickets/in-progress/preview-session-multi-runtime-design/code-review.md` | `Not Started` | `2026-03-31` | File-size pressure watch active during Stage 6 |
| 9 Docs Sync | `tickets/in-progress/preview-session-multi-runtime-design/docs-sync.md` | `Not Started` | `2026-03-31` | docs impact expected if preview tools ship |

### Blocked Items

| Change ID | Blocked By | Unblock Condition | Owner/Next Action |
| --- | --- | --- | --- |
| Repository-wide `autobyteus-server-ts` build/typecheck smoke | existing repo-baseline TypeScript/Prisma/path-resolution failures outside preview scope, including `tests` vs `rootDir` config errors in `tsconfig.json` and unrelated package-resolution failures during `tsc -p tsconfig.build.json --noEmit` | address the underlying repository-wide build baseline or explicitly waive that broader smoke check for preview-only Stage 6 closeout | treat preview-specific validation as green; if package-wide clean builds are required, fix the repo baseline separately before using that signal as a gate |

### Design Feedback Loop Log

| Date | Trigger File(s) | Smell Description | Design Section Updated | Update Status | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-03-31 | `autobyteus-web/electron/main.ts`, `autobyteus-web/electron/server/serverRuntimeEnv.ts` | File-level inspection showed preview bridge env injection belongs in Electron server runtime-env builders, not only the shell entrypoint | `implementation.md` file-placement and work-table rows | `Updated` | ownership unchanged; no design re-entry required |
| 2026-03-31 | `autobyteus-web/electron/main.ts`, `autobyteus-web/electron/preview/preview-runtime.ts` | `main.ts` temporarily exceeded the Stage 8 hard limit during preview wiring | `implementation.md` code-review gate plan and progress log | `Updated` | local fix only; preview startup/error handling moved into `preview-runtime.ts`; no design re-entry required |

### Remove/Rename/Legacy Cleanup Verification Log

| Date | Change ID | Item | Verification Performed | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-03-31 | `T-DEL-001` | node-window preview reuse | inspected `autobyteus-web/electron/main.ts` and preview runtime files; preview uses `PreviewWindowFactory` and `createNodeBoundWindow(...)` remains shell-only | `Passed` | preview navigation ownership stays outside existing node-bound shell windows |
| 2026-03-31 | `T-DEL-002` | renderer preview IPC/store | checked changed-path set; no `preload.ts`, renderer store, or preview renderer IPC surface was added | `Passed` | v1 remains tool-result-only on the renderer side |
| 2026-03-31 | `T-DEL-003` | dynamic outer preview tabs | checked changed-path set; no right-side tab/composable/layout files were modified | `Passed` | v1 remains dedicated preview windows only |

### Completion Gate

- Mark `Implementation Status = Completed` only when implementation is done and required tests are passing or explicitly `N/A`.
- For `Rename/Move`/`Remove` tasks, verify obsolete references, dead branches, unused helpers/tests/flags/adapters, and dormant replaced paths are removed.
- Mark Stage 6 implementation execution complete only when:
  - implementation baseline scope is delivered (or deviations are documented),
  - required unit/integration tests pass,
  - no backward-compatibility shims or legacy old-behavior branches remain in scope,
  - dead code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths in scope are removed,
  - ownership-dependency/decoupling checks show no new unjustified tight coupling/cycles,
  - touched files have correct placement inside the owning subsystem and folder, or an explicit move/split has been completed,
  - changed source implementation files have proactive Stage 8 size-pressure handling recorded (`>500` avoided and `>220` pressure assessed/acted on where needed).
