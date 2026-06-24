# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready - user approved proceeding from investigation into ticket/design workflow on 2026-06-24.

## Goal / Problem Statement

Browser MCP tool results shown in the Activity panel must display the actual tool result when the MCP server returned a JSON-serializable result. The current reported behavior shows successful Browser MCP `run_script` activity results as `[Circular]`, which hides useful result content and makes it unclear whether the MCP server itself returned `[Circular]` or whether AutoByteus introduced it while normalizing/serializing Codex MCP events.

## Investigation Findings

- The Browser MCP server is configured in `/home/autobyteus/data/mcps.json` as `BrowserServer`, launched by `uv --directory /home/autobyteus/workspace/autobyteus-mcps/browser-mcp run python -m browser_mcp.server` with `CHROME_REMOTE_DEBUGGING_PORT=9222`.
- Runtime process inspection confirms Browser MCP is running from `/home/autobyteus/workspace/autobyteus-mcps/browser-mcp` and the backend container is the server image built from `autobyteus-server-ts/docker/Dockerfile.monorepo`.
- Direct Browser MCP probes did **not** return `[Circular]` for normal serializable results. `run_script` returned a structured object containing `url`, `result`, and `tab_id`.
- Direct Browser MCP probe with a genuinely circular JavaScript object did **not** return `[Circular]`; it failed with `Error serializing to JSON: ValueError: Circular reference detected (id repeated)`.
- The only Activity-relevant backend source that emits the literal `[Circular]` marker is `autobyteus-server-ts/src/services/agent-streaming/payload-serialization.ts`.
- Root cause: `serializePayload` uses one global `WeakSet` while JSON-stringifying event payloads. This incorrectly marks repeated shared references as `[Circular]`, not only actual ancestor cycles. When a Codex local MCP completion payload carries the same MCP result object at both `item.result` and top-level `result`, whichever copy is visited second becomes `[Circular]`.
- `CodexToolPayloadParser.resolveToolResult(...)` prefers top-level `payload.result` over `item.result`; therefore the placeholder can become the emitted `TOOL_EXECUTION_SUCCEEDED.payload.result`, preventing `normalizeBrowserMcpToolResult(...)` from unwrapping the real Browser MCP envelope.
- Frontend Activity rendering is not the source of this exact marker: `ToolActivityItem.vue` renders the activity result it receives and does not synthesize `[Circular]` for tool activity results.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, but localized.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed
- Evidence basis: Direct Browser MCP probes; source trace through `codex-thread-notification-handler.ts`, `codex-item-event-converter.ts`, `payload-serialization.ts`, `codex-tool-payload-parser.ts`, `browser-mcp-result-normalizer.ts`, and `ToolActivityItem.vue`; reproduction using the built runtime serializer at `/app/autobyteus-server-ts/dist/services/agent-streaming/payload-serialization.js`.
- Requirement or scope impact: Fix should stay in the JSON-safe payload serialization / Codex MCP result projection path and must preserve genuine circular-object safety.

## Recommendations

- Fix `serializePayload` so it replaces only actual ancestor cycles with `[Circular]` while preserving repeated shared references by duplicating their JSON-safe value.
- Add focused regression coverage in `autobyteus-server-ts/tests/unit/services/agent-streaming/payload-serialization.test.ts` for shared references versus true cycles.
- Add a Codex MCP Browser completion regression in `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` where `params.item.result` and `params.result` point to the same MCP result envelope; expected emitted `TOOL_EXECUTION_SUCCEEDED.payload.result` is the normalized Browser result object, not `[Circular]`.
- Consider a narrow defensive fallback in Codex tool-result resolution only if implementation review finds historical serialized events can still contain top-level `[Circular]` while a nested non-placeholder candidate exists. Prefer the serializer fix as the authoritative correction.

## Scope Classification (`Small`/`Medium`/`Large`)

Small-to-Medium

## In-Scope Use Cases

- `UC-001` A Browser MCP `run_script`, `open_tab`, `read_page`, or similar known Browser tool returns a normal JSON-serializable primitive, array, or object.
  - Expected: the Activity result panel displays the actual normalized result, not `[Circular]`.
- `UC-002` A backend event payload contains repeated references to the same serializable result object in multiple fields.
  - Expected: payload serialization duplicates the JSON-safe value at each occurrence instead of treating the second occurrence as circular.
- `UC-003` A backend event payload contains a genuine ancestor cycle.
  - Expected: payload serialization remains safe and substitutes `[Circular]` only at the cycle edge without crashing streaming, persistence, or rendering.
- `UC-004` Maintainers need to prove whether `[Circular]` came from Browser MCP or AutoByteus projection.
  - Expected: durable notes and tests show Browser MCP did not return `[Circular]` in the normal serializable case and identify the backend projection layer that introduced it.

## Out of Scope

- Redesigning the Browser MCP protocol or the external `browser-mcp` repository.
- Changing Browser MCP tool behavior for genuinely non-serializable Playwright/DOM return values.
- Redesigning frontend Activity layout or broad tool-card presentation.
- Reworking Codex MCP lifecycle ownership beyond the result serialization/projection defect.

## Functional Requirements

- `REQ-001` Preserve JSON-serializable Browser MCP results end-to-end through Codex local MCP completion conversion, backend streaming payload serialization, memory projection, and frontend Activity display.
- `REQ-002` Distinguish repeated shared references from actual circular ancestor references during backend payload serialization.
- `REQ-003` Preserve safe handling for genuine circular/non-JSON-safe payloads so streaming, persistence, and UI rendering do not crash.
- `REQ-004` Keep known Browser MCP result normalization owned by the existing backend Browser MCP result normalization path; do not move this policy to frontend rendering.
- `REQ-005` Keep non-Browser and unknown MCP result behavior unchanged except for the corrected shared-reference serialization behavior.

## Acceptance Criteria

- `AC-001` A direct Browser MCP probe returning a serializable object is documented and does not contain `[Circular]`.
- `AC-002` A focused serializer test proves repeated shared result references serialize as duplicate JSON-safe values while an actual self-cycle still serializes a cycle edge as `[Circular]`.
- `AC-003` A Codex local MCP Browser completion test with aliased `params.result` and `params.item.result` emits a normalized Browser result object, not `[Circular]`.
- `AC-004` Existing Browser MCP result normalizer tests and Codex MCP lifecycle tests continue to pass.
- `AC-005` Frontend Activity still renders string/object result payloads through the existing tool activity store contract; no frontend-only workaround is introduced.

## Constraints / Dependencies

- Work starts from latest `origin/personal` in a dedicated task worktree.
- The current runtime is inside the backend-built Docker container with root access and Browser MCP configured.
- Existing user changes in the shared `/home/autobyteus/workspace/autobyteus-workspace` checkout must not be overwritten.
- The runtime image currently has built code under `/app`, while the authoritative source worktree is `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation`.

## Assumptions

- The screenshot corresponds to Codex MCP Browser tool activity events in the current AutoByteus product.
- Codex local MCP completion payloads can contain the same object by reference in multiple fields; the built-runtime reproduction demonstrates that this shape is sufficient to introduce `[Circular]` today.
- The correct product behavior is to show JSON-safe Browser tool result content when available.

## Risks / Open Questions

- Runtime raw Codex events were not enabled with `CODEX_THREAD_RAW_EVENT_LOG_DIR`; the exact original raw event from the screenshot was not captured. The source-level reproduction covers the plausible and sufficient backend failure mode.
- If Codex app-server changes result envelope shape again, regression tests should cover both top-level and `item.result` result candidates.
- A real tool might intentionally return the literal string `[Circular]`; implementation should avoid broad placeholder-skipping that would corrupt legitimate string results.

## Requirement-To-Use-Case Coverage

- `REQ-001` -> `UC-001`, `UC-004`, `AC-001`, `AC-003`, `AC-005`
- `REQ-002` -> `UC-002`, `AC-002`, `AC-003`
- `REQ-003` -> `UC-003`, `AC-002`, `AC-004`
- `REQ-004` -> `UC-001`, `AC-003`, `AC-005`
- `REQ-005` -> `UC-002`, `UC-003`, `AC-004`

## Acceptance-Criteria-To-Scenario Intent

- `AC-001` -> Use configured Browser MCP tools to call `open_tab` and `run_script` and record returned payloads.
- `AC-002` -> Unit-test `serializePayload` with a shared child object and a self-referential object.
- `AC-003` -> Unit-test `CodexThreadEventConverter` with local MCP Browser completion payload containing aliased result references.
- `AC-004` -> Run focused backend unit suites covering serializer, Browser MCP normalizer, and Codex event converter.
- `AC-005` -> Source-review frontend `ToolActivityItem.vue` and ensure implementation does not add a frontend masking workaround.

## Approval Status

Approved by user on 2026-06-24 to proceed into implementation design/review.
