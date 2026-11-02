# Code Review Report — autobyteus-348 (runtime-switch-members)

## Review Round Meta

- Review Entry Point: `Implementation Review` (round 1, CRR-001) `API/E2E Failure-Origin Review` (round 2, CRR-002) `Targeted Delta Review` of the rework IR-002 (round 3, CRR-003) and `Targeted Delta Review` of IR-003 (round 4, CRR-004; the latest authoritative result)
- Requirements Doc / Investigation Notes / Solution Revision Record / Design Spec Reviewed As Context: `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md` (SR-001), `design-spec.md` (D-1…D-10)
- Supplemental Task Artifacts Reviewed As Context: `switch-member-record-contract.md` (behavior-defining for the data); `task-follow-ups-316.md` (input)
- Design Review Report / Architecture Review Revision Record: `design-review-report.md`, `architecture-review-revision-record.md` (ARCH-REV-001 Fail → ARCH-REV-002 Pass; ARCH-F-001…010)
- Implementation Handoff / Revision Record: `implementation-handoff.md`, `implementation-revision-record.md` (IR-001)
- Code Review Revision Record: `code-review-revision-record.md`; Current Code Review Revision ID: `CRR-004` (history: `CRR-001`…`CRR-003`)
- Current Review Round: 4; Review Scope: round 1 `Full Review`; round 2 `N/A` (failure-origin round); round 3 `Targeted Delta Review`; round 4 `Targeted Delta Review` (one guard in one file, the prior finding F-3); round 3 detail: (the changes since round 2 stay within the files and behavior of F-1 and F-2: the Org config read and Save result, the web adoption of the Org canonical tree, and the copy rows' fresh read)
- Trigger: round 1 implementation handoff IR-001 (Large / High); round 2 API/E2E failure (commit `1269820159`)
- Prior Review Round Reviewed: round 3 (CRR-003, Fail: F-3 open; F-1 server and F-2 resolved)
- Coverage Investigation / Execution Coverage Report / API/E2E Revision Record Reviewed (failure-origin): `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`
- Failing Scenario IDs: RSM-02 and RSM-03 (Org direct Agent and Agent of a mounted Team, rendered Settings), RSM-04 (delegated copy row after Save)
- Failing command / mode: `pnpm -C autobyteus-web test:e2e:runtime-switch-members` (headless Chrome → Nuxt dev → built backend, scripted native and Antigravity models); contract test `autobyteus-collaboration-stream-contracts/tests/org-member-pending-runtime-switch.test.mjs`
- Failure evidence: `evidence/api-e2e/API-04-browser-probe.log`, `API-04-screens/RSM-02-failure.png`, `RSM-03-failure.png`, `rsm04-copy-saved.png`, `rsm04-copy-settings-reopened.png`, `API-07-contracts-org-pending.log`

## Routing Classification Review

- Task size `Large`; architectural risk `High`; route `Implementation Review`; independent source review required: `Yes`.
- Classification evidence: confirmed. 153 files (3,531 insertions): persisted member and copy records, the durable commit of a member's binding in three roots, the shared activation handle with two construction sites, three save paths, two stream-contract packages, the web draft chain, and renames across the Team and Org chains.

## API/E2E Failure-Origin Review (round 2, CRR-002)

Scope: classify the origin of the RSM-02/03/04 failures; no repeat of the round-1 audit. Method: `Read` the cited source and the evidence; the failures were `Measured` by API/E2E in the rendered journey and with the built schema. I did not rerun the probe. Everything else API/E2E ran passes and is taken as reported: live Claude ↔ Codex for a Team member, both Org members and a copy with I-7 by exact record ids (LV-01…03), failed starts for an Org member and a copy with a byte-identical previous file and a clean retry (EX-01, EX-02), restart for a copy, opposite wake orders, a Team default edit with linked members (EX-02…04), and the Team path in the browser (RSM-01).

The failing scenarios represent approved behavior: AC-002 (the Org member's switch is saved and shown in Settings) and AC-004 (a copy's choice is saved and shown). Both are supported normal scenarios (a user edits and saves the settings of a stopped Org or Agent root).

| Candidate | Observation | Independent trigger / path | Evidence | Disposition | Origin |
| --- | --- | --- | --- | --- | --- |
| F-1 | Saving a runtime switch for an Org member shows a raw Zod error (`Unrecognized key: "pendingRuntimeSwitch"`) in Settings; the Save bar stays on "Unsaved changes". The server state is right: the first message still switches | User saves, or merely reopens, the Settings of a stopped Org that has a pending member. Path: `getAgentOrgRunConfig.executionTree` and the update result's `canonical` are `GraphQLJSON` of the stored Org tree (`api/graphql/types/agent-org-run.ts:102,119`), which now carries `pendingRuntimeSwitch` on a configured Agent (the node is written by `applySelectionToConfiguredMember`, kept by the schemas and by `agent-org-runtime-config-projector.ts:18`); the web parses it with `agentOrgExecutionTreeDtoSchema.parse` (`agentOrgRunConfigClient.ts:32`, `existingRunConfigStore.ts:303,492`, `existingRunConfigResultActions.ts:72`), and the contract's `configuredAgent` is `.strict()` without that key (`agent-org-execution-dtos.ts:24-28`) | `RSM-02-failure.png`, `RSM-03-failure.png`; API/E2E parsed a real server tree with the built schema; `API-07-contracts-org-pending.log` (tests 1 and 2 fail with `unrecognized_keys`) | Promote | The implementation: it broke the approved wire decision "the pending switch is NOT on the wire" (design-spec Change Scope; contract §6) on the Org raw-tree paths. The Team path is fine because the Team tree reaches the web through the snake_case DTO projection, which leaves the field out (RSM-01 passes), and the live and checkpoint Org paths go through `collaboration-execution-tree-dto-projection.ts` |
| F-2 | After a successful Save of a stopped copy's runtime change the copy row keeps its old content (`rsw-native… · AutoByteus · Agent default`), still stale after 10 s, until Settings are reopened (reopened row: `Gemini test · Antigravity CLI`). The server record is right | User saves a copy's choice on a stopped Agent root. Path: the Save runs `reconcile = draftStore.reloadCanonical(true)` (`ExistingRunConfigEditor.vue:355`), whose `readAgentCanonical` refreshes the resume config and takes the copy rows from `useAgentRunCollaborationStore().viewFor(runId)` (`existingRunConfigStore.ts:200`); `viewFor` returns the host's cached context view when one exists (`agentRunCollaborationStore.ts:177-181`, "one hub selection reads the view once") | `rsm04-copy-saved.png`, `rsm04-copy-settings-reopened.png`, `API-04-browser-probe.log` (RSM-04) | Promote | The implementation (web reconcile after a copy Save). Cause read, not proven: the snapshot of the copy rows is probably the pre-save cached view. Not established: whether a model-only copy Save refreshes the row at the base (SSR-001 of `settings-saved-model-refresh-cases.mjs` exercises repeated copy Saves there); the implementation must find that out with the red probe before choosing the fix |

### Was it detectable in source review?

- F-1: yes, and I missed it. The design says the pending switch is off the wire; the diff showed (a) `pendingRuntimeSwitch` added to the Org config projector and to the stored Org node, (b) the Org config read and update result emitted as raw `GraphQLJSON`, and (c) a `.strict()` contract schema. I confirmed the DTO projections and the Team path but did not trace the Org Settings read and the Save result to the web's parser. No unit or integration test crosses the server's raw Org tree with the web's strict schema, so the suites passed. The design's list of derived consumers did not name these two emission sites either (the architecture review did not catch it).
- F-2: probably not from the diff alone; it needed the rendered journey. My round-1 report listed rendered rows as unverified.

Round-1 `Pass` (CRR-001) is superseded.

## Targeted Delta Review of IR-003 (round 4, CRR-004)

Diff `1be1228a75..75bd512bb2` (code commit `4c7a70698d`: `agentOrgRunConfigAdoption.ts` and two specs) read in full. I re-ran the two affected web specs (14 passed). Recorded checks (IMP-18, IMP-19: web typecheck, nuxt 5016, rendered RSM-01…05) were read, not rerun; the server code is unchanged since `9e28c019b6`.

| Finding | Round-3 status | Round-4 status | How verified |
| --- | --- | --- | --- |
| F-3 (the Org undo refused by the web guard) | Open | **Resolved** | The throw on a non-null session of a runtime-changed Agent is removed. The session stays masked only for Agents whose agent runtime changed (a switch drops it, an undo restores the original, the server decides), so a session change on an Agent whose runtime did not change and every identity or topology drift are still refused (the masked comparison is unchanged for them). Tests: the undo with a non-null original session for a direct Agent and an Agent of a mounted Team (adoption spec); the refusal of an invented session on an Agent that did not switch; a store-level case saving a switch and then its undo for both placements with no error, the original session back in the tree (publication spec). The implementer ran the new tests against the IR-002 guard: 3 failed; they pass now |

No new candidate. The rendered probe does not exercise the undo; the store-level case covers it (as I allowed).

## Targeted Delta Review of the rework IR-002 (round 3, CRR-003)

Diff `d782993e5f..2a6dc5bf10` (source: `agent-org-run-service.ts`; web `agentOrgRunConfigAdoption.ts`, `agentOrgExecutionContext.ts`, `agentRunCollaborationStore.ts`, `existingRunConfig*` stores; the new and changed specs) read in full. I did not rerun the recorded checks (IMP-14…IMP-17: rendered RSM-01…05 all Pass, server unit 7864, web 5013, gated runs 16). I ran one temporary pure-function test (below), not committed.

| Finding | Round-2 status | Round-3 status | How verified |
| --- | --- | --- | --- |
| F-1 server half (the Org tree off the wire) | Open | **Resolved** | `AgentOrgRunService.getRunConfig` and `updateStoppedRunConfig` return the tree through the existing `projectAgentOrgExecutionTree`, which builds the DTO field by field (so `pendingRuntimeSwitch` cannot pass). The service's only callers of those two methods are the two GraphQL resolvers; the delegated-launch service and the runtime-config path call the manager directly and keep the stored tree. The inspection and root-history Org trees were already projected. The contract schemas are not widened. New `agent-org-run-config-wire.test.ts` parses the read and the Save result with `agentOrgExecutionTreeDtoSchema` while a direct Agent, an Agent of a mounted Team and a copy are pending, and shows the raw tree does not parse |
| F-1 web half (the projection exposed a second defect the raw tree had hidden: the canonical tree of a switched Agent was refused as "changed topology, identity, or locked fields") | not seen in round 2 | **Partly resolved; new F-3** | see F-3 |
| F-2 (stale copy row) | Open | **Resolved** | `viewFor(host, { fresh })` re-reads a stopped host that has no stream (`!services.has(hostRunId)`), after the in-flight inspection; `readAgentCanonical`/`loadAgentCanonical` take `fresh`, passed true after a committed Save (`reloadCanonical(true)`), by the failure reconcile and by Retry; the first open still reads once. Store and `viewFor` specs cover both the fresh and the not-fresh case and a host with a stream. Rendered RSM-04 passes (IMP-16). The implementer did not prove whether a model-only copy Save was stale at the base; the fresh read covers both |

### Candidate Finding And Mechanism Gate (round 3)

| Candidate | Observation | Evidence | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C-11 | `assertAgentOrgRunConfigChange` now refuses the canonical tree of an Org Agent whose agent runtime changed back to the previous one while its session is restored (the undo of a pending switch) | Scenario: a stopped Org member has a saved, not yet activated switch; the Settings tree in the web context holds the new runtime and a `null` session. The user chooses the previous runtime again and saves: the server's rule (`applyRuntimeSelection` undo) returns the original runtime with the original session `pending.from.platformAgentRunId`. Path: `agentOrgContextsStore.saveRunConfig` → `org.applyRunConfig(tree)` → `assertAgentOrgRunConfigChange(view.execution_tree, tree)`. The new check puts every Agent whose runtime differs in a `switched` set and throws when any switched Agent's session is not `null`. Reproduced: a temporary vitest on the pure function — switch away (runtime changes, session `null`): accepted; undo back (runtime changes, session `'sess'`): throws `Org configuration changed topology, identity, or locked fields` | Promote | Supported explicit edge scenario (AC-003 undo; the rule of 316 and this ticket); a defect in the new code; the server has already committed the undo, so the user sees an error for a saved change |
| C-12 | `applyRunConfig` now also updates the Agent context's `runtimeKind` | `modelChanged` includes the runtime; context config takes the runtime; conversation kept (test) | Reject | Needed for the switched row; no consequence shown |

## Review Scope

- Changed implementation and behavior reviewed (non-test source in full): `runtime-selection-rule.ts` and its adapters (standalone commit, configured member, copy domain `delegated-launch-selection.ts`); the three tree mutators and the Team committer (`commitRuntimeSwitchInTree`, `commitAgentOrgRuntimeSwitch`, `commitStandaloneRootRuntimeSwitch`) with their roots' call sites; `ConfiguredAgentExecutionHandle.initializeReady` and its failure branch, `ConfiguredAgentSwitchAttempt`, the planner's `beginSwitch`, `wrapPreparedLocalTermination`; `FlatTeamAgentExecutionHandle` (commit adapter, `replaceSelection`), `FlatAgentExecutionContext.refreshSelection`; both restore sites; record types and schemas (configured nodes, task Agent own file, task Team members, user choice runtime); Team/Org/delegated save paths (mutators, managers, services, GraphQL inputs and `requiredRuntimeKind`); `selectionContextFor`; readers (`memory-run-discovery`, `task-team-root-memory-source`, location read models); the two contract packages' sources (tracked `dist/` by size); the web drafts, patches, clients, stores, rows, editor and the hint; docs by file list.
- Tests: read by case list and targeted reads (rule, records, handle switch activation, three-placement member activation, copy commit, launch-rule parity, selection validation context, the built-server `runtime-switch-members-built-server` cases MS-01…04, DCM-009).
- Diff read: `c952758a81..5bccfeb203`. The recorded checks (IMP-01…IMP-13: typecheck, unit 7861, integration 500, web 5008, built-server runs) were read, not rerun: code is unchanged since `d3463e0a7e` apart from tests and documents.
- Explicit exclusions: a live Claude/Codex pair, rendered web rows, a built-server failed start for an Org member or a copy.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: a stopped Team member, Org member (direct Agent and Agent of a mounted Team) and delegated copy (task Agent, task Team member) can choose another agent runtime and model; the next input makes the switch exactly as in autobyteus-316 (one shared activation class, one commit kind); a start that fails leaves nothing; no history means a plain start; the chat, journal and memory readers follow; the pending switch is not on the wire; clean-cut renames.
- Design-spec behavior map verified against the implementation: yes. ARCH-REV-002's findings are visible in code: ARCH-F-007 (a pending switch on every affected member, decided at activation by the planner), ARCH-F-008…010 (second construction site `FlatTeamAgentExecutionHandle`, M-7 holder refresh, conflict-never-no-op commit).
- Behavior-basis status: `Confirmed`. No newly discovered behavior; no ambiguity.

| Behavior | Status | Path / evidence |
| --- | --- | --- |
| BEH-001 (Team/Org save) | Confirmed | web patches (each carries `runtimeKind`) → `updateStoppedTeamRunSelections` / `updateStoppedAgentOrgRunConfig(selectionPatches)` → `requiredRuntimeKind` → manager transition lane → targets → `selectionContextFor` (fresh selection for another runtime or a pending member) → `applySelectionToConfiguredMember` (the shared `applyRuntimeSelection`) → one tree write |
| BEH-002 (copy save) | Confirmed | `updateDelegatedLaunchSelections` → `planDelegatedLaunchValidation` (effective runtime as current) → `applyDelegatedLaunchSelectionsToTaskExecutions`: choice recorded beside the started values (runtime only when it differs from started), the rule applied to every copy member whose effective runtime changes (own choice or its Team's for a follower) |
| BEH-003 (activation) | Confirmed | `initializeReady` → `prepareActivation` → planner (pending ⇒ `beginSwitch`: inspect history, `memory.begin` before the candidate) → prepare → `switchAttempt.record()` → `commitPlatformBindingChange({runtime_switch})` → handle drops pending and takes the session → publish; failure: release first, then `discardUnlessRecorded` |
| BEH-004 (readers) | Confirmed | `openRawTraceRuntimeKind` over the effective runtime and pending switch for Team, Org, task Team and task Agent runs |

## Supported Product Scenario And Reachability Gate

| Scenario | Kind | Trigger | Path | Outcome | Validity |
| --- | --- | --- | --- | --- | --- |
| SC-1 | User | Settings save of a stopped Team/Org with another runtime for a member | BEH-001 | pending switch on that member, binding dropped, nothing archived | Supported Normal |
| SC-2 | User | A copy's choice saved on a stopped Agent, Team or Org root | BEH-002 | choice and pending switch on each affected copy member | Supported Normal |
| SC-3 | User | First input to the member | BEH-003 | marker, archive, hand-over, commit, publish | Supported Normal |
| SC-4 | System | An activation that fails and is sent again (start failure, archive failure, commit that does not land) | BEH-003 failure branch | nothing left behind; one marker, one segment | Supported Explicit Edge |
| SC-5 | User | Undo, a second save before the first input, a Team-default runtime edit that reaches linked members | rule | as in 316; each linked member switches on its own | Supported Explicit Edge |
| SC-6 | System | Member with no conversation | planner `none` | plain start, commit clears the pending switch | Supported Explicit Edge (REQ-005) |

### Candidate Finding And Mechanism Gate

| Candidate | Observation | Evidence | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C-1 | Handoff question 1, the M-7 holder refresh: do all holders drop the pending switch and take the binding? | Handle: `initializeReady` after the commit rewrites its `execution` (pending removed, session set). Team wrapper: its commit adapter calls `context.refreshSelection(...)` and rewrites `this.config` only after the root commit returned (a failing root commit changes no cache; a failing cache update surfaces as the existing indeterminate `BINDING_CACHE_COMMIT_FAILED`). Root trees: `commitAfterDurability` of Team/Org/Agent roots replaces the tree. Restore of a retained handle: `replaceSelection` rewrites spec, config, context and session. Tests: `configured-agent-switch-activation` (M-7), `runtime-switch-member-activation` ("restores on the committed session"), `runtime-switch-copy-commit` | Reject (no defect) | Confirmed |
| C-2 | Conflict-never-no-op in the three mutators | `commitRuntimeSwitchOnRecord` returns a conflict for `not_pending` and `switch_id_mismatch`; each mutator also throws unless the member matches exactly once; Team throws `TEAM_AGENT_PLATFORM_BINDING_CONFLICT`, Org and Agent root throw; the handle's failure branch keeps the member pending and publishes nothing. Test: "the root's commit refuses a stale switch ID, a member that is not pending and a missing member, writing nothing" | Reject (no defect) | Confirmed |
| C-3 | `replaceSelection` at the two copy restore sites | `RootAgentExecutionRegistry.restoreTask` passes the node built by `restoreTaskAgentNode`, the same node `createHandle` uses for a new handle (session ID and pending switch included); `TaskAgentExecutionRegistry.restore` passes the node with the persisted session ID it already used to build a new handle. Both keep the stopped guard; the Team wrapper forwards to the inner handle and refreshes its own config and context | Reject (no defect) | Confirmed. The change from "model only" to "runtime, model, session, pending" is safe because both sites read the same persisted source for the new-handle and the retained-handle cases |
| C-4 | Launch-rule parity | `copy-launch-rule-parity.test.ts` runs the server rule and both contract mirrors over the full matrix of agent choice × team choice × `followsTeam` (4 × 4 × 2 = 32 cases), including another and the native runtime, and compares runtime, model, settings and `selected`. Mirrors extended in the same way (`runtimeKind ?? started`) | Reject (no defect) | Confirmed; FU-C1 stands for converging the three |
| C-5 | `ConfiguredAgentActivationPlanner` falls back to a process-wide `getDefaultRuntimeSwitchMemory()` and `agent-collaboration` imports a concrete `agent-memory` service | `activityInspector` is handled the same way (imported default) in the same planner; the recorder is stateless; the option `runtimeSwitchMemory` allows injection (tests do) | Reject | Follows the file's existing pattern; no behavior consequence |
| C-6 | Failed-attempt discard is implemented twice: the standalone lifecycle's `discardFailedSwitchAttempt` (316) and `ConfiguredAgentSwitchAttempt.discardUnlessRecorded` | The two sit in different activation owners with different release signals (operation stage versus the handle's confirmed release); the memory port is shared | Reject | Not a duplicated structure to extract today; a third copy would be |
| C-7 | The raw line count of `configured-agent-execution-handle.ts` is 520 (525 before) | Effective non-empty lines (comments and blanks excluded): 467 before, 459 after | Reject | Under 500 by the effective count the template names and not grown; `wrapPreparedLocalTermination` moved out |
| C-8 | A Team or Org patch may name another runtime for a default scope (`/` or a mounted Team); the server changes the default launch's runtime with no pending switch | Design D-4: default scopes change the default launch only; the UI keeps the Team and Org root's runtime fixed; linked members receive their own patches and switch on their own; every changed runtime is validated as a fresh selection | Reject | Matches the approved design |
| C-9 | The member runtime-change hint is the draft-versus-saved comparison, so it does not show when a saved pending switch is reopened | Same behavior as in 316 (its C-4) | Reject (cosmetic) | |
| C-10 | The existing-run browser probe fails four checks (A, D, E, page errors), the same four at the base commit | `IMP-13`: A/D/E wait for `chat-model-locked-runtime` on the Agent root card that 316 unlocked; the page error is a blocked-port websocket | Promote as Follow-up | Pre-existing; not caused by this change; FU-C2 |

## Structural / Design Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Task design health assessment present and preserved | Pass | one pure rule, per-family adapters that only locate and write the record, one activation class, one commit kind; no dual path |
| Behavior-defining supplement matched | Pass | contract §1–§6: record placement, `RecordedPendingRuntimeSwitch`, choice runtime only when it differs from started, commit shape and conflicts, M-1…M-7 |
| Spine clarity | Pass | DS-001/002/003 are the named nodes |
| Ownership boundary | Pass | rule owns what a selection/commit does to a binding; each tree family owns finding and persisting; the handle owns activation order; roots own the durable commit |
| Existing capability reuse | Pass | 316's memory port, recorder, notice, readers, planner and commit seam; `persist` mechanics of each root unchanged |
| Reusable owned structures | Pass | `PendingRuntimeSwitch` reused unchanged; `RecordedPendingRuntimeSwitch` is a one-field mixin; `RuntimeBindingState` is minimal |
| Shared-structure tightness | Pass | `ConfiguredAgentSelection` is a `Pick` of the spec |
| Repeated coordination ownership | Pass | the record step lives once in `commitRuntimeSwitchOnRecord`; selection context once in `selectionContextFor` |
| Empty indirection | Pass | `ConfiguredAgentSwitchAttempt` holds the ticket's state and the discard guard; not a pass-through |
| SoC / file responsibility | Pass | `wrapPreparedLocalTermination` moved to the support file to keep the handle from growing |
| Ownership-driven dependency | Pass | see C-5 |
| Authoritative Boundary Rule | Pass | callers use managers and roots, not the stores |
| File placement | Pass | |
| Interface clarity | Pass | `runtimeKind` is explicit and required on every save input (`requiredRuntimeKind` refuses a missing or unknown one naming the scope); the pending switch is off the wire |
| Naming | Pass | Principle 15: the old `…ModelConfig` names are gone in sources (searched: no hit outside tickets); the shared `RunModelConfig*` result types keep their accurate names |
| No unjustified duplication | Pass | the three launch-rule mirrors are the designed, test-guarded exception (FU-C1) |
| Patch-on-patch | Pass | |
| Dead code removed | Pass | `AgentModelChoice`, `replaceModelChoice`, `DelegatedHostSelectionValue`, the old mutator file and names |
| Tests clear and requirement-aligned | Pass | case names tie to M-x / REQ; the three placements run through real roots with real files; failed start, retry, abandoned attempt, conflict, unreadable history, no history |
| Fixtures reusable / no stale tests | Pass, except the pre-existing stale probe scenarios (FU-C2) | |
| API/E2E readiness | Pass | built-server MS-01…04, RS-01…08 and DCM-001…009 pass |

## Source File Size And Structure Audit

Effective non-empty lines (blank and comment-only excluded), base → head. All changed implementation-source files are under 500 and none grew past it:

| File | Before | After | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/stores/existingRunConfigStore.ts` | 500 | 499 | not grown |
| `configured-agent-execution-handle.ts` | 467 | 459 | not grown (raw lines 525 → 520) |
| `agent-org-run-manager.ts` | 451 | 458 | |
| `standalone-agent-run-root.ts` | 451 | 457 | |
| `runtime-selection-rule.ts` (new) | 0 | 110 | |

Files with more than 220 lines changed across the ticket (the rule and records, the delegated selection domain, the web drafts) each own their new behavior; none needs a split.

## Legacy / Backward-Compatibility Verdict

All Pass. Optional fields with truthful absence; no migration (the schema tests read old shapes unchanged and write the new fields exactly; the app-data migration suites pass unchanged). GraphQL is a clean cut with no alias. Old pending shape does not exist (316's `switchId` shape is the one used).

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

`Yes`, done: `GLOSSARY.md`, server `agent_team_execution.md`, `agent_orgs.md`, `agent_communication.md`, `run_history.md`, `agent_work_journal.md`, `llm_management.md`; web `settings.md`, `chat.md`, `agent_execution_architecture.md`. Delivery re-verifies them against the final code.

## Additional Material Premise Validation

None new or reclassified. The 316 lesson (a candidate can write records while it prepares) is carried by the same ticket order: the ticket is taken before the candidate and only the records after the watermark are discarded; the Grok and native targets are covered by the built-server runs and the three-placement unit tests.

## Review Scorecard

- Overall score: 9.4 / 10 (summary only; categories 7 and 8 re-scored in round 4)

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Three spines are the named nodes; one activation order for all member kinds | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Rule, locator, activation and commit each have one owner | — | — |
| 3 | API / Interface / Command Clarity | 9.4 | Required explicit `runtimeKind` with a clear refusal; one new commit kind | — | — |
| 4 | Separation of Concerns and File Placement | 9.3 | Clean; `existingRunConfigStore.ts` sits at 499 of 500 effective lines | store at the limit | Extract on the next change |
| 5 | Shared-Structure Tightness | 9.4 | Reuses `PendingRuntimeSwitch`; one-field mixin | — | — |
| 6 | Naming and Local Readability | 9.4 | The rename is complete | — | — |
| 7 | API/E2E Readiness | 9.3 | Rendered RSM-01…05 pass; the Org undo is covered at store level, not rendered | undo not rendered | API/E2E may add it |
| (round 1) | API/E2E Readiness | 9.3 | Built-server cases for all three placements; a live Claude/Codex pair, rendered rows and an Org-member/copy failed start on the built server are not run | those three | API/E2E |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Activation, commit, retry, discard, the wire projection, the copy rows and the Org switch and undo hold | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean cut | — | — |
| 10 | Cleanup Completeness | 9.3 | Dead code removed; the stale probe scenarios are pre-existing (FU-C2) | probe | FU-C2 |

## Findings

No open finding. F-1 (server and web), F-2 and F-3 are **Resolved** (rounds 3 and 4).

## Follow-ups

- Follow-ups this review added: FU-C2 (round 1, in `follow-ups.md`). Rounds 2, 3 and 4: None. FU-C1 (the designer's) stands.

## Classification

Not applicable (Pass). Task size and architectural risk (`Large` / `High`) unchanged.

## Recommended Recipient

API/E2E engineer (primary pass rule); implementation engineer informed.

## Residual Risks

- Round 2 closed the round-1 gaps: the live Claude ↔ Codex pair, the failed starts of an Org member and a copy, restart for a copy and the wake orders all pass (API/E2E). Still not covered: AC-003 and AC-009 in the rendered surface, journal and memory-search reads of a switched member beyond the chat, live Grok/Antigravity (scripted), the Electron shell.
- The implementer searched the other Org raw-tree emission sites (inspection and root history were already projected; the delegated-launch service returns outcomes only); I checked the two service methods' callers.
- API/E2E's contract test `org-member-pending-runtime-switch.test.mjs` asserts the widening that the approved wire decision rejects and must be replaced by the server-side boundary test (`agent-org-run-config-wire.test.ts`) plus the rendered RSM-02/03.
- The Org undo is not exercised in the rendered probe.
- A Team default's runtime edit switches every linked member at once; each activates separately, so a partially activated Team is a normal state (documented).
- Restart between the save and the first message for a member and for a copy: MS-04 covers a Team member; a copy is not run.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 4, `Targeted Delta Review`, IR-003)
- Supported Product Scenario Gate: `Pass`; Material-Premise Gate: `Pass`
- Score Summary: 9.4 / 10, every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: API/E2E engineer
- Notes: F-1, F-2 and F-3 are resolved. The round-1 Pass (CRR-001) is replaced by this result after two failure rounds.
