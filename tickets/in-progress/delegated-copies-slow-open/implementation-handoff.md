# Implementation Handoff — delegated-copies-slow-open

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open`, branch `codex/delegated-copies-slow-open`. Originally based on `origin/personal` @ `5ceb43039a`; `origin/personal` @ `2763e7c678` is now merged in (IR-002).

Implementation commits:
- IR-001: `c21d468d9e` (server), `291545c66f` (web), `54e5356ae6` (docs)
- IR-002: `6507c08527` (merge of `origin/personal`, conflicts resolved), `2cb21ab41e` (batched-content tests and doc line)

Ticket artifacts and evidence are committed after these; see the handoff message for that commit.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review was selected (Medium / High). ARCH-REV-002 is a Pass. The completed package routes to `/software_engineering_team/code_reviewer`.
- Requirements doc: `tickets/in-progress/delegated-copies-slow-open/requirements-doc.md` (SR-002, Approved)
- Investigation notes: `tickets/in-progress/delegated-copies-slow-open/investigation-notes.md`
- Solution revision record: `tickets/in-progress/delegated-copies-slow-open/solution-revision-record.md`
- Design spec (required on every route): `tickets/in-progress/delegated-copies-slow-open/design-spec.md` (SR-004)
- Supplemental task artifacts: `probes/open-cost-probe.test.ts`, `probes/probe-run1.txt` (baseline evidence)
- Design review report: `tickets/in-progress/delegated-copies-slow-open/design-review-report.md` (round 2, Pass)
- Architecture review revision record: `tickets/in-progress/delegated-copies-slow-open/architecture-review-revision-record.md` (ARCH-REV-002)
- Triggering rework report, revision record, or evidence: `release-deployment-report.md` and `delivery-revision-record.md` (DR-001: integration refresh blocked by merge conflicts; `Local Fix`)

## Current Implementation Summary

The copy rows of a standalone run (the hub) now come from its collaboration view alone, with no request per copy. A copy's stored conversation, activities and artifact list load when the copy is selected, through a hub-scoped server read. After every publication the selected copy loads again; other opened copies load again when selected again.

- Implementation cycle: `Rework` (IR-002, integration merge; IR-001 was the initial implementation)
- Implementation revision record: `tickets/in-progress/delegated-copies-slow-open/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: SR-004 (design), SR-002 (requirements)
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: CRR-001 (Pass, no findings; Important Assumptions 1–2 accepted; `code-review-report.md`), CRR-002 (Pass, API/E2E test code)
- Related API/E2E revision IDs: API-REV-001 (Pass, 95.0%, on the pre-merge state)
- Related delivery revision IDs: DR-001 (Blocked: merge conflicts)
- Triggering finding IDs: DR-001 (integration refresh conflicts)

## Integration Merge (IR-002)

`git merge --no-ff origin/personal` (`2763e7c678`, 56 commits, including the finalized `chat-socket-content-cadence` / autobyteus-139 and `append-only-message-logs` tickets) conflicted in two files. Both are resolved by keeping both sides; no product behavior of either side changed.

- `autobyteus-web/services/agentCollaboration/agentRunCollaborationContext.ts`: this ticket's `isChildHydrated` / `markChildHydrated` sit beside the base's range-aware `applyEvent(changeSequence, event, changeSequenceThrough)`. That `applyEvent` brings `advanceSequencedStream`, `agent_presentation_batch` and `dispatchPresentation`. This ticket never changed presentation dispatch, so the base's refactor applies as is.
- `autobyteus-web/services/agentCollaboration/agentRunCollaborationStreamingService.ts`: the base's `change_sequence_through` and local `event` (plus its new `onTaskExecutionStarted` call), with this ticket's reconnect comment.
- Auto-merged files, checked:
  - `agentRunCollaborationStore.ts`: the base adds `retireTopLevelRow` and `onTaskExecutionStarted` beside this ticket's `ensureChildHydrated`; they are independent.
  - The three web specs.
  - `autobyteus-web/package.json`: the base's script lines and this ticket's `test:e2e:delegated-copies-large-hub`.
  - The docs `agent_artifacts.md`, `standalone_agent_run_root.md` and `agent_execution_architecture.md`: the sections don't overlap.

Interactions the delivery engineer named:

- **(a) Content batches reach opened and unopened copies.**
  - `dispatchPresentation` sends every batch item into the child's retained `AgentContext`, loaded or not, as single events already did.
  - A content delta changes the presentation witness, which bumps `eventMonitorPresentationRevision`. So a batch for a copy whose load is in flight makes that load retry within the same context, just as a single event does.
  - New cases in `stores/__tests__/agentRunCollaborationLazyChildren.spec.ts` (commit `2cb21ab41e`; real store, context, stream and child hydration):
    - Batched output during an opened copy's load: two projection requests and two artifact requests, then it ends loaded, with the stream still live at sequence 7.
    - Batched output of an unopened copy: zero member requests. Opening it loads its stored conversation (AC-006, AC-007).
  - The spec's run-history mock gained `refreshRunNavigationTopology`. Without it, the base's new `task_execution_started` callback threw after the reconnect, and the stream handler swallowed the error for the replaced socket. The checkpoint case now asserts the call.
  - The base's own `agentRunCollaborationContextBatch.spec.ts` passes (IMP-13).
  - The docs note that a batch retries an in-flight load.
- **(b) Append-only message logs.**
  - This ticket's server code never reads message logs. A copy's projection reads the copy's own run memory (`AgentRunViewProjectionService`); its artifacts read `file_changes.json` or the live projection.
  - The hub view, which carries the message log, is base code and unchanged here. The server `standalone-agent-run-root` and `run-history` unit tests (318) and the full unit suite pass on the merged state.
  - Known fallout in API/E2E-owned test code: `autobyteus-web/tests/e2e/delegated-copies-large-hub-probe.mjs` still reads `memory/agents/<host>/collaboration/communication_messages.json`, in seeding (`storedReports`, `until('hub message log complete (stored)')`) and in `messageLogObservation` / `hubMessageLogBytes`. On the merged state the log is `communication_messages_active.jsonl` plus sealed `communication_messages_NNNNNN.jsonl` (`src/run-history/store/message-log.ts`). The setup wait would then time out on a fresh seed.
  - An existing seed in the old shape is converted when the server starts.
  - I left the probe to its owner, for the integrated-state rerun.

IR-002 changes no product source beyond the conflict resolutions.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` → Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - About 10 production source files changed in the two named subsystems, plus one new web file, one additive GraphQL query and tests (Medium).
  - Child-state loading moved from "complete before publish" to on demand, which changes the concurrency between loads, live events, local sends and republication. A public query was added (High).
  - No escalation trigger fired: no stream DTO or contracts `dist/` change, no storage or message-log change, no team or org root hydration change, and no consumer needs unopened children's conversations (R-003 below).
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (Large/High route)
- New design impact or escalation trigger: `None`. Two implementation-level decisions inside DS-005 are flagged for review under Important Assumptions (1 and 2).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001, REQ-005; AC-001, AC-002, AC-005) | Rows from the view in one request; same rows and statuses | `AgentRunTaskRows` mount → `agentRunCollaborationStore.inspect` → `readAgentRunCollaboration` → `buildAgentRunCollaborationContext` (`agentRunCollaborationHydration.ts`, no per-child I/O; workspace resolution once per root) → `publish` → `taskRows` | Hubs with 5 and with 50 task Teams: one view request, zero member requests (IMP-04, `agentRunCollaborationLazyChildren.spec.ts`). Row, status and disclosure specs unchanged and green. |
| BEH-002 (REQ-002; AC-003) | Hub opens without waiting for copies; Team tab from the view | Host open path unchanged; `syncHost` → `inspect`/`attach` → `publish` (no fan-out); `hostMessagesView` reads view messages | No per-copy load on host selection. App-level timing is left to API/E2E (AC-003). |
| BEH-003 (REQ-003, REQ-004, REQ-006; AC-004, AC-006, AC-009) | Selected copy loads on demand, hub-scoped; complete; live updates kept | Row click / Task locate → `selectChild` → `ensureChildHydrated` (store, single dedupe owner, `WeakMap<context, Map<child, Promise>>`) → `hydrateAgentRunCollaborationChild` (`agentRunCollaborationChildHydration.ts`) → `GetAgentRunCollaborationMemberProjection` + `GetAgentRunCollaborationMemberFileChanges` → commit (`commitMemberRunStates`, conversation, `hasEarlierActiveTraceEvents`, presentation revision, event-monitor baselines, `markChildHydrated`). Server: `agentRunCollaborationMemberFileChanges` → `StandaloneRootMemberViewProjectionService.getFileChanges` → hub-scoped `requireLocation` → `RunFileChangeProjectionService.getLocatedCollaborationMemberProjection` | Loads once; reselection does not refetch; a failure warns with host and child, leaves the child unloaded, and the next selection retries. A live event during the fetch retries; a just-sent message is not overwritten; live tool reconciliation applies only while the stream is ready (IMP-04). Server reads only the named hub tree and never the unscoped lookup; stored and live sources; rejects foreign children (IMP-02). |
| BEH-004 (REQ-006, REQ-007; AC-006, AC-007) | New copy / Save: republish structure, keep opened content, refresh selected only | `applyEvent` → `checkpoint_required` → reconnect → snapshot → `buildAgentRunCollaborationContext` → `publish` (`prepareLocalContextAdoption` carries loaded children's conversation with the new view's pending input; no loaded mark) → `ensureChildHydrated(selected)`. Stopped hub: `syncHost(false)` → `inspect` → same `publish` | A new delegation with one opened child adds exactly one projection request and one file-change request, and no view request (IMP-04). A load in flight during republication ends `superseded` and writes nothing; the new context loads the child once (inspection and snapshot variants). |
| BEH-005 (REQ-005; AC-005) | Statuses, team colors, delegated-by, Task summaries, closed-Task hiding unchanged | Statuses and input states applied in the `AgentRunCollaborationContext` constructor from the view (unchanged); Task summaries untouched | Existing closure, disclosure and status specs green (IMP-04, IMP-05c). |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server (`c21d468d9e`):
- `autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts`: extracted public `getLocatedCollaborationMemberProjection(location)`. The run-id path's collaboration branch now calls the same private `locatedCollaborationMember`.
- `autobyteus-server-ts/src/standalone-agent-run-root/services/standalone-root-member-view-projection-service.ts`: `getFileChanges(hostRunId, memberAddress, agentRunId)`; optional injected `runFileChangeProjectionService`.
- `autobyteus-server-ts/src/api/graphql/types/agent-run-collaboration.ts`: query `agentRunCollaborationMemberFileChanges`.
- `autobyteus-server-ts/src/api/graphql/types/run-file-changes.ts`: `RunFileChangeEntryObject` exported (review note 2).
- Test: `autobyteus-server-ts/tests/unit/standalone-agent-run-root/standalone-root-member-file-changes.test.ts` (test (c)).

Web (`291545c66f`):
- `services/agentCollaboration/agentRunCollaborationHydration.ts`: `readAgentRunCollaboration` and `buildAgentRunCollaborationContext` (structure only).
- `services/agentCollaboration/agentRunCollaborationChildHydration.ts` (new): one load bound to (published context, child). It also holds the member projection fetch and the hub-scoped artifact fetch.
- `services/agentCollaboration/agentRunCollaborationContext.ts`:
  - `isChildHydrated` and `markChildHydrated`.
  - Adoption carry-over.
  - Removed dead private `addContextsForNewChildren` and `commitTree`, and their imports.
- `stores/agentRunCollaborationStore.ts`:
  - `ensureChildHydrated`, the store-owned dedupe.
  - `publish(hostRunId, context)` without commit; it ends with a load for the selected child.
  - `selectChild` triggers a load.
  - `inspect` no longer captures activity revisions.
- `services/agentCollaboration/agentRunCollaborationStreamingService.ts`: snapshot → build → publish; the `publish` option has no `commit`.
- `services/runHydration/memberRunStateHydration.ts`: explicit `fetchFileChanges`. Callers are updated mechanically: `teamRunContextHydrationService.ts`, `teamMemberProjectionHydrationService.ts` and `agentOrgExecution/agentOrgContextHydration.ts`.
- `services/agentStreaming/handlers/userMessageProjection.ts`: new `overlayPendingUserMessages`. It shares the extracted merge step `applyPendingUserMessage` with `upsertPendingUserMessage`.
- `graphql/queries/collaboratorQueries.ts`: `GetAgentRunCollaborationMemberFileChanges`. `generated/graphql.ts` has only the new query's generated output (see Environment notes).
- Tests:
  - New: `services/agentCollaboration/__tests__/agentRunCollaborationChildHydration.spec.ts` (test (b), unit) and `stores/__tests__/agentRunCollaborationLazyChildren.spec.ts` (tests (a) and (b), real store/context/stream).
  - Rewritten: `agentRunCollaborationHydration.spec.ts`.
  - Adoption cases added to `agentRunCollaborationContext.spec.ts`.
  - Updated mocks and expectations: `agentRunCollaborationStore.spec.ts`, `agentRunCollaborationStoreClosure.spec.ts`, `agentRunCollaborationDisclosure.spec.ts`, `agentRootCompactionIntegration.spec.ts`, `agentRunCollaborationStreamingService.spec.ts`, `AgentRunTaskRowsDisclosure.spec.ts` and `memberRunStateHydration.spec.ts`.
- Probe source: `tests/e2e/delegated-team-default-collapse-probe.mjs`:
  - B-002 waits for the opened copy's loaded conversation.
  - P-001 counts `GetAgentRunCollaborationMemberFileChanges` as the artifact read.
  - B-001's label no longer says the children are hydrated.
  - `cross-scope-agent-mentions-live-probe.mjs` needed no change: it queries the member projection directly on a real backend.
- Workspace harness: `test-support/native-input-history/native-accepted-input-history.integration.test.ts` now builds the context, then loads the copy.

Docs (`54e5356ae6`):
- web `docs/agent_execution_architecture.md` (Agent-run children section) and `docs/chat.md` (Delegated-run Artifacts).
- server `docs/modules/standalone_agent_run_root.md` (new query; live versus stored, review note 3) and `docs/modules/agent_artifacts.md` (one line).

## Important Assumptions

These are implementation-level decisions inside the reviewed design. They are flagged for Code Review.

1. **Live-tool authority is read at commit time (DS-005 step 4), not captured at step 1 and compared after the fetch.**
   - The store publishes a stream snapshot's context *before* the streaming service marks itself ready (`phase = 'ready'` is set right after `publish` returns).
   - A load started by that publication would therefore always see authority change from false to true across its fetch. Comparing would force one wasted retry on every snapshot, so test (a)'s "exactly one projection and one file-change request" would fail.
   - Reading authority at commit is safe:
     - Any live event during the fetch already bumps the presentation revision and retries the load.
     - A change of published context supersedes the load.
     - Reconciliation keeps only advanced live tool states over the projection.
   - Evidence: IMP-04, the `live tool decisions win … (ready=true|false)` cases.
2. **Held or queued input stays shown when a copy's stored conversation loads (REQ-006 / AC-006 preserved behavior).**
   - Before this change, each child's stored conversation was loaded first, and then the view's `agent_input_states` were applied on top of it (pending user messages, including inputs not yet stored).
   - With D-1 the input states are applied to the empty Offline conversation at construction, and D-2's commit replaces that conversation.
   - Without a fix, a copy with held or queued input loses those markers when opened.
   - The fix:
     - The commit overlays the shown pending user messages onto the loaded conversation (`overlayPendingUserMessages`). This uses the same merge rule as `upsertPendingUserMessage`, which `handleAgentInputState` uses.
     - Carry-over resets the carried conversation's markers and overlays the new view's pending messages, as a fresh input state would.
   - Evidence:
     - `pnpm test:native-input-history` (IMP-07) asserts held A / queued B after a fresh hydration and fails with the overlay removed (IMP-08 M2; also observed on the integration test before commit).
     - Unit cases (IMP-04).
   - No new state or API: one helper next to its sibling, plus one call in each owner.
3. A fetch that fails after its context stopped being published ends `superseded` (no warning, no retry). This follows "checked after every fetch" in D-2.
4. After a successful commit the load calls `markEventMonitorPresentationChanged()` (team precedent), because it replaces content in a context the user may be viewing.
5. `ensureChildHydrated` returns early when the child is not in the published context (`getChild`). `selectChild` already passes `null` for unlisted ids.

## Known Risks

- R-004 (accepted): clicking a copy under a hub that isn't the selected run starts one load, and the run selection the click causes republishes and starts a second (one extra projection request and one extra artifact request).
- R-D / FU-1 (accepted): the on-demand load policy is duplicated with `teamMemberProjectionHydrationService.ts`.
- R-E (accepted): until a copy loads, the center view shows its empty or previous conversation. No loading UI was added.
- Retry exhaustion: a very busy live copy whose presentation revision changes during three consecutive fetches fails the load (logged), and the next selection retries. This is the same policy as the team precedent.
- R-B (intended): for a running hub, children's artifacts now come from the live member projection, where the generic path read the stored file. This is documented and covered by IMP-02.
- R-003 re-check (review note 4):
  - Searched `getAgentContext(` and `listAgentContextEntries()` in web production code.
  - Agent-root consumers: `ExistingRunConfigEditor.vue` `isAgentLive` (status), `services/runConfigEditing/delegatedCopyLiveness.ts` (status), store termination (state identity, runtime kind, input projection, compaction activity ids), `submit` (context identity) and `childTargetFor` (selected child only).
  - The other hits are team/org views and test-support.
  - No consumer needs an unopened child's conversation.
- AC-008 / REQ-008 timings and U-001 / ASM-001 (app wall time) are not measured here (API/E2E).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Performance (bug fix)
- Reviewed root-cause classification: Boundary Or Ownership Issue
- Reviewed refactor decision: `Refactor Needed Now` (bounded)
- Implementation matched the reviewed assessment: `Yes`. Structure publication no longer owns child detail loading; hub children's artifacts use the compound identity.
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the store is the only entry point for UI code; components call only `selectChild`, `inspect`, `syncHost`, `taskRows` and `childTargetFor`. The child hydration never imports the store. The streaming service never imports the child hydration. The member view service never uses `CollaborationExecutionLocationService`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`. Eager staging, the `stageAgentRunCollaborationContext` name and its `activityRevisions` / `isCurrent` / `commit`, the store's revision capture, the `commit` parameters, and `fetchMemberRunState`'s `runId` are all removed.
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. `AgentRunCollaborationContext.addContextsForNewChildren` and `commitTree` were private and had no caller (definitions were their only occurrences); they are removed with their now-unused imports.
- Dead code found elsewhere, listed as follow-up: None found.
- Shared structures remain tight: `Yes`. `fetchMemberRunState` has one input shape with explicit fetchers; `RunFileChangeEntryObject` is reused unchanged.
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes`
  - Largest is `agentRunCollaborationContext.ts` at 349 effective lines (353 before), then `agentRunCollaborationStore.ts` at 307 (280 before).
  - The new child hydration file is 119 lines.
  - Largest changed-line delta: 98 (`agentRunCollaborationHydration.ts`, mostly deletion).
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: `design-spec.md` → Persisted Data / State Transition Decision
- Implementation follows the approved decision: `Yes`. Reads only, through existing readers; nothing is written or reshaped.
- Direct-use evidence or discard/rebuild result: N/A
- Migration implementation: N/A
- Deviation: `None`

## Environment Or Dependency Notes

- **Codegen.** `codegen.ts` reads the schema from `BACKEND_GRAPHQL_BASE_URL` (`localhost:8000`, possibly the user's running app), so I did not use it. Instead:
  - I printed the worktree server's schema in-process (`buildGraphqlSchema()` → `printSchema`, through a temporary test file that I removed) to a file outside the repository.
  - I ran `graphql-codegen` against that file.
  - The full regeneration also showed pre-existing drift unrelated to this ticket (for example `Delegated*` types and `defaultLaunchConfig` fragment fields). I kept only the generated output for `GetAgentRunCollaborationMemberFileChanges` (the `Query` field, args type, operation types, document and hooks) and left the drift out of scope (follow-up below).
- **Server build.** `autobyteus-server-ts/dist` was built from `54e5356ae6` for IMP-09 (untracked build output).
- **Baseline breakage.** The native-input-history harness already failed at base. It called `staged.commitActivities()`, but staging returned `{ context, commit }` after f92a554399. This is derived from the source; base was not executed. The rewrite in `291545c66f` replaces those lines.
- **Web tsc.** The web package has no maintained typecheck gate: `pnpm -C autobyteus-web exec tsc --noEmit -p tsconfig.json` reports 668 errors. None are in the changed production files. The one in a line I wrote (a mock typing) was fixed. The remaining hits in changed spec files are older lines this change didn't touch.
- **Follow-up for the Project Task manager.** `autobyteus-web/generated/graphql.ts` is behind the server schema. Regenerating from the worktree schema adds `Delegated*` types and mutations and changes `defaultLaunchConfig` fragment fields. Evidence: the codegen diff described above.

## Checks Run

All checks ran on macOS 26.5.2, node v22.23.1, pnpm 10.28.2 with a clean tracked tree.
- IMP-01..IMP-09 ran on `54e5356ae6` (IR-001, pre-merge).
- IMP-10..IMP-18 ran on `2cb21ab41e` (IR-002, merged `origin/personal` @ `2763e7c678`), after `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild` and `nuxt prepare`, one check at a time.

 Evidence files are in `tickets/in-progress/delegated-copies-slow-open/evidence/`, each starting with a header.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `54e5356ae6` | macOS, node 22 | server `src` | D-3 | Pass | `IMP-01-server-typecheck.log` | `# ---- exit code: 0` |
| IMP-02 | `cd autobyteus-server-ts && pnpm exec vitest run tests/unit/standalone-agent-run-root/standalone-root-member-file-changes.test.ts tests/unit/run-history/services/run-file-change-projection-service.test.ts tests/unit/api/rest/run-file-changes.test.ts --no-watch` | `54e5356ae6` | macOS, node 22 | member view service `getFileChanges`, `RunFileChangeProjectionService` (located and run-id paths), REST content route | BEH-003, AC-009, REQ-004, review note 3 | Pass | `IMP-02-server-focused-unit.log` | `Tests  17 passed (17)` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit` | `54e5356ae6` | macOS, node 22 | whole server unit suite | regression | Pass | `IMP-03-server-unit-suite.log` (+ `.excerpt.txt`) | `Test Files  717 passed \| 4 skipped (721)` |
| IMP-04 | `cd autobyteus-web && pnpm test:nuxt --run services/agentCollaboration stores/__tests__/agentRunCollaborationLazyChildren.spec.ts stores/__tests__/agentRunCollaborationStore.spec.ts stores/__tests__/agentRunCollaborationStoreClosure.spec.ts stores/__tests__/agentRunCollaborationDisclosure.spec.ts stores/__tests__/agentRootCompactionIntegration.spec.ts components/workspace/history/__tests__/AgentRunTaskRowsDisclosure.spec.ts composables/projects services/runHydration services/agentOrgExecution services/agentStreaming/handlers` | `54e5356ae6` | macOS, node 22 | agent collaboration services, store, context, streaming, child hydration, member run state, team/org callers, pending-input projection, rows, Task navigation | BEH-001..005; AC-001, AC-002, AC-004..AC-007; tests (a), (b) | Pass | `IMP-04-web-focused-specs.log` (+ `.excerpt.txt`) | `Test Files  48 passed (48)`, `Tests  391 passed (391)` |
| IMP-05 | `pnpm -C autobyteus-web test:nuxt --run` (full suite, run in parallel with IMP-03) | `54e5356ae6` | macOS, node 22, heavy concurrent load | whole web suite | regression | Fail: 1 test, unrelated, load-induced (see IMP-05b, IMP-05c) | `IMP-05-web-nuxt-suite.log` (+ `.excerpt.txt`) | `Tests  1 failed \| 4489 passed`; `managedExtensionService.spec.ts … Test timed out in 5000ms` |
| IMP-05b | `cd autobyteus-web && pnpm test:nuxt --run electron/extensions/__tests__/managedExtensionService.spec.ts` | `54e5356ae6` | macOS, node 22, idle | the one IMP-05 failure, alone | cause analysis | Pass | `IMP-05b-web-electron-extension-rerun.log` | `transcribes via the worker  3768ms` (5 s default timeout, so parallel load pushes it over) |
| IMP-05c | `pnpm -C autobyteus-web test:nuxt --run` (full suite, nothing else running) | `54e5356ae6` | macOS, node 22, idle | whole web suite | regression | Pass | `IMP-05c-web-nuxt-suite-alone.log` (+ `.excerpt.txt`) | `Test Files  634 passed \| 2 skipped (636)`, `Tests  4490 passed \| 5 skipped (4495)` |
| IMP-06 | `pnpm -C autobyteus-web guard:web-boundary && … guard:localization-boundary && … audit:localization-literals` | `54e5356ae6` | macOS, node 22 | web boundary and localization rules | — | Pass | `IMP-06-web-guards.log` | `[guard:web-boundary] Passed.`, `[audit:localization-literals] Passed with zero unresolved findings.` |
| IMP-07 | `pnpm test:native-input-history` | `54e5356ae6` | macOS, node 22 | real native producer, server projection and view → `buildAgentRunCollaborationContext` → `hydrateAgentRunCollaborationChild` with pending input | REQ-006, AC-006 (held/queued input) | Pass | `IMP-07-native-input-history.log` | `Tests  2 passed (2)` (agent and agent_team) |
| IMP-08 | `bash tickets/in-progress/delegated-copies-slow-open/evidence/IMP-08-mutations.sh`: each mutation removes one mechanism, runs the guarding specs and restores the file from git | `54e5356ae6` | macOS, node 22 | supersession check (M1), pending overlay (M2), carry-over pending reset (M3), post-publication load (M4), context-keyed dedupe (M5) | AR-001, D-2, D-4, D-5, REQ-006 | Pass (every mutation caught, every file restored) | `IMP-08-mutation-checks.log` | Each `=== M*` block lists `×` failures, then `restored: yes` |
| IMP-09 | `pnpm -C autobyteus-server-ts build`, then `cd autobyteus-web && pnpm test:e2e:delegated-team-default-collapse --output-dir <ticket>/evidence/IMP-09-browser-collapse-probe`. The probe owns its backend (`dist/app.js`), data root, ports, Nuxt dev server, headless Chrome and scripted AGY delegations. | `54e5356ae6` | macOS, node 22, headless Chrome 155 | rendered rows → copy open → center view; real GraphQL incl. the new query; Task locate; live closure | BEH-001, BEH-003, BEH-004; AC-001, AC-004, AC-005, AC-007 (rendered) | Pass | `IMP-09-browser-collapse-probe-run.log`, `IMP-09-request-summary.txt`, `IMP-09-browser-collapse-probe/{evidence.json,initial.png,member.png,task-root.png,live-closure.png}` | `"result":"Pass"` with 7 cases and `dataRootRemoved: true`. Summary: 42 children, and member requests only for the 2 opened copies (`GetAgentRunCollaborationMemberProjection` 5 + 3, `GetAgentRunCollaborationMemberFileChanges` 5 + 3). `GetRunFileChanges` was issued only for the host. |

| IMP-10 | `pnpm -C autobyteus-server-ts typecheck` | `2cb21ab41e` | macOS, node 22 | server `src`, merged | IR-002 | Pass | `IMP-10-server-typecheck.log` | `# ---- exit code: 0` |
| IMP-11 | `cd autobyteus-server-ts && pnpm exec vitest run tests/unit/standalone-agent-run-root tests/unit/run-history tests/unit/api/rest/run-file-changes.test.ts --no-watch` | `2cb21ab41e` | macOS, node 22 | the scoped query's owners, next to the base's message-log store and readers | BEH-003, AC-009; interaction (b) | Pass | `IMP-11-server-focused-unit.log` | `Test Files  58 passed (58)`, `Tests  318 passed (318)` |
| IMP-12 | `pnpm -C autobyteus-server-ts test:unit` | `2cb21ab41e` | macOS, node 22, idle | whole server unit suite, merged | regression | Pass | `IMP-12-server-unit-suite.log` (+ `.excerpt.txt`) | `Test Files  728 passed \| 4 skipped (732)` |
| IMP-13 | same file list as IMP-04, from `autobyteus-web` | `2cb21ab41e` | macOS, node 22 | as IMP-04, plus the base's `agentRunCollaborationContextBatch.spec.ts` and the two new batched-content cases | BEH-001..005; AC-006, AC-007 under batches; interaction (a) | Pass | `IMP-13-web-focused-specs.log` (+ `.excerpt.txt`) | `Test Files  50 passed (50)`, `Tests  403 passed (403)` |
| IMP-14 | `pnpm -C autobyteus-web test:nuxt --run` (full suite, nothing else running) | `2cb21ab41e` | macOS, node 22, idle | whole web suite, merged | regression | Pass | `IMP-14-web-nuxt-suite.log` (+ `.excerpt.txt`) | `Test Files  636 passed \| 2 skipped (638)`, `Tests  4513 passed \| 3 skipped (4516)` |
| IMP-15 | as IMP-06 | `2cb21ab41e` | macOS, node 22 | web boundary and localization rules | — | Pass | `IMP-15-web-guards.log` | `[guard:web-boundary] Passed.` |
| IMP-16 | `pnpm test:native-input-history` | `2cb21ab41e` | macOS, node 22 | as IMP-07, merged | REQ-006, AC-006 | Pass | `IMP-16-native-input-history.log` | `Tests  2 passed (2)` |
| IMP-17 | `bash tickets/in-progress/delegated-copies-slow-open/evidence/IMP-08-mutations.sh` | `2cb21ab41e` | macOS, node 22 | M1..M5 as IMP-08, on the merged context and store | AR-001, D-2, D-4, D-5, REQ-006 | Pass (every mutation caught, every file restored) | `IMP-17-mutation-checks.log` | Each `=== M*` block shows failures, then `restored: yes` |
| IMP-18 | `pnpm -C autobyteus-server-ts build`, then the collapse probe as IMP-09 | `2cb21ab41e` | macOS, node 22, headless Chrome 155 | rendered rows → copy open → center view on the merged build (batched content stream) | BEH-001, BEH-003, BEH-004 (rendered) | Pass | `IMP-18-browser-collapse-probe-run.log`, `IMP-18-request-summary.txt`, `IMP-18-browser-collapse-probe/` | `"result":"Pass"`, 7 cases, 0 failed requests. Member requests only for the 2 opened copies (5 + 3 each); `GetRunFileChanges` only for the host |
- Not run, and why (IR-002 additions first):
  - On the merged state: the large-hub probe `S` cases (AC-001, AC-003, AC-004, AC-008, AC-009), the live cases `L-001`, `L-002` and `L-004` (AC-006, AC-007) and the ticket's server GraphQL E2E. These are API/E2E's integrated-state rerun, which delivery asked for. The large-hub probe first needs the message-log adaptation described in Integration Merge (IR-002) → (b).
  - Server integration and E2E suites, `test:integration` and `pnpm test:e2e`: API/E2E's layer. The new query's GraphQL transport is covered at the unit level only.
  - AC-008 timings on a synthesized large hub (design step 6), and rerunning `probes/open-cost-probe.test.ts` with the new `getFileChanges`: API/E2E.
  - Isolated desktop instance: API/E2E.
  - Electron main-process tests (`test:electron`): no Electron code changed.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys:
  - Workspaces sidebar copy rows under a standalone run.
  - Opening a copy (row click, Team row → coordinator, Task locate) into the center view.
  - A live hub's new delegation or closure.
- Approved UI/UX, interaction, requirement, or design references: no UI change (requirements: UI not applicable; Non-Goals: no new loading UI; review R-E).
- Existing design system, shared components, and adjacent product surfaces reviewed: `AgentRunTaskRows.vue`, center view through `activeContextStore.childTargetFor`, and the Team tab. None changed.
- Testing guideline or development / preview instructions and rendered surface used: TESTING.md browser probe layer, the existing `delegated-team-default-collapse` probe (real backend, Nuxt dev, headless Chrome).
- States, layouts, viewports, and interactions inspected:
  - Fresh stored hub (7 collapsed Teams, 42 children): rows drawn from the view.
  - Disclosure button versus body click, and Enter/Space on a Team row.
  - Selecting the exact member of a same-address copy: the center shows that copy's stored conversation ("Persisted marker for copy 2", not copy 3), with the composer draft kept.
  - Task locate.
  - Live closure.
  - Reviewed `initial.png` and `member.png` directly.
- Visual or interaction issues found and corrected: none in scope. `member.png` shows overlapping rows because it is captured immediately after a collapse click, mid leave-transition (`shot('member')` follows the click). This is the existing row transition, not this change.
- Check IDs with the supporting evidence, and remaining unverified states or limitations: IMP-09. Not exercised by me:
  - The brief empty view of a copy before its load finishes, which is by design (R-E).
  - A large (≥50 Teams) hub and app wall-clock timings (API/E2E, AC-008).
  - The Electron desktop shell (isolated instance).

## Downstream Coverage Hints / Suggested Scenarios

- **IR-002 integrated-state rerun (delivery DR-001).**
  - Large-hub probe `S` cases and live `L-001`, `L-002` and `L-004` under batched content.
  - Before seeding a fresh large hub, adapt `delegated-copies-large-hub-probe.mjs` to the rotated JSON Lines hub log: count lines in `communication_messages_*.jsonl`, or read the stored view through GraphQL.
  - The AC-008 timings now include the base's append-only hub-log reader in the view read.

- **Large hub regression (AC-008, QR-001, QR-002), per the design's Guidance.**
  - Shape: ≥50 task Teams × 5–6 members, a few-MB hub log and ≥300 unrelated stored team runs.
  - Time hub row → copy rows, hub click → conversation, and copy click → conversation, for base and fix, and record the request counts. Expected: one `GetAgentRunCollaboration` per hub to draw the rows, zero member requests, and on copy click exactly one `GetAgentRunCollaborationMemberProjection` and one `GetAgentRunCollaborationMemberFileChanges`.
  - The investigation probe can gain a `getFileChanges` timing next to its unscoped `[fileChanges]` line.
- **Live hub (AC-006, AC-007).**
  - Open a copy, then have the hub delegate a new copy. Expected: the new row appears, the opened copy keeps its conversation, and exactly one refresh of that copy happens (no requests for others).
  - Send to the opened copy while it loads. The message stays.
  - A copy with held or queued input shows it after opening.
- **R-004 / D-4 path.** Click a copy under a hub that isn't selected. Expected: at most two loads of that copy, ending loaded.
- **FU-4.** Task locate (`useTaskRootNavigation`) should now find the worker within its 5 s wait.
- **Artifacts of a running hub's copy** now come from the live projection (R-B): artifacts produced during the session should list without a reload.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Server API/E2E coverage of `agentRunCollaborationMemberFileChanges` over real GraphQL: stored hub, running hub, and a foreign child rejected.
- Browser probe runs (collapse probe with the updated B-002/P-001; cross-scope mentions probe) and an isolated desktop instance journey of the large-hub scenario above.
- AC-008 baseline-versus-fixed timing report and the regression check command (REQ-008).
