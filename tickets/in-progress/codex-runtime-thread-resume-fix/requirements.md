# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined — the original Codex basis, the Claude Agent SDK expansion, and the native AutoByteus restart-continuity expansion were explicitly approved by the user on 2026-08-17.

## Goal / Problem Statement

Restore truthful conversation continuity after a full server/application restart on `origin/codex/agent-team-universal-task-delegation` for configured team members backed by Codex, Claude Agent SDK, and the native AutoByteus runtime. External runtimes must continue the same provider thread/session; native AutoByteus must restore its persisted local working context. Reopened local history must never mask a context-free replacement execution.

The V1 TeamRun path has two distinct continuity defects. For external providers, it does not durably commit provider-native identities into the authoritative execution tree. For native AutoByteus, it reconstructs the same local AgentRun ID but loses fresh-versus-restored materialization provenance, invokes fresh creation rather than native restoration, and does not reactivate the persisted workspace before backend construction. Claude also has a provider-specific timing defect: fresh creation formerly exposed the local AgentRun ID as a placeholder before the real UUID was known. The solution must repair these lifecycle boundaries without turning a native local run ID into an external provider binding.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | A configured Codex team member creates a provider thread and completes turns, but its authoritative TeamRun node remains `platformAgentRunId: null`. After restart, the same local AgentRun ID creates a different Codex thread. | The first established provider ID is durably adopted by the matching authoritative execution-tree node and is used to restore that exact provider thread after restart. | TeamRun ID, AgentRun ID, configured identity, and normal conversation flow remain stable. | REQ-001, REQ-002; AC-001, AC-002, AC-004 |
| BEH-002 | Persisted local history is restored and displayed after restart even when runtime context is not resumed. | Local history and runtime context are both restored; visible history is never treated as proof of provider or native working-context continuity. | Existing message visibility, order, and content remain unchanged. | REQ-007, REQ-015; AC-003, AC-018 |
| BEH-003 | Configured-agent and delegated task-agent execution-tree nodes have a provider-binding field, but external bindings may update only detached runtime context. A native backend also reports its local run ID through a generic platform-ID accessor. | External provider bindings use one root-owned durable invariant for configured and task agents. Native TeamRun executions never enter external binding staging/adoption and newly written native nodes remain null. | Native local AgentRun identity continues to exist independently of external provider binding. | REQ-003, REQ-009, REQ-013; AC-005, AC-017 |
| BEH-004 | Standalone Codex AgentRuns persist a provider ID and request restoration. | Standalone Codex restoration continues to use the exact persisted provider ID without regression or silent replacement. | Standalone persistence remains outside team-tree ownership. | REQ-008; AC-009 |
| BEH-005 | A genuinely fresh external-provider AgentRun with no activity or binding creates a new provider thread. | Fresh runs keep supported creation, then durably record the returned binding before restart continuity is relied upon. | No identifier is invented or guessed. | REQ-004; AC-006 |
| BEH-006 | Codex catches failure of `thread/resume` for a known ID and silently starts a new thread. | Known-thread resume failure is observable and never falls back to creation. | Explicit creation remains available only for genuinely fresh runs. | REQ-005, REQ-006; AC-007, AC-008 |
| BEH-007 | A configured Claude member completes a turn on a provider UUID, but its authoritative node remains null. Restart creates a second UUID while local history displays the first turn. | Fresh Claude execution reserves one valid UUID before input, durably binds it, uses it for first-session creation, and resumes that exact UUID after restart. | Claude model selection, streaming, tools, local history, and same-process turns remain unchanged. | REQ-001 through REQ-004, REQ-009, REQ-010; AC-010 through AC-014 |
| BEH-008 | A fresh standalone Claude run can initially persist its local AgentRun ID as a placeholder; abrupt loss can occur before the real UUID is recorded. | Standalone Claude metadata contains the same valid UUID used for first creation and later resume before input is admitted. | Standalone identity, history, lifecycle, and workspace behavior remain unchanged. | REQ-009 through REQ-011; AC-014, AC-015 |
| BEH-009 | In a live browser rerun on the base branch, the same native TeamRun and AgentRun IDs reopened after restart, but the first recall turn reported no prior context and replaced the prior working-context snapshot. `AgentTeamRunManager.restoreTeamRun()` still called `MixedTeamRunBackendFactory.createBackend()`. | Restored configured native members with prior local activity invoke the native restore backend for the same local AgentRun ID and memory directory before the first post-restart input. The first new turn appends to the restored snapshot. | Genuinely new or never-initialized native executions still use fresh creation. | REQ-012, REQ-015; AC-016, AC-018, AC-019 |
| BEH-010 | The V1 restored handle derives a deterministic workspace ID, but the workspace is not active after process restart; the native backend logs a missing workspace and silently falls back to the temp workspace. `origin/personal` explicitly reactivates the persisted root and succeeds. | The persisted workspace root is re-established through the workspace owner before any native create/restore candidate is constructed; no silent temp fallback occurs for a valid persisted root. | Explicit null-workspace executions may continue to use the supported temp workspace. | REQ-014; AC-018, AC-019 |

## Investigation Findings

- Real-browser Codex and Claude restart reproductions proved local history can reopen while the provider creates a context-free replacement. Their provider IDs remained null in the V1 tree.
- `origin/personal` persisted late external IDs by rebuilding legacy metadata from live contexts. V1 removed that refresh bridge without a root-owned replacement.
- The installed Claude SDK supports caller-selected `sessionId` for first creation and a separate `resume` option, enabling valid UUID durability before input.
- A second isolated live-browser round used `Classroom Simulation Team`, native `AUTOBYTEUS`, DeepSeek V4 Flash, and `/Users/normy/autobyteus_org/autobyteus-agents`.
- On base commit `2b0f8ea99296bb3f983c497d1f5c00a4d839f404`, marker `BASE-NATIVE-RERUN-20260817-P8W6` was acknowledged before restart but not recalled afterward. Raw traces restarted at `turn_0001`, and the post-restart working snapshot no longer contained the marker.
- On `origin/personal` commit `acb8985930ccce49b632cdca22b92f5b237e35bf`, control marker `PERSONAL-NATIVE-CONTROL-20260817-R5C3` was recalled exactly; the working snapshot retained and appended both turns.
- Static comparison shows personal re-establishes the workspace and routes through `AgentRunManager.restoreAgentRun()` / `AutoByteusAgentRunBackendFactory.restoreBackend()`. V1 root restoration always materializes via the fresh mixed-backend entrypoint, and the configured handle uses null binding as a creation signal.
- The halted partial implementation exposes another native error: its generic candidate reports the native local ID, and the handle currently stages/adopts any truthy candidate ID as a provider binding (`CODE-FIND-001`). External-runtime gating is required but does not by itself repair the pre-existing native restart defect.
- V1 already persists every fact required for native restoration: root/local run identity, runtime kind, workspace root, deterministic memory location, working snapshot, and traces. Fresh-versus-restored provenance is known at the manager entrypoint and does not need a persisted schema field.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/runtime-reproduction-evidence.md` | Codex browser reproduction and retained provider-identity evidence | REQ-001, REQ-002, REQ-007 | AC-001 through AC-004 | Complete / Approval N/A | Evidence only. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/claude-runtime-reproduction-evidence.md` | Claude browser restart evidence, SDK contract, and personal comparison | REQ-001 through REQ-004, REQ-009 through REQ-011 | AC-010 through AC-015 | Complete / Approval N/A | Evidence only. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/autobyteus-runtime-reproduction-evidence.md` | Native browser rerun, physical snapshot/log evidence, and personal source/control comparison | REQ-012 through REQ-015 | AC-016 through AC-019 | Complete / Approval N/A | Evidence only. |

## Design Health Assessment (Mandatory)

- Change posture: Bug Fix
- Initial design issue signal: Yes
- Root cause classification: Missing Invariant and Boundary Or Ownership Issue
- Refactor posture: Needed now
- Evidence basis: The V1 tree is the durable external identity topology, but external binding adoption bypassed it. Separately, `AgentTeamRunManager` erased root materialization provenance by calling the fresh factory path for restore. `MixedAgentMemberHandle` then conflated provider-binding presence with all runtime restoration and depended on a generic platform-ID accessor whose native value is a local self-ID. Workspace materialization was also bypassed during restored member configuration.
- Requirement or scope impact: The solution needs a root-to-configured-member restoration intent, an external-only binding contract, native local-state activation planning, and workspace reactivation at the member configuration boundary, while retaining the already-reviewed candidate/durability architecture.

## Recommendations

1. Keep the root-owned durable provider-binding invariant and strict Codex/Claude restoration from SR-003.
2. Carry explicit process-local `fresh` versus `restore` materialization provenance from `AgentTeamRunManager` through mixed backend composition to configured members and nested configured teams.
3. Let the member handle select a narrow activation plan from materialization provenance, runtime kind, provider binding, and canonical local activity: new, native local restore, or external exact restore.
4. Gate provider-binding staging, adoption, and strict platform restore to external runtime kinds only. Never turn the native local AgentRun ID into `TeamAgentPlatformBinding`.
5. Reuse `WorkspaceManager.ensureWorkspaceByRootPath()` before constructing member candidates instead of deriving an ID without activating its workspace.
6. Preserve single-flight candidate construction, write-before-publication, deterministic cleanup/quarantine, direct-task post-durability publication, and standalone activation boundaries.
7. Retain realistic browser coverage for Codex, Claude, and native AutoByteus; verify physical state plus semantic recall, not visible history alone.

## Scope Classification (`Small`/`Medium`/`Large`)

Large. The repair spans three runtime lifecycles, root and member materialization, workspace activation, durable team binding, standalone Claude activation, concurrency-safe candidate publication, strict failure semantics, and realistic restart coverage.

## In-Scope Use Cases

- **UC-001 — Configured Codex team-member restart:** complete a context-bearing turn, fully restart, and continue the exact provider thread.
- **UC-002 — Same-process external continuation:** keep one provider identity during normal same-process turns.
- **UC-003 — Generic persisted external team binding:** durably adopt external bindings for configured and delegated task agents; keep native nodes outside this binding lifecycle.
- **UC-004 — Previously affected external null binding:** fail truthfully when prior provider activity exists without a canonical binding.
- **UC-005 — Standalone Codex preservation:** restore a standalone Codex run with its persisted provider ID.
- **UC-006 — Fresh provider-backed team agent:** create a new provider thread only when there is no prior activity/binding, then persist it.
- **UC-007 — Configured Claude team-member restart:** resume the identical provider UUID with semantic context.
- **UC-008 — Standalone Claude abrupt restart:** persist the UUID before input and resume it without graceful termination.
- **UC-009 — Configured native AutoByteus restart:** restore the same local working context and append the first post-restart turn.
- **UC-010 — Native fresh/task activation:** new configured members and newly delegated native task agents create normally, publish no external binding, and use their requested workspace.

## Out of Scope

- The separately reported Electron startup/database migration failure and any production-database inspection or mutation.
- Recovering an external provider ID absent from canonical state, or reconstructing a native working snapshot already overwritten by a failed restart turn.
- Replaying visible local history into a replacement provider thread as a substitute for exact continuation.
- Changing agent/team identities, model selections, package definitions, or history presentation.
- Introducing recovery/hydration of already-active delegated task executions across process restart; the new native restart guarantee applies to configured team members, while new task activation and binding neutrality remain protected.
- Changing standalone native AutoByteus behavior beyond non-regression.

## Functional Requirements

- **REQ-001:** When an external persisted team-agent runtime establishes a non-null provider-native ID, the matching authoritative execution-tree node must durably adopt that exact ID through `RootTeamRun` before the binding is committed.
- **REQ-002:** Restoring an external persisted team run must supply each stored provider ID before the first post-restart turn and request exact provider resume.
- **REQ-003:** External binding adoption must apply to configured and delegated task-agent nodes through the same root-owned invariant. Runtime eligibility must be explicit.
- **REQ-004:** An external execution with no prior activity and no binding must retain supported new-thread creation and durably record its result; no ID may be invented.
- **REQ-005:** Failure to resume a known provider ID must be observable and must not silently create a replacement.
- **REQ-006:** Prior external activity plus a null canonical binding must yield an explicit non-resumable/context-loss outcome.
- **REQ-007:** Existing local history loading, ordering, content, and visibility must remain unchanged and independent of runtime restoration success.
- **REQ-008:** Standalone Codex persistence/restoration must retain exact ID propagation and no-silent-replacement semantics.
- **REQ-009:** For external runtimes, `platformAgentRunId` must contain only a provider-native identity; no local ID, sentinel, or placeholder is valid.
- **REQ-010:** Fresh Claude execution must reserve one valid UUID before input, durably bind it, use it as SDK `sessionId` for first creation, and use the identical UUID as `resume` thereafter. Stream identity only confirms it.
- **REQ-011:** Standalone Claude metadata must durably contain that UUID before first input is admitted; correctness must not depend on a later event or graceful shutdown.
- **REQ-012:** `createTeamRun` and `restoreTeamRun` must convey explicit process-local materialization provenance to configured mixed-team members and nested configured teams. A restored native member with canonical prior local activity must prepare native restoration with its local AgentRun ID and existing memory directory; the external binding field must not be used as native restoration provenance.
- **REQ-013:** Native configured and newly delegated task AgentRuns must not stage, root-adopt, or persist a `TeamAgentPlatformBinding`, even if their backend reports the local AgentRun ID through a generic platform-ID accessor. Newly written native execution-tree bindings remain null.
- **REQ-014:** Before a team member candidate is created or restored, every non-null persisted `workspaceRootPath` must be canonicalized and made active through the workspace owner. A valid persisted workspace must not silently fall back to the temp workspace.
- **REQ-015:** Successful native restart continuation must load the prior working-context snapshot before input and append the first post-restart turn without clearing, replacing, duplicating, or reordering prior user/assistant context.

## Acceptance Criteria

- **AC-001:** A configured Codex marker turn resumes the identical non-null Codex thread ID across full restart.
- **AC-002:** The first context-dependent Codex turn returns the earlier fact without client replay.
- **AC-003:** Earlier local messages remain visible once and in order.
- **AC-004:** Before restart, the physical configured Codex node contains the exact provider ID.
- **AC-005:** Targeted coverage proves external binding adoption for configured/task agents and proves fresh configured/task native executions do not produce a root binding.
- **AC-006:** A genuinely fresh external team agent creates one thread, persists it, and reuses it in-process.
- **AC-007:** Prior external activity with null binding fails explicitly and starts no silent replacement.
- **AC-008:** Known Codex resume failure does not invoke `thread/start`.
- **AC-009:** Standalone Codex exact restoration remains green.
- **AC-010:** A configured Claude node physically persists the exact valid UUID selected for first SDK creation before restart.
- **AC-011:** Restart requests resume of that exact UUID and creates no replacement.
- **AC-012:** The first post-restart Claude context response returns `AMBER-ORCHID-4821`; local history remains intact.
- **AC-013:** Claude adapter coverage proves mutually exclusive SDK `sessionId` creation and `resume` restoration.
- **AC-014:** A conflicting stream UUID fails and is never adopted.
- **AC-015:** Standalone Claude abrupt restart resumes the UUID durably stored before first input.
- **AC-016:** A real browser restart test using Classroom Simulation Team, native AutoByteus, DeepSeek V4 Flash, and the isolated secret-import setup recalls its exact pre-restart marker on the first context-dependent turn.
- **AC-017:** The same native scenario retains the same TeamRun/AgentRun IDs, and the physical configured native execution-tree node remains `platformAgentRunId: null` before and after activation/restart.
- **AC-018:** The post-restart native working snapshot contains the pre-restart marker user/assistant messages exactly once and appends the recall user/assistant messages; logs show native restore, not fresh creation, and no valid-workspace temp fallback.
- **AC-019:** Focused automated coverage proves: restored configured native activity selects generic local-state restore; restored uninitialized native state and new native task execution select fresh creation; configured nested teams inherit restore provenance; newly delegated task teams remain fresh; overlapping first commands still join one candidate.

## Constraints / Dependencies

- Authoritative work remains on `codex/codex-runtime-thread-resume-fix`, bootstrapped from `origin/codex/agent-team-universal-task-delegation`; `origin/personal` is comparison evidence only.
- `RootTeamRun` owns V1 execution-tree durability; `AgentRunManager` owns unpublished candidate construction/publication; the member handle owns runtime adaptation and readiness single-flight; `WorkspaceManager` owns workspace activation.
- Native working-context state lives under the deterministic team-agent memory directory and is restored by `AutoByteusAgentRunBackendFactory.restoreBackend()`.
- Real external/native validation needs installed credentials and model access. Use an isolated database and the exact import form: `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:///private/tmp/<isolated-run>/autobyteus.db`.
- No test may import credentials into the default or production database. No production database mutation is authorized.

## Persisted Data Outcome (When Applicable)

- Stored subjects: V1 `team_run_execution_tree.json`; team AgentRun memory directories (`working_context_snapshot.json`, raw traces); existing standalone metadata.
- Required outcome: **Directly Usable — No Migration**.
- Preserve: valid external IDs, native local run IDs, workspace roots, memory directories, snapshots, traces, and local history.
- Normal reader rule: external runtime kind makes `platformAgentRunId` authoritative; native runtime kind makes local AgentRun ID plus canonical local activity/memory authoritative. Legacy native self-ID values are not provider identities and do not drive native activation or new mutation.
- No new persisted materialization field is required because the create/restore entrypoint supplies that lifecycle fact.
- Unacceptable loss/corruption: provider replacement, native snapshot overwrite, cross-member ID assignment, history reorder/duplication, or silent workspace substitution.
- Already-overwritten native snapshots and absent external IDs are not reconstructable.
- Related IDs: REQ-001 through REQ-015; AC-001 through AC-019.

## Assumptions

- Provider-native IDs are opaque and exact-execution scoped.
- Visible history, external provider context, and native working context are separate state domains.
- Complete active/archived conversation traces are a canonical supported signal for whether a configured native member has prior semantic activity; unreadable activity state fails closed.
- A restored configured member with no prior activity may safely use fresh construction because no semantic context exists to continue.
- Workspace roots persisted by the TeamRun are valid product inputs and must be reactivated, not guessed from process cache.
- A reserved Claude UUID is deliberate first-session identity assignment, not guessing an existing session.

## Risks / Open Questions

- Existing old external null bindings and overwritten native snapshots remain unrecoverable.
- A crash after durable Claude UUID reservation but before provider materialization can leave an exact UUID that cannot resume; fail closed.
- Legacy native self-ID values may remain physically present in converted V1 files; they are ignored by the runtime-kind-specific normal reader and are not rewritten merely for cleanliness.
- Existing live E2E coverage is environment-gated and may be stale. Downstream coverage investigation owns durable test edit decisions.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| REQ-001 through REQ-006 | UC-001 through UC-004, UC-006, UC-007 |
| REQ-007 | UC-001, UC-004, UC-007, UC-009 |
| REQ-008 | UC-005 |
| REQ-009 through REQ-011 | UC-001, UC-003, UC-006 through UC-008 |
| REQ-012 | UC-009, UC-010 |
| REQ-013 | UC-003, UC-009, UC-010 |
| REQ-014 | UC-006 through UC-010 |
| REQ-015 | UC-009 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| AC-001 through AC-004 | Codex physical and semantic restart continuity. |
| AC-005 through AC-009 | Generic external binding/failure and standalone Codex safeguards. |
| AC-010 through AC-015 | Claude team/standalone UUID lifecycle and exact restart continuity. |
| AC-016 | Native realistic browser semantic restart continuity. |
| AC-017 | Native identity stability and external-binding neutrality. |
| AC-018 | Native snapshot append, restore-path, and workspace evidence. |
| AC-019 | Native activation-plan, nested/task provenance, and concurrency structure. |

## Approval Status

Explicitly approved by the user on 2026-08-17. The user first approved the Codex design, then requested and approved Claude investigation/design, and later explicitly directed another AutoByteus browser round followed by requirements, investigation, and design updates to fix the native runtime. All three reproduction supplements are approval-N/A evidence artifacts rather than intended-behavior authorities.
