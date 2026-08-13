# API/E2E Coverage Investigation

- Task: Universal Application Dual-Host Architecture — Brief Startup Catch-up Revalidation
- Current API/E2E revision: `API-REV-015`
- Reviewed implementation: `IR-023`
- Source-review gate: `CRR-041` Pass / 98
- Reviewed HEAD: `05518682df4d34c583877a0b816907458061431a`
- Investigation status: **Complete**
- Execution outcome: **Pass**
- Final confidence: **99%** (`98.7%` unrounded)

## Revalidation Trigger And Priority

`API-REV-014` failed `APIE2E-STUDIO-RESTART-014` / `APIE2E-F009`: a real same-data Studio restart enumerated a researcher-owned generic `final-brief.md` history that is ineligible for Brief projection and failed application worker startup. `IR-023` changes the existing Brief startup reconciliation rule owner so startup skips only ineligible producer/path histories while preserving the strict live-delivery resolver and all generic durable history.

The required first check was therefore the exact real failure path, not a mock-only or clean-data substitute. Broader validation remained **Required** after that path passed because `AC-025` also requires current-base dual-host publication, recipient-name handoff, projection, remount/restart, route separation, package integrity, and cleanup.

## Changed Surface And Boundary Classification

| Surface | Classification | Required evidence |
| --- | --- | --- |
| Brief startup catch-up | Application backend / persisted-history lifecycle | Direct durable catch-up test plus real mixed eligible/ineligible same-data Studio restart |
| Live Brief publication | Strict semantic-path boundary | Existing strict resolver/imported-package tests and real dual-host publication |
| Generic publication history | Platform persistence | Existing post-commit test and proof that ineligible history remains retained across restart |
| Studio restart/remount | Process, worker, GraphQL, iframe | Graceful same-root restart, `ensure-ready`, restored projection, explicit one-iframe remount |
| Standalone parity | CLI, worker, browser, persisted state | Real package-owned team run, tools, projection, graceful same-root restart |
| Agent Tools/gateway | API/security routing | Internal unauthenticated 401; standalone gateway absent; Studio gateway initializes |
| Package integrity | Generated/authoring bytes | Exact pre/post SHA-256 equality for the retained 73-path set |
| Cleanup | Processes/data/scratch | Owned ports and temporary roots clear; no atomic-pack residue |

## Project Execution Discovery

Authoritative workspace package scripts and existing API-REV-014 evidence remain applicable:

- Node 22 and pnpm workspace scripts are the supported execution path.
- The linked local `@autobyteus/application-devkit` must be built before application scripts can consume `dist/cli.js`; the devkit test command performs that build. Published-package users receive built artifacts.
- Server TypeScript validation uses `tsconfig.build.json --noEmit`; the generic test-inclusive config is not a valid whole-tree substitute.
- Real browser validation used installed Google Chrome through repository Playwright Core.
- Studio used isolated data, backend `127.0.0.1:8013`, Nuxt `127.0.0.1:3013`, and real Brief `dev:studio`.
- Standalone used isolated data and `127.0.0.1:43129`.
- No secret or bearer value is retained in evidence.

## Persisted Data Decision

- Universal application package/data baseline: `Directly Usable — No Migration`.
- The existing readable-provider migration remains the current-base Studio startup gate.
- `IR-023` adds no schema or compatibility migration. Existing generic publication history remains durable; only Brief startup catch-up eligibility changes.
- The exact same isolated Studio root was stopped and restarted with eligible Brief projections plus a deliberately retained ineligible researcher/final history. The restarted worker became ready without mutating either history class.

## Durable Coverage Inventory And Validity

| Coverage path | Decision | API-REV-015 result |
| --- | --- | --- |
| `tests/unit/application-backend/brief-artifact-startup-catchup.test.ts` | **Added by IR-023, Still Valid** | Pass; actual Brief `onStart` skips ineligible history and processes eligible history in order |
| `tests/unit/application-backend/app-published-artifact-semantic-path-resolvers.test.ts` | **Updated by IR-023, Still Valid** | Pass; nullable eligibility lookup plus strict live resolver |
| `tests/unit/services/published-artifacts/published-artifact-publication-service.test.ts` | **Still Valid** | Pass; generic committed history behavior unchanged |
| `tests/integration/application-backend/brief-studio-imported-package.integration.test.ts` | **Still Valid** | Pass; package-owned live projection stays strict |
| `tests/architecture/application-framework-boundaries.test.ts` | **Still Valid** | Pass; 14 architecture assertions |
| `tests/integration/agent/team-lifecycle-websocket.integration.test.ts` | **API/E2E-owned update from API-REV-014, Still Valid** | Focused 2 files / 33 tests and current checkpoint Pass |
| Current checkpoint server selection | **Still Valid** | 39 files / 177 tests Pass |
| Current web selection | **Still Valid** | 7 files / 21 tests Pass |
| Devkit / frontend SDK / contracts | **Still Valid** | 20/20, 12/12 plus type proof, and 6/6 Pass |
| API-REV-014 dual-host matrix | **Still Valid; critical failing path required first rerun** | Rerun Pass on current HEAD |

### Durable Coverage Change Decision

No new API/E2E-owned durable test was added, updated, or removed in API-REV-015. The cumulative API/E2E-owned update remains:

- `autobyteus-server-ts/tests/integration/agent/team-lifecycle-websocket.integration.test.ts`

It removes only the stale expectation for a byte-identical repeated scoped-leaf `running` event suppressed by the current status transition filter. Identity, lifecycle, stream, command, reconnect, termination, and liveness assertions remain. This cumulative durable delta must receive proportional code review after this Pass.

IR-023 itself adds/updates the two Brief unit tests listed above. They were reconciled and executed as part of the current test-review surface.

## Repository Execution Result

| Gate | Result | Evidence |
| --- | --- | --- |
| IR-023 focused selection | 5 files / 41 tests Pass | `api-rev-015-ir023-focused.log` |
| API/E2E WebSocket reconciliation | 2 files / 33 tests Pass | `api-rev-015-team-lifecycle-durable-update.log` |
| Adjacent current-base selection | 18 files / 97 tests Pass | `api-rev-015-adjacent-current-base.log` |
| Current checkpoint server selection | 39 files / 177 tests Pass | `api-rev-015-current-checkpoint-server.log` |
| Current web selection | 7 files / 21 tests Pass | `api-rev-015-current-checkpoint-web.log` |
| Devkit / frontend SDK / contracts | 20/20, 12/12 plus type proof, 6/6 Pass | `api-rev-015-current-checkpoint-packages.log` |
| Production builds | Server no-emit/full build/bootstrap and Nuxt production/static build Pass | `api-rev-015-production-builds.log` |
| Maintained applications | Brief and Socratic build, validate, backend typecheck Pass | `api-rev-015-maintained-apps.log` |
| Repository hygiene | `git diff --check` Pass | `api-rev-015-diff-check.log` |

## Exact Prior-Failure Resolution

`APIE2E-STUDIO-RESTART-014` / `APIE2E-F009` is **Resolved**.

1. A real Studio Brief completed through the package-owned researcher/writer Codex/Luna team.
2. Actual researcher `publish_artifacts`, recipient-name `send_message_to(writer)`, and writer `publish_artifacts` succeeded.
3. Through the supported real application agent-communication WebSocket, the live researcher performed an additional actual `publish_artifacts` call for `final-brief.md`, creating the exact retained ineligible generic history without direct file or SQLite manipulation.
4. Pre-restart state proved two eligible Brief projections and the extra generic researcher/final history.
5. The backend was gracefully stopped and restarted on the same isolated data root while the frontend and devkit session remained.
6. The exact application `ensure-ready` endpoint returned 200 with `ready: true` and no failure.
7. Browser state restored the completed Brief; explicit Studio reload changed launch ID 1 → 2 while keeping exactly one iframe.
8. Post-restart state was byte/row-equivalent for eligible Brief projection and retained the generic ineligible history.

Canonical evidence: `api-rev-015-studio-retained-ineligible-publication.json`, `api-rev-015-studio-prerestart-state.json`, `api-rev-015-studio-restart.log`, `api-rev-015-studio-restart-ensure-ready.json`, `api-rev-015-studio-restart-remount.json`, and `api-rev-015-studio-postrestart-state.json`.

## Broader Validation Result

- **Studio:** Pass. Real business publication/handoff/projection, exact mixed-history restart, worker readiness, restored state, and explicit one-iframe remount all succeeded.
- **Standalone:** Pass. Real package-owned business run, actual publication/named handoff/writer publication, application/platform projection, graceful same-root restart, and restored state succeeded.
- **Route separation:** Pass. Both internal Agent Tools routes returned 401 without bearer; standalone `/mcp/gateway` returned 404; Studio gateway negotiated initialize at 200.
- **Package parity:** Pass. All 73 retained package/authoring SHA-256 rows remained identical after both hosts and maintained application builds.
- **Cleanup:** Pass. Ports 8013, 3013, and 43129 are free; API-REV-015 temporary roots and atomic scratch are absent; maintained applications have no tracked build delta.

One first post-restart browser probe sampled setup before asynchronous identity data settled and is retained as a temporary harness timing attempt. The corrected semantic wait passed and is canonical. Standalone Chrome logged only the expected missing-favicon 404; there were no request failures or business errors.

## Final Confidence Scorecard

| Category | Score | Basis |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 99% | Exact prior critical failure plus retained AC-025 matrix pass |
| Changed-boundary execution directness | 100% | Actual Brief `onStart` unit path and exact same-data real Studio reproduction |
| Cross-boundary integration realism and mock gap | 99% | Real Codex/Luna, tools, WebSocket, SQLite, worker, REST/GraphQL, browser/iframe |
| Environment/configuration/identity fidelity | 99% | Current reviewed HEAD, isolated real hosts, exact package team/model identities |
| Failure/edge/lifecycle/recovery evidence | 99% | Eligible/ineligible histories, graceful restarts, remount, route denial, cleanup |
| User-surface/browser/desktop-shell confidence | 98% | Real Chrome web-equivalent Studio/standalone; Electron shell remains downstream-owned |
| Durable regression coverage quality/relevance | 97% | Direct IR-023 tests plus cumulative narrow WebSocket update; proportional review pending |

Arithmetic overall: `98.7%`, reported as **99%**. No applicable category is below 90%, every critical criterion has direct proof, and no material execution gap remains.

## Investigation Decision

- Result: **Pass**.
- Final confidence: **99%**.
- Broader validation: **Required — completed**.
- Current failure IDs: none.
- `APIE2E-F009`: resolved and execution-confirmed.
- Historical `APIE2E-REPO-005`: remains separate `Unclear`, unattributed, and unused as Pass evidence.
- Next recipient: `code_reviewer` for the required proportional durable-test review; do not route directly to delivery.
