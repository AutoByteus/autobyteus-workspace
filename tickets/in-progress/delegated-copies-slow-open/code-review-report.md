# Code Review Report — delegated-copies-slow-open

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `tickets/in-progress/delegated-copies-slow-open/requirements-doc.md` (SR-002, Approved)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (through the design spec's Current-State Read and Evidence table)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-004)
- Supplemental Task Artifacts Reviewed As Context: `probes/open-cost-probe.test.ts`, `probes/probe-run1.txt` (baseline evidence only)
- Relevant Solution Revision IDs: SR-002 (requirements), SR-004 (design)
- Design Review Report Reviewed As Context: `design-review-report.md` (round 2, Pass; implementation notes 1–3, R-B, R-C, MP-001)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `tickets/in-progress/delegated-copies-slow-open/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation handoff IR-001 from `/software_engineering_team/implementation_engineer`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A — not applicable (implementation review)
- Relevant API/E2E Revision IDs: N/A
- Delivery Revision Record / IDs: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none. The code confirms the risk surface the design named: child-state loading moved from "complete before publish" to on demand (lifecycle/concurrency with live events, local sends and republication), plus one additive public GraphQL query. About 10 production files in the two named subsystems; no stream DTO, contracts `dist/`, storage or team/org hydration change.

## Review Scope

- Changed implementation and behavior reviewed: D-1..D-5 of the design at commits `c21d468d9e` (server), `291545c66f` (web), `54e5356ae6` (docs) against base `origin/personal` @ `5ceb43039a`; ticket commit `7d32c3aa2b` read for evidence.
- Files / areas reviewed:
  - Server: `api/graphql/types/agent-run-collaboration.ts`, `api/graphql/types/run-file-changes.ts`, `run-history/services/run-file-change-projection-service.ts`, `standalone-agent-run-root/services/standalone-root-member-view-projection-service.ts`, test `tests/unit/standalone-agent-run-root/standalone-root-member-file-changes.test.ts`.
  - Web: `services/agentCollaboration/{agentRunCollaborationHydration,agentRunCollaborationChildHydration,agentRunCollaborationContext,agentRunCollaborationStreamingService}.ts`, `stores/agentRunCollaborationStore.ts`, `services/runHydration/{memberRunStateHydration,teamMemberProjectionHydrationService,teamRunContextHydrationService}.ts`, `services/agentOrgExecution/agentOrgContextHydration.ts`, `services/agentStreaming/handlers/userMessageProjection.ts`, `graphql/queries/collaboratorQueries.ts`, the generated-query splice, new/changed specs (`agentRunCollaborationLazyChildren.spec.ts`, `agentRunCollaborationChildHydration.spec.ts`, `agentRunCollaborationContext.spec.ts`, `agentRunCollaborationHydration.spec.ts`, mock updates), collapse probe, native-input-history harness.
  - Docs: web `agent_execution_architecture.md`, `chat.md`; server `standalone_agent_run_root.md`, `agent_artifacts.md`.
  - Evidence: IMP-01..IMP-09 (Checks Run table; IMP-08 mutation log and IMP-09 request summary read directly).
- Explicit exclusions: AC-008 timings, server GraphQL E2E for the new query and the isolated desktop instance (API/E2E stage). No recorded check was rerun: the code they exercise has not changed since they ran, and no finding needed a new check.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: rows from the view alone (REQ-001), hub opens without copy loads (REQ-002), a copy's details on open, once per kept view, complete (REQ-003), scoped artifact read (REQ-004), statuses/summaries unchanged (REQ-005), live updates incl. pending input and sending (REQ-006), no reload of other copies on a new delegation (REQ-007).
- Design-spec behavior map verified against the implementation: yes, DS-001..DS-005 traced in code (below).
- Design review report and round confirmed: round 2 Pass (ARCH-REV-002). Implementation notes honored: `RunFileChangeEntryObject` exported; `isPublished()` checked after the fetch and synchronously before commit (`agentRunCollaborationChildHydration.ts` L94/L97, then the synchronous block L101–124; mutation M1 catches its removal); R-003 re-search recorded in the handoff.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none. The pending-input overlay (handoff Assumption 2) preserves existing behavior REQ-006/AC-006 rather than adding behavior (see CAND-002).
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `inspect` → `readAgentRunCollaboration` → `buildAgentRunCollaborationContext` (index + one Offline `createChildContext` per child; workspace resolved once per root; no member I/O) → `publish` → `taskRows`. Spec `it.each([5, 50])`: one view request, zero member requests, zero `GetRunFileChanges`. | — |
| BEH-002 | Confirmed | `syncHost` → `inspect`/`attach` → `publish` without commit; selection of the host (`selectChild(host, null)`) starts no load. | — |
| BEH-003 | Confirmed | `selectChild` → `ensureChildHydrated` (store; `WeakMap<context, Map<child, Promise>>`) → `hydrateAgentRunCollaborationChild` → member projection + `GetAgentRunCollaborationMemberFileChanges` in parallel → `isPublished` + revision checks → reconcile (if live) → `commitMemberRunStates` → overlay pending → conversation/baselines → `markChildHydrated`. Server: resolver → `StandaloneRootMemberViewProjectionService.getFileChanges` → `requireLocation` (hub-scoped) → `getLocatedCollaborationMemberProjection`. | — |
| BEH-004 | Confirmed | `applyEvent` → `checkpoint_required` → reconnect → snapshot → build → `publish` (`prepareLocalContextAdoption` carries a hydrated child's conversation, resets/overlays pending, no hydrated mark) → `ensureChildHydrated(selected)`. Spec: one extra projection and one extra file-change request, zero view requests. | — |
| BEH-005 | Confirmed | Statuses/input states applied in the context constructor from the view (unchanged); Task summaries untouched; closure/disclosure specs unchanged and green (IMP-04, IMP-05c). | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, BEH-005 | User | User | See a hub's copies | Workspaces sidebar hub row mount | Normal | DS-001 | Rows from one view request | requirements SCN-001; screenshots; code | Supported Normal Scenario | Use |
| SCN-002 | BEH-002 | User | User | Work in the hub | Click the hub run | Normal | DS-001 sync path | Hub conversation without copy loads | requirements SCN-002 | Supported Normal Scenario | Use |
| SCN-003 | BEH-003 | User | User | Look at / talk to one copy | Copy row click, Task locate, send | Normal | DS-002, DS-003, DS-005 | That copy's complete details on demand, scoped server read | requirements SCN-003 | Supported Normal Scenario | Use |
| SCN-004 | BEH-004 | System | Hub agent (`delegate_task`) / user (Settings Save) | New copy or settings Save while a running hub is shown | Stream `task_execution_started` / `delegated_launch_selections_changed` | Normal | DS-004 | New row; opened copy keeps content; selected copy refreshed only | requirements SCN-004 | Supported Normal Scenario | Use |
| SCN-005 | BEH-005 | User | User | Know each copy's Task | Rows shown | Normal | batched Task summary read (unchanged) | Summary per Task row | requirements SCN-005 | Supported Normal Scenario | Use |
| MP-001 | BEH-003, BEH-004 | User | User | Open a copy of a hub that is not the selected run (click causes run selection → republication during the load) | Copy row click | Normal | design MP-001 path | First load superseded, new context loads once | design-review-report MP-001 (Reachable) | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CAND-001 | Handoff Assumption 1: live-tool authority read at commit time instead of captured before the fetch and compared | SCN-003 on a running hub; SCN-004 | Stream snapshot publishes, then the service sets `phase = 'ready'` (`agentRunCollaborationStreamingService.ts` L186–188) | A load started in `publish` always sees authority false→true; a comparison would force a wasted retry on every snapshot. Live events during the fetch already bump the presentation revision (retry); republication supersedes; reconciliation keeps only advanced live tool states | code; IMP-04 `ready=true|false` cases | Reject (as a finding) | — | Sound implementation choice inside DS-005; no consequence on a supported path. Accepted. |
| CAND-002 | Handoff Assumption 2: `overlayPendingUserMessages` at commit and pending reset/overlay in carry-over | REQ-006 / AC-006 preserved behavior (held/queued input) | View `agent_input_states` applied at construction (D-1) to the empty Offline conversation; the load then replaces that conversation | Without the overlay, held/queued input of an opened copy disappears on open; before this change, staging loaded the stored conversation first and the constructor applied input states on top. The overlay reuses the extracted `applyPendingUserMessage`, the same merge as `upsertPendingUserMessage` | code; IMP-07 (real native producer); IMP-08 M2/M3 | Reject (as a finding) | — | Required to preserve approved behavior with no new state or API; one shared merge rule. Accepted. |
| CAND-003 | Retry exhaustion: a copy whose presentation revision changes during three consecutive fetches fails its load | SCN-003 (open a running, active copy) | User opens an actively working copy | Load throws after 3 attempts, warns, child stays unloaded; reselecting retries | Same policy as `teamMemberProjectionHydrationService.ts`; the revision bumps only when the presentation witness changes (`recentEventMonitorMutationCoordinator.ts` L46–70), not per token; design D-2 approved it; no evidence of exhaustion in IMP-09 | Reject | — | Approved, precedent-backed policy; no evidence of a material consequence. Kept as a residual risk for API/E2E observation on a live hub. |
| CAND-004 | `hydratedChildren` is a plain (non-reactive) `Set` | Engineering contract (design ownership map: context owns the hydrated set) | — | Only the store and adoption read it; no UI consumer (R-003 re-search) | code search | Reject | — | No reachable consequence. |
| CAND-005 | Member view service resolves `RunFileChangeProjectionService` lazily per call (`injected ?? get…()`) while `agentViews` is resolved in the constructor | Engineering contract (DI convention) | — | Matches `RunFileChangeProjectionService`'s own "resolved per call" convention | code | Reject | — | Style only; no consequence. |
| CAND-006 | P-001 cold host selection issues `GetAgentRunCollaboration` twice | SCN-001/SCN-002 | Probe host selection | Row mount inspect, then host selection `syncHost` → inspect; drawing the rows still uses one view request (AC-001) | IMP-09 request summary | Reject | — | Within AC-001 and AC-003. Correction (CRR-002): API/E2E showed the base issued one view request on a hub click and the fix two. The duplicate trigger lives in code this ticket does not touch, and the base's slow staging masked it. Recorded as follow-up TFU-2 in `api-e2e-test-review-report.md`. |
| CAND-007 | A just-sent local message before a post-publication load starts (send → attach → snapshot → publish → new load) | SCN-003 send to a copy of a stopped hub | User sends to an opened copy of a stopped hub | The carried conversation keeps the local message; the server's accept emits presentation events that bump the revision and retry the load; the old code replaced the conversation with the staged snapshot outright | code (`submit`, adoption, D-2) | Reject | — | Not a regression: equal to or better than base behavior; no evidence of loss. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Boundary-or-ownership root cause addressed: publication no longer owns child loading; scoped artifact read uses the compound identity | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | No behavior-defining supplements; probes are evidence only | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001..DS-005 traceable one-to-one in code | — |
| Ownership boundary preservation and clarity | Pass | Store owns triggers, dedupe and `isPublished`; child hydration owns sequencing and holds no dedupe state; context owns the hydrated set and adoption | — |
| Off-spine concern clarity | Pass | Reconciliation, baselines, `commitMemberRunStates`, workspace resolution reused off-spine | — |
| Existing capability/subsystem reuse check | Pass | `memberRunStateHydration`, `reconcileTeamMemberToolState`, `RunFileChangeProjectionService`, member view service extended, not re-created | — |
| Reusable owned structures check | Pass | `getLocatedCollaborationMemberProjection` is the single active-vs-stored implementation (run-id path reuses it); `applyPendingUserMessage` shared by upsert and overlay | — |
| Shared-structure/data-model tightness check | Pass | `fetchMemberRunState` single explicit input shape (`runId` removed, no hidden default); `RunFileChangeEntryObject` reused unchanged | — |
| Repeated coordination ownership check | Pass | One dedupe owner; policy duplication with the team precedent is the accepted FU-1 | — |
| Empty indirection check | Pass | Resolver is a thin transport facade as designed; `getFileChanges` adds location policy | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | New `agentRunCollaborationChildHydration.ts` holds one load and its two fetches; builder is structure only | — |
| Ownership-driven dependency check | Pass | Child hydration does not import the store; streaming service does not import child hydration; member view service does not use the unscoped `CollaborationExecutionLocationService` | — |
| Authoritative Boundary Rule check | Pass | UI calls only store actions; resolver calls only the member view service | — |
| File placement check | Pass | Files sit in their owning subsystems | — |
| Flat-vs-over-split layout judgment | Pass | One new file next to staging/streaming | — |
| Interface/API/query/command boundary clarity | Pass | `agentRunCollaborationMemberFileChanges(hostRunId, memberAddress, agentRunId)` matches its sibling compound-identity queries | — |
| Naming quality | Pass | `buildAgentRunCollaborationContext`, `hydrateAgentRunCollaborationChild`, `ensureChildHydrated`, `overlayPendingUserMessages` describe their roles | — |
| No unjustified duplication | Pass | `fetchProjection` moved, not copied | — |
| Patch-on-patch complexity control | Pass | Clean replacement of staging; no layered fixes | — |
| Dead code removed in the touched files and modules | Pass | `stageAgentRunCollaborationContext`, `commit`, `activityRevisions`, private `workspaceRootPath`, dead `addContextsForNewChildren`/`commitTree` and their imports removed; search finds no remaining references | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Tests (a), (b), (c) map to AC-001/002/004/006/007/009 and AR-001; request counts asserted exactly | — |
| Test fixtures/helpers reusable, structure coherent | Pass | `multiTeamView`/`memberId` fixture reused; `holdChild` gate helper | — |
| No stale, duplicated, or compatibility-only tests | Pass | Staging spec rewritten; obsolete commit expectations removed from mocks | — |
| API/E2E readiness | Pass | Real-stack collapse probe passes; scoped query ready for GraphQL E2E and large-hub timing | — |

## Source File Size And Structure Audit

Effective non-empty lines, base → after; delta = added + removed lines.

| Source File | Before | After | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| web `agentRunCollaborationContext.ts` | 353 | 349 | Pass | Pass (64) | Pass | Pass | — | — |
| web `agentRunCollaborationStore.ts` | 288 | 307 | Pass | Pass (46) | Pass | Pass | — | — |
| web `agentRunCollaborationHydration.ts` | 120 | 54 | Pass | Pass (98) | Pass | Pass | — | — |
| web `agentRunCollaborationChildHydration.ts` (new) | 0 | 119 | Pass | Pass (127) | Pass | Pass | — | — |
| web `agentRunCollaborationStreamingService.ts` | 251 | 247 | Pass | Pass (18) | Pass | Pass | — | — |
| web `userMessageProjection.ts` | 143 | 156 | Pass | Pass (25) | Pass | Pass | — | — |
| web `memberRunStateHydration.ts` | 51 | 52 | Pass | Pass (11) | Pass | Pass | — | — |
| server `run-file-change-projection-service.ts` | 127 | 134 | Pass | Pass (20) | Pass | Pass | — | — |
| server `standalone-root-member-view-projection-service.ts` | 104 | 121 | Pass | Pass (20) | Pass | Pass | — | — |
| server `agent-run-collaboration.ts` | 85 | 95 | Pass | Pass (11) | Pass | Pass | — | — |

Team/org callers, `run-file-changes.ts` and `collaboratorQueries.ts` are mechanical or small additions; `generated/graphql.ts` is generated.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No flag, no optional `hostRunId` on `getRunFileChanges`, no default fetcher |
| No legacy old-behavior retention in changed scope | Pass | Eager staging removed outright |
| Dead code removed in the touched files and modules | Pass | See structural check |
| Approved persisted-data transition decision is followed | Pass | `Not Affected`; reads only |
| No version-specific dual reads/writes or old-shape fallback | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes` — already done in `54e5356ae6`.
- Why: the Agent-root hydration lifecycle and the artifact source for copies changed; a new query was added.
- Files updated: web `docs/agent_execution_architecture.md`, `docs/chat.md`; server `docs/modules/standalone_agent_run_root.md` (incl. R-B live-vs-stored note), `docs/modules/agent_artifacts.md`. Content matches the code.

## Additional Material Premise Validation

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001 | Confirmed | Implemented as designed: the store keys loads by (context, child); `isPublished` supersedes L1; L2 commits. Spec "republication by inspection during a load" and the two stream-snapshot variants; mutations M1, M5. |

No new or reclassified premises.

## Review Scorecard (Mandatory)

- Overall score: `9.4/10` (`94/100`), simple average for visibility only.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Every spine in the design maps to a short, readable code path | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Single dedupe owner; hydration takes `isPublished`/authority as inputs; no store import; scoped server owner | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Compound-identity query consistent with siblings; explicit fetcher input | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Builder, loader, context, store each own one concern; all files well under limits | — | — |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.3 | One active-vs-stored implementation; shared pending merge rule | On-demand policy duplicated with the team precedent (accepted FU-1) | Extract the shared core under FU-1 |
| 6 | Naming Quality and Local Readability | 9.4 | Names match responsibilities; comments explain supersession and carry-over | — | — |
| 7 | API/E2E Readiness | 9.2 | Unit, mutation and real-stack probe evidence; request counts asserted | Large-hub timings and GraphQL E2E for the new query still ahead (expected) | API/E2E per handoff hints |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.2 | Supersession, conflict retry, pending-input preservation and carry-over verified by tests and mutations | Retry-exhaustion on a very busy copy is an accepted policy (CAND-003) | Observe on a live hub in API/E2E |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean cut; rejected compatibility options not reintroduced | — | — |
| 10 | Cleanup Completeness | 9.5 | Dead parameters, names and private methods removed with evidence | — | — |

## Findings

None.

## Follow-ups

| Follow-up ID | What is wrong, where | Evidence | Why it is outside this ticket | Suggested Task description |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

- Sent to: `None` from this review. The generated-types drift (`autobyteus-web/generated/graphql.ts` behind the server schema) is already reported by the implementation engineer for the Project Task manager; FU-1..FU-4 were sent upstream by the Solution Designer. No new follow-up.

## Classification

- No classification: the review passes.

## Recommended Recipient

- `/software_engineering_team/api_e2e_engineer` (primary pass), with an informational notice to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- AC-008 / QR-001 / QR-002 timings on a large hub (≥50 task Teams, ≥300 unrelated stored runs), ASM-001 (app wall time) and R-002 (hub message payload) are not yet measured.
- The new query is covered at unit level; GraphQL transport E2E (stored hub, running hub, foreign child rejected) is still required.
- CAND-003: opening a very busy live copy could exhaust three conflict retries (logged; reselect retries). Worth observing in the live-hub scenario.
- R-004 (accepted): up to two loads when opening a copy under a non-selected hub.
- R-E (accepted): until a copy loads, its center view shows the empty or previous conversation.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (MP-001 confirmed; no new premises)
- Score Summary: 9.4/10; every category ≥ 9.2
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: handoff Assumptions 1 and 2 are accepted as sound implementation-level decisions (CAND-001, CAND-002). Classification Medium/High is preserved.
