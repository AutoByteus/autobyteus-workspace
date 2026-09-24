# API/E2E Coverage Investigation

## Investigation Meta

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy`.
- Upstream package (same ticket directory): `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, `solution-handoff.md`, `design-review-report.md`, `architecture-review-revision-record.md`, `implementation-handoff.md`, `implementation-revision-record.md`, `code-review-report.md`, `code-review-revision-record.md`; behavior supplement: N/A.
- Current basis: approved requirements SR-002, design SR-005, ARCH-REV-003 Pass, IR-002, CRR-003 Pass at source commit `49ce0d173` (ticket commit `ba28b4bb7`). SR-004/IR-001/CRR-001 are historical.
- API/E2E revision: `API-REV-002`; investigation round 2. Prior API-REV-001 result was **Fail / 86%** (F-001); latest round is **Pass / 95%** after independent revalidation.
- Canonical ledger: `api-e2e-test-case-ledger.md` (same ticket directory).

## Routing Classification

- `Medium` / `High`; reviewed input and Code Reviewer output. Proportional review applies if durable test code changes.

## Current Requirement And Design Basis

- AC-001 / SCN-001: Team and Org catalogs query admitted, normalized current indexes without read-time index writes or tree projection, including first read/new instance.
- AC-002 / SCN-002 / PM-001: lifecycle updates retain summary, timestamps, archive state, serial queue and exact-root manager-lane ordering; failed archive/delete compensate or reject without false success.
- AC-003 / SCN-003: imported memory is read-only and bounded. SR-005 makes the current Team explorer's one-tree-per-admitted-root bound mandatory now for both Team-list and Team-run-list GraphQL requests. The current branch has Team memory source only; the Org adapter on the separate unmerged memory branch remains conditional N/A.
- AC-004 / SCN-004: current eight-field Team/Org arrays directly usable without migration; missing index is empty, corrupt fails without overwrite, orphan tree is unlisted until explicit local-only offline repair.
- AC-005: affected history, run, memory, migration, API and integration checks; no compatibility runtime path.
- Implementation handoff reports no legacy runtime retention and `Directly Usable — No Migration`; inspect that through stores and an isolated owned profile rather than modifying live data.

## Changed Surface And Boundary Classification

| Surface | Affected | Evidence now | Material gap / mode |
| --- | --- | --- | --- |
| Domain, persisted index, lifecycle queue | Yes | Family/core/store units and real Team manager integration | Cross-family real-store fidelity and repair execution: integration/CLI |
| API/transport | Indirect | Existing workspace/archive GraphQL e2e; no schema change | Mixed-history request path with real catalogs: repository integration or focused probe |
| Frontend/browser/desktop shell | No implementation change | Existing UI contract/e2e | Browser would not add direct evidence for changed server boundary |
| Process/restart/persisted data | Yes | Existing-index and repair units | Built CLI on isolated copied profile, byte hashes, two-instance reads |
| Imported source | Team current, Org conditional | Team memory unit and source code | Isolated imported-folder probe; Org adapter only after branch merge |
| Worker/distributed/external identity | No | N/A | N/A |

## Project Execution Discovery

| Instruction/configuration | Learned constraint |
| --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch` for one-shot tests. |
| Root `package.json` | `pnpm dev` builds server; `test:e2e` and `test:e2e:real` exist. Avoid live-e2e because it may use shared runtime and the changed boundary can be isolated. |
| `autobyteus-server-ts/package.json` | Build prepares shared workspaces/Prisma; `tsc -p tsconfig.build.json --noEmit` typecheck; `pretest` builds shared packages. |
| `autobyteus-server-ts/README.md` | Local app-data defaults and server startup/migrations. Do not launch against user profile. |
| `autobyteus-server-ts/scripts/repair-collaboration-run-history-index.md` | Stop local server; full profile backup; dry-run default; `--apply`, missing-index acknowledgement, backups/readback; never imported source. |
| `autobyteus-server-ts/vitest.config.ts` and test fixtures | Vitest tests can use isolated temporary memory dirs; no credential needed for selected tests. |

- Environment: installed `node_modules` and two built workspace SDK `dist` directories are present; these are generated, not source edits. No secret/account required for selected checks.
- Resources: temporary OS directory owned by this run only. No user desktop/server process or live profile will be stopped/modified. Test-created folders cleaned; evidence logs retained under an owned `/tmp` directory.

## Persisted Data Transition Coverage Basis

- Decision: `Directly Usable — No Migration`. Representative current Team/Org index fixtures exercise stored summary, termination and archive fields; compare bytes before/after reads. Repair of missing rows is an explicit offline operation, not a migration or runtime fallback. Full live-profile mutation is not authorized/needed.

## Existing Durable Coverage Inventory And Validity

| Path/scenario | Decision | Requirement and reason |
| --- | --- | --- |
| `tests/unit/run-history/services/{collaboration-run-history-catalog-core,team-run-history-catalog-service,agent-org-run-history-catalog-service}.test.ts` | Still Valid | AC-001/002; direct stores and event policy; new strict behavior assertions align with approved policy. |
| `tests/unit/run-history/services/{collaboration-run-history-existing-index,collaboration-run-history-index-repair}.test.ts` | Still Valid | AC-004 direct-use/corruption/explicit repair. |
| `tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts` | Still Valid | PM-001 real manager-lane interleavings. |
| `tests/unit/agent-org-execution/agent-org-run-service-history-order.test.ts` | Still Valid | REQ-003 no preinitialize. |
| `tests/unit/agent-memory/team-memory-explorer-service.test.ts` | Still Valid | Team source owner query/read bound; Org source not present. |
| `tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts` | Still Valid — updated in API-REV-001 | Harness now models `withInactiveHistoryMutation` and creates admitted current Team packages; R-03 round-2 rerun passes. |
| `tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts` | Still Valid — updated in API-REV-001 | Resolver-construction fixture was corrected; workspace API assertions remain current; R-03 round-2 rerun passes. |
| `tests/e2e/agent-org-runs/stopped-org-workspace-graphql.e2e.test.ts` | Still Valid | Org lifecycle API; not complete catalog read-only proof. |
| Historical migration suites | Still Valid | Existing migrations remain migration-owned; not compatibility-only current-runtime coverage. |
| `tests/unit/agent-memory/{team-memory-explorer-service,agent-memory-location-service}.test.ts` (IR-002) | Still Valid | Two-root/per-request tree counter, computed per-file hashes, tree-scoped configured/task/nested path parity; direct unit proof but not source-selector GraphQL contract. |
| `tests/e2e/memory/imported-team-memory-graphql.e2e.test.ts` (G-01, API-REV-002) | Added Durable Coverage | Real imported source selector, both Team GraphQL lists, post-readiness tree counters, actual recursive SHA-256 maps, card/run/member identity. |

No obsolete assertion was found or removed. API-REV-001's stale E2E setup and missing built server were corrected and rerun; round 2 retained those fixes and added G-01 for the previously uncovered imported Team GraphQL boundary.

## Repository Coverage Execution Plan And Results

| Order | Command / surface | Purpose | Result |
| --- | --- | --- | --- |
| 1 | Focused policy + changed Team Memory/location units | AC-001/002/003/004 | **Round 2 Pass:** 8 files/35 tests (`/tmp/api-e2e-unified-history/r01-r2.log`) |
| 2 | Team manager and Org lifecycle integration | PM-001/REQ-003 | **Round 2 Pass:** 4 files/26 tests (`r02-r2.log`) |
| 3 | Workspace/archive/Org/imported-Team GraphQL and memory suites | AC-003/005 integration | **Round 2 Pass:** 7 files/15 tests (`r03-r2.log`); includes new G-01 imported source selector. |
| 4 | Authoritative build config + isolated new-test typecheck | Build/type consistency | **Round 2 Pass:** `r04-build-r2.log`, `r04-g01.log`, full build `build-r2.log`. The generic `tsconfig.json` attempt has the pre-existing `rootDir=src`/`include=tests` TS6059 conflict (`r04-r2.log`). |

## Test-Case Ledger Plan

- Required: Yes; multiple independently meaningful cases plus long-running CLI/fixture validation. Initialized before execution.
- Cases: R-01 focused policy; R-02 manager/lifecycle; R-03 API/memory; R-04 typecheck; L-01/L-02 prior unchanged-boundary evidence; L-03 prior-failure rerun; G-01 durable imported GraphQL; H-01 built HTTP GraphQL. Completed cases were recorded immediately in the canonical ledger.

## Durable Coverage Updated In API-REV-001 And Rerun In API-REV-002

| Scenario | Path | Required update | Basis |
| --- | --- | --- | --- |
| API-ARCHIVE | `tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts` | Provide exact-root manager inactive-lane stub, preserving active rejection and returned value; verify admitted fixture | AC-002 / PM-001 |
| API-WORKSPACE | `tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts` | Satisfy unrelated resolver construction dependencies while keeping mocked workspace service assertions | SCN-001 / AC-005 |

## Durable Coverage Added In API-REV-002

| Scenario | Path | Boundary and reason |
| --- | --- | --- |
| G-01 | `tests/e2e/memory/imported-team-memory-graphql.e2e.test.ts` | The existing Memory GraphQL E2E exercised agents only. G-01 durably protects the real imported Team source-selector and both list requests with tree counters and computed file hashes (AC-003). |

## Post-Repository Confidence Scorecard

| Category | Score | Support | Gap / improvement |
| --- | --- | --- | --- |
| Requirement and AC proof | 95% | Prior AC-001/002/004 direct evidence remains valid; IR-002 R-01–R-04 and G-01/L-03/H-01 directly resolve AC-003. | Org adapter after separate branch merge remains conditional N/A. |
| Changed-boundary execution directness | 95% | Built IR-002 service counter on copied real roots; in-process production GraphQL; built HTTP request; actual hashes. | Exact counter and HTTP run are separate but use the same production path and copied data. |
| Cross-boundary integration realism and mock gap | 95% | Real imported source selector, resolver, service, index, files and HTTP server; real Team manager integration. | Some workspace-history tests still mock the workspace owner, not this changed Memory path. |
| Environment, configuration, identity and fixture fidelity | 95% | Current persisted arrays and three real copied Team roots, isolated server profile, two-root durable fixture. | Did not mutate a live user profile. |
| Failure, edge, lifecycle and recovery | 95% | PM-001 rerun; prior built repair CLI safeguards remain directly applicable to unchanged catalog/repair code; corrupt/missing unit rerun. | No new failure-mode gap from IR-002. |
| User-surface/browser/desktop-shell | N/A | No frontend, browser or Electron shell changed; server API and CLI are the changed surface. | N/A |
| Durable regression quality/relevance | 95% | New G-01 exercises both imported GraphQL list methods with per-root counters, actual hashes and member IDs; existing targeted suites green. | N/A material gap. |

- Overall post-repository confidence: **95%** (six applicable categories, simple mean), after G-01 and R-01–R-04. All current-branch critical ACs have direct proof. Broader validation remained **Required** for copied real data and built HTTP confirmation because API-REV-001 failed that realistic boundary.

## Broader Validation Decision (Preliminary)

- **Round 2: Required and completed.** Selected built direct-service probe on three copied real Team roots plus built HTTP GraphQL with the imported source selector. It directly closed the prior F-001 gap; actual recursive SHA-256 maps were compared before/after each request. Browser validation was not selected because no frontend/renderer behavior changed. Prior CLI repair evidence remains applicable to unchanged code.

## Not Tested / Conditional Scope

- Org memory source adapter on the unmerged `memory-team-view-slow-load` branch: not present in this worktree, so cannot be credited or edited here. It remains a merge validation obligation.
- Actual user profile: read-only observational evidence only if needed; no mutations.

## F-001 Prior Failure And Round 2 Resolution

- **Historical API-REV-001 failure:** L-03 used a copied imported-style folder with three admitted current Team roots and the current real index. Readiness was explicitly rebuilt **before** instrumenting `TeamRunExecutionTreeStore.read`; the list request called the tree reader **12 times (4 per root)**, not at most once per root. The prior output's hard-coded byte-identity flag is not accepted as proof.
- `TeamMemoryExplorerService.buildGroups()` reads each root once, then `TeamMemoryMemberTargetBuilder.build(teamRunId)` invokes `AgentMemoryLocationService.listTeamMemberLocations`, which calls unscoped `TeamRunExecutionTreeLocationService.listAgents()` for every root. This rescans all roots for each root. The current-branch source diff is only a `withInactiveHistoryMutation` stub rename; the read-count mechanism predates this implementation.
- The approved AC-003 wording was unqualified, but historical SR-004 DS-004/step 4 had discussed one-root-tree inspection only in the **unmerged memory branch**. Code Reviewer CRR-002 classified this as Design Impact; SR-005 corrected the current Team design without changing AC-003. The Org adapter alone remains conditional.

**Resolution at SR-005 / IR-002 / API-REV-002:** The prior source/design gap was corrected without changing AC-003. L-03 rerun used built `49ce0d173` code on three current real copied Team roots and measured exactly three tree reads for the Team-list request and three for the Team-run-list request, after readiness. It computed and compared all 44 file SHA-256 hashes after each request (`cardsHashEqual=true`, `runsHashEqual=true`), rather than relying on the old hard-coded flag. G-01 exercises both GraphQL queries with an imported source selector and durable per-root/hash assertions. H-01 executes both through a built isolated HTTP server and confirms 45 source files byte-identical. F-001 is resolved by direct execution; the separate Org adapter remains conditional N/A.

## Investigation Decision

## API-REV-003 Re-entry — User-requested live browser validation (planned, not yet credited)

- Trigger: user specifically requested real browser testing and local import of `/Users/normy/autobyteus_org/autobyteus-agents` and `/Users/normy/autobyteus_org/autobyteus-private-agents`, including the classroom simulation Team and nested classroom Org. API-REV-002 Pass/95% remains the prior completed result until this round finishes.
- Boundary expansion: package-import UI and local-package catalog, Team/Org definition selection, browser run configuration, live Codex runtime if locally available, execution history and Memory UI, plus backend import/run persistence. This is supplemental validation, not a change to approved AC or a claim that the unmerged Org Memory adapter is present.
- Project path: root `package.json` `pnpm dev` builds server then launches the documented development backend/frontend; `scripts/development/development-runtime.mjs` isolates storage under this worktree's `.autobyteus/development/server-data` and uses 127.0.0.1 ports 8000/3000. `autobyteus-web/components/settings/AgentPackagesManager.vue` exposes local-path package import in Settings. Ports checked free before launch; no existing profile/process will be reset.
- Existing coverage: API-REV-002 repository/API/HTTP cases remain valid. Browser import, classroom Team run and nested Org delegation are not yet covered by that evidence; use temporary live browser journeys because this is user-requested interactive integration over local repositories and external Codex authentication, not a deterministic CI fixture. No source or durable test removal planned.
- Case plan: B-01 boot isolated stack and browser; B-02 import both packages through Settings; B-03 inspect Team/Org catalog; B-04 run classroom Team with bounded Codex model; B-05 run nested classroom Org delegation; B-06 inspect/reload history and Memory UI; B-07 cleanup. Checkpoint each actual outcome in canonical ledger. Model availability/authentication must be observed, not assumed.
- Broader validation: **Required** by explicit user request; do not infer browser Pass from API-REV-002's server-only proof.

- **Latest round 2 decision:** Proceeded after SR-005/ARCH-REV-003 and CRR-003 source Pass. Repository and broader validation passed; post-repository confidence 95%, final confidence 95%; no applicable category below 90%, no critical AC gap, no new reroute trigger. Successful reviewed-route handoff to Code Reviewer for proportional test-code review is appropriate. Round 1's Fail is historical and preserved in `api-e2e-revision-record.md`.

## Round 2 Re-entry Plan — API-REV-002 (Executed)

- **Prior failure first:** F-001 / L-03 was the prior authoritative failed result. SR-005 and IR-002 were independently executed, not credited from source review. The prior L-03 `allFileBytesUnchanged:true` output was hard-coded and **not** reused as byte-identity evidence; round 2 recomputed actual per-file SHA-256 before/after.
- **Changed-boundary classification:** same persisted catalog and API surfaces as round 1, plus corrected current Team memory location projection. No frontend/shell code changed. No new migration, index format, cache or compatibility route.
- **Existing coverage decisions:** prior R-01/R-02 catalog and manager tests remain valid; the two API/E2E-owned workspace harness edits remain valid and require rerun/test-code review on eventual Pass. IR-002's two new/updated unit files remain valid. The existing Memory GraphQL E2E only covers standalone agents; no imported Team source-selector assertion exists, so **Add Durable Coverage** at the GraphQL boundary. No stale test deletion.
- **Durable coverage to add:** `autobyteus-server-ts/tests/e2e/memory/imported-team-memory-graphql.e2e.test.ts`: two admitted roots, source metadata/selector, list and run-list queries, one tree read/root/request after readiness, actual recursive file SHA-256 map equality after each request, result/member identity and search preservation. This is narrower and more durable than a one-off resolver probe.
- **Case plan:** L-03 rerun first on an owned copy of real current Team roots using built code, with one request per list method and exact SHA maps; G-01 new repository GraphQL E2E; H-01 built HTTP GraphQL over an owned isolated imported profile (separate direct request-boundary proof); then R-01/R-02/R-03/R-04 affected suites/typecheck/build; L-01/L-02 focused replay as needed to maintain cross-boundary and recovery confidence. Ledger reuses prior IDs and adds G-01/H-01. Record each completed case before the next.
- **Broader validation decision:** Required and completed. The previous failure arose in an imported realistic-data path, and unit source review could not prove the built service/GraphQL source selector. Browser was not selected: no renderer or shell change. Isolated copied profiles were used; the user's live profile was never mutated.
- **Reroute before execution:** No. SR-005/ARCH-REV-003 settles the design applicability of AC-003 to the current Team source; do not reinterpret it as conditional.

## API-REV-003 completed browser investigation and confidence gate

- The planned B-01–B-07 live cases completed; exact checkpoints are events 35–45 in the canonical ledger. Actual browser tabs were used (Chrome for import/catalog/Team/Org execution, Safari for reload/history/Memory/archive when Chrome was used separately by the user). The isolated stack used the documented `pnpm dev` path, not the user's desktop AutoByteus process or live profile.
- Coverage decision: no new durable test or product source edit. Existing G-01/current API-REV-002 coverage remains valid and independently test-code-reviewed (CRR-004 Pass). The user-specific repository import and external Codex model journey is temporary live validation, not a stable CI fixture. No stale coverage was removed.
- New direct observations: browser-imported both specified local packages; real Codex App Server GPT-6-Luna classroom Team exchanged file-backed homework/answer and returned `CLASSROOM_BROWSER_OK`; nested Org task Team submitted `NESTED_CLASSROOM_OK` and Teacher accepted it; reload retained both runs; browser Team Memory inspector showed one run/two members and 16 raw trace records; before/after actual SHA-256 maps of four index/tree files and 16 imported definition files matched across Memory reads; stop/archive persisted both lifecycle rows and hid them from workspace history without deleting physical trees.
- Runtime caveat: professor's first turn remained running without new trace for approximately eight minutes after the student's accepted reply. A browser **Stop generation** action released the pending continuation; professor then read the answer and produced correct final feedback. Autonomous no-intervention completion is **not** credited. This is a bounded exploratory Codex-runtime/approval interaction uncertainty; it did not contradict the changed run-history policy's AC-001–005. Do not infer a specific code defect from one occurrence.
- Post-repository scorecard from API-REV-002 was 95% (six applicable categories; browser then N/A). After live validation, browser is applicable: AC proof 100; changed-boundary directness 95; integration realism 95; environment/fixture fidelity 95; failure/lifecycle 90; browser/user surface 95; durable regression 95. Mean **95%**, no category below 90, current-branch critical ACs directly proved. Broader validation decision **Required and completed**. The unmerged Org Memory adapter remains conditional N/A, not credited.
- Final decision: **Pass / 95% with explicit runtime caveat** for API-REV-003. No further validation is necessary for this branch's history-policy acceptance; a separate autonomous Team-runtime investigation is advisable if that behavior is treated as a product acceptance target. Owned backend/frontend listeners stopped, Safari test tab closed, isolated profile retained as execution evidence; no user profile or unrelated process reset.
