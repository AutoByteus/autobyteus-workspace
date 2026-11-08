# Code Review Report — small-follow-ups-batch-426 (autobyteus-426), ticket round 2 (items 9, 20–23)

Ticket round 1 (items 1–19) passed code review at CRR-005, passed its test review at CRR-006, and was finalized on `personal` (`d785ded109`). Its findings (F-001…F-005, F-API-001/002) and its failure-origin round (CRR-003) are recorded in `code-review-revision-record.md` (CRR-001…CRR-006); the round-1 report text is in git history at `17281c492d`. This report holds the latest result: the review of ticket round 2.

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` § Round 2 Requirements (REQ-009, 020–023; AC-009a…d, AC-020…023; DEC-014…017)
- Investigation Notes Reviewed As Context: `investigation-notes.md` § Round 2 Investigation (E-09b, E-20…E-23, E-21b)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-009…SR-014)
- Design Spec Reviewed As Context: `design-spec.md` § Round 2 Design (D-09, D-20…D-23; SR-012 apply rules, SR-013 AC-020 forms, SR-014 revised D-21)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-004 with DEC-017)
- Relevant Solution Revision IDs: SR-009…SR-014
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-006…009; round-2 notes; § D-21 Re-Check)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-008, ARCH-REV-009
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-005)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-005
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-007`
- Current Review Round: `7` (the first review of ticket round 2)
- Review Scope: `Full Review` of the ticket-round-2 package
- Review Scope Evidence (round >1): round 2 is a new implementation package on a new base (`d785ded109`, round 1 finalized). Every round-2 change is reviewed in full; round-1 code is not re-reviewed.
- Trigger: IR-005. Commits D-09 `06cc2aabad`, D-20 `094c896407`, D-23 `23483d0cf8`, D-22 `c4521d4402`, D-21 `736b51f87a`; head `a3bc0525cd` (documents only).
- Prior Review Round Reviewed: CRR-006 (round-1 test review, Pass)
- Latest Authoritative Round: 7
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none.
  - The risk is High because of the new GraphQL read `agentRunCollaborationStatuses`, which the 5 s history poll calls on the desktop and phone surfaces, and the collaboration store's new states-only update path.
  - D-20 adds one error code to an existing contract.
  - D-21…D-23 are test and cleanup work.
  - None of the design's escalation triggers fired. The status read needs no snapshot connection (`getAgentStatuses` reads `getActive()?.getAgentStatusSnapshots()`). Contexts take a states-only update (`applyStatuses`). The payload measurement (AC-009a) belongs to API/E2E.

## Review Scope

- Changed implementation and behavior reviewed: D-09, D-20, D-21, D-22, D-23.
- Files / areas reviewed: `git diff d785ded109 736b51f87a` (32 files, +946/−58).
  - Read in full:
    - server: `standalone-agent-run-root-manager.getAgentStatuses` and `getActive`; `StandaloneAgentRunRoot.getAgentStatusSnapshots` (live and dormant offline children of `index.listChildAgents()`); the view projector's `agent_statuses` source (the same snapshots); `agent-run-collaboration.ts` (query, types, limit); `peer-client.fetchNodeId`; `peer-address-resolver.resultOf`; `RemoteCollaborationSettingsError`; the GraphQL mapping that spreads `details` into `extensions` (`remote-collaboration-settings.ts:68`); `web-origin.ts` and its two importers.
    - web: `agentRunCollaborationStore` (`contexts` shallowRef, `read`/`inspect`/`isCurrent`, `refreshListedStatuses`, `sameLocalChildren`); `AgentRunCollaborationContext` (constructor, `applyStatuses`, `isActive`); `agentRunCollaborationHydration.readAgentRunCollaborationStatuses`; `runHistoryStore.activeListedAgentRunIds` and `refreshTreeQuietly`; `useRunHistorySectionLoad` (`pollTick`, poll start/resume, window watch); `nodeConnectionErrorText` (`failureText`, `causeText`, attempts); `nodeSettingsError`; en/zh-CN `nodesPage` texts.
    - tests and probes: `shifted-clock.mjs`; `token-statistics-seed.mjs` (`tokenStatisticsFixturePlan`); `token-statistics-ui-probe.mjs`; `model-routing-settings-probe.mjs`.
  - Specs skimmed for scenario coverage: `agentRunCollaborationListedStatuses.spec.ts` (8 cases), `agentRunCollaborationStatuses.spec.ts`, `useRunHistorySectionLoad.spec.ts`, the server statuses and peer-client tests, and the `peer-host-refused` E2E.
- Explicit exclusions:
  - Round-1 code, finalized and reviewed.
  - `generated/graphql.ts`, which is codegen; only the new query was added.
  - I reran none of the recorded checks; IMP-R2-01…05 cover the current code.
  - Owed to API/E2E: the D-09 probes with the payload measurement (AC-009a…c), the AC-020 Nodes page probe step, the full server E2E and the fresh-start build (`generated/graphql.ts` is a build input).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `Yes`
- Design-spec behavior map verified against the implementation: `Yes`
- Design review report and round confirmed: ARCH-REV-008 Pass (D-09, D-20, D-22, D-23); ARCH-REV-009 Pass (revised D-21)
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none
- Remaining material ambiguity: none

| Behavior ID | Status | Current Implementation Path And Lifecycle Evidence | Notes |
| --- | --- | --- | --- |
| BEH-009 (D-09) | Confirmed | (see the four steps below) | Matches SR-012 / ARCH-REV-007 AR-005 rule for rule |
| BEH-020 (D-20) | Confirmed | `fetchNodeId`: identity-pending check → `403` with JSON `code === REMOTE_ACCESS_HOST_REFUSED` → `PEER_HOST_REFUSED {address, host}`; any other 403 → `PEER_NOT_AUTOBYTEUS` as before → `resultOf` → `host_refused` → GraphQL `extensions: {code, ...details}` → web `settingsFailureOf` reads `host` → `failureText` `PEER_HOST_REFUSED` (change address) / `causeText('host_refused')` (the connect flow's first attempt) → `cause.hostRefused` | `nodeIdentityProbe` unchanged (DEC-017; FU-004) |
| BEH-021 (D-21) | Confirmed | `--day` → 12:00 UTC instant → `--import shifted-clock.mjs` on the probe's own server only, `context.clock.setSystemTime` on every context before the app loads, the same `now` to the seed → `tokenStatisticsFixturePlan(now)` → derived coverage texts, TS-E2E-002 range and tick count | Every ARCH-REV-009 implementation note followed (midday instant; only no-arg `Date` and `Date.now` shift; browser clock before load; nothing preloaded without `--day`) |
| BEH-022 (D-22) | Confirmed | MRP-02 builds its expected texts from `APP_RUNTIME_NAMES` | — |
| BEH-023 (D-23) | Confirmed | `api/security/web-origin.ts parseWebOrigin`, identical to both removed copies; imported by `node-browser-access.ts` and `remote-access-request-origin.ts` | Behavior unchanged |

The BEH-009 (D-09) path:
1. **Poll.** `useRunHistorySectionLoad.pollTick` (interval and resumed poll only; not the first load or a window change) → `refreshTreeQuietly()` (never rejects) → `refreshListedStatuses(activeListedAgentRunIds)`.
2. **Selection.** Contexts with no stream, no inspection and no termination, that are listed active or have a live context. The open run has a stream, so it is excluded (AC-009d). No hosts → no request. A refresh in flight is joined, not repeated.
3. **Read.** One `GetAgentRunCollaborationStatuses` request (`network-only`, no deduplication), validated through `compactionRecoveryBlockSchema` → `getAgentStatuses` → `getActive()` (a registered root that `isActive()`; no restore, no snapshot connection) → `getAgentStatusSnapshots()`.
4. **Apply, per answer, in order.**
   1. Currency: the same context object, the same binding revision, no stream, inspection or termination; otherwise the answer is dropped.
   2. Both inactive → skip.
   3. Active state differs, or the child set differs (`sameLocalChildren`: the IDs and addresses equal `index.agents`, each once) → `inspect`.
   4. Otherwise `applyStatuses`, which updates the reactive child state, so the rows update.

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior | Kind | Actor | Goal / Event | Entry Surface | Shape | Forward Path | Expected Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-009 | BEH-009 | User/System | Desktop or phone user watching the run list; a delegated child's state changes on the node | See task rows of runs that are not open stay current | Runs view, Workspaces tree, phone list (5 s poll) | Normal | DS-010 as traced above | Row states within ≤ 2 polls; new child within one poll; offline after stop | REQ-009, AC-009a…d | Supported Normal | Use |
| SCN-020 | BEH-020 | User | Desktop user | Connect a peer addressed by a name its Host gate refuses | `addPeerNode`, Nodes page change address, the connect flow's resolution | Normal | as traced above | The distinct host-refused text | REQ-020, AC-020 (SR-013 forms) | Supported Normal | Use |
| SCN-021/022/023 | BEH-021/022/023 | Operational / Contract | Team probes; the node's origin rule | Probes pass on any day; current runtime names; one origin reader | Probe runs; server suites | Normal | as traced above | AC-021…023 | requirements | Supported Normal | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason / Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-R2-01 | A live context for a run no longer listed (outside the history window, or removed) keeps being asked | D-09 selection rule ("listed active **or** its context is live") | the run stops or leaves the list | the answer comes back inactive → one `inspect` → an inactive or null context → no longer selected | `refreshListedStatuses`; `read` sets null on a missing view | Reject | — | the designed rule ends in one read; it does not repeat |
| C-R2-02 | A live root with no local children is asked every poll | SCN-009 | normal | answer `[]` = index size 0 → `applyStatuses([])`, no view read | `sameLocalChildren` | Reject | — | negligible payload, as designed |
| C-R2-03 | The answer could name remote children, so every poll re-reads | AC-009a ("no view read without a change") | — | server `getAgentStatusSnapshots` lists live root and task-Team leaf agents plus dormant `index.listChildAgents()`, which is the same source as the view's `agent_statuses` the client index was validated against | `standalone-agent-run-root.ts:275-284, :429` | Reject | — | the sources match; API/E2E's "no view read on unchanged polls" will confirm it at runtime |
| C-R2-04 | D-21 moves coverage into the previous month on the 1st to the 4th; the design text says "fewer than three days (the 1st and 2nd)" | SR-014 / AC-021 | probe run on days 1–4 | a coverage start after the 1st leaves room for three distinct partial days only from the 5th on; the probe derives every affected expectation from the plan | `tokenStatisticsFixturePlan`; IMP-R2-02 (151 days, 0 failures); handoff BEH-021 row | Reject | — | the design's intent (three distinct days, derived expectations) is met; the boundary follows from it and is recorded |
| C-R2-05 | `causeText` accepts `'host_refused'` beside `NodeProbeCause` | D-20 (DEC-017: the window probe never produces it) | the connect flow's first attempt | an attempt result from this node's server, not a window probe cause | `nodeConnectionErrorText.ts:19-22, :58-61` | Reject | — | the right owner for attempt texts; the window probe is unchanged as decided |
| C-R2-06 | The shifted clock replaces global `Date` in the probe's server process | D-21 test-only rule (DESIGN rule 11) | `--day` only | only the probe-spawned server under `--import`; `new Date(v)`, `Date.UTC`, `Date.parse` and `instanceof` unchanged | `shifted-clock.mjs`; ARCH-REV-009 notes | Reject | — | test-only and bounded as reviewed |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Round-2 design: new read on existing owners; one error kind; test and cleanup items | — |
| Matches behavior-defining supplements | Pass | REQ-020 text verbatim (en); zh-CN translated | — |
| Data-flow spine preservation | Pass | DS-010 as designed: poll owner → history store → collaboration store → typed read → root manager → context | — |
| Ownership boundary preservation | Pass | The apply rules live in the collaboration store; the context owns `applyStatuses`; the poll owner only sequences | — |
| Off-spine concern clarity | Pass | `readAgentRunCollaborationStatuses` sits beside `readAgentRunCollaboration` in the hydration module | — |
| Existing capability reuse | Pass | Reuses the store's `isCurrent` currency fields, `inspect`, single-flight pattern and the existing error-extension mapping | — |
| Reusable owned structures | Pass | One `CollaborationChildStatus` for the view's and the poll's statuses; one `parseWebOrigin` | — |
| Shared-structure tightness | Pass | The client shape has 4 fields; the view's snake_case is mapped once in the constructor | — |
| Repeated coordination ownership | Pass | One refresh owner; one refresh in flight | — |
| Empty indirection | Pass | — | — |
| SoC / file responsibility | Pass | — | — |
| Dependency direction | Pass | The poll owner reads `activeListedAgentRunIds` from the history store and passes it to the collaboration store; the stores do not call each other | — |
| Authoritative Boundary Rule | Pass | The resolver goes through the manager's public `getAgentStatuses`; the store calls the context's public `applyStatuses` | — |
| File placement | Pass | `web-origin.ts` sits beside its two importers in `api/security` | — |
| Flat-vs-over-split | Pass | — | — |
| Interface clarity | Pass | `agentRunCollaborationStatuses(runIds)` serves one subject (standalone host runs) with explicit `isActive`, and is bounded at 100 | — |
| Naming / one vocabulary | Pass | `PEER_HOST_REFUSED` / `host_refused` / `hostRefused`; `CollaborationChildStatus` | — |
| No unjustified duplication | Pass | The duplicate `parseWebOrigin` and the constructor loop are removed | — |
| Patch-on-patch control | Pass | — | — |
| Dead code removed in touched files | Pass | The removal plan is done; no new dead code | — |
| Test scenarios and assertions clear | Pass | The 8 listed-statuses cases map to AC-009a/b/d and to each apply rule | — |
| Test fixtures/helpers coherent | Pass | `tokenStatisticsFixturePlan` is exported and the probe reads it | — |
| No stale/duplicated tests | Pass | MRP-02 constant replaced; TS-E2E constants derived | — |
| API/E2E readiness | Pass | The handoff lists the probes, the payload measurement, the AC-020 probe step, the server E2E and the fresh build | — |

## Source File Size And Structure Audit

Effective lines = non-blank, non-comment.

| Source File | Before | After | `>500` | `>220` Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/agentRunCollaborationStore.ts` | 315 | 358 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/services/agentCollaboration/agentRunCollaborationContext.ts` | 334 | 348 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/stores/runHistoryStore.ts` | 486 | 488 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-server-ts/src/standalone-agent-run-root/services/standalone-agent-run-root-manager.ts` | 406 | 418 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-server-ts/src/api/graphql/types/agent-run-collaboration.ts` | 86 | 119 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-server-ts/src/remote-collaboration/channel/peer-client.ts` | 283 | 292 | Pass | Pass | Pass | Pass | — | — |
| other changed source files | — | small | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | — |
| No legacy old-behavior retention | Pass | — |
| Dead code removed in touched files | Pass | — |
| Persisted-data decision followed | Pass | `Not Affected`: reads only |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match design | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: a new GraphQL read on the history poll (the collaboration/run-history docs describe the poll), and a new peer error kind.
- Files or areas likely affected: the web docs on run history and agent collaboration, and the Nodes page error texts. Delivery syncs them.

## Additional Material Premise Validation

| Premise ID | Status | Note |
| --- | --- | --- |
| D-09 escalation (payload above bound / a status read that needs the snapshot connection / a context that cannot take a states-only update) | Confirmed not fired (code) | The payload is measured by API/E2E (AC-009a) |
| E-21b (the server recomputes presets from its own clock) | Confirmed | Addressed by the preload (ARCH-REV-009) |
| DEC-017 (the window probe cannot read a Host-gate refusal) | Confirmed | `nodeIdentityProbe` unchanged; FU-004 |

New or reclassified premises: `None`.

## Review Scorecard (Mandatory)

- Overall score: `9.4/10` (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-010 is implemented node for node | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | The rules sit in the collaboration store, the state change in the context, the sequencing in the poll owner | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | A typed, bounded, single-subject query; one client status shape | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | — | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | `CollaborationChildStatus` is one shape; `parseWebOrigin` has one owner | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | Clear comments name each rule and its source | — | — |
| 7 | API/E2E Readiness | 9.3 | Specs cover each apply rule; the handoff lists the probes | the payload and the "no view read on unchanged polls" need runtime proof | API/E2E |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 | The currency, inactive, child-set and single-flight rules match ARCH-REV-007/008; the server and view status sources are the same | runtime proof owed (AC-009a…c, AC-020 probe step) | API/E2E |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | — | — | — |
| 10 | Cleanup Completeness | 9.5 | The removal plan is done | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None. FU-004 (from the Solution Designer, DEC-017) stands.

## Classification

- None. The review passes.

## Recommended Recipient

- `/software_engineering_team/api_e2e_engineer` (primary pass handoff), then an informational notice to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- AC-009a: the measured bytes per poll and "no `agentRunCollaboration` view read on a poll without a change" are runtime facts for API/E2E.
- AC-009c: on the phone, polling and therefore the status read run only while the list is shown (the inherited poll rule).
- AC-020: the Nodes page probe step covers change address and the connect flow's resolution. The typed add at a refused name keeps "can't reach" (DEC-017, FU-004).
- The `peer-host-refused` server E2E is skipped, with its reason, when `lvh.me` does not resolve to loopback. API/E2E should record whether it ran.
- The fresh-start desktop build is owed (`generated/graphql.ts`).

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (ticket round 2, Full Review)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 average. Every category is at or above 9.3.
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: D-09 follows ARCH-REV-007/008's apply rules exactly. D-20 follows the SR-013 forms. D-21 follows SR-014 and every ARCH-REV-009 note. D-22 and D-23 are as designed. Medium / High is unchanged.
