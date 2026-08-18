# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Codex, Claude Agent SDK, and native AutoByteus restart-continuity investigation complete. The user explicitly approved the cumulative behavior scope on 2026-08-17. SR-003 passed architecture review, implementation commit `ddfb494e7` was halted after code review, and the native browser rerun now requires upstream SR-004 requirement/design rework before implementation may resume.
- Investigation Goal: Explain why reopened team conversations can display prior history while losing provider/native context, compare every affected runtime with `origin/personal`, and produce one lifecycle-correct design.
- Scope Classification: Large
- Scope Summary: Exact Codex/Claude provider identity durability; Claude first-session UUID lifecycle; native configured-member local-state restoration; workspace reactivation; candidate single-flight/publication ordering; preserved external-only team binding semantics. The separate Electron/database migration defect remains out of scope.
- Primary Questions Resolved:
  1. External provider IDs were learned outside the V1 root persistence owner.
  2. Claude formerly used an invalid local-ID placeholder before its provider UUID was known.
  3. V1 native root restoration discarded fresh-versus-restored materialization provenance and invoked fresh AgentRun construction.
  4. V1 restored members derived a workspace ID without reactivating the persisted workspace.
  5. The partial implementation then treated the native self-ID as an external provider binding; external gating is necessary but not sufficient.

## Request Context

The user reported that the affected branch reopens old conversation messages after a server restart but answers a context-dependent follow-up as a first turn. They required the ticket to bootstrap from `origin/codex/agent-team-universal-task-delegation`, not `personal`; prioritized this over a separate migration failure; requested live browser stop/restart/reopen experiments; supplied `/Users/normy/autobyteus_org/autobyteus-agents`; requested Classroom Simulation Team with Codex `gpt-5.6-luna`; then requested equivalent Claude and native AutoByteus testing. For native validation they requested DeepSeek V4 Flash and credential import from `/Users/normy/.autobyteus/server-data/.env`. After the native rerun still failed, the user explicitly directed requirements, investigation, and design updates and halted implementation.

## Environment Discovery / Bootstrap Context

- Project Type: Git super-repository with package workspaces
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix`
- Current Branch: `codex/codex-runtime-thread-resume-fix`
- Bootstrap Base: `origin/codex/agent-team-universal-task-delegation`
- Refreshed Base Commit: `2b0f8ea99296bb3f983c497d1f5c00a4d839f404`
- Comparison Branch/Commit: `origin/personal` / `acb8985930ccce49b632cdca22b92f5b237e35bf`
- Current Ticket HEAD: `ddfb494e7d...` (`fix(server): preserve external agent sessions across restart`), one implementation commit ahead of the base; source work is halted and must not be edited during this design round.
- Expected Finalization Target: `codex/agent-team-universal-task-delegation`
- Bootstrap Blockers: None
- Worktree Safety: The base worktree and shared personal checkout are comparison/test inputs only. Authoritative artifacts remain in the ticket worktree.
- Working Tree At SR-004 Start: implementation source committed; untracked downstream `code-review-report.md` and `code-review-revision-record.md`; no uncommitted source modifications.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence Captured | Core Artifacts Supported | Related IDs | Status / Approval | Follow-Up |
| --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/runtime-reproduction-evidence.md` | Codex browser restart reproduction | Stable local IDs, changed provider thread, null tree binding, screenshots/logs | Requirements, investigation, design | REQ-001, REQ-002, REQ-007; AC-001 through AC-004 | Complete / N/A evidence | Include downstream |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/claude-runtime-reproduction-evidence.md` | Claude browser/SDK/standalone investigation | Changed UUID, null tree binding, SDK `sessionId`/`resume`, personal comparison | Requirements, investigation, design | REQ-001 through REQ-004, REQ-009 through REQ-011; AC-010 through AC-015 | Complete / N/A evidence | Include downstream |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/autobyteus-runtime-reproduction-evidence.md` | Native base rerun plus personal control | Marker failure/pass, raw traces, working snapshots, tree, workspace and restore logs, source comparison | Requirements, investigation, design | REQ-012 through REQ-015; AC-016 through AC-019 | Complete / N/A evidence | Include downstream |

## Source Log

| Date | Type | Exact Source / Command | Why Consulted | Relevant Finding |
| --- | --- | --- | --- | --- |
| 2026-08-17 | User | Current task messages | Establish base, priority, runtimes, models, browser workflow, and approval | User authorized cumulative Codex/Claude/native continuity scope and halted implementation for upstream rework. |
| 2026-08-17 | Command | `git fetch origin codex/agent-team-universal-task-delegation`; `git rev-parse ...`; worktree/bootstrap commands | Resolve authoritative base | Dedicated ticket branch was created from refreshed base `2b0f8ea...`, not personal. |
| 2026-08-17 | Doc | `.codex/skills/solution-designer/SKILL.md`; `design-principles.md` | Apply workflow and architecture rules | Root authority, product reachability, clean-cut replacement, and no-migration analysis are mandatory. |
| 2026-08-17 | Code | `team-run-execution-tree.ts`; `team-run-execution-tree-schema.ts`; `team-run-execution-tree-builder.ts` | Locate persisted identity facts | V1 already stores local IDs, runtime kind, workspace root, and nullable external binding. |
| 2026-08-17 | Code | Base `agent-team-run-manager.ts`; `mixed-team-run-backend-factory.ts`; `mixed-agent-member-handle.ts` | Trace create/restore | Root restore loads V1 state but `materializeRoot` always calls fresh `createBackend`; null binding selects new AgentRun. |
| 2026-08-17 | Code | `root-team-run.ts`; `team-run-persistence-coordinator.ts`; `team-run-execution-tree-mutator.ts` | Identify binding owner | Root already has serialized write-before-live mutation boundary; SR-001 added exact binding adoption. |
| 2026-08-17 | Code | Codex backend/thread manager and standalone restore services | Trace provider lifecycle | Standalone carries the ID; team tree does not. Known resume failure formerly fell back to creation. |
| 2026-08-17 | Repo | `git show origin/personal:` for metadata mapper, team service/manager, mixed handle/factory, stream handler | Compare reported-good external path | Personal rebuilt metadata from mutable live contexts after events, persisting late external IDs. |
| 2026-08-17 | Setup | `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:///.../codex-resume-investigation-20260817-1.db` | Isolate realistic Codex run | Credentials imported only into disposable state; values were not retained. |
| 2026-08-17 | Repro | Browser `open_tab` workflow; full API stop/start; same run reopen | Test Codex report | Old messages displayed; provider context was lost; marker response was wrong. |
| 2026-08-17 | Trace | Codex sessions, V1 tree, server log | Correlate identity | Same local AgentRun used threads `01a0104a-...` then `01a0104c-...`; tree stayed null. |
| 2026-08-17 | Code | Direct task registry/delegation/persistence paths | Cover task binding lifecycle | Task candidate precedes its tree node; external binding must be staged into root task durability before publication. |
| 2026-08-17 | Code | Raw trace store/recorder/archive paths | Find canonical activity signal | Active plus complete archived user/assistant traces distinguish fresh from prior semantic activity without guessing an ID. |
| 2026-08-17 | Setup | Isolated Claude database; API 60418; web 31318; same secret-import form | Configure Claude test | No production state used. |
| 2026-08-17 | Repro | Browser Classroom Simulation Team; Claude SDK; DeepSeek V4 Flash-backed selection; full restart | Test Claude | `AMBER-ORCHID-4821` visible locally but absent from provider context after restart. |
| 2026-08-17 | Trace | Claude JSONL, tree, trace, log | Correlate UUID | Same local AgentRun used UUIDs `11771792-...` then `8ba2e83a-...`; tree stayed null. |
| 2026-08-17 | Spec | Installed `@anthropic-ai/claude-agent-sdk@0.3.231` declarations | Verify provider contract | SDK distinguishes new-session `sessionId` from existing-session `resume`. |
| 2026-08-17 | Code | Claude factory/session/client/cache; standalone provisioning/commands | Trace timing | Fresh Claude used local-ID placeholder; standalone metadata could commit it before stream UUID discovery. |
| 2026-08-17 | Review | `design-review-report.md` ARCH-REV-001 | Validate SR-002 | Found supported overlapping team/standalone activation could publish before authoritative durability. |
| 2026-08-17 | Code | WebSocket team/standalone dispatch and manager registration | Product reachability for review findings | Two normal commands can overlap; active registry is a real input-admission surface. |
| 2026-08-17 | Review | `design-review-report.md` ARCH-REV-002 | Validate SR-003 | Passed candidate single-flight, unpublished activation, cleanup/quarantine, root/task/standalone durability design. |
| 2026-08-17 | Implementation | Commit `ddfb494e7`; `implementation-handoff.md` | Inspect current ticket state | SR-003 was substantially implemented and committed before the native expansion. |
| 2026-08-17 | Review | `code-review-report.md`, `CODE-FIND-001` | Inspect halted implementation defect | Handle stages native `candidate.platformAgentRunId === local runId` as external binding; restart strict restore rejects it. |
| 2026-08-17 | Setup | Base rerun: disposable `/private/tmp/autobyteus-native-base-rerun-20260817`, API 60420, web 31320, exact secret import | Repeat native test with strict isolation | All database/data/memory/log/temp paths explicitly pinned; production DB not touched. |
| 2026-08-17 | Repro | Browser Classroom Simulation Team; `AUTOBYTEUS`; `deepseek-v4-flash`; marker `BASE-NATIVE-RERUN-20260817-P8W6`; full restart | Test native base | Pre-restart ACK passed; post-restart agent said it had no record of a marker. |
| 2026-08-17 | Trace | Retained base tree, raw trace, working snapshot, server log, screenshot | Correlate native state | Tree binding correctly null; both turns `turn_0001`; snapshot lost marker; log used missing-workspace temp fallback and fresh AgentRun creation. |
| 2026-08-17 | Setup | Personal control: disposable `/private/tmp/autobyteus-native-personal-control-20260817`, API 60421, web 31321, exact secret import | Compare reported-good branch | Same isolation and product workflow. |
| 2026-08-17 | Repro | Marker `PERSONAL-NATIVE-CONTROL-20260817-R5C3`; full restart | Test personal native | Marker was recalled exactly. |
| 2026-08-17 | Trace | Personal metadata, raw trace, working snapshot, server log, screenshot | Explain pass | Workspace re-established; mixed team and native AgentRun restore logged; snapshot retained then appended both turns. |
| 2026-08-17 | Repo | Diff/read personal vs base `AgentTeamRunManager`, `TeamRunService`, `TeamRunMetadataMapper`, `MixedAgentMemberHandle`, `AutoByteusAgentRunBackendFactory` | Establish root cause | Personal carries a restore context, ensures workspace, and invokes generic/native restore; V1 loses that provenance. |
| 2026-08-17 | Code | Current `AgentRunManager.prepareRestoreAgentRun`; `prepareRestoreAgentRunFromPlatformState`; native backend `getPlatformAgentRunId` | Find clean target seam | Generic restore is correct for native local state; strict platform restore is external-only; candidate seam can be reused. |
| 2026-08-17 | Code | Current `WorkspaceManager.ensureWorkspaceByRootPath`; native backend workspace lookup | Find workspace owner | Existing workspace subsystem can activate the persisted root; handle currently only derives an ID and backend sync lookup falls back. |

Operational note: an earlier exploratory native start inherited an unintended environment and was discarded as evidence. The authoritative second round above explicitly pinned disposable DB, app-data, memory, log, temp, and ports, then removed the disposable runtime directories after copying the retained evidence.

## Relevant Existing Behavior And Production Paths

| Behavior ID | Supported Trigger | Current Production Path | Evidence | Current Conclusion |
| --- | --- | --- | --- | --- |
| BEH-001 | Send to configured Codex team member | UI/WebSocket -> root command -> lazy mixed handle -> provider create; restart rebuilds null binding -> create | Browser/provider/tree/log supplement | Reachable defect |
| BEH-002 | Reopen conversation after restart | History projection reads local traces independently of runtime activation | Browser and raw traces | Visible history does not prove context |
| BEH-003 | Configured/task external initialization; native initialization | Handle consumes generic candidate platform ID | Source plus CODE-FIND-001 probe | Binding eligibility must be external-only |
| BEH-004 | Restore standalone Codex | Metadata -> standalone activation -> strict platform restore | Source/tests | Preserve |
| BEH-005 | First send to fresh external member | Lazy handle -> provider creation | Source/live first turn | Preserve with durability |
| BEH-006 | Known Codex resume failure | Provider manager caught error -> thread start | Source | Replace with strict failure |
| BEH-007 | Send/restart configured Claude member | Late UUID discovery; null V1 tree; second session after restart | Claude supplement | Reachable defect |
| BEH-008 | Abrupt standalone Claude restart | Placeholder metadata can precede UUID discovery | Source ordering | Reachable timing defect |
| BEH-009 | Send/restart configured native member | V1 restore -> fresh mixed factory -> null-binding handle -> new native AgentRun | Native base browser/log/source | Reachable defect |
| BEH-010 | First member activation after process restart | Deterministic workspace ID -> sync active lookup -> temp fallback | Native base log/source | Reachable defect |

## Design Health Assessment Evidence

- Change posture: Bug fix with required lifecycle refactor.
- Root causes: missing invariant plus boundary/ownership issue.
- External identity authority is split between mutable member context and root tree; SR-003 fixes this with root durability and unpublished candidates.
- Native materialization authority is missing: manager knows create versus restore, but factory/context/handle do not.
- Generic `platformAgentRunId` is not a universal continuation key. Native returns its local self-ID; external providers return separate opaque IDs.
- Workspace activation belongs to existing `WorkspaceManager`, but restored member configuration bypasses it.
- Refactor needed now: add explicit configured-member activation provenance; centralize plan selection in the handle; reuse generic manager restore for native and strict platform restore for external; external-gate binding; activate workspace before candidate construction.
- Refactor not needed: no new persistence schema, history projection, provider-agnostic replay, or second metadata authority.

## Relevant Files / Components

| Path | Current Responsibility | SR-004 Relevance |
| --- | --- | --- |
| `src/agent-team-execution/services/agent-team-run-manager.ts` | Root create/restore/package/register owner | Must preserve create-vs-restore provenance and call the corresponding factory entrypoint. |
| `src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts` | Builds mixed runtime contexts/managers | Must materialize configured-member mode explicitly and propagate it. |
| `src/agent-team-execution/backends/mixed/mixed-team-run-context.ts` | Mixed process-local runtime context | Owns non-persisted configured-member activation mode alongside member contexts. |
| `src/agent-team-execution/backends/mixed/mixed-sub-team-run-factory.ts` | Builds configured/task subteams | Configured children inherit mode; new task teams pass fresh explicitly. |
| `src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts` | Lazy configured child-team creation | Must forward inherited configured-member mode. |
| `src/agent-team-execution/backends/mixed/members/mixed-configured-member-registry.ts` | Creates configured handles | Passes root/configured activation mode. |
| `src/agent-team-execution/backends/mixed/members/mixed-task-agent-execution-registry.ts` | Prepares new task agents | Passes fresh mode and stages binding only for external runtimes. |
| `src/agent-team-execution/backends/mixed/members/mixed-task-team-execution-registry.ts` | Prepares new task teams | Passes fresh mode regardless of restored parent root. |
| `src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Member readiness/runtime adaptation | Selects new/native-restore/external-restore plan; ensures workspace; external-gates binding; retains single-flight. |
| `src/agent-execution/services/agent-run-manager.ts` | Private candidate lifecycle | Existing generic restore fits native; strict platform restore remains external. |
| `src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Native create/restore | Existing restore loads working snapshot; no provider-binding changes needed. |
| `src/agent-memory/services/agent-conversation-activity-inspector.ts` | Strict active/archive semantic activity classification | Reused to distinguish restored native activity from never-initialized native state. |
| `src/workspaces/workspace-manager.ts` | Workspace activation/registry | Existing `ensureWorkspaceByRootPath` must be called before candidate construction. |
| `src/agent-team-execution/domain/team-agent-platform-binding.ts` | External team binding value | Remains provider-neutral but is constructed only for external runtime candidates. |

## Runtime / Probe Findings

| Runtime / Branch | Marker | Pre-Restart | Post-Restart | Physical Result | Verdict |
| --- | --- | --- | --- | --- | --- |
| Codex / base | `COBALT-RIVER-9173` | Correct acknowledgement; thread `01a0104a-...` | Wrong marker; new thread `01a0104c-...` | Tree binding null | Fail |
| Claude / base | `AMBER-ORCHID-4821` | Correct acknowledgement; UUID `11771792-...` | Provider reports no marker; UUID `8ba2e83a-...` | Tree binding null | Fail |
| Native / base rerun | `BASE-NATIVE-RERUN-20260817-P8W6` | Exact ACK | Explicit no-record response | Binding null; turn number reset; snapshot replaced; temp fallback | Fail |
| Native / personal control | `PERSONAL-NATIVE-CONTROL-20260817-R5C3` | Exact ACK | Exact marker | Snapshot retained/appended; workspace/team/AgentRun restore logged | Pass |

All retained browser-owned processes/tabs were stopped/closed. Ports 60420/31320/60421/31321 were free. Disposable native runtime directories were deleted only after evidence was copied into the ticket.

## External / Public Source Findings

No web source was required. The relevant provider contracts were verified from installed primary artifacts:

- Codex app-server behavior was observed directly.
- `@anthropic-ai/claude-agent-sdk@0.3.231` distinguishes `sessionId?: string` for a new caller-selected UUID from `resume?: string` for an existing session.
- Native restoration behavior was verified from the repository source and live personal logs (`agentFactory.restoreAgent` plus `WorkingContextSnapshotRestoreStep`).

## Reproduction / Environment Setup

- Agent package: `/Users/normy/autobyteus_org/autobyteus-agents`
- Team: Classroom Simulation Team
- Codex model: `gpt-5.6-luna`
- Claude/native model selection: DeepSeek V4 Flash (`deepseek-v4-flash`; Claude selection used the configured Anthropic-backed entry)
- Credential import, always isolated:

```bash
pnpm secrets:import -- \
  --source /Users/normy/.autobyteus/server-data/.env \
  --database-url file:///private/tmp/<isolated-run>/autobyteus.db
```

- Required restart boundary: fully stop API, verify listener closed, restart with identical isolated data, reopen the same TeamRun, send a context-dependent marker question.
- Evidence standard: retain browser result, same local IDs, physical binding/snapshot, provider ID where applicable, and server create/restore logs. Visible history alone is insufficient.

## Findings From Code / Docs / Data / Logs

1. The user-visible defect is confirmed for Codex, Claude, and native AutoByteus configured team members.
2. Local history restoration is independent from provider/native runtime context restoration.
3. The external V1 defect is missing authoritative binding adoption; SR-003's root/tree/candidate design remains correct.
4. The native V1 defect is different: the same local run identity survives, but root materialization provenance does not.
5. `AgentTeamRunManager.restoreTeamRun()` currently calls the same mixed factory method used by create.
6. A native null external binding is correct; it cannot distinguish never-created from restored-with-local-memory.
7. Canonical active/archive traces can distinguish prior semantic activity. For restored native activity, generic `prepareRestoreAgentRun` invokes the native restore backend. For no activity, fresh creation remains appropriate.
8. The personal control succeeds because it explicitly reconstructs a restore context, reactivates workspace roots, and reaches native `restoreBackend`.
9. The base V1 path does not reactivate workspace roots, so native backend's synchronous lookup falls back to temp even though `workspaces.json` has the mapping.
10. `WorkspaceManager.ensureWorkspaceByRootPath()` is the existing owner and can be reused in the async member-config build; a new workspace subsystem is unnecessary.
11. The halted implementation's `CODE-FIND-001` is real: native backend self-ID is truthy, but the handle's binding/adoption branch is not external-gated.
12. Merely ignoring the native self-ID would preserve null binding but would leave the pre-existing browser restart failure. SR-004 must add materialization provenance and native restore planning.
13. Configured nested teams must inherit restored provenance. Newly delegated task agents and task teams are new executions and must remain fresh even when their parent root was restored.
14. The member handle remains the correct runtime-adaptation owner: it already owns lazy readiness, activity inspection, candidate selection, and external binding acceptance.
15. Single-flight candidate/publication/cleanup rules from SR-003 remain applicable to native; overlapping post-restart commands must create/restore only one native candidate.
16. No persisted schema field is required for materialization mode; the manager entrypoint supplies it for each process lifetime.
17. Valid existing external IDs and native memory are directly usable. Missing provider IDs, overwritten native snapshots, and conflicting Claude IDs remain unrecoverable/fail-closed states.
18. Legacy native self-ID values in converted V1 trees are not provider identities. Runtime kind and materialization mode ignore them for activation; no bulk rewrite is justified.
19. Open delegated-task recovery across process restart is a broader existing gap and is not established by this user's configured-member reproduction. New task creation/binding neutrality remains in scope; task hydration is not added speculatively.

## Persisted Data Transition Evidence (When Applicable)

- Stored subjects: V1 execution tree, local team AgentRun memory (working snapshot and trace corpus), workspace registry, standalone metadata.
- Representative base native tree: stable professor `agentRunId`, runtime `AUTOBYTEUS`, `platformAgentRunId: null`, workspace root `/Users/normy/autobyteus_org/autobyteus-agents`.
- Representative base post-restart memory: raw file contains both user turns, but working snapshot contains only the post-restart exchange.
- Representative personal post-restart memory: working snapshot contains both the pre-restart marker pair and appended recall pair.
- Reader/writer semantics: external binding is relevant only for external runtime kinds; native continuation uses local ID/memory. Fresh/restore is process-local provenance.
- Transition outcome: `Directly Usable — No Migration`.
- No schema change, data rewrite, or maintenance window is needed. A native self-ID value can remain physically present in old converted data but is ignored by the current runtime-kind rule; new writes never adopt one.
- Unrecoverable: absent external binding after prior provider activity; native snapshot already overwritten; provider UUID conflict.

## Constraints / Dependencies / Compatibility Facts

- Base/finalization target is universal task delegation, never personal.
- Root tree remains sole V1 external identity authority.
- AgentRun candidates remain undiscoverable/non-input-admitting until applicable durability commits.
- Same member/run callers join one readiness/activation result.
- Team platform binding construction/adoption is external-runtime-only.
- Native restore uses local run identity and memory, not strict platform-state restore.
- Configured materialization mode is explicit and process-local; it is not inferred from binding truthiness.
- New task executions are always fresh; configured children inherit their root/team provenance.
- Valid workspace roots are activated through `WorkspaceManager` before backend construction.
- No compatibility wrapper, event-driven metadata refresh, provider-history replay, or silent provider/native fallback is allowed.
- Real browser validation must use an isolated database and the exact secret-import form above.

## Open Unknowns / Risks

- Activity corpus read can be indeterminate; target must fail closed rather than fresh-create over uncertain native context.
- A native snapshot may be corrupt even when traces prove activity; native restore should surface the backend failure and must not retry as fresh.
- Candidate cleanup uncertainty continues to quarantine the local run ID.
- Legacy native self-ID values are ignored rather than rewritten; downstream tests should include one such direct-use fixture if representative data exists.
- Provider/live E2E is credential/environment gated. `api_e2e_engineer` owns final durable coverage classification after implementation and source review.
- Task execution hydration across restart is out of scope unless a separate supported reproduction establishes it.

## Notes For Architecture Reviewer

Review SR-004 cumulatively, not as a replacement for SR-003. Confirm:

1. `AgentTeamRunManager` preserves create/restore provenance and the mixed factory exposes two semantically distinct entrypoints.
2. The process-local mixed context carries configured-member activation mode; nested configured teams inherit it; new task agents/teams explicitly use fresh mode.
3. The handle selects exactly one activation plan: new, native local restore, or external exact restore.
4. External binding creation/adoption/strict platform restore never receives a native self-ID.
5. Workspace activation reuses the existing owner before candidate construction.
6. Native activity uses generic manager restore and retains SR-003 single-flight, unpublished candidate, cleanup, and publication ordering.
7. No persistence migration or parallel metadata authority is introduced.
8. The halted implementation and code-review artifacts are triggers only; `requirements.md`, these notes, `design-spec.md`, and the three evidence supplements remain the upstream authority.
