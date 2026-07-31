# API/E2E Execution Coverage Report

- Task: Universal Application Dual-Host Architecture
- API/E2E revision: `API-REV-013`
- Reviewed implementation: `IR-021` (cumulative SR-016 hardening)
- Source-review gate: `CRR-037` Pass / 98
- Reviewed HEAD: `53eb73795c616148f01c2f6e0207f6b410410e24`
- Outcome: **Pass**
- Final confidence: `98%` (`98.3%` unrounded)

## Execution Round Meta

- Trigger: `code_reviewer` reopened downstream execution after IR-021 resolved `CR-025`.
- Prior authoritative result: `API-REV-012`, Pass / 97%.
- Acceptance basis: `BEH-011`, `REQ-011`, `AC-024`, `UC-028`, DS-016, plus preserved `AC-001`–`AC-023` dual-host behavior.
- Scenario IDs: `APIE2E-ARCH-013`, `APIE2E-REPO-013`, `APIE2E-STANDALONE-013`, `APIE2E-STANDALONE-RESTART-013`, `APIE2E-STUDIO-013`, `APIE2E-STUDIO-REMOUNT-013`, `APIE2E-ROUTES-013`, `APIE2E-PARITY-013`, `APIE2E-CLEANUP-013`.
- Historical `APIE2E-REPO-005`: unchanged, separate, and not used as Pass evidence.

## Executed Repository Checks

| Command / Selection | Working Directory | Result | Evidence |
| --- | --- | --- | --- |
| `pnpm -C autobyteus-server-ts exec vitest run tests/architecture/application-framework-boundaries.test.ts` | repository root | 1 file / 14 tests Pass | `api-rev-013-architecture-first-gate.log` |
| `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` | repository root | Pass | `api-rev-013-architecture-first-gate.log` |
| Architecture test plus retained API-REV-012 31-file runtime/API Vitest selection | repository root | 32 files / 130 tests Pass | `api-rev-013-architecture-runtime-matrix.log` |
| `pnpm -C autobyteus-server-ts build` | repository root | Pass; built bootstrap smoke Pass | `api-rev-013-build-maintained-app-matrix.log` |
| `pnpm -C autobyteus-application-devkit test` | repository root | 20/20 Pass | `api-rev-013-build-maintained-app-matrix.log` |
| Brief `build`, `validate`, `typecheck:backend` | repository root | Pass | `api-rev-013-build-maintained-app-matrix.log` |
| Socratic `build`, `validate`, `typecheck:backend` | repository root | Pass | `api-rev-013-build-maintained-app-matrix.log` |
| SR-016 commit/scope scan and `git diff --check` | repository root | Pass | `api-rev-013-scope-audit.log` |

The architecture suite directly covers the IR-021 correction: Studio-local and Brief-local external scripts are accepted; Studio-to-server-runtime and Brief project-escape targets are rejected by AFB-002/005 before malformed target content is parsed. IR-020 resolution-origin behavior remains covered. The complete current tree passes all AFB rules.

## Real Environment

- Browser: installed Google Chrome, headless, through repository Playwright Core.
- Standalone URL: `http://127.0.0.1:43127`.
- Standalone data: unique `/tmp/api-rev013-standalone-data-*` root.
- Studio backend: `http://127.0.0.1:8011` with isolated SQLite/data/log/memory/workspace values.
- Studio frontend: `http://127.0.0.1:3011` with backend proxy directed to 8011.
- Studio application client: `pnpm -C applications/brief-studio dev:studio -- --studio-url http://127.0.0.1:8011`.
- Runtime identity: package-owned `Brief Studio Team`, researcher/writer members, `codex_app_server`, `gpt-5.6-luna` defaults.
- Package integrity set: the authoritative API-REV-012 73 maintained Brief package/authoring paths.

## Scenario Results

| Scenario | Expected | Observed | Result | Evidence |
| --- | --- | --- | --- | --- |
| `APIE2E-ARCH-013` | External `src` target enters AFB evaluator before read | Official suite 14/14; exact external-target fixtures Pass | Pass | architecture and scope logs |
| `APIE2E-REPO-013` | Current runtime/API baseline remains integrated | 32 files / 130 tests Pass; server/devkit/apps build and validate | Pass | runtime/build logs |
| `APIE2E-STANDALONE-013` | Real package team publishes, hands off by recipient name, and projects | Brief reaches `in_review`; 2 outputs / 1 final; researcher and writer publication succeed; `send_message_to(writer)` succeeds; SQLite has 2 revisions and attached binding | Pass | standalone browser JSON/PNG, actual-tools JSON, projection JSON |
| `APIE2E-STANDALONE-RESTART-013` | Current data is directly usable after same-root restart | Host restores recorded mixed team; prior Brief/status/2 outputs/1 final remain visible | Pass | restart log/state JSON |
| `APIE2E-STUDIO-013` | Exact package team/defaults enter one iframe and run real business path | Setup shows Brief team and Luna; actual publication/handoff/projection completes with 2 revisions | Pass | Studio browser JSON/PNG, tools and projection JSON |
| `APIE2E-STUDIO-REMOUNT-013` | Explicit host reload produces one fresh launch and preserves app state | iframe launch ID changes 1 -> 2; iframe count remains 1; completed Brief remains visible | Pass | Studio browser JSON/PNG |
| `APIE2E-ROUTES-013` | Internal route security and Studio-only gateway remain separated | Internal unauthenticated requests return 401 in both hosts; standalone `/mcp/gateway` 404; Studio initialize 200 | Pass | standalone/Studio route logs |
| `APIE2E-PARITY-013` | Both development hosts do not mutate package/authoring bytes | Pre/post 73-row SHA-256 files are byte-identical | Pass | pre/post hashes and cleanup summary |
| `APIE2E-CLEANUP-013` | No owned listener/process/scratch residue | Ports 43127/8011/3011 free; no matching owned process; staging residue 0 | Pass | cleanup summary |

## Actual Agent Tools And Projection Proof

### Standalone

- Researcher `publish_artifacts`: `TOOL_EXECUTION_SUCCEEDED`.
- Researcher `send_message_to` with `recipient_name: writer`: `TOOL_EXECUTION_SUCCEEDED`.
- Writer `publish_artifacts`: `TOOL_EXECUTION_SUCCEEDED`.
- Application SQLite: one `in_review` Brief, researcher/research and writer/final artifacts, two revisions.
- Platform SQLite: attached team binding with researcher/writer members.

### Studio

- The same three actual Agent Tools results succeed from graph-local Studio runs.
- Application SQLite contains the completed Brief and two projected revisions.
- Platform SQLite contains the attached package-owned team binding and both member routes.
- No bearer/session descriptor was retained in evidence.

## Route Separation Proof

| Host | Internal `/mcp/agent-tools/:sessionId` without bearer | External `/mcp/gateway` |
| --- | --- | --- |
| Standalone | `401 unauthorized` | `404 Not Found` |
| Studio | `401 unauthorized` | `200`, MCP initialize for protocol `2025-06-18` |

## Package Integrity Proof

- Baseline count: 73 paths.
- Pre-live HEAD: `53eb73795c616148f01c2f6e0207f6b410410e24`.
- Post-live HEAD: same.
- Exact `cmp`: Pass.
- Atomic staging/previous residue: 0.
- Maintained Brief and Socratic package validation: Pass.

## Temporary Harness Note

The first combined Studio probe reached setup, entered one iframe, created the real Brief, and triggered the provider run. Its temporary logic took the setup snapshot before asynchronous data was ready and then polled the cross-origin iframe DOM from the parent page. The real run completed, as proven by raw traces and SQLite. A focused corrected Playwright frame probe then waited for exact package setup, verified the completed projection, opened host controls, and passed the remount assertion. The superseding evidence file contains only the successful result. No production or durable test was changed.

## Final Confidence Scorecard

| Category | Score | Evidence |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 99% | Direct AC-024 fixtures/current tree plus preserved host requirements |
| Changed-boundary execution directness | 100% | Real architecture checker and exact external-target cases |
| Cross-boundary integration realism/mock gap | 98% | 130 repository tests and real provider/browser/SQLite paths in both hosts |
| Environment/configuration/identity fidelity | 98% | Current HEAD/lock/builds, isolated roots, exact team and Luna defaults |
| Failure/edge/lifecycle/recovery | 96% | Forbidden-before-read cases, same-root restart, explicit remount, retained API-REV-012 lifecycle evidence |
| User-surface/browser/desktop-shell confidence | 98% | Real standalone and Studio iframe Chrome journeys; no shell change |
| Durable regression quality/relevance | 99% | Closed AFB owner and direct positive/negative fixtures; no API-owned test workaround |

- Overall: `98%` (`98.3%` unrounded).
- No category is below 90%.
- Broader validation: **Required — completed**.

## Durable Coverage Changes

- API/E2E-owned additions: none.
- API/E2E-owned updates: none.
- API/E2E-owned removals: none.
- Durable proportional-review surface: `autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts`, with test-only dependency/lock integration in `autobyteus-server-ts/package.json` and `pnpm-lock.yaml`.

## Cleanup

- Controlled Chrome instances closed.
- Standalone, Studio backend, Studio frontend, and devkit watch processes stopped.
- Ports 43127, 8011, and 3011 are free.
- Temporary Playwright scripts removed.
- No package staging/previous residue remains.
- Other roles' dirty artifacts and pre-existing untracked devkit output were preserved.

## Residual Risk And Not-Tested Scope

- Historical `APIE2E-REPO-005` remains separate `Unclear`; no new origin was established.
- Full API-REV-012 worker-kill and active multi-run injection was not repeated because SR-016 changes no production source; its retained evidence is combined with current 130-test/lifecycle and real restart/remount confirmation.
- Electron shell execution was not selected because no shell-specific surface changed.

## Outcome And Routing

- Outcome: **Pass**.
- New/open failure IDs: none.
- Final confidence: `98%`.
- Next recipient: `code_reviewer` for the separate proportional durable-test review. Delivery must not resume until that review is complete.

## Evidence Inventory

All paths are relative to `tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/`:

- `api-rev-013-architecture-first-gate.log`
- `api-rev-013-architecture-runtime-matrix.log`
- `api-rev-013-build-maintained-app-matrix.log`
- `api-rev-013-scope-audit.log`
- `api-rev-013-standalone-host.log`
- `api-rev-013-standalone-route-separation.log`
- `api-rev-013-standalone-business-run.json`
- `api-rev-013-standalone-business-run.png`
- `api-rev-013-standalone-actual-tools.json`
- `api-rev-013-standalone-publication-projection.json`
- `api-rev-013-standalone-restart.log`
- `api-rev-013-standalone-restart-state.json`
- `api-rev-013-standalone-postrestart-routes.log`
- `api-rev-013-studio-backend.log`
- `api-rev-013-studio-frontend.log`
- `api-rev-013-brief-dev-studio.log`
- `api-rev-013-studio-route-separation.log`
- `api-rev-013-studio-business-remount.json`
- `api-rev-013-studio-business-remount.png`
- `api-rev-013-studio-actual-tools.json`
- `api-rev-013-studio-publication-projection.json`
- `api-rev-013-prelive-hashes.log`
- `api-rev-013-postlive-hashes.log`
- `api-rev-013-package-integrity-cleanup.log`
