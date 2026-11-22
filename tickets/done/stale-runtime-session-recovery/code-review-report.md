# Code Review Report

## Latest Round: Implementation Review Round 2 (CRR-002)

- Review Entry Point: `Implementation Review`
- Current Code Review Revision ID: `CRR-002` (prior: CRR-001 `Fail`, CR-001, CR-002)
- Current Review Round: 2
- Trigger: IR-002, the rework for CRR-001, following SR-003 (REQ-006 extended to every composition, AC-008, DEC-007 (a)) and ARCH-REV-003 (`Pass`, N-5).
- Code reviewed: HEAD `edd1501ae8`. Round-2 delta `c419bb4b36..edd1501ae8`: `a2db91def8`, `f79773703d`, `132471ccd9`, `1df7771aac`, then records.
- Review Scope: `Full Re-Audit`.
  - Why: the delta changes a shared domain type (`RuntimeSwitch` loses `cause`), a provider error's shape (`CodexAppServerRpcError`), and two composition roots.
  - Every structural check was rerun against the changed files and the spines they complete (DS-001 and DS-002 in all three compositions). Results for code unchanged since CRR-001 (the recognitions, the lifecycle and handle branches, the binding consumers) are carried forward, with their evidence still valid.
- Checks not rerun (they ran on the round-2 code):
  - IMP-10: typecheck PASS at baseline.
  - IMP-11: `tests/unit` + `tests/architecture`, 8,043 passed.
  - IMP-12: focused tests and 10 negative controls. Each fails a test; NC-R2-02a/02b are covered together by NC-R2-02c.
  - IMP-13: built-server E2E LS-01..03 with the notice checks, plus a negative control without the notice: 2 failed.
  - IMP-14: sizes, every file ≤ 497.

### CR-002: resolved

Every composition now gives a renewal both parts, as DEC-007 (a) and REQ-006 require.

- **Application execution scope** (`application-execution-scope-kernel-builder.ts`):
  - `AgentRunPlatformNotices([new RuntimeHandoverNoticeService({ journals: getWorkJournalService(), readPending: readPendingRuntimeHandover })])`, constructed exactly as the studio does (`build-studio-server.ts:283-286`).
  - It is the scope's `AgentRunManager` `inputPreface` and the `lifecycleObserver` of both the run manager and the resource manager, as `general-process-run-supervisor.ts:163, 189-190` wires them.
  - The lifecycle's switch memory stays.
  - The scope's members use the same run manager, so they get the notice too.
- **Standalone application host** (`start-standalone-application-host.ts`):
  - the supervisor gets `runtimeSwitching: { memory: new RuntimeSwitchRecorder() }`, the studio's form;
  - `RuntimeHandoverNoticeService` comes first in its `AgentRunPlatformNotices`, the studio's order.
  - So its standalone lifecycle (delegated copies) renews, and its members get the notice.
- **The input comment** (`general-process-run-supervisor-input.ts`) states the corrected reason from N-5: the host serves no run-selection surface, so no switch is saved there. `canSwitchRuntime` is cited only for application-owned runs, in the kernel builder.
- **AC-008, one test per composition with its real wiring:**
  - studio standalone and member: the built-server E2E checks the notice on the first input and none on the next, with a negative control (IMP-13);
  - application scope: through the real kernel builder (`application-scope-session-renewal.test.ts`, two cases);
  - application host delegated copy and member: through the real general supervisor built with the host's wiring (`host-session-renewal-wiring.test.ts`). `standalone-application-host-lifecycle.test.ts` pins that the real host start passes exactly that wiring: the switch recorder, and the notice first and only once.
  - The negative controls fail on each removed wire, including the notice's order.
- **Docs:** `GLOSSARY.md` (renewal in all three compositions), `run_history.md` (the Compositions rule), `docs/design-cases.md` Case 27.

### CR-001: resolved

- `RuntimeSwitch.cause` and `RuntimeSwitchCause` are removed. The builders, the key prefixes (`runtime_switch:` / `session_renewal:`) and the marker text keep the triggers apart, so D-1's reason still holds (ARCH-REV-003).
- `CodexAppServerRpcError.rpcCode` is removed. `rpcMessage` (read by `isMissingCodexThread`) stays, as a constructor field.
- The glossary line now names the builders instead of `cause`.

### Deviations 6 and 7

- **6:** the host test builds the real supervisor with the host's wiring rather than the whole host start, and does not close it. `Pass — deviation recorded, reason holds.` The host start's wiring is pinned separately by the lifecycle test, so together they prove the real host path. The host serves no run API for a built-host E2E.
- **7:** `configuredRootFixture` accepts a real `agentRunManager`. A test fixture extension, so the member goes through a real Team root on the supervisor's run manager.

### Re-audit observations (CRR-002)

| Candidate | Observation | Disposition | Reason |
| --- | --- | --- | --- |
| CF-09 | The host's supervisor uses `new RuntimeSwitchRecorder()`, while its members and the application scope use `getDefaultRuntimeSwitchMemory()` | Reject | The same split the studio already has (`build-studio-server.ts:306` vs the planner's default). A run belongs to one lifecycle, so one recorder handles a given run. |
| CF-10 | Each scope lifecycle observer alone clears the notice cache (NC-R2-02a/02b pass alone) | Reject | Both are wired as the general supervisor wires them (the established pattern). NC-R2-02c shows the pair is needed. |

## Prior Round: Implementation Review Round 1 (CRR-001)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002, Approved; DEC-006)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (PRB-001…PRB-009, through the design and handoff)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-002)
- Supplemental Task Artifacts Reviewed As Context: `probes/README.md` (evidence), `follow-ups.md` (FU-001)
- Relevant Solution Revision IDs: SR-001, SR-002
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002 `Pass`; N-1…N-4)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001, ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Trigger: implementation ready for source review (Large / High)
- Code reviewed:
  - worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/stale-runtime-session-recovery-599`, branch `codex/stale-runtime-session-recovery-599`, base `origin/personal` `0da6bfbfc1`, HEAD `c419bb4b36`;
  - code commits `67eb9a07fd` … `2acd842c95`; `c419bb4b36` holds the ticket documents only.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Review Scope

- Changed implementation and behavior reviewed: the whole source diff (`src`, 28 files), the glossary, the module docs and `docs/design-cases.md`, the tests by name and their negative controls (IMP-03).
  - **Typed error and renewal builder:** `errors.ts`, `runtime-switch.ts`.
  - **Recognition:** Codex `codex-missing-thread.ts`, `codex-thread-manager.ts`, `codex-app-server-client.ts`; Antigravity `agy-agent-run-backend-factory.ts`, `agy-stream-process.ts`; ACP `acp-session-launcher.ts`, `acp-agent-session-profile.ts`, the Grok and DeepSeek profiles; Claude `claude-session-resume-check.ts`, `claude-session-process.ts`, `claude-session.ts`, `claude-agent-run-backend-factory.ts`, `claude-sdk-session-opening.ts`, `claude-sdk-streaming-session.ts`.
  - **Standalone (DS-001):** `standalone-agent-run-lifecycle-service.ts`; `application-execution-scope-kernel-builder.ts` (N-4).
  - **Members (DS-002):** `configured-agent-activation-planner.ts`, `configured-agent-session-renewal.ts`, `configured-agent-execution-handle.ts`, `collaboration-agent-platform-binding.ts`, `flat-team-agent-execution-handle.ts`, `team-agent-platform-binding-committer.ts`, `team-run-execution-tree-mutator.ts`, `agent-org-run.ts`, `agent-org-run-execution-tree-mutator.ts`.
- Existing code read to judge the change:
  - `agent-run-activation-operation.ts:69-83`: a failed `prepare()` releases first, then rethrows; a quarantined release becomes an `AggregateError`.
  - Every construction of `StandaloneAgentRunLifecycleService` and `GeneralProcessRunSupervisor`, and their switch ports: `build-studio-server.ts:283-306`, `start-standalone-application-host.ts:270-293`, `general-process-run-supervisor.ts:163, 189, 274-282`, `general-process-run-supervisor-input.ts:72-77`.
  - The application-scope kernel's `AgentRunManager` (`application-execution-scope-kernel-builder.ts:144-170`) and `RuntimeHandoverNoticeService` (`runtime-handover-notices/services/runtime-handover-notice-service.ts`).
  - `DESIGN.md` rule 11.
- Explicit exclusions:
  - API/E2E-owned runs: the live AC-007, live Codex, Grok and DeepSeek renewals.
  - Recorded checks were not rerun (no code changed after `2acd842c95`).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood:
  - only the runtime's own exact "this session does not exist" signal for exactly the saved session starts a renewal (REQ-002);
  - the run continues in a fresh session of the same runtime and model (REQ-001);
  - the new session gets the hand-over notice with its first input, and the records are kept as a closed segment (REQ-003);
  - the REQ-004 line; idempotent by key (REQ-005); every run kind on every external runtime (REQ-006); one warning (REQ-007).
- Design-spec behavior map verified against the implementation: yes for the studio. Not for the application paths: see CR-002.
- Design review report and round confirmed: ARCH-REV-002 `Pass`.
  - N-1: the Grok probe kept the matcher (PRB-009, IMP-07).
  - N-2: delegated copies take DS-001.
  - N-3: accepted.
  - N-4: application-scope runs are named on DS-001. The implementation added the switch port there (deviation 1), but not the hand-over notice: CR-002.
- Behavior-basis status: `Contradicted` for REQ-003 / REQ-006 on the application execution scope and the standalone application host (CR-002); `Confirmed` elsewhere.

| Behavior | Status | Implementation path and evidence |
| --- | --- | --- |
| BEH-001 (Claude) | Confirmed | On restore, `ClaudeAgentRunBackendFactory` awaits `verifyResumable()`. `ensureInitialized` awaits the SDK's single observed `initializationResult()`. The exact text `Claude Code returned an error result: No conversation found with session ID: <id>` for the same ID becomes the typed error; anything else is rethrown. New sessions stay lazy. The pre-turn error result fails no turn (unit; real CLI IMP-06 with a negative control). |
| BEH-002 (Codex) | Confirmed | The restore branch of `startThread` only; `rpcMessage === "no rollout found for thread id <id>"`. |
| BEH-003 (Antigravity) | Confirmed | Only on an ID mismatch: waits up to 1 s for stderr `conversation "<expectedId>" not found`, else `AGY_CONVERSATION_ID_CONFLICT` as today. The other conversation's process is stopped by the preparation's release on throw (deviation 3; E2E LS-01/02 with a negative control, IMP-04). |
| BEH-004 (Grok, DeepSeek) | Confirmed | Per profile, by exact JSON-RPC shape, in the restore branch only. The outer launcher catch rethrows the typed error unwrapped. |
| BEH-005 (other failures) | Confirmed | Only `SavedRuntimeSessionMissingError` renews. An `AggregateError` (quarantined cleanup), an unconfirmed release (`releasePrivate().kind !== "released"`) or, for members, a different session (`restoring`) rethrows. |
| BEH-006 (archive, marker, notice) | Confirmed in the studio; **Contradicted** on the application paths | `activateInFreshSession` and `beginFreshSession` reuse the switch steps with the renewal `RuntimeSwitch`. Key `session_renewal:<runId>:<lostId>`; REQ-004 text. The notice comes from `RuntimeHandoverNoticeService`, which only the studio wires (CR-002). |
| BEH-007 (members, delegated copies) | Confirmed in the studio | `beginMemberSessionRenewal` leads to `beginSessionRenewal` and `replace_lost_session`. All five consumers handle it as the design's table says. Delegated copies use DS-001. The dead staged activation is removed (AR-002). |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario | Related | Kind | Actor | Goal / Event | Entry | Shape | Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001…005 | REQ-001…007 | User | Founder | Continue an older run whose saved session is gone | Send a message | Normal / Explicit Edge (as the requirements) | DS-001, DS-002 | Fresh session, marker, notice, answer | requirements | Supported | Use |
| SCN-APP | REQ-003, REQ-006; DS-001 with N-4 | User / System | A user of an application (application-scope run), or an application team member delegating (delegated copy on the standalone application host) | Continue an application's external-runtime run after its saved session was removed (the same 30-day Claude cleanup) | The application's message to its run; a delegated copy's next task message | Normal | The application-scope lifecycle (`application-execution-scope-kernel-builder.ts:274-287`); the host's general supervisor lifecycle (`start-standalone-application-host.ts:270`; delegated copies resolve through `generalProcessRunSupervisor.standaloneRootManager`, line 297) | The same renewal **with the hand-over notice** (REQ-003) | N-4 adopted application-scope runs on DS-001; N-2 places delegated copies on the standalone lifecycle; the host composes collaboration with these roots | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate | Observation | Scenario / Contract | Evidence | Disposition | Scope | Response |
| --- | --- | --- | --- | --- | --- | --- |
| CF-01 | `RuntimeSwitch.cause` is set by both builders and read by no production code. Only `runtime-switch-session-renewal.test.ts:60` reads it. `CodexAppServerRpcError.rpcCode` is stored and read by nothing at all; only the matcher reads `rpcMessage`. | `DESIGN.md` rule 11 ("Production code keeps no … field … that only tests read"); Core Principle 7 | repository grep: no `.cause` reader of `RuntimeSwitch`; `rpcCode` only in its constructor and a test helper | Promote | This ticket (fields added by this change) | CR-001 |
| CF-02 | The application paths renew without the hand-over notice, and the application host's standalone lifecycle cannot renew at all. See CR-002. | SCN-APP; REQ-003, REQ-006; N-4 | `application-execution-scope-kernel-builder.ts:144-170` (`AgentRunManager` without `inputPreface`); `start-standalone-application-host.ts:290` (`platformInputNotices` without `RuntimeHandoverNoticeService`) and no `runtimeSwitching`; `build-studio-server.ts:283-306` (the only composition with both) | Promote | This ticket (`Design Impact`) | CR-002 |
| CF-03 | Deviation 2 (`CodexAppServerRpcError` keeps the JSON-RPC message) | REQ-002 exactness | The matcher compares the provider's own message instead of the wrapped text | Reject (`Pass — deviation recorded, reason holds`), except the unread `rpcCode` (CF-01) | — | — |
| CF-04 | Deviation 3 (Antigravity relies on the preparation's release to stop the other conversation's process) | BEH-003 | `agent-run-activation-operation.ts:75-79` releases a failed preparation before rethrowing; E2E LS-01/02 | Reject (reason holds) | — | — |
| CF-05 | Deviation 4 (the Claude check in its own file) | Size | `claude-session.ts` is at 497 effective lines | Reject (reason holds) | — | — |
| CF-06 | Deviation 5 (`ConfiguredAgentActivationOperation.restoring`) | REQ-002 exactness for members | The handle renews only for the session the operation restored | Reject (reason holds; it is read by `beginMemberSessionRenewal`) | — | — |
| CF-07 | Claude now opens its process on every restore and fails at activation for any initialization error (RSK-003) | design Key Tradeoffs | Accepted by the design; restart-resume to be verified by API/E2E | Reject as a finding; residual | — | — |
| CF-08 | The standalone path checks that the typed error names the stored session only implicitly (the backend raises it only from the restore of the stored ID); the member path checks explicitly (`restoring`) | REQ-002 | Each backend raises it only in its platform-restore branch with the requested ID | Reject (equivalent in practice) | — | — |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | `activateSwitched` → `activateInFreshSession`; `beginSwitch` → `beginFreshSession`; the compare-and-set renamed; AR-002 removal | — |
| Matches behavior-defining supplemental artifacts | N/A | None | — |
| Data-flow spine clarity | Pass (CRR-002; CRR-001 Fail) | DS-001 and DS-002 are complete in all three compositions | — |
| Ownership boundary preservation | Pass | Backends recognize and never decide; the two activation owners decide and sequence; `runtime-switch.ts` owns key and text | — |
| Off-spine concern clarity | Pass | `RUNTIME_SESSION_LOST` warning in both owners | — |
| Existing capability reuse | Pass | The switch steps, the recorder and the notice are reused, not duplicated | — |
| Reusable owned structures | Pass | `CollaborationAgentBindingReplacement` is shared by two kinds | — |
| Shared-structure tightness | Pass (CRR-002; CRR-001 Fail) | `cause` and `rpcCode` removed | — |
| Repeated coordination ownership | Pass | Each owner calls its own steps | — |
| Empty indirection check (Core Principle 13) | Pass | `configured-agent-session-renewal.ts` owns the member renewal decision (exactness, release, log); `codex-missing-thread.ts` and `claude-session-resume-check.ts` own matchers | — |
| Separation of concerns and file responsibility | Pass | — | — |
| Ownership-driven dependency check | Pass | Backends depend only on the typed error | — |
| Visible dependencies (Core Principle 16) | Pass | The kernel builder's `getDefaultRuntimeSwitchMemory()` follows the existing member fallback. The switch port reaches the studio's lifecycle through the composition root. | — |
| Authoritative Boundary Rule | Pass | The lifecycle calls `AgentRunManager`, never a backend's resume | — |
| File placement | Pass | — | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface boundary clarity | Pass | `SavedRuntimeSessionMissingError(runtimeKind, platformAgentRunId)`, `buildSessionRenewal`, `isMissingSession(error, sessionId)`, `beginSessionRenewal(config, lostId)`, `replace_lost_session` | — |
| Naming and one vocabulary (Core Principle 15) | Pass — deviation recorded, reason holds | D-1 (stored `runtime_switch`), defined once in the glossary | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity | Pass | — | — |
| Dead code removed in touched files (Core Principle 7) | Pass (CRR-002; CRR-001 Fail) | AR-002 removal; the two unread fields removed | — |
| Test scenarios requirement-aligned | Pass | Per-backend positive and negative cases on the probed shapes; real roots for Team, Org and delegated copy; built-server Team member; 16 negative controls (IMP-03) | — |
| Test fixtures and structure | Pass | `AGY_FAKE_LOST_CONVERSATIONS_FILE` opt-in; isolated homes | — |
| No stale or compatibility-only tests | Pass | The staged-activation tests removed or rewritten | — |
| API/E2E readiness | Pass (CRR-002; CRR-001 Fail) | Every composition proven by a test with its real wiring | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` Check | `>220` Delta | Notes |
| --- | --- | --- | --- | --- | --- |
| `claude-session.ts` | 494 | 497 | Pass | Pass | The check is in its own file |
| `standalone-agent-run-lifecycle-service.ts` | 461 | 487 | Pass | Pass | — |
| `configured-agent-execution-handle.ts` | 500 | 461 | Pass (shrunk by AR-002) | Pass | — |
| Others (IMP-08) | — | all ≤ 267 | Pass | Pass (largest delta 67 lines) | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | — |
| No legacy retention | Pass | — |
| Dead code removed | Pass (CRR-002; CRR-001 Fail) | CR-001 resolved |
| Persisted-data decision followed | Pass | `Not Affected`; existing shapes written on a new trigger (D-1) |
| No version-specific dual reads | Pass | — |
| Transition mechanics | N/A | — |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| `RuntimeSwitch.cause` (`agent-execution/domain/runtime-switch.ts`) | DeadCode (a field only tests read) | No production reader (grep). The key prefix and the marker text already carry the two triggers. | `DESIGN.md` rule 11 | Remove it with its test assertions and the glossary's code mention, or give it a real production reader if the design names one |
| `CodexAppServerRpcError.rpcCode` (`runtime-management/codex/client/codex-app-server-client.ts`) | DeadCode (never read) | Only `rpcMessage` is read (`codex-missing-thread.ts:9`) | Rule 11 / Principle 7 | Remove `rpcCode` |

## Docs-Impact Verdict

- Docs impact: `Yes`, updated in the change: `GLOSSARY.md`, `run_history.md`, `agent_execution.md`, `docs/design-cases.md` (Case 26). CR-001 and CR-002 will each touch them: the glossary's `RuntimeSwitch.cause` mention, and the hosts a renewal covers.

## Additional Material Premise Validation

### SCN-APP: application-scope runs and the standalone application host renew a lost session with the hand-over notice

- Origin: `New` (from N-4 and N-2, traced to the compositions).
- Related approved requirement or established contract: REQ-003 (the fresh session receives the hand-over notice), REQ-006 (every run kind); DS-001 as adopted with N-4.
- Coherent product goal or governing event: an application's external-runtime run, or a delegated copy on the application host, continues after its saved session was removed. This is the same 30-day Claude cleanup.
- Scenario validity: `Supported Normal Scenario` (N-4 adopted).
- Initiating basis kind: `User` (the application's message) / `System` (a task message to a delegated copy).
- Forward path:
  - **Application scope:** `AgentRunService` → the scope's `StandaloneAgentRunLifecycleService` (switch port added by `2acd842c95`) → `activateInFreshSession` → marker and segment written → the input is dispatched through the scope's `AgentRunManager`, built without an `inputPreface` (`application-execution-scope-kernel-builder.ts:144-170`). So no `RuntimeHandoverNoticeService` reads the pending marker, and the new session gets no notice.
  - **Application host:** `createGeneralProcessRunSupervisor` without `runtimeSwitching` (`start-standalone-application-host.ts:270-293`) → its standalone lifecycle has `switching: null` → `renewLostSession` rethrows the typed error (a dead end that now reads "The saved … session … no longer exists"). Its members renew (the planner's default switch memory), but its `platformInputNotices` (`:290`) holds no `RuntimeHandoverNoticeService`, so they also get no notice.
- Reachability: `Reachable` (the compositions above).
- Review consequence: CR-002 (`Design Impact`).

## Review Scorecard (Mandatory)

- Overall score: `9.4/10` (CRR-002; CRR-001 9.0; simple average for trend only)

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 (CRR-002; CRR-001 8.6) | DS-001/002 complete in all three compositions, each with both parts | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.4 | Recognition in backends; decision in owners | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.3 | Exact, subject-explicit interfaces | — | — |
| 4 | Separation of Concerns and File Placement | 9.4 | Small owned files where size required | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 (CRR-002; CRR-001 8.8) | `CollaborationAgentBindingReplacement` shared cleanly; unread fields removed | — | — |
| 6 | Naming Quality and Local Readability | 9.3 | Glossary terms; D-1 documented | — | — |
| 7 | API/E2E Readiness | 9.3 (CRR-002; CRR-001 8.6) | One test per composition with real wiring and negative controls; a built-server notice check | No built-host E2E (the host serves no run API) | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 (CRR-002; CRR-001 8.7) | Exact recognition; release confirmed; retry by key; the notice arrives on every path | RSK-003 residual | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | D-1 avoids a migration with a recorded reason | — | — |
| 10 | Cleanup Completeness | 9.5 (CRR-002; CRR-001 9.0) | AR-002 removal; the two dead fields removed | — | — |

## Findings

### CR-001 (resolved in CRR-002) — Two fields this change adds are never read in production (`DESIGN.md` rule 11)

- **Evidence:**
  - `RuntimeSwitch.cause` (`runtime-switch.ts`) is set by `buildRuntimeSwitchBetween` and `buildSessionRenewal`. No production code reads it; only `runtime-switch-session-renewal.test.ts` asserts it. The two triggers already differ where they must: in the key prefix and the marker text, which the builders compute directly.
  - `CodexAppServerRpcError.rpcCode` (`codex-app-server-client.ts`) is stored and never read; the matcher reads only `rpcMessage`.
- **Problem:** rule 11 forbids production fields that only tests read, and Core Principle 7 forbids dead code in touched files. Both are new in this change.
- **Note:** the design prescribed `cause` (the "Vocabulary drift" response and "`cause` is required on both builders"), so removing it also changes the design's wording and the glossary line "`RuntimeSwitch.cause = "lost_session"`". It goes to the Solution Designer with CR-002 rather than as a separate Local Fix.
- **Required action:** remove `cause` (with its test assertions and the glossary's code mention) unless the design names a production reader, and remove `rpcCode`.

### CR-002 (resolved in CRR-002) — On the application paths a session renewal continues without the hand-over notice, and the application host's delegated copies cannot renew (REQ-003, REQ-006; DS-001 with N-4)

- **Evidence:**
  - Only the studio composition wires both renewal ingredients: the switch memory (`runtimeSwitching`, `build-studio-server.ts:306`) and `RuntimeHandoverNoticeService` in the run manager's input preface (`:283, :304`, through `general-process-run-supervisor.ts:189`).
  - **Application execution scope:** `2acd842c95` added the switch port to its lifecycle (deviation 1, N-4), but its `AgentRunManager` (`application-execution-scope-kernel-builder.ts:144-170`) has no `inputPreface`. A renewal there writes the segment and the lost-session marker and commits the new session, but no notice service reads the pending marker. The fresh session starts with no hand-over notice and no journal context, which contradicts REQ-003 ("The fresh session receives the hand-over notice with its first input").
  - **Standalone application host:** `createGeneralProcessRunSupervisor` gets no `runtimeSwitching` (`start-standalone-application-host.ts:270-293`). Its standalone lifecycle, which delegated copies take (N-2; the host resolves them through `generalProcessRunSupervisor.standaloneRootManager`, `:297`), rethrows the typed error, so the dead end stays (REQ-006). Its members do renew through the planner's default switch memory, but its `platformInputNotices` (`:290`) holds no `RuntimeHandoverNoticeService`, so they also continue without the notice.
  - The input type still says "None (the application host): a lifecycle without them fails closed on a pending switch" (`general-process-run-supervisor-input.ts:72-77`). That was true when the port served only switches, which never happen there. A renewal is a new trigger on that host.
- **Origin:** the reviewed design. It adopted N-4 ("application-scope runs are on DS-001") and reuses the notice "unchanged". But its Change Scope and file mapping list neither composition, and it does not record that the notice service is wired only in the studio. The implementation closed half of the gap (the switch port in the application scope) and asked for confirmation (deviation 1).
- **Classification:** `Design Impact` (Solution Designer). The design must decide, per composition (application execution scope; standalone application host: its standalone lifecycle and its members), how renewal gets both the switch memory and the hand-over notice. For example: wire `RuntimeHandoverNoticeService` into the scope's `AgentRunManager` and the host's platform notices, and give the host's supervisor the switch memory. Or, if a host cannot carry the notice, decide that renewal is not offered there and keep the error. Either way, update the Change Scope, DS-001's narrative, the input type's comment, the docs, and a test proving the notice is delivered after a renewal on each path.
- **Scope:** this ticket. It is REQ-003 and REQ-006 for run kinds DS-001 names, and it touches the composition the implementation already edited.

## Follow-ups

- Follow-ups this review added: None. Both findings are this ticket's.

## Classification

- CRR-002: N/A (Pass). CRR-001's `Design Impact` (CR-002) and CR-001 are resolved.

## Recommended Recipient

CRR-002: `/api_e2e_engineer` (primary pass rule), with an informational notice to implementation.

## Residual Risks

- RSK-001/002 (runtime text changes) as designed: a miss shows today's error, never a wrong renewal.
- RSK-003: Claude opens its process at restore; restart-resume to be verified by API/E2E.
- AC-007 (live Claude) and live Codex, Grok and DeepSeek renewals are API/E2E's.
- No Claude built-server E2E; Claude is covered by unit tests, the factory test and the real-CLI check.

## Latest Authoritative Result

- Review Decision: `Pass` (CRR-002, round 2, Full Re-Audit; CR-001 and CR-002 resolved). CRR-001 was a `Fail`.
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (SCN-APP now served in every composition)
- Score Summary: average 9.4; every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: API/E2E
- Notes: the studio path is sound: exact recognition on all five runtimes, the release confirmed before a renewal, retry by key, all five binding consumers. Deviations 2–5 hold. Deviation 1 (N-4) is incomplete without the notice: CR-002.
