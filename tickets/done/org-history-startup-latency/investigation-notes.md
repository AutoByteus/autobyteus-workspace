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

- bootstrap-handoff.md — current reopened bootstrap evidence plus historical bootstrap reference, Solution Designer-owned, completed; context only.
- validation/publication-order-probe.cjs and .log — factual diagnostic for REQ-001/002; not behavior-defining or acceptance tests.
- User screenshots above — observed UI states, user-owned; not a timing benchmark.
- validation/reopen-r1/README.md and two sanitized JSON files — reopened actual warm-browser and cold-owner evidence; factual, not behavior-defining.
- requirements-doc.md — SR-001/SR-002 approved behavior authority, clarified but unchanged by SR-004 recovery.

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

## E-007 — Reopened failure and current workspace

On 2026-09-18 the user reported that the finalized fix still does not resolve the real cold-start symptom: under the `autobyteus-workspace-superrepo` workspace, Team history becomes visible and `Software Development Department` AgentOrg history remains absent for more than ten seconds. The user explicitly requested reopening this same ticket, moving its archive back to `in-progress`, creating a fresh worktree from the latest base, and reproducing through a browser frontend backed by the Electron-started server.

Fresh fetch resolved `origin/requirements/flat-agent-organization-model` to `d7343ea0dfe9ed0ea9fccb1d426c10bb1fa09ebd`. Dedicated reopened worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency-reopen`, branch `codex/org-history-startup-latency-reopen`; archived package moved from `tickets/done/org-history-startup-latency` to this canonical `tickets/in-progress/org-history-startup-latency`. The old remote ticket branch is preserved and is not the reopened branch.

This is material evidence against DR-002/DR-003 terminal effectiveness, not a new intended behavior. Prior source/tests/evidence remain historical inputs. Requirements SR-001/SR-002 stay approved; DS-001 needs revision. No user data repair, migration, app termination, Git commit/push/finalization or release was performed.

## E-008 — Actual browser against Electron backend: warm path is fast

The current latest-base Electron app was already running its embedded server on port `29695` with data root `/Users/normy/.autobyteus/server-data`. A Nuxt frontend from the reopened worktree was started on `51283` and pointed at that embedded server through a metadata-only HTTP observer on `51282`; websocket endpoints remained direct to the embedded server. A fresh Chromium page at a 1980×1240 viewport installed a pre-document MutationObserver, expanded `autobyteus-workspace-superrepo` as soon as the row existed, and observed the actual sidebar.

Sanitized result (`validation/reopen-r1/warm-browser-observation.json`): workspace row at 819.4 ms after probe install, Team history group at 899.5 ms, AgentOrg history group at 934.9 ms; AgentOrg was 35.4 ms after Team and 114.2 ms after workspace expansion. The corresponding real-profile requests completed in 64.3 ms (`ListWorkspaceRunHistory`), 69.8 ms (`ListCollaborationRootHistory`) and 63.3 ms (`GetWorkspaceRunHistory`). This correctly followed the user's requested browser/frontend-to-Electron-backend reproduction path.

It does **not** reproduce the residual delay because the long-running Electron backend had already initialized the AgentOrg history catalog. It disproves an always-present post-response DOM delay on the current code and narrows the defect to a cold/first-read path. Raw user-derived response bodies, Chromium profile and screenshot remain ignored local evidence and are not part of the ticket.

## E-009 — Cold exact-owner reproduction: duplicate readiness rebuild takes 26.657 seconds

`server-runtime.ts:188–212` runs app-data migrations and then awaits `new RootRunPackageReadinessIndex(memoryDir).rebuild()` **before** the HTTP server listens. `RootRunPackageReadinessIndex` keeps that result in process-global state keyed by resolved memory directory (`root-run-package-readiness-index.ts:54–72,174–193`). Its `awaitReady()` returns immediately when initialized; its `rebuild()` always begins a new full snapshot generation.

The first AgentOrg history read takes the opposite path from Team history:

- `agent-org-run-history-catalog-service.ts:85–99` calls `this.packages.rebuild()` during first initialization, then reads admitted Org trees and rewrites the derived index.
- `team-run-history-catalog-service.ts:230–247` calls `this.packageCatalog.awaitReady()` and reuses the current shared readiness generation, while reading its index concurrently.
- `agent-org-run-package-catalog.ts` already exposes both `awaitReady()` and `rebuild()` over the same shared `RootRunPackageReadinessIndex`; no new interface is needed.

An exact packaged-source, read-only probe in a fresh Node process executed one readiness rebuild against the same real memory root. It took **26,657.10125 ms**, admitted 307 Team packages and 17 AgentOrg packages, and retained 219 diagnostics. The probe did not invoke the server, migrations, catalog/index writers, providers or mutations. Only duration/counts are retained in `validation/reopen-r1/cold-readiness-probe.json`.

This reproduces a delay larger than the user's >10-second report in the exact blocking owner. `ListWorkspaceRunHistory` can return Team history through the already-ready Team catalog while `ListCollaborationRootHistory` waits for the AgentOrg catalog's second full readiness generation. The first implementation correctly publishes whichever response arrives, but cannot display AgentOrg before this unnecessarily delayed response exists.

## E-010 — Root cause and minimal safe boundary

Root cause: local initialization asymmetry. Startup already establishes the authoritative readiness generation. Team history awaits/reuses it; AgentOrg history unconditionally rebuilds it again. The residual bug is therefore not a remaining frontend publication barrier, missing polling interval, Org tree size, migration repair requirement, or need for an index/schema redesign.

The minimal safe boundary is to make AgentOrg history initialization use the existing `AgentOrgRunPackageCatalog.awaitReady()` contract. That preserves strict validation:

- normal server startup has already completed a valid generation before listen, so first history reads reuse it;
- isolated/tests/alternate callers with no initialized generation still cause `awaitReady()` to build one lazily;
- current `admitCurrent`/`excludeCurrent` mutation revisions and subsequent row/tree/index logic remain unchanged;
- no stale-response, frontend generation, activity, selection, history content or migration behavior changes.

A durable test must inject a package catalog with separately observable `awaitReady` and `rebuild` methods, prove first AgentOrg initialization calls `awaitReady` exactly once and never forces `rebuild`, and retain a no-preinitialized-generation integration/control demonstrating that strict readiness still occurs lazily. Actual API/E2E must restart an isolated server or otherwise reset the process-global readiness/catalog generation before the first browser history read; a warm browser or the previous one-Agent/one-Team/one-Org fixture cannot validate this regression.

## Reopened evidence boundary and next action

The user-required browser path has been exercised, and the exact cold owner has been reproduced read-only without stopping the user's Electron process. The original `runHistoryLoadActions` changes remain correct and should not be reverted. DS-REV-002 should supersede the frontend-only DS-001 for the residual defect, retaining prior frontend regressions as preservation coverage and adding the server initialization fix/test. Classification remains Small / Low unless implementation reveals that the shared readiness generation cannot be reused safely.
