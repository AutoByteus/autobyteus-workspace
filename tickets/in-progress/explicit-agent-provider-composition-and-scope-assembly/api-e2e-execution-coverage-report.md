# API/E2E Execution Coverage Report

## Execution Round Meta

- Task: `explicit-agent-provider-composition-and-scope-assembly`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/explicit-agent-provider-composition-and-scope-assembly`
- Reviewed HEAD: `8704f2653b664c6ae7b5ecb24f2dd3885a79aad9`
- Requirements: `requirements.md`
- Investigation Notes: `investigation-notes.md`
- Design: `design-spec.md`
- Supplemental design artifacts: `provider-composition-and-agent-tools-authority-contract.md`, `provider-composition-transition-inventory.md`
- Upstream trigger artifacts: `solution-revision-record.md`, `design-review-report.md`, `architecture-review-revision-record.md`, `implementation-handoff.md`, `implementation-revision-record.md`, `code-review-report.md`, `code-review-revision-record.md`
- Current source review: `CRR-004` Pass / 94.7; `IR-003`
- Coverage investigation: `api-e2e-coverage-investigation.md`
- Revision record: `api-e2e-revision-record.md`
- Current API/E2E revision: `API-REV-002`
- Prior result: `API-REV-001` **Fail / 63%**, `APIE2E-F001`
- Trigger: `/code_reviewer` request to rerun the corrected exact failure paths first, then the retained real-system matrix
- Latest authoritative result: this report

## Investigation And Execution Basis

- Investigation existed and was reconciled before final execution: **Yes**.
- Exact prior failure paths executed first without initializing unrelated globals: **Yes**.
- Durable coverage decision: existing IR-003-updated tests are current; API/E2E added, updated, or removed no repository-resident durable test.
- Broader validation decision: **Required / Completed** because real providers, distinct host roots, authenticated Agent Tools, recursive private Team/task routing, browser UI, restart and cleanup cross boundaries that repository tests do not collectively prove.
- Compatibility/legacy result: no compatibility branch, fallback, migration, duplicate authority, wire/schema or package-multiplicity change was observed. Persisted-data decision remained `Not Affected`; current state was read through normal readers after restart.

## Repository Execution

| Scenario | Command / Surface | Result | Evidence |
| --- | --- | --- | --- |
| `APIE2E-ENV-002` | frozen install, shared/devkit/server prerequisite builds, server build-config TypeScript and production build | **Pass** | `evidence/api-e2e/api-rev-002-environment-build.log` |
| `APIE2E-F001` | exact eight prior failure files | **Pass** — 8 files; 64 Pass / 8 environment-gated Skip | `api-rev-002-f001-exact-rerun.log` |
| `APIE2E-STRUCTURAL-002` | Host/Authority/provider/kernel/Mixed Team/context 15-file selection | **Pass** — 121/121 | `api-rev-002-structural-focused.log` |
| `APIE2E-AFFECTED-002` | expanded 28-file provider/session/manager/application/lifecycle selection | **Pass** — 25 files / 171 tests; 3 files / 29 environment-gated Skip | `api-rev-002-affected-server.log` |
| `APIE2E-RETAINED-002` | recursive Team/task, nested history restart, MCP routes, application backend, Brief and standalone | **Pass** — 11 files / 48 tests | `api-rev-002-retained-server.log` |
| `APIE2E-APPS-002` | devkit full test; Brief and Socratic build, validate, backend typecheck | **Pass** — devkit 21/21 and both applications | `api-rev-002-app-build-commands-corrected.log` |

The first affected application selection ran before packages were generated, and the first app command attempt ran before the frontend SDK prerequisite. Both were retained as setup characterizations (`api-rev-002-affected-server-prepackage.log`, `api-rev-002-app-build-commands.log`); canonical prerequisites were then built and the exact reruns passed. No assertion or product code was changed to obtain the result.

A full unisolated server characterization also completed: 539 files Pass, 70 Fail, 31 Skip; 3129 tests Pass, 208 Fail, 127 Skip. Those failures span unchanged, environment/global-fixture-sensitive and historical areas. They remain separately `Unclear` repository debt, are not attributed to IR-003, and are not used as Pass evidence. The scoped affected and retained matrices above are the authoritative ticket result. Evidence: `api-rev-002-all-durable-server-characterization.log`.

## Realistic System Execution

### Environment And Fidelity

- Node 22 / pnpm workspace on macOS arm64.
- Isolated SQLite/data roots under `/private/tmp/api-rev-002-provider-composition`.
- Isolated ports: standalone `43551`, Studio `43560`, Nuxt `31560`.
- Supported secret importer used for both isolated roots from the user-authorized owner-private environment; values were never logged.
- Shared definitions loaded read-only from `/Users/normy/autobyteus_org/autobyteus-agents`.
- Private definitions loaded read-only from `/Users/normy/autobyteus_org/autobyteus-private-agents`.
- Private Team: `agent-teams/nested-classroom-test`.
- Browser: installed Chrome via Playwright Core; this proves web-equivalent Electron renderer behavior, not shell IPC/packaging.

One initial Studio startup inherited the parent shell's `DATABASE_URL` and reached only startup/no-pending-migration/cache work against the user's existing DB. It was stopped before any product action and restarted with the explicit isolated database before every journey. This is recorded as environment-safety evidence and lowers environment confidence to 95%; no success claim relies on that startup.

### Requirement-Linked Journeys

| Scenario | Boundary / Behavior | Observed Result | Evidence |
| --- | --- | --- | --- |
| `APIE2E-DUALHOST-001` | maintained Socratic standalone and Studio app roots | **Pass** — standalone Codex `gpt-5.6-luna` solved `7x-5=44` as `x=7`; Studio Codex solved `9x+4=58` as `x=6`; both persisted two-message lessons | `api-rev-002-standalone-corrected-proof.log`, `api-rev-002-studio-socratic-verify.log`, screenshots |
| `APIE2E-PUBLICATION-001` | real Studio Brief publication, named handoff and projection | **Pass** — Researcher/Writer Codex run; `publish_artifacts` created `research.md` and `final-brief.md`; Researcher `send_message_to` Writer returned `DELIVERED`; both files projected | `api-rev-002-studio-handoff-publication.json`, `api-rev-002-studio-brief-browser.log` |
| `APIE2E-NESTED-001` | private recursive mixed execution family | **Pass** — Teacher Codex `gpt-5.6-luna`; nested Student One/Two AutoByteus `deepseek-v4-flash`; team and direct-member messages ACKed; delegated task submitted and accepted | `api-rev-002-nested-mixed-team-proof.json`, `api-rev-002-nested-mixed-corrected-persisted-proof.json`, browser log/screenshots |
| `APIE2E-CONTEXT-001` | context-file owner/path/provider execution | **Pass** — uploaded file normalized to run-owned `ctx_*` path and real Codex returned the exact marker | `api-rev-002-context-file-proof.json`, browser screenshot/log |
| `APIE2E-ROUTES-001` | internal Agent Tools and Studio-only external gateway separation | **Pass** — missing internal sessions returned `401` on both hosts; Studio gateway initialized `200`; standalone gateway `404` | `api-rev-002-route-separation.log` |
| `APIE2E-SHUTDOWN-001` | active provider/worker/Team shutdown and leak cleanup | **Pass** — active Brief/Socratic/private Team processes present before close; Studio logged clean close; final listeners/processes absent | `api-rev-002-active-shutdown-pre.log`, `api-rev-002-active-shutdown-post.log`, `api-rev-002-final-cleanup.log` |
| `APIE2E-REENTRY-001` | same-data restart, normal current readers and UI reentry | **Pass** — standalone x=7, Brief two outputs, Studio Socratic x=6 recovered in browser; four histories returned inactive/offline; mixed V2 resume config retained exact models and nested topology | `api-rev-002-restart-browser-recovery.log`, `api-rev-002-post-restart-history.json`, `api-rev-002-nested-resume-config.json` |
| `APIE2E-WATCH-001` | maintained `dev:studio` watch/reload/remount | **Pass** — both watchers repacked/reloaded on byte-identical source touches and both application states survived browser remount | `api-rev-002-dev-watch-remount.log`, `api-rev-002-post-watch-remount-recovery.log` |
| `APIE2E-PARITY-001` | package/authoring integrity | **Pass** — 140/140 pre/post files, zero byte changes | `api-rev-002-app-hash-parity.log`, pre/post JSON |
| `APIE2E-SECRETS-001` | evidence secret hygiene | **Pass** — 12 sensitive values checked against evidence, zero exact-value matches | `api-rev-002-secret-scan.log` |

The two initial Nested Classroom attempts paused at tool approval because the temporary harness omitted the UI's Auto approve selection. They were terminated through the public API and retained as harness/preflight evidence; the corrected public journey enabled the supported option and passed. The original standalone script also retained an obsolete literal readiness assertion; its semantic observations already showed two messages and `x=7`, and the corrected same-data verifier passed. These are temporary harness issues, not product failures.

## Confidence Scorecard

| Category | Final | Evidence / Residual |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 97% | corrected exact paths plus every critical live scenario; no live Claude invocation |
| Changed-boundary execution directness | 98% | direct construction/session/lifecycle tests and real scoped provider/tool execution |
| Cross-boundary integration realism and mock gap | 98% | real dual hosts, providers, private recursive Team/task, browser, transport, worker and SQLite |
| Environment, configuration, identity and fixture fidelity | 95% | isolated roots and exact requested packages/models; bounded initial inherited-DB startup noted above |
| Failure, edge-case, lifecycle and recovery | 96% | durable cleanup/failure paths plus active close, same-data restart, inactive/offline histories and remount |
| User-surface, browser and desktop-shell confidence | 97% | real browser standalone/Studio/iframe/remount; shell-specific Electron packaging remains delivery-owned |
| Durable regression coverage quality and relevance | 94% | strong corrected/affected/retained matrices; full unisolated repository suite retains unrelated noisy debt |

- Overall final validation confidence: **96%** (rounded average).
- Critical acceptance criteria directly proven: **Yes**, for the API/E2E scope.
- Applicable category below 90%: **No**.
- Default clean target met: **Yes**.
- Broader validation: **Required / Completed**.

## Durable Coverage Changes

- Added by API/E2E: none.
- Updated by API/E2E: none.
- Removed by API/E2E: none.
- API/E2E temporary probes: browser/provider/private Team, route, history/restart, watcher and parity orchestration only; all temporary scripts/data were removed.
- Required proportional test-code review: return to `/code_reviewer`; expected disposition `Not Applicable` because API/E2E changed no durable test, while the cumulative upstream IR-003 test delta remains available in the reviewed package.

## Cleanup

| Resource | Result |
| --- | --- |
| ports `43551`, `43560`, `31560` | closed |
| owned Studio/standalone/Nuxt/devkit-watch/provider/worker processes | absent |
| isolated SQLite/data/browser fixture root | removed |
| temporary scripts and context file | removed |
| generated outputs absent at baseline | removed/restored absent |
| preexisting server `dist` | preserved |
| exact sensitive-value evidence scan | Pass |
| `git diff --check` | Pass |
| other roles' artifact package | preserved |

Evidence: `api-rev-002-final-cleanup.log`.

## Residual Risks And Scope Boundaries

1. Live Claude provider execution was not performed; current Claude session/manager durable coverage passed and backend integration tests remained environment-gated. This is bounded and not a missing critical acceptance criterion for the requested Codex/AutoByteus real matrix.
2. Electron preload/IPC/window packaging did not change and remains downstream delivery-owned; browser evidence covers the web-equivalent renderer surface.
3. The full unisolated repository characterization retains unrelated `Unclear` failures. They are reported transparently and neither suppressed nor attributed to this ticket.

## Latest Authoritative Result

- Result: **Pass**.
- Prior failure `APIE2E-F001`: **Resolved and confirmed**.
- Final confidence: **96%**.
- Broader validation: **Required / Completed**.
- Durable API/E2E test delta: **None**.
- Next recipient: `/code_reviewer` for the required proportional durable-test review (`Not Applicable` expected).
