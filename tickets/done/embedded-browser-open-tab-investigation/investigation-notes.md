# Investigation Notes

## Investigation Meta
- Package: embedded-browser-open-tab-investigation
- Date: 2026-10-02; current revision SR-005.
- Repository: Git; workspace `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation`; branch `codex/embedded-browser-open-tab-investigation`.
- Base: `origin/personal` at `5e3cb2f720e6fc80173099075daf55594ed58de9`; `git fetch origin` succeeded before worktree creation.
- Finalization target: origin/personal, not authorized at this stage.
- Bootstrap: isolated worktree created successfully; no root/ancestor AGENTS.md found; web/server AGENTS.md and TESTING.md read.
- Status: investigation complete for the reported incident; proposed correction Ready for Approval. No design or implementation authorized.

## Initial Request And Clarifications
User reports daily assistant open_tab succeeds but embedded Browser does not open, repeatedly, and asks why. Follow-up explicitly permits probes/experiments. Screenshot shows Activity selected, open_tab returning tab 15ee0d, and a green dom_snapshot tool card. Screenshot alone does not prove native session creation failed.
Original screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_cf166e9973b947e998e6ea047f6c90cb/solution_designer_19b10b52e5534789b6c868edcb3302da/context_files/ctx_83a7e89a1f41__image.png`.

## Product And Domain Understanding
The embedded Browser is an Electron WebContentsView session. Opening the browser session and attaching/focusing it in the current shell are separate steps. Browser tools are not intended to be headless-only. Runtime adapter canonicalization is part of the existing browser contract. A remote-node browser must not be projected into the local Electron shell.

## Source Log
Paths below are relative to the task workspace unless absolute.
| Source | Evidence / observation |
| --- | --- |
| User screenshot and follow-up | Observed failure and permission for controlled diagnostics, not corrective requirements approval. |
| `/Users/normy/.autobyteus/server-data/memory/agents/daily_assistant_feb311e786054ec1acd79eae16d785f9/raw_traces_active.jsonl` lines 80–81, 151–154 | Two open_tab results contain `provider_state: DONE` and nested `output.tab_id`; first 51da23, second 15ee0d. The latter is the exact screenshot tab. |
| Same run's `run_metadata.json` | Runtime `antigravity_cli`, model gemini-3.8-flash-medium. |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts:98–134` | MCP name/arguments projected; every ordinary successful result wrapped as `{provider_state: 'DONE', output}`. |
| `.../antigravity/stream/agy-mcp-tool-call.ts` | Own MCP tools get canonical bare names; JSON object output text decoded, but not browser-canonicalized. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts:121–122` | Successful-tool payload passed through unchanged. |
| `autobyteus-web/services/agentStreaming/agentStreamMessageProjector.ts:105–125` | Generic success rendering and browser-specific handler invoked separately. |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleParsers.ts` | Result preserved without unwrapping. |
| `autobyteus-web/services/agentStreaming/browser/browserToolExecutionSucceededHandler.ts:9–55` | Checks only direct object `tab_id` or direct parsed JSON `tab_id`; silently returns before focus when absent. |
| `autobyteus-web/electron/browser/browser-bridge-server.ts:132–138` | open bridge calls BrowserTabManager, not shell focus. |
| `autobyteus-web/electron/browser/browser-tab-manager.ts:32–74` | Creates native view and settles navigation before opened result; opening is distinct from leasing. |
| `autobyteus-web/electron/browser/browser-shell-controller.ts` | New unleased session upsert does not add it to any shell. focusSession claims it; projection also requires host bounds. |
| `autobyteus-web/docs/browser_sessions.md` | Successful embedded open_tab should show Browser; runtime adapters own canonical result contract. Codex/Claude described explicitly. |
| `autobyteus-server-ts/src/agent-tools/browser/browser-mcp-result-normalizer.ts` and Codex/Claude callers | Those adapters normalize browser results before streaming; AGY has no caller. Normalizer alone does not unwrap an AGY output wrapper. |
| Installed app.asar + installed server converter, see evidence/installed-code-check.txt | Version 1.4.92-beta.9 has the same top-level-only renderer lookup and AGY output wrapper. Not just a source-versus-installed-version discrepancy. |
| Renderer handler unit suite | Tests canonical object/string, unrelated/missing tab, remote, unavailable; not the AGY envelope. |
| AGY MCP transport E2E source | Checks generic wrapped MCP result shapes, not browser shell presentation; no open_tab scenario in that suite. Not executed in this investigation. |
| `git log` for relevant files | cb7688c4e introduced AGY MCP presentation; 8118e68e6 gates browser projection. No claim about which commit alone introduced all earlier occurrences. |

## Relevant Existing Behavior And Supported Product Paths
- BEH-001 / SCN-001 — Supported Normal Scenario: user asks local Daily Assistant to open a page; agent calls configured open_tab; operation reports session opened; Browser should select that session. Observed AGY path stops after success rendering, before UI focus.
- BEH-002 / SCN-002 — Supported Normal Scenario: ordinary canonical browser result from other supported runtimes; existing handler focuses/selects. Preserved.
- BEH-003 / SCN-003 — Supported Explicit Edge Scenario: remote-bound or browser-unavailable window must not focus local Browser. Explicitly documented and unit-tested. Preserved.
- BEH-004 / SCN-004 — Supported Normal Scenario: unrelated AGY native/MCP tools retain their existing tool names, arguments, results and failure states. Preserved.
Synthetic replay and fake managers below are diagnostic techniques, not new supported user scenarios.

## Confirmed Root Cause (F-001)
Your exact second result is `{provider_state: "DONE", output: {tab_id: "15ee0d", status: "opened", ...}}`. The Browser handler expects `{tab_id: "15ee0d", ...}`. Therefore it returns immediately without invoking focusSession or selecting Browser. Generic Activity success remains green because it processes the successful event independently. Native session creation can succeed without the UI acquiring/displaying the session.
This mismatch is deterministic for this payload shape, not evidence of random Electron timing. Both actual open_tab occurrences in this run have it. Code and replay prove a sufficient cause of the observed missing focus. No live shell snapshot was taken, so current native tab existence and the historical renderer's complete state are not claimed.

## Runtime, Probe, Or Reproduction Findings
Command: `node /Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/replay-probe.cjs /Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation`.
Output: `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/replay-results.json`.
11 diagnostic assertions passed:
1–4. Replay both real recorded open_tab payloads: neither invokes focus/select; changing only result to its canonical inner object invokes both for the matching tab ID.
5. Real production AGY converter fed a synthetic successful MCP open_tab with about:blank reproduces the exact bad wrapper and no renderer focus.
6–7. Canonical object and JSON-string controls focus and select correctly.
8–9. Remote window and unavailable shell guards remain inactive.
10. Real BrowserShellController with a fake manager receives new-session upsert: shell snapshot remains empty.
11. Explicit focus on that session adds it to the shell snapshot.

Probe runs actual TypeScript converter, parser, handler and controller transpiled in memory. UI stores/IPC and session manager are doubles. This is boundary-level causal reproduction, NOT a full live Electron/real-provider E2E. No production source or tests were edited. No app restarted, no live app tool called, no browser pages opened. Read-only existing incident logs/metadata and installed bundles inspected. TESTING.md prohibits using the user's app as a test target; any later live verification must use an isolated instance.

## Additional Observations And Limits
- F-002 (secondary, not this incident's trigger): browserShellStore.focusSession catches IPC errors and resolves; caller's catch therefore cannot detect those failures. Store lastError exists, so not all error feedback is absent. This branch was not reached for the incident payload. Separate hardening candidate, not approved scope.
- F-003 (coverage gap): generic tool transport and canonical-only UI tests do not exercise the actual AGY-browser-to-shell result contract.
- The second dom_snapshot is success-labelled but recorded output is null. It is NOT independent proof of rendered page content. Do not repeat the Daily Assistant's claim of verified readiness as evidence.
- Daily Assistant's explanation that open_tab is intentionally headless-only is contradicted by the browser contract; it is model-generated speculation, not root cause.
- This finding does not establish causes of all previous browser failures or all runtimes.

## Structural And Payload Surface Inventory
Payload: successful AGY browser tool result, normal streaming payload, persisted trace/history result. Structural boundary: AGY event adapter -> server event mapper -> renderer handler -> IPC -> shell controller. No schema migration/security policy change required by the proposed intent. Existing remote guard and shell leases are preserved. Exact technical correction and compatibility handling deferred until approval/design.

## Persisted Data And State Facts
Incident logs are read-only; two minimal open_tab records copied to evidence/incident-events.json (no broad conversation copy). Existing sessions, cookies/profile, run history and unrelated tool payloads must not be cleared/rewritten. No data reset authorized. Volume/schema changes N/A for investigation.

## Supplemental Artifact Inventory
| Artifact | Owner / purpose | Status / approval |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/incident-events.json` | Solution Designer; exact two incident open results | Evidence-only; not behavior authority |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/replay-probe.cjs` | Solution Designer; reproducible causal diagnostic | Executed successfully; not durable implementation test |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/replay-results.json` | Solution Designer; 11 boundary assertion results | Evidence; explicitly not full E2E |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/installed-code-check.txt` | Solution Designer; installed version/code/hash comparison | Read-only evidence |

## Assumptions, Unknowns, Risks
- Current live session state not queried; no historical WebSocket packet capture. Raw trace + unchanged event mapping + installed handler + actual code replay agree on sufficient failure mechanism.
- User approval for corrective requirements is pending.
- AGY null-output browser result cases warrant scoped follow-up if encountered; no unsupported readiness claim.
- Product Design not requested; prototype/UI redesign N/A.

## Requirement Implications / Architecture Input
A narrow correction should restore existing embedded open_tab presentation for AGY, preserve other runtimes and non-browser payloads, remote restrictions and error semantics, and gain adapter-to-UI and isolated-desktop regression coverage. A provider-specific renderer workaround is not chosen as architecture; design begins only after approval. Independent review/implementation/API-E2E/delivery artifacts N/A — not applicable at this stage.

## SR-002 — Real isolated desktop reproduction
User explicitly requested a full test after SR-001. Completed the real Daily Assistant/Antigravity/Gemini 3.8 Flash Medium path in isolated installed release 1.4.92-beta.9, not the user's running app. Actual open_tab succeeded with c1c04e; Activity remained selected, shell snapshot empty, real native page existed and had DOM but 0 x 0 viewport. Clicking Browser manually still showed no session. Diagnostic focus IPC attached the SAME page, viewport became 626 x 757 and native screenshot showed page content. This closes the earlier no-full-desktop-test evidence limitation for the newly reproduced scenario; original incident's historic renderer state remains unobserved.

Supplement inventory addition: `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/desktop/desktop-reproduction.md` is the canonical reproduction procedure and inventory. All adjacent JSON snapshots, test-owned run trace/metadata, assertion source/result, screenshots and cleanup receipt are Solution Designer-owned evidence-only supplements for BEH-001 / SCN-001 / REQ-001 / AC-001; not behavior-defining supplements. No source edits, no approval change, no authoritative architecture or fix validation. Cleanup complete. See desktop report for exact command/environment, assertions and limitations.

## Follow-up clarification — intermittent user experience
User says sometimes it happens and sometimes not. Confirmed defect is deterministic only for the observed AGY output envelope and missing focus path; no successful automatic-focus case from the same runtime/version has been captured. Do not generalize the single full desktop reproduction into an explanation for every incident. Different runtime paths or pre-existing displayed sessions are hypotheses for differing observations, not confirmed causes. Ask whether a working case used the same Daily Assistant with Antigravity; ideally identify one successful run to compare tool invocation/result shape and UI/session state. No intended-behavior change or approval received; SR-002 remains current completed round.

## SR-003 — Third open and native registry listing corroborate hidden sessions
User supplies two new screenshots: ctx_714802a4d4f1__image.png and ctx_a6f182a0d801__image.png in the same original context_files directory. First shows open_tab success with provider_state/output wrapper and new tab 7b52b9, reuse_existing false; second shows list_tabs returning 51da23, 15ee0d, 7b52b9, all same CEAC URL, while Activity is selected. Read-only original run trace lines 157–160 independently match the screenshots (turn f6bc2bce-fcc4-43d7-99df-d0fd7884fa6c). Minimal excerpt preserved in evidence/third-open-and-list-events.json (Solution Designer evidence-only supplement, BEH-001 / SCN-001 / REQ-001 / AC-001).
This establishes that the tool's browser-session registry contained all three previously opened sessions at list time. list_tabs enumerates native sessions, not tabs attached to the current visible shell. The third result has the same failing envelope. Repeating open_tab with reuse_existing false creates an additional session rather than repairing display. These screenshots therefore corroborate the diagnosed create-versus-display separation; they are not a working automatic-display case and do not resolve the separate intermittent-success question. No production mutations, scope changes or approval inferred.

## SR-004 — Deeper current-state ownership and failure audit
User asks how engine sessions connect to UI and requests deeper investigation. Completed end-to-end current-state source audit; `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/connection-audit.md` records exact owners, paths and source inventory. Explicitly distinguished native manager registry from window-specific assigned session list, IPC focus membership, snapshot flow, bounds and addChildView rendering. Confirmed skipped focus is not repaired by merely selecting Browser or snapshot updates. Confirmed silent missing-ID return and lack of presentation acknowledgement on open success. Additional real-store fault injection reproduced F-002: rejected IPC resolves to caller, handler selects Browser anyway, later unchanged snapshot clears error. These are adjacent weaknesses, not the incident trigger. Supplemental source/result `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/deep-connection-probe.cjs` / `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/deep-connection-results.json` (13 passing diagnostic cases). All three are Solution Designer-owned evidence-only supplements, linked to BEH-001/REQ-001/AC-001; fault-injection hardening findings are not approved scope. No architecture spec/source edits or approval change.

## SR-005 — Approval and architecture investigation
- AP-001: user 2026-10-02: “Well, since you found the problem then go ahead. Now, you are approved now.” Approved SR-001 narrow intended-behavior basis REQ-001–003 / AC-001–003, clarified by SR-002–004 evidence. No expanded recovery policy approved.
- Isolation reconfirmed: git branch codex/embedded-browser-open-tab-investigation, HEAD 5e3cb2f720e6fc80173099075daf55594ed58de9; only this ticket directory untracked. No source edits. Original fetched base remains origin/personal same revision; finalization target origin/personal via delivery, not an immediate push/release authorization.
- Re-read actual AGY converter tool() and agy-mcp-tool-call.ts: projected own MCP name is bare open_tab; third-party names remain mcp__server__tool; native tools have no mcpCall projection. Explicit error/denial and native-image branches occur before ordinary success. provider_state already exists on event payload outside result. A scope-limited success conversion can therefore avoid changing other tools/failures/background closures.
- Re-read shared browser-mcp-result-normalizer.ts: existing browser capability normalizes direct JSON object/string, structuredContent and text-content envelopes. It expects tool output, not AGY's provider_state/output wrapper. Codex and Claude already use this owner. No new provider-output parser is required.
- Persistence investigation: runtime-memory-event-accumulator.recordToolResult delegates to runtime-tool-trace-sequencer.persistToolResult, writing result as arbitrary toolResult. raw-trace-record-normalizer.toMemoryTraceEvent copies tool_result without shape interpretation. autobyteus-ts/src/memory/tool-interaction-builder.ts preserves arbitrary result. raw-trace-to-historical-replay-events.createToolEvent preserves result; its provider_state-specific special case is denial (not changed). historical-replay-events-to-conversation passes toolResult through. run-projection-types.ts accepts unknown result. Web toolLifecycleState.applyExecutionSucceededState and toolLifecycleHandler retain generic result. Old results remain readable without reinterpretation or rewriting.
- Representative persisted evidence: two original open results + third open/list trace + isolated real run. Existing trace result and new canonical result both contain same tab identity/status/URL/title, in opaque payload. Total installation-wide trace volume not enumerated because design performs no historical I/O or migration.
- Read canonical autobyteus-server-ts/docs/design/data_migration_guideline.md sections 1–3: tolerant direct read preferred; no migration or startup gate invented for representation cleanup. No predecessor migration is relied on or altered; migration source dispositions/admission plans N/A because no transform is needed.
- Validation seams reviewed: AGY converter MCP unit tests currently protect generic non-browser output wrapper; agy-mcp-tool-call-transport.e2e.test.ts plus agy-failure-cli.mjs mcp_calls fixture exercises WebSocket/history but lacks open_tab. Renderer handler tests already prove canonical-object/string focus and remote suppression. Keep web boundary (no server/core import into web tests); bridge cross-layer proof via real isolated desktop and server transport tests.
- Design decision (authority in design-spec.md): narrowly restore canonical result for successful projected AutoByteus MCP open_tab only, using shared browser normalizer on output before generic AGY wrapper. Other tool branches unchanged. No frontend workaround or browser-owner move.
- Scoped uncertainty: real AGY may omit output for some tools; missing tab ID must not be guessed. Null/malformed payload tests protect no fabricated focus. No new renderer recovery or source of tab identity.
