# Code Review Report

## Review Round Meta

Latest round (round 2, `CRR-002`): **API/E2E Failure-Origin Review** of API-REV-001 (Fail: F-1, F-2). The round-1 implementation review below (`CRR-001`) stays as the structural baseline. This round updates only the affected findings, score rationale, classification and latest result; it does not repeat the full audit.

- Review Entry Point (round 2): `API/E2E Failure-Origin Review`
- Current Code Review Revision ID: `CRR-002`
- Review Scope (round 2): `N/A` (failure-origin round)
- Trigger: API/E2E engineer, API-REV-001 Fail
- Source under test: `4773d95936` (implementation `6b46ec5bdd`); tests `443f1c2c0f`; reports and evidence `1967262a0d`
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md` (Findings, AC proof, Cases)
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Failing Scenario IDs: F-1 (TF-02, TF-03; AC-010), F-2 (TFU-03; AC-003, DS-007 a, N-8)
- Exact Failing Commands / Execution Mode:
  - F-1: `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<wt>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-team-runs/team-run-follows-definition.e2e.test.ts --no-watch`
  - F-2: `node tickets/in-progress/team-run-follows-definition/probes/team-follows-ui-probe.mjs --output-dir <dir>` (built backend, nuxt dev, Chromium, scripted AGY)
- Failure Evidence Paths: `evidence/API-TF/TF-02.json` (`byRunId`), `evidence/API-TF/TF-03.json` (`refusedByRunId`), `evidence/API-TF/API-TF-run.log`, `evidence/API-TFU/TFU-03-b-while-leaving.png`, `evidence/API-TFU/team-follows-ui-evidence.json` (`cases["TFU-03-observed"]`), `evidence/API-TFL/TFL-02.json`
- Project testing guideline applied: root `TESTING.md` (as the coverage investigation records); no conflict

Round 1 meta follows.

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved; SR-005/SR-006; REQ-001..REQ-009, AC-001..AC-010, DEC-001..DEC-009)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (IF-01..IF-20, AF-01..AF-18), through the design's and the design review's citations
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (through SR-008)
- Design Spec Reviewed As Context: `design-spec.md` (SR-008, Ready)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001..FU-003); design § Exact Texts (behavior-defining notice and refusal texts)
- Relevant Solution Revision IDs: SR-005 (approval), SR-006, SR-008 (design after ARCH-REV-001)
- Design Review Report Reviewed As Context: `design-review-report.md` (round 2, Pass; notes N-5..N-10; MP-04)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001 (Fail), ARCH-REV-002 (Pass)
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Trigger: Implementation complete (IR-001), from the implementation engineer
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- API/E2E and delivery records: N/A (implementation review)

Code reviewed: worktree `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition`, branch `codex/team-run-follows-definition`, `git diff a54485a260..6b46ec5bdd` (`19b31ad365` server core, `6b46ec5bdd` tests, leaving-member fix, web, docs). Ticket documents at `240b5fd827`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. The change spans 74 source files (+1257/−237): team execution, collaboration, communication, the persisted tree, the view stream contract and the web. Live membership becomes mutable in a running root, and the persisted tree gains fields. This matches the design.

## Review Scope

- Changed implementation and behavior reviewed: DS-001..DS-007, D-SCOPE, D-RETIRE, D-LIVE-RULES, D-FORMER, D-INVALID, the exact texts, and notes N-5..N-10. Every server, contract and web source file in the diff, plus the docs and glossary diff (spot check) and the new and changed unit tests that the conclusions rely on.
- Code I read outside the diff to confirm paths:
  - The activation planner `configured-agent-activation-planner.ts:122-155`: `restore` with no conversation plans `new`, so a rejoined member that never started starts cleanly.
  - `configured-agent-execution-handle.ts:293-327`: `releaseRuntime` clears the run, so a leaving member's retire loop ends once the team itself is released.
  - The definition-change signal and `agent-package-definition-feed-composition.ts:42-47`: every package reload, app save and personal-settings announcement reaches the listener.
  - The other tree writers (`team-run-selection-mutator.ts:88-106`, the catalog service): `formerMembers` and `copiedFrom` are kept by spread.
  - `normalizeCollaborationHandoffs`: it validates and does not reorder, so an unchanged definition plans nothing.
  - `team-root-memory-source.ts:52-58`: the Memory page lists former members through the location service.
- Explicit exclusions: real-runtime behavior (AutoByteus/Codex, delegated copies, restart, the rendered AC-009 probe), which belongs to API/E2E. I did not rerun the recorded checks IMP-01..IMP-09: nothing they exercise changed after they ran, and no finding needs a new check.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: a standalone Team run or a Team-definition copy follows its definition, live and at restore. Added members start Offline and lazily. Removed members retire: they are refused with the exact text, their history is kept, and a busy one finishes its turn first. Coordinator and rules are current, and `get_handoff_rules` reads them. Every remaining member gets one net notice. The open view adds and drops rows. An invalid definition leaves the run unchanged.
- Design-spec behavior map verified against the implementation: Yes (table below).
- Design review report and round confirmed: ARCH-REV-002 Pass; N-5..N-10 implemented (see structural checks).
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None
- Remaining material ambiguity: None

| Behavior ID | Status | Current Implementation Path And Lifecycle Evidence | Contradicting / New Evidence |
| --- | --- | --- | --- |
| BEH-001/002 add (REQ-001, REQ-004, REQ-005) | Confirmed | Live path: `TeamDefinitionChangeListener` → `followLiveTeamRun` → `planner.viewFor` (definition read and new-member launch outside any lock) → `RootTeamRun.followDefinition` → `TeamMembershipCommitter.follow`. The committer plans against the current tree inside `commitExecutionTreeMutation`, writes once, then runs `replaceTree` (tree, index and `membership.replace` together) and the followers. New members get a context and start lazily through `registry.getOrCreate` (run-ID keyed). | — |
| Stored follow (AC-004) | Confirmed | `agent-team-run-manager.ts` restore: `followStored` → write (`TEAM_RUN_DEFINITION_NOT_SAVED` unless committed) → materialize from the followed tree → `register` → `followedStored(change)` → `followLiveTeamRun` (N-1). | — |
| BEH-003 remove, DS-004, DEC-002 (REQ-002, AC-002, AC-003) | Confirmed | `TeamRunMembership.replace` marks removed members leaving, and the committer calls `teamRun.followMembership(left)`. `FlatTeamExecutionManager.applyMembership`/`tryRetire` stop a member at once if it has no handle or is idle; a busy one is stopped when quiescent, then the handle is removed, the member released, and `released()` publishes the view event. Own commands go through `getAgentForOwnCommand`. The engine checks the sender with `maySend` and the receiver with `isCurrentAgent`. | — |
| DEC-006 swap / DEC-007 rejoin | Confirmed | `planTeamMembershipChange`: another agent at the same address makes the old member former and adds a new one. A former member with the same address and agent comes back with its run ID (the latest one). The registry is keyed by agent run ID. A rejoin cancels a leave, or restarts in `restore` mode, which plans `new` when there is no conversation. | — |
| BEH-004 rules (REQ-003, AC-001, AC-008) | Confirmed | `MemberCollaborationContext.outgoingHandoffs` is a reader. For a team member it is `membership.handoffsOf(agentRunId)`; Org and standalone roots return their fixed lists. `get_handoff_rules` and the prompt's Handoffs section call it. The coordinator comes from `membership.teamNode`. | — |
| REQ-009, AC-010 refusal | Confirmed | `resolveMessageRecipient` checks `formerMemberAt` before both generic not-found throws. `deliverToRunId` uses `formerMemberByRunId`. `formerMemberRefusalMessage` matches § Exact Texts word for word, with `COLLABORATION_TARGET_NOT_FOUND`. An address now held by a current member resolves to that member. | — |
| DS-006 notice (REQ-006, AC-006) | Confirmed | `TeamChangeNoticeSource` (a platform notice source, registered in `platform-notice-sources.ts`) holds one net pending notice per remaining member, with the in-flight settle and return handled. Joined members are skipped. Its texts match § Exact Texts. The sender is recorded in memory. | — |
| DS-007 view (REQ-008, AC-009) | Confirmed | The `MEMBERSHIP` event makes `TeamViewSession.reenterLive` take a new in-band snapshot. The projector lists leaving members with `leaving: true` (an optional contract field). The web keeps, adds and drops contexts by run ID, shows the "Leaving" tag, and the address lookup prefers the current member (N-9). Run-tree rows refresh through `DelegationIndex.runPartsChanged`. | — |
| REQ-007 invalid definition | Confirmed | `viewFor` and `planOrWarn` log `TEAM_RUN_DEFINITION_NOT_FOLLOWED` naming the run and return null. The listener contains each root. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001/002, AC-001, AC-005 | User/System | Package author / app save | New member works in the same run | Definition reload → announce | Normal | DS-001 | Member Offline, starts on first message | requirements SCN-001 | Supported Normal Scenario | Use |
| SCN-002 | BEH-003, AC-002, AC-010 | User/System | Same | Member retires | Same | Normal | DS-001 + DS-004 | Refused; history kept | requirements SCN-002 | Supported Normal Scenario | Use |
| SCN-003 | DEC-002, AC-003 | System | Removed member mid-turn | Finish turn, then stop | Same | Explicit Edge | DS-004 | Own commands work; stopped when quiet | requirements SCN-003 | Supported Explicit Edge Scenario | Use |
| SCN-004 | BEH-004, AC-001, AC-008 | User/System | Same | Rules/coordinator follow | Same | Normal | DS-001, DS-005 | Current rules | requirements SCN-004 | Supported Normal Scenario | Use |
| SCN-005 | REQ-006, AC-006 | System | Committed change | Agents learn | Next input | Normal | DS-006 | One net notice | requirements SCN-005 | Supported Normal Scenario | Use |
| SCN-006 | REQ-008, AC-009 | User | User watching the team | See current members | Open Team view | Normal | DS-007 | Rows follow live | requirements SCN-006 | Supported Normal Scenario | Use |
| AC-004 | REQ-004/005 | User | User reopens a stopped run | Current members after reopen | Restore | Normal | DS-002 | Followed before materialize | requirements AC-004 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | A rejoined member that never started gets `activationMode: "restore"` | DEC-007 | Member added, removed, then added back before it ever started | `resolvePlan` with `restore` and no conversation activity plans `new` (native) or `new` for external with no binding | `configured-agent-activation-planner.ts:133-153` | Reject | — | No defect: it starts fresh |
| C-02 | `tryRetire` never checks the manager's lifecycle; it might retry every second forever after the team stops while a member is leaving | SCN-003, then the user stops the team | User Stop during a long turn of a removed member | Team release calls `handle.releaseRuntime()`, which sets `agentRun = null` on success. The next `tryRetire` gets `completedLocalTermination` or no handle, so it counts as stopped, is released and the loop ends. | `configured-agent-execution-handle.ts:293-327`; `flat-team-execution-manager.ts:179-187` | Reject | — | The loop ends. Only a stop that keeps failing loops, which is the implementation's declared residual risk (infrastructure failure) |
| C-03 | An unchanged definition might plan a change on every announcement if stored handoffs were normalized differently | D-TRIGGER (idempotent) | Any announcement | `normalizeCollaborationHandoffs` validates only and does not reorder or merge, so the comparison is stable | `collaboration-handoff.ts:25-60` | Reject | — | Not reachable |
| C-04 | A follower step that throws after commit skips the remaining steps (notices, rows, publish) | Committer ordering | A follower throws | The followers are in-memory calls (notice map, cache delete and listeners with their own try/catch, publish). No supported trigger makes them throw. | committer `applied`; `delegation-index.ts` `runPartsChanged` | Reject | — | Declared residual risk; no supported trigger |
| C-05 | Deviation 1: `team-run-history-service.ts` history items list only current members | REQ-002 ("no longer shown as a current member … history stays readable") | User browses run history | Former members stay reachable: the Memory page lists them (`team-root-memory-source.ts` via the location service), lookup by run ID works, the Team tab keeps their messages, and delegation `agentsOf` includes them | Code read | Reject | — | Consistent with REQ-002 and within the design's intent; the Solution Designer may record it in the design spec |
| C-06 | Deviation 2: new-member launch uses `LaunchUsabilityCheck` (agent default, then the run's launch) instead of `CollaboratorLaunchResolver` | DEC-005 | Member added | The two layers match DEC-005's text exactly. The resolver would add Model Router and catalog layers that DEC-005 does not ask for. | `team-membership-planner.ts` `launchOf` | Reject | — | Matches the approved decision |
| C-07 | The change separated `isOwnTeamAddress`'s doc comment from its method in `agent-org-execution-index.ts:93-97`; it now sits above `formerMemberAt` | Engineering contract (readability) | — | Cosmetic, no behavior | Code read | Reject (not blocking) | — | Moving one comment fixes it; noted under Residual Risks |
| C-08 | A user can focus a leaving member's row and try to message it; the server refuses (`RUN_NOT_FOUND`) | Design visibility decision (Leaving row stays so its approvals can be answered) | User selects the leaving row | This is the approved design: no new input to a leaving member | design § Member States | Reject | — | Approved behavior |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | The three membership copies are now one `TeamRunMembership` (context getters; `FlatTeamExecutionContext` keeps only the activation mode), and handoffs are read live | — |
| Implementation matches behavior-defining supplemental artifacts | Pass | Notice and refusal texts match § Exact Texts; net-merge per N-2 | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001..DS-007 visible in code in the designed call order; one owner per sequence (committer for live, manager for stored) | — |
| Ownership boundary preservation and clarity | Pass | Planner (scope, view, pure diff), committer (live ordering), membership (only `replace`/`release`), execution manager (handles only), notice source, listener | — |
| Off-spine concern clarity | Pass | Launch, run IDs, locked write, notices and window serve their owners | — |
| Existing capability/subsystem reuse check | Pass | Reuses `TeamRunPersistenceCoordinator`, the committer pattern, `AgentRunPlatformNotices`, `DelegationIndex`/`ChildRowsFeed`, `CollaborationHandoffCompiler`, `getOrCreate`. The launch deviation is justified (C-06). | — |
| Reusable owned structures check | Pass | `formerMemberRefusalMessage` is the one text used by both refusal paths; run-parts types extracted to `run-parts.ts` | — |
| Shared-structure/data-model tightness check | Pass | Optional `formerMembers` and `copiedFrom`; empty list written as absent; DTO `leaving?: true` only | — |
| Repeated coordination ownership check | Pass | One listener walks live roots; restore reuses `followLiveTeamRun` | — |
| Empty indirection check | Pass | `TeamRun`/`FlatTeamRunBackend.followMembership` forward along the existing root → backend → manager chain, as the design says | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | New `membership/` folder; authority checks in `team-run-member-authority.ts` | — |
| Ownership-driven dependency check | Pass | Allowed directions per design: listener → manager/planner; manager → planner; root → committer; no cycle (listener built in the supervisor) | — |
| Authoritative Boundary Rule check | Pass | `TeamRunMembership` is changed only through `replace` (from `replaceTree`) and `release` (from the execution manager); no caller edits it directly or builds its own member list | — |
| File placement check | Pass | Files placed as in the design's mapping | — |
| Flat-vs-over-split layout judgment | Pass | One new folder with five cohesive files | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `getAgent` (current), `getAgentForOwnCommand` (current or leaving), `formerMemberAt`/`formerMemberByRunId`; `maySend` vs `isCurrentAgent` required on every port | — |
| Naming quality and naming-to-responsibility alignment (Principle 15) | Pass | "Former member" and "leaving" are used the same way in code, stored field, DTO, glossary and UI | C-07 cosmetic |
| No unjustified duplication of code / repeated structures in changed scope | Pass | — | — |
| Patch-on-patch complexity control | Pass | Initial round. The two in-round fixes (microtask retire check, web snapshot drop) are small and in their owners. | — |
| Dead code removed in the touched files and modules | Pass | `FlatTeamExecutionContext.memberContexts`, `ConfiguredAgentExecutionRegistry.remove(address)` (now by run ID and used), two dangling comments in `root-team-run.ts` | C-07 adds a misplaced comment (cosmetic) |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Unit tests for the pure planner, planner scope, committer, membership, notices (net merge), the leaving member (approve, interrupt, retire, never-started), the index refusal, schema, history readers and view session. Integration reproduction covers live add/remove and restore. Web specs cover add/keep/drop and N-9. | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | `team-membership-test-collaborators.ts`; existing harnesses extended | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Constructor-only updates elsewhere | — |
| API/E2E readiness for the next workflow stage | Pass | The handoff lists real-runtime cases for each AC, including delegated, peer, not-followed and invalid | — |

N-notes check: N-5 within limits (below). N-6 `remote-team-run-starter.ts:36` passes `copiedFrom: "team_definition"`. N-7: the planner compiles `{ kind: "delegated_team" }` when `delegatedFrom` is set, with no mount-path reconstruction. N-8 is left for the AC-009 probe. N-9: registry keyed by run ID; `findConfiguredAgentByAddress` prefers the current member. N-10: `membership`, `changeNotices`, `membershipPlanner`, `definitionChanges` and `teamChangeNotices` are all required.

## Source File Size And Structure Audit (If Applicable)

Effective non-empty lines (raw `wc -l` in brackets), base `a54485a260` → `6b46ec5bdd`. The design's limits were set in raw lines.

| Source File | Before | After | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `agent-collaboration/delegation/delegation-index.ts` | 499 [548] | 490 [536] | Pass (not grown; raw within design's ≤548) | Pass | Pass (types moved to `run-parts.ts`) | Pass | — | — |
| `agent-team-execution/domain/root-team-run.ts` | 457 [495] | 465 [500] | Pass (raw meets design's ≤500) | Pass | Pass (authority moved to `team-run-member-authority.ts`) | Pass | — | — |
| `agent-team-execution/services/agent-team-run-manager.ts` | 457 [495] | 459 [497] | Pass | Pass | Pass (result builder moved) | Pass | — | — |
| `agent-execution/runtime/general-process-run-supervisor.ts` | 449 | 465 | Pass | Pass (+16) | Pass (composition wiring) | Pass | — | — |
| `agent-team-execution/local/flat-team-execution-manager.ts` | 289 | 338 | Pass | Pass (+61) | Pass (one cohesive leaving block) | Pass | — | — |
| New files (`membership/*`, `team-run-membership.ts`, `team-run-member-authority.ts`, `run-parts.ts`, `team-model-config-update-result.ts`) | 0 | ≤ 123 each | Pass | Pass | Pass | Pass | — | — |
| Remaining changed source files | — | — | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | A copy without `copiedFrom` follows by design (D-SCOPE, AF-13 measured); this is not a fallback |
| No legacy old-behavior retention in changed scope | Pass | Frozen arrays and copies replaced, not kept beside |
| Dead code removed in the touched files and modules | Pass | See structural row |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Directly Usable — No Migration`; tolerant optional fields; schema test IMP-03 |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | Locked write live; restore writes before materialize |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, done in this change
- Files: `agent_team_execution.md` (new § Membership Follows The Definition; fixed-topology statements rewritten; FU-001's sentence corrected), `agent_communication.md`, `collaboration_model.md`, `GLOSSARY.md` (Former member, Leaving, Follows its definition). I spot-checked the new section against the code, and delivery verifies the docs sync.

## Additional Material Premise Validation (When Required)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-01 | Confirmed | Own commands allowed for leaving members (`getAgentForOwnCommand`); "Leaving" row |
| MP-02 | Confirmed | `copiedFrom` recorded at creation and kept by every writer |
| MP-03 | Confirmed | Run-ID keyed handles |
| MP-04 | Confirmed | Followed runs compile from the definition; N-3 filter as designed |

No new premise drives a finding. C-01..C-08 are recorded in the gate above.

## Review Scorecard (Mandatory)

- Overall score: `9.4/10` (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | The live and stored spines each have one driver, and the committer orders plan, write, swap and followers exactly as designed | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | The three membership copies became one view, changed only by `replace`/`release`. Authority is extracted, and handles are owned by the execution manager. | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.4 | The current / own-command / former lookups are separate and named. The `maySend`/`isCurrentAgent` split is required on every port. | `followMembership(ids, released)` passes a release callback (a notification, acceptable) | — |
| `4` | `Separation of Concerns and File Placement` | 9.4 | New concerns live in `membership/`; the three large files stay within limits by moving cohesive blocks | `root-team-run.ts` sits exactly at the design's raw limit | Future growth goes to new owners |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.4 | Optional fields, written as absent when empty; one refusal text; run-parts types extracted | — | — |
| `6` | `Naming Quality and Local Readability` | 9.3 | Vocabulary is consistent and comments explain the rules | One doc comment misplaced by the change (C-07) | Move it back above `isOwnTeamAddress` |
| `7` | `API/E2E Readiness` | 9.3 | Clear real-runtime scenarios, an integration reproduction and restore follow | Real runtimes, peer copies and the rendered view are not yet exercised (API/E2E) | AC evidence |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.3 | Paths traced, including rejoin, swap, never-started, team stop while leaving, and idempotent announcements. Two real bugs were found and fixed with tests. | Concurrency with delivery rests on the designed swap ordering (DEC-002 accepts messages resolved before the swap) | E2E for AC-003 |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.6 | Clean replacement of the frozen copies; no dual paths | — | — |
| `10` | `Cleanup Completeness` | 9.4 | Dead fields removed; docs and glossary updated | C-07 | — |

## Failure-Origin Review (Round 2, CRR-002)

### Scenario basis

Both failing scenarios are approved behavior, triggered through the normal product path:
- F-1 (AC-010, REQ-009): a remaining member messages a removed member with `send_message_to(target_agent_run_id)`. Run IDs reach agents through the received message's sender run ID, which is a supported entry form of the tool. The design's call-site table lists this form ("`send_message_to` by run ID … refused with the former-member text") for both leaving and former members.
- F-2 (AC-003, DEC-002, design § Member States "Visibility" / AR-004): the user watches a running team while a busy member is removed. The design keeps the leaving member visible, tagged "Leaving", so its pending approval stays answerable.

The tests drive both through real triggers (built server, package file edit, the agent's own tool call, the rendered app), not synthetic calls.

### CR-001 — F-1: a run-ID message to a removed member never reaches the former-member refusal

- Established: `Read`, confirming API/E2E's `Reproduced` (TF-02, TF-03). Paths read: `global-agent-run-message-router.ts:77-140`, `root-team-run.ts:225-228`, `team-run-message-delivery.ts:164-172`, `active-collaboration-root-directory.ts:139-157`.
- Cause: the tool's run-ID path enters `GlobalAgentRunMessageRouter.deliver`. That routes through the sender's root only when `senderRoot.hasAgentExecution(target)` is true. `RootTeamRun.hasAgentExecution` checks `index.getAgent` (current members only) plus remote links. So a leaving or former member's run ID falls through to the cross-run path:
  - a former (stopped) member gets `TARGET_AGENT_RUN_NOT_ACTIVE`;
  - a leaving member, whose run is still active in the same root, gets `COLLABORATION_ROOT_NOT_ACTIVE`.

  The refusal added in `TeamRunMessageDelivery.deliverToRunId` sits behind that gate and is never reached on this path. Nothing is delivered in either case, so DEC-002's "receives nothing" holds, but REQ-009's refusal text and code do not.
- Invariant that should hold: every run ID the team root refuses by name (leaving and former) must route to the team root. The router's root gate and the root's refusal need the same view of "this run's agent".
- Origin: `Implementation defect`, together with a source-review gap. The design named the effect at `team-run-message-delivery.ts:163-168`. The implementation placed the refusal there but did not trace the tool's entry path; its reproduction (IMP-04) called `deliverToRunId` directly. My CRR-001 trace also started at `deliverToRunId` and not at the tool's router entry, so this was reasonably detectable in source review and I missed it.
- Watch-out for the fix (implementation decides the shape): `hasAgentExecution` has a second reader, `ActiveCollaborationRootDirectory.placeOf` (restart-resume placement). Widening `hasAgentExecution` to former members changes `placeOf` for them too. A narrower router question, or an explicit decision for `placeOf` (leaving: still this root's member; former: none), keeps the two readers deliberate.
- Required action: route leaving and former run IDs of a team run to that root, so `deliverToRunId` answers with the exact former-member text and `COLLABORATION_TARGET_NOT_FOUND`. Add a test that enters through the router or the tool, not `deliverToRunId`. The reproduction is TF-02/TF-03 in `tests/e2e/agent-team-runs/team-run-follows-definition.e2e.test.ts`.
- Scope: this ticket (REQ-009 / AC-010 fails without it).

### CR-002 — F-2: the "Leaving" visibility rule sits on a component no page renders

- Established: `Read` (`git grep` on base `a07767f4d0` and on HEAD), confirming API/E2E's `Reproduced` (TFU-03).
- Cause:
  - `components/workspace/team/TeamMembersPanel.vue` is imported by no page, layout or component, on the base branch and on HEAD; only its locale keys reference it. The rendered team member list is the run-tree rows (`WorkspaceStableExecutionRow.vue`, `workspace-team-member-<teamRunId>-<address>`). Those come from the run's file through `DelegationIndex`/`ownTreeOf` and drop a leaving member at the swap (N-8).
  - The server's view snapshot does list the member with `leaving: true` (correct). The web view state keeps its context and row model (correct). But no rendered surface shows that row model's members.
  - Design DS-007 (a) and AR-004 mapped the visibility rule onto `TeamMembersPanel.vue` and `teamExecutionTreeSelectors.ts`. N-8 treated the run-tree difference as "brief and expected". It is the only rendered list, and it lasts the whole leaving period: in TFL-02 a real Codex writer needed two approvals while leaving.
- Consequence: under DEC-002 a removed member whose tool waits for approval finishes only when the user approves. A user who is not already focused on it has no row to reach it, so it stays leaving until the team is stopped (TFU-03; TFL-02). This contradicts the design's visibility decision, which REQ-008/AC-003 rely on.
- Origin: `Design Impact`. The design chose a surface that does not exist in the rendered app, and the in-scope fix needs a design decision: which rendered surface shows a leaving member (for example the run-tree `team_member` rows, which would need the live leaving state, or another surface). It also needs a decision on whether N-8's "two pictures" still holds. This is not a bounded local fix.
- Review gap: also missed in source review. I accepted DS-007 (a)'s web mapping without checking that `TeamMembersPanel.vue` is mounted. Principle 7's dead-code check in touched files would have shown it: the component is unreferenced code in a file this change touched.
- Follow-on for the designer: `TeamMembersPanel.vue` is dead on base (no importer). This change added a tag to it. Whatever the redesign chooses, the touched dead component should be removed, or mounted if the design chooses it (Principle 7, touched file).

### Observations from the API/E2E report (not failures; for the Solution Designer)

- O-1: an unparsable `team-config.json` is handled by the package loader, which keeps the last good definition (load issue `usingLastGood`), so the run correctly stays as it is, but the planner logs nothing. AC-007 says "warning logged". Whether the loader's recorded load issue counts as that log is a requirement reading for the Solution Designer. No code change is required by this review.
- O-2: a definition naming an unknown agent leaves the whole run unchanged (`TEAM_RUN_DEFINITION_NOT_FOLLOWED`) instead of skipping that member. This is consistent with REQ-007 ("invalid → the run keeps its current members"). N-3's per-member skip is about an unlaunchable member of a valid definition. No defect.

### Affected round-1 checks and scores

- Runtime Correctness And Behavioral Fidelity: 9.3 → **8.6**. The by-run-ID path from the tool entry (CR-001) and the leaving visibility (CR-002) were not realized.
- API/E2E Readiness: 9.3 → **9.0**. The reproduction exercised `deliverToRunId` directly, not the router.
- Dead-code row (Principle 7): **Fail** for `TeamMembersPanel.vue`, an unmounted component in a touched file (part of CR-002).
- Other rows and scores: unchanged from CRR-001.

## Findings

| ID | Finding | Classification | Owner |
| --- | --- | --- | --- |
| CR-001 | Run-ID messages to leaving or former members do not reach the former-member refusal (F-1) | `Local Fix` | Implementation engineer |
| CR-002 | The "Leaving" visibility rule is designed onto an unmounted component; the rendered member list drops leaving members (F-2) | `Design Impact` | Solution Designer |

## Follow-ups

- Follow-ups this review added: None. FU-004 was added by API/E2E. FU-001 is fixed in this change; FU-002 and FU-003 remain.

## Classification

- CR-001: `Local Fix` (implementation-owned, bounded).
- CR-002: `Design Impact` (Solution Designer).
- Combined route: the ticket returns to the Solution Designer, because a Design Impact needs a revised design before implementation resumes. CR-001 does not depend on the redesign: it can be fixed in the same implementation round, or dispatched at once if the Solution Designer prefers.

## Recommended Recipient

The Solution Designer (`get_handoff_rules`: Design Impact), with CR-001 included for the next implementation round. After the fixes: source review again, then API/E2E reruns TF-02, TF-03 and TFU-03, plus the cases the fixes touch.

## Residual Risks

- A leaving member whose stop keeps failing retries every 1 s, with a warning each time and no cap (declared). It needs an infrastructure failure. A team stop ends the loop (C-02).
- A follower step that throws after commit skips the remaining steps for that change (declared; C-04).
- N-8: while a member is leaving, the run-tree rows already drop it but the open view still shows "Leaving". The AC-009 probe should note this.
- Two implementation deviations, recorded in the handoff (C-05, C-06). Both are consistent with REQ-002 and DEC-005; the Solution Designer may record them in the design spec.
- C-07 (cosmetic): `agent-org-execution/services/agent-org-execution-index.ts:93-97`. `isOwnTeamAddress`'s doc comment now sits above `formerMemberAt`.
- FU-003: a peer's Team link member list is not refreshed (outside this ticket).

## Latest Authoritative Result

- Review Decision: `Fail` (failure-origin round; supersedes the CRR-001 Pass)
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass` (both failing scenarios are approved behavior on the normal product path)
- Material-Premise Gate: `Pass`
- Score Summary: CRR-001 scores carried, except Runtime Correctness 8.6 and API/E2E Readiness 9.0
- Failure Origin: CR-001 implementation defect plus a source-review gap (`Local Fix`); CR-002 design gap plus a source-review gap (`Design Impact`)
- Recommended Recipient: Solution Designer
- Notes: Classification Large/High is preserved. Everything else API/E2E ran passed at real boundaries.
