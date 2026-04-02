# Implementation

Use this single artifact for both:
- the stable Stage 6 implementation baseline
- the live Stage 6 execution/progress record
- brief downstream handoff/status pointers for Stages 7, 8, and 9

## Scope Classification

- Classification: `Large`
- Reasoning: the `v11` re-entry implementation is narrower than the earlier structural split, but it still spans the renderer streaming boundary, server preview input boundary, and targeted validation layers that must all move together to improve ownership clarity and boundary encapsulation without changing the working preview product behavior.
- Workflow Depth:
  - `Large` -> proposed design doc -> future-state runtime call stack -> future-state runtime call stack review (iterative deep rounds until `Go Confirmed`) -> `implementation.md` baseline -> implementation execution

## Upstream Artifacts (Required)

- Workflow state: `tickets/done/preview-session-multi-runtime-design/workflow-state.md`
- Investigation notes: `tickets/done/preview-session-multi-runtime-design/investigation-notes.md`
- Requirements: `tickets/done/preview-session-multi-runtime-design/requirements.md`
  - Current Status: `Refined`
- Runtime call stacks: `tickets/done/preview-session-multi-runtime-design/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/done/preview-session-multi-runtime-design/future-state-runtime-call-stack-review.md`
- Proposed design: `tickets/done/preview-session-multi-runtime-design/proposed-design.md`

## Document Status

- Current Status: `Completed`
- Notes: This is now the authoritative Stage 6 execution record for the `v12` ownership/no-compatibility refinement. Prior `v10` and `v11` execution evidence is historical only and must not be used to judge the reopened Stage 6 gate.

## v12 Re-Entry Baseline

- Re-entry trigger: Stage 8 was reopened again because the current implementation still failed the user's decisive categories:
  - ownership clarity / boundary encapsulation,
  - no backward compatibility / no legacy retention.
- This implementation pass keeps the working preview behavior and targets only the remaining architectural gaps:
  - make preview session lifecycle application-global while making shell projection an explicit non-stealable lease,
  - remove primitive-level string coercion from the stable preview contract so native input handling matches the declared Codex/Claude typed schemas,
  - tighten Codex tool-metadata ownership so canonical tool identity does not silently fall back to `run_bash`,
  - preserve the already-completed `v11` renderer activation and split input-owner refactor while extending validation around the new ownership/contract seams.
- Product-scope delta in this pass: `None`.
- Structural delta in this pass:
  - shell projection ownership becomes explicit and non-stealable,
  - preview contract truthfulness becomes fully strict at the primitive-reader boundary,
  - Codex tool identity resolution becomes a dedicated subject concern instead of a generic fallback side effect.

## v12 Execution Update

- Execution status: `Completed`
- Completed source changes:
  - explicit shell-lease state added to preview session records in [preview-session-types.ts](/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron/preview/preview-session-types.ts)
  - lease-aware reuse eligibility added to [preview-session-navigation.ts](/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron/preview/preview-session-navigation.ts)
  - `PreviewSessionManager` now exposes explicit lease claim/release queries instead of implicit cross-shell transfer in [preview-session-manager.ts](/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron/preview/preview-session-manager.ts)
  - `PreviewShellController` now owns claim/release rules and no longer steals sessions across shells in [preview-shell-controller.ts](/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron/preview/preview-shell-controller.ts)
  - primitive-level string widening removed from [preview-tool-input-primitives.ts](/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/agent-tools/preview/preview-tool-input-primitives.ts)
  - Codex segment metadata fallback is now segment-type-aware in [codex-item-event-payload-parser.ts](/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts) and [codex-tool-payload-parser.ts](/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-tool-payload-parser.ts)
  - focused regression tests added for non-stealable shell leases, leased-session reuse blocking, strict typed preview input parsing, and preserved `edit_file` metadata
- Focused validation completed for this pass:
  - Electron preview owner + shell-controller suites: `10` passing tests
  - preview input parser + Codex converter unit suites: `15` passing tests
  - live Codex runtime reruns:
    - `converts edit-file activity into edit_file segments and artifact events` passed
    - `executes open_preview through the live Codex preview dynamic tool path` passed
    - `executes the full preview tool surface through the live Codex preview dynamic tool path` passed
  - live Claude runtime reruns:
    - `executes open_preview through the live Claude preview MCP path` passed
    - `executes the full preview tool surface through the live Claude preview MCP path` passed

Historical note:

- The planning tables below were first created for the earlier `v10` redesign.
- Where those older tables mention `preview-tool-input-normalizers.ts` or describe Stage 7 / Stage 8 as unresolved, treat them as historical scaffolding only.
- The authoritative `v11` truth is the `v11 Re-Entry Baseline`, `v11 Execution Update`, `api-e2e-testing.md`, `code-review.md`, and `workflow-state.md`.

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

- Use Cases In Scope: `UC-001` through `UC-012`
- Spine Inventory In Scope: `DS-001` through `DS-008`
- Primary Owners / Main Domain Subjects:
  - `preview-tool-contract.ts` contract-only boundary
  - preview input primitives
  - preview input parsers
  - preview semantic validators
  - one shared preview tool manifest
  - `PreviewToolService`
  - bridge client / bridge server
  - `PreviewSessionManager` as lifecycle/register/reuse owner only
  - `PreviewSessionNavigation`
  - `PreviewSessionPageOperations`
  - `PreviewShellController`
  - shell window host / registry
  - preview-owned renderer success handler
  - renderer `previewShellStore` + `PreviewPanel`
  - Codex payload parsing splits
- Requirement Coverage Guarantee: `R-001` through `R-011` map to at least one call-stack use case and one planned task below.
- Design-Risk Use Cases:
  - `UC-003` / `UC-004`: runtime parity across Codex and Claude after moving to one shared manifest
  - `UC-006`: read/screenshot/dom-snapshot/JS execution after splitting page operations away from the lifecycle owner
  - `UC-009` / `UC-010` / `UC-011`: preserving the bounded local preview-session and navigation spines after source-file splits
  - `UC-012`: Codex payload parser split must preserve canonical tool-result semantics
- Target Architecture Shape:
  - keep the stable eight-tool surface: `open_preview`, `navigate_preview`, `close_preview`, `list_preview_sessions`, `read_preview_page`, `capture_preview_screenshot`, `preview_dom_snapshot`, `execute_preview_javascript`
  - split preview contract ownership into contract-only types/constants, input primitives, input parsers, semantic validators, one shared tool manifest, and parameter-schema projection
  - keep one server-side preview execution boundary through `PreviewToolService`
  - keep one Electron preview shell projection owner through `PreviewShellController`
  - keep preview-specific renderer shell activation in one preview-owned success boundary instead of the generic lifecycle handler
  - split the oversized Electron preview session owner into lifecycle/registry, navigation/readiness, and page-operations concerns
  - split Codex payload parsing by subject so preview-tool result decoding no longer grows the generic parser
  - remove all compatibility aliases from the stable preview request contract
- New Owners / Boundary Interfaces To Introduce:
  - `preview-tool-input-primitives.ts`
  - `preview-tool-input-parsers.ts`
  - `preview-tool-semantic-validators.ts`
  - `preview-tool-manifest.ts`
  - `preview-tool-parameter-schemas.ts`
  - `preview-session-types.ts`
  - `preview-session-navigation.ts`
  - `preview-session-page-operations.ts`
  - `previewToolExecutionSucceededHandler.ts`
  - `codex-tool-payload-parser.ts`
  - `codex-reasoning-payload-parser.ts`
- Primary file/task set: see `Implementation Work Table`
- API / Behavior Delta:
  - no agent-facing alias parsing (`waitUntil`, `previewSessionId`, `fullPage`, etc.) remains
  - no `get_preview_console_logs` or `open_preview_devtools` surface remains in the stable agent contract
  - Codex and Claude must render their tool surfaces from one shared preview manifest
  - `preview_session_id` remains the stable session handle and stays short-form
- Key Assumptions:
  - the current preview-tab UX remains valid and does not need another requirements change
  - runtime adapters can consume a shared manifest without losing runtime-specific schema formatting
  - Electron split files can be introduced without changing the already-working shell host behavior
- Known Risks:
  - contract split can ripple into many tests and runtime adapters
  - Electron owner split can regress packaged-app behavior if lifecycle handoffs are not explicit
  - Codex parser split can regress non-preview tool events if subject boundaries are not tight

### Runtime Call Stack Review Gate Summary

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 21 | Pass | No | No | N/A | `N/A` | `N/A` | `Candidate Go` | 1 |
| 22 | Pass | No | No | N/A | `N/A` | `N/A` | `Go Confirmed` | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `22`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

### Principles

- Bottom-up: implement owned boundaries before dependents.
- Test-driven: add or update focused unit/integration coverage with each structural slice.
- Spine-led implementation rule: contract split -> runtime surface reuse -> Electron owner split -> Codex parser split -> validation.
- Mandatory modernization rule: no backward-compatibility alias parsing or dropped-tool compatibility paths remain.
- Mandatory cleanup rule: remove obsolete console-log/devtools tool handlers and deleted/unused helpers in scope.
- Mandatory ownership/decoupling/SoC rule: keep lifecycle, navigation, page operations, contract normalization, and runtime definition generation in separate owners.
- Mandatory boundary-encapsulation rule: callers above the preview tool boundary must depend on the boundary, not its internal parser helpers.
- Mandatory shared-structure coherence rule: one preview tool manifest owns names, descriptions, and operation metadata; runtime adapters only project it.
- Mandatory file-placement rule: keep preview-specific code under `agent-tools/preview`, runtime-specific renderers under their backend folders, and Electron preview owners under `electron/preview`.
- Mandatory shared-principles implementation rule: if source reality reveals another design weakness, classify `Design Impact` rather than patching around it.
- Mandatory proactive size-pressure rule: do not knowingly expand or leave changed source implementation files above `500` effective non-empty lines.

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | `DS-001` `DS-002` `DS-003` | server preview boundary | split `preview-tool-contract.ts` into contract + strict normalizers + manifest + schemas | reviewed `v10` design | removes alias drift and adapter duplication at the public boundary first |
| 2 | `DS-001` `DS-002` `DS-003` | runtime adapters | rewire native/Codex/Claude tool registration to the shared manifest | order 1 | downstream surfaces must consume the new canonical boundary |
| 3 | `DS-004` `DS-005` `DS-006` | Electron preview boundary | split preview lifecycle/navigation/page-ops owners | order 1 | preserves bounded local spines before more behavior changes |
| 4 | `DS-002` `DS-003` `DS-007` | Codex events boundary | split preview-related payload decoding from the oversized parser | order 1 | restores subject clarity and Stage 8 size compliance |
| 5 | `DS-004` `DS-005` `DS-006` | renderer + shell projection | update any dependent imports/tests after owner splits | orders 1-4 | final dependent stabilization before validation |

### File Placement Plan

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| preview contract boundary | `autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts` | same folder, split across four files | server preview boundary | `Split` | line counts + contract tests |
| runtime tool surface | duplicated Codex/Claude builder files | same folders, driven by shared manifest | runtime adapters | `Keep` + `Split` support | adapter tests |
| preview session owner | `autobyteus-web/electron/preview/preview-session-manager.ts` | same folder, split across lifecycle/navigation/page-operation files | Electron preview boundary | `Split` | Electron unit tests + line counts |
| Codex preview payload decoding | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts` | same folder plus subject parsers | Codex event conversion boundary | `Split` | Codex unit + live integration tests |

### Implementation Work Table

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | `DS-001` `DS-002` `DS-003` | server preview boundary | contract-only split + strict normalizers + schema projection | `autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts` | same folder plus `preview-tool-input-normalizers.ts` and `preview-tool-parameter-schemas.ts` | `Split` | none | Completed | `autobyteus-server-ts/tests/unit/agent-tools/preview/preview-tool-contract.test.ts` | Passed |  | N/A | Planned | alias parsing removed; contract file down to 161 effective non-empty lines |
| C-002 | `DS-001` `DS-002` `DS-003` | server preview boundary | shared preview tool manifest | duplicated Codex/Claude preview builders | `autobyteus-server-ts/src/agent-tools/preview/preview-tool-manifest.ts` | `Create` | C-001 | Completed | Codex + Claude preview builder tests | Passed | `autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts`, `autobyteus-server-ts/tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts` | Passed (Skipped Without Live Env) | Planned | manifest now drives native descriptions and both runtime adapter surfaces |
| C-003 | `DS-004` `DS-005` `DS-006` | Electron preview boundary | lifecycle/navigation/page-operation split | `autobyteus-web/electron/preview/preview-session-manager.ts` | same folder plus `preview-session-types.ts`, `preview-session-navigation.ts`, `preview-session-page-operations.ts` | `Split` | C-001 | Completed | `autobyteus-web/electron/preview/__tests__/preview-session-manager.spec.ts` plus new split-owner tests | Passed |  | N/A | Planned | manager down to 289 effective non-empty lines; packaged behavior preserved in targeted tests |
| C-004 | `DS-002` `DS-003` `DS-007` | Codex events boundary | subject-oriented payload parsing | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts` | same folder plus `codex-tool-payload-parser.ts` and `codex-reasoning-payload-parser.ts` | `Split` | C-001 | Completed | `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | Passed | `autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts` | Passed (Skipped Without Live Env) | Planned | main parser down to 223 effective non-empty lines and preview result decoding still passes |
| C-005 | `DS-004` `DS-005` `DS-006` | shell projection boundary | dependent renderer/shell stabilization after owner splits | `autobyteus-web/components/workspace/tools/PreviewPanel.vue`, `autobyteus-web/stores/previewShellStore.ts`, `autobyteus-web/electron/preview/preview-shell-controller.ts` | same paths | `Modify` | C-003 | Completed | `autobyteus-web/components/workspace/tools/__tests__/PreviewPanel.spec.ts`, `autobyteus-web/stores/__tests__/previewShellStore.spec.ts`, `autobyteus-web/electron/preview/__tests__/preview-shell-controller.spec.ts` | Passed |  | N/A | Planned | existing shell-tab behavior remains green after the manager split |
| C-006 | `DS-001` `DS-002` `DS-003` | server preview boundary | dropped-tool cleanup | deleted/obsolete console-log and devtools files | remove from registrations/imports/tests | `Remove` | C-001 C-002 | Completed | relevant preview tool tests | Passed |  | N/A | Planned | no remaining `get_preview_console_logs` or `open_preview_devtools` references in source |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R-001` `R-002` `R-003` | `AC-001` `AC-002` `AC-003` | `DS-001` `DS-002` `DS-003` | preview tool boundary split | `UC-001` `UC-002` `UC-003` `UC-004` | `C-001` `C-002` `C-006` | Unit + Integration | `AV-001` `AV-002` |
| `R-004` `R-005` `R-006` | `AC-004` `AC-005` `AC-006` | `DS-004` `DS-005` `DS-006` | Electron preview owner split | `UC-006` `UC-009` `UC-010` `UC-011` | `C-003` `C-005` | Unit | `AV-003` |
| `R-007` `R-008` | `AC-007` `AC-008` | `DS-007` | Codex parser split | `UC-012` | `C-004` | Unit + Integration | `AV-004` |
| `R-009` `R-010` `R-011` | `AC-009` `AC-010` `AC-011` | `DS-004` `DS-005` `DS-006` | shell projection continuity | `UC-005` `UC-008` | `C-003` `C-005` | Unit + Executable handoff | `AV-005` |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- | --- |
| `AC-001` | `R-001` | `DS-001` | native/Codex/Claude expose the same eight-tool surface | `AV-001` | API | Planned |
| `AC-004` | `R-004` | `DS-004` | preview open/navigate/list/read/screenshot/dom-snapshot/js/close still work end to end | `AV-002` | API | Planned |
| `AC-009` | `R-009` | `DS-005` `DS-006` | packaged app still renders preview tabs without crash/freeze/shutdown regressions | `AV-003` | E2E | Planned |

### Design Delta Traceability

| Change ID (from proposed design doc) | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- |
| `C-001` | `C-001` | Yes | Unit + `AV-001` |
| `C-002` | `C-002` | No | Unit + Integration |
| `C-003` | `C-003` | No | Unit + `AV-002` |
| `C-004` | `C-004` | No | Unit + Integration |
| `C-005` | `C-006` | Yes | Unit |

### Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| `T-DEL-001` | `get-preview-console-logs.ts` | `Remove` | delete remaining imports/registrations/tests | keep tool surface consistent across runtimes |
| `T-DEL-002` | `open-preview-devtools.ts` | `Remove` | delete remaining imports/registrations/tests | avoid hidden unsupported tool exposure |
| `T-DEL-003` | alias-based preview input parsing | `Remove` | delete camelCase/alternate key fallback paths | contract break is intentional and approved |

### Step-By-Step Plan

1. Move preview-specific renderer shell activation into a preview-owned success handler invoked after generic lifecycle success handling.
2. Split preview input handling into primitives, parsers, and semantic validators.
3. Preserve the shared preview manifest and preview service ownership while rewiring them to the split input boundary.
4. Rerun focused renderer streaming, preview-panel/store, and preview server-boundary validation.
5. Refresh Stage 6 through Stage 8 artifacts against the `v11` ownership and validation refinement.

### Backward-Compat And Decoupling Guardrails

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight (no kitchen-sink base or overlapping parallel shapes introduced): `Yes`
- Shared design/common-practice rules reapplied during implementation (and any file-level design weakness routed as `Design Impact` when needed): `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`
- Changed source implementation files kept within proactive size-pressure guardrails (`>500` avoided; `>220` pressure assessed/acted on): `Planned`

### Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/done/preview-session-multi-runtime-design/code-review.md`
- Scope (source + tests): preview tool boundary, runtime adapter surface generation, Electron preview owners, Codex payload parsing, and direct dependent tests
- line-count measurement command (`effective non-empty`):
  - effective non-empty line count: `rg -n "\\S" <file-path> | wc -l`
  - changed-line delta: `git diff --numstat origin/personal...HEAD -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action: split during Stage 6, do not defer to review
- per-file diff delta gate (`>220` changed lines) assessment approach: watch each changed source owner and split if one diff grows beyond the threshold
- Hard-limit handling details in `code-review.md`: record every source owner line count after refactor and classify `Design Impact` if any changed source owner remains above the limit
- file-placement review approach: each changed file must map back to the owner tables in `proposed-design.md`

| File | Current Line Count | Adds/Expands Functionality (`Yes`/`No`) | Ownership/SoC Risk (`Low`/`Medium`/`High`) | Required Action (`Keep`/`Split`/`Move`/`Refactor`) | Expected Review Classification if not addressed |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts` | `535` | `No` | `High` | `Split` | `Design Impact` |
| `autobyteus-web/electron/preview/preview-session-manager.ts` | `613` | `No` | `High` | `Split` | `Design Impact` |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts` | `514` | `No` | `High` | `Split` | `Design Impact` |
| `autobyteus-server-ts/src/agent-execution/backends/codex/preview/build-preview-dynamic-tool-registrations.ts` | `282` | `No` | `Medium` | `Refactor` | `Design Impact` |
| `autobyteus-server-ts/src/agent-execution/backends/claude/preview/build-claude-preview-tool-definitions.ts` | `241` | `No` | `Medium` | `Refactor` | `Design Impact` |

### Test Strategy

- Unit tests:
  - strict preview input normalizers reject alias keys and accept only snake_case
  - shared manifest drives native/Codex/Claude tool definitions consistently
  - split Electron owners preserve session open/reuse/navigation/page-operation behavior
  - split Codex payload parsers preserve preview tool result decoding
- Integration tests:
  - live Codex preview tool execution still streams canonical `preview_session_id`
  - live Claude preview tool execution still streams canonical `preview_session_id`
- Stage 6 boundary: file and service-level verification only (unit + integration)
- Stage 7 handoff notes for API/E2E and executable validation:
  - canonical artifact path: `tickets/done/preview-session-multi-runtime-design/api-e2e-testing.md`
  - expected acceptance criteria count: `11`
  - critical flows to validate: runtime tool exposure parity, preview open/navigate/list/read/screenshot/dom-snapshot/js, packaged preview render/responsiveness/shutdown
  - expected scenario count: `5+`
  - known environment constraints: live Codex/Claude tests require authenticated local runtime environments; packaged app retest remains manual
- Stage 8 handoff notes for code review:
  - canonical artifact path: `tickets/done/preview-session-multi-runtime-design/code-review.md`
  - predicted design-impact hotspots: preview tool boundary split, Electron owner split, Codex parser split
  - predicted file-placement hotspots: preview helpers leaking out of `agent-tools/preview`, Codex subject parsers placed outside the events boundary
  - predicted interface/API/query/command/service-method boundary hotspots: manifest-to-runtime projection, preview-tool service dispatch, page-operations boundary surface
  - files likely to exceed size/ownership/SoC thresholds: the five files listed in the Stage 8 plan table above

### Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| `build-preview-dynamic-tool-registrations.ts` | `preview-tool-manifest.ts` | Codex must project the shared preview surface into runtime-specific tool definitions | shared manifest entry objects only; no adapter-local copy of descriptions or parameter semantics | Codex builder consumes only manifest metadata plus runtime formatting helpers | `Not Needed` | Codex preview adapter |
| `build-claude-preview-tool-definitions.ts` | `preview-tool-manifest.ts` | Claude must project the shared preview surface into MCP tool definitions | same manifest entry objects; runtime-specific schema formatting stays local | Claude builder consumes only manifest metadata plus MCP schema helpers | `Not Needed` | Claude preview adapter |

### Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| none currently open after `v10` review gate | `N/A` | `N/A` | continue implementation and classify re-entry if new file-level weakness appears | `Pending` |

## Execution Tracking (Update Continuously)

### Kickoff Preconditions Checklist

- Workflow state is current (`tickets/done/preview-session-multi-runtime-design/workflow-state.md`): `Yes`
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Yes`
- Scope classification confirmed (`Small`/`Medium`/`Large`): `Yes`
- Investigation notes are current (`tickets/done/preview-session-multi-runtime-design/investigation-notes.md`): `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes`
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- Future-state runtime call stack review reached `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- 2026-04-02: Stage 6 baseline rewritten for the `v10` structural redesign. Next step is the workflow-state unlock transition, then source implementation begins with the preview contract split and alias removal.
- 2026-04-02: Split the preview tool boundary into contract-only types/constants, input primitives, input parsers, semantic validators, shared manifest, parameter-schema projection, and serializer helpers. Removed the dropped console-log and DevTools tools from registrations, runtime adapters, and tests.
- 2026-04-02: Split the Electron preview owner into lifecycle/registry, navigation/readiness, and page-operation owners. Preserved the working shell-tab projection path through targeted Electron and renderer regression suites.
- 2026-04-02: Split Codex payload parsing by subject, reduced the generic parser below the hard limit, and reran the targeted preview/runtime unit suites plus the Electron regression suites.
- 2026-04-02: Completed the post-refactor validation needed for Stage 6 exit: the focused preview server suites passed (`13` tests), the focused renderer streaming / preview-panel suites passed (`27` tests), and the already validated packaged-app preview flow remains unchanged by the `v11` seam refactor.
- 2026-04-02: The `v11` pass specifically resolves the remaining Stage 8 product-bar weaknesses by moving preview activation out of the generic lifecycle handler and splitting preview input handling into primitives, parsers, and semantic validators.

### Scope Change Log

| Date | Previous Scope | New Scope | Trigger | Required Action |
| --- | --- | --- | --- | --- |
| 2026-04-02 | `v9` eight-tool implementation baseline | `v10` structural redesign baseline | Stage 8 independent code review failed on size limits, duplicated runtime surfaces, alias parsing, and bounded-local-spine degradation | completed `Design Impact` re-entry through Stages `1 -> 3 -> 4 -> 5`; resume at Stage 6 under this baseline |

### Implementation Work Updates

| Change ID | Last Failure Classification | Last Failure Investigation Required | Cross-Reference Smell | Design Follow-Up | Requirement Follow-Up | Last Verified | Verification Command | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `Design Impact` | Yes | `preview-tool-contract.ts` absorbed contract, alias parsing, schemas, and serializer logic | completed in `v10` design and refined again in `v11` | Not Needed | 2026-04-02 | `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts exec vitest run tests/unit/agent-tools/preview/preview-tool-contract.test.ts tests/unit/agent-tools/preview/preview-tool-input-parsers.test.ts tests/unit/agent-tools/preview/preview-tool-semantic-validators.test.ts tests/unit/agent-tools/preview/register-preview-tools.test.ts` | contract file is contract-only, alias parsing is rejected explicitly by the split parser boundary, and semantic validation now lives in its own owner |
| `C-002` | `Design Impact` | Yes | duplicated preview tool surface across native/Codex/Claude adapters | completed in `v10` design and implemented in Stage 6 | Not Needed | 2026-04-02 | `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/preview/build-preview-dynamic-tool-registrations.test.ts tests/unit/agent-execution/backends/claude/preview/build-claude-preview-mcp-servers.test.ts` | one shared manifest now owns the eight-tool surface and both runtime adapters project from it |
| `C-003` | `Design Impact` | Yes | `preview-session-manager.ts` absorbed lifecycle, navigation, and page operations | completed in `v10` design and implemented in Stage 6 | Not Needed | 2026-04-02 | `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web exec vitest run electron/preview/__tests__/preview-session-manager.spec.ts electron/preview/__tests__/preview-shell-controller.spec.ts --config ./electron/vitest.config.ts` | manager is now a lifecycle/registry facade over split navigation and page-operation owners; targeted Electron regressions passed |
| `C-004` | `Design Impact` | Yes | preview result parsing expanded the generic Codex parser | completed in `v10` design and implemented in Stage 6 | Not Needed | 2026-04-02 | `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | subject-oriented tool and reasoning parsers now own the split concerns; the generic parser is back below the hard limit |

### Downstream Stage Status Pointers

| Stage | Canonical Artifact | Current Status | Last Updated | Notes |
| --- | --- | --- | --- | --- |
| 7 API/E2E + Executable Validation | `tickets/done/preview-session-multi-runtime-design/api-e2e-testing.md` | `Pass` | 2026-04-02 | the `v11` refactor is structural only; focused validation passed and the previously user-validated packaged preview path remains authoritative |
| 8 Code Review | `tickets/done/preview-session-multi-runtime-design/code-review.md` | `Pass` | 2026-04-02 | the current `v11` working snapshot clears the stricter product bar and is ready for Stage 9 docs sync |
| 9 Docs Sync | `tickets/done/preview-session-multi-runtime-design/docs-sync.md` | `Not Started` | 2026-04-02 | wait for Stage 8 pass |
