# Investigation Notes — AORG-FOLLOWUP-20260914-001

## Current Findings — SR-007 (2026-09-14)
- Approved correction basis: SR-005, covering both AgentOrg and standalone AgentTeam; fresh configured launch behavior and existing conversation/task semantics preserved. Backend naming/abstraction work is deferred.
- Confirmed source cause: restoring the root eagerly prepares every configured Agent runtime; frontend green represents Idle and is not proof of a broadcast message or concurrent model reasoning.
- Regression relative to pinned origin/personal 5645b49d6: the original mixed/nested-Team backend restores structure and activates member runtimes on demand. Flat configured topology does not require eager activation.
- Historical source chain (INV-R07): 37d05c7f7 introduces unconditional configured activation in Org registry and `prepareConfiguredAgents: true` in standalone Team root materialization. Later 5710fdd53 changes these to defer **fresh** configured workers only, retaining eager **restore**. This identifies the source-policy regression, not a runtime bisect.
- Architectural distinction to preserve: restoring Team/Org identity, history, routing and lifecycle scope is separate from starting every member's runtime. Keep provider-binding durability without treating full-scope restoration as a mandate for full-member activation.
- Current investigation is source/history based. No live reproduction, tests, source modifications, commit/push or specialist contact performed. No claim about actual generation charges or historical individual decision-maker intent.
- Current design: design-spec.md DS-REV-001 Ready on approved SR-005 requirements. Medium/High; first-work binding metadata, cache consistency and durability are covered. Next: rule-based architecture review, not a blind flag toggle or direct source edit.
- Canonical supporting report: `restart-resume-analysis.md`; naming investigation: `team-backend-abstraction-analysis.md` (deferred concern).

The bootstrap/intake sections below are historical snapshots, not the current scope or approval state. Current approval is recorded in requirements-doc.md and the cumulative revision record.

## Bootstrap Context
- Date: 2026-09-14
- Mode: Git, isolated task worktree.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up`
- Branch: `codex/flat-agent-organization-model-follow-up`
- Base remote/branch/revision: `origin/requirements/flat-agent-organization-model` / `72dee5ad2c2e332272a0c00eb36af1a036bd69fb`.
- Finalization target: provisionally the requested base, subject to later explicit direction; no finalization performed.
- Result: bootstrap complete; new product investigation not started.
- SR: N/A until a coherent behavior baseline is established.
- Original request: requirements/flat-agent-organization-model — on the remote we have this branch, could you bootstrap a ticket from this branch i guess maybe the branch has codex prefix

## Evidence Log
1. `git status --short` in the starting checkout showed modified `package.json` and untracked `.article-work/`, `applications/brief-studio/dist/`, `applications/socratic-math-teacher/dist/`. Left untouched. Starting checkout is `personal` at `d1a399a59`.
2. `git ls-remote --heads origin '*flat-agent-organization-model*'` returned exactly `refs/heads/requirements/flat-agent-organization-model` at `72dee5ad2c2e332272a0c00eb36af1a036bd69fb`. No codex-prefixed match.
3. Initial broad `git fetch origin` failed with an SSH connection closure. Retried the exact requested ref successfully: `git fetch origin refs/heads/requirements/flat-agent-organization-model:refs/remotes/origin/requirements/flat-agent-organization-model`.
4. `git worktree list` / local branch inspection found no exact existing organization-model follow-up workspace/branch. The similarly named `flat-agent-team-domain-simplification` workspace is a different ticket and was not reused.
5. `git ls-tree` and `git show` found the original archived ticket and an archived `collaboration-follow-up-fixes` ticket. Original handoff reports accepted-with-issues branch-only completion; later follow-up handoff reports completed fixes, publication into the requested base and cleanup. These are historical report claims, not newly rerun validation.
6. Latest commit `72dee5ad2c2e332272a0c00eb36af1a036bd69fb` is `chore(delivery): complete collaboration ticket worktree cleanup`.
7. `git worktree add -b codex/flat-agent-organization-model-follow-up /Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up origin/requirements/flat-agent-organization-model` succeeded and established upstream tracking. No source changes, merge, commit or push performed.
8. No AGENTS.md was found in applicable ancestor/root/ticket directories. Server/web instructions exist but those source directories are not being edited.

## Historical Source Inventory (Read-Only)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up/tickets/done/flat-agent-organization-model/requirements-doc.md`: prior AORG-FLAT-TEAM-001 approved requirements, RER-033.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up/tickets/done/flat-agent-organization-model/handoff-summary.md`: prior DR-010 completion and limits.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up/tickets/done/collaboration-follow-up-fixes/requirements-doc.md`: prior COLLAB-FOLLOWUP-001 RER-002 approved three-fix scope.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up/tickets/done/collaboration-follow-up-fixes/handoff-summary.md`: DR-003 completion, validation limits and base publication.
These are context for future investigation, not approval or selected scope for the new ticket. Existing embedded Linux absolute paths remain historical; external/raw artifacts may not be available on this Mac and have not been exhaustively resolved.

## Initial Bootstrap Product Understanding And Unknowns (Historical)
The source documentation describes coordinator-free AgentOrg composition with direct Agents and flat coordinator-led Teams. The later completed fixes concern lazy member startup, selection stability, and first-send text attachments. No new request to change these behaviors has been supplied. No runtime/source investigation or verification for new behavior has occurred.

Product Design: not requested. New data-continuity, scenario, structural and risk assessment: pending actual scope. No final size/risk classification before a completed design.

## Initial Bootstrap Next Action (Historical)
Ask for the intended follow-up change, investigate against this exact base, then establish requirements and solution revision history. Preserve prior archived package IDs, history and evidence limitations.

## Restart / Resume Investigation Intake — 2026-09-14
User cancelled the API/E2E messaging request before any message was sent. User now requests analysis only: leave the website open, restart the server, focus an offline Agent within an existing Org, send a message; Org activates and every Agent appears green. Expected: members activate when receiving work, not merely because another member resumes. Compare origin/personal nested-Team behavior. This is a supported user-reported restart/continuation scenario; actual runtime starts vs frontend status projection remains to be distinguished. No implementation or validation handoff authorized. Source investigation begins in the isolated worktree at 72dee5ad2.

## Restart / Resume Findings — SR-001
INV-R01–05, exact source/ref comparison, supported scenarios, limits and causal chain are recorded in the supporting analysis `/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up/tickets/in-progress/flat-agent-organization-model-follow-up/restart-resume-analysis.md`. This is an evidence supplement owned by Solution Designer, not an approved design. Canonical bootstrap sections above describe the earlier intake state; the restart report supersedes their pending-scope statements. No tests or live server mutation performed. Current scope: Org restart/resume eager activation analysis; requirements Draft. API/E2E message cancelled and never sent.

## Backend Interface Investigation Intake — 2026-09-14
User confirmed use of this newly bootstrapped ticket (not the archived original) and asks why FlatTeamRunBackend implements TeamRunBackend when only one implementation exists. Scope: source/history/caller analysis and record findings, not approved removal or source changes. Continue at task source 72dee5ad2; compare pinned origin/personal 5645b49d6.

## Backend Interface Findings — SR-002
INV-B01–04 source/history/caller findings are in `/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up/tickets/in-progress/flat-agent-organization-model-follow-up/team-backend-abstraction-analysis.md`, a Solution Designer evidence supplement (not approved design). Historical three-provider Team backends collapsed to one mixed backend before AgentOrg. Current single implementation forwards to the manager; interface still offers test substitution. No causal connection to eager restore policy established. No new behavior changes approved, no source/test edits. Relevant evidence commands: rg TeamRunBackend/FlatTeamRunBackend/new TeamRun across src/tests; git show origin/personal and 4fb78f864; git log deletion history; git show 37d05c7f7; historical design lines 4253–4270. Current result: source analysis complete; return to user.

## SR-003 / INV-B05 — Naming clarification
User interprets Mixed as mixed Agent runtime backends. Confirmed by origin/personal docs/modules/agent_team_execution.md:91–92 and web docs/agent_teams.md:576. Current per-Agent runtimeKind and TeamBackendKind.MIXED remain. Direct class diff and rename detection show mostly moved/renamed wrapper, not a separate backend mechanism. Full evidence/correction appended to team-backend-abstraction-analysis.md. Keeping Mixed naming while narrowing topology was technically possible; exact historical rename motivation is inferred, not proven. No approved behavior changed.

## SR-004 — User prioritizes restart/resume correction
User reiterates exact observed scenario and work-driven activation expectation, asks to focus on this bug rather than Mixed/Flat backend work. INV-R01–05 remains source cause; no live test claim. Requirements narrowed to REQ-001–003 and presented Ready for Approval. Naming assessment retained but deferred. No source edits, new test execution or specialist message.

## Approval and Team-parity investigation intake — 2026-09-14
Direct user: “Yeah, I approve.” Approves SR-004 narrow Org correction and preserved outcomes. Same message explicitly asks to check AgentTeam too and states “if it has, we should also fix that.” This is conditional authorization for the same correction on Team, not backend naming/refactoring. New source inspection confirms Team root creation uses fresh mode, Team restore uses restore mode; materializer passes prepareConfiguredAgents = mode !== fresh. Full Team source comparison and fresh/restore matrix will be recorded in SR-005 before design.

## SR-005 / INV-R06 — Team parity confirmed
Read Team composer (agentTeamRunStore.ts:251–264), Team manager create/restore (agent-team-run-manager.ts:146–188), materializer (team-root-materializer.ts:92–101), shared flat factory/manager. Fresh mode defers configured workers; restore mode prepares all, same as Org. Source-confirmed cause, no live tests. Updated restart-resume-analysis.md with matrix and exact path. User approval of Org and explicit conditional Team correction captured in requirements SR-005; condition satisfied, both now Approved. Naming stays deferred.

Architecture follow-up evidence: configured-agent-execution-handle.ts:234–241 currently strips a replace_without_conversation result to its binding and calls acceptPlatformBinding. Eager scope materialization instead handles replacement metadata through the dedicated checked mutator. Any lazy-restore design must preserve that legitimate no-conversation case before runtime publication, not merely flip the preparation flags. This is a technical design implication of approved retained-binding continuity; design not completed in the parity investigation.

## INV-R07 — Regression source chronology
Commands: `git show 37d05c7f7:autobyteus-server-ts/src/agent-org-execution/services/agent-org-root-agent-execution-registry.ts`; `git show 37d05c7f7:autobyteus-server-ts/src/agent-team-execution/services/team-root-materializer.ts`; `git log --oneline -- .../team-root-materializer.ts`; `git show 5710fdd53 -- .../team-root-materializer.ts`.
Findings: original Org-refactor snapshot eagerly prepares direct Org Agents regardless of mode and explicitly sets Team preparation true; later fresh-worker correction changes Team flag to mode !== fresh and Org direct registry to skip preparation only in fresh mode. Existing design docs explicitly preserve restore preparation. The regression is lifecycle policy introduced/carried by the refactor and incompletely covered by the fresh-only correction, not a necessary consequence of flattening membership or renaming Mixed. Historical design stages candidate bindings before full-root publication; that is evidence of how eagerness was organized, not proof the correct preserved durability invariant requires waking every member. Exact author's intent not established.

## Architecture Investigation — SR-007 / AINV-001–006 (2026-09-14)
User now explicitly directs: “We should fix the problem now. You're ready to go.” This reconfirms the approved SR-005 Team/Org behavior basis; no naming/refactor expansion.

### AINV-001: configured scope and task readiness are distinct existing paths
OrgRootAgentExecutionRegistry.prepareConfigured (55–85) eagerly readies only restore, while prepareTask (88 onward) independently prepares real task execution before task durability/release. OrgTeamExecutionDirectory.prepareConfigured (55) and Team root materializer (100) pass mode != fresh; task-Team directory preparation separately explicitly enables workers. FlatTeamExecutionFactory materialize (95) has a prepareConfiguredAgents switch; FlatTeamExecutionManager prepareConfiguredActivation (85–87) loops all members. Existing on-demand paths reserveDirectAgentInput and direct command handling in FlatTeamExecutionManager, Org root reserveAgentInput (321 onward), and ConfiguredAgentExecutionHandle.ensureReady/initializeReady allow unprepared configured members to receive work. Configured scope membership is separate from runtime activity. Keep fresh/restore mode for conversation semantics, not eager scheduling.

### AINV-002: binding replacement metadata must survive first-work callbacks
ConfiguredAgentActivationPlanner.resolvePlan (61–96) selects new when no activity, restore when history exists with valid binding, checked replacement when external no-activity has an older binding, and rejects unreadable/missing retained state. Current lazy initializeReady in configured-agent-execution-handle.ts:234–241 unwraps replacement to bare binding and uses acceptPlatformBinding. That loses expectedPreviousPlatformAgentRunId and reaches ordinary adoption, whose exact binding checks reject a different existing ID. Eager root assembly currently handles this case via dedicated replacement mutators before publishing prepared runtimes. Supporting test: agent-org-execution-scope-builder.test.ts durably replaces a no-conversation binding; its eager timing assertion must move to first work, not be deleted as irrelevant.

### AINV-003: exact first-work persistence owners already exist
RootAgentExecutionCallbacks and FlatTeamExecutionCallbacks currently carry acceptance of plain binding. Org scope builder connects that to AgentOrgRun.adoptAgentPlatformBinding (231); standalone Team callbacks/materializer connect to RootTeamRun.adoptAgentPlatformBinding (163). The methods serialize against current root tree via their existing persistence coordinators; update tree/index after durability; no direct provider-side file writes needed. Existing mutators: replaceAgentOrgPlatformBindingWithoutConversation (165) and replaceAgentPlatformBindingWithoutConversationInTree (194) check exact root kind/run ID, member address/run ID, expected prior binding, unique match, and validate resulting current-schema tree. They do not establish absence of conversation: the planner/activity inspector owns that prior decision.

### AINV-004: local context/planner synchronization and failure contracts
FlatTeamAgentExecutionHandle.acceptPlatformBinding currently calls root persistence then context.adoptPlatformAgentRunId. FlatAgentExecutionContext.adoptPlatformAgentRunId rejects replacement of a different non-null binding. The planner constructor captures the original platformAgentRunId; after a committed change followed by an aborted candidate this value can become stale for retry. A first-work replacement path needs discriminated change metadata, strict local expected-old validation, committed-only context update, and current binding per planning attempt. Shared ensureReady has one readinessAttempt per Agent; termination fencing and candidate abort/quarantine already exist. Org operation gate is admission/drain (not a mutex); persistence coordinator separately serializes tree mutations and latches post-rename uncertainty. Keep provider preparation outside persistence queues. Do not turn legitimate peer-triggered readiness into a nested persistence-lock wait.

### AINV-005: persisted state direct-use evidence
Current Org store validates strict Org V1 JSON on read/write; Team store validates strict Team V2; loaders read tree + task/message sidecars and run existing task-reopen repair. Representative current fixture shapes: tests/fixtures/current-agent-org-run-fixtures.ts (null binding + per-Agent launch config), tests/unit/agent-org-execution/agent-org-execution-scope-builder.test.ts (saved bound/no-conversation external Agent, writes actual temporary Org tree), tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts:305–345 (persisted/reloaded three-file mixed Codex/Claude Team package). These are source/test fixture evidence, not tests executed now. Existing activity inspector/native/external continuation planner interprets current null/non-null bindings without a new storage shape. Installed user volume is unknown/not scanned; no bulk scan/rewrite required because data representation stays unchanged. Existing root reopen task repair remains; no new migration, data reset or old-schema runtime fallback.

### AINV-006: production/test dependency inventory and validation implications
rg search over src finds old binding acceptance only in shared callback/handle, flat callbacks/handle, Team adapter/materializer/root, Org builder/registry/root. Planner has one production construction in shared handle and two prepare call sites plus unit tests. Team/Org factories and task preparation share activation methods; do not change factory defaults or task preparation semantics. Browser composers restore root before sending focused Agent; status projection maps missing/unprepared handles to Offline and actual idle to green. No frontend color patch required by source findings; rendered validation still needed with browser remaining open across test-owned server restart. Test targets include shared planner/handle units, Org scope tests, Team manager integration, and independent restart/first-input journeys for direct Org Agent, Org-mounted Team Agent and standalone Team Agent, plus tasks/fresh/binding failure coverage.

Architecture evidence commands: sed/nl/cat of the exact files above; rg 'acceptPlatformBinding|adoptAgentPlatformBinding' across src; rg planner constructors/prepare callsites across src/tests; inspected AGENTS instructions and solution design standards/template. No tests, dependency installs, live server restart or runtime data reads performed. Worktree HEAD remains 72dee5ad2; only this ticket's documents modified.

## User clarification — base branch unreleased (2026-09-14)
User explicitly states: “the base branch is not even released yet”. Treat origin/requirements/flat-agent-organization-model as an unreleased development branch. Historical branch-finalization reports are not evidence of a public release or installed production rollout. Do not introduce backward-compatibility, legacy-upgrade or release-migration machinery for this correction. Approved history/identity preservation concerns the user's existing development runs across restart; it is not a shipped-version compatibility requirement. No instruction to discard/reset those runs was given. Architecture investigation remains in progress; AINV-002–004 binding safeguards refer to current-run first-work continuation, not migration support. Design should be a direct correction of the unreleased branch.

## Feature-branch workflow clarification — 2026-09-14
User clarifies the bootstrap base is still an unreleased feature branch within the ongoing larger AgentOrg effort. This isolated follow-up ticket is a child correction, not maintenance of a released AgentOrg product. After ticket completion, intended integration is back into `origin/requirements/flat-agent-organization-model`, not `personal`. This supersedes the previously provisional finalization target; actual finalization/integration remains Delivery-owned after applicable gates. No immediate merge/push/release is requested. Prior archived ticket documents remain evidence of earlier work, not proof that the overall feature was released or finished. Continue direct clean-cut correction without released-version compatibility machinery; preserve approved current development-run restart behavior.

## SR-007 Design completion and supplement inventory
DS-REV-001 maps AINV-001–006 into DS-001–006; architecture design complete, Medium/High. Source HEAD unchanged at 72dee5ad2; no application source/test modifications. This corrects an unreleased feature branch and ultimately integrates back into that base after delivery gates.

| Artifact | Owner | Purpose / scope | State / authority |
| --- | --- | --- | --- |
| requirements-doc.md | Solution Designer + user approval | REQ-001–005 work-driven restore for Team/Org and preserved fresh/history/task behavior | Approved SR-005, unchanged in SR-007 |
| design-spec.md | Solution Designer | DS-REV-001 target production paths, ownership, file map, tests, Medium/High classification | Ready, architecture review pending |
| restart-resume-analysis.md | Solution Designer | INV-R01–07 source cause/Team parity/chronology | Evidence; earlier approval/status sections historical |
| team-backend-abstraction-analysis.md | Solution Designer | INV-B01–05 naming/wrapper understanding | Evidence only; explicitly deferred from fix |
| bootstrap-handoff.md | Solution Designer | Original isolated worktree/base evidence | Historical; confirmed feature merge-back target in requirements supersedes provisional wording |
| solution-revision-record.md | Solution Designer | SR-001–007 cumulative history | Current index |
| solution-handoff.md | Solution Designer | Full completed design package and route | Ready for rule lookup |
Existing done-ticket requirements/design/reports remain source context, not current review approval. No external Product/UI package applies; no new validation/review artifact fabricated.
