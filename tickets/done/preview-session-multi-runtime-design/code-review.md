# Code Review

## Review Meta

- Ticket: `preview-session-multi-runtime-design`
- Review Round: `6`
- Trigger Stage: `Re-entry`
- Prior Review Round Reviewed: `5`
- Latest Authoritative Round: `6`
- Workflow state source: `tickets/done/preview-session-multi-runtime-design/workflow-state.md`
- Investigation notes reviewed as context: `tickets/done/preview-session-multi-runtime-design/investigation-notes.md`
- Earlier design artifact(s) reviewed as context:
  - `tickets/done/preview-session-multi-runtime-design/requirements.md`
  - `tickets/done/preview-session-multi-runtime-design/proposed-design.md`
- Runtime call stack artifact: `tickets/done/preview-session-multi-runtime-design/future-state-runtime-call-stack.md`
- Shared Design Principles: `shared/design-principles.md`
- Common Design Practices: `shared/common-design-practices.md`
- Code Review Principles: `stages/08-code-review/code-review-principles.md`
- Review snapshot note:
  - Round `6` independently reviews the current `v12` working-tree snapshot after the lease-ownership, strict-contract, Codex metadata, and broader Stage 7 runtime-evidence updates.

## Scope

- Files reviewed (source + tests):
  - preview ownership boundaries under `autobyteus-web/electron/preview`
  - preview contract and manifest boundaries under `autobyteus-server-ts/src/agent-tools/preview`
  - touched Codex runtime parsing under `autobyteus-server-ts/src/agent-execution/backends/codex/events`
  - live runtime validation harness and scenarios under `autobyteus-server-ts/tests/integration/agent-execution`
  - Stage 7 validation artifact `tickets/done/preview-session-multi-runtime-design/api-e2e-testing.md`
- Why these files:
  - They are the current authoritative owners for the categories that previously failed:
    - ownership clarity / boundary encapsulation
    - no backward-compatibility / no legacy retention
    - validation strength for the eight-tool public preview surface

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 5 | CR-008 | Blocker | Resolved | [codex-item-event-payload-parser.ts](/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts), [codex-tool-payload-parser.ts](/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-tool-payload-parser.ts), live Codex `edit_file` scenario pass | Segment metadata fallback is now segment-type-aware, and the live Codex `edit_file` regression control passed. |
| 5 | CR-009 | Major | Resolved | [preview-session-types.ts](/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron/preview/preview-session-types.ts), [preview-session-manager.ts](/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron/preview/preview-session-manager.ts), [preview-session-navigation.ts](/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron/preview/preview-session-navigation.ts), [preview-shell-controller.ts](/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron/preview/preview-shell-controller.ts), Electron lease tests | Session lifecycle remains app-global, but shell projection is now an explicit non-stealable lease owned by `PreviewShellController`. |
| 5 | CR-010 | Major | Resolved | [preview-tool-input-primitives.ts](/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/agent-tools/preview/preview-tool-input-primitives.ts), [preview-tool-input-parsers.test.ts](/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/tests/unit/agent-tools/preview/preview-tool-input-parsers.test.ts) | String boolean/integer widening is removed from the native path, so the stable preview contract now matches the declared typed surface. |
| 5 | CR-011 | Major | Resolved | [api-e2e-testing.md](/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/preview-session-multi-runtime-design/api-e2e-testing.md), live Codex/Claude full-surface scenarios | Stage 7 now proves more than `open_preview`; both real runtimes exercised the broader preview surface and the touched Codex parser boundary. |

## Source File Size And Structure Audit (Mandatory)

Measurement note:
- Effective non-empty line counts were measured with `rg -n "\\S" <file> | wc -l`.
- Changed-line delta was assessed against `origin/personal`. New untracked owner files are reviewed as current source and marked `N/A` for the base diff gate until committed.

| Source File | Effective Non-Empty Line Count | Adds/Expands Functionality | `>500` Hard-Limit Check | `>220` Changed-Line Delta Gate | Scope-Appropriate SoC Check | File Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/preview/preview-session-manager.ts` | `310` | `Yes` | `Pass` | `Fail` | `Pass` | `Pass` | `N/A` | `Keep` |
| `autobyteus-web/electron/preview/preview-session-navigation.ts` | `118` | `Yes` | `Pass` | `Pass` | `Pass` | `Pass` | `N/A` | `Keep` |
| `autobyteus-web/electron/preview/preview-shell-controller.ts` | `213` | `Yes` | `Pass` | `Fail` | `Pass` | `Pass` | `N/A` | `Keep` |
| `autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts` | `161` | `Yes` | `Pass` | `Pass` | `Pass` | `Pass` | `N/A` | `Keep` |
| `autobyteus-server-ts/src/agent-tools/preview/preview-tool-input-primitives.ts` | `137` | `Yes` | `Pass` | `N/A` | `Pass` | `Pass` | `N/A` | `Keep` |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts` | `230` | `Yes` | `Pass` | `Fail` | `Pass` | `Pass` | `N/A` | `Keep` |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-tool-payload-parser.ts` | `329` | `Yes` | `Pass` | `Fail` | `Pass` | `Pass` | `N/A` | `Keep` |

Audit interpretation:
- No changed source file exceeds the `>500` hard limit.
- Some source files still exceed the `>220` changed-line delta gate against `origin/personal`, but the current code shape remains scope-appropriate, the relevant owners are already split, and the latest re-entry specifically removed the structural problems that were previously driving `Design Impact`.

## Structural Integrity Checks (Mandatory)

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Data-flow spine inventory clarity and preservation under shared principles | `Pass` | The preview flow remains traceable from runtime tool call -> `PreviewToolService` -> preview bridge -> session lifecycle owner -> shell lease owner -> renderer snapshot projection. | `Keep` |
| Ownership boundary preservation and clarity | `Pass` | `PreviewSessionManager` owns lifecycle/register/reuse, while `PreviewShellController` owns claim/release and shell projection; the shell controller no longer transfers sessions by side effect. | `Keep` |
| Off-spine concern clarity (off-spine concerns serve clear owners and stay off the main line) | `Pass` | Navigation reuse eligibility, page operations, and shell lease policy now serve explicit owners instead of sharing implicit transfer behavior. | `Keep` |
| Existing capability/subsystem reuse check (no fresh helper where an existing subsystem should own it) | `Pass` | The live runtime surface still reuses the shared preview manifest, bridge client, and runtime-specific builder boundaries instead of duplicating policy again. | `Keep` |
| Reusable owned structures check (repeated structures extracted into the right owned file instead of copied across files) | `Pass` | The preview manifest, typed input readers, and split Codex payload parsers remain the reusable owned structures for the subsystem. | `Keep` |
| Shared-structure/data-model tightness check (no kitchen-sink base, no overlapping parallel shapes, specialization/composition used meaningfully) | `Pass` | The stable preview contract and native parser path now agree on strict typed booleans/integers; the hidden widening path is gone. | `Keep` |
| Repeated coordination ownership check (shared policy has a clear owner instead of being repeated across callers) | `Pass` | Shell lease policy is owned once in `PreviewShellController` and surfaced through explicit manager lease APIs. | `Keep` |
| Empty indirection check (no pass-through-only boundary) | `Pass` | The current split files each own real behavior: lifecycle, navigation, page operations, contract parsing, manifest projection, or runtime conversion. | `Keep` |
| Scope-appropriate separation of concerns and file responsibility clarity | `Pass` | The previous ownership problems are no longer mixed across shell controller, session navigation, and parser fallback logic. | `Keep` |
| Ownership-driven dependency check (no forbidden shortcuts or unjustified cycles) | `Pass` | Upper layers now talk to explicit preview boundaries instead of mixing shell projection and session-transfer policy. No new cycles appeared. | `Keep` |
| Authoritative Boundary Rule check (callers do not depend on both an outer owner and that owner's internal manager/repository/helper/lower-level concern) | `Pass` | Shell focus goes through `PreviewShellController`, and runtime tool execution goes through `PreviewToolService`; this round removed the remaining mixed-level boundary behavior. | `Keep` |
| File placement check (file/folder path matches owning concern or explicitly justified shared boundary) | `Pass` | Electron preview ownership remains under `electron/preview`, server preview boundaries remain under `agent-tools/preview`, and runtime-specific adapters remain under their runtime folders. | `Keep` |
| Flat-vs-over-split layout judgment (layout is readable for the scope and not artificially fragmented) | `Pass` | The ticket now has enough split to keep owners clear without reintroducing kitchen-sink files or meaningless wrappers. | `Keep` |
| Interface/API/query/command/service-method boundary clarity (one subject, one responsibility, explicit identity shape) | `Pass` | The preview public contract is session-oriented, snake_case-only, and now truthfully typed across native, Codex, and Claude paths. | `Keep` |
| Naming quality and naming-to-responsibility alignment check (files, folders, APIs, types, functions, parameters, variables) | `Pass` | Naming still matches ownership cleanly: `preview-session-*`, `preview-tool-*`, and `codex-*-payload-parser` names are concrete and unsurprising. | `Keep` |
| No unjustified duplication of code / repeated structures in changed scope | `Pass` | The preview tool surface remains manifest-owned and runtime adapters project from it rather than copying definitions. | `Keep` |
| Patch-on-patch complexity control | `Pass` | The new lease/strictness work simplified previously implicit behavior instead of layering more ad hoc conditions on top. | `Keep` |
| Dead/obsolete code cleanup completeness in changed scope | `Pass` | The hidden widening path is removed, the old normalizer file is deleted, and there are no retained preview console/devtools tool paths in the stable surface. | `Keep` |
| Test quality is acceptable for the changed behavior | `Pass` | The focused tests directly cover the repaired owners and the live runtime tests now exercise both runtimes beyond the `open_preview` happy path. | `Keep` |
| Test maintainability is acceptable for the changed behavior | `Pass` | Validation remains organized by owner boundary and runtime seam instead of monolithic end-to-end-only tests. | `Keep` |
| Validation evidence sufficiency for the changed flow | `Pass` | Stage 7 now includes live Codex and Claude surface scenarios, plus a live non-preview Codex regression control, not just unit/Electron-local coverage. | `Keep` |
| No backward-compatibility mechanisms (no compatibility wrappers/dual-path behavior) | `Pass` | Alias keys are rejected and string widening is removed from the native path. | `Keep` |
| No legacy code retention for old behavior | `Pass` | The stable preview contract no longer preserves the old widening semantics, and the app-global silent shell-transfer behavior is gone. | `Keep` |

## Review Scorecard (Mandatory)

- Overall score (`/10`): `9.3`
- Overall score (`/100`): `93`
- Score calculation note: simple average across the ten mandatory categories for the current `v12` working-tree snapshot.

| Priority | Category | Score (`1.0-10.0`) | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | `9.5` | The main preview flow and the bounded local shell-lease spine are both easy to trace in code now. | The current subsystem is broad, so future expansion will still need disciplined reviews. | Preserve the same spine-first clarity if new preview capabilities are added. |
| `2` | `Ownership Clarity and Boundary Encapsulation` | `9.5` | Session lifecycle and shell lease ownership are now explicit and separate, which resolves the earlier app-global steal behavior. | Lifecycle remains app-global by design, so future node/shell scope changes would need fresh review. | Keep shell projection policy in `PreviewShellController` and avoid leaking it back into lifecycle/navigation owners. |
| `3` | `API / Interface / Query / Command Clarity` | `9.0` | The eight-tool session-oriented surface is clear, canonical, and now typed consistently across native and runtime projections. | The broader preview surface is inherently stateful, so clarity depends on keeping the session contract stable. | Keep the contract strict and avoid widening convenience inputs again. |
| `4` | `Separation of Concerns and File Placement` | `9.5` | The current split aligns well to the owning concerns and subsystem folders. | The Codex event boundary is still complex in absolute terms, even though the subject split is much healthier. | Continue resisting growth of generic parser owners. |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | `9.0` | The manifest, strict readers, and parser splits now behave like true owned shared structures instead of loose duplicated policy. | The subsystem has several cooperating files, so drift would show up quickly if ownership weakens again. | Keep shared preview semantics owned in the preview subsystem, not recreated in adapters. |
| `6` | `Naming Quality and Local Readability` | `9.5` | File and API names remain concrete and responsibility-aligned. | There is still a lot of preview vocabulary across layers, so future additions could bloat the namespace if not watched. | Keep names tied to concrete subjects and side effects. |
| `7` | `Validation Strength` | `9.0` | The round now has focused owner tests plus live Codex and Claude surface scenarios and a live Codex regression control. | Live runtime validation still depends on local CLI login state and runtime availability. | Keep durable live scenarios for the public preview surface and expand only when the contract grows. |
| `8` | `Runtime Correctness Under Edge Cases` | `9.0` | The repaired edge cases are now directly covered: non-stealable shells, shell-close lease release, strict typing, and preserved `edit_file` identity. | Runtime-stateful features always retain some residual environment sensitivity. | Preserve the current lease and parser regression coverage when changing runtime behavior. |
| `9` | `No Backward-Compatibility / No Legacy Retention` | `9.5` | The last hidden compatibility path from the native contract is removed, and the old shell-transfer behavior is gone. | The only real risk is accidental reintroduction during future convenience changes. | Keep the contract strict and reject undeclared convenience aliases or widening. |
| `10` | `Cleanup Completeness` | `9.0` | The current changed scope no longer carries the stale fail-state code shapes that triggered the re-entry. | Ticket artifacts still carry historical context by design, though the source snapshot itself is clean. | Finish docs sync cleanly so the durable knowledge matches the new implementation truth. |

## Findings

- None.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Gate Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Stage 7 pass | `N/A` | `Yes` | `Fail` | `No` | Earlier snapshot failed on hard-limit, duplication, and compatibility problems. |
| 2 | Re-entry | `Yes` | `No` | `Pass` | `No` | `v10` redesign cleared the original structural blockers under the generic bar. |
| 3 | Re-entry | `Yes` | `Yes` | `Fail` | `No` | Stricter product-bar review still failed on renderer ownership and validation seam strength. |
| 4 | Re-entry | `Yes` | `No` | `Pass` | `No` | `v11` refinement resolved renderer activation and input-boundary breadth issues. |
| 5 | Re-entry | `Yes` | `Yes` | `Fail` | `No` | Shell ownership, hidden coercion, and Codex metadata fallback still failed. |
| 6 | Re-entry | `Yes` | `No` | `Pass` | `Yes` | `v12` implementation resolves the prior ownership and no-compatibility failures, and Stage 7 now proves the broader preview surface through live Codex/Claude runtime paths. |

## Gate Decision

- Latest authoritative review round: `6`
- Decision: `Pass`
- Implementation can proceed to `Stage 9`: `Yes`
- Mandatory pass checks:
  - Review scorecard is recorded with rationale, weakness, and required-improvement notes for all ten categories in the canonical priority order
  - No scorecard category is below `9.0`
  - All changed source files reviewed in this round are `<=500` effective non-empty lines
  - Required `>220` delta-gate assessments are recorded for the applicable changed source files
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
- Notes:
  - The decisive product-bar categories now clear cleanly:
    - ownership clarity / boundary encapsulation
    - no backward-compatibility / no legacy retention
  - The earlier Stage 7 thin-evidence concern is materially improved and no longer fails the gate because the live runtime layer now proves the broader preview surface and the touched Codex parser boundary.
