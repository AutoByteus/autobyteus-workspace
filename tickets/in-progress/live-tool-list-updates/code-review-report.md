# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-007; REQ-010, AC-007, SCN-004 and the UI section changed; DEC-008 and DEC-009 are the user's decisions)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (round 1; unchanged for the delta)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001…SR-009)
- Design Spec Reviewed As Context: `design-spec.md` (SR-009)
- Supplemental Task Artifacts Reviewed As Context: `evidence/local-checks.log` (IR-002 block)
- Relevant Solution Revision IDs: SR-005…SR-009 (this round); SR-001…SR-004 (carried forward)
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-009, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-005…ARCH-REV-009
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-002)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002, IR-003
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Current Review Round: 3
- Review Scope: `Targeted Delta Review` (round 3). Round 2 was a `Full Re-Audit`; its evidence below is carried forward
- Review Scope Evidence (round 3): `git diff 6b04b12378 c8f6319838` stays within CR-004's files and behavior:
  - the handle;
  - a new owned helper `member-input-failure-observer.ts` (30 lines) that the handle uses;
  - one exported constant in `agent-run-input-lifecycle.ts`, beside the codes it names;
  - the Team test, a new helper unit test, and two doc sentences.

  `8aaf2740fd` is ticket files only. No spine, interface or data shape changed. I rechecked CR-004 and the affected checks and scores.
- Review Scope Evidence (round 2): the delta `git diff 5f3923c4cd c4da95428e` (27 files) goes beyond the prior findings' files:
  - a new behavior in `agent-collaboration/execution/backends/configured-agent-execution-handle.ts` (SR-009);
  - the shared reopen helper's contract (`runtimeSessionReopenFailedResult`);
  - web removals across the store, the segment, the payload and segment types, and the handler.

  I reran every structural check and the full scorecard. Evidence for code unchanged since round 1 (DS-001…DS-006 apart from the reopen failure path) is carried forward from CRR-001.
- Trigger: round 3, IR-003 (CR-004). Round 2: IR-002 (rework for CRR-001, after SR-005…SR-009 and ARCH-REV-009 Pass)
- Prior Review Round Reviewed: 2 (CRR-002: CR-004)
- Latest Authoritative Round: 3
- Coverage Investigation / Execution Coverage Report / API/E2E Revision Record: N/A
- Delivery Revision Record: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed (unchanged by the rework)

## Review Scope

- Changed implementation and behavior reviewed: `git diff 5f3923c4cd c4da95428e`. `7fe017eda4` and `60d9d78d43` add ticket documents only.
- Files / areas reviewed:
  - **Server:**
    - `configured-agent-execution-handle.ts` (`postMessage` lifecycle observer);
    - `runtime-session-reopen.ts`;
    - the Codex and ACP backends (failure path);
    - the ACP factory and backend input (`workingDirectory`);
    - `claude-agent-tools-mcp-session-state.ts`, `claude-session.ts`;
    - `system-task-notification-senders.ts`.
  - **Web:**
    - `SystemTaskNotificationSegment.vue`, en and zh-CN strings;
    - `AIMessage.vue`, `agentRunStore.ts`, `messageTypes.ts`, `types/segments.ts`, the handler (now identical to base: `git diff 9f7c9c10a6 c4da95428e` lists none of them).
  - **Tests:** the new Team-member integration test, the reopen tests, the routing test and `TeamStreamingService.spec.ts`.
  - **Docs:** `tool_list_updates.md`, `agent_execution.md`, `grok_build_runtime.md`, web `agent_execution_architecture.md`.
- Unchanged context read for the delta:
  - `agent-run-input-lifecycle.ts:7-46` (where `failed` facts for turn and runtime failures come from);
  - `agent-run-input-admission-state.ts:316-340`;
  - `configured-agent-execution-handle.ts:460-470` (`bindEvents`: every run event goes to the Team stream);
  - `agent-run-error-evidence.ts`.
- Explicit exclusions: as round 1 (FU-001, FU-002; Codex and Grok live runs, DEC-004).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood:
  - REQ-010 and AC-007 now say that a failed reopen fails the message with "Couldn't give this run its new tools (<cause>). Send your message again to retry, or stop and resume the run.", shown as failed messages are, with no button and no card.
  - The next message retries.
  - No other run or Team member is stopped.
  - Verification is also for a Team member.
- Design-spec behavior map verified against the implementation: the SR-005…SR-007 removals are complete (the completion grep is empty for the server, the web and the docs; I reran it). SR-009's Team-member path is built as designed, but it also fires for failures the run already publishes itself (CR-004).
- Design review report and round confirmed: ARCH-REV-009 Pass.
- Behavior-basis status: `Confirmed`.
- Changed or newly discovered behavior: none beyond the approved SR-005…SR-009.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001…BEH-003 (DS-001…DS-006) | Confirmed (carried forward from CRR-001) | Unchanged by IR-002 apart from the reopen failure result | — |
| BEH-004 / REQ-010, single run | Confirmed | The Codex (`codex-agent-run-backend.ts` `reopenWithCurrentTools`) and ACP failure paths return `runtimeSessionReopenFailedResult(error)`. That is `forwarded: false`, code `RUNTIME_SESSION_REOPEN_FAILED`, the approved text, and no event published. `reopenPending` stays set; the run's existing failed-input display shows it | — |
| BEH-004 / REQ-010, Team member | **Confirmed** (round 3: CR-004 resolved). `createMemberInputFailureObserver` publishes only a `failed` fact with no `forwarded` fact before it, whose code is not one of the run-event-derived `RUN_EVENT_INPUT_FAILURE_CODES` (`RUNTIME_TURN_FAILED`, `RUNTIME_GLOBAL_FAILURE`, exported beside their producer in `agent-run-input-lifecycle.ts`). The integration case "sent, then the turn failed" yields exactly the run's own ERROR, and fails under IR-002's behavior (IR-003 log). The unit tests cover not sent / forwarded / queued plus a run-global or turn code / other facts. Round 2: | `ConfiguredAgentExecutionHandle.postMessage` passes a `lifecycleObserver`, and a `failed` fact publishes `ERROR {code, message}` to the Team stream. The new integration test proves the reopen case and isolates the member | The observer fires on **every** `failed` fact. `failed` also comes from `observeTurnFailure` and `observeRuntimeFailure`, which are derived from the run's own `ERROR` events (`agent-run-input-lifecycle.ts:33-46`), and those events already reach the Team stream through `bindEvents` (`configured-agent-execution-handle.ts:463-468`). Probe: one ordinary failed member turn produces two `ERROR` entries (`evidence/CRR-002-probe-team-member-duplicate-error.log`) |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001…SCN-005 | as round 1 | — | — | — | — | — | — | — | CRR-001 | Supported | Use (carried forward) |
| SCN-004 (single run, Team member) | REQ-010, AC-007 | User | The user | Recover from a failed reopen by sending again | Next message | Explicit Edge | Failed dispatch → failed-message error; next `start_turn` retries | Plain error; no other member stopped | Requirements SR-007 | Supported Explicit Edge Scenario | Use |
| SCN-TEAM-TURN-ERROR | BEH-004 preserved; existing failed-turn display | User/System | The user messages a Team member; the member's runtime turn fails (provider error, rate limit, an account out of credit as during this ticket's real runs) | See the failure once | Team member conversation | Normal | Direct input → forwarded → run publishes a turn-terminal `ERROR` → Team stream (`bindEvents`); the input state also derives `failed` → the new observer publishes a second `ERROR` | Approved and existing: the error once. Observed: twice | Probe; code read | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-10 | The handle's `postMessage` observer republishes a run `ERROR` for every `failed` fact, including turn and runtime failures the run already publishes. A Team member's failed turn shows its error twice; a runtime failure shows one extra error per pending input | SCN-TEAM-TURN-ERROR; SR-009 design ("so there is no single-run duplicate"), BEH-004 preserved display | An ordinary failed turn of a Team member | See the Behavior table; the second entry carries code `RUNTIME_TURN_FAILED` and no error scope or effect | `evidence/CRR-002-probe-team-member-duplicate-error.log` (two entries: `PROVIDER_ERROR` then `RUNTIME_TURN_FAILED`, same message) | Promote → **CR-004** | This ticket (introduced by IR-002) | Publish only for a failure the run did not publish itself: an input that failed **before it was forwarded** (no `forwarded` fact preceded the `failed` fact). That is the reopen failure and the other undispatched failures SR-009 targets. This is within the design's own no-duplicate premise, so no design change is needed |
| C-11 | The new integration test accepts either code (`/^(RUNTIME_SESSION_REOPEN_FAILED\|RUNTIME_REJECTED)$/`), and the observer falls back to `"RUNTIME_REJECTED"` when `fact.code` is empty | AC-007 | — | `fact.code` is typed `string`; a dispatch failure carries the backend's code | Test; `agent-run-input-contract.ts:56-60` | Promote (with CR-004) | This ticket | Assert the exact code. Keep the fallback only if an empty code can really occur, and say where |
| C-12 | `configured-agent-execution-handle.ts` is at 498 effective lines (485 before) | Size rule | — | The CR-004 fix adds lines to a file at 498 | Line count | Promote (constraint on CR-004) | This ticket | The fix must keep the file at or below 500. Put the "failed before forwarding" decision in a small owned helper if needed |
| C-13 | The ERROR the handle publishes has no evidence (no error scope or effect) | SR-009 | — | The presentation shows it as a generic error, and it does not change the member's status, as designed | Design SR-009 ("no evidence") | Reject | — | As designed |
| C-15 (round 3) | Suppression by code (`RUN_EVENT_INPUT_FAILURE_CODES`), in addition to "not forwarded" | SCN-TEAM-TURN-ERROR (runtime-global case) | A runtime-global ERROR while an input is still queued | Such an input gets `failed` with no `forwarded` fact, and its error is already on the Team stream through `bindEvents` | `agent-run-input-admission-state.ts:330-340` (`observeRuntimeFailure` fails every non-terminal entry); unit test | Reject (as a finding) | — | Correct, and it closes the "one extra per pending input" case of CR-004. The set sits next to the only code that produces those codes, so the coupling is owned and visible |
| C-16 (round 3) | Are there other undispatched failures that the run also publishes as its own event (which would still duplicate)? | — | — | Dispatch failures return a result; the backends' dispatch paths (Codex, ACP) publish no event for them since IR-002 removed the notice | Code read | Reject | — | No evidenced case |
| C-14 | The removed CR-001 code: anything left? | SR-005…SR-007 removal plan | — | — | The completion grep (server, web, autobyteus-ts, docs) is empty; the five web files are identical to base | Reject | — | Clean |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | Unchanged owners; the failure is a plain dispatch result owned by the backend | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-004 failure branch simplified to the result; SR-009's Team path is one observer | — |
| Ownership boundary preservation and clarity | Pass | The handle owns its Team stream publication; the run is not changed | — |
| Off-spine concern clarity | Pass | — | — |
| Existing capability/subsystem reuse | Pass | The existing failed-input display and the Team `ERROR` presentation | — |
| Reusable owned structures | Pass | `runtimeSessionReopenFailedResult` shared by Codex and ACP | — |
| Shared-structure/data-model tightness | Pass | The `action` field is removed from the payload and segment types | — |
| Repeated coordination ownership | Pass | — | — |
| Empty indirection | Pass | `ClaudeSession` keeps two one-line forwards to the state's owner methods (CR-002), which are needed because the backend holds the session | — |
| Separation of concerns and file responsibility | Pass | CR-002: `claude-session.ts` is at 490 effective lines; the logic sits in `ClaudeAgentToolsMcpSessionState` | — (see C-12 for the CR-004 fix) |
| Ownership-driven dependency check | Pass | — | — |
| Authoritative Boundary Rule | Pass | — | — |
| File placement | Pass | — | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface boundary clarity | Pass | `runtimeSessionReopenFailedResult(error)`; `AcpAgentRunBackendInput.workingDirectory: string` | — |
| Naming quality / one vocabulary | Pass | The sender comment narrowed to the one notice | — |
| No unjustified duplication | Pass | Round 3: CR-004 resolved (one ERROR per failure) | — |
| Patch-on-patch complexity control | Pass | The rework removes code (+272/−295) instead of layering on the button | — |
| Dead code removed in touched files | Pass | CR-003 resolved (no fallback); Codex `publishSourceEvents` removed with its only use; the button, notice and strings all removed | — |
| Test scenarios and assertions are clear and requirement-aligned | Pass (round 3: exact code asserted; sent-then-failed case added; helper unit tests) | Round 2 note: The reopen tests assert the plain failure and that no event is published. The Team test proves member isolation with a real handle, run and adapter, but accepts either code (C-11), and no test covers an ordinary member turn failure (where CR-004 shows) | With CR-004: assert the exact code; add a case for a failed forwarded turn (one ERROR) |
| Test fixtures/helpers reusable, structure coherent | Pass | — | — |
| No stale, duplicated, or compatibility-only tests | Pass | Button and notice tests removed; spec key checks removed with the strings | — |
| API/E2E readiness | Pass | Round 3: CR-004 resolved; IR-003 checks green; architecture 54/54 and the helper test 4/4 rerun by the reviewer on `8aaf2740fd` | — |

## Source File Size And Structure Audit

The delta's changed source files over 220 effective lines:

| Source File | Base | Round 1 | Now | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `backends/claude/session/claude-session.ts` | 487 | 501 | 490 | Pass | +3 | Pass | Pass | Resolved (CR-002) | — |
| `agent-collaboration/execution/backends/configured-agent-execution-handle.ts` | 485 | 485 | 487 (round 3; 498 in round 2) | Pass | +2 | Pass (the decision sits in the owned helper) | Pass | — | — |
| `agent-collaboration/execution/backends/member-input-failure-observer.ts` (new, round 3) | — | — | 30 | Pass | — | Pass | Pass (beside the handle it serves) | — | — |
| `backends/acp/backend/acp-agent-run-backend.ts` | 120 | 250 | 249 | Pass | — | Pass | Pass | — | — |
| `backends/codex/backend/codex-agent-run-backend.ts` | 256 | 341 | 330 | Pass | — | Pass | Pass | — | — |
| `autobyteus-web/stores/agentRunStore.ts` | 456 | 488 | 456 (identical to base) | Pass | — | Pass | Pass | — | — |

All other round-1 rows are unchanged and carried forward.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | — |
| No legacy old-behavior retention | Pass | No compatibility read of the removed `action` field |
| Dead code removed in touched files | Pass | CR-003 resolved |
| Persisted-data transition decision followed | Pass | Unchanged; the failure notice was never recorded, so nothing stored needs cleanup |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match the design | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, done. `tool_list_updates.md`, `agent_execution.md`, `grok_build_runtime.md` and web `agent_execution_architecture.md` describe the plain failed message; no button or card text remains (grep empty). Round 3: the Team-member sentences in `tool_list_updates.md` and `agent_execution.md` now say "failed before it was sent" and explain why a sent-then-failed message is not published again.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| Round-1 premises; MP-CODEX-RETRY | Confirmed | Unchanged |
| SR-009 "no single-run duplicate" | Reclassified (CR-004) | It holds for the single-run path. On the Team stream the run's own `ERROR` events are forwarded by `bindEvents`, so republishing on every `failed` fact duplicates turn and runtime failures. The design's intent (the undispatched failure) still holds; only the trigger set must narrow |

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.5
- Score calculation note: simple average of the ten categories, for trend visibility only.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | The failure branch is now a plain result; the Team path is one observer | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | CR-002 moved the logic to its owner; the handle owns its stream | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Simpler reopen-result contract; non-null `workingDirectory` | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | CR-002 resolved; CR-004's decision is in its own 30-line helper; the handle is at 487 | — | — |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.5 | `action` removed; one shared result helper | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | Clear comments, approved text | — | — |
| 7 | API/E2E Readiness | 9.4 | Suites green; Team reopen and sent-then-failed cases proven with real parts; exact code asserted | Codex/Grok live runs owed (DEC-004, accepted) | API/E2E runs them when credit returns |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Reopen failure correct on single runs and Team members; one error per failure (round 3) | Residuals C-07 (Claude approval in the re-list window) | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean removal | — | — |
| 10 | Cleanup Completeness | 9.5 | Completion grep empty; CR-003 resolved | — | — |

## Findings

| ID | Severity | Status | Location | Problem | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- | --- | --- |
| CR-001 | — | **Resolved** | — | The Team-member restart | Resolved upstream (DEC-008, DEC-009; SR-005…SR-009). The button, the notice and all their consumers are removed; the completion grep is empty | — |
| CR-002 | — | **Resolved** | `claude-session.ts` | Over 500 | Now 490; the logic sits in `ClaudeAgentToolsMcpSessionState` (`currentToolNames`, `applyExposure`) | — |
| CR-003 | — | **Resolved** | `acp-agent-run-backend.ts` | `?? "."` fallback | `AcpAgentRunBackendInput.workingDirectory: string` from `bindBackend`, used directly | — |
| CR-004 | — | **Resolved (round 3)** — IR-003 `c8f6319838`: `member-input-failure-observer.ts` publishes only when not forwarded and not a run-event code; exact-code assertion; sent-then-failed integration case; fallback dropped (every `failed` code is non-empty); handle at 487; docs updated. Round 2 text: | `autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-execution-handle.ts` (`postMessage`, the `lifecycleObserver`) | The observer publishes a run `ERROR` for **every** `failed` fact. `failed` facts also come from the run's own turn-terminal and runtime-global `ERROR` events (`agent-run-input-lifecycle.ts:33-46`), and the handle already forwards those events to the Team stream (`bindEvents`, `:463-468`). Result: every ordinary failed turn of a Team member's direct input shows its error twice in the member's conversation (the second with code `RUNTIME_TURN_FAILED` and no scope or effect), and a runtime failure adds one extra error per pending input. Proven by probe (`evidence/CRR-002-probe-team-member-duplicate-error.log`). This regresses existing behavior (BEH-004 preserved: failed messages show as they do today) on a common path | Publish only for an input that failed **before it was forwarded** (no `forwarded` fact before the `failed` fact), which is the reopen failure and the other undispatched failures that SR-009 targets and that the run never publishes. Also: tighten the integration test to the exact code `RUNTIME_SESSION_REOPEN_FAILED`; add a case where a forwarded member turn fails and exactly one `ERROR` reaches the Team stream; drop the `"RUNTIME_REJECTED"` fallback unless an empty code can occur; keep the file ≤ 500 effective lines | `Local Fix` → Implementation |

## Follow-ups

- Follow-ups this review added: None.

## Classification

- Round 3: none (Pass). Round 2's `Local Fix` (CR-004) is resolved.

## Recommended Recipient

- API/E2E Engineer (primary pass recipient); informational notice to the Implementation Engineer.

## Residual Risks

- As round 1: Codex and Grok live runs are owed (DEC-004); the Claude approval prompt for a removed tool in the re-list window (C-07); Claude's `agent_tools_enabled` approved events.

## Latest Authoritative Result

- Review Decision: `Pass` (round 3)
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5/10; every category is at 9.3 or above
- Failure Origin: N/A
- Recommended Recipient: API/E2E Engineer
- Notes: CR-001…CR-004 are resolved. Round 3 reused the IR-003 checks. The log shows no architecture rerun after the commit, so I ran `tests/architecture` plus the helper test on `8aaf2740fd`: 8 files / 58 tests passed. Round 2: Checks in `evidence/local-checks.log` (IR-002) were reused. I ran one temporary probe for CR-004; it was removed, and its output is saved as evidence.
