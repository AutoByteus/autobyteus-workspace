# Investigation Notes

## Investigation Meta
- Package: team-reload-stale-member-instructions
- Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions
- Git branch: codex/team-reload-stale-member-instructions
- Base: refreshed origin/personal, d6f6c7a9ff11f8a3a2f11aabd413de2ef8818b2b
- Finalization target (if approved): origin/personal
- Bootstrap: isolated worktree created successfully. Shared checkout is personal at 806907fae with unrelated dirty files; untouched.
- Status: Investigation complete, SR-003; requirements Approved (A-001); architecture design complete, Small/Low.

## Initial Request And Evidence
User requests investigation of stale Worker instructions after Agent Package Creator edits the public English Bridge Team and user clicks Agent Teams Reload. Four provided screenshots show old Worker content and creator reporting a one-line instruction, while team detail references the updated simpler Worker role. Screenshot paths are recorded in the final source inventory. Public source is /Users/normy/autobyteus_org/autobyteus-agents/agent-teams/english-bridge-team.

## Governing Instructions
Read solution-designer skill, requirements-engineering reference and templates; server/web AGENTS.md; workspace TESTING.md. Runtime reproduction must be test-owned and isolated; never test against the user's running app or ~/.autobyteus. User screenshots may be read as supplied evidence. No Product Design request.

## Source Log And Findings (2026-10-03)
All code paths below are relative to the isolated workspace root unless absolute.

| ID | Exact source / command | Observation |
| --- | --- | --- |
| E-001 | User screenshot #1 ctx_e3cef10da508__image.png and #4 ctx_9c72690f728c__image.png | Worker UI displays long earlier instruction, old English-specific description, 8 tools. |
| E-002 | User screenshot #2 ctx_2909693a671e__image.png; /Users/normy/autobyteus_org/autobyteus-agents/tickets/in-progress/create-english-bridge-team/simplification-result.md | Creator reports complete one-line update and removal of two unused handoff tools. |
| E-003 | /Users/normy/autobyteus_org/autobyteus-agents/agent-teams/english-bridge-team/agents/worker/{agent.md,agent-config.json} | Actual source is updated: `Work on the request you receive.`, description `Works on received requests.`, 6 tools, no skills. Snapshots in evidence/worker-source.md and worker-source-config.json. |
| E-004 | User screenshot #3 ctx_a9dc188473db__image.png; public package team.md | Team instructions already reflect simplified Worker responsibility. Strong evidence against a completely failed package edit. |
| E-005 | autobyteus-web/components/agentTeams/AgentTeamList.vue:185–198 | Reload calls team store refresh plus server settings only; no Agent catalog read. |
| E-006 | autobyteus-web/stores/agentTeamDefinitionStore.ts:144–175 | Team refresh mutates `RefreshAgentTeamDefinitionCatalog`, then queries only `GetAgentTeamDefinitions` network-only and publishes only team definitions. |
| E-007 | autobyteus-web/stores/agentDefinitionStore.ts:100–129; components/agentTeams/AgentTeamDetail.vue:106–145; components/agents/AgentDetail.vue:122,181–187 | Agent catalog fetch exits if already nonempty. TeamDetail's nominal fetch therefore cannot refresh warmed Agent state. Worker navigation uses exact team-local ID but AgentDetail resolves its content entirely from the old Agent Pinia snapshot; mounted detail skips fetch for nonempty store. |
| E-008 | autobyteus-server-ts/src/api/graphql/types/agent-team-definition.ts:312–321; agent-definition.ts:243–257; src/agent-definition/{services/agent-definition-service.ts:219,providers/cached-agent-definition-provider.ts:79,providers/file-agent-definition-provider.ts:351} | Backend Team refresh already refreshes both Agent and Team caches. Visible Agent query delegates to getAllVisible, reading team-local definitions through disk-backed discovery. Fresh server data does not publish into renderer without an Agent query. |
| E-009 | autobyteus-web/stores/agentPackagesStore.ts:82–97 | Separate package-settings action already invalidates/reloads both frontend catalogs. Not the Agent Teams Reload path reported here. |
| E-010 | `PROBE_DEPENDENCY_ROOT=/Users/normy/autobyteus_org/autobyteus-workspace-superrepo node tickets/in-progress/team-reload-stale-member-instructions/evidence/store-cache-probe.cjs` | Unchanged real store source + real Pinia/Vue + controlled Apollo reproduces updated Team but stale Worker. Only mutation+Team query occur after update, including TeamDetail-style fetches. Explicit network-only Agent reload shows latest instruction and description. Assertions pass; see evidence/store-cache-probe.log. |
| E-011 | `git fetch origin personal`; `git worktree add ... -b codex/team-reload-stale-member-instructions origin/personal`; `diff -q` relevant team store/server resolver vs shared checkout | Base successfully refreshed; relevant compared files identical in shared checkout. Source hashes in evidence/source-pins.txt. Installed build not inspected. |

User screenshot parent directory:
`/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_61a7077960f7455298e74340928b6448/solution_designer_514de91a555e45fea173f8530f28ace4/context_files/`.
Screenshots were supplied by the user; no test requests or writes were made against this live application/data.

## Relevant Existing Behavior And Supported Product Paths
| Behavior | Trigger / lifecycle | Current outcome | Evidence / confidence |
| --- | --- | --- | --- |
| BEH-001 | SCN-001: creator updates previously viewed local package → user selects Agent Teams Reload → opens Team → Worker | Team refreshed, warmed Agent snapshot remains stale | E-001–E-008, E-010, E-012–E-014; reproduced in unchanged-worktree packaged app; exact installed-instance cause remains inferred |
| BEH-002 | SCN-002: first Team inspection with empty Agent snapshot | TeamDetail loads Agent catalog before navigating to Worker | E-007; code evidence, preserved normal discovery |
| BEH-003 | SCN-003: explicit reload fails | Existing loading/error surfaces remain in use | E-005–E-007; failure UX preservation proposed, not runtime exercised |

## Root Cause
The frontend has independent Team and Agent catalog snapshots. Agent Teams Reload replaces only the Team snapshot even though its server mutation already refreshes both backend catalogs. Previously viewed Worker details read the untouched Agent snapshot. This explains not just stale instruction text but also stale description and tool count; it is not an instruction-card rendering issue. Network-only on the Team query cannot refresh unrelated Agent records.

## Structural And Payload Inventory
- Source payload: team.md/team-config.json; team-local agent.md/agent-config.json. Creator edits disk; no bug in supplied updated Worker source found.
- Readers: disk-backed Agent discovery; backend catalogs; GraphQL Agent/Team queries; separate Pinia arrays; details render these arrays.
- Structural surfaces: existing reload mutation/query, stores and list/detail navigation. No schema, ownership, security, migration or deployment change established as necessary during feasibility investigation. Final size/risk classification awaits approved design.
- Persisted data: public definitions, saved runs and history are not edited by this investigation and should not be overwritten by a catalog freshness fix. No data migration implied.

## Runtime And Probe Limits / Unknowns
- E-010 remains a controlled client-state probe. E-012–E-014 subsequently close the real isolated HTTP/packaged-app reproduction gap. Both are investigation evidence, not final post-fix validation or delivery approval.
- User's installed build, exact registered package root/copy, API payload and real running-session state were not inspected. A copied/imported package could have an additional source-refresh requirement; do not claim this was ruled out. User identifies public local project and updated Team screenshot supports direct refreshed source.
- Fix verification should exercise repeated Agent Teams Reload after test-owned package edits, inspect Worker instruction/description/tools, include shared member freshness and unchanged team-local visibility, and cover errors. API/browser checks must use isolated/test-owned data according to TESTING.md. Production session stays untouched.

## Supplemental Artifact Inventory
All paths are under the canonical ticket folder unless absolute. Owner: Solution Designer; status: investigation evidence; no behavior-defining supplement approval required.
- evidence/store-cache-probe.cjs and .log: reproducible store lifecycle finding, REQ-001/AC-001; controlled transport limitation above.
- evidence/worker-source.md and worker-source-config.json: dated public-source snapshots.
- evidence/creator-simplification-result.md: read-only copy of creator's update receipt, not approval of this software fix.
- evidence/source-pins.txt: source revision/hashes.
- Four user screenshot paths above: external user-owned evidence; not normative new UI designs.

## Product Design
Not requested; no visual change proposed. Product UI/UX specification, prototype and review: N/A — not applicable.

## Requirement Implications / Notes For Architecture
Proposed narrow outcome is one Agent Teams Reload making both the Team and its member definitions current before later inspection. Preserve source ownership, visibility, configuration and saved runs; do not change Agent instructions to conceal the refresh bug. Existing explicit Agent network reload demonstrates feasibility. Target technical solution was deferred until explicit approval A-001; it now lives in design-spec.md. Canonical requirements status: Approved, current SR-003, unchanged SR-001 intended-behavior basis with SR-002 evidence.

## Resumed Investigation — User-Requested Browser Reproduction
User follow-ups: “you can do experiments to reproduce this, its easy to reproduce you know” and “you can use your browser tool to reproduce this you know”. These authorize stronger reproduction experiments, not source implementation or approval of proposed fix requirements.
- Existing artifacts reread; worktree/package identity retained.
- Selected unchanged-worktree isolated desktop reproduction under TESTING.md. `pnpm install --offline --frozen-lockfile` completed (warnings: absent unrelated app-devkit CLI dist, ignored @google/genai build script); no lockfile change.
- `pnpm --silent isolated-app start --build` launched worktree build; stdout/stderr captured in evidence/isolated-start.json and isolated-build.log.
- Browser/computer tool inventory inspected; no known isolated tab yet. Will bind only the created isolated app, not user's running production app.
- Public English Bridge Team copied into evidence/reproduction-package/agent-teams/english-bridge-team as a disposable linked-source fixture, initial instruction/description markers version one. Original public package untouched. No LLM call is needed to reproduce completed file updates.
- Reproduction in progress; no real-product pass claimed yet.

## Completed Real App Experiment — E-012–E-014 / SR-002
- E-012: browser-reproduction-report.md and evidence/ui-observation-excerpts.md. User-authorized browser/computer-tool investigation reproduced load → completed fixture source edit → Agent Teams Reload → stale Worker in unchanged-worktree packaged app. Team v2 was visible; Worker retained v1 instructions/description/6 tools while source/backend had v2/2 tools. Initial and stale-content tool assertions passed. One long-Team AX marker assertion failed because AX truncated the text; expanded screenshot visibly contained v2 marker.
- E-013: evidence/api-before-edit.json, api-after-edit-before-reload.json and api-after-reload-and-control.json: real HTTP requests only to owned isolated backend http://127.0.0.1:53753/graphql. Backend Agent reads already saw v2 before frontend Reload. Final snapshot confirms updated Team and Worker. Existing UI Agents Reload control made same Worker display v2 instruction/description/2 tools; assertion passed. Confirmed temporary workaround; no source fix.
- E-014: evidence/isolated-start.json and build log: iso-53752-8cc8 built and launched from unchanged worktree revision. evidence/isolated-stop.json confirms graceful stop, temporary root removed and ports released; evidence/isolated-list-after-stop.json shows our instance absent. Other records were untouched.
- Supplements added (Solution Designer, investigation-only, REQ-001/AC-001; no normative supplement approval): browser-reproduction-report.md; UI observation excerpts; three API snapshots; disposable package fixture; dependency/build/start/instance/stop/list logs. Absolute root is the canonical ticket folder above.
- No Package Creator model turn was executed; completed external edits were modelled using test-owned source writes, not production mutation. Exact installed app/registration remains uninspected. Requirements scope unchanged; approval still pending.

## Requirements Approval / Post-Approval Architecture Investigation — SR-003
A-001: User message 2026-10-03, “cool. approve. now work on it”, following confirmed reproduction and prior proposed narrow correction. This approves the unchanged REQ-001–003 / AC-001–004 requirements basis (SR-001 with SR-002 evidence), including source/state/ownership preservation and existing failure/retry behavior. No behavior-defining supplement or Product design. Requirements now Approved; downstream implementation/validation/finalization gates still apply.

| Evidence ID | Exact post-approval inspection / command | Observation / design implication |
| --- | --- | --- |
| E-015 | `git status --short`; `git branch --show-current`; `git rev-parse HEAD`; `git diff --name-only`; `git diff --check` in existing isolated worktree | Still codex/team-reload-stale-member-instructions at d6f6c7a9ff11f8a3a2f11aabd413de2ef8818b2b, no tracked source edits. Earlier build produced two untracked SDK dist directories plus ticket docs/evidence. Existing task isolation remains valid; integration untouched. No additional bootstrap needed. |
| E-016 | autobyteus-web/stores/agentTeamDefinitionStore.ts:144–175; agentDefinitionStore.ts:131–152; `rg -n agentTeamDefinition` in Agent store/definitionOwnership utility | Agent's public query-only reload owns network-only request, Agent snapshot publication, error propagation and loading state. It throws on request/GraphQL failure. Team explicit refresh has an existing enclosing error/finally lifecycle. Agent store has no reverse dependency on Team store; a one-way action-level reuse is cycle-free. |
| E-017 | `rg -n 'reloadAllAgentTeamDefinitions|refreshAndReloadAllAgentTeamDefinitions' autobyteus-web` excluding generated/dependency folders; stores/{agentPackagesStore,applicationPackagesStore}.ts | Explicit backend-refresh action is invoked by TeamList; query-only Team reload is separately used by package coordinators already refreshing both catalogs. Change explicit refresh only; retain query-only reload semantics to avoid extra/duplicate refresh work in unrelated callers. |
| E-018 | autobyteus-web/components/agentTeams/AgentTeamList.vue:44–54,185–198; stores/__tests__/agentTeamDefinitionStore.spec.ts:101–140; components/agentTeams/__tests__/AgentTeamList.spec.ts | Team store errors already render in catalog error panel; list finally restores Reload control. Existing store test verifies mutation-before-Team query only and would miss Agent freshness; component test stubs store actions. Need actual both-store warm-state regression and failures/completion ordering, not only a spy on button action. |
| E-019 | autobyteus-server-ts/src/api/graphql/types/agent-team-definition.ts:312–322; earlier real fixture/API evidence E-012–014 | Existing backend mutation refreshes both Agent and Team definitions in order; no new backend API/reader/write change is necessary. Definition identities/scopes are unchanged. Only missing renderer Agent catalog publication is in scope. |

Architecture fact inventory: no persisted-format/source-file/run-history changes, no new transport/API or route schema, no permissions/visibility/runtime owner changes, no added parallelism or background lifecycle. Existing Team loading boundary already spans server mutation and catalog query; bounded sequential reuse can extend completion to dependent member data without introducing a new cache/transaction owner. See design-spec.md for normative technical choices, not this factual evidence authority.
