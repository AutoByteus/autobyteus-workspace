# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/open-tab-streamable-mcp-browser-regression/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/open-tab-streamable-mcp-browser-regression/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/open-tab-streamable-mcp-browser-regression/design-spec.md`
- Current Review Round: 1
- Trigger: Initial architecture review requested by `solution_designer` after user-approved task kickoff.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Reviewed requirements, investigation notes, analysis summary, design spec, documented browser-session ownership model, and current code paths in `browser-tool-contract.ts`, `codex-tool-payload-parser.ts`, `codex-item-event-converter.ts`, `claude-browser-tool-result-normalizer.ts`, `claude-session-event-converter.ts`, and `browserToolExecutionSucceededHandler.ts`.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design review | N/A | None | Pass | Yes | Design is actionable and preserves the documented server-side canonicalization boundary. |

## Reviewed Design Spec

`/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/open-tab-streamable-mcp-browser-regression/design-spec.md`

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design marks the work as a bug fix and describes the Streamable MCP regression. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Classification is `Missing Invariant with boundary/ownership aspect`; evidence is persisted traces with MCP envelopes, `list_tabs` showing created sessions, and renderer handler limitations. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design calls for a narrow shared normalizer extraction. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | File mapping, reuse check, dependency rules, and migration sequence all route parsing to server runtime conversion and away from renderer parsing. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First review round. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | End-to-end `open_tab` to Browser focus | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | MCP result envelope to canonical stream event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Renderer canonical success to shell focus | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server browser / Agent Tools MCP boundary | Pass | Pass | Pass | Pass | Appropriate place for browser-specific MCP result normalization. |
| Codex event conversion | Pass | Pass | Pass | Pass | Directly covers the observed leaking result envelope path; implementation must hit `LOCAL_MCP_TOOL_EXECUTION_COMPLETED`/terminal success paths. |
| Claude event conversion | Pass | Pass | Pass | Pass | Existing normalizer proves the concern exists and should be shared, not duplicated. |
| Renderer Browser focus handler | Pass | Pass | Pass | Pass | Correctly kept as canonical-contract consumer, not transport-envelope parser. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Known-browser-tool MCP content envelope unwrapping and JSON parse | Pass | Pass | Pass | Pass | Sharing the Claude parsing logic under a browser/Agent Tools boundary removes runtime divergence. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Canonical browser result object | Pass | Pass | Pass | Pass | Pass | The direct `{ tab_id, status, url, title }` shape is singular and avoids preserving both MCP envelope and canonical event as co-authoritative outputs. |
| Shared normalizer interface | Pass | Pass | Pass | Pass | Pass | `toolName + result` is sufficient; allowlisting prevents a generic parser from rewriting unrelated MCP tools. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime-specific duplicated browser envelope parsers | Pass | Pass | Pass | Pass | Claude-specific logic is to delegate to, or be replaced by, the shared normalizer. |
| Old Codex dynamic browser registration path | Pass | Pass | Pass | Pass | Explicitly rejected; unified Agent Tools MCP remains the clean target. |
| Renderer MCP envelope parsing workaround | Pass | Pass | Pass | Pass | Explicitly rejected as a primary fix. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/browser/browser-mcp-result-normalizer.ts` | Pass | Pass | Pass | Pass | Owns only known browser MCP result normalization, not general MCP parsing. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-tool-payload-parser.ts` and/or `.../codex-item-event-converter.ts` | Pass | Pass | Pass | Pass | Existing terminal result extraction/conversion owner; design leaves implementation room to select the exact path that covers raw traces. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-browser-tool-result-normalizer.ts` | Pass | Pass | Pass | Pass | Delegation/removal prevents duplicated policy. |
| Server unit tests under Codex/Claude event coverage | Pass | Pass | N/A | Pass | Regression should use exact observed envelope. |
| Optional renderer test | Pass | Pass | N/A | Pass | Only validates canonical focus contract; no MCP parsing should be added. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime event converters | Pass | Pass | Pass | Pass | May depend on shared browser result normalizer. |
| Shared browser normalizer | Pass | Pass | Pass | Pass | May depend on stable browser tool allowlist; must not become a generic MCP rewrite layer. |
| Renderer Browser handler | Pass | Pass | Pass | Pass | Must consume canonical `TOOL_EXECUTION_SUCCEEDED`, not raw MCP envelopes. |
| Electron Browser shell controller | Pass | Pass | Pass | Pass | Remains session/shell lifecycle owner, not event canonicalization owner. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime event converter | Pass | Pass | Pass | Pass | Correct boundary for provider/MCP result-shape canonicalization. |
| BrowserToolsMcpAdapterProvider / BrowserToolService | Pass | Pass | Pass | Pass | Executes stable tool contract; does not own UI focus. |
| BrowserShellStore / Electron BrowserShellController | Pass | Pass | Pass | Pass | Focus and projection remain separate from tool result parsing. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `normalizeBrowserMcpToolResult(toolName, result)` | Pass | Pass | Pass | Low | Pass |
| `handleBrowserToolExecutionSucceeded(payload)` | Pass | Pass | Pass | Low | Pass |
| Codex terminal event conversion | Pass | Pass | Pass | Low | Pass |
| Claude terminal event conversion | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/browser/` | Pass | Pass | Low | Pass | Browser-specific runtime-agnostic normalizer belongs with stable browser tool contract. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/...` | Pass | Pass | Low | Pass | Only applies normalization at Codex event/result conversion boundary. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/...` | Pass | Pass | Low | Pass | Existing runtime adapter should delegate shared concern. |
| `autobyteus-web/services/agentStreaming/browser/` | Pass | Pass | Low | Pass | Remains canonical event consumer only. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Browser result envelope parsing | Pass | Pass | Pass | Pass | Existing Claude logic is the source to extract/share. |
| Browser shell focus | Pass | Pass | N/A | Pass | Existing focus path is reused. |
| Tool-name canonicalization/allowlist | Pass | Pass | N/A | Pass | Existing browser tool names and Agent Tools MCP name normalization are reused. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Codex dynamic browser tool restoration | No | Pass | Pass | Explicitly rejected. |
| Renderer parsing raw MCP envelopes as fallback | No | Pass | Pass | Explicitly rejected as primary behavior. |
| Runtime-specific duplicate normalizers | Yes, currently | Pass | Pass | Design replaces/delegates Claude-specific implementation to shared normalizer. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Shared normalizer extraction | Pass | Pass | Pass | Pass |
| Codex application of normalization | Pass | Pass | Pass | Pass |
| Claude delegation/removal | Pass | Pass | Pass | Pass |
| Regression test coverage | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Canonical result vs MCP envelope | Yes | Pass | Pass | Pass | The examples make the renderer failure mode obvious. |
| Ownership boundary | Yes | Pass | Pass | Pass | Server-side conversion vs renderer parsing is explicit. |
| Test trace shape | Yes | Pass | N/A | Pass | Migration sequence requires exact observed envelope in tests. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Exact Codex local MCP completion path | Codex may emit terminal success through more than one path; missing the observed path would leave the regression. | Implementation must cover the persisted trace path, especially `codex/local/mcpToolExecutionCompleted` terminal conversion, and prove it with a regression test. | Residual implementation risk, not design blocker. |
| Live Electron smoke availability | Unit tests can prove event shape, but visible Browser focus is best verified in the app. | API/E2E should run a live/manual Electron smoke when feasible; otherwise record environment limitation and evidence. | Residual validation risk, not design blocker. |
| Missing/malformed browser result diagnostics | Requirements ask for diagnostics if UI synchronization context is absent; the known root cause is result canonicalization, not session creation. | Implementation should avoid silently treating a malformed known-browser `open_tab` result as a UI-synchronized success in tests/logging where practical. | Residual implementation attention item, not design blocker. |

## Review Decision

Pass: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Implementation must normalize the actual Codex Agent Tools MCP completion path seen in traces, not only a nearby dynamic-tool path.
- The normalizer must remain allowlisted to known browser tool names to avoid parsing unrelated MCP tool content.
- Live Electron smoke may require a built/running app environment; if not feasible, downstream validation should preserve trace-shape regression evidence and explicitly record the limitation.
- If implementation observes malformed known-browser `open_tab` results without `tab_id`, it should log or fail diagnostically rather than claim browser UI synchronization.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Proceed to implementation with the cumulative artifact package. The design correctly restores the authoritative server runtime event canonicalization boundary and keeps renderer Browser focus transport-agnostic.
