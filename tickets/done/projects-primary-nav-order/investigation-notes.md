# Investigation Notes

## Investigation Meta
- Package: projects-primary-nav-order; current revision: SR-002.
- Git task workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order
- Branch: codex/projects-primary-nav-order.
- Resolved base: origin/personal at 8409bd899d290553730eff0d1ba3bca22205a939 after successful `git fetch origin personal` on 2026-10-03.
- Finalization target: origin/personal (tracked default); finalization belongs to Delivery Engineer.
- Bootstrap: successful isolated worktree. Shared checkout has unrelated changes; untouched.
- Investigation status: requirements approved by AP-001; architecture investigation complete.
- Existing package/history: no matching task identified in tracked tickets; new stable package.

## Initial Request / User Evidence
“We should move the Projects after Agent Orgs. because Projects is the one which will be more widely used than skills.” No Product Team request. Screenshot shows Chat, Agents, Agent Teams, Agent Orgs, Skills, Memory, Nodes, Projects.
Screenshot source: /Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_fc29bf04d2dd4d5e97eaecca7ea57653/solution_designer_4d70731a76584fceaf1bc0632d0493f8/context_files/ctx_78a7d24a8574__image.png
User's frequency expectation is rationale, not measured usage evidence.

## Source Log (2026-10-03)
- E-001 — User request and screenshot: current visible placement and requested prominence.
- E-002 — `autobyteus-web/composables/useShellPrimaryNavigation.ts`: ordered list has agentOrgs → applications → skills → memory → nodes → projects. Projects label `shell.navigation.projects`, folder icon, /projects route, subroute active matching. Capability/runtime filter preserves source array order.
- E-003 — `autobyteus-web/composables/__tests__/useShellPrimaryNavigation.capabilities.spec.ts`: explicitly expects Projects after Nodes; covers disabled, mobile, independent Applications gating, readiness errors, route resolution/active state.
- E-004 — `rg -n 'useShellPrimaryNavigation' autobyteus-web`: AppLeftPanel and LeftSidebarStrip consume shared navigation; WorkspaceAdaptiveLayout uses route resolver.
- E-005 — `autobyteus-web/AGENTS.md`, root `TESTING.md`, solution-designer skill/reference/templates: no git add-all; use non-watch tests; renderer changes use web tests plus browser dev-path proof, not user's running app/data.
- E-006 — `git status --short`, `git symbolic-ref refs/remotes/origin/HEAD`, `git remote -v`, `git fetch origin personal`, `git worktree add ... -b codex/projects-primary-nav-order origin/personal`: bootstrap isolation/base evidence.
Commands were read-only except remote refresh/worktree creation and task documents. No implementation or tests executed.

## Product Understanding / Supported Paths
Primary shell navigation lets users open library/features. BEH-001: user locates and opens Projects; current last placement, unchanged destination. BEH-002: capability/runtime eligibility determines visible entries. These are supported normal product paths, not synthetic scenarios. Current code and screenshot agree; optional Applications is absent in screenshot but present in code inventory.

## Relevant Technical Facts / Surface Inventory
Only ordered navigation metadata and its regression expectation are presently implicated. Shared consumers exist, so expanded and compact navigation must stay aligned. No requested API, persistence, privacy, concurrency, lifecycle, deployment or ownership-boundary change. Further architecture confirmation is pending, not a completed design decision.

## Runtime / Probes
Supplied screenshot is current-state visual evidence only. No local runtime launched or tests run. Test/mock evidence establishes current intended contracts, not actual rendered acceptance of future work.

## Persisted State / Contracts
Projects capability determines visibility. Runtime gating hides Projects on mobile. No stored-data change is needed by requested outcome; no migration implied. Existing readers/writers untouched by approved intent proposed here.

## Product Design Context And Findings
Product Design request: Not stated. Product artifacts/prototype/spec: N/A.

## Supplemental Artifact Inventory
Screenshot path above; owner: user; scope: current-state evidence; related: REQ-001/AC-001; supplied and visible; approval applicability: evidence only. No behavior-defining supplement.

## Assumptions, Unknowns And Risks
AP-001 captured: user replied “yesss” to the presented exact order and preservation scope. Optional Applications placement clarified by baseline: Projects must immediately follow Agent Orgs even when Applications is enabled; all other entries retain relative order. No unresolved technical feasibility issue identified for requirements readiness. Downstream rendered proof remains required.

## Architecture Investigation Findings / Notes For Design
Post-approval worktree confirmed with `git status --short`, `git branch --show-current`, `git rev-parse HEAD`: same isolated branch/base; only owned task documents are untracked. Sources below read in task worktree on 2026-10-03:
- E-007 — `composables/useShellPrimaryNavigation.ts`: sole ordered metadata array; `computed` applies `.filter`, preserving order. No serialized nav order, backend call or startup gate in this metadata.
- E-008 — `components/AppLeftPanel.vue` lines 16–26 and 130–170, `components/layout/LeftSidebarStrip.vue` lines 12–23 and 75 onward: both render shared `primaryNavItems` with v-for. Expanded click calls existing route resolver; strip retains open-drawer/redock distinction. Neither needs separate ordering code.
- E-009 — `utils/mobileFeatureGates.ts`, `stores/projectsCapabilityStore.ts`, `stores/applicationsCapabilityStore.ts`: runtime rules and shared bound-node capability stores are separate existing owners; no change required for reorder.
- E-010 — `composables/__tests__/useShellPrimaryNavigation.capabilities.spec.ts`, `composables/__tests__/useShellPrimaryNavigation.spec.ts`, `components/__tests__/AppLeftPanel.spec.ts`, `components/layout/__tests__/LeftSidebarStrip.spec.ts`: focused regression sites and route/gating coverage; capability test contains obsolete after-Nodes expectation. AppLeftPanel tests are source assertions, not rendered proof.
- E-011 — `docs/projects.md` lines 10–22: default-off, independent CRUD and mobile exclusion explicitly documented. `rg -n 'after Nodes|after.*Agent Orgs|Projects.*Nodes|Nodes.*Projects'` across docs/e2e/components returned no explicit ordering prose in those searched files.
- E-012 — `tests/e2e/projects-feature-probe.mjs` header/setup: existing broader full Projects browser/API probe creates disposable backend/frontend and browser. Focused renderer proof can avoid broad CRUD/model execution; no test has been run at design stage.
Design implication: existing shared owner absorbs a metadata reorder and focused test update; no structural refactor, API, persisted-data migration or feature-gate change. Current design health is coherent for this scope. Remaining uncertainty is validation execution/environment, not intended structure; downstream owns executable and rendered acceptance proof.
