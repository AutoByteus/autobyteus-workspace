# Architecture investigation — COLLAB-FOLLOWUP-001

AD-REV-001. Architecture-owned technical supplement, not a replacement for the approved requirements investigation. Source inspected at `53fffe8bd4845b902e48b567649e061bea39ddfc`; original comparison `5645b49d6f51faa60bd3545bc8e3f0e7e3f96793`. Repository-relative paths below resolve in `/home/autobyteus/workspace/.codex/worktrees/collaboration-follow-up-fixes`. `S` = `autobyteus-server-ts/src`; `W` = `autobyteus-web`.

## Evidence and method

Read approved RER-002 requirements, original comparison and scoped intake; independently inspected current source and pinned original Git blobs using `git show`, `rg`, `sed`, and SHA256/blob checks. No fetch/checkout/reset or original executable rerun. The new tree started clean on the assigned branch. `architecture-evidence/AD-REV-001/source-witnesses.json` preserves focused current hashes and original blob IDs. The full initial tracked-file checksum inventory is administrative scratch, not a new inherited validation scope.

Two **architecture diagnostics**, not implementation or acceptance tests, were run against unchanged new-tree code and read-only installed dependencies from the old completed worktree. Scripts/logs and limitations are retained in `architecture-evidence/AD-REV-001/`; see `diagnostic-disposition.md`. No source/test edit, install/build, live provider, HTTP call, root, browser tab or runtime-data change. A jsdom/memory-router controlled setup is not hosted frontend/Pinia/backend proof. Successful diagnostics establish only their stated mechanisms.

## AINV-001 — fresh root availability versus worker readiness

Current standalone path: `S/agent-team-execution/services/agent-team-run-manager.ts` create → `team-root-materializer.ts` → `local/flat-team-execution-factory.ts` → `flat-team-execution-manager.ts.prepareConfiguredActivation`. The materializer always requests configured-Agent preparation; the manager iterates all configured members. This explains the source-level eager launch difference. It is consistent with, but does not independently repeat, the archived fresh Team GUI observation.

The factory already supports `prepareConfiguredAgents: false`: it still constructs Team context/manager/TeamRun, but returns empty staged-binding arrays and no activation plan. The configured registry creates handles on exact input; an absent handle's snapshot is Offline. `flat-team-agent-execution-handle.ts` and shared `configured-agent-execution-handle.ts` implement single in-flight readiness, binding callbacks and termination fencing. The handle itself is not an AgentRun. Reads and status inspection do not call readiness. Root availability therefore need not imply worker readiness.

Current Org path: `S/agent-org-execution/services/agent-org-execution-scope-builder.ts` prepares each direct Agent and mounted flat Team, folds staged bindings, validates/persists the initial package, publishes plans, activates one Org root. `agent-org-root-agent-execution-registry.ts.prepareConfigured` always stages a provider activation; `agent-org-team-execution-directory.ts.prepareConfigured` requests all configured Agents. Keep full configured topology and private mounted TeamRun scopes at launch; defer the worker activation only. A mounted Team is not a separately admitted root.

Restore and real task creation use these mechanisms too. The shared activation planner explicitly distinguishes fresh, external restore, no-conversation replacement, and indeterminate/present-with-missing-binding failure. Globally flipping a factory default or deleting activation staging would change those policies. Target only **fresh configured-root** callers. Task Agent/Team preparation and event gates stay intact.

### AINV-001a — necessary receiver-eligibility consequence

`S/agent-org-execution/domain/agent-org-run.ts.isCurrentAgent` currently uses `rootAgents.isActive` for a direct Agent, but a mounted Team's scope activity for a Team-hosted Agent. `RootCommunicationEngine.deliver` checks both exact sender and receiver through its adapter **before** reserving recipient input. After deferring workers, an unused direct recipient would fail this check and never reach readiness. This is a source-demonstrated consequence of the proposed change, not an observed extra production incident.

Every public Org logical/exact message method first calls `authorizeIdentity(sender)`; task lifecycle authorization also uses the current-sender check. Retain that authorization. Split the private predicates: exact published execution membership for communication routing, existing active-origin authorization for initiating commands. The receiver predicate must retain root + AgentRun + address + live execution-index identity and published host/handle membership; it must reject settled task Agents, wrong roots/addresses, reserved-unpublished handles and closed roots. It must not call `ensureReady` while checking identity. Reservation then owns exact first activation. Standalone RootTeamRun already separates exact membership from readiness this way. No change to the shared communication engine or public address contracts is required.

### Original first inter-Agent input — additional direct trace

After the user's confirming question, re-read pinned original `services/team-communication/team-communication-service.ts:89–91` → `MixedTeamManager.reserveDirectAgentInput:133–147` → `MixedAgentMemberHandle.reserveInput:90–91` → `ensureReady/initializeReady:221–251`. This path creates/starts the exact configured recipient on first input. Original `RootTeamRun.isCurrentAgent:446–449` checks root/index/address identity, not whether the worker already started. Original manager status `98–105` reports absent configured handles Offline. The nested child scope is also materialized lazily through its original handle; that historical topology is not reintroduced. Line-numbered Git excerpts/hashes: `architecture-evidence/AD-REV-001/original-first-input-boundary.txt`. This confirms the requested existing first-message principle without claiming an original live run or new product behavior.

### AINV-001b — persistence/read evidence

`S/run-history/store/run-execution-tree-shared-record-schemas.ts` permits a configured Agent's `platformAgentRunId: null`; exact local AgentRun ID/address exist independently. Current fixture `autobyteus-server-ts/tests/fixtures/current-agent-org-run-fixtures.ts.testOrgAgentNode` uses this shape. Current Team/Org binding mutators adopt a real provider binding only after durable commit and reject conflicting substitutions. The activation planner handles no-activity/null-binding normally; old bound/retained records keep their existing restore policy.

`S/run-history/services/agent-org-member-run-view-projection-service.ts` resolves exact physical membership and reads local projection metadata, not provider readiness. `agent-run-view-projection-service.ts` → `projection/providers/local-memory-run-view-projection-provider.ts` → AgentMemoryService/MemoryFileStore returns empty conversation for absent trace files; actual unreadable trace errors remain errors. Existing Org inspection tests distinguish empty trace from physical read failure. Web `services/teamExecution/teamExecutionContextFactory.ts` and `services/agentOrgExecution/agentOrgContextHydration.ts` initialize Agent state Offline before truthful status events. No UI startup mask or new empty-member schema is needed.

This is a reader/writer and representative-fixture proof, not a scan of an actual installation. Stored data volume is unmeasured, no old records are transformed, and no loss/discard/migration is authorized.

## AINV-002 — publication versus user-selection completion

Archived `LIVE-PUB-mounted-result.json` records one selected Org mounted-member route becoming bare `/workspace` with prior Team selected during publication (29 status events, 148 polls). The later `LIVE-PUB-mounted-confirm-result.json` records a **different** 27-event/114-poll run retaining the selection with instrumented navigation. Neither identifies the original introducing call or proves a repair. The Requirements scoped index is the authority for absolute archive paths and hashes.

Independently inspected `W/services/agentOrgExecution/agentOrgStreamingService.ts`, `agentOrgExecutionContext.ts`, `stores/agentOrgContextsStore.ts`, `stores/runHistoryNavigationStoreActions.ts` and the Org workspace watchers. Background publication patches its exact context/history projection; it does not explicitly call legacy run selection or push bare Workspace. `AgentOrgWorkspaceView.vue` updates mode on the same Org route. Retained adoption preserves selection/local draft object. Do not invent a publication→router call from file names or temporal coincidence.

There **is** a concrete normal asynchronous selection gap:

1. `W/composables/useWorkspaceHistorySelectionActions.ts.onSelectTeamMember` starts inspection of an earlier chosen Team.
2. `stores/runHistoryTeamMemberInspectionActions.ts` → `services/runOpen/teamMemberInspectionCoordinator.ts` awaits member projection. It checks the same Team remains mounted, not whether a newer user selection exists.
3. A newer explicit Org choice can finish during that await.
4. The old completion focuses its Team member and commits legacy Team selection; the sidebar emits `run-selected` unconditionally.
5. `W/components/AppLeftPanel.vue.onRunningRunSelected` converts the Org route to bare `/workspace`, exposing legacy selection.

`navigation-probe.cjs` composes the actual sidebar action, inspection store action and inspection coordinator with a controlled projection/Team view and installed Vue memory router. It mirrors the small AppLeftPanel event body. Output: Org exact route before release; prior Team selection/bare `/workspace` after release, one old selection emission, no new click. This demonstrates a missing latest-intent invariant in supported SCN-004. **It is not causal attribution for the original SCN-003 publication-only observation.** A durable real-composition regression and ordinary frontend corroboration remain required.

Adjacent same-owned call sites are `runHistorySelectionActions.ts`, `runHistoryLoadActions.ts.openHistoricalRun`, `runOpen/agentRunOpenCoordinator.ts`, `runOpen/teamRunOpenCoordinator.ts` (including recovery), and `useWorkspaceHistorySubjectActions.ts`: all can commit selection after awaited hydration. `useWorkspaceRouteSelection.ts` also drops a newer execution link while `applyingSelection`, watches an obsolete member-address key instead of actual AgentRun link key, and strips the *current* route in `finally`, even if a different navigation occurred. These are bounded selection-entry/completion concerns, not a reason to replace streaming, hydration freshness, router, or context stores.

The target uses one current explicit-selection intent in the existing selection owner, shared only along selection paths. Read-only/background hydration must not acquire intent. Guard the lowest focus/selection commits and their outward shell events, not just one event handler. Pure publication preservation must be tested separately; if frontend reproduction exposes a different selection writer, identify it before expanding the patch and return material Design Impact rather than claiming the known guard fixes an unknown cause.

## AINV-003 — first sent attachment's reactive identity

`W/stores/agentRunStore.ts` appends a local first message before awaiting prepare/promote/finalize/send. `services/runSubmission/localUserSubmission.ts.beginLocalUserSubmission` constructs a plain object, pushes it into a reactive conversation, but returns that **raw object** in the handle. Finalization later replaces `handle.message.contextFilePaths` through the raw reference. `components/conversation/UserMessage.vue` computes displayed attachment entries from the message proxy; clicking uses the computed entry. Mutating the raw object's property does not invalidate that computed dependency. A parent revision/force-render is not equivalent to a reactive property update.

`attachment-probe.cjs` loads actual unchanged helper, actual compiled UserMessage SFC and actual opener. Synthetic reactive context, controlled peripheral stores, jsdom, installed Vue 3.5.28. After finalization, underlying message locator is final, one message remains, presentation revision increments, but actual rendered chip click still uses draft URL—even after component force-update. Diagnostic control changing only the handle reference to the canonical message proxy makes the chip use final URL. window.open is captured; there is no server request or tab.

This mechanism is consistent with API-FIND-040: draft upload/finalization/accepted input/trace all held correct final content, live chip used draft404, reopen used final200. It is **not** proof of provider-specific causation, durable loss or a newly introduced Org defect. `UserMessage`, opener and much standalone first-Send code are byte-identical to original personal; localUserSubmission's Org change only adds nullable navigation-target behavior. The raw-reference mechanism predates that small delta.

Target: create and retain one canonical reactive submitted message in `beginLocalUserSubmission`, append that same proxy, return it in the handle. Final attachment/message identity updates then reach the existing computed chip normally. Preserve the normal finalization/upload owner, pending/error flows, one input, original bytes, temporary-ID promotion and text/JSON separate-link opener. Do not introduce message copies, remounts, forced reload, draft-URL fallback, a second Send, or Files-tab routing.

## Original-personal comparison conclusion

| Concern | Original pinned behavior/source | Current/target decision |
| --- | --- | --- |
| Fresh configured Team readiness | Mixed factory constructs backend/manager; absent direct/nested handles report Offline; nested Team handle `ensureReady` materializes on demand | Reuse lazy worker readiness. Keep current fixed-depth Org/full mounted scope; do not restore recursive configured Team model |
| Root activity versus exact status/aggregate | Root availability, exact Agent state and descendant aggregate are distinct | Preserve that separation; no root Stop decision from member color/aggregate |
| Event publication | TeamStreamingService updates exact runtime/history presentation separately from deliberate selection | Retain current equivalent separation and guard delayed explicit selection completion |
| Text access | Same uploaded-text separate-link opener and message component; raw-reference risk exists in shared first-submit helper | Repair canonical reactive ownership, not file-access UX or old-branch compatibility |
| Confidence | Pinned source comparison, not a new old-branch live run or proof of immunity | Slower use could avoid overlapping operations; frequency/cause on original is not established |

## Remaining evidence and authorization limits

No current hosted frontend/provider outcome is claimed for this ticket. Native DeepSeek availability must be preflighted by the executable owner. No independent narrow/Org/task attachment failure or fifth/new original publication incident is claimed. Both controlled probes need durable tests using real owning composition. Status needs runtime-start/binding corroboration, not merely CSS. The old ticket's known-issue closure and validation history stay unchanged; this new package does not inherit its numerical acceptance or broad rerun requirements.
