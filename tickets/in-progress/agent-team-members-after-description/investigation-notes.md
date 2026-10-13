# Investigation Notes

## Investigation Meta
- Package: agent-team-members-after-description; Project Task project_task_7fd4b73e-075b-464c-b313-bbbd59f45797; date 2026-10-13.
- Git workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description.
- Branch: codex/agent-team-members-after-description.
- Base: refreshed origin/personal at 73f743211c8b86c704acb33f216154e42b7a67b8; `git fetch origin personal` succeeded; `git worktree add -b codex/agent-team-members-after-description <workspace> origin/personal` succeeded.
- Finalization: personal / origin/personal, per user direction. Shared primary checkout is dirty, local personal HEAD 92de6460030480c33cef6481d2dd46d2fc9a34be ahead of fetched origin; preserve unrelated work and reconcile at Delivery.
- Bootstrap: dedicated workspace before document authoring. Templates are local-only under primary checkout .codex/skills; an initial relative template copy in worktree failed, then absolute skill-root bootstrap succeeded. No required prerequisite remains missing.
- Authorities read: solution-designer/SKILL.md; references/requirements-engineering.md; requirements/investigation/revision templates; root AGENTS.md; autobyteus-web/AGENTS.md; root DESIGN.md and TESTING.md; all 2026-10-13. Architecture gate references/template read in preparation; architecture work pending requirements approval.
- Current revision: SR-001. Investigation status: requirements sufficient.

## Initial Request And Product Understanding
Task Manager supplied user-decided order Description → Members → Instructions → Handoffs and urgency. Members are currently below long handoff rules. The product exposes reusable coordinator-led flat Agent Teams, with direct Agent cards and team-local/shared definitions. No UI/UX redesign help requested; no Product handoff.

## Source Log
| ID | Source / exact command or path | Observation |
| --- | --- | --- |
| E001 | Supplied screenshots below, inspected with view_image 2026-10-13 | Top shows Description then Instructions then Handoffs; long route cards; final card followed by Members (6), coordinator badge and View links |
| E002 | `cat autobyteus-web/components/agentTeams/AgentTeamDetail.vue` in task worktree | Loaded template has header, Description (38–41), ExpandableInstructionCard (43), HandoffManager (45), Members section (47–64); count is nodes.length, cards v-for nodes, lg:grid-cols-2; shared component takes teamDefinitionId/returnToOrgId |
| E003 | `cat autobyteus-web/components/agentTeams/__tests__/AgentTeamDetail.spec.ts` | Tests for count/card/coordinator/handoff content, canonical TEAM_LOCAL member navigation, Run through runStart, Org Back; current tests do not assert section order; instruction card stub lacks heading |
| E004 | `git status --short`; `git branch --show-current`; `git rev-parse HEAD`; `git remote -v`; `git fetch origin personal`; `git worktree add ...` | Successful isolation and pinned remote base; shared integration dirty state not modified |
| E005 | `git ls-files '*AGENTS.md' '*DESIGN*.md' '*TESTING.md'` | Root DESIGN/TESTING and web AGENTS apply; no tracked closer component policy found |

## Relevant Existing Behavior And Supported Product Paths
BEH-001 / SCN-001: user opens a Team detail and reads Description, instructions, handoffs, then roster. E001 proves real reported surface; E002 corroborates template. BEH-002/003 / SCN-002: user selects existing View/action; E002 handlers and E003 tests corroborate identities/actions. BEH-001 / SCN-003: existing responsive class breakpoints and explicit user preservation constraint support normal narrower layouts. Confidence high; post-change runtime/rendered checks are downstream work, not yet executed.

## Relevant Codebase And Technical Facts
AgentTeamDetail owns loaded detail composition, team-reference loading, member display and action dispatch. ExpandableInstructionCard owns instruction disclosure; HandoffManager owns handoff view rendering. `agentId` builds canonical team-local ID or returns shared ref; `viewAgent` emits agents/detail with returnToTeam; `runTeam` uses runStart. `isShared` gates Delete. Org references use the same template. No store/API/runtime change is implied by ordering.

## Structural And Payload Surface Inventory
- Payload: existing description/instruction/handoff bodies and node list; unchanged, no catalog/team-definition edits.
- Structural: one detail component template; existing colocated spec; shared cards/handlers/stores/routes remain owners.
- Confirmed absent from required delta: new API/interface/persistence/security/concurrency/deployment/ownership contract; no schema transition.
- Existing responsive members: `grid gap-3 lg:grid-cols-2`; header `flex-col ... lg:flex-row`.

## Runtime, Probe, Or Reproduction Findings
User-provided screenshots inspected as current-state evidence. No changed renderer/build exists yet; no validation executed by Solution Designer. Testing guideline selects colocated web/component checks plus source-current browser dev-path proof for this renderer-only delta; Delivery separately owns explicit user app verification.

## Stakeholder And User Evidence
Exact delegated Task text is approval direction, not a substitute for delivery verification. Done includes merge personal, rendered/regression proof, explicit user app confirmation and cleanup evidence; release decision must be agreed with user.

## Persisted Data And External Contracts
Not Affected: presentation order only; no reader/writer/schema/meaning changes requested. Navigation/member-reference/action contracts preserved. No web research or third-party contracts needed.

## Supplemental Artifact Inventory
All supplied screenshots are owned by the Task context, retained at original paths:
1. /Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_7fd4b73e-075b-464c-b313-bbbd59f45797/context/ctx_bead01630695__ctx_d14cdea5a095_image.png
2. /Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_7fd4b73e-075b-464c-b313-bbbd59f45797/context/ctx_c24347a1bf54__ctx_bbd544eb13b5_image.png
3. /Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_7fd4b73e-075b-464c-b313-bbbd59f45797/context/ctx_d4bde7a7b647__ctx_597efd71434c_image.png
Purpose: current-state problem evidence E001, REQ-001/002/003. Status inspected; not behavior-defining new-design supplements. Product artifacts / independent architecture review: N/A — not applicable to current requirements phase.

## Assumptions, Unknowns And Risks
No material intended-behavior unknown. Source-current visual quality and final action behavior require downstream verification. Remote personal is behind dirty local personal at bootstrap; Delivery must refresh/reconcile safely without disturbing unrelated work. Release selection and explicit user verification are Delivery gates, not authorized by urgency. Do not test user-running app/data or use pre-change installed binary as changed-source proof.

## Architecture Investigation Findings
Pending approval; will extend here with callers/owners and cleanup evidence.

## Requirement Implications And Readiness
Current behavior, supported scenarios, scope/preserved outcomes and testable IDs established. Requirements R1 Ready for Approval; no Needs user behavior decision. Canonical architecture input: verify common callers; preserve contracts and data; determine local presentation change. No product/design supplements requiring separate approval.

## Architecture Investigation Findings — post-approval (SR-002)
Architecture gates read in full: primary skill references/architecture-design.md, references/design-principles.md, design-spec-template.md; task-worktree DESIGN.md identical to primary root. All 2026-10-13. Requirements R1 approval informing message recorded before these additional probes.

| ID | Exact evidence | Finding and decision input |
| --- | --- | --- |
| E006 | `cat AGENTS.md`; `cat TESTING.md`; `cat RELEASE.md` in worktree; `cmp` against primary | Refreshed remote has shorter global TESTING.md and AGENTS now mandates RELEASE.md. Both test versions read; authoritative worktree TESTING (211 lines) fully read; source-current renderer/browser checks appropriate. RELEASE: finalize in task worktree with fresh origin/personal, --no-ff merge and push; never finalize shared checkout. No release default, user decides at verification. This adds operational evidence, not changed intended behavior. |
| E007 | `cat autobyteus-web/pages/agent-teams.vue`; `rg -n 'team-detail|returnToOrg' autobyteus-web/components/agentOrgs --glob '*.vue'` | Route reads query view/id/returnToOrg, passes IDs to same AgentTeamDetail; navigate payload routes member to /agents and forwards return contexts. AgentOrgExperience.vue:446 opens exact same /agent-teams route. No named-team or alternate-template exception. |
| E008 | `sed -n '295,318p' autobyteus-web/stores/agentTeamDefinitionStore.ts`; E002 full script | Catalog lookup owns loaded Team identity, async watch fetches Team/Agent definitions; Org exact references resolved via existing service; template uses same computed teamDef. Existing public readers remain authoritative. No hidden runtime or persistence change needed for local template order. |
| E009 | `cat .../common/ExpandableInstructionCard.vue`; `sed -n '1,130p' .../collaboration/handoffs/HandoffManager.vue` | Each child root is a section with heading. Instructions owns overflow/ResizeObserver/expand-collapse; Handoffs view-only scope=team uses ordered model and endpoint labels. Moving parent invocation doesn't require child edits. |
| E010 | `sed -n '133,179p' .../agentOrgs/__tests__/AgentOrgOwnedAuthoring.spec.ts`; E003 | Mounted Org Team uses same detail without shared publication, unrelated Org scope rejects. Existing regression suite is relevant preservation coverage. Main detail spec's instructions stub lacks h2; order assertion needs representative labeled stub or real child. |
| E011 | `rg -n '\\brouter\\b|\\buseRouter\\b' .../agentTeams/AgentTeamDetail.vue` | useRouter import and router declaration only; no reads or handlers depend on it. Actual navigation owner is parent page/runStart. Safe bounded removal of unused hook/binding; no navigation replacement. |

Root cause: local presentation order, not architecture fragmentation. Existing detail owns composition; order change can be an intact Members block relocation, no CSS-order override or extra abstraction. Design maps BEH-001–003/SCN-001–003 through existing route/store/component/action owners. Payload and structural inventory remains one local owner plus tests; no API/data/security/concurrency/deployment/ownership change. No migration required.

No tests/builds were run by Solution Designer; downstream specialists own executable and rendered validation. Initial Architecture/agent Teams docs were also consulted as context; generic ARCHITECTURE.md describes old Python backend, so current concrete code governs this Vue-only delta. That adjacent doc drift is not current scope.

Readiness: requirements R1 Approved; exact approval record present; design ready after completed SR-002 classification. Still-relevant supplements are E001 screenshot paths above. Remaining material uncertainty: None for design; delivery and post-change validation not yet complete.
