# Investigation Notes — Restore Team group icon

## Investigation Meta
- Package: restore-team-group-icon
- Request: project_task_103e288e-6ebb-45f2-9dc1-fc471c83e67f
- Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/restore-team-group-icon
- Mode: Git, isolated worktree; branch codex/restore-team-group-icon
- Resolved base: origin/personal at 4a51482a5ef8c678d69a3ffc995d6876fd170a2f, fetched 2026-10-08 before worktree creation.
- Finalization target: origin/personal subject to Delivery gates; no release or installed-app change authorized.
- Bootstrap: PASS. Shared dirty personal checkout left intact, including concurrent Archive all task/worktree. Initial template copy failed because skills are local-only in shared checkout; used already-read canonical templates there instead. No workspace prerequisite blocker.
- Authorities read: /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.codex/skills/solution-designer/SKILL.md; references/requirements-engineering.md; requirements-doc, investigation-notes and solution-revision-record templates; root AGENTS.md, DESIGN.md, TESTING.md (full); autobyteus-web/AGENTS.md. Date 2026-10-08.
- Status: requirements and architecture investigation complete; current SR-002, AP-001 approved.

## Initial Request And Clarifications
Restore Team identity people group for both delegated and collaborator Teams; explain when/why it became a bolt. Manager plan/dispatch approved “yes please”, not release authorization. Preserve layout, hierarchy, interactions, status and unrelated icons. Do not test on user app or data. Concurrent Archive all task may touch history components; no overwrite.

## Initial Sources
- Manager plan: /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/task-plans/2026-10-08-restore-team-group-icon/task-plan.md (read).
- Screenshot: /Users/normy/.autobyteus/server-data/memory/agents/project_task_manager_13d4c4f4dc6c4d73a09c236a6a9ef048/context_files/ctx_67291950ecc3__image.png (inspected read-only; bolt next to software engineering team under hello).
- Commands: git status --short; git remote -v; git symbolic-ref refs/remotes/origin/HEAD; git fetch origin personal; git rev-parse origin/personal; git worktree add -b codex/restore-team-group-icon /Users/normy/autobyteus_org/autobyteus-worktrees/restore-team-group-icon origin/personal.

## Supplemental Artifact Inventory
- Manager plan: externally owned intake/approval evidence; scope as above, no design authority.
- Supplied screenshot: user evidence of defect; not a normative new design.

## Findings — 2026-10-08 requirements investigation
- E-001: explicit Team-only bolt literals exist in exactly four production components in audited components/pages/utils/composables/assets. No icon-load fallback is needed to explain the screenshot. Other Team surfaces already use group symbols. Model `utils/runSettings/modelOptions.ts` service_tier `heroicons:bolt` is unrelated and must stay.
- E-002: `d64560aee9f828853c75a0abff7347ec4fbaf54b`, 2026-08-30 11:28:38 UTC (13:28:38 Berlin), introduced the transient Team's boxed bolt in WorkspaceTransientExecutionRow. Its parent did not have a people-group there: this was a new temporary identity marker. Historical `tickets/done/nested-team-hierarchy-ui/requirements-doc.md` REQ-003/009 and investigation notes establish configured filled-group versus transient dashed-bolt distinction. The rationale was distinct temporary/task role, not a broken glyph.
- E-003: `c21d312c0ae952165535c51d6f6de676f6a30b59`, 2026-10-06 06:46:51 +02:00, removed the box/tint and made the bolt 16px slate with semibold Team name. It changed Org delegated Team rows from group to bolt. Commit body and `tickets/done/delegated-row-clean-style/requirements-doc.md` explicitly require this styling. Thus the recent bare bolt is deliberate clean-row styling; it is not accurate to call October 6 the initial bolt introduction on Agent-root rows.
- E-004: Memory's task-Team boxed bolt was introduced by merge revision `7c2553f486f0a45ecc22d4903753af4de59e0050`, authored 2026-09-25 15:07:54 +02:00, committed 15:08:21 +02:00; blame and first-parent diff establish introduction. Plain git -S without merge diff omitted this; no history gap remains. Commit describes SR-004 grouped member-tree/REQ-012, not a separately explained aesthetic icon decision; role differentiation is visible, precise icon motivation inferred from that context only.
- E-005: `4d469b0c5b8efe10a40dae00a7046680928bcaca`, 2026-10-07 12:02:31 +02:00, created ProjectTaskWorkers with Team bolt. Commit explains live Project/Temp Task worker lines; no separate icon rationale established.
- E-006: established filled icon `heroicons:user-group-20-solid` is used by WorkspaceStableExecutionRow, WorkspaceHistoryWorkspaceSection Team-header fallback, Org configured Team and Memory non-task Team group, plus Org catalog/handoff endpoints. Existing outline variants and user-provided Team images are not defects in scope.
- E-007: component tests WorkspaceTransientExecutionRow.spec.ts and WorkspaceAgentOrgDelegatedRows.spec.ts explicitly assert bolt; these encode previous intent and must be revised, not treated as an immutable guarantee. Memory grouping tests already cover configured/task/nested groups. Project worker tests and browser evidence remain to inspect in architecture.

## Supported behavior and surfaces
- BEH/SCN-001: user expands Workspace runs and Team children and selects members. AgentRunTaskRows and WorkspaceTeamExecutionTree consume shared transient row; stable Team row already uses group. Org collection has separate configured/task Team renderers. The screenshot supports an actual user-visible path, not only a callable component fixture.
- BEH/SCN-002: Projects/Temp tasks show root worker lines, with openability/status. Memory Team/Org detail shows member groups and inspection. Source docs projects.md and agent_teams.md explain supported surfaces and avatar fallback.
- BEH/SCN-003: source-history explanation explicitly requested by user.
- Payload: Vue icon identifiers/comments plus tests; runtime row models and public contracts are existing input, not intended changes. Persistence/security/concurrency/deployment impact: absent for glyph-only scope; to reconfirm after path tracing.

## Source Log
- `rg -n 'bolt|user-group|users-.*solid' autobyteus-web/components --glob '*.vue' --glob '*.ts'` and broader bolt/lightning audit over components/pages/utils/composables/assets.
- `git log -S 'heroicons:bolt-20-solid' -- <four affected files>`; `git show d64560aee/c21d312c/4d469b0c -- <components>`; `git blame -L 47,57 -- .../CollaborationMemoryDetail.vue`; `git diff 7c2553f486^1 7c2553f486 -- .../CollaborationMemoryDetail.vue`.
- Exact pinned source audit, metadata and patches retained in `evidence/source-history.txt` in this package.
- Historical requirements read: `tickets/done/delegated-row-clean-style/requirements-doc.md`; nested-team-hierarchy-ui relevant REQ-003/009 and approval/evidence references. Older Product artifacts are not newly authored/modified.

## Data / Runtime / Product / Unknowns
No app launched or test run in this phase. Screenshot is read-only evidence; it does not identify installed build/update timing. User data never inspected (apart from expressly supplied screenshot). No persisted-data subject, no acceptable user-data loss, no migration need. Product Design request: not stated; no new visualizer/design-package required for explicit glyph restoration. External role/call semantics preserved.

## Canonical supplement inventory addition
- `evidence/source-history.txt`: Solution Designer-owned source evidence, REQ-004/AC-004, complete; not behavior-defining, no user approval required.
- Historical tickets linked above: external read-only precedent/rationale only; do not modify their approvals/history or promote their bolt requirement over this user's new intent.

## Risks / Next work
- RISK-001: concurrent Archive all task can touch sidebar files. Separate worktree confirmed; Delivery must integrate minimally and rerun focused history tests if upstream changes.
- UNK-001: exact installed update date/version not established; explicitly outside what source history proves.
- Historical SR-001 hold resolved by AP-001 below. Architecture traced in SR-002; runtime/test validation remains downstream-owned, not yet performed.

## Architecture Investigation Findings — AP-001 / SR-002, 2026-10-08
Authorities read in full before phase work: skill references/architecture-design.md, design-principles.md, design-spec-template.md; root DESIGN.md and TESTING.md already read in this conversation. No closer applicable DESIGN.md found. Web AGENTS.md/ARCHITECTURE.md consulted; ARCHITECTURE.md's Python-server summary is stale versus this repository's TS server, irrelevant to the glyph-only delta; do not use it to prescribe backend work.

User approval AP-001: after R1 presentation, “lets still use the people-group its much clearer”, “approve”, then “basically we willb econsistant”. R1 intended behavior unchanged, now Approved; no release permission. `git status --short`, branch and rev-parse reconfirm isolated branch `codex/restore-team-group-icon`, base `4a51482a5ef8c678d69a3ffc995d6876fd170a2f`, only owned ticket files untracked. Interrupted calls were read-only; no pending command/process or partial source edit was started.

- A-001 / Agent root: WorkspaceHistoryWorkspaceSection.vue:174 mounts AgentRunTaskRows; it loads stored collaboration through useAgentRunCollaborationStore.inspect (no restore), renders store.taskRows from AgentRunCollaborationContext.listTaskRows. Context combines collaboratorExecutionNodes and taskExecutions at rootExecutionNodes; both Team kinds become memberKind agent_team / transientKind task_team. WorkspaceTransientExecutionRow.vue:71–77 selects glyph by memberKind only. Same rendering point covers delegated and collaborator Teams without role-specific branch. Click/Enter/Space select + toggle in existing component; AgentRunTaskRows selects the Team coordinator through collaboration index and opens root.
- A-002 / Team root: history section:302 -> WorkspaceTeamExecutionTree. `services/teamExecution/teamExecutionTreeSelectors.ts:26–56` maps collaborator Team into task_team navigation without persistence; addTaskTeam:288–309 supplies Team identity and collaborator opensOnAppear metadata. `stores/runHistoryTeamExecutionRows.ts:35–113` derives stable/transient execution rows from context.view.listNavigationRows. Team tree routes stable to WorkspaceStableExecutionRow and transient to WorkspaceTransientExecutionRow. No projection/data/event modifications required; statuses, closed-task filter, ancestry, disclosure and auto-expansion remain with existing owners.
- A-003 / Org root: history section:318 -> WorkspaceAgentOrgHistoryCollection, which calls projectAgentOrgHistoryRows from utils/agentOrgHistoryRows.ts. Its rootTaskExecutions:65–69 combines collaborator and task nodes; task Team rows share collection's final branch:149–150. Configured Team branch:133 already group. Selection/disclosure remain selectTeam/selectTaskTeam and injected tree-state/actions (no glyph coupling).
- A-004 / Task surfaces: ProjectTaskRow.vue:22 (density=row) and TaskRootSection.vue:6 (density=detail) both render ProjectTaskWorkers. These are reused on Projects and Temp Tasks. Worker receives TaskRootView; `presentTaskRoot/isTaskRootHostListed` controls state/openability, `useTaskRootNavigation.open` owns navigation. Only kind=team glyph literal:26 changes. Wrapper sizing/density, Agent initials, error/status icon, chevron, status and click semantics remain untouched.
- A-005 / Memory: pages/memory.vue:10 supplies collaboration detail rows from memory explorer and owns navigation/search/paging/inspection. CollaborationMemoryDetail is presentational; buildCollaborationMemberBlocks groups supplied memberTargets by groupPath teamRunId. TASK_TEAM branch:54 chooses bolt; else:55 already group. Change only literal in task branch, preserve dashed wrapper, color, 12px inner/16px outer box, task label, group ordering and inspectMember event. No memory-store/reader/write change.
- A-006 / renderer assets: all four components import @iconify/vue and consume existing Icon icon-string interface; user-group-20-solid already used on same affected pages/adjacent branches. No library update, registry, backend lookup or icon-generation change is needed. Remaining model Fast/service-tier heroicons:bolt is a capability icon, not Team identity.
- A-007 / tests: two history specs explicitly enforce old bolts. ProjectTaskWorkers.spec.ts protects openable/plain/status/failure/labels but lacks Team glyph/density assertions. CollaborationMemoryDetail.spec.ts has configured/task/nested group fixtures, grouping by exact teamRunId and member-inspect/paging/error checks; lacks identity assertions. Existing WorkspaceHistoryWorkspaceSection.spec.ts checks stable/header group glyph. Extend within these existing owners; retain unrelated assertions.
- A-008 / rendered path: existing tests/e2e/nested-team-hierarchy-probe.mjs and agent-org-task-team-disclosure-probe.mjs run real changed-worktree Nuxt components/tree logic with test fixtures, owned free-port dev server and fresh Chrome; temporary pages/process cleanup in finally. nested probe counts `data-team-icon=temporary-task-team` rather than actual glyph, so count alone cannot prove new icon. task-agent-peer-sidebar-probe.mjs covers production selection/hydration with emulated GraphQL, not real backend. New glyph assertions must inspect actual rendered SVG/shape (or resolved icon data), not only markers/stub text. These probes do not by themselves cover Projects/Memory or prove production provider/runtime behavior.
- A-009 / docs synchronization candidates: autobyteus-web/docs/agent_execution_architecture.md:456–457 and docs/settings.md:470–471 explicitly say transient task-Team bolt. Delivery owns synchronization to approved people-group wording; do not rewrite archived ticket evidence/history.

### Commands and files consulted in architecture
`cat AgentRunTaskRows.vue WorkspaceTeamExecutionTree.vue`; `sed` on runHistoryTypes.ts, WorkspaceAgentOrgHistoryCollection.vue (projection/action owners), pages/memory.vue, runHistoryTeamExecutionRows.ts, agentRunCollaborationContext.ts listTaskRows/rootExecutionNodes, teamExecutionTreeSelectors.ts collaboratorExecution/addTaskTeam, agentOrgHistoryRows.ts rootTaskExecutions/statusSource; `cat` ProjectTaskWorkers.spec.ts, CollaborationMemoryDetail.spec.ts, collaborationMemberTree.ts; `rg` component consumers/collaborator projection/icon references/docs; heads of the three renderer probes. Some exploratory paths (`utils/runHistory*.ts`, scripts/generateIcons.ts, AgentRunTaskRows.spec.ts) did not exist; actual projection/test owners resolved above. No tests run by Solution Designer.

### Architecture impact disposition
Four presentation literals plus two comments, existing focused tests, renderer proof and current docs wording only. Existing props/events/data identity unchanged. No persisted data, security, concurrency, API, lifecycle, ownership or deployment-boundary impact. No new state or guard. Broader source count/document size does not increase architectural risk. Group invariant is enforced at actual Team renderer branches with regression coverage, not a new cross-feature icon framework.
