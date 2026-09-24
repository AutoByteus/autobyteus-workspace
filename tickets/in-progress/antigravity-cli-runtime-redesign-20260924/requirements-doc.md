# Antigravity CLI Runtime Redesign — Requirements

## Document Status

- Status: **Approved — proceed with architecture design on the complete clarified AGY baseline**
- Current solution revision ID: `SR-016`
- Package identifier: `antigravity-cli-runtime-redesign-20260924`
- Requirements owner: Solution Designer
- Date: 2026-09-24
- Approval state and reference: The user's 2026-09-24 “niceee. i approve the ticket” approved the structured AGY direction; subsequent messages explicitly approved AGY-specific runtime-selection default-on/no-headless-manual-approval behavior and clarified conversion into existing AutoByteus raw traces, not a separate provider archive. After reviewing the live JSON experiments and mapped conversion direction, the user's latest “So do you think now everything is clear? If yes, then we can start with the tickets now. You can continue, right?” is the explicit go-ahead for the complete clarified ticket baseline. The Solution Designer confirms the baseline is clear: day-one standalone and team/org member support (SCN-001/002) and original run identity retained across exact resume (baseline point 4) are the proposed terms being accepted, not newly invented features. No old AGY AutoByteus product run history exists to migrate. This approval authorizes design, not implementation without an architecture package.
- Behavior-defining supplements: N/A; `agy-cli-experiment-report.md` is evidence, not approved behavior. June ticket artifacts are historical evidence only.

## Problem And Desired Outcome

The old Antigravity work is 2,336 base commits behind current `origin/personal` and predates the current agent-identity contract and newer AGY CLI capabilities. The approved outcome is a first-class `antigravity_cli` backend that represents each selected AutoByteus agent's full identity, binds each AutoByteus run to the correct CLI-created conversation, supports standalone and team/org member runs, and preserves non-AGY runtimes. The user accepts structured chat, no headless per-tool approval, AGY-specific default-on auto-execute, and the existing normalized raw-trace pattern rather than a separate AGY NDJSON archive. Existing AGY conversations retain their run-start identity. Live probes show a custom main agent is feasible and first-user-message identity is weaker; see the evidence report for technical limits.

## Relevant Scenarios

| ID | Validity | Trigger and outcome | Evidence |
| --- | --- | --- | --- |
| SCN-001 | Approved normal | User starts a standalone AGY agent; its identity applies before first task and input stays bound to that run. | User request; runtime selector and shared identity composer. |
| SCN-002 | Approved normal | User starts an AGY team/org member; member identity and enclosing collaboration instructions apply. | Current member context and shared composer; complete-baseline go-ahead. |
| SCN-003 | Approved normal | User reopens an AGY run; the exact CLI conversation resumes with its run-start identity or an explicit non-restorable state is shown. | User's conversation-ID concern; `platformAgentRunId`; AGY `--conversation`; baseline point 4. |
| SCN-004 | Approved normal | Two AGY runs use one real workspace; run-specific identity/configuration/conversations remain distinct. | Old concurrency findings; current independent-run model. |
| SCN-005 | Supported preserved behavior | AutoByteus, Codex, and Claude runs keep their existing execution and restore behavior. | Current runtime registration and run paths. |

## Current And Desired Behavior

| ID | Current evidence | Proposed desired/preserved behavior |
| --- | --- | --- |
| BEH-001 | AGY is unregistered on latest base. | Selectable, available AGY backend with valid models; other runtimes unchanged. |
| BEH-002 | Shared identity includes agent name, description, authored instructions, and member team/collaboration instructions. Old AGY code only injects instructions/description into the first app-submitted message. Current AGY custom main-agent body is documented as system instruction and passed a bounded live probe when correctly loaded into a new project. | Full applicable identity is in effect before either direct-human or app/team input; user text is not misrepresented as real system authority. |
| BEH-003 | AutoByteus run ID and nullable provider ID are distinct. Old AGY code parses logs on close. Current AGY can emit a generated ID in stream `init`, but invalid exact resume can silently make a different ID. | Capture and durably bind the CLI-created conversation ID early; never guess or silently replace a different conversation on restore. |
| BEH-004 | Old ticket chose terminal UI; current base has no AGY surface and evolved launch paths. User prefers the existing structured frontend pattern and explicitly accepts no per-tool Approve/Deny UI for headless AGY. They direct that **selecting AGY in a new editable launch** sets `autoExecuteTools=true` by default. Current new standalone/team frontend templates default this field false for all runtimes and runtime selection does not alter it. | New AGY structured runs default to high-trust auto-execute without approval prompts; AGY-emitted tool lifecycle/error states remain visible as tool events, without claiming machine-readable execution details AGY omits. Other runtimes' initial defaults are preserved. Explicit off is not a separately supported manual-approval mode: if selected, ordinary AGY headless policy applies and any denied tool is visibly failed, never shown as pending approval or success. |
| BEH-005 | No current-base AGY runs; old branch is unmerged. | Run-specific integration does not overwrite user workspace customization or cross-bind concurrent runs. |
| BEH-006 | PTY screen output is not a reliable source for normal structured history. Current AGY stream emits user/assistant/tool/result events; one `view_file` tool output exposed only a size summary rather than file contents, although the assistant answered using that file. Current AutoByteus external-runtime recorder persists normalized raw traces from `AgentRunEvent`. | Normal AGY chat/history and Event Monitor use converted `AgentRunEvent`s; the existing recorder writes AutoByteus normalized raw traces. AGY NDJSON is backend input, not a separate required archive. Submitted app input can be recorded by AutoByteus; AGY-internal tool-result bytes or hidden reasoning absent from its stream cannot be recreated. |

## Scope Guardrail

In scope for proposed approval: AGY selection/availability (UC-001), full per-agent/member identity (UC-002), exact provider binding and reopen for **new integration-created runs** (UC-003), isolated concurrent runs and real-workspace protection (UC-004), and non-AGY regression safety (UC-005). Out of scope unless separately approved: mechanical old-branch merge, guessing last conversation, global AGY settings mutation for per-run behavior, and parsing terminal screen bytes into assistant facts. No legacy AutoByteus AGY run migration exists to consider. Reviewers cannot silently change the approved UX, approval/security policy, or data-continuity scope.

## Approved Requirements And Acceptance Criteria

| ID | Requirement | Related scenario |
| --- | --- | --- |
| REQ-001 | Expose AGY only when the supported CLI is available, with compatible model choices and clear unavailability errors. | SCN-001 |
| REQ-002 | Every AGY run applies the selected AutoByteus agent's full applicable identity, including member-specific enclosing/collaboration instructions, before first real task input. | SCN-001, SCN-002 |
| REQ-003 | Store CLI-created exact conversation identity separately from AutoByteus run identity and use only that binding for automatic restore. | SCN-003 |
| REQ-004 | Missing, ambiguous, changed, or conflicting CLI conversation identity is visible and never triggers implicit latest-conversation resume or silent new-conversation replacement. | SCN-003 |
| REQ-005 | Concurrent runs sharing a real workspace keep their generated run-specific identity/configuration separate without overwriting user-owned customization. | SCN-004 |
| REQ-006 | Existing AutoByteus, Codex, and Claude behaviors remain intact. | SCN-005 |
| REQ-007 | AGY direct input and tool permissions have one coherent user-facing interaction model that honors the existing per-run `autoExecuteTools` choice; the disabled choice must not silently masquerade as successful tool execution. | SCN-001, SCN-002 |
| REQ-008 | Approval-required tool actions that AGY denies or cannot present are not reported to the user as successful actions merely because the CLI process or overall turn exits successfully. | SCN-001, SCN-002 |
| REQ-009 | In structured AGY mode, user/assistant/tool/turn information exposed by AGY is converted to canonical `AgentRunEvent`s, displayed through the normal AutoByteus conversation/Event Monitor surface, and durably recorded in the existing normalized AutoByteus raw-trace format. AGY NDJSON is transport input; a separate verbatim provider archive is not required. Unsupported or omitted provider details are not invented. | SCN-001, SCN-002, SCN-003 |
| REQ-010 | Selecting AGY for a new editable standalone or team/member launch scope sets that scope's `autoExecuteTools=true` by default; newly initialized AGY launch templates do likewise. This does not globally change other runtime defaults or rewrite persisted existing-run choices. The backend maps an enabled AGY run to its no-prompt all-tools mode on both new and resumed processes. | SCN-001, SCN-002, SCN-003, SCN-005 |

| ID | Linked requirement | Observable acceptance outcome |
| --- | --- | --- |
| AC-001 | REQ-001 | AGY appears only when CLI availability is confirmed; failure gives a reason instead of a broken run. |
| AC-002 | REQ-002 | Standalone and member identity matches today's shared identity fields before first real input; no fake bootstrap user message. |
| AC-003 | REQ-003, REQ-004 | Two runs have distinct AutoByteus/provider bindings; reopening either selects its exact conversation or reports non-restorable. A nonexistent exact ID that makes AGY emit a new ID is rejected, not rebound. |
| AC-004 | REQ-005 | Two runs in one workspace do not share generated secrets/config or modify user-owned `.agents` files for that purpose. |
| AC-005 | REQ-006 | Representative existing-runtime standalone/team execution and restore checks pass. |
| AC-006 | REQ-007 | With `autoExecuteTools=true`, an approval-requiring harmless command runs without a prompt and its tool lifecycle appears in Event Monitor. AGY headless does not present a Codex-style actionable approval card. If explicitly disabled, a denied tool is visibly failed rather than actionable or silently successful; no separate interactive approval feature is promised. |
| AC-007 | REQ-008 | A headless soft-denied tool action is visibly classified as denied/unsuccessful despite CLI exit `0` and a possible overall `SUCCESS` result; a denied AGY tool event is not presented as a pending, resumable approval request. Native TUI is outside this structured-backend ticket. |
| AC-008 | REQ-009 | A multi-turn AGY stream with an assistant response and tool step survives reload in the normal conversation/raw-trace inspector as AutoByteus raw-trace items, preserving exposed order, content and error state. Missing full tool payloads, hidden reasoning or an unreported underlying command exit code are not represented as captured. No separate verbatim AGY NDJSON archive is required. |
| AC-009 | REQ-010 | In a new editable draft, selecting AGY at standalone, team-root, team/org-member scope sets that scope's auto-execute on; an AGY-initialized draft also starts on. Switching among other runtimes does not silently change their initial defaults; existing saved runs retain their stored value. AGY create and exact-resume processes use always-proceed only when the effective run config is enabled. Existing team/org inheritance and override semantics remain coherent. |

## UI / Permission Decision

- **Option A — native terminal (June intent):** AGY TUI is the sole direct-human input and native approval surface. Output remains opaque, not synthetic assistant history. Requires a run-owned PTY, explicit no-message launch, and verified non-screen conversation-ID capture. The bounded TUI capture probe remains inconclusive for first model response, and idle TUI did not create a logged conversation binding.
- **Option B — normal chat from structured CLI stream:** CLI JSON `init`/step/result events provide exact ID and turn boundaries through ordinary process pipes, not node-pty. This fits current chat/history/raw-trace architecture and the user's newly expressed preference. The current AGY high-trust `--dangerously-skip-permissions` flag enabled a harmless shell tool in a bounded test, whereas headless `request-review` denied it. Therefore enabled `autoExecuteTools` can plausibly map to AGY's always-proceed behavior; this broad AGY grant must be a deliberate per-run contract, not an unnoticed global settings edit. The stream may summarize tool output rather than provide every byte.
- Decision captured for AGY: the user accepts no interactive per-tool approval bridge in headless structured mode and directs that selecting AGY in a new editable launch defaults `autoExecuteTools=true`, mapped to AGY's skip-permissions behavior. Explicit false is not a separate approval UX to design; ordinary AGY policy applies and denials must remain visible. Neither removal of the toggle nor a changed default for other runtimes was requested. The user clarified that the existing AutoByteus normalized raw-trace path should be reused. No Product Design/prototyping was requested.

## Data Continuity / Open Decisions

AGY has not been integrated into the current product, and the user confirms the old worktrees have never produced AutoByteus AGY run history. Therefore there is **no existing AGY product-run data or migration requirement**. Historical git worktree cleanup is a separate repository housekeeping matter, not product data continuity. Installed CLI currently reports `1.2.10` (earlier same-day `1.2.9`); full local probe matrix is recorded in `agy-cli-experiment-report.md`.

| ID | Decision | Owner | Status |
| --- | --- | --- |
| DEC-001 | Keep native terminal, or use structured chat if its approval limitation is addressed? | User | Resolved: normal structured chat/Event Monitor is approved; no per-tool headless approval UI and AGY-specific default-on execution. |
| DEC-003 | For AGY structured chat, how should auto-execute and the lack of per-tool headless approvals behave? | User | Resolved by 2026-09-24 user messages: AGY selection defaults true; enabled maps to all-tools always-proceed; no per-tool approval UI; explicit false uses ordinary headless policy with visible denial, not a separate supported manual-approval feature. |
| DEC-004 | If an AutoByteus agent definition changes, should an already-started AGY conversation retain its original identity (as one probe observed) or require a new/forked run? | User | Resolved in approved baseline: retain run-start identity for existing AGY conversation; edits affect new runs. |
| DEC-005 | Must automated team runs be supported on day one, or may they be staged after standalone AGY chat? | User | Resolved in approved baseline: team/org members are in scope with the same structured contract. |
| DEC-006 | Which raw-trace storage pattern should AGY use? | User | Resolved by latest clarification: convert AGY stream events to canonical `AgentRunEvent` and write normal AutoByteus normalized raw traces, as for Codex. No separate provider-NDJSON archive. The observed provider-output limit remains factual. |

## Approved Baseline

The following is the complete interpretation of the user's ticket approval, clarified across the 2026-09-24 conversation and reaffirmed by the latest go-ahead to continue:

1. AGY is a normal AutoByteus chat/Event Monitor backend over `stream-json` process pipes, for standalone and supported team/member runs, not a PTY terminal UX.
2. AGY's NDJSON stream is converted into canonical AutoByteus events; the existing recorder writes normal normalized raw-trace items for chat/history/Event Monitor. Do not add a separate verbatim AGY provider archive. Hidden reasoning, full tool payloads or execution status absent from AGY events cannot be fabricated.
3. Selecting AGY in a new editable standalone/team/member launch sets `autoExecuteTools=true` by default, mapped to AGY's high-trust skip-permissions behavior so tool actions run without approval prompts and their AGY-emitted lifecycle/error state remains visible in Event Monitor. There is no Codex-style per-tool Approve/Deny action for AGY headless. Explicitly turning it off is not a separate manual-approval feature: ordinary AGY headless policy applies, with visible denial on rejected tools. Other runtimes' initial defaults and persisted existing-run choices remain unchanged; the toggle is not removed by this ticket.
4. Existing conversations created by the new AGY integration retain the identity snapshot with which they started; agent-definition edits affect newly created runs, not silent mutation of an existing AGY conversation.

This approved baseline authorizes authoritative architecture design. It does not itself establish implementation success, byte-complete internal AGY traces or completion of validation.

## Readiness

Readiness passed and complete baseline approval captured by the user's latest go-ahead after the proposed baseline and experiments were discussed. Remaining uncertainties are implementation/design validation, not unresolved intended behavior. Authoritative architecture design is now permitted; `design-direction-proposal.md` remains historical non-authoritative input until `design-spec.md` is completed.
