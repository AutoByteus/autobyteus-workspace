# Code Review Report

## Review Round Meta

- Date: 2026-10-03. **CRR-006 / API/E2E Failure-Origin Review**, triggered by **API-REV-004 / FAPI-006**. Current decision **Fail — Local Fix, implementation-owned**. This is not successful-test review, a repeat full source scorecard, or Delivery acceptance.
- Approved authority: **REQ-BL-008 = SD-AP-001 (SR-007) + scoped SD-AP-002**, current **SR-014 / ARCH-REV-005 / IR-005**. **SR-015/E-056 is evidence-only**, not a new timer/completion-report contract. Withdrawn REQ-BL-007 is not authority.
- **Large / High / Reviewed**, unchanged. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation`; branch `codex/project-task-manager-linked-delegation`; HEAD/base `806907faeb567d2b703e10fe984fcd01be0b41fd`; finalization target `origin/personal`. Delivery revision **N/A**.
- Prior source gate **CRR-005 Pass / 9.20/10** is historical. The now-established live terminal event defect reopens the affected implementation boundary; no current clean source Pass can be inferred from unchanged hashes.
- Context: canonical requirements, investigation/scope clarification, design/handoff/revision, design-review and architecture history, implementation handoff/investigation/revision, current API investigation/report/ledger/revision and prior code-review history. Complete incoming manifest `api-e2e-evidence/api-004-reference-files.json`: **552 existing references**, independently checked. Prior CRR-001 baseline and CRR-002–005 entries remain in `code-review-revision-record.md`.

## Scope And Preservation

Focused on validity and origin of FAPI-006, not a general review of passed API test code or all upstream source. Inspected the actual isolated-app DONE-B/state/DOM/socket/reload evidence, new durable regression, and the smallest Task closure → root release → Team publication gate → configured handle → actual AgentRun terminal event → root presentation → existing web context path.

Independent entry comparison: **281/281 reviewed implementation/package fingerprints and 13/13 prior API coverage fingerprints unchanged**; no missing reference. The one new durable file is `tests/unit/agent-collaboration/root-task-team-terminal-publication.test.ts`, bringing API coverage paths to14. The directory/gate fault predates this API run: it is not post-review source drift.

Reviewer writes only ticket review/evidence artifacts. No implementation/durable-test correction, reset/stage/commit, provider/model/app/credential/user-profile access or deployment. Focused unit execution uses repository-default owned test runtime. TESTING.md, server/web AGENTS, code-reviewer skill/shared scenario principles and Example9 followed.

## Upstream Behavior And Production-Path Basis Confirmation

| Behavior / contract | Current status and bounded evidence |
| --- | --- |
| BEH-005 / AC-006 | Stamped assignment identity and existing worker visibility are retained. Original FAPI-005 regression is unchanged and passes; API-REV-004 actual current-built Agent-root Agent/Team/helper visibility/reconnect/inspection resolves the original missing-sidebar reproduction for that journey. This is not all-root/provider acceptance. |
| BEH-006/010 / REQ-006/009/013 | Explicit verified host Manager business DONE and compact recorded-status acknowledgement succeed. Resources remain server-owned, not Manager duties. No report/notifier/polling/timer/self-DONE policy is needed. Confirmed for the observed business boundary. |
| BEH-007 / REQ-007 / AC-007 | Actual same lifetime closes; current exact GraphQL statuses are offline; internal release diagnostics report released. **Contradicted at the preserved live presentation boundary**: two configured Task Team member rows remain idle after terminal release while their snapshot is offline. This does not establish a physical resource leak. |
| BEH-008/009 and other lifecycle contracts | No new contradictory finding. Narrow Manager/A/helper controls and retained histories support isolation; full cascade/restore/Stop/retry/root/provider/data matrix remains incomplete. Prior source findings remain closed except new CRF-004. |

## Supported Product Scenario And Reachability Gate

| Scenario / basis | Independent actor, goal and supported entry | Forward production path / lifecycle / consequence | Evidence / disposition |
| --- | --- | --- | --- |
| **FO-SCN-007**, reuses SCN-005/011, AC-006/007 and REQ-006/007 | User explicitly instructs the ordinary @ Project Task Manager to mark an existing delegated Task B DONE and preserve Manager/history/other work. No completion-report or resource inspection premise. | Normal Chat command → actual host Manager MCP create_or_update_task → TaskService atomic DONE/closure → immediate release effect → active Agent-root releaseTaskLifetime → registered local Team operation plus exact physical Team release → configured AgentRun terminal presentation → existing collaboration stream/rows. Team is already durably committed and visible, not a private candidate; live rows must reflect truthful stopped/non-active state without needing reload. | Approved requirements/SD-AP-002, existing stream contract and current source, actual independently rebuilt isolated Codex6.1Sol-low journey. **Supported Normal Scenario / Reachable / Use**. Thirty-second observation is a test timeout, not a product timer. |
| Private-publication engineering contract | A new delegation creates a private preparation whose runtime events must not be visible before durable publication, or if it aborts before publication. | Same existing directory/factory/gate buffers preparation events, publishes only after durability, and discards aborted private events. Correcting committed terminal publication must preserve this distinct state. | Reviewed design durability rule, current gate and actual factory/handle private control. **Supported contract / Use**, not a new concurrency workflow. |
| Protection/preservation context, SCN-008/009 | Independent saved Task A/B and Task-owned helper identities remain distinct; completing one does not stop Manager/root or erase workers/history. | Valid DONE-A precedes valid DONE-B; separate Agent/helper callbacks work, configured Team callbacks fail. | API current actor-verified controls and current tree/DOM/snapshot identities. **Supported normal context / Use**; not complete borrowed/all-root physical acceptance. |

### Candidate Finding And Mechanism Gate

| Candidate | Observation / hypothesis | Independent scenario and lifecycle consequence | Evidence | Disposition |
| --- | --- | --- | --- | --- |
| **FO-CAND-006 / CRF-004 / FAPI-006** | Retained Team preparation release aborts its publication gate even after the Team became live; genuine terminal member events are dropped | FO-SCN-007 reaches a committed/live Team. Directory releaseResources aborts before factory release; gate drops all callbacks, so actual offline status cannot reach the subscribed live UI | Directory142–160/187–193/215–224; gate17–43; factory published release branch; configured handle bind/release; AgentRun485–502 canonical offline dispatch; actual root frames/DOM/snapshot; independent6-file witness | **Promote — implementation-owned Local Fix**. Correct lifecycle-aware existing publication/teardown boundary, retaining private abort safety and truthful exact release. |
| FO-CAND-007 | The source fault appeared after CRR-005 or is only a stale build/test artifact | Same supported actual journey and current source reproduce the failure |281/281 unchanged; fresh full desktop build recorded; original mapper/Manager/tool bundle hashes match; actual socket discrepancy and current-source factory witness agree | **Reject as sole origin**. Three bundle hashes do not certify every binary file; independently reproduced current source is decisive. |
| FO-CAND-008 | Idle sidebar rows prove live provider/resource leakage or failure of all three root facades | No complete physical/all-root proof follows from stale event presentation | Current exact snapshot offline, released diagnostics; controlled local release proves only its fake-provider boundary; actual app root is Agent with a Team child | **Reject attribution/inference**. Physical/full-matrix acceptance remains unproved, not waived. No global Stop/census/history deletion machinery. |
| FO-CAND-009 | Reloading or assigning offline from business DONE repairs acceptance | Business recorded status is expressly not physical proof; preserved live stream owns runtime presentation | Reload hydrates exact retained offline rows but prior live stream emitted no configured terminal events | **Reject as repair**. No client polling/reload requirement or fabricated offline/release success. |
| FO-CAND-010 | Wrong first DONE-A actor invalidates the later DONE-B case | Actual wrong-actor attempt and later verified host Manager operations are distinct | Archived Team-coordinator attempt, explicit actorSelectionVerified DONE-A retry and DONE-B; successful real business tools | **Reject blanket attribution**. First attempt is API execution evidence only, not Task source failure; valid later case establishes FAPI-006. |

No held material premise is needed for this focused origin decision. Tests confirm the established actor path; they do not create its validity. No speculative race or contradictory concurrent workflow underlies the finding.

## Failure Evidence And Forward Origin Trace

1. **Actual business trigger:** `api-004-done-b.json` records verified host Manager selection, explicit DONE-B instruction, successful business tools and retained identities. Sample at12:36:53.300Z shows DONE, same lifetime completedAt12:36:53.079Z and two released diagnostics. This sampling is not an exhaustive atomicity/physical cascade proof.
2. **Actual consequence:** coordinator/reader rows stay idle for>=30s and at a later passive checkpoint; Agent A and root-hosted helper are offline. `api-004-done-b-current-view.json` reports all four exact children offline and root active. Normal reload makes the same retained two Team member rows offline without a business mutation. Both screenshots inspected as supporting evidence; DOM/state/socket are primary.
3. **Socket isolation:** capture begins before the valid DONE-B command with root snapshot sequence1436, both configured members idle and active root lifecycle. Only helper offline presentation1437 follows. No configured-member terminal event, projection error or sequence gap appears in the captured root frames. This is not absence from a late listener.
4. **Forward source path:** TaskService116 initiates server release after its observed same-array closure. ProjectTaskRuntimeRelease calls the active exact root release boundary. RootTaskLifetimeScope.release retains registered operation release and physical release proofs. AgentRunCollaborationTaskExecutionAdapter plans root-hosted Team through beginRootTaskTeam and routes owned Team release to the same directory.
5. **Origin:** RootTeamExecutionDirectory stores a TaskAgentDurabilityEventGate in the configured callbacks. commitAfterDurability calls releaseToLive, making it a live stream. Its retained operation releaseResources nevertheless invokes **eventGate.abort() before factoryControl.release()** unconditionally. abort changes even live state to aborted; publish then returns without forwarding.
6. **Lost real event:** published factory release uses TeamRun.releaseOwnedRuntime → actual retained configured handles → AgentRunManager.releaseExactRun → AgentRun.forceReleaseRuntime → accepted backend terminate → lifecycleState.terminate (`offline`) → dispatchCanonicalStatus before successful configured-handle listener disposal. The configured callback therefore encounters the aborted gate. The existing root onAgentExecutionEvent/publisher/projector and web context can apply genuine delivered presentation; snapshots read current handle state and can be offline despite the missing live event.
7. **Independent witness:** new durable file uses actual directory/FlatTeamExecutionFactory/configured handles with controlled provider/business/client boundaries. Private prepared/aborted Team publishes nothing; committed idle callbacks forward only after durability. Both exact controlled runs stop and Team terminates; required exact two offline callbacks are **[]**. Reviewer independently reproduces this exact failure, not merely an unrelated timeout.

Compact reviewer extraction: `code-review-evidence/crr-006-origin-extract.json`. Current authority diff and independent preservation/logs linked below.

## Test Validity / Failure Origin / Earlier Review Gap

The new regression is valid for this **bounded production publication boundary**: ordinary prepare → durable commit/live publication → retained exact release, with no artificially timed concurrent action. Its synthetic IDs/provider release events are controlled reproductions of the actual established path; real AgentRun canonical termination source independently supports the event timing. It does not prove physical provider teardown, business closure, live renderer or all-root coverage by itself. Assertions remain enabled and unchanged.

**Origin: implementation defect plus an earlier source-review gap**, not a design/requirement gap, provider/auth failure, new API fixture defect, or post-review implementation change. Earlier review verified private publication protection and physical release ownership but did not carry the return/event spine through **committed operation release → unconditional gate abort → genuine AgentRun offline callback → root publisher → live client**. That consequence was reasonably detectable in source. The281 unchanged fingerprints corroborate this omission; they are not immunity.

Affected prior CRR-005 evidence/rationale: DS-004 return/event spine, BEH-007 live terminal fidelity, API/E2E readiness and Runtime Correctness conclusions. Its9.20 full-source score remains historical; no full scorecard is repeated or fabricated for this focused round. Current known CRF-004 prevents a clean source/executable Pass.

## Findings

### CRF-004 / FAPI-006 — P2: committed root-hosted Task Team release suppresses configured-member terminal publication

- **Owner:** Implementation Engineer.
- **Primary location:** `autobyteus-server-ts/src/agent-collaboration/execution/backends/root-team-execution-directory.ts:158–160`, in conjunction with `execution/services/task-agent-durability-event-gate.ts:17–43`.
- **Promoted basis:** FO-CAND-006 / FO-SCN-007, SCN-005/011, BEH-005/007, REQ-007, AC-006/007 and preserved stopped/non-active frontend behavior. Private-publication contract remains required.
- **Consequence:** completing an already-visible Team leaves its retained configured members appearing idle/live until reload because true terminal callbacks are discarded. Actual resource leakage, global root failure, or history loss is **not attributed**.
- **Required bounded correction:** distinguish abort/discard of unpublished preparation from teardown of a durably committed/live Team at the existing owning boundary. Preserve genuine exact member terminal presentation through successful live teardown without allowing private callbacks/late worker admission, changing scope, or inventing physical release success. No blind global change of every gate caller, client polling/reload workaround, DTO relaxation, worker/history deletion, global Stop, scheduler or Manager cleanup duty.
- **Closure required:** retain and rerun private/public controls and exact member-terminal assertion; validate applicable same-authority pending/failure/retry/idempotence paths proportionately. Large/High corrected cumulative source must return for independent source re-review, then API/E2E repeats the failing built-desktop verified-Manager DONE-B case without reload as repair and resumes the full required acceptance matrix.

## Prior Finding Resolution

Chronological details in CRR-006 entry of `code-review-revision-record.md`.

- CRF-001/002: remain source-resolved; quiet/tree/private neighbors24cases independently green.
- CRF-003/FAPI-005: source-resolved; original unchanged regression2cases green; API-REV-004 actual scoped missing-sidebar reproduction resolved with complete retained rows. Not full all-root/provider acceptance.
- API-UC-001: scoped approved business-only revision retained; no new policy recovery.
- FAPI-001–004: current API broader18 audit cases green per supplied evidence; prior API-owned dispositions retained, no released migration/startup correction by reviewer.
- CRF-004/FAPI-006: **Open**, new P2 implementation-owned Local Fix.

## Independent Checks / Limits

Exact reviewer command from W:

```sh
pnpm -C autobyteus-server-ts exec vitest run \
 tests/unit/agent-collaboration/root-task-team-terminal-publication.test.ts \
 tests/unit/services/agent-streaming/agent-collaboration-task-lifetime-projection.test.ts \
 tests/unit/services/agent-streaming/collaboration-public-tree-projection.test.ts \
 tests/unit/agent-collaboration/task-lifetime-tree-scope.test.ts \
 tests/unit/agent-collaboration/task-lifetime-quiet-generation.test.ts \
 tests/unit/agent-team-execution/flat-team-private-release-independence.test.ts --no-watch
```

- **Exit1:6files,1failed/5passed;54tests,1failed/53passed.** Failure is the exact two configured terminal callback assertion receiving[]. New file1fail1pass; counts overlap, not summed. Log `code-review-evidence/crr-006-terminal-publication-neighbors.log`; all sessions collected.
- `git diff --check` **exit0**; `crr-006-diffcheck.log`.
- Startup/released migration/strict DTO source diff against HEAD **0bytes**; `crr-006-unchanged-startup-contracts-migrations.diff`.
- Current supplied API production typecheck/build/startup and selected passes retained only for their actual scope, not a new reviewer whole-build/provider pass. Historical52-file/136-test/4-unhandled broad failure audit and initial invalid zero-test archive remain not fully certified.

## Classification / Routing

**Fail — Local Fix, implementation-owned.** Approved requirements/design already prescribe existing worker visibility/terminal state and distinguish private preparation from committed execution. No new product/design supplement, migration, responsibility revision or downstream acceptance waiver is needed.

Fresh completed-result handoff rules will select the most-specific failed API/E2E implementation-owned correction route. Sole owning recipient **Implementation Engineer**, complete cumulative package attached. No API advance, proportional successful-test gate, Delivery or informational Pass notification.

## Residual Risks / Latest Authoritative Result

- Current API-REV-004 remains **Fail /64.29%**, not rescored. Current review **CRR-006 Fail — Local Fix** supersedes CRR-005 as latest origin/disposition; original source findings' closures remain historical and valid in their bounded scope.
- Actual app proof uses Agent root hosting a Task Team, not concrete Team/Org root acceptance. Native+MCP/all-three-root/full recursive cascade/helper-Team/further delegation/private/materialization/late-input/approval/quiet/restored-descendant/Stop/failed exact retry/idempotence/reopen/restart/Manager/root/B/borrowed/history/data/startup joins remain incomplete.
- Requested AGY4.8 catalog and native remote host dependencies remain environment prerequisites, no silent substitution/source defect. Unsupported optional vendor sessionStore path remains excluded.
- Structural/size/legacy full audit and numerical score **N/A for focused failure-origin entry**, not inferred Pass. Supported scenario/material-premise gates **Pass for bounded attribution**, with no speculative required mechanism. Docs/user verification/finalization/deployment remain later.

### Fresh handoff-rule selection — CRR-006

Selected sole most-specific rule: **“When API/E2E failure-origin review confirms that the owning problem is an implementation defect.”** Exact recipient **`/software_engineering_team/implementation_engineer`**. Current Fail is not source Pass, API-owned correction, upstream recovery, successful-test review or Delivery. Complete cumulative failure package plus canonical report/history and independent evidence attached. Correction must return through Large/High source review and independent API/E2E. Delivery will be recorded only after tool confirmation.

### Confirmed handoff — CRR-006

`send_message_to` confirmed **accepted=true / DELIVERED** to sole owning recipient **`/software_engineering_team/implementation_engineer`**, AgentRun **`implementation_engineer_1e43277cb7f1437abb3cb117c3a3eba2`**. Full564-reference package, current report/history and self-contained bounded correction/remaining gate request delivered. Evidence: `code-review-evidence/crr-006-handoff-receipt.json`. Focused review ends after this required handoff; no extra recipient, Pass notification, Delivery or polling.
