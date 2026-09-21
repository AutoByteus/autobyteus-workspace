# API/E2E execution coverage report — ORG-HISTORY-LATENCY-20260917-001

## Latest authoritative result

**API-REV-002 — Pass; validation confidence 97.4% (not a test pass rate).** This reopened round directly validates IR-002's cold server-readiness correction. Historical API-REV-001 Pass / 95.0% remains valid only for byte-identical IR-001 frontend publication and unchanged recovery/selection behavior; it was not used as proof of the corrected cold backend owner.

Broader validation was **Required and completed**. Classification remains **Small / Low**, direct route. Proportional test-code review is **Not Required — direct low-risk route**. No commit, stage, push, merge, release, deployment, Electron certification, migration or user-profile/server/data operation was performed.

## Authority and scope

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency-reopen`
- Branch/base: `codex/org-history-startup-latency-reopen` / `d7343ea0dfe9ed0ea9fccb1d426c10bb1fa09ebd`
- Current authority: approved SR-004 / DS-REV-002 and IR-002, with SR-001/SR-002, SR-003/DS-001 and IR-001 retained.
- Architecture review: `N/A — not applicable` by Small/Low classification.
- Source review: `N/A — not applicable` by direct route.
- Persisted-data transition: Not Affected. Current history packages remain directly readable; no compatibility branch, fallback, repair or migration was added.

IR-002 changes one production call in `AgentOrgRunHistoryCatalogService.ensureInitialized()`: the first AgentOrg history catalog initialization now reuses the existing shared readiness generation with `AgentOrgRunPackageCatalog.awaitReady()` instead of unconditionally requesting a second `rebuild()`. Startup readiness, strict Team/Org validation, GraphQL contracts, derived indexes and the IR-001 frontend path remain unchanged.

## Repository execution

Working directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency-reopen`.

1. Verified `validation/ir002-source-manifest.json`: **4/4 entries exact** at intake and final (`validation/api-reopen-r2/intake-manifest-check.json`, `final-integrity.json`).
2. Initial server attempt was setup-only: two files / 11 tests passed while the mixed-history file could not resolve an intake-absent generated shared SDK package. This was not a product failure (`server-focused.log`).
3. Ran documented `pnpm --dir autobyteus-server-ts prepare:shared`; then the three changed owner files passed **12/12**:
   - `agent-org-run-history-catalog-service.test.ts`
   - `root-run-package-readiness-index.test.ts`
   - `collaboration-root-history-readiness.test.ts`
   Evidence: `server-focused-after-setup.log`.
4. Independently reran the unchanged IR-001 frontend preservation scope with `pnpm test:nuxt ... --run`: **10 files / 136 tests passed** (`web-preservation.log`).
5. Carried the supplied current server production build Pass (`validation/ir002-server-build.log`): shared builds, Prisma generation, `tsc -p tsconfig.build.json`, managed asset copy and sanitized built-in Agent bootstrap smoke all passed.
6. Final `git diff --check` passed. The two intake-absent generated SDK `dist` directories were removed after execution.

No API/E2E-owned durable test was added, updated or removed. The changed repository tests are implementation-owned. The temporary `cold-observer.mjs` and `launch-cold.py` validate the real process lifecycle without changing application behavior; they are execution evidence, not durable product tests.

## Actual environment and user-realistic setup

Owned isolated root: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency-reopen/.local/api-history-latency`.

- Backend `127.0.0.1:51181`, transparent observation proxy `51182`, Nuxt frontend `51183`; isolated HOME/data/SQLite.
- Chrome extension browser; normal application routes and visible controls only.
- Credentials were imported into the fresh isolated database using the user-authorized official secret importer. Secret values were never read or written into evidence.
- Synthetic authored `Latency Agent`, `Latency Team` and `Latency Org` packages were copied only into the isolated root. The Org contains a direct Agent and a mounted Team.
- Runtime state was created through ordinary frontend Run, Send and Stop journeys. No direct GraphQL mutation, store injection or fabricated history/tree file substituted for user actions.
- Three actual `gpt-5.4-mini` sends produced exact replies `LATENCY-AGENT-R2`, `LATENCY-TEAM-R2` and `LATENCY-ORG-R2`, then all roots were stopped through the UI.

## Case results and evidence

| Case | Result | Direct evidence |
| --- | --- | --- |
| R02 — manifest/repository coverage | Pass | 4/4 manifest exact; 12/12 server owner tests; 136/136 frontend preservation tests; production server build carried Pass |
| B05 — one cold readiness generation | Pass | Fresh backend PID 9296: one startup `rebuild()` from `startConfiguredServer`, 8 ms duration, one Team and one Org admitted; first workspace/Org catalog reads made two already-initialized `awaitReady()` calls and zero post-startup rebuilds |
| B06 — cold normal browser | Pass | From `about:blank`, normal Chrome navigation rendered Agent, Team and Org rows plus the selected retained Org reply within a 6,188 ms AX-observation upper bound. Workspace history returned/released in 4/5 ms; collaboration-root history returned/released in 22/22 ms |
| B07 — identity/status/no-start/preservation | Pass | Standalone Agent and Team, Org direct guide, mounted Team and mounted lead retained exact labels/IDs and rendered Offline; all three conversations reopened; provider metadata remained empty; 22/22 compared files byte-identical |
| C02 — cleanup/reconciliation | Pass | Browser tab closed, exact owned services stopped, ports 51181–51183 closed, generated SDK outputs removed, canonical artifacts updated |

### Cold readiness proof

Authoritative cold run 3:

- startup rebuild start/end: `2026-09-18T04:42:48.613Z` / `04:42:48.621Z`
- server listen: `2026-09-18T04:42:48.773Z`
- rebuild calls in the actual backend process: **1**
- readiness calls during first mixed history: **2**, both with `initializedBefore:true`
- post-startup rebuild calls: **0**
- admitted families after startup: Team **1**, AgentOrg **1**

The observer was imported before the application and wrapped the existing methods only to record starts/ends/callers, delegating each call unchanged. Worker subprocess `observer-ready` lines were excluded by the backend PID recorded by the launcher. Two earlier fresh-process runs showed the same one-rebuild/no-second-rebuild shape and remain supporting evidence.

Evidence:
- `validation/api-reopen-r2/cold-generation-summary.json`
- `validation/api-reopen-r2/cold-run3-readiness-events.jsonl`
- `validation/api-reopen-r2/cold-run3-transport.jsonl`
- `validation/api-reopen-r2/cold-run3-backend.log`

### Browser and preservation proof

The authoritative Chrome journey started from a blank tab after a fresh server process. The final accessibility state contained:

- `Latency Agent`, stopped run `Reply exactly: LATENCY-AGENT-R2`, original run ID suffix and Offline conversation with exact reply;
- `Latency Team`, stopped run `Reply exactly: LATENCY-TEAM-R2`, `/lead` Offline with exact reply;
- `Latency Org`, stopped run `Reply exactly: LATENCY-ORG-R2`, direct `/guide` Offline with exact reply;
- mounted `/squad` Team Offline and `/squad/lead` Offline without activating the never-used member.

The 6,188 ms number is the upper bound from navigation start to the first repeated accessibility observation containing Team, Org and exact retained Org reply. It is not paint timing, a benchmark or a universal SLA. The representative dataset is deliberately small and isolated; no claim is made about a user's much larger production history.

The cold process logged zero provider metadata calls. Before/after SHA-256 comparison covered 22 authored and persisted history/index/tree/context/trace/message/task files; no hash changed. Exact run IDs are recorded in `seed-before-cold.json`. Historical API-REV-001 live 503 recovery and active reconnection remain applicable to the byte-identical frontend, while current direct owner tests cover readiness failure/no-publication and generation authority.

Evidence:
- `validation/api-reopen-r2/seed-before-cold.json`
- `validation/api-reopen-r2/seed-provider-metadata.jsonl`
- `validation/api-reopen-r2/cold-generation-summary.json`
- `validation/api-reopen-r2/preservation-after-cold.json`
- `validation/api-reopen-r2/cold-run3-provider-metadata.jsonl`

## Confidence scorecard

Confidence is the simple mean of applicable categories, not a pass percentage.

| Category | Initial reopened | Final | Evidence / residual |
| --- | ---: | ---: | --- |
| Requirement and AC proof | 75% | 98% | One startup generation, first mixed read, visible retained rows and nonactivation directly proven; no production-scale SLA claim |
| Changed-boundary directness | 75% | 100% | Instrumented actual compiled process distinguishes startup `rebuild` from first-read `awaitReady` |
| Cross-boundary integration realism | 70% | 98% | Real server/SQLite/proxy/Nuxt/Chrome plus provider-created histories; observer records and delegates only |
| Environment/config/identity fidelity | 90% | 98% | Fresh isolated normal packages, exact IDs and current generated clients; representative rather than production volume |
| Failure/edge/lifecycle/recovery | 90% | 95% | Current failure/generation owner tests plus unchanged historical live recovery/reconnection; current live failure was not reinjected |
| User surface/browser/desktop | 55% | 95% | Normal Chrome routes/controls, cold sidebar render and inspection; no Electron-shell or paint-timing claim |
| Durable regression quality | 95% | 98% | Focused red/green lifecycle owners and preserved 136-test frontend scope; no redundant API test added |

Initial reopened confidence: **78.6%**. Final confidence: **97.4%**. All applicable categories are at least 95%, every critical changed acceptance criterion has direct proof, and no scoped failure remains.

## Residuals and qualifications

- The browser timing is a normal-user accessibility observation upper bound, not performance tracing or a universal latency guarantee.
- Data volume is one Agent, one Team and one Org; full production-scale package traversal remains outside this narrow fix.
- The actual browser run did not inject readiness failure; deterministic failure/no-publication is covered by the real owner service tests, and unchanged historical API-REV-001 covers live frontend recovery.
- Browser validation proves the web-equivalent renderer path, not Electron shell/packaging.
- No global strict Vue/server typecheck cleanliness is claimed beyond the supplied production server build and focused test scopes.

These residuals do not leave a critical IR-002 acceptance criterion unproven.

## Cleanup and routing

Cleanup evidence: `validation/api-reopen-r2/cleanup.json`. Owned Chrome tab `1211480835` was closed. Owned backend/proxy/frontend processes were stopped and ports 51181–51183 have no listeners. Generated `autobyteus-application-sdk-contracts/dist` and `autobyteus-application-backend-sdk/dist` prerequisites were removed. Isolated data/evidence was retained for reproducibility. User application/profile/server/data and external packages were untouched.

Outcome: **Pass**. Direct Small/Low route to Delivery after fresh handoff-rule lookup. Test-code review: **Not Required — direct low-risk route**. Eventual integration target remains `origin/requirements/flat-agent-organization-model`, not personal; this report grants no Git or release authority.
