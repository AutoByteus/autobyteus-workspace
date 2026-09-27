# Code Review Report — `grok-build-runtime-support`

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/requirements-doc.md` (Approved; SR-005 baseline + SR-008 clarifications)
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/investigation-notes.md`
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/solution-revision-record.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/design-spec.md` (SR-008, Ready)
- Supplemental Task Artifacts Reviewed As Context: `evidence/grok-acp-probes/*` (wire logs); `evidence/implementation-probes/*` (step-5 tool-set result, zero-cost probes). Product/UI supplements: `N/A — not applicable`.
- Relevant Solution Revision IDs: SR-005, SR-006, SR-007, SR-008
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/design-review-report.md` (round 2, Pass)
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001, ARCH-REV-002
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Current Review Round: `3`
- Current Review Entry Point: `Implementation Review` (re-review of IR-002).
  - Round 3 reviews the delta `git diff 2b31b046d..d7d4aa2ad` (commit `d7d4aa2ad`) against SR-011, ARCH-REV-003 (Pass) and CRR-002.
  - The round-1 content below remains valid for unchanged code. The round-2 failure-origin section is kept as history of the CRR-002 classification.
  - The "Implementation Re-Review (Round 3, CRR-003)" section is authoritative for the delta.
- Trigger (round 3): `/implementation_engineer` IR-002 handoff ("IR-002 Delta" in `implementation-handoff.md`)
- Relevant revision IDs (round 3): SR-009, SR-010, SR-011; ARCH-REV-003 (AR-006 open, Low, wording); IR-002; API-REV-001
- Trigger (round 2): `/api_e2e_engineer` result `Fail`, API-REV-001, round 1
- Trigger (round 1): `/implementation_engineer` handoff "Implementation complete" (IR-001), commit `2b31b046d` on `codex/grok-build-runtime-support`, base `origin/personal` @ `e06080b00`
- Prior Review Round Reviewed: round 1 (CRR-001, Pass)
- Latest Authoritative Round: `2`
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md` (also `api-e2e-test-case-ledger.md`)
- Relevant API/E2E Revision IDs: API-REV-001
- Delivery Revision Record: N/A
- Failing Scenario IDs:
  - GE2E-P1 (AC-012, REQ-015)
  - GE2E-L2 (AC-004 deny)
  - GE2E-P3 observation (REQ-005)
  - GE2E-B1/B2 (AC-015, testing de-scoped by the user)
- Exact Failing Commands / Execution Mode:
  - `RUN_GROK_E2E=1 npx vitest run tests/e2e/runtime/grok-build-live-runtime.e2e.test.ts --no-watch` (standalone: soft failure at the deny terminal);
  - a temporary server probe with `GROK_BUILD_COMMAND=/tmp/grok-api-e2e/noauth/grok` (HOME-isolated real `grok` 1.0.41);
  - `evidence/api-e2e/approval-bisect-probe.mjs` (paid 1-call probes).
- Failure Evidence Paths (under `evidence/api-e2e/`):
  - `ac012-noauth-server-probe-excerpt.txt`
  - `ac012-noauth-acp-wire/*.jsonl`
  - `approval-bisect-results.txt`
  - `live-standalone-4-excerpt.txt`

## Implementation Re-Review (Round 3, CRR-003)

### Upstream basis (SR-009..SR-011, ARCH-REV-003)

| Finding | Upstream decision | Status in the approved basis |
| --- | --- | --- |
| CR-004 | DS-001: provider `RequestError`s from `initialize`/`session/new`/`session/load` plus the safe ACP errors become `AgentCreationError` with provider message and data | Implementation fix required |
| CR-005 | User deferred application launch to a future ticket (SR-009, STC-002). REQ-017/AC-015 are marked deferred, with the known `unsupported` gap recorded in AC-015 and the BEH-013 map row | Not in scope for this ticket; accepted |
| CR-006 | AC-004 amended and approved by the user (SR-011): deny → tool denied, turn **completed**, run idle, next message continues. A real user interrupt stays interrupted, and an agent `cancelled` without a user denial stays interrupted | Implementation fix required |
| CR-007 | REQ-005 rationale clarified by precedent (SR-010): AutoByteus is the approval surface for every request Grok raises and never grants on the user's behalf; Grok's own policy decides which calls need approval (Codex `on-request`, Claude `default`) | No code change; resolved in the requirements |
| CR-002 | Design text synced in SR-009/SR-011. The stale wording (`minimumVersion`, `requiredCapabilities`, `awaitMcpReady`, "image blocks only when", "ERROR + TURN_COMPLETED") no longer appears in `design-spec.md` | Resolved |
| AR-006 | Restore shows the manager's generic `PlatformAgentRunRestoreError`, with the provider text kept as `cause` (existing shared behavior, REQ-014). AC-012 is interpreted as covering new-run start and in-turn errors | Accepted interpretation; Low wording item for the Solution Designer |

### Delta review (9 files: 6 source, 3 test)

| Area | Change | Verification | Result |
| --- | --- | --- | --- |
| CR-006 turn-end classification | `AcpAgentSession.endTurnFor`: a non-`cancelled` stop → `completeTurn`. A `cancelled` stop → `interruptTurn` when the state is `cancelling` or no user rejection happened in this turn; otherwise `completeTurn`. `userDeniedInTurn` is reset in `startTurn` and set only when `bridge.decide` reports `outcome:"rejected"` | `finishTurn` now builds the events **before** switching the state to `ready`, so the state check is correct. The interrupt is checked first (DS-002). The flag is not set for auto-execute, for `cancelled` answers or when no reject option exists. Runtime-neutral (standard ACP stop reason + bridge outcome). Tests: denial → completed (`provider_stop_reason:"cancelled"`, no `TURN_INTERRUPTED`, state `ready`), denial then user interrupt → interrupted, agent cancel without denial → interrupted, flag reset on the next turn | Pass |
| Permission bridge | `decide` returns `{kind:"answered", outcome:"allowed"|"rejected"|"cancelled"}`. A denial with no `reject_once` option still answers `cancelled` and reports `cancelled`, never `rejected` | Unit test for the no-reject-option case; one-shot-only guarantee unchanged | Pass |
| CR-004 start-time errors | New neutral `runtime-management/acp/acp-error-message.ts`. `describeAcpError` is moved unchanged from the session; `describeAcpActivationError` covers `RequestError` → `"<label>: <message>[: <data>]"` and safe `ACP_*:` / `PLATFORM_AGENT_RUN_BINDING_INVALID:` errors → as-is, and returns null otherwise. The factory's `launch` rollback rethrows these as `AgentCreationError` after the process stop and skill release; any other error is rethrown unchanged. The restore binding error is thrown directly as `AgentCreationError` | `AgentRunManager` (lines 369-387) passes `AgentCreationError` through unchanged, so `createAgentRun` shows the provider text. Restore is wrapped by the manager (AR-006, accepted). Only layer-owned codes match the safe-code pattern (capability, MCP ready/unavailable, session open/failed, request timeout, post-close guard, binding); none embeds provider output. Tests: `session/new -32000` → `AgentCreationError("Fake Agent: Authentication required: no auth method id provided")`; load error, capability, MCP and binding errors are all `AgentCreationError` | Pass |
| CR-003 | `initialize` uses the SDK `PROTOCOL_VERSION` | Same constant as the capability check | Pass (resolved) |
| CR-001 | Removed `AcpPermissionBridge.has()`, `AcpAgentProcess.stderrTail()` and the stderr buffer; stderr is drained with `resume()` | The pipe is still drained, so the child cannot block; no consumers remain; the comment states that stderr content is never surfaced | Pass (resolved) |
| Neutrality (AC-016) | — | `grep -n "grok|Grok|xai|x.ai"` over `runtime-management/acp` and `backends/acp` finds nothing; the neutrality test passes | Pass |

### Round-3 candidate gate (delta only)

| Candidate ID | Observation | Scenario / Contract | Evidence | Disposition | Reason |
| --- | --- | --- | --- | --- | --- |
| CAND-14 | After a user denial, a later unrelated agent-side `cancelled` in the same turn would be classified completed | SCN-004 / AC-004 as amended | No evidence that Grok cancels for another reason after continuing past a rejection; the approved rule keys on "a user denial in this turn" | Reject | Contrived; matches the approved AC-004 rule |
| CAND-15 | An agent `RequestError` message and data reach the user unfiltered | BEH-011 / AC-012 / DS-001 | The approved behavior requires the provider error text to be visible. The shared layer adds no stderr or paths | Reject | Approved behavior |
| CAND-16 | Restore does not show the provider text | AR-006 / REQ-014 | Existing manager-wide restore wrapper; the Solution Designer interpreted AC-012 as new-run start and in-turn | Reject (as a finding) | Accepted upstream interpretation; wording only (AR-006) |

### Round-3 verification

- `tsc -p tsconfig.build.json --noEmit` is clean.
- ACP/Grok unit suites pass: 12 files, 68/68.
- API/E2E zero-cost suites pass: `runtime-capability-graphql.e2e.test.ts` and `grok-build-runtime-replay.e2e.test.ts`, 2 files, 8/8.
- The API/E2E-owned uncommitted e2e files are untouched. The gated live test already asserts `TURN_COMPLETED` after a denied `run_bash` (line 222).
- The live re-run of the amended AC-004 and of AC-012 through `createAgentRun` belongs to API/E2E.

### Round-3 scorecard (full scorecard kept current)

| Priority | Category | Score | Why / Change From Round 1 |
| --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Unchanged; DS-001/DS-002 additions map directly to the factory rollback and the session's `endTurnFor` |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Error text composition has one neutral owner (`acp-error-message.ts`) shared by the session and factory; classification stays session-owned |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Bridge outcome is explicit; single protocol-version source (CR-003 resolved) |
| 4 | Separation of Concerns and File Placement | 9.3 | Unchanged; the session file shrank slightly |
| 5 | Shared-Structure / Data-Model Tightness | 9.2 | Unchanged (design-listed unconsumed capability fields remain) |
| 6 | Naming Quality and Local Readability | 9.4 | `endTurnFor` and `userDeniedInTurn` are clear; the docblock states the rule |
| 7 | API/E2E Readiness | 9.2 | Both failed ACs have deterministic unit coverage; the replay e2e passes; a live re-run is still owed |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.2 | Up from the round-2 rationale of 7.5: CR-004 and CR-006 fixed per the approved basis. CR-005 is deferred by the user and recorded as a known gap |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.8 | Unchanged |
| 10 | Cleanup Completeness | 9.5 | CR-001 resolved |

- Overall: 9.41/10 (94.1/100); every category ≥ 9.0.

## API/E2E Failure-Origin Review (Round 2, CRR-002)

Scope: only the four API/E2E failures and observations and the smallest source paths needed to classify them. The general suite review is not repeated. The API/E2E pass evidence stands and is not re-examined:
- standalone, interrupt (103 ms), exact restore with Agent Tools MCP;
- per-call usage sums, mixed team, Org and team restore;
- the tool set without `task`/`workflow`/`ask_user_question`;
- the zero-cost e2e suites.

### Scenario basis for the failing scenarios

| Failure | Scenario / Contract | Validity | Independent Trigger | Production Path Checked |
| --- | --- | --- | --- | --- |
| F-1 (AC-012) | SCN-010 / REQ-015 / BEH-011 ("Run start or turn fails with the provider error text visible") | Supported Normal Scenario | Operator launches a Grok run while the host `grok` is not logged in | GraphQL `createAgentRun` → `AgentRunManager.prepare…` → `AcpAgentRunBackendFactory.createBackend` → `launch` → `session.openNew` → `connection.newSession` |
| F-2 (AC-004 deny) | SCN-004 / REQ-005 / AC-004 ("deny → denied, agent continues") | Supported Normal Scenario | Operator denies a `run_bash` approval | `approve(false)` → bridge `reject_once` → Grok prompt result `stopReason:"cancelled"` → `finishTurn` → `converter.interruptTurn()` |
| F-3 (REQ-005) | SCN-004 / REQ-005 ("AutoByteus stays approval authority" rationale); DEC-007; REQ-016 (user Grok config untouched) | Supported Normal Scenario | Operator runs with `autoExecuteTools=false`; the model issues `echo`/`touch` | Grok permission manager → (no `session/request_permission`) → tool runs |
| F-4(b) (AC-015) | SCN-011 / REQ-017 / AC-015 ("valid launch starts a Grok-backed application run") | Supported Normal Scenario (testing de-scoped by the user; the requirement is unchanged in the approved basis) | Application operator configures `grok_build` | `ApplicationLaunchHostCapabilityValidator` → `resolveAuthority(GROK_BUILD)` → `unsupported` → `getReadiness` → `{configured:false}` → blocking `RUNTIME_AUTHENTICATION_UNAVAILABLE` |

### F-1 — provider auth text lost at run start → `CR-004` (implementation defect; Local Fix)

- Evidence:
  - Wire logs (`ac012-noauth-acp-wire/*.jsonl`): `initialize` succeeds, then `session/new` returns `{"code":-32000,"message":"Authentication required","data":"no auth method id provided"}`. Grok does not exit.
  - The factory's `launch` catch rethrows the SDK `RequestError` unchanged (`acp-agent-run-backend-factory.ts:163-168`).
  - `AgentRunManager` (`agent-run-manager.ts:369-387`) passes `AgentCreationError`/`AgentRunActivationError` through but replaces any other error with `AgentCreationError("Failed to prepare agent run '<id>'.")`. Only the server log keeps the provider text.
  - The existing precedent for surfacing a start-time cause is the autobyteus factory, which throws `AgentCreationError` with a specific message (`autobyteus-agent-run-backend-factory.ts:179-216`).
- Origin: implementation. The in-session path (`errorMessage` in the session) preserves provider text, but the start and restore path does not.
- Review gap:
  - Yes, partially. In round 1 I traced only the in-turn JSON-RPC error path for BEH-011/AC-012 and assessed a process-exit variant (CAND-06).
  - AC-012 names "Run start **or** turn", and the manager's generic wrapping is visible in source. The start-time path should have been traced to the `createAgentRun` surface.
  - The specific Grok behavior (auth error on `session/new`) was not in the design evidence, so the defect was detectable only as a general gap in start-time error surfacing.
- CAND-06 is reclassified. Its exit premise is `Not Reachable` for missing auth (Grok stays up). The start-time `RequestError` path is `Promote`d as CR-004.
- Proportionate response:
  - In the shared ACP factory, turn a provider `RequestError` from `initialize`, `session/new` or `session/load` into an `AgentCreationError`. Its message should carry the provider message plus string `data`, using the same composition as the session's `errorMessage`, prefixed with the agent label.
  - Let the already-safe ACP errors (`ACP_AGENT_CAPABILITY_MISSING`, `ACP_MCP_SERVER_*`, `PLATFORM_AGENT_RUN_BINDING_INVALID`) surface the same way.
  - Keep the code runtime-neutral (no Grok names in `acp/`).
  - Add a unit test with a fake-agent fixture whose `session/new` returns `-32000`, asserting the surfaced message, and cover restore (`session/load` error) the same way.
- Coupling: the final fix may be shaped by the CR-005 design decision (Grok credential readiness). It is still an implementation-owned correction under the current design.

### F-4(b) — Grok credential authority `unsupported` blocks every Grok application launch → `CR-005` (Design Impact)

- Evidence:
  - `resolveAuthority` maps `GROK_BUILD` (added in this change) to `{kind:"unsupported"}`.
  - `getReadiness(unsupported)` returns `{configured:false, reason:"Credential readiness is unsupported for model runtime 'grok_build'."}`.
  - The validator pushes a blocking `RUNTIME_AUTHENTICATION_UNAVAILABLE` issue whenever `!credential.configured` (`application-launch-host-capability-validator.ts:162-168`).
  - Every `grok_build` application launch is therefore non-runnable. This contradicts AC-015's "valid launch starts a Grok-backed application run".
- Origin: design. The design's modified-file list prescribes "`GROK_BUILD` → `unsupported`, AGY precedent". The AGY precedent has the same effect for AGY (pre-existing and out of scope, REQ-014), so the precedent does not satisfy REQ-017 for Grok.
- Review gap: yes. In round 1 I accepted the mapping as the design's AGY precedent without tracing `unsupported` through `getReadiness` to the validator's blocking issue. This was detectable from source.
- Additional design input from F-1: Grok's version probe, `initialize` and catalog handshake all succeed while unauthenticated (the unauthenticated initialize even advertises a stale `grok-4.6` catalog). A readiness authority therefore cannot infer auth from those signals. The choice is a design decision, for example:
  - `no_credential` with start-time error surfacing (CR-004);
  - a real Grok auth probe;
  - or leave application runs unsupported and re-scope REQ-017.
- Scope note: the user de-scoped AC-015 **testing** for this ticket and asked that the application problem go to a separate ticket. REQ-017/AC-015 remain in the approved requirements. The Solution Designer must decide with the user whether CR-005 is fixed here or REQ-017 is re-scoped.

### F-2 — denial ends the Grok turn and is reported as interrupted → `CR-006` (Requirement Gap)

- Evidence:
  - Live runs 3/4: after `reject_once`, Grok returns `session/prompt` `stopReason:"cancelled"`.
  - The session maps any `cancelled` result to `TURN_INTERRUPTED` (`acp-agent-session.ts:127-129`), even though AutoByteus requested no cancel (state `prompting`, not `cancelling`).
  - The run stays usable.
- Origin:
  - The implementation matches the reviewed design: DS-002 "TURN_INTERRUPTED on `cancelled`", and DS-004 answers with reject-once only.
  - The provider behavior contradicts AC-004's expected "denied, agent continues". Within ACP the client cannot make Grok continue the same turn after a rejection.
  - What AutoByteus should do is a product decision, for example:
    - accept that the turn ends and amend AC-004;
    - present a provider-ended turn after a user denial as completed or denied rather than "interrupted" (the session can distinguish it: no client cancel was requested);
    - or send a follow-up message (new behavior).
- Review gap: no. The design and probe evidence contained no deny trace, and the code faithfully implements the approved mapping.

### F-3 — Grok auto-allows some commands without asking → `CR-007` (Requirement Gap / Unclear)

- Evidence (`approval-bisect-results.txt`):
  - With `yoloMode:false` (also with `autoMode:false` and with `--permission-mode default`), Grok 1.0.41 ran `echo`/`touch` without `session/request_permission`. Its events show `permission_requested → allow` in 4–6 ms.
  - It still asks for `rm -rf` and `web_fetch`, and AutoByteus bridges those correctly.
  - The design-time probe (same binary, same day) did receive a request for `echo`.
  - Local Grok docs (`~/.grok/docs/user-guide/22-permissions-and-safety.md`, read-only) describe built-in auto-approval of read-only tools and read-only shell commands, remembered per-project grants, and `ask` rules as the only way to force a prompt. They do not explain `touch`.
  - The user's `~/.grok/config.toml` has no permission rules (`yolo = false`).
- Origin: provider policy, not AutoByteus arguments. The implementation sends `yoloMode:false` and answers every request it receives.
  - REQ-005's text ("each Grok permission request becomes an AutoByteus tool-approval request") is met.
  - Its rationale ("AutoByteus stays approval authority") is not fully met.
  - Forcing prompts would need Grok `ask` rules or a permission mode. That conflicts with DEC-007 (no Grok permission-rule setting in this ticket) and REQ-016 (user Grok config untouched), and the exact cause is unclear.
- This needs an upstream decision with the user. No implementation mechanism should be prescribed from this review.
- Review gap: no. Provider behavior at run time was not detectable in source.

### Affected round-1 content (superseded)

- BEH-011 row: `Contradicted` at run start (CR-004); in-turn path still `Confirmed`.
- BEH-013 row: `Contradicted` (CR-005).
- BEH-004 row: `Confirmed` for approve/allow-once and request bridging. The deny outcome and auto-allow are open upstream (CR-006, CR-007).
- CAND-06: superseded. Exit premise `Not Reachable` for auth; start-time path promoted (CR-004).
- Score rationale:
  - `Runtime Correctness And Behavioral Fidelity` drops to 7.5: start-time provider text lost; application launch blocked by the Grok authority mapping.
  - `API/E2E Readiness` 8.5: the live run surfaced two review-detectable defects.
  - The round-1 overall of 9.35 no longer applies; the full scorecard is not recomputed for a failure-origin round.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. The diff (111 files, +4370/−70) is a new protocol dependency, a new shared ACP subsystem, per-run bidirectional JSON-RPC child processes, a permission bridge and a persisted provider-id binding. This matches the design classification.

## Review Scope

- Changed implementation and behavior reviewed: `git diff e06080b00..2b31b046d`, covering all of the following.
  - All new server source in `runtime-management/acp`, `runtime-management/grok`, `agent-execution/backends/acp/**`, `agent-execution/backends/grok` and `llm-management/services/grok-build-model-catalog.ts`.
  - Every seam modification: enum/predicate, availability, provider factory builder and both execution scopes, manager, restore context, run-context union, resume reference, catalog/selection/app-launch diagnostics, credential authority, token-usage unions, MCP result-source union and the V1 migration exhaustive switch.
  - The two contract enums and their regenerated `dist/`.
  - The web label/help/source-key/token-usage maps.
  - The `autobyteus-ts` Grok row and its tests/docs.
  - The new tests and fixtures, reviewed proportionately.
- Files / areas reviewed: the ones above. I also read the consumers they depend on:
  - `AgentRun` error-evidence handling (`agent-run-error-evidence.ts`, `agent-run.ts`);
  - the Claude and AGY turn-terminal precedents;
  - `createTokenUsageUpdatedPayload` and the enrichment transformer;
  - the file-change processor and tool semantics;
  - MCP session deactivation in `AgentRunManager.cleanupFailedPreparation`;
  - run-history projection providers;
  - SDK 1.5.0 connection close behavior.
- Independent verification run by the reviewer:
  - `tsc -p tsconfig.build.json --noEmit` is clean.
  - 13 server suites (ACP/Grok, manager, selection, app-launch validator) pass, 87/87.
  - `autobyteus-ts` `supported-model-definitions` + `grok-llm` unit pass, 18/18.
  - The web `grokBuildRuntimePresentation.spec.ts` passes, 3/3.
  - A temporary probe confirmed that SDK-pending `initialize` and `prompt` reject within ~230–330 ms when the agent process exits. This rules out a hang on startup crash. The probe file was removed; the worktree is unchanged.
- Explicit exclusions:
  - Paid live flows (team, approval, interrupt latency, restore follow-up, application launch, provider auth/rate-limit text). These belong to API/E2E.
  - Docs sync (step 9, delivery-owned).
  - Pre-existing full-suite failures that the handoff shows are identical on base.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes (REQ-001..REQ-018, AC-001..AC-016, DEC-000..DEC-009, SR-008 clarifications).
- Design-spec behavior map verified against the implementation: Yes (DS-001..DS-009; see the table).
- Design review report and round confirmed: ARCH-REV-002, round 2, Pass. AR-005 (stale per-turn wording) is non-blocking and owned by the Solution Designer.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: none. The implementation-level deviations from design wording are assessed in "Implementation Decisions Review" below; none changes approved behavior.
- Remaining material ambiguity, if any: none blocking.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `runtime-availability-service.ts` → `probeGrokBuildCli` (`--version` ≥ 1.0.41, `agent --help` flags, 3 s bounded, 64 KiB cap, classified diagnostics only) | — |
| BEH-002 | Confirmed | `ModelCatalogService` → `GrokBuildModelCatalog` → `discoverGrokBuildModels` → `runAcpDiscoveryHandshake` (initialize only, tmp cwd, always stopped) → `normalizeGrokBuildModels` (`_meta.modelState`, `reasoning_effort` enum/default, context tokens) | — |
| BEH-003 | Confirmed | `AcpAgentSession.onSessionUpdate` (in-turn only) → `AcpSessionUpdateConverter` (segment close-before rule, tool lifecycle, non-chat updates dropped); ext traffic → `grokBuildSessionProfile.interpretExtNotification` (usage + MCP status only) | — |
| BEH-004 | Confirmed | `onPermissionRequest` → same `projectToolCall` as cards (`_meta["x.ai/tool"].name`) → `AcpPermissionBridge.pend` → `approve()` → `allow_once`/`reject_once`, `cancelled` on cancel/close/turn end; auto-execute → `yoloMode` + one-shot auto answer (covers restore where yolo does not persist) | — |
| BEH-005 | Confirmed | Factory: `composeSharedCarpenterPrompt` → `_meta.rules`; `activateForRun` → HTTP `mcpServers` entry; `awaitMcpServerReady` (15 s; `unavailable`/timeout → activation error naming the server, no provider detail); `use_tool` → `normalizeAgentToolsMcpToolNameForEvent`; instruction capture on create | — |
| BEH-006 | Confirmed | `buildAgentRunRestoreRuntimeContext` → `AcpAgentRunContext(platformAgentRunId)`; `restoreBackend` rejects missing/`=runId` binding, requires `loadSession`, `openLoad` registers first and drops `session/update` + usage while `opening_load`, re-gates MCP; history from `LocalMemoryRunViewProjectionProvider` (no Grok-specific projection provider) | — |
| BEH-007 | Confirmed | `buildGrokBuildCallUsagePayload` (`per_call`, `base_excludes_cache`, `grok_build:<sessionId>:<turnId>:<ordinal>`, `model_provider:"GROK"`, session model, raw usage kept); applied only in `prompting`/`cancelling`; enriched/priced by the shared transformer like AGY | — |
| BEH-008 | Confirmed | `getGrokWorkspaceSkillMaterializer` (`.grok/skills`), materialized in `prepare`, released on MCP-activation failure, launch failure, terminate and session failure | — |
| BEH-009 | Confirmed | `buildAcpPromptBlocks` → `appendContextFileReferenceSection`; one text block, no image blocks | — |
| BEH-010 | Confirmed | `supported-model-definitions.ts` `grok-4.7` row, version-neutral schema text, retired IDs rejected by tests | — |
| BEH-011 | Confirmed | Child env = server env + three switches; no vault key; credential authority `unsupported`; prompt JSON-RPC error → turn-terminal `ERROR` carrying the provider message (`RequestError.data`) | Process-exit auth path unevidenced (CAND-06; API/E2E residual) |
| BEH-012 | Confirmed | `AcpAgentRunBackend.interrupt` → `session.cancel` (bridge `cancelAll`, `session/cancel`) → prompt result `cancelled` → `TURN_INTERRUPTED`, state `ready` | — |
| BEH-013 | Confirmed | `grokBackendFactory` wired in `general-process-run-supervisor.ts` and `application-execution-scope-kernel-builder.ts`; validator + selection-service Grok diagnostics | — |
| (REQ-018) | Confirmed | `acp/` imports no Grok code and contains no `grok|xai|x.ai` (enforced by `acp-layer-neutrality.test.ts`); capabilities read standard fields only; required capabilities derived from product needs | — |
| (REQ-014) | Confirmed | Seams add one branch each; `McpEffectiveResultSource.provider` is a type-only union addition; no AGY/Claude/Codex behavior touched | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

The review relies on the approved scenarios SCN-001..SCN-011 (requirements doc), all `Supported Normal Scenario`, plus the ACP/JSON-RPC protocol contract and the AgentRun event contract.

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001/010 | BEH-001, BEH-011 | User/Operational | Operator | Choose Grok Build; clear availability | Runtime picker / server start | Normal | availability provider → probe | Row enabled or disabled with safe reason | Requirements; dev GraphQL evidence | Supported Normal Scenario | Use |
| SCN-002 | BEH-002 | User | Operator | Pick model/effort | Model selector, launch preflight | Normal | DS-007 | Agent-reported models + effort schema | Handshake fixture | Supported Normal Scenario | Use |
| SCN-003 | BEH-003/009/012 | User | Operator | Converse, attach files, interrupt | Run chat input | Normal | DS-002/003/005/008 | Normalized stream, interrupt → idle | prompt/cancel fixtures | Supported Normal Scenario | Use |
| SCN-004 | BEH-004 | User | Operator | Gate tools | `autoExecuteTools=false` launch | Normal | DS-004 | Approve → allow-once; deny → reject-once | permission fixture | Supported Normal Scenario | Use |
| SCN-005 | BEH-005 | User/System | Coordinator + Grok member | Team/org collaboration | Team/org run | Normal | DS-001/003 | Canonical tool names; readiness gate | mcp/mcp2 fixtures | Supported Normal Scenario | Use |
| SCN-006 | BEH-006 | User | Operator | Reopen stopped run | Run history | Normal | DS-006 | Exact `session/load`, replay dropped | load fixture, load probes | Supported Normal Scenario | Use |
| SCN-007 | BEH-007 | System | Token-usage pipeline | Account usage | `response_completed` | Normal | DS-002/003 | One record per call | prompt/mcp2 fixtures | Supported Normal Scenario | Use |
| SCN-008 | BEH-008 | System | Skill materialization | Skills available | Run bootstrap | Normal | DS-001 | `.grok/skills` links, released | registration test | Supported Normal Scenario | Use |
| SCN-009 | BEH-010 | User | Operator | Latest Grok in native runtime | `autobyteus` model picker | Normal | DS-009 | `grok-4.7` only | autobyteus-ts tests | Supported Normal Scenario | Use |
| SCN-011 | BEH-013 | User | App operator | Application run on Grok | App launch config | Normal | DS-001/007 | Preflight via catalog | validator tests | Supported Normal Scenario | Use |
| CON-ACP | QR-006, DS-008 | Contract | ACP agent process | Process exit / transport close during a run | Child `close`/stream end | Explicit Edge | connection `markClosed` → `session.fail` → interrupted turn + runtime `ERROR` → backend inactive, process stopped, skills released | Explicit error, no hang | QR-006; reviewer probe (pending requests reject ≤ 330 ms) | Supported Explicit Edge Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CAND-01 | The converter keeps the first projection of a tool card until its lifecycle starts, so the approval request could carry stale arguments | SCN-004 | Grok `session/request_permission` | `tool_call` → permission → `TOOL_APPROVAL_REQUESTED` uses first projection | Every recorded Grok `tool_call` carries the complete `rawInput` on its first frame (prompt, permission, mcp2 fixtures); `toolInput` strips `variant`; AC-004 test asserts identical card/approval args | Reject | No reachable divergence with Grok; nothing to fix |
| CAND-02 | The idle timer stays suspended while any tool call is non-terminal | SCN-003/004 | Long shell command or approval deliberation | DS-008 | Design DS-008 + review P-04 mandate exactly this; no evidence that Grok leaves a tool call open indefinitely | Reject | Design-mandated behavior |
| CAND-03 | `cancelling` has no dedicated timeout if the agent never answers `session/cancel` | SCN-003 | Interrupt | DS-005 | cancel fixture: Grok returns `stopReason: cancelled`; no evidence of a non-answering agent | Reject | Unevidenced premise; no machinery required |
| CAND-04 | A second permission request for an already denied `toolCallId` would not surface to the UI | SCN-004 | — | — | No recorded or documented Grok behavior re-asks for a rejected call id | Reject | Technically Possible but Unsupported/Contrived |
| CAND-05 | Connection-level frame buffering, including permission buffering and a 2 000-frame drop-oldest bound | Design AR-004 / DS-003 | Frames arriving before `session/new` returns | connection → `registerSession` flush | Design requires buffering; real traffic sends `_x.ai/session/setup` before the `session/new` response (connection test over the handshake fixture); the bound is ordinary memory hygiene | Reject (as finding) | Approved, proportionate mechanism |
| CAND-06 | Provider auth failure delivered only by Grok exiting would lose the provider text (the stderr tail is never read) | SCN-010 / AC-012 | `grok` not logged in | spawn → initialize/prompt → exit | Evidence covers only the in-session error path (JSON-RPC error → `errorMessage` includes `RequestError.data`; 429s are retried by Grok); no evidence that Grok reports auth by exiting | Reject (as finding) | Unevidenced failure mode. AC-012's approved verification is manual/live, so it is carried as an API/E2E residual risk |
| CAND-07 | Unused members in new code: `AcpPermissionBridge.has()`, `AcpAgentProcess.stderrTail()` | Engineering contract: cleanup completeness | — | — | `grep` shows no production or test consumer of either | Promote | CR-001 (Low, non-blocking) |
| CAND-08 | The design text no longer matches implemented decisions: launch-profile interface (`minimumVersion`, `requiredCapabilities`), `awaitMcpReady(watch)`, DS-002 "ERROR + TURN_COMPLETED", AcpPromptBuilder "image blocks when capability" | Design-spec authority | — | — | Handoff decisions 1, 2, 3, 6 vs design-spec lines 138, 236, 160 | Promote | CR-002 (Low, non-blocking, design-artifact sync by Solution Designer; the code is correct) |
| CAND-09 | `initialize` sends literal `protocolVersion: 1`, while `AcpAgentCapabilities.missing` compares against the SDK `PROTOCOL_VERSION` | Engineering contract: single source of truth | — | — | `acp-client-connection.ts:131`, `acp-agent-capabilities.ts:49`; SDK constant is `1` today | Promote | CR-003 (Low, non-blocking; no behavior difference today) |
| CAND-10 | A probe timeout is classified `GROK_CLI_UNSUPPORTED` | SCN-010 | Slow `grok --version` | availability | Measured probe 26 ms; no evidence of > 3 s hosts | Reject | Unevidenced |
| CAND-11 | Tool subprocesses could be orphaned if Grok is SIGKILLed on terminate | Terminate | Stop run | `process.stop` | No evidence; AGY precedent identical; stdin close + SIGTERM first | Reject | Unevidenced |
| CAND-12 | The factory does not re-verify the model the way AGY's `assertAvailable` does | SCN-002/011 | Launch | preflight → create | Launch/app preflight already validate via `RunModelSelectionService` → Grok catalog (which includes the version gate) | Reject | Covered upstream |
| CAND-13 | Three new files exceed a 220-line delta (session 287, converter 271, connection 251 added lines) | Size contract | — | — | Each is one design-named owner (DS-008 state machine, DS-003 converter, connection); ≤ 257 effective lines; no mixed concerns | Reject (as finding) | Coherent single owners; recorded in the size audit |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Feature, `No Design Issue Found`; seams absorb one branch each; deferrals (0)–(3) unchanged | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | No behavior-defining supplements; wire fixtures used as evidence only | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001 `createBackend→prepare→launch(spawn→initialize→require→openNew→MCP gate)→backend`; DS-002/003/005/006/007/008 map 1:1 to code | — |
| Ownership boundary preservation and clarity | Pass | Only the connection touches the SDK and only the process touches the child; the backend is the sole public boundary; the session owns ordinals, replay suppression and the idle timer; profiles are pure | — |
| Off-spine concern clarity | Pass | Readiness, tool projection, usage, skills, instruction capture and diagnostics each serve one named owner | — |
| Existing capability/subsystem reuse check | Pass | Reuses Carpenter composer, MCP session authority, tool-name normalizer, MCP result projector, workspace skill materializer, instruction capture, shared usage enrichment/pricing, context-file section | — |
| Reusable owned structures check | Pass | `AcpToolCallSnapshot`, `AcpToolCallProjection` and `AcpExtEffect` sit in the session-profile contract; the launch contract is shared | — |
| Shared-structure/data-model tightness check | Pass | `AcpExtEffect` closed union; `AcpAgentRunContext {sessionId, workingDirectory}`; launch contract reduced. `AcpAgentCapabilities` also normalizes `imagePrompt`, `authMethodIds` and `agentInfo`, which are design-listed but unconsumed (see score 5) | — |
| Repeated coordination ownership check | Pass | Permission answering, MCP waiting and turn terminals each have a single owner | — |
| Empty indirection check | Pass | `createGrokBuildAgentRunBackendFactory` is the design's thin binding facade; `GrokBuildModelCatalog` is a thin catalog boundary matching peer catalogs | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | See the size audit | — |
| Ownership-driven dependency check | Pass | `backends/grok → backends/acp → runtime-management/acp → SDK`; `runtime-management/grok → runtime-management/acp`; no reverse or cross-runtime import (neutrality test) | — |
| Authoritative Boundary Rule check | Pass | Manager depends only on the factory/backend; wiring never spawns processes; no caller reaches the session or connection | — |
| File placement check | Pass | Matches the design mapping exactly | — |
| Flat-vs-over-split layout judgment | Pass | `backends/acp/{backend,session,events,input}` mirrors peers; `backends/grok` is flat with 6 small files | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `approveToolInvocation(invocationId=toolCallId)`, `interrupt(turnId)`, `restoreBackend(context)` with explicit identity; unknown ids are rejected | — |
| Naming quality and naming-to-responsibility alignment | Pass | `Acp*` for shared and `GrokBuild*` for profile; names match the design subjects | — |
| No unjustified duplication of code / repeated structures | Pass | Small `isRecord` helpers repeated per file follow existing local style; no duplicated policy | — |
| Patch-on-patch complexity control | Pass | Initial implementation; no layered fixes | — |
| Dead/obsolete code cleanup completeness in changed scope | Pass (non-blocking note) | `grok-4.6` removed without alias; two unused accessors in new code (CR-001) | Optional removal (CR-001) |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Tests cite AC IDs and assert canonical names, one-shot answers, per-call sums (34019/146; 70034/53504/345/209), replay suppression, interrupt reuse, exit → interrupted + runtime error, idle-timer suspension | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Sanitized wire fixtures plus a single fake-agent replayer and harness shared across connection/session/factory suites | — |
| No stale, duplicated, or compatibility-only tests are retained | Pass | `grok-4.6` pins updated; retired-id rejection tests are intended | — |
| API/E2E readiness for the next workflow stage | Pass | Fake agent/CLI harness reusable; gated live scenarios enumerated in the handoff | — |

## Implementation Decisions Review (Handoff "Implementation Decisions Within The Design")

| # | Decision | Verdict | Basis |
| --- | --- | --- | --- |
| 1 | `minimumVersion`/`requiredCapabilities` moved off the shared launch contract | Accept | Required capabilities are product needs (restore → `loadSession`, exposed tools → HTTP MCP), so a protocol-level `requiredFor` keeps every profile honest (AC-016). The version gate is Grok-specific and still runs on every availability, catalog and launch-preflight path (`discoverGrokBuildModels` → `assertGrokBuildCliSupported`). Design text sync: CR-002 |
| 2 | `mcpReadiness()` hook; waiting owned by the shared session | Accept | Matches the design's own "keep hooks pure; the session owns … when effects apply". Same behavior (15 s, unavailable/timeout errors) |
| 3 | Prompt JSON-RPC error → one turn-terminal `ERROR`, no extra `TURN_COMPLETED` | Accept | `resolveAgentRunErrorEvidence` + `AgentRun.observeTurnFailure` close the turn on a `turn`/`terminal` error. Claude (`handleTurnSettled` → `buildClaudeTurnTerminalErrorEvent`, return) and AGY do the same. The design text differs (CR-002) |
| 4 | Shell → `run_bash` segment; `write`/`search_replace` → `write_file`/`edit_file` `tool_call` cards | Accept | Design examples; `normalizeFileMutationTool` + `extractMutationTargetPath(file_path)` derive artifacts on the tool lifecycle path (Claude Write/Edit precedent) |
| 5 | No image prompt blocks | Accept | REQ-009/AC-007 require the reference block and no image blocks for Grok (`image:false`). Building an unused capability branch would be speculative. Design text sync: CR-002 |
| 6 | Always `--no-leader` | Accept | Leader mode out of scope; enforces the design's process-per-run; the capability gate checks the flag exists |
| 7 | Drop responses to ids the client never sent | Accept | Real Grok traffic contains them (`skills-reload` in `prompt.log.jsonl`/`load.log.jsonl`); the SDK numbers its own ids, so only non-numeric response ids are dropped |
| 8 | `grok_build` added to team-stream and collaboration-stream enums with regenerated `dist/` | Accept | Required for team/org DTO validation (UC-001/UC-004); additive; AGY precedent `97f881366`; `dist` diff is enum-only |

## Source File Size And Structure Audit

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `backends/acp/session/acp-agent-session.ts` | 257 | Pass | Triggered (+287) — assessed | Pass: DS-008 state machine, replay suppression, MCP waiters, permission entry and idle timer are all session-owned per the ownership map | Pass | Coherent single owner | None |
| `backends/acp/events/acp-session-update-converter.ts` | 240 | Pass | Triggered (+271) — assessed | Pass: one converter (segments, tool lifecycle, terminals) | Pass | Coherent single owner | None |
| `runtime-management/acp/acp-client-connection.ts` | 219 | Pass | Triggered (+251) — assessed | Pass: SDK connection, routing and buffering only | Pass | Coherent single owner | None |
| `backends/acp/backend/acp-agent-run-backend-factory.ts` | 187 | Pass | Pass | Pass | Pass | OK | None |
| `backends/acp/backend/acp-agent-run-backend.ts` | 120 | Pass | Pass | Pass | Pass | OK | None |
| `backends/grok/grok-build-tool-projection.ts` | 98 | Pass | Pass | Pass | Pass | OK | None |
| `runtime-management/grok/grok-build-capability.ts` | 98 | Pass | Pass | Pass | Pass | OK | None |
| `runtime-management/grok/grok-build-launch-profile.ts` | 81 | Pass | Pass | Pass | Pass | OK | None |
| Remaining new files (process, capabilities, handshake, contracts, bridge, prompt builder, usage, readiness, session profile, skills, facade, catalog) | ≤ 71 each | Pass | Pass | Pass | Pass | OK | None |
| `services/agent-run-manager.ts` (modified) | 486 | Pass | Pass (+5) | Pass | Pass | OK (near limit; pre-existing size) | None |
| `llm-management/services/model-catalog-service.ts` (modified) | 460 | Pass | Pass (+7/−3) | Pass | Pass | OK | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No `grok-4.6` alias; no headless fallback; no re-injection on load |
| No legacy old-behavior retention in changed scope | Pass | Retired-ID rejection tests assert removal |
| Dead/obsolete code cleanup completeness in changed scope | Pass | CR-001 is a non-blocking unused-accessor note |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Directly Usable — No Migration`; V1 migration switch throws for `GROK_BUILD` like AGY (no V1 record can hold it) |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | No migration required |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| `AcpPermissionBridge.has()` (`backends/acp/session/acp-permission-bridge.ts:23`) | `UnusedHelper` | No caller in src or tests | New dead API surface | Remove when next touched (CR-001, non-blocking) |
| `AcpAgentProcess.stderrTail()` (`runtime-management/acp/acp-agent-process.ts:55`) | `UnusedHelper` | No caller | The stderr pipe must be drained, but the accessor is never read. Either remove the accessor or use the tail in a server-side (non-user-facing) log on unexpected exit, as the design's "diagnostics only" intent suggests | Choose one when next touched (CR-001, non-blocking) |

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: a new runtime module plus a shared ACP layer, and the `grok-4.7` catalog row.
- Files or areas likely affected (delivery-owned, design step 9):
  - `autobyteus-server-ts/docs/modules/grok_build_runtime.md` (new);
  - `llm_management.md` (the curated list still names `grok-4.6` at line 324);
  - the `prompt_engineering.md` runtime table;
  - the `agent_execution.md` runtime list.
- Design-spec text sync (CR-002, AR-005) belongs to the Solution Designer.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| P-01 (`workflow` child agents) | Confirmed | Step-5 tool set lists 24 tools with no `task`/`workflow`/`ask_user_question` (`step5-tool-set-result.txt`); launch profile env verified by unit test |
| P-02 (aggregate tier) | Confirmed | Per-call records verified by fixture sums |
| P-03 (MCP status before `session/new` response) | Confirmed | Buffering is the design-mandated mechanism; implementation probes show ready ~120 ms after `session/new` and before the `session/load` response (consumed while `opening_load`) |
| P-04 (idle timer during approval) | Confirmed | Status-less `tool_call` counts as pending; unit test verified |
| P-05 (cancelled-turn usage) | Confirmed | Usage is applied while `cancelling`; the cancel fixture has no completed call before cancel, so 0 records |

No new or reclassified premises.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.35
- Overall score (`/100`): 93.5
- Score calculation note: simple average for trend visibility only; the decision follows the findings and checks.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | DS-001..DS-008 map directly onto factory → process → connection → session → backend; event ordering preserved through one publish queue | Nothing material | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | Single owners for SDK, child, session state, permissions, turn terminals; manager keeps MCP deactivation; neutral layer is enforced by test | Nothing material | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.4 | Launch/session profile contracts are small and pure; explicit identities (`toolCallId`, `turnId`, `sessionId`) | Hard-coded `protocolVersion: 1` next to the SDK constant (CR-003) | Use `PROTOCOL_VERSION` in `initialize` |
| `4` | `Separation of Concerns and File Placement` | 9.3 | Paths match the design mapping; Grok specifics isolated in two profile folders | Three owner files above a 220-line delta (coherent, assessed) | Keep new concerns out of the session file as the layer grows |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.2 | Closed effect union; tight run context; launch contract reduced to what shared code uses | `AcpAgentCapabilities` normalizes `imagePrompt`/`authMethodIds`/`agentInfo` that nothing consumes (design-listed) | Drop unconsumed fields when the design is synced, or leave them until a profile needs them |
| `6` | `Naming Quality and Local Readability` | 9.4 | Clear `Acp*`/`GrokBuild*` naming; comments state intent concisely | Dense one-line expressions in a few places (e.g. the `AcpDiscoveryError` message) | Minor readability polish only |
| `7` | `API/E2E Readiness` | 9.3 | Reusable fake-agent replayer and fixtures; gated live scenarios enumerated; reviewer-verified suites and typecheck green | Live team/approval/interrupt/restore/app/auth flows are still unexercised | API/E2E to run the gated live set (mind credits) |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.2 | Every AC-mapped path traced. Replay suppression, one-shot answers, cancel semantics, per-call usage, failure → interrupted + runtime error and restore binding are all verified. Pending requests reject promptly on exit (reviewer probe) | Two paths are not evidenced by the fixtures: the provider-auth text when Grok exits (CAND-06) and `session/load` with a non-empty MCP descriptor under a prompt | Cover both in API/E2E (AC-012, AC-006 with Agent Tools) |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.8 | Clean `grok-4.6` removal; no fallbacks or aliases | — | — |
| `10` | `Cleanup Completeness` | 9.0 | Obsolete pins/rows removed; tracked `dist` regenerated consistently | Two unused accessors in new code (CR-001) | Remove or use them when next touched |

## Findings

- `CR-001` (Low, non-blocking; Engineering contract: cleanup completeness; CAND-07).
  - `AcpPermissionBridge.has()` and `AcpAgentProcess.stderrTail()` have no consumer.
  - Proportionate response: remove `has()`. For `stderrTail()`, either remove the accessor or use it in a server-side, non-user-facing log line on unexpected exit, which is what the design's "diagnostics only" wording implies.
  - Not required before API/E2E.
- `CR-002` (Low, non-blocking; owner Solution Designer; design-artifact sync; CAND-08).
  - `design-spec.md` still describes:
    - the launch-profile interface with `minimumVersion`/`requiredCapabilities`;
    - `awaitMcpReady(watch)`;
    - DS-002 "ERROR + TURN_COMPLETED on JSON-RPC error";
    - "image blocks only when capability says so".
  - The reviewed implementation (decisions 1, 2, 3, 5) is correct and precedent-backed. The design text should be synced with AR-005. No code change.
- `CR-003` (Low, non-blocking; Engineering contract: single source of truth; CAND-09).
  - `AcpClientConnection.initialize` sends literal `protocolVersion: 1`, while the capability check compares against the SDK `PROTOCOL_VERSION`.
  - Use the constant in both places. No behavior difference today (SDK 1.5.0 constant = 1).

Round 2 (failure-origin) findings:

- `CR-004` (High, blocking; implementation defect; AC-012/REQ-015/BEH-011; review gap acknowledged).
  - Provider auth/start errors from `session/new` or `session/load` (e.g. `-32000 Authentication required: no auth method id provided`) reach `createAgentRun` only as the generic `AgentCreationError: Failed to prepare agent run '<id>'.`
  - Fix: in the shared ACP factory, surface them as `AgentCreationError` carrying the provider message and data, runtime-neutral, with unit coverage for create and restore. See "F-1" above.
- `CR-005` (High, blocking; Design Impact; REQ-017/AC-015; review gap acknowledged).
  - The `GROK_BUILD → unsupported` credential authority makes every Grok application launch fail preflight with `RUNTIME_AUTHENTICATION_UNAVAILABLE`.
  - The design must choose a readiness authority, or re-scope REQ-017 with the user. Note that Grok `initialize`/catalog succeed while unauthenticated.
- `CR-006` (Requirement Gap; AC-004).
  - Grok ends the turn with `stopReason:"cancelled"` after `reject_once`, and AutoByteus reports `TURN_INTERRUPTED`.
  - AC-004's "agent continues" is not achievable as written. A product decision is needed on the accepted outcome and its presentation.
- `CR-007` (Requirement Gap / Unclear; REQ-005 rationale vs DEC-007/REQ-016).
  - Grok 1.0.41 auto-allows some commands (`echo`, `touch`) without `session/request_permission` even with `yoloMode:false`.
  - Forcing prompts would require Grok `ask` rules or a permission mode, which the current decisions exclude. A decision is needed with the user.

CR-001..CR-003 remain Low and non-blocking.

Round 3 (latest) status:
- CR-001: Resolved (IR-002).
- CR-002: Resolved (SR-009/SR-011).
- CR-003: Resolved (IR-002).
- CR-004: Resolved (IR-002, verified).
- CR-005: Deferred by the user (SR-009); accepted out of scope, with the known gap recorded in AC-015 and BEH-013.
- CR-006: Resolved (AC-004 amended in SR-011; IR-002 verified).
- CR-007: Resolved by the requirements clarification (SR-010); no code change needed.

No open findings.

## Classification

- Round 2 (latest): the failure has more than one origin.
  - `Design Impact` (CR-005) and `Requirement Gap` (CR-006, CR-007/Unclear) need upstream revision and user decisions.
  - `Local Fix` (CR-004) is confirmed and implementation-owned.
  - Because the upstream decisions (especially CR-005's readiness authority) can reshape CR-004's fix and the approved ACs, the package routes to the Solution Designer first. The Solution Designer should include CR-004 in the revised implementation package.
- Round 1: not applicable (Pass).

- Round 3 (latest): not applicable. The review passes and no findings are open.

## Recommended Recipient

- Round 3 (latest): `/api_e2e_engineer` (primary pass); `/implementation_engineer` (informational).
- Round 2: `/solution_designer` (Design Impact / Requirement Gap). CR-004 is carried as a confirmed implementation Local Fix for the revised package.
- After the revision: implementation, then code review, then API/E2E again.

## Residual Risks

- Paid live flows remain unexercised:
  - team/org `send_message_to`/`get_handoff_rules` through `search_tool`/`use_tool` (AC-005);
  - interactive approve/deny (AC-004);
  - interrupt ≤ 2 s (AC-008, QR-003);
  - restore follow-up with Agent Tools MCP attached (AC-006);
  - application launch (AC-015).
- AC-012: provider auth/rate-limit text is verified only for the in-session JSON-RPC error path. If Grok reports an unauthenticated state by exiting, the run shows the generic `ACP_AGENT_PROCESS_EXITED` message (CAND-06); API/E2E should observe the real behavior.
- AC-013 "web_search remains usable": `web_search` is provider-side, not a function tool, per the step-5 evidence. The env switches do not touch it, but live use is not demonstrated.
- `_x.ai` extension drift on Grok CLI auto-update is mitigated by the minimum-version gate and ignore-unknown handling.
- Model discovery spawns `grok` (version probe + help + handshake, ~0.6–1 s) per catalog/preflight request by design (no cache).

## Latest Authoritative Result

- Review Decision: `Pass` (round 3, CRR-003; implementation re-review of IR-002 `d7d4aa2ad`)
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.41/10 (94.1/100); every category ≥ 9.0
- Failure Origin: N/A
- Recommended Recipient: `/api_e2e_engineer` (primary, per handoff rules); `/implementation_engineer` (informational)
- Notes:
  - task_size `Large` and architectural_risk `High` are preserved.
  - API/E2E should re-run live: the amended AC-004 deny → `TURN_COMPLETED`, and AC-012 unauthenticated `createAgentRun` showing "Grok Build: Authentication required: no auth method id provided".
  - AC-015 is deferred by the user.
  - AR-006 (wording) is open with the Solution Designer.

### Previous result (round 2, superseded)

- Review Decision: `Fail`. This was the API/E2E failure-origin result and superseded the round-1 Pass.
- Review Entry Point: `API/E2E Failure-Origin Review` (round 2, CRR-002)
- Supported Product Scenario Gate: `Pass`. All four failing scenarios are supported normal scenarios; AC-015 testing was de-scoped by the user, but REQ-017 stands.
- Material-Premise Gate: `Pass`. CAND-06's exit premise is reclassified `Not Reachable` for missing auth, and the start-time path is promoted as CR-004.
- Score Summary: failure-origin round; the full scorecard is not recomputed. Affected rationale:
  - Runtime Correctness 7.5;
  - API/E2E Readiness 8.5.
- Failure Origin:
  - CR-004: implementation defect (review gap acknowledged);
  - CR-005: Design Impact (design-specified mapping; review gap acknowledged);
  - CR-006: Requirement Gap (provider deny semantics vs AC-004; not detectable in review);
  - CR-007: Requirement Gap / Unclear (provider auto-allow policy vs REQ-005 rationale, DEC-007 and REQ-016; not detectable in review).
- Recommended Recipient: `/solution_designer`
- Notes:
  - task_size `Large` and architectural_risk `High` are preserved.
  - F-4(a) (pre-existing QUARANTINED apps and 503 setup routes) is outside this change and is a separate-ticket candidate per the user.
  - CR-001..CR-003 remain non-blocking. CR-002 (design text sync) goes to the Solution Designer with AR-005.
