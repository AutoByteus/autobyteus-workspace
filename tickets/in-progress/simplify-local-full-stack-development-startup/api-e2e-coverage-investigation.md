# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/in-progress/simplify-local-full-stack-development-startup/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/in-progress/simplify-local-full-stack-development-startup/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/in-progress/simplify-local-full-stack-development-startup/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/in-progress/simplify-local-full-stack-development-startup/development-startup-contract.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/in-progress/simplify-local-full-stack-development-startup/solution-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/in-progress/simplify-local-full-stack-development-startup/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/in-progress/simplify-local-full-stack-development-startup/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/in-progress/simplify-local-full-stack-development-startup/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/in-progress/simplify-local-full-stack-development-startup/code-review-revision-record.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/in-progress/simplify-local-full-stack-development-startup/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`
- Current Investigation Round: `3`
- Trigger: `code_reviewer` focused failure-origin review classified CR-002..CR-005 as stale test fixtures/setup and requested bounded API/E2E-owned repair followed by an exact root rerun.
- Prior Investigation Reviewed: Round 2 and `API-REV-002`; the prior root command-scope failure and its eight fixture/setup failures were rechecked.
- Latest Authoritative Investigation: This file after Round 3 durable fixture/setup repairs, focused checks, exact root E2E execution, and retained live full-stack validation.



## Round 2 Historical State (API-REV-002)

The prior `DEV-007` command-forwarding failure is resolved in implementation revision `IR-002` / commit `0f836c992`; the exact root command now logs `vitest --run tests/e2e` and collected only `tests/e2e` files. The command completed with `8 failed`, `39 passed`, `14 skipped` files (`16 failed`, `148 passed`, `49 skipped` tests). The failures are in pre-existing product E2E areas (model fixture, media factory API, Claude interrupt timing, and token-usage `DATABASE_URL` initialization); no launcher/development source or durable test file is involved. They require focused failure-origin classification before a clean API/E2E pass can be declared.

The fixed-port full-stack path subsequently ran cleanly when the unrelated listeners were absent. Exact root `pnpm dev` built the server, started the real backend and Nuxt dev server, emitted `DEV_SERVER_READY` / `DEV_WEB_READY`, returned backend `/rest/health` 200 and frontend `/` 200, and stopped cleanly on SIGINT with no listeners or child processes left. A second run from `/tmp` using `pnpm --dir <repo> dev` reused the same development root; backend DB inode/hash and adjacent vault-key inode/hash remained identical across the stop/restart, and hostile parent values did not appear in runtime routing/data paths.

Round 2 evidence: `evidence/06-root-test-e2e-rerun.log`, `evidence/07-pnpm-dev-live.log`, `evidence/07-backend-health.json`, `evidence/07-frontend-headers.txt`, `evidence/07-development-before-stop.txt`, `evidence/08-pnpm-dev-alternate-cwd.log`, `evidence/08-live-checks.txt`, and `evidence/09-final-isolation.txt`. The earlier occupied-port and lifecycle evidence remains valid and preserved.

## Current Requirement And Design Basis

The reviewed implementation changes the root development command boundary and process/data ownership, not product APIs or domain behavior. The coverage target is the approved `BEH-001`–`BEH-006`, `REQ-001`–`REQ-014`, and `AC-001`–`AC-013` contract: `pnpm dev` must derive a module-relative repository root, materialize strict credential-free development configuration under the ignored `.autobyteus/development/server-data/`, force the seven launcher-owned backend routing/data-path keys, use fixed loopback ports `8000` and `3000`, prove backend and frontend readiness, propagate child/port failure truthfully, clean only owned children on signals/repeat stop, and preserve state across restart. `pnpm test:e2e` must remain a deterministic assertion path with test-owned state, while real-provider commands remain explicit opt-ins. Existing production/Electron state under `~/.autobyteus/server-data` and tracked templates are not to be read or mutated.

The implementation handoff marks persisted-data outcome `Not Affected`: development creates a new state root through normal current startup; existing production/test data must remain untouched, with no migration or compatibility path. The source review passed with no findings, and the review specifically preserved an occupied-port setup signal: unrelated listeners already own `127.0.0.1:8000` and `:3000`.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001`, root command | Changed / removed old aliases | `package.json`, `run-dev.mjs`, implementation handoff | Direct CLI invocation, exact readiness output, and absence of removed commands. |
| `BEH-002`, development state | Added | `development-runtime.mjs`, contract | Filesystem confinement, DB/key persistence, production/test separation. |
| `BEH-003`, deterministic tests | Changed | root `test:e2e` script and existing Vitest setup | Run the actual root command and inspect test-owned locations. |
| `BEH-004`, template/env materialization | Added | `development-runtime.mjs`, `.env.development` | Hostile parent env, root/cwd template contamination, atomic runtime env, symlink/path escape. |
| `BEH-005`, readiness/process lifecycle | Changed | `run-dev.mjs`, contract | Fixed-port conflict, real backend/frontend readiness, child failure, SIGINT/SIGTERM, repeat stop, owned cleanup. |
| `BEH-006`, credential/data ownership | Preserved | template/docs/importer/server owners | Value-safe scans and no automatic import or production-path access. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | No server domain source changed. | Existing server unit/E2E suites; build. | Launcher env/data selection could expose backend startup integration issues. | Live API startup and `/rest/health`. |
| API / transport / contract | Indirectly | Launcher starts existing built server and probes `/rest/health`; frontend routing variables are pinned. | Existing server E2E plus source seams. | Exact launcher-to-server process/env boundary is not unit-proven. | Live backend and frontend HTTP checks. |
| Frontend component / state | No product component change | Launcher starts existing Nuxt dev server and injects backend routing. | Nuxt package and source config. | Nuxt runtime/proxy/backend routing under launcher env. | Live Nuxt HTTP and optional browser decision. |
| Browser integration / user journey | No UI behavior change | Only frontend process start/routing is changed. | No repository browser suite for this command; HTTP readiness is direct. | Browser-only rendering/API config issues are not material to the launcher contract but remain not directly exercised. | Browser only if a local engine is available and useful. |
| Authentication / session / permissions | No | No auth/session code changed. | Existing server E2E. | Not relevant to startup ownership. | Not required. |
| Desktop renderer / web-equivalent UI | Indirectly | Nuxt dev process is launched; no renderer source changed. | Nuxt config/build. | Desktop-shell-specific behavior not covered. | Browser web-equivalent HTTP only; Electron out of scope. |
| Desktop shell / Electron-specific integration | No | Electron data root and launcher are unchanged/separate. | Source diff and implementation review. | No direct Electron run; no need to touch existing app. | Not required; state sentinel/hash evidence. |
| Process / lifecycle | Yes | `run-dev.mjs` owns fixed-port preflight, child supervision, signals, cleanup, exit result. | Four launcher tests and source review. | Full child lifecycle, abnormal exits, signal propagation not yet direct. | Temporary lifecycle harness plus live CLI where ports allow. |
| Persisted-data transition | Yes (new root only) | Materializes new development DB/key/runtime env; no migration. | Runtime materializer tests and source. | Restart persistence and data confinement need executable proof. | Materialization plus live server restart/SQLite/key evidence. |
| Worker / queue / distributed coordination | No | No worker/queue code changed. | Existing suites. | None for this ticket. | Not required. |
| External integration | No | Real-provider path remains explicit and unchanged. | Existing command inventory/source diff. | No external secrets should be used. | Not required. |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup`
- Project type and runtime stack: pnpm monorepo; Node.js ESM launchers; TypeScript/Fastify/Prisma SQLite backend; Nuxt frontend; Vitest server E2E; macOS arm64 host.
- Conflicting, missing, or unclear project instructions: No `AGENTS.md` found in the repository hierarchy. Root/server READMEs, package scripts, `autobyteus-server-ts/vitest.config.ts`, and `test-support/live-e2e/test-runtime-bootstrap.mjs` are the operative instructions.
- Required environment variables or secrets available: `N/A` for deterministic startup tests; no external provider secrets are needed or permitted. The launcher must preserve unrelated inherited values without using credential-bearing files.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `README.md` local full-stack section | Root command/data ownership contract | Run `pnpm dev`; fixed backend/frontend URLs; state under `.autobyteus/development/server-data`; reset only `.autobyteus/development`. |
| `autobyteus-server-ts/README.md` Tests and local development sections | Server test and credential ownership | `pnpm test:e2e` is root deterministic path; server uses `.env.test` only for tests; credentials via Settings or explicit importer target. |
| `package.json` | Authoritative root scripts | `dev` builds server then runs `node scripts/development/run-dev.mjs`; `test:e2e` delegates to server Vitest `tests/e2e`; real-provider commands are separate. |
| `autobyteus-server-ts/package.json` | Build/test scripts | `build` runs full TypeScript/Prisma bootstrap; `test` runs Vitest. |
| `autobyteus-server-ts/vitest.config.ts` | Test isolation | Node environment, fork pool, serialized files, Prisma setup/global setup, includes `tests/**/*.test.ts` and excludes prompt-engineering. |
| `test-support/live-e2e/test-runtime-bootstrap.mjs` | Existing live server isolation pattern | Materializes test runtime under `tests/.tmp`, starts built server with explicit `--data-dir`, waits for listening marker, stops owned child. |
| `scripts/development/development-runtime.mjs` / `run-dev.mjs` | Changed implementation owners | Module-relative development root, strict template, seven owned keys, fixed port/readiness and bounded cleanup. |
| `.gitignore`, `autobyteus-server-ts/.gitignore` | State/template hygiene | `.autobyteus/development/` and server runtime/test outputs ignored; `.env.development` and `.env.test` explicitly tracked. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Root launcher | repository root | `pnpm dev` | Builds server, then fixed `127.0.0.1:8000` backend + `127.0.0.1:3000` Nuxt. | `DEV_SERVER_READY`, `DEV_WEB_READY`; HTTP `/rest/health` and frontend 2xx. | SIGINT/SIGTERM; launcher owns only children. |
| Built backend | `autobyteus-server-ts` | `pnpm build`; launcher or direct `node dist/app.js --host ... --port ... --data-dir ...` | SQLite DB/key/data paths are runtime-root selected. | Listening marker and `/rest/health`. | SIGTERM then bounded SIGKILL fallback for owned child. |
| Nuxt frontend | `autobyteus-web` | Launcher invokes `pnpm dev --host 127.0.0.1 --port 3000`. | Uses pinned backend base and WebSocket variables. | HTTP 2xx at exact URL. | SIGTERM via launcher-owned child. |
| Deterministic E2E | root/server | `pnpm test:e2e` | Prisma global setup resets test DB; test files use isolated test-owned runtime. | Vitest process result and test counts. | Vitest exits; inspect only test-owned outputs. |
| Browser engine | N/A | No installed Chrome/Chromium executable found; `playwright-core` package is present without a browser binary. | No durable browser suite configured for this startup change. | Not applicable; live HTTP is preferred for process contract. | N/A. |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Development runtime | `materializeDevelopmentRuntime()` / `pnpm dev` | New ignored root only; no production/test data reads. | Remove owned `.autobyteus/development/` after validation, unless needed for evidence. |
| Deterministic test DB/runtime | Vitest global setup and `test-runtime-bootstrap` | `.env.test` is tracked non-secret; no credentials. | Existing test setup owns reset; do not delete unrelated test runtime. |
| Production data sentinel | `~/.autobyteus/server-data` path metadata/hash only | Do not read credential-bearing contents; existing Electron process is unrelated and must remain untouched. | No cleanup; verify unchanged metadata/hash if safe. |
| Hostile path/template probes | Isolated temporary files/dirs and symlink under `/tmp` or owned development root | Never redirect the launcher; no secrets. | Remove only probe-owned paths. |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`.
- Design-spec and implementation-handoff references: `requirements.md` Persisted Data Outcome; `design-spec.md` DS-004/transition checks; `implementation-handoff.md` Persisted Data Transition Check.
- Representative existing-data setup and required behavior: No existing application data is migrated. A fresh development DB/key is initialized under the canonical development root; any existing production/test path must remain untouched.
- Evidence planned for approved outcome: materialization path assertions, live backend initialization against the selected `--data-dir`, same DB/key inode/bytes across stop/restart, and before/after production sentinel metadata/hash check without opening secrets.
- Migration-specific completion/recovery scenarios: N/A.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `scripts/development/run-dev.test.mjs` template schema test | Exact four-key credential-free template; rejects extras, duplicate keys, path escape, interpolation. | `REQ-004`/`REQ-005`, `AC-004`/`AC-006`, DS-004. | Still Valid | Source review reran 4/4. | Retain; API/E2E supplements with filesystem/live checks. |
| `scripts/development/run-dev.test.mjs` materialization/env ownership | Seven launcher keys and frontend routing are canonical; tracked template unchanged. | `REQ-003`–`REQ-006`, `AC-002`–`AC-006`. | Still Valid | Source review and local unit result. | Retain; add live path confinement probe only temporarily unless a durable gap justifies a test change. |
| `scripts/development/run-dev.test.mjs` retained settings | Non-launcher env lines survive while owned assignments are replaced once. | `REQ-006`, `AC-006`. | Still Valid | Source review. | Retain. |
| `scripts/development/run-dev.test.mjs` occupied-port rejection | Fixed ports fail before stack startup. | `REQ-007`/`REQ-008`, `AC-009`. | Still Valid | Existing test and direct CLI evidence. | Retain; rerun exact fixed ports with unrelated listeners. |
| `test-support/live-e2e/test-runtime-bootstrap.mjs` | Existing test runtime validation, sanitized env, server readiness, bounded stop. | `REQ-009`/`REQ-010`, `AC-008`. | Still Valid | Existing code and root command plan. | Retain; run root `pnpm test:e2e`. |
| `autobyteus-server-ts/tests/e2e/**/*.e2e.test.ts` | Real server E2E assertion coverage using Prisma test setup. | `REQ-009`, `AC-008`; product contracts preserved. | Still Valid | Existing repository suite; no changed server source. | Retain and execute through root script. |
| Deleted `test-support/live-e2e/run-test-{dev,server,web}.mjs` | Manual full-stack test-labelled startup wrappers. | `REQ-011`, `AC-013`. | Stale / Remove | Intentional removal recorded in implementation/review artifacts. | No replacement; `pnpm dev` is the sole manual command and `pnpm test:e2e` owns assertions. |
| Browser/Electron E2E | No repository browser test covers this command; no shell code changed. | `AC-001`, `AC-013` only at process/web readiness boundary. | Out Of Scope | No installed browser binary; HTTP readiness is a more direct contract check. | Use live HTTP; record Electron not tested. |

## Stale Or Obsolete Coverage Decisions

The three deleted manual wrapper scripts are intentionally obsolete because their names implied assertions while they only started manual processes. `REQ-011` explicitly forbids aliases. Replacement is the root `pnpm dev` manual command plus root `pnpm test:e2e`; no old wrapper coverage is retained.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None initially | No durable API/E2E test is required before execution. Existing launcher tests cover pure materialization and port-preflight seams; remaining behaviors are process/environment integration probes whose fixed ports conflict with an unrelated running stack. | `AC-001`–`AC-010` and review residual risks. | Temporary executable harness/evidence under ticket `evidence/`; no test-file change planned. | Avoid adding a fragile permanent test that binds fixed developer ports or mutates shared workspace state. Reassess if a repeatable repository-owned fixture is missing after execution. |

## Durable Coverage To Update

None planned initially. If execution exposes a coherent missing reusable lifecycle fixture rather than environment limitation, route the proposed durable change to the implementation/code-review path instead of silently adding one during probes.

## Durable Coverage To Remove

None by API/E2E; obsolete wrappers were already removed as implementation scope and are recorded above.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `node --test scripts/development/run-dev.test.mjs` | repo root | Launcher materialization/template/hostile env/occupied dynamic port seams. | Planned | `evidence/01-launcher-unit.log` |
| 2 | `pnpm --filter autobyteus-server-ts build` | repo root | Built server entrypoint needed for live startup. | Planned | `evidence/02-server-build.log` |
| 3 | `pnpm test:e2e` | repo root | Deterministic real server E2E assertions and test-state isolation. | Planned | `evidence/03-root-test-e2e.log` |
| 4 | `pnpm dev` with exact occupied `8000`/`3000` listeners preserved | repo root | Fail-closed fixed-port behavior; must not touch unrelated processes. | Planned | `evidence/04-occupied-port.log`, listener snapshot |
| 5 | Temporary lifecycle/fixture harness invoking exported seams and owned child simulation | repo root | Child-failure propagation, signal/repeat-stop/idempotence, cleanup, hostile symlink/path matrix. | Planned | `evidence/05-lifecycle-harness.log` |
| 6 | Direct live backend/frontend on alternate temporary ports (only if fixed-port stack remains unavailable) | repo/server/web | Real built backend + Nuxt HTTP boundary and isolated data root, without claiming fixed-port launcher proof. | Planned | `evidence/06-live-alternate-port.log` |

## Post-Repository Confidence Scorecard (Mandatory; initial estimate before execution)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | Source review and durable launcher tests cover schema/path/port seams. | Exact clean start/restart and failure matrix unexecuted. | Fixed-port live start or exact blocked evidence plus temporary probes. |
| Changed-boundary execution directness | 75% | Unit tests call materializer and port probe directly. | No real `pnpm dev` success path yet. | Real launcher or safe direct alternate-port stack. |
| Cross-boundary integration realism and mock gap | 70% | Existing server E2E is real backend; implementation uses real entrypoints. | Launcher-to-Nuxt/backend env and process integration unproven. | Real backend + Nuxt HTTP probes. |
| Environment, configuration, identity, and fixture fidelity | 85% | Tracked template, sanitized test runtime, fixed roots documented. | Hostile cwd/symlink and persistent runtime evidence pending. | Temporary confinement/restart probes. |
| Failure, edge-case, lifecycle, and recovery evidence | 70% | Source review and occupied-port unit seam. | Signals, abnormal child, repeated stop, and owned cleanup pending. | Harness plus exact port conflict. |
| User-surface, browser, and desktop-shell confidence | 80% | Exact frontend HTTP readiness is in scope; no UI source changed. | No browser engine and no Electron validation. | Browser not required unless renderer behavior proves material; live HTTP is sufficient. |
| Durable regression coverage quality and relevance | 90% | Four focused launcher tests plus extensive server E2E. | No durable fixed-port lifecycle test by design. | Only if a maintainable fixture emerges. |

- Overall post-repository confidence: `77%` initial estimate; simple average of the seven categories (will be recomputed after execution).
- Every critical acceptance criterion directly proven: `No` pending execution.
- Any applicable category below `90%`: `Yes` — most, as planned.
- Default clean-confidence target of `95%` met: `No` before execution.
- Material residual risks: unavailable fixed ports, cross-platform process-group behavior, and no installed browser binary.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Lifecycle` + `Live API` + `CLI`; targeted browser decision is documented below.
- Specific confidence gap or residual risk addressed: real backend/frontend readiness, persistent state/restart, alternate-cwd module-relative resolution, hostile path/template/symlink isolation, fixed-port/child-failure propagation, signal/repeat-stop/owned cleanup, and actual deterministic root E2E execution.
- Why selected mode can materially improve confidence: these are process/filesystem/runtime boundaries that unit seams and source review cannot prove; direct CLI and live HTTP observations exercise the real entrypoints.
- Expected confidence after selected validation: at least 90%; 95% only if fixed-port clean start and all lifecycle paths are directly proven. If unrelated listeners prevent the fixed-port path, report the bounded gap rather than inflating confidence.
- Browser-specific decision and rationale: `Not Required` for this change because no UI/renderer behavior changed and no browser suite is configured; exact frontend HTTP success and backend routing are the changed web boundary. A browser-engine availability probe may be recorded, but lack of a browser binary prevents claiming browser coverage.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron.
- Relevant README or development instructions: root/server README local full-stack sections and implementation handoff.
- Web-equivalent behavior: Nuxt development server process and backend URL routing.
- Shell-specific or lifecycle behavior: Electron production data root and packaged server invocation, explicitly out of scope and unchanged.
- Chosen validation approach and why it fits the project: validate web-equivalent HTTP through the project launcher/direct entrypoints; do not touch an existing Electron process or production data.
- Server/frontend setup when browser validation is used: none unless a browser becomes available; direct HTTP setup documented below.
- Effect on any already-running desktop application: None; do not stop or reuse it.
- Behavior not directly proven and confidence consequence: Electron shell remains untested, but no changed boundary crosses into the shell; category is limited only if a critical desktop behavior were required (it is not).

## Live Environment And Fixture Plan

- Startup order and commands: capture listeners; run narrow launcher test/build; run root `pnpm test:e2e`; invoke `pnpm dev` from root and via `pnpm --dir <repo> dev` from an alternate cwd only when ports are free; otherwise preserve fail-closed evidence. For fallback, materialize development runtime and start built backend/Nuxt directly on temporary alternate ports with only owned temp state.
- Environment choices that materially affect the run: hostile launcher-owned env values, hostile `cwd`, no root `.env`/`.env.test` reads, fixed loopback endpoints, no credentials or external providers.
- Health/readiness checks: backend listening marker + `/rest/health`; frontend exact URL HTTP 2xx; launcher `DEV_*_READY` markers; child exit codes/signals; path scans and template byte hashes.
- Seed data / fixtures: none beyond normal fresh SQLite/vault initialization and test-owned Prisma setup.
- Test identities, authentication, permissions, or session state: none.
- Requirement-linked journeys or scenarios: `DEV-001` clean start/readiness; `DEV-002` persistence/restart; `DEV-003` alternate cwd; `DEV-004` hostile env/path/template/symlink; `DEV-005` fixed-port/child failure; `DEV-006` signal/repeat-stop/owned cleanup; `DEV-007` deterministic root E2E; `DEV-008` production/test isolation; `DEV-009` credential-free scans/docs.
- Evidence to capture: command output, listener/process snapshots, exact URLs/status, directory listings/stat modes, hashes of tracked templates, DB/key inode/size/hash (development-owned only), child output/exit, and cleanup checks.
- Owned processes and temporary state to clean up: only processes started by this run and temporary `/tmp` probes; never touch PID 10242/10276 or the existing Electron process.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `DEV-001` | Real `pnpm dev` with fixed ports, or exact occupied-port fallback evidence. | Full-stack startup/readiness or truthful preflight failure. | Fixed developer ports are shared and unsuitable for CI-style durable binding. |
| `DEV-002` | Start owned built server against materialized data root, query health, stop, restart same root, compare DB/key identity and files. | Current startup persistence without migration. | Existing live bootstrap pattern is project-specific and a launcher-specific permanent fixture would be brittle. |
| `DEV-003` | Run `pnpm --dir <repo> dev` from `/tmp` when ports free; otherwise compare module-derived constants/materialization and direct alternate-port root invocation. | Module-relative root selection. | Process startup is environment-sensitive. |
| `DEV-004` | Temporary parent env/cwd/template/symlink probes and owned-root scans. | Redirection resistance and path confinement. | Existing pure unit tests cover the stable contract; race-sensitive symlink matrix is not durable. |
| `DEV-005` | Occupied exact ports; launcher fake child injection/harness for child failure. | Stable nonzero result and failure propagation. | Requires fixed ports/process timing and should not run as a general repository test. |
| `DEV-006` | Signal launcher/owned child simulations and process-group inspection. | Deliberate clean exit, repeated stop, no unrelated process termination. | Platform-specific and potentially disruptive in durable suite. |
| `DEV-007` | Root `pnpm test:e2e` with existing Vitest setup. | Deterministic assertion owner and isolated test state. | Already durable repository coverage. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Exact clean `pnpm dev` success on fixed ports | At investigation time ports `8000` and `3000` are occupied by unrelated process PIDs 10242/10276 from another worktree. | AC-001/AC-003/AC-005 exact launcher startup cannot be observed unless ports are released. | Preserve evidence; do not stop unrelated processes. If still occupied after alternate probes, route any CLI failure to focused failure-origin review with setup classification. |
| Windows process-tree semantics | Current host is macOS arm64. | Cross-platform lifecycle behavior remains unverified. | Record residual risk; no Windows environment available. |
| Browser DOM journey | No browser executable is installed; no UI source changed. | Browser-only rendering issue would be unobserved. | Direct frontend HTTP is sufficient for launcher scope; state browser not run. |
| Electron packaged shell | Existing Electron process and production path are unrelated and must not be touched. | Shell-specific behavior not directly rerun. | Source diff plus path sentinel; out of scope. |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None at investigation start | N/A | Approved requirements/design and source review agree. | N/A |
| If direct `pnpm dev` emits anything other than `DEV_PORT_OCCUPIED` under the documented occupied-port setup | Local Fix / Unclear pending output | Compare exact command/output and owned process state. | `code_reviewer` for focused failure-origin review first; implementation only if evidence points to source. |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No` initially; reassess after execution.
- Post-repository confidence: `77%` initial estimate; recompute after checks.
- Broader validation decision: `Required`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `code_reviewer` for any execution failure-origin classification, not automatic implementation rework.
- Notes: The initial direct launcher setup is known to be occupied. All evidence must distinguish implementation behavior from environment contention, preserve unrelated processes, and avoid any production/test credential-bearing files.


## Round 2 Repository And Broader Validation Update

| Order | Command / Mode | Result | Evidence |
| --- | --- | --- | --- |
| 1 | `pnpm test:e2e` after IR-002 | `Fail` — correct E2E-only collection, but 8 files / 16 tests failed | `evidence/06-root-test-e2e-rerun.log` |
| 2 | Exact root `pnpm dev` with ports available | `Pass` — real build, backend/frontend readiness, HTTP 200, clean SIGINT stop | `evidence/07-pnpm-dev-live.log`, `07-backend-health.json`, `07-frontend-headers.txt` |
| 3 | Stop/restart persistence | `Pass` — same development DB and vault-key inode/hash; tracked templates unchanged | `evidence/07-development-before-stop.txt`, `08-live-checks.txt` |
| 4 | `pnpm --dir <repo> dev` from `/tmp` with hostile parent variables | `Pass` — same canonical root/readiness, hostile values ignored, clean stop | `evidence/08-pnpm-dev-alternate-cwd.log`, `08-live-checks.txt` |
| 5 | Final isolation scan | `Pass` — no fixed-port listeners/launcher children; template hashes and production-root metadata unchanged; no symlinks under runtime | `evidence/09-final-isolation.txt` |

### Round 2 Confidence

- Requirement and acceptance proof: `85%` — launcher requirements are directly exercised; deterministic E2E command scope is fixed but its existing suite has 16 failures.
- Changed-boundary execution directness: `95%` — exact root and alternate-cwd commands exercised against real backend/Nuxt processes.
- Cross-boundary integration realism/mock gap: `90%` — real backend health and Nuxt HTTP readiness passed; browser DOM was not needed for this launcher-only change.
- Environment/configuration/fixture fidelity: `95%` — hostile env, canonical paths, restart identity, tracked templates, and production metadata verified.
- Failure/edge/lifecycle/recovery: `95%` — exact occupied-port fail closed, real startup failure harness, signals, repeat stop, cleanup, and restart passed.
- User-surface/browser/desktop-shell confidence: `85%` — frontend HTTP passed; no browser binary and no Electron behavior changed.
- Durable regression quality/relevance: `90%` — focused launcher tests and existing E2E inventory remain relevant; no durable test changed.
- Overall Round 2 confidence: `91%` simple average. A failing critical suite prevents `Pass` regardless of this score.

### Round 2 Decision

- Proceed to API/E2E execution: `No` pending focused failure-origin review of the 8 failing E2E files.
- Durable coverage changes: `No`.
- Broader validation: real full-stack `Pass`; exact test command `Fail` due product E2E failures.
- Recommended recipient: `code_reviewer` for focused failure-origin classification.
- Browser decision: `Not Required`; no UI/renderer source changed, and direct Nuxt HTTP readiness passed.

## Round 3 Current State (API-REV-003)

The focused failure-origin review in the current `code-review-report.md` classified all eight Round 2 failures as API/E2E-owned stale fixtures or direct-test setup defects, not implementation-source defects. The bounded repairs were made only in durable E2E test code and test setup:

- `agent-package-private-skills.e2e.test.ts` now supplies the factory's current top-level `createLLM` option rather than the stale `llmFactory` option.
- `server-owned-media-tools.e2e.test.ts` mocks the current `requiresGeminiRuntimeResolver` method on image, audio, and video factories.
- `claude-agent-websocket-interrupt-resume.e2e.test.ts` supplies `postMessageToConversationTarget` on the team fake and models the production AbortController interruption lifecycle; assertions now observe abort settlement rather than requiring an immediate query close.
- The five token-usage GraphQL/startup files now initialize AppConfig with an isolated temporary SQLite URL before using `createConfiguredPrismaClient`; the legacy-path test uses the dynamically reset provider and a temporary `.env` after `vi.resetModules()`.
- New shared test helper: `autobyteus-server-ts/tests/setup/initialize-test-app-config.ts`. No production source or launcher implementation changed.

Focused checks passed before the broad run: runtime fixtures `3` files / `13` passed / `1` skipped; token-usage files `6` files / `11` passed. Source-only TypeScript validation `pnpm exec tsc -p tsconfig.build.json --noEmit` passed. The repository-wide `pnpm typecheck` remains a tooling baseline failure because `tsconfig.json` includes `tests` under `rootDir: src`, producing existing TS6059 errors; this is retained as evidence in `evidence/11-typecheck.log` and is not a failure of the changed fixture code.

The exact root command now passes after the fixture/setup repairs:

```text
pnpm test:e2e
  -> pnpm --filter autobyteus-server-ts test --run tests/e2e
  -> vitest --run tests/e2e
Test Files 47 passed | 14 skipped (61)
Tests      164 passed | 49 skipped (213)
Duration   138.87s
exit       0
```

The log contains no `tests/unit` or `tests/integration` collection. The previously failing eight files all pass in the broad run. The required broader runtime validation remains valid from Round 2: real root `pnpm dev`, fixed-port backend/frontend readiness, backend/frontend HTTP 200, alternate-cwd restart, DB/key persistence, hostile environment/path/template/symlink isolation, occupied-port fail-closed behavior, child failure propagation, signal/repeat-stop, and owned cleanup all passed. No listeners or launcher children remain, and development runtime state was removed after evidence capture.

Round 3 evidence: `evidence/10-fixture-runtime-focused.log`, `evidence/10-token-gpt-focused.log`, `evidence/10-token-ledger-focused.log`, `evidence/10-token-unit-prices-focused.log`, `evidence/10-token-backfill-focused.log`, `evidence/10-token-legacy-focused.log`, `evidence/11-typecheck.log`, `evidence/12-root-test-e2e-fixed-fixtures.log`, `evidence/13-build-typecheck.log`, plus retained `evidence/04`–`evidence/09`.

### Round 3 Coverage Decisions

| Area | Decision | Basis / Evidence |
| --- | --- | --- |
| CR-002 model fixture | `Needs Update`, completed | Current factory option is top-level `createLLM`; focused and root suite pass. |
| CR-003 media mock | `Needs Update`, completed | Current service calls `requiresGeminiRuntimeResolver` for each media factory; focused and root suite pass. |
| CR-004 Claude team/interrupt fake | `Needs Update`, completed | Fake now implements the current team-manager method and AbortController lifecycle; focused and root suite pass. Live Claude-provider test remains skipped because provider/binary credentials are not configured. |
| CR-005 token-usage setup | `Needs Update`, completed | Direct tests now initialize AppConfig in isolated temp SQLite state; focused and root suite pass. |
| Launcher lifecycle coverage | `Still Valid` | Existing launcher tests and temporary real-child harness remain requirement-aligned; exact live startup and cleanup already passed. |
| Browser/Electron | `Out Of Scope` for this ticket | No UI/renderer or shell source changed; direct Nuxt HTTP readiness passed; no browser binary is installed and Electron was not touched. |

### Round 3 Confidence

- Requirement and acceptance-criteria proof: `98%` — exact root E2E now passes and every material launcher scenario has direct live or focused evidence; provider-gated tests are explicitly skipped.
- Changed-boundary execution directness: `98%` — exact root `pnpm dev` and alternate-cwd commands exercised the real launcher, built backend, Nuxt process, fixed endpoints, and stop path.
- Cross-boundary integration realism and mock gap: `96%` — real backend health and Nuxt HTTP readiness passed; repaired mocks model current contracts and the broad suite passed.
- Environment/configuration/identity/fixture fidelity: `98%` — hostile env/path/template/symlink matrix, isolated AppConfig/SQLite fixtures, persistent DB/key identity, and final isolation passed.
- Failure/edge/lifecycle/recovery evidence: `97%` — occupied-port fail-closed, child failure, signals, repeat stop, owned cleanup, restart, and exact E2E recovery after fixture repair passed.
- User-surface/browser/desktop-shell confidence: `92%` — frontend HTTP readiness passed and no UI/shell source changed; no browser DOM or Electron shell run.
- Durable regression coverage quality/relevance: `95%` — focused durable fixture repairs are narrow and requirement-aligned; exact root suite passes; no launcher-specific fixed-port test was added because shared fixed ports are unsuitable for durable CI coverage.
- Overall Round 3 confidence: `96%` simple average, `(98+98+96+98+97+92+95)/7 = 96.3%`, rounded.
- Every critical acceptance criterion directly proven: `Yes` for the changed launcher scope; provider-gated and browser/Electron scenarios are explicitly outside the changed boundary.
- Any applicable category below `90%`: `No`.
- Default clean-confidence target of `95%` met: `Yes`.

### Round 3 Decision

- Proceed to API/E2E execution: `Yes`; exact root deterministic E2E and required broader launcher validation pass.
- Result: `Pass`.
- Durable coverage changes: `Yes`; the eight existing E2E files were updated and one shared test setup helper was added. No production source changed.
- Proportional test-code review: required from `code_reviewer` for the changed durable test/setup files.
- Broader validation: `Required` and completed; direct live HTTP was used instead of browser/Electron because the changed boundary is process startup/routing and no browser engine is installed.
- Next recipient: `code_reviewer` for the separate proportional test-code review, not failure-origin review.
