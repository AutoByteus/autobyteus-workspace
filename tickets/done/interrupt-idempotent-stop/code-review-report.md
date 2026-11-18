# Code Review Report — autobyteus-533 (interrupt-idempotent-stop)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002, Approved)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (via the design spec's Current-State Read and evidence rows)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts Reviewed As Context: `evidence/spine-validation/sr-003-stop-spines-by-run-kind.md`; `evidence/reproduction/`; `evidence/implementation/IMP-09-browser-stop-twice-loopback/`
- Relevant Solution Revision IDs: SR-003 (requirements SR-002)
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002 Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-002)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: `2`
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence (round >1): `git diff eb60ae71e2 71f9a5d13e` touches only `autobyteus-agent-run-backend.ts` (the turn-gone return, 2 lines) and its unit test, the files of CR-001; no spine, shared interface or other file changed. Round-1 evidence for every other check is carried forward.
- Trigger: Implementation Engineer, IR-002 (CR-001 Local Fix)
- Prior Review Round Reviewed: 1 (CRR-001, Fail — CR-001)
- Latest Authoritative Round: 2
- Code reviewed: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-idempotent-stop`, branch `codex/interrupt-idempotent-stop`, `bd2053ee51..71f9a5d13e` (code commits `ff16e5de85`, `1f92302096`, `45cae5ebd2`, CR-001 fix `71f9a5d13e`)
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed. Ack meaning on five streams, backend contract for three runtimes, the web callback API and `AgentInteractionPort.interrupt()` return type for every run kind, and a client pending state with connection-loss lifecycle — as the design classified. No correction.

## Review Scope

- Changed implementation and behavior reviewed: server `userInterruptOutcome` at the five user interrupt boundaries and the not-running answers; Claude/Codex/native backend turn-gone answers; `NO_ACTIVE_TURN` / `RUN_NOT_ACTIVE` constants; web `runInterrupt`, `InterruptOutcome`, `interruptPending` / `stopping`, the outcome-returning routes for every run kind, `InterruptsAwaitingRebind` in the agent, Team and Org streaming services, `orgInterruptOutcome`, `targetDisplayName`, localization, docs.
- Files / areas reviewed: all 45 changed source files in `autobyteus-server-ts/src` and `autobyteus-web` (stat `bd2053ee51..b271cc4ceb`), their changed unit/component specs, the two docs, and the surrounding owners needed to judge them (`agent-run-interrupt-state.ts`, `claude-session.ts`, `codex-thread.ts`, `autobyteus-ts/src/agent/runtime/agent-runtime.ts`, `agentRunStreamReconnection.ts`, `peerRunStreams.ts`, `liveStreamReconnectScheduler.ts`, the Org service's close/recovery paths).
- Explicit exclusions: the scratch browser reproduction and the probe `.mjs` files (test harness, owned by API/E2E next); evidence artifacts. No recorded check was rerun: the code each one exercises is unchanged since it ran, and the finding below is settled by reading.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes — REQ-001…REQ-007, AC-001…AC-011, DEC-001…DEC-008.
- Design-spec behavior map verified against the implementation: Yes (DS-001…DS-006, DS-002b), with the two placement notes in the handoff judged below.
- Design review report and round confirmed: ARCH-REV-002 Pass on SR-003.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: None.
- Remaining material ambiguity, if any: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `AgentUserInputTextArea` → `activeContextStore.interruptGeneration` (primary-action gate, `activeContextStore.ts:255-278`) → `runInterrupt` (`runInterrupt.ts:21-60`) → route → streaming service; status watch from the press | — |
| BEH-002 | Confirmed | `agentPrimaryAction.ts:29-31` answers `stopping`; `runInterrupt.ts:29` returns while pending; `AgentRunInterruptState` unchanged (joining) | — |
| BEH-003/004 | Confirmed | `userInterruptOutcome` (`user-interrupt-outcome.ts`) on `/ws/agent` (`agent-stream-handler.ts:405-413`), Team, Org, collaboration, peer-run; not-running branches answer `NOTHING_TO_INTERRUPT` | — |
| BEH-005 | Confirmed | `agent-team-stream-handler.ts:164-165` (stopped Team) + `team-interrupt-generation-command-handler.ts:43` (rule) | — |
| BEH-006/007 | Confirmed | `orgInterruptOutcome.ts`; `delegatedRunsStore.ts:155-159` peer route; server Org `agent-org-stream-handler.ts:65-67,138,147-151,166`, collaboration `:186-188`, peer relay `peer-run-stream-session.ts:117` | — |
| BEH-008 | Confirmed | `InterruptsAwaitingRebind` (`interruptCommandAdmission.ts:59-79`): agent `AgentStreamingService.ts:292-293,316-319,141-144`; Team `TeamStreamingService.ts:271-272,284-285,326-327,434,468-471`; Org `agentOrgStreamingService.ts:142,186,320,497-504`. No final give-up in `LiveStreamReconnectScheduler` (R-4 as designed) | — |
| BEH-009/010 | Confirmed | `runInterrupt.ts:51-59`; texts `agents.interrupt.*` en/zh-CN | — |
| AC-005 | Confirmed for every backend (round 2: native `turn_mismatch` now effective, CR-001 resolved) | `claude-agent-run-backend.ts:151-153`, `codex-agent-run-backend.ts:197-199`, `autobyteus-agent-run-backend.ts:102-103,304-308` (no runtime turn id on the mapped result) | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001…SCN-006 | BEH-001…BEH-010 | User | User | Stop the agent's work; repeat harmlessly; real failure in plain words | Composer Stop, desktop and phone, every run kind (UC-004) | Normal | DS-001…DS-004, DS-002b | As approved | requirements-doc.md, reproduction evidence | Supported Normal Scenario | Use |
| C-AC005 | AC-005; backend contract `agent-run-backend.ts:79-83` (added by this change) | Contract | Runtime answering an interrupt for a turn that is no longer its active turn | "`turnId` is not, or no longer, the runtime's active turn → `NO_ACTIVE_TURN`; any other refusal is a real failure" | `AgentRunInterruptState.execute` → `backend.interrupt(turnId)` | Contract | `agent-run-interrupt-state.ts:85-108` applies the backend result | `NO_ACTIVE_TURN` reaches `userInterruptOutcome` → accepted | design D-S3; handoff placement note (2) | Supported (governing contract) | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CG-01 | Native `turn_mismatch` → `NO_ACTIVE_TURN` keeps the runtime's *other* turn id, so the domain turns it into `AGENT_RUN_INTERRUPT_PROVIDER_PROTOCOL_VIOLATION`; the mapping never takes effect and the unit fixture hides it | C-AC005 | The native runtime answers `turn_mismatch` with `turnId: activeTurn.turnId` (`autobyteus-ts/src/agent/runtime/agent-runtime.ts:198-205`) | `autobyteus-agent-run-backend.ts:304-306` returns `turnId: result.turnId` → `agent-run-interrupt-state.ts:93-100` sees a non-null turn id ≠ the reservation's → protocol violation, not `NO_ACTIVE_TURN` → `refused` → "Could not stop …" toast, the opposite of the contract and of Claude/Codex for the same case | Code read; test `autobyteus-agent-run-backend.test.ts:170-177` mocks `turnId: null` for all three statuses, which the runtime does not produce for `turn_mismatch` | Promote | This ticket | The change added the mapping, the contract comment and the test. Bounded Local Fix (CR-001) |
| CG-02 | Team handler's null-run branch removed; stopped Team answered in `memberCommand` (handoff note 1) | Design D-S2 | Stop to a member of a stopped Team | `agent-team-stream-handler.ts:131` always passes `routed` (never null); `memberCommand` `:163-165` is where a stopped Team answers | Code read | Reject (no finding) | — | Correct placement; dead branch removal follows Principle 7 |
| CG-03 | `agentOrgStreamingService.ts` 506 physical lines vs the design's "≤500" (handoff note 3) | Size rule | — | 465 → 473 effective non-empty lines | Line count | Reject | — | The team limit counts effective lines; +8 lines of holder wiring, hold/settle logic lives in the shared holder |
| CG-04 | `teamRunCommandPresentation.ts` renamed `teamRunCommandIds.ts` (handoff note 4) | Principle 12 | — | Only id builders remain, both still imported by `agentTeamRunStore.ts:32` | Code read | Reject | — | The name now says what the file holds |
| CG-05 | Stopped Team / stopped Org accept an interrupt without checking the target is a member (DEC-002 keeps non-members rejected) | DEC-002 | A composer Stop to a non-member | Composer targets come from the open context (ASM-001); no product surface addresses a non-member | Code read | Reject | — | Technically Possible but Unsupported; before the change these answered `*_STOPPED`, not a membership refusal, either |
| CG-06 | Claude/Codex `activeTurnId !== turnId` → accepted when the runtime already started a *next* turn (Stop accepted while turn B runs; Stopping until B's status) | D-S3 | Stop in the instant a turn ends and a queued turn starts before the server's canonical turn advances | Requires artificial timing between two runtime turns | Code read | Reject (residual risk) | — | Approved design wording (D-S3); narrow race; recorded under Residual Risks |
| CG-07 | IMP-09: one of six loopback runs stalled a later *send* to the offline AGY run | REQ-007 (send unchanged) | Send after a Stop took the AGY run offline | Send path not changed by this diff (`sendUserInputAndSubscribe`, `pendingAdmissions` untouched); `interruptPending` gates only while Running and the page showed Offline | IMP-09 evidence; diff | Hold for Evidence | — | No evidence ties it to changed code; API/E2E to reproduce (Residual Risks). Not scored |
| CG-08 | Store specs assert removed options are absent (`agentRunStore.spec.ts:619-620`, `agentTeamRunStore.spec.ts:306`) | Test quality | — | Assert an implementation detail, not behavior | Code read | Reject (suggestion) | — | Harmless; may be dropped at the next touch |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | One presentation owner (`runInterrupt`), one node rule (`userInterruptOutcome`); presenters and callbacks removed | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | SR-003 spine re-walk rows match the code paths cited above | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001…DS-006 and DS-002b traceable in code for every run kind | — |
| Ownership boundary preservation and clarity | Pass | Streaming services settle outcomes and never present; `runInterrupt` is the only presenter; domain result untouched | — |
| Off-spine concern clarity | Pass | `targetDisplayName`, localization, `resolveAgentPrimaryAction` serve their owners | — |
| Existing capability/subsystem reuse check | Pass | Status watch reuses `currentStatus`; admission module extended; reconnect schedulers reused | — |
| Reusable owned structures check | Pass | `InterruptsAwaitingRebind` shared by three services; `InterruptOutcome` one type | — |
| Shared-structure/data-model tightness check | Pass | `InterruptOutcome` four kinds, `detail` only on `refused`; `PendingInterruptCommand` carries `settle` | — |
| Repeated coordination ownership check | Pass | Node rule once, called at five boundaries; web presentation once | — |
| Empty indirection check | Pass | `orgInterruptOutcome` translates (ready check, error kinds); `runInterrupt` owns sequence and state; no new port | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | New files each own one concern | — |
| Ownership-driven dependency check | Pass | `runInterrupt` imports no stores; services import no toasts/localization; rule file imports only domain constants | — |
| Visible dependencies check | Pass | `runInterrupt` gets context, route and name as arguments; `useToasts()` used as the removed presenters used it | — |
| Authoritative Boundary Rule check | Pass | Callers use `interruptGeneration` / `interaction.interrupt()`; none read pending maps | — |
| File placement check | Pass | `services/runInterrupt/` beside `runSubmission/`; node rule beside the ack builder | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass | Per-subject methods unchanged in identity shape; return types now explicit | — |
| Naming quality and one vocabulary | Pass | Stop = interrupt; `stopping`, `interruptPending`, `InterruptOutcome`, `NOTHING_TO_INTERRUPT` used consistently | — |
| No unjustified duplication in changed scope | Pass | `agentRunStore.ts:52-55` keeps its own id builders alongside `teamRunCommandIds.ts` — pre-existing, unchanged by this diff | — |
| Patch-on-patch complexity control | Pass | — | — |
| Dead code removed in the touched files and modules | Pass | Presenters, callbacks, transport-failure type, old keys, Team null branch, unused imports removed; FU-003 recorded for the untouched approval handler | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Round 2: the native test uses the runtime's real shapes (null / asked turn / other turn) and runs the mapped result through a real `AgentRunInterruptState` and `userInterruptOutcome`; IMP-11 shows it fails with the old mapping (3 failed) | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Composer journey spec drives real stores and the real Team service | — |
| No stale, duplicated, or compatibility-only tests retained in changed scope | Pass | Stale integration and probe cases rewritten (AC-011); CG-08 is a suggestion | — |
| API/E2E readiness for the next workflow stage | Pass | CR-001 resolved; scratch probe kept as API/E2E's starting point | — |

## Source File Size And Structure Audit

| Source File | Effective Before | Effective After | `>500` Check | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/agentOrgContextsStore.ts` | 487 | 488 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/stores/agentTeamRunStore.ts` | 486 | 483 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/services/agentOrgExecution/agentOrgStreamingService.ts` | 465 | 473 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | 464 | 457 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | 435 | 435 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/stores/agentRunStore.ts` | 449 | 429 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` | 375 | 357 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts` | 374 | 381 | Pass | Pass | Pass | Pass | — (CR-001 resolved) | — |
| All other changed source files (37) | ≤ 391 | ≤ 391 | Pass | Pass (largest delta: `interruptCommandAdmission.ts`, 125 changed lines) | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No tolerance of old `NO_ACTIVE_TURN` acks on the web (DESIGN.md rule 9) |
| No legacy old-behavior retention in changed scope | Pass | Callbacks and presenters removed, not kept beside outcomes |
| Dead code removed in the touched files and modules | Pass | See structural check |
| Approved persisted-data transition decision is followed | Pass | `Not Affected` |
| No version-specific dual reads/writes or request-time old-shape fallback | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal

None in this ticket's scope. `interrupt-twice-repro-scratch.mjs` stays until API/E2E replaces it with the durable probe (design step 5; requirements: "replaced by the durable probe").

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: the ack meaning and the web interrupt flow changed.
- Files or areas likely affected: `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` and `autobyteus-web/docs/agent_execution_architecture.md` — both updated in this change and accurate to the code.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| ARCH-REV-002 decisions | Confirmed | — |

None new beyond the candidate gate above.

## Review Scorecard (Mandatory)

- Overall score: `9.4/10` (simple average; not the decision rule)
- Round 2: Targeted Delta Review; categories 7, 8 and 10 rescored for the CR-001 fix, others carried forward.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Every run kind's Stop traced through one entry, one owner and one outcome type | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Presentation has one owner; services only settle; domain result untouched | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | `Promise<InterruptOutcome>` everywhere; explicit identity shapes kept | — | — |
| 4 | Separation of Concerns and File Placement | 9.4 | Small new files, each one concern; all files under the limit | — | — |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.4 | One outcome type, one holder for three services | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | Consistent Stop/interrupt vocabulary; rename to `teamRunCommandIds` | — | — |
| 7 | API/E2E Readiness | 9.4 | Strong unit/composer/probe coverage; real-stack evidence at loopback and 150 ms; native turn-gone test now through the real interrupt state | AC-010 phone case and durable desktop probe still to come (API/E2E's) | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 | Server rule, backends (native included after CR-001), holder lifecycle and status watch correct for every traced path | CG-06 race accepted by design | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean cut; old keys, callbacks, type removed | — | — |
| 10 | Cleanup Completeness | 9.4 | Dead branches and imports removed; FU-003 recorded; no ineffective mapping left | — | — |

## Findings

No open findings (round 2). CR-001 is resolved; kept below for history.

### CR-001 — Native `turn_mismatch` mapping never reaches `NO_ACTIVE_TURN` (Local Fix, implementation) — Resolved in IR-002 (`71f9a5d13e`)

- Contract: AC-005 and the backend contract this change states on `AgentRunBackend.interrupt` (`agent-run-backend.ts:79-83`): a turn that is not, or no longer, the runtime's active turn answers `NO_ACTIVE_TURN`; D-S3; handoff placement note (2).
- Problem: `autobyteus-agent-run-backend.ts:304-306` maps `turn_mismatch` to `NO_ACTIVE_TURN` but keeps `turnId: result.turnId`. For `turn_mismatch` the native runtime returns the *other* active turn's id (`autobyteus-ts/src/agent/runtime/agent-runtime.ts:198-205`: `turnId: activeTurn.turnId`). `AgentRunInterruptState.execute` (`agent-run-interrupt-state.ts:93-100`) replaces any result whose non-null `turnId` differs from the reservation's with `AGENT_RUN_INTERRUPT_PROVIDER_PROTOCOL_VIOLATION`. So the mapping never takes effect: the user gets `refused` and "Could not stop {name}", where Claude and Codex answer `NO_ACTIVE_TURN` (no turn id) and the Stop is quiet.
- Why the test passes: `autobyteus-agent-run-backend.test.ts:170-177` mocks `turnId: null` for all three statuses, a shape the runtime does not send for `turn_mismatch`, and it tests the backend alone, not the result applied by `AgentRunInterruptState`.
- Required action (bounded): for the turn-gone statuses, return `NO_ACTIVE_TURN` without the runtime's turn id (as Claude and Codex do), and make the test use the runtime's real shape (`turn_mismatch` with the other turn's id), asserting the result `AgentRunInterruptState` applies or, at least, that the backend's mapped result carries no foreign turn id. `no_active_turn` (`turnId: null`) and `already_settled` (same turn) already work.
- Scope: this ticket (the change added the mapping, the contract comment and the test).
- Resolution (round 2): `autobyteus-agent-run-backend.ts:304-308` returns `{ accepted: false, code: NO_ACTIVE_TURN, message }` with no runtime turn id; the test feeds each status its real runtime shape and asserts the result `AgentRunInterruptState` applies is `NO_ACTIVE_TURN` and `userInterruptOutcome` accepts it (IMP-11: 20/20; 3 fail with the old mapping). Dropping the turn id for `already_settled` changes nothing else: the domain reads `result.turnId` only for the protocol check (`agent-run-interrupt-state.ts:93-100`).

## Follow-ups

- Follow-ups this review added: None (FU-001…FU-004 recorded upstream; reviewed, no change).

## Classification

- None (Pass). Round 1's `Local Fix` CR-001 is resolved.

## Recommended Recipient

- API/E2E Engineer (`/api_e2e_engineer`), per the rule "implementation review passes"; Implementation Engineer gets the informational pass notice.

## Residual Risks

- CG-06 (D-S3, by design): when a runtime has already started a *next* turn as the Stop arrives, Claude/Codex (and native after CR-001) answer `NO_ACTIVE_TURN` → accepted; the Stop does not stop the new turn and "Stopping…" lasts until a status other than Running arrives. Narrow race; no change asked.
- CG-07 (for API/E2E): IMP-09's single stalled *send* to an AGY run right after a Stop took it offline. The send path is not changed by this diff; reproduce on the real stack and compare with the base before attributing it.
- R-3 / R-4 (design): accepted Stop with no later status; Stopping held while a node stays unreachable (the reconnect scheduler has no final give-up, `liveStreamReconnectScheduler.ts`).
- AC-010 phone case and the durable desktop probe replacing `interrupt-twice-repro-scratch.mjs` remain for API/E2E.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 average; every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: `/api_e2e_engineer`
- Notes: The four placement choices the implementer raised are accepted: (1) Team not-running answer in `memberCommand` with the dead branch removed — correct; (2) native `turn_mismatch` → `NO_ACTIVE_TURN` is within D-S3 and, after CR-001, takes effect; (3) Org service at 473 effective lines — within the limit; (4) rename to `teamRunCommandIds.ts` — correct.
