# API/E2E Execution Coverage Report

- Task: Universal Application Dual-Host Architecture — Brief Startup Catch-up Revalidation
- API/E2E revision: `API-REV-015`
- Reviewed implementation: `IR-023`
- Source-review gate: `CRR-041` Pass / 98
- Reviewed HEAD: `05518682df4d34c583877a0b816907458061431a`
- Outcome: **Pass**
- Final confidence: **99%** (`98.7%` unrounded)

## Execution Round

- Trigger: source resolution of `CR-026` after `API-REV-014` found `APIE2E-STUDIO-RESTART-014` / `APIE2E-F009`.
- Prior authoritative result: `API-REV-014`, Fail / 85%.
- Acceptance basis: `AC-025` plus retained `AC-001`–`AC-024` dual-host behavior.
- Current scenarios: `APIE2E-REPO-015`, `APIE2E-STUDIO-RESTART-015`, `APIE2E-STUDIO-BUSINESS-015`, `APIE2E-STUDIO-REMOUNT-015`, `APIE2E-STANDALONE-BUSINESS-015`, `APIE2E-STANDALONE-RESTART-015`, `APIE2E-ROUTES-015`, `APIE2E-PARITY-015`, and `APIE2E-CLEANUP-015`.
- Historical `APIE2E-REPO-005`: unchanged, separate `Unclear`, and not used as Pass evidence.

## Repository Checks

| Command / selection | Result | Evidence |
| --- | --- | --- |
| IR-023 Brief catch-up, semantic resolver, publication, imported package, architecture | 5 files / 41 tests Pass | `api-rev-015-ir023-focused.log` |
| Egress filter plus cumulative API/E2E WebSocket fixture | 2 files / 33 tests Pass | `api-rev-015-team-lifecycle-durable-update.log` |
| Adjacent runtime/publication/lifecycle/route selection | 18 files / 97 tests Pass | `api-rev-015-adjacent-current-base.log` |
| Retained current checkpoint server selection | 39 files / 177 tests Pass | `api-rev-015-current-checkpoint-server.log` |
| Retained current web selection | 7 files / 21 tests Pass | `api-rev-015-current-checkpoint-web.log` |
| Devkit, frontend SDK, SDK contracts | 20/20, 12/12 plus types, 6/6 Pass | `api-rev-015-current-checkpoint-packages.log` |
| Server build-config no-emit/full build/bootstrap; Nuxt production/static build | Pass | `api-rev-015-production-builds.log` |
| Brief and Socratic build/validate/backend typecheck | Pass | `api-rev-015-maintained-apps.log` |
| `git diff --check` | Pass | `api-rev-015-diff-check.log` |

### Durable Coverage Reconciliation

No new API/E2E-owned durable edit was made in API-REV-015. IR-023's added/updated Brief unit coverage passed. The preserved cumulative API/E2E-owned path remains:

- `autobyteus-server-ts/tests/integration/agent/team-lifecycle-websocket.integration.test.ts`

It reconciles a stale duplicate-running-event expectation with the current exact-repeat filter and must be included in the proportional test-code review.

## Real Environment

- Installed Google Chrome controlled through repository Playwright Core.
- Studio: isolated data root; backend `127.0.0.1:8013`; Nuxt `127.0.0.1:3013`; real `pnpm -C applications/brief-studio dev:studio -- --studio-url http://127.0.0.1:8013`.
- Standalone: isolated data root; real packaged app at `127.0.0.1:43129`.
- Identity: exact package-owned Brief Studio Team, researcher and writer members, `codex_app_server`, `gpt-5.6-luna` launch defaults.
- Integrity set: exact retained 73-path Brief package/authoring list.
- All isolated roots were removed after capture; no secret/bearer is in evidence.

## Scenario Results

| Scenario | Observed result | Status | Evidence |
| --- | --- | --- | --- |
| `APIE2E-REPO-015` | Focused, checkpoint, adjacent, SDK, build, and maintained-app gates all pass | Pass | repository/build logs |
| `APIE2E-STUDIO-BUSINESS-015` | Real Brief reaches `in_review`; researcher/writer outputs; actual publication, named handoff, and writer publication succeed | Pass | business JSON/PNG, `studio-actual-tools.json` |
| `APIE2E-STUDIO-RESTART-015` | Exact eligible plus ineligible retained history survives graceful same-root restart; `ensure-ready` is 200/ready | Pass | retained-history, pre/post state, restart and ensure-ready evidence |
| `APIE2E-STUDIO-REMOUNT-015` | Explicit reload changes launch ID 1 → 2, keeps one iframe, preserves completed Brief | Pass | restart-remount JSON/PNG |
| `APIE2E-STANDALONE-BUSINESS-015` | Real package team publishes, recipient-name hands off, writer publishes, and two artifacts/revisions project | Pass | business JSON/PNG, tools/projection JSON |
| `APIE2E-STANDALONE-RESTART-015` | Graceful same-root restart restores title/status/researcher/writer/two outputs/one final | Pass | restart log/state JSON |
| `APIE2E-ROUTES-015` | Internal unauthenticated 401 both hosts; standalone gateway 404; Studio initialize 200 | Pass | route logs |
| `APIE2E-PARITY-015` | Exact pre/post SHA-256 rows match 73/73 | Pass | pre/post/parity logs |
| `APIE2E-CLEANUP-015` | Owned ports/processes/temp roots/scratch clear; no maintained app tracked delta | Pass | cleanup log |

## Exact Prior Failure Recheck

### Setup

A real Studio Brief was completed first. Its package-owned researcher published research, handed off by `recipient_name: writer`, and the writer published the final. Then the same live researcher was instructed through the supported application agent-communication WebSocket to perform another actual `publish_artifacts` operation against `final-brief.md`. This recreated the exact API-REV-014 mixed persisted state without direct file or SQLite manipulation:

- eligible Brief projection: researcher/research and writer/final;
- generic retained history: researcher/research, researcher/final (ineligible for Brief), and writer/final.

### Restart And Assertions

- Gracefully stopped only the Studio backend; kept frontend/devkit context.
- Restarted backend on the exact same isolated data root.
- Application `ensure-ready`: HTTP 200, `ready: true`, `lastFailure: null`.
- Browser restored the completed `in_review` Brief.
- Explicit host reload advanced the iframe launch ID and retained exactly one iframe.
- Eligible Brief records/artifacts/revisions were unchanged.
- The generic researcher/final history remained durable and was not projected into Brief state.

Therefore `APIE2E-F009` is resolved and `CR-026` is execution-confirmed.

A first temporary browser attempt sampled Studio setup before asynchronous identity resolution and is retained under an explicitly non-canonical filename. The corrected wait/assertion passed; this was a harness timing issue, not a product failure.

## Real Standalone Evidence

1. The packaged application started on an isolated data root.
2. A real package-owned Codex/Luna team generated a Brief.
3. Actual researcher `publish_artifacts` succeeded.
4. Actual researcher `send_message_to` used `recipient_name: writer` and succeeded.
5. Actual writer `publish_artifacts` succeeded.
6. Application SQLite projected exactly researcher/research and writer/final with two durable revisions; the Brief reached `in_review`.
7. Platform execution history remained present and the publication queue drained to its cursor after delivery.
8. Graceful stop and same-root restart restored the complete visible business state.

## Route, Integrity, And Cleanup Evidence

- Studio internal Agent Tools without bearer: 401.
- Studio external gateway initialize: 200, protocol `2025-03-26`.
- Standalone internal Agent Tools without bearer: 401 before and after restart.
- Standalone external gateway: 404 before and after restart.
- Package/authoring integrity: 73 pre rows, 73 post rows, exact equality.
- Cleanup: ports 8013, 3013, and 43129 free; zero API-REV-015 temporary roots; zero staging/previous pack scratch; no tracked Brief or Socratic package delta; `git diff --check` clean.

## Confidence Scorecard

| Category | Score | Evidence basis |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 99% | Exact failed scenario plus retained matrix pass |
| Changed-boundary execution directness | 100% | Actual catch-up path and real mixed-history same-data restart |
| Cross-boundary integration realism and mock gap | 99% | Real provider/team/tools/WebSocket/SQLite/worker/browser/iframe |
| Environment/configuration/identity fidelity | 99% | Reviewed HEAD, isolated hosts, exact package identities/defaults |
| Failure/edge/lifecycle/recovery evidence | 99% | Ineligible history, graceful restarts, remount, route denial, cleanup |
| User-surface/browser/desktop-shell confidence | 98% | Real Chrome web-equivalent paths; Electron shell is downstream-owned |
| Durable regression coverage quality/relevance | 97% | Direct IR-023 coverage plus cumulative narrow WebSocket delta |

Overall: **99%** (`98.7%`).

## Final Outcome And Routing

- Outcome: **Pass**.
- Broader validation: **Required — completed**.
- New or remaining current failure IDs: none.
- Resolved: `APIE2E-STUDIO-RESTART-014` / `APIE2E-F009` / `CR-026`.
- Residual risk: Electron-shell packaging remains a downstream specialist gate; browser evidence proves the web-equivalent surface. The expected favicon 404 in standalone did not affect any request or business assertion.
- Historical `APIE2E-REPO-005` remains separately `Unclear` and unattributed.
- Required next step: return the cumulative package and durable test delta to `code_reviewer` for proportional test-code review before delivery resumes.
