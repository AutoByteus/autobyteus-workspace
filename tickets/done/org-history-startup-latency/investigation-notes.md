# Investigation — ORG-HISTORY-LATENCY-20260917-001

Bootstrapped isolated worktree org-history-startup-latency, branch codex/org-history-startup-latency, after fresh origin/requirements/flat-agent-organization-model fetch at6f15f446d6a56004caa15e70f4d8e68cba6eb9bc. Same finalization target, NOT personal. User screenshots show Team section before Org section; greater-than-ten-second interval is user reported, not measured by screenshots. No user process/data mutation authorized or performed.

## E-001 — Supported startup path and visible evidence

User reports >10 seconds between Team and Org visibility. Screenshots show the two states, not elapsed time. Source at `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue:433` mounts normal history fetch alongside workspace navigation and definition catalogs. Rows render when workspaceNodes exist, independently of the global loading message (`:61–82`). This is a supported normal startup, not a synthetic-only entry point.

User evidence paths (read-only, not copied to public fixtures):
- /Users/normy/.autobyteus/server-data/memory/agent_orgs/software_development_department_75403d5130584669869fdd59725f6b3e/software_engineering_team_3e746e3211f34fb39aad3979b4751e04/solution_designer_b1a3b7b01d35499d9fa06baf799a2046/context_files/ctx_c28d4a64834f__image.png
- /Users/normy/.autobyteus/server-data/memory/agent_orgs/software_development_department_75403d5130584669869fdd59725f6b3e/software_engineering_team_3e746e3211f34fb39aad3979b4751e04/solution_designer_b1a3b7b01d35499d9fa06baf799a2046/context_files/ctx_01373fb9bb5e__image.png

## E-002 — Confirmed publication barrier

`autobyteus-web/stores/runHistoryLoadActions.ts:87–168` awaits both family queries with Promise.allSettled. It publishes workspaceGroups, then awaits buildNextAgentAvatarIndex and reconcileDiscoveredActiveRuns, and only afterward publishes agentOrgHistory. Therefore when Team rows from this fetch appear, that fetch's Org response has already settled. Successful Org data can remain hidden behind unrelated post-processing. A failed Org response would instead set its error after the same barrier.

`runHistoryStoreSupport.ts:55–88`: avatar builder can await all Agent definitions. Reconciliation (`runHistoryLoadActions.ts:223–334`) sequentially hydrates discovered active Agents and opens active Teams with selectRun:false, then connects streams. Those tasks are not required merely to publish accepted Org history. They remain necessary existing behaviors; removing them is not an approved fix.

`refreshAgentOrgHistoryForStore` already independently reads/publishes Org rows with request-generation protection. Existing store tests around lines 683–875 cover family failure retention, strict root correlation and newer focused-request ownership; these are preservation evidence, not startup-latency acceptance.

## E-003 — Executed bounded diagnostic

Command: `node tickets/in-progress/org-history-startup-latency/validation/publication-order-probe.cjs` from ticket worktree. Executed unmodified production TypeScript scheduler, transpiled using existing base-worktree TypeScript. Controlled query/parser/avatar/context/hydration import boundaries; no application services.

Three deterministic deferred cases confirmed:
1. Both responses ready, avatar pending: workspaceRows=1, orgRows=0. Release avatar: orgRows=1.
2. Both responses ready, active Agent hydration pending: workspaceRows=1, orgRows=0. Release hydration: orgRows=1 and normal connection completes.
3. Org response ready, workspace response pending: both unpublished. Release workspace: both publish.

Probe source hash and exact output in validation/publication-order-probe.log. This proves a causal dependency in the real scheduler, NOT the user's exact ten-second timing or live Electron reproduction. The probe asserts the existing defect, not acceptance of a fix. No production or durable test edits.

## E-004 — Original personal source comparison

Read with `git show 5645b49d6f51faa60bd3545bc8e3f0e7e3f96793:autobyteus-web/stores/runHistoryLoadActions.ts`. That pinned source publishes workspaceGroups immediately after its single history query, before avatar loading and active-run reconciliation. Nested Teams were in the same workspace history slice. The current separate Org publication comes after those waits. This is source comparison only; no old application replay or claim about every personal revision.

## E-005 — Backend is not index-only

Read `autobyteus-server-ts/src/run-history/services/collaboration-root-history-service.ts`: the mixed facade awaits Team history and Org catalog concurrently, then reads each inactive Org execution tree (or active snapshot) and sorts results. The frontend requests Org tree JSON plus minimal Team discriminators; its parser filters Team rows and strictly validates Org trees.

Read `agent-org-run-history-catalog-service.ts`: initialized catalog rows are held in memory; first initialization rebuilds package catalog, reads index and admitted trees, then writes derived index. No measured backend bottleneck established. Do not promise index-only reads or modify migration/catalog contracts based solely on screenshots. The confirmed post-Team-visible frontend barrier is independently actionable. Backend timings remain a validation observation, not a preapproved backend rewrite.

## Evidence boundaries and next action

No live startup trace, user DB/log inspection, runtime restart, acceptance tests, Electron build, Git commit/push or package rewrite. Exact attribution of the user's elapsed ten seconds among avatar/reconciliation operations remains unmeasured. A fix must be validated through actual frontend startup with isolated representative history and response-to-render timing, preserving normal active reconciliation. No universal machine-dependent latency SLA is inferred.

## Supplement inventory

- bootstrap-handoff.md — bootstrap evidence, Solution Designer-owned, completed; context only.
- validation/publication-order-probe.cjs and .log — factual diagnostic for REQ-001/002; not behavior-defining or acceptance tests.
- User screenshots above — observed UI states, user-owned; not a timing benchmark.
- requirements-doc.md — SR-001 sole proposed behavior authority, Ready for Approval.

## E-006 — Post-approval render boundary investigation

Reconfirmed isolated HEAD6f15f446d6 and only ticket-owned untracked docs/probe. Read current ticket files:
- `stores/runHistoryStore.ts:114–121,435–473`: fetchTree awaits loader then calls refreshRunNavigationTopology. getTreeNodes reads cached navigationProjection, lazily initializes only when null. Thus merely assigning family arrays earlier is insufficient to guarantee rendered rows.
- `stores/runHistoryNavigationStoreActions.ts:25–41`: existing synchronous topology refresh uses both accepted slices and current contexts through buildRunHistoryNavigationProjection; increments navigationTopologyRevision.
- `composables/useWorkspaceHistoryTreeState.ts:58,424–433`: computed sidebar consumes cached getTreeNodes; selection reveal watches topology revision. No automatic watcher rebuilding on every raw-array write.
- `stores/runHistoryNavigationProjection.ts:110–155`: pure projection includes accepted Org history, retains equal nodes from prior projection; no network calls.
- `utils/runTreeProjection.ts:363–418`: Org history can create history-only workspace groups without waiting for workspace catalog or Agent history; names come from execution tree snapshot.
- `stores/agentOrgContextsStore.ts:159–166`: retained-history reconciliation is synchronous dispatch for reopen-required contexts with existing operation/inspection guards; not a promise barrier and must remain.

Refinement to E-002/user explanation: workspaceGroups assignment makes raw state available, not a guaranteed DOM publication by itself. Other existing topology refreshes can expose that slice during post-processing; final fetchTree refresh is another display barrier. Design must publish the cached navigation projection at each accepted-family boundary. The prior isolated probe proves raw scheduling dependency only; real-store/projection/render validation is mandatory, not inferred from that probe.

No intended behavior changed by this discovery. No production/test changes. A preliminary read accidentally used default checkout for a projection file; that unrelated content was excluded, and the actual file and Org-only projection were re-read at the pinned isolated worktree above.
