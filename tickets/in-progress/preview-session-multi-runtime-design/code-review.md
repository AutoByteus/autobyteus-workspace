# Code Review

## Review Meta

- Ticket: `preview-session-multi-runtime-design`
- Review Round: `1`
- Trigger Stage: `7`
- Prior Review Round Reviewed: `None`
- Latest Authoritative Round: `1`
- Workflow state source: `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md`
- Investigation notes reviewed as context: `tickets/in-progress/preview-session-multi-runtime-design/investigation-notes.md`
- Earlier design artifact(s) reviewed as context: `tickets/in-progress/preview-session-multi-runtime-design/requirements.md`, `tickets/in-progress/preview-session-multi-runtime-design/proposed-design.md`
- Runtime call stack artifact: `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack.md`
- Shared Design Principles: `shared/design-principles.md`
- Common Design Practices: `shared/common-design-practices.md`
- Code Review Principles: `stages/08-code-review/code-review-principles.md`
- Review snapshot note: This round reviews the current worktree snapshot, not only clean `HEAD`, because Stage 8 was entered with additional current source changes still present in the ticket worktree. Untracked current source files are treated as full additions in the audit.

## Scope

- Files reviewed (source + tests):
  - Source: preview tool contract/service/bridge files, runtime preview adapter files for Codex and Claude, Electron preview owner/controller/bridge files, preview shell renderer/store integration, tool lifecycle preview activation path, and all changed source implementation files in the current worktree snapshot.
  - Tests: changed preview unit tests, runtime adapter tests, live Codex/Claude preview integration tests, and renderer/Electron regression tests recorded in Stage 7.
- Why these files:
  - They own or materially affect the preview data spine:
    - server tool boundary,
    - runtime adapter exposure,
    - Electron preview-session owner,
    - shell projection owner,
    - renderer event spine that activates the Preview tab after `open_preview`.
  - They also contain the largest changed source files and the files that crossed the hard size gate or diff-size gate.

## Prior Findings Resolution Check (Mandatory On Round >1)

N/A on round `1`.

## Source File Size And Structure Audit (Mandatory)

Measurement note:
- Effective non-empty line count was measured on current source files with `rg -n "\\S" <file> | wc -l`.
- Changed-line delta was measured against base ref `ecd466ff87bb2b8c71b02ab25a7b5433f7bbb686` using current worktree diff. Current untracked source files were treated as full additions for this round because the reviewed snapshot is not a clean `HEAD`.

| Source File | Effective Non-Empty Line Count | Adds/Expands Functionality (`Yes`/`No`) | `>500` Hard-Limit Check | `>220` Changed-Line Delta Gate | Scope-Appropriate SoC Check (`Pass`/`Fail`) | File Placement Check (`Pass`/`Fail`) | Preliminary Classification (`N/A`/`Local Fix`/`Validation Gap`/`Design Impact`/`Requirement Gap`/`Unclear`) | Required Action (`Keep`/`Split`/`Move`/`Refactor`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | 238 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/agent-execution/backends/claude/preview/build-claude-preview-mcp-servers.ts` | 22 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/agent-execution/backends/claude/preview/build-claude-preview-tool-definitions.ts` | 241 | Yes | Pass | Fail | Fail | Pass | Design Impact | Refactor |
| `autobyteus-server-ts/src/agent-execution/backends/claude/preview/build-claude-run-mcp-servers.ts` | 43 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | 428 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | 224 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | 329 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts` | 514 | Yes | Fail | Pass | Fail | Pass | Design Impact | Split |
| `autobyteus-server-ts/src/agent-execution/backends/codex/preview/build-preview-dynamic-tool-registrations.ts` | 282 | Yes | Pass | Fail | Fail | Pass | Design Impact | Refactor |
| `autobyteus-server-ts/src/agent-tools/preview/capture-preview-screenshot.ts` | 57 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/agent-tools/preview/close-preview.ts` | 53 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/agent-tools/preview/execute-preview-javascript.ts` | 57 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/agent-tools/preview/list-preview-sessions.ts` | 52 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/agent-tools/preview/navigate-preview.ts` | 58 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/agent-tools/preview/open-preview.ts` | 60 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/agent-tools/preview/preview-bridge-client.ts` | 142 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/agent-tools/preview/preview-dom-snapshot.ts` | 61 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts` | 535 | Yes | Fail | Fail | Fail | Pass | Design Impact | Split |
| `autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts` | 108 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/agent-tools/preview/read-preview-page.ts` | 58 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/agent-tools/preview/register-preview-tools.ts` | 22 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/startup/agent-tool-loader.ts` | 57 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-web/components/layout/RightSideTabs.vue` | 149 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-web/components/workspace/tools/PreviewPanel.vue` | 132 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-web/composables/useRightSideTabs.ts` | 35 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-web/electron/main.ts` | 482 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-web/electron/preload.ts` | 104 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-web/electron/preview/preview-bridge-server.ts` | 225 | Yes | Pass | Fail | Pass | Pass | N/A | Keep |
| `autobyteus-web/electron/preview/preview-dom-snapshot-script.ts` | 156 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-web/electron/preview/preview-page-cleaner.ts` | 25 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-web/electron/preview/preview-runtime.ts` | 78 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-web/electron/preview/preview-screenshot-artifact-writer.ts` | 11 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-web/electron/preview/preview-session-manager.ts` | 613 | Yes | Fail | Fail | Fail | Pass | Design Impact | Split |
| `autobyteus-web/electron/preview/preview-shell-controller.ts` | 216 | Yes | Pass | Fail | Pass | Pass | N/A | Keep |
| `autobyteus-web/electron/preview/preview-view-factory.ts` | 25 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-web/electron/server/baseServerManager.ts` | 341 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-web/electron/server/linuxServerManager.ts` | 61 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-web/electron/server/macOSServerManager.ts` | 66 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-web/electron/server/serverRuntimeEnv.ts` | 22 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-web/electron/server/windowsServerManager.ts` | 154 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-web/electron/shell/workspace-shell-window-registry.ts` | 58 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-web/electron/shell/workspace-shell-window.ts` | 116 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-web/electron/types.d.ts` | 72 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-web/plugins/25.previewShell.client.ts` | 16 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | 485 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-web/stores/previewShellStore.ts` | 124 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |
| `autobyteus-web/types/previewShell.ts` | 16 | Yes | Pass | Pass | Pass | Pass | N/A | Keep |

## Structural Integrity Checks (Mandatory)

| Check | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Data-flow spine inventory clarity and preservation under shared principles | Fail | The broad end-to-end preview spine is still traceable (`open_preview` tool wrappers -> `PreviewToolService` -> `PreviewBridgeClient` -> `PreviewBridgeServer` -> `PreviewSessionManager`; renderer return/event spine in `toolLifecycleHandler.ts:470-503` -> `PreviewShellStore` -> `PreviewShellController`). However, the bounded local preview-session owner spine is no longer clear in code because `preview-session-manager.ts:176-707` mixes session open/reuse/load/close sequencing with page read, DOM snapshot, JS execution, full-page screenshot resizing, viewport mutation, tombstone retention, and view accessors in one over-limit file. | Re-split the Electron preview owner so the bounded local session spine is readable again and its support mechanisms are placed around it instead of inside one oversized file. |
| Ownership boundary preservation and clarity | Fail | `preview-tool-contract.ts:11-602` and `preview-session-manager.ts:20-707` each absorb multiple owners. The first is no longer only a contract boundary; the second is no longer only session lifecycle ownership. | Split both files into tighter owner files and keep each owner responsible for one coherent subject. |
| Off-spine concern clarity (off-spine concerns serve clear owners and stay off the main line) | Fail | Parsing/coercion/schema-building/error-serialization are collapsed into `preview-tool-contract.ts`, and runtime-specific tool metadata is duplicated in adapter files instead of living in one owned off-spine structure under preview tool ownership. | Move parsing/schema concerns and runtime tool manifests into distinct owned files that serve the preview tool boundary instead of competing with it. |
| Existing capability/subsystem reuse check (no fresh helper where an existing subsystem should own it) | Pass | The implementation still routes through existing capability areas rather than creating new cross-cutting helpers: server tool layer, runtime adapters, Electron preview owner, renderer streaming handler, and shell window infrastructure are all reused. | Keep. |
| Reusable owned structures check (repeated structures extracted into the right owned file instead of copied across files) | Fail | `build-preview-dynamic-tool-registrations.ts:31-292` and `build-claude-preview-tool-definitions.ts:44-252` duplicate the same eight-tool surface, descriptions, parameter semantics, parse calls, and service dispatch. | Introduce one owned preview tool manifest/catalog and render Codex/Claude adapter definitions from that shared owned structure. |
| Shared-structure/data-model tightness check (no kitchen-sink base, no overlapping parallel shapes, specialization/composition used meaningfully) | Pass | The result/request DTO shapes themselves are mostly tight. The main weakness is file ownership, not one overly optional shared DTO. | Keep DTO shapes tight during the split. |
| Repeated coordination ownership check (shared policy has a clear owner instead of being repeated across callers) | Pass | Capability gating and semantic validation still have one clear server-side owner in `preview-tool-service.ts:30-112`; shell projection ownership stays in `preview-shell-controller.ts:54-254`. | Keep. |
| Empty indirection check (no pass-through-only boundary) | Pass | `PreviewToolService` still owns environment gating plus semantic validation, so it is not pure pass-through indirection. | Keep. |
| Scope-appropriate separation of concerns and file responsibility clarity | Fail | The Stage 8 hard-limit failures are accompanied by mixed-concern files: `preview-tool-contract.ts`, `preview-session-manager.ts`, and `codex-item-event-payload-parser.ts`. | Split or refactor the oversized mixed-concern files before returning to Stage 6. |
| Ownership-driven dependency check (no forbidden shortcuts or unjustified cycles) | Pass | The current flow still respects the intended direction: runtime adapter -> preview tool layer -> preview bridge client -> Electron bridge server -> preview session owner; renderer preview activation remains a focus request rather than a second session owner. | Keep. |
| Boundary encapsulation check (callers do not depend on both an outer owner and that owner's internal manager/repository/helper/lower-level concern) | Pass | Callers above the preview tool layer do not bypass `PreviewToolService`; renderer uses preload IPC and preview shell snapshot APIs rather than reaching into Electron internals directly. | Keep. |
| File placement check (file/folder path matches owning concern or explicitly justified shared boundary) | Pass | Paths mostly reflect ownership: server preview tools under `agent-tools/preview`, Electron preview owner under `electron/preview`, renderer shell projection under renderer/store/component paths. | Keep. |
| Flat-vs-over-split layout judgment (layout is readable for the scope and not artificially fragmented) | Pass | Folder layout is reasonable for the capability area. The problem is oversized files inside the layout, not overall over-fragmentation. | Keep layout, split files. |
| Interface/API/query/command/service-method boundary clarity (one subject, one responsibility, explicit identity shape) | Fail | `preview-tool-contract.ts:288-371` accepts multiple alias spellings (`window_title`, `waitUntil`, `previewSessionId`, `cleaningMode`, `fullPage`, `includeNonInteractive`, `includeBoundingBoxes`, `maxElements`) even though the reviewed stable tool surface is snake_case. That weakens the canonical interface boundary. | Remove the compatibility aliases and keep one canonical preview request shape. |
| Naming quality and naming-to-responsibility alignment check (files, folders, APIs, types, functions, parameters, variables) | Fail | `preview-tool-contract.ts` is materially more than a contract file; `preview-session-manager.ts` materially owns more than session management. The names no longer match their real responsibility. | Rename/split so file names match what they actually own. |
| No unjustified duplication of code / repeated structures in changed scope | Fail | The Codex and Claude preview adapter files duplicate the preview tool surface. | Extract one owned preview tool manifest and remove the duplicated adapter definitions. |
| Patch-on-patch complexity control | Fail | The current preview implementation has accumulated repeated local-fix layering inside already-large owners (`preview-session-manager.ts`, `preview-tool-contract.ts`) instead of being re-split when the shape exceeded the guardrails. | Rework the affected files structurally instead of continuing local patches in place. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | The dropped console-log and DevTools preview tools were actually removed from current source scope; deleted files are no longer referenced in current source. | Keep. |
| Test quality is acceptable for the changed behavior | Pass | Current Stage 7 evidence includes renderer/Electron regressions plus live Codex and Claude preview reruns. That is adequate for behavior proof even though the code structure failed Stage 8. | Keep. |
| Test maintainability is acceptable for the changed behavior | Pass | The current focused tests are direct and scoped to preview behavior instead of duplicating the whole subsystem. | Keep. |
| Validation evidence sufficiency for the changed flow | Pass | Stage 7 evidence is sufficient for the implemented flow; the rejection here is structural, not evidentiary. | Keep. |
| No backward-compatibility mechanisms (no compatibility wrappers/dual-path behavior) | Fail | `preview-tool-contract.ts:288-371` still preserves alternative argument spellings instead of enforcing the reviewed stable tool contract directly. | Remove the compatibility aliases. |
| No legacy code retention for old behavior | Pass | No current old preview-window path or dropped console/devtools tool code remains in current source scope. | Keep. |

## Findings

- `[CR-001] File: autobyteus-web/electron/preview/preview-session-manager.ts | Type: FileSize/SoC/Spine | Severity: Blocker | Evidence: 613 effective non-empty lines. Lines 20-147 define request/result/error shapes, 176-372 own the public preview-session API, and 374-707 also own observer wiring, reuse selection, tombstones, URL normalization, ready-state waiting, title updates, full-page screenshot resizing, view accessors, and viewport mutation. The bounded local preview-session spine is buried inside one oversized file. | Required update: split the Electron preview owner into tighter files so the session lifecycle spine is readable and stays under the hard limit; keep page-read/DOM snapshot/JS/screenshot/view-bounds support in clear supporting files around that owner.`"
- `[CR-002] File: autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts | Type: FileSize/SoC/Naming | Severity: Blocker | Evidence: 535 effective non-empty lines. The file named “contract” also owns tool names, env names, DTO types, coercion helpers, input parsers, semantic assertions, `ParameterSchema` builders, and error serialization (`preview-tool-contract.ts:11-602`). That is not one responsibility and it breaches the hard-limit rule. | Required update: split canonical contract constants/types away from parsing/validation/schema-building/error-serialization concerns and rename the resulting files so their names match their actual owners.`"
- `[CR-003] File: autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts | Type: FileSize/SoC | Severity: Blocker | Evidence: 514 effective non-empty lines after additional preview-related changes. The parser already owned segment typing, metadata extraction, reasoning parsing, web-search argument extraction, tool-argument parsing, and tool-result decoding, and the preview result parsing was added in `codex-item-event-payload-parser.ts:20-29` and `codex-item-event-payload-parser.ts:428-447`. | Required update: split the parser by subject so preview/tool-result decoding is not added into an already over-limit all-purpose payload parser.`"
- `[CR-004] File: autobyteus-server-ts/src/agent-execution/backends/codex/preview/build-preview-dynamic-tool-registrations.ts` and `autobyteus-server-ts/src/agent-execution/backends/claude/preview/build-claude-preview-tool-definitions.ts` | Type: ReusableOwnedStructures/Duplication | Severity: Major | Evidence: both files repeat the same eight-tool surface, descriptions, parameter semantics, parse calls, and service dispatch (`build-preview-dynamic-tool-registrations.ts:31-292`; `build-claude-preview-tool-definitions.ts:44-252`). The shared preview tool boundary does not own one reusable tool manifest, so runtime adapters duplicate it. | Required update: extract one owned preview tool manifest/catalog under `agent-tools/preview` and let Codex/Claude adapters render runtime-specific definitions from that structure instead of copying the surface twice.`"
- `[CR-005] File: autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts | Type: BackwardCompat/InterfaceBoundary | Severity: Major | Evidence: `parseOpenPreviewInput`, `parseNavigatePreviewInput`, `parseReadPreviewPageInput`, `parseCapturePreviewScreenshotInput`, `parsePreviewDomSnapshotInput`, and `parseExecutePreviewJavascriptInput` all preserve alternate compatibility spellings (`window_title`, camelCase `waitUntil`, `previewSessionId`, `cleaningMode`, `fullPage`, `includeNonInteractive`, `includeBoundingBoxes`, `maxElements`) at `preview-tool-contract.ts:288-371`, even though the reviewed stable preview tool surface is snake_case. | Required update: remove the compatibility aliases and enforce one canonical preview request shape at the contract boundary.`"

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked (`Yes`/`No`/`N/A`) | New Findings Found (`Yes`/`No`) | Gate Decision (`Pass`/`Fail`) | Latest Authoritative (`Yes`/`No`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Stage 7 pass | N/A | Yes | Fail | Yes | Independent review of the current worktree snapshot failed on the hard-limit rule and related structural checks. |

## Re-Entry Declaration (Mandatory On `Fail`)

- Trigger Stage: `8`
- Classification (`Local Fix`/`Validation Gap`/`Design Impact`/`Requirement Gap`/`Unclear`): `Design Impact`
- Required Return Path:
  - `Design Impact` -> `Stage 1 -> Stage 3 -> Stage 4 -> Stage 5 -> Stage 6 -> Stage 7 -> Stage 8`
- Upstream artifacts required before code edits:
  - `investigation-notes.md` updated (if required): `Yes`
  - `requirements.md` updated (if required): `No current requirement ambiguity found.`
  - earlier design artifacts updated (if required): `Yes`
  - runtime call stacks + review updated (if required): `Yes`

## Gate Decision

- Latest authoritative review round: `1`
- Decision: `Fail`
- Implementation can proceed to `Stage 9`: `No`
- Mandatory pass checks:
  - All changed source files have effective non-empty line count `<=500`: `Fail`
  - Required `>220` changed-line delta-gate assessments are recorded for all applicable changed source files: `Pass`
  - Data-flow spine inventory clarity and preservation under shared principles = `Fail`
  - Ownership boundary preservation = `Fail`
  - Support structure clarity = `Fail`
  - Existing capability/subsystem reuse check = `Pass`
  - Reusable owned structures check = `Fail`
  - Shared-structure/data-model tightness check = `Pass`
  - Repeated coordination ownership check = `Pass`
  - Empty indirection check = `Pass`
  - Scope-appropriate separation of concerns and file responsibility clarity = `Fail`
  - Ownership-driven dependency check = `Pass`
  - Boundary encapsulation check = `Pass`
  - File placement check = `Pass`
  - Flat-vs-over-split layout judgment = `Pass`
  - Interface/API/query/command/service-method boundary clarity = `Fail`
  - Naming quality and naming-to-responsibility alignment check = `Fail`
  - No unjustified duplication of code / repeated structures in changed scope = `Fail`
  - Patch-on-patch complexity control = `Fail`
  - Dead/obsolete code cleanup completeness in changed scope = `Pass`
  - Test quality is acceptable for the changed behavior = `Pass`
  - Test maintainability is acceptable for the changed behavior = `Pass`
  - Validation evidence sufficiency = `Pass`
  - No backward-compatibility mechanisms = `Fail`
  - No legacy code retention = `Pass`
- Notes:
  - The reviewed implementation still works functionally, but Stage 8 is an independent structural gate. The failure is not about Stage 7 proof; it is about the code no longer satisfying the shared design principles and Stage 8 hard review rules.
  - Because the main rejection includes hard-limit violations in changed source files and repeated surface duplication across runtime adapters, this round is classified as `Design Impact`, not `Local Fix`.

