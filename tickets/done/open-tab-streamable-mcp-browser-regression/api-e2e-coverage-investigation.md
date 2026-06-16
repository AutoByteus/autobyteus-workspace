# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/open-tab-streamable-mcp-browser-regression/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/open-tab-streamable-mcp-browser-regression/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/open-tab-streamable-mcp-browser-regression/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/open-tab-streamable-mcp-browser-regression/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/open-tab-streamable-mcp-browser-regression/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/open-tab-streamable-mcp-browser-regression/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review pass requested API/E2E coverage investigation and executable validation for the Streamable MCP `open_tab` Browser panel regression.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

Approved behavior is that successful `open_tab` calls from both Daily Assistant/single-agent and software-engineering team-member runs must create or reuse a backend browser tab and emit `TOOL_EXECUTION_SUCCEEDED` with canonical direct `payload.result.tab_id` before the renderer Browser focus handler runs. The visible Browser panel should then focus/select the opened or reused tab. `reuse_existing=true` may return `status: reused`, but still must produce a direct `tab_id` and select the reused tab. If the result lacks a usable tab/session context, the system must provide diagnostic evidence rather than silently claiming UI synchronization. The reviewed design explicitly rejects renderer-side MCP envelope parsing as the authoritative fix and rejects restoring the old Codex dynamic browser tool path; the server runtime converter boundary owns MCP-envelope-to-canonical-browser-result normalization.

The implementation handoff's Legacy / Compatibility Removal Check was reviewed. It records no backward-compatibility mechanism, no old behavior retained, Claude duplicate parser replaced by shared normalizer delegation, and no renderer MCP-envelope compatibility wrapper. Source inspection during this investigation matches that statement: the renderer handler still consumes only canonical direct object or JSON-string browser result shapes, and the new server normalizer is known-browser-tool allowlisted.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Codex local Agent Tools MCP `open_tab` success result is normalized from MCP content envelope to direct `{ tab_id, status, url, title }` before `TOOL_EXECUTION_SUCCEEDED` emission. | Changed | Requirements REQ-001/REQ-004, AC-001/AC-002; design DS-002; implementation handoff changed files; code review pass. | Existing/new durable Codex converter regression is still valid and must be executed. |
| Known browser MCP result normalization is shared and browser-tool allowlisted. | Added/Changed | Design shared normalizer mapping; implementation adds `autobyteus-server-ts/src/agent-tools/browser/browser-mcp-result-normalizer.ts`; code review confirms no overbroad parser. | Shared normalizer durable coverage is still valid and must be executed. |
| Claude browser MCP envelope normalization delegates to shared browser normalizer. | Changed | Design de-duplicates Claude parser; implementation/code review changed `claude-browser-tool-result-normalizer.ts`. | Existing Claude converter coverage is still valid and must be executed to guard cross-runtime parity. |
| Renderer Browser focus handler remains canonical-contract based and focuses only after direct `tab_id`. | Preserved | Design rejects renderer MCP envelope parsing; `browserToolExecutionSucceededHandler.ts` source inspection. | Existing web handler durable coverage is still valid and should be executed as renderer-side proof for direct result focus. |
| Browser panel/store renders and tracks active sessions provided by Electron shell snapshots. | Preserved | Requirements AC-001/AC-002 visible Browser panel side effect; existing BrowserPanel/browserShellStore tests. | Existing renderer durable coverage is still valid and should be executed as UI projection proof. |
| Electron/remote browser bridge side effect creates sessions. | Preserved | Investigation notes show tabs were created; requirements REQ-001. | Existing bridge service/e2e coverage is still valid, but by itself does not prove event canonicalization. Execute only if practical as supplemental side-effect proof. |
| Old Codex dynamic browser registration path and renderer MCP envelope fallback remain rejected. | Removed/Preserved clean-cut policy | Design legacy rejection log; implementation handoff; code review legacy verdict. | No durable compatibility coverage should be added or retained for old path or renderer fallback. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-tools/browser/browser-mcp-result-normalizer.test.ts` | Direct object results stay canonical; JSON strings, MCP content envelopes, nested envelopes, and structuredContent become direct browser result objects; non-browser tool results remain raw; missing tab_id logs diagnostic. | REQ-001, REQ-003, REQ-004; DS-002; AC-001/AC-004. | Still Valid | Test content matches reviewed server-boundary normalizer behavior and no-compat allowlisting. | Execute in final validation. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` scenario `normalizes observed local MCP open_tab completion envelopes into direct browser results` | Observed Codex Agent Tools MCP content-envelope shape with `reuse_existing: true` converts to `TOOL_EXECUTION_SUCCEEDED` with canonical `tool_name: open_tab` and direct `result.tab_id`. | REQ-001, REQ-002, REQ-004; AC-001, AC-002, AC-003; DS-002. | Still Valid | Exact observed envelope shape from investigation is represented; team-member and single-agent Codex runs share the member/agent run converter boundary. | Execute in final validation. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` existing local MCP completion scenarios for non-browser tools | Non-browser MCP results remain normal local MCP completion events with raw result shape and arguments. | Design allowlisting; no unrelated MCP tool semantics change. | Still Valid | Ensures normalization remains limited and does not corrupt unrelated tools. | Execute in final validation. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts` browser MCP result/name normalization scenarios | Claude Agent Tools MCP browser events still canonicalize names/results and preserve non-AutoByteus MCP results. | Design shared parity/de-duplication; REQ-002. | Still Valid | Changed Claude wrapper delegates to shared normalizer; existing coverage validates parity. | Execute in final validation. |
| `autobyteus-web/services/agentStreaming/browser/__tests__/browserToolExecutionSucceededHandler.spec.ts` | Renderer focuses Browser shell and activates Browser right-side tab when it receives direct `open_tab` result with `tab_id`; ignores unrelated or missing-tab results. | AC-001, AC-002, AC-004; DS-003. | Still Valid | Renderer remains canonical-contract based, which is required by the reviewed design. | Execute in final validation. |
| `autobyteus-web/stores/__tests__/browserShellStore.spec.ts` | Browser shell store initializes/apply snapshots and active sessions from Electron API. | AC-001/AC-002 visible Browser panel projection. | Still Valid | Provides renderer state projection coverage once focus/snapshot path is called. | Execute focused relevant suite if feasible. |
| `autobyteus-web/components/workspace/tools/__tests__/BrowserPanel.spec.ts` | Browser panel renders sessions, shows empty state, and opens/navigates from Browser chrome. | AC-001/AC-002 visible Browser panel surface. | Still Valid | Tests the panel surface itself; not sufficient for MCP event canonicalization but valid supplemental UI projection coverage. | Execute focused relevant suite if feasible. |
| `autobyteus-server-ts/tests/e2e/runtime/remote-browser-bridge-runtime.e2e.test.ts` | Runtime GraphQL registration enables browser tool service `openTab` side effects and fails safely when unregistered/revoked. | REQ-001 side-effect and REQ-003 failure posture. | Still Valid | Verifies the browser tool execution side; the original failure was not here, so this is supplemental. | Execute if runtime e2e setup is practical; otherwise record as not executed. |
| `autobyteus-server-ts/tests/unit/agent-tools/browser/browser-bridge-client.test.ts`, `browser-tool-input-parsers.test.ts`, `browser-tool-semantic-validators.test.ts` | Browser tool request/response shapes and strict input semantics. | REQ-001 and no-compat policy. | Still Valid | Relevant baseline coverage, but not the regression boundary. | Covered indirectly by focused browser tests or recorded as retained baseline. |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts`, `agent-tool-mcp-session-service.test.ts` | Agent Tools MCP catalog/session exposes browser tools. | Streamable MCP availability constraint. | Still Valid | Relevant to tool availability but not to event result canonicalization. | No final execution required unless broader failures point here. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None found in relevant scope. | N/A | N/A | Reviewed requirements/design/code review reject compatibility behavior, but no existing relevant test was found asserting the rejected old Codex dynamic-browser path or renderer MCP-envelope fallback. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None in API/E2E round 1. | Existing review-passed durable coverage already covers the server canonicalization boundary and renderer direct-result focus contract. | Code review report lists focused tests and passes them; investigation inventory found no missing required durable artifact for this scope. | N/A | Avoid unnecessary post-review durable coverage churn; use temporary executable smoke where live Electron state cannot be durably tested here. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None. | N/A | N/A | N/A | Existing durable coverage remains current. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None. | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-001 | Run focused server typecheck and Vitest suites for the normalizer, Codex converter, and Claude converter. | Review-passed implementation compiles and direct `payload.result.tab_id` canonicalization holds for the observed envelope. | Existing durable tests already live in the repo; command execution is transient evidence. |
| TEMP-002 | Run focused web Vitest suites for Browser success handler, Browser shell store, and BrowserPanel. | A canonical direct `open_tab` result focuses the Browser shell, activates the Browser tab, and the panel/store can reflect active sessions. | Existing durable tests already live in the repo; command execution is transient evidence. |
| TEMP-003 | Run remote browser bridge runtime e2e if practical. | Browser tool side-effect path still creates sessions and fails safely when context is unavailable. | Existing durable test already lives in the repo and uses an emulated bridge; not a new artifact. |
| TEMP-004 | Use the available live in-app Browser MCP bridge from this team-member run to open a URL, then call `list_tabs`, `read_page`, and a second `open_tab` with `reuse_existing=true`. | Current runtime bridge can create/read/reuse a browser tab and returns a direct `tab_id` to this team-member tool caller. | It depends on this Codex/Electron session and is not a stable repository-resident test; it supplements but does not replace durable coverage. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Fully automated Daily Assistant UI flow proving the right-side Browser panel visibly switches in the running Electron host after a real model call. | This API/E2E handoff has repository and MCP tool access, but no reliable scripted control over the user's already-running Daily Assistant conversation UI or screenshot oracle for the host Electron right panel. | Medium residual manual-smoke risk: converter and renderer unit boundaries can pass while a separate host-app focus/display issue remains. | Record limitation in execution report; delivery/user can perform final manual Electron smoke if desired. No reroute unless executable evidence shows a code defect. |
| Fully automated software-engineering `solution_designer` member model call from the app UI. | Same limitation as above; this role can execute team-member MCP tools directly, but cannot reliably launch and observe another team member's host Browser panel from repository tests. | Medium residual manual-smoke risk for exact named member UI. | Use converter proof plus live current team-member MCP smoke; record limitation. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None at investigation time. | N/A | Upstream requirements/design are specific; source inspection found no renderer fallback or old dynamic path. | N/A |

## Execution Plan

1. Do not add, update, or remove repository-resident durable coverage in this API/E2E round unless final execution exposes a gap that changes the investigation decision.
2. Execute focused server validation: `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` and focused Vitest for browser normalizer, Codex converter, and Claude converter.
3. Execute focused web renderer validation for `browserToolExecutionSucceededHandler`, `browserShellStore`, and `BrowserPanel`.
4. Execute supplemental remote browser bridge runtime e2e if practical.
5. Execute live temporary in-app Browser MCP smoke from this team-member context: first open, read/list, second `reuse_existing=true` open.
6. Record all command/tool evidence and any live Electron UI limitation in the execution coverage report.
7. If all executed valid scenarios pass and no durable coverage changed after code review, hand off to `delivery_engineer`. If any durable coverage changes become necessary, update this investigation/report and route back to `code_reviewer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Coverage investigation completed before final validation execution and before any durable coverage edits. Existing durable coverage is sufficient for the changed boundary; live host UI observation has a recorded limitation and will be supplemented by current team-member MCP smoke plus renderer focus/panel tests.
