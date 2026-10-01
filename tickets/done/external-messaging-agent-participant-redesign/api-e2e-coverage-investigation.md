# API/E2E Coverage Investigation — Remove External Messaging From The Main Product

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/requirements.md` (Approved, SR-014)
- Investigation Notes: `.../investigation-notes.md` (AE-01 to AE-22)
- Solution Revision Record: `.../solution-revision-record.md`
- Design Spec: `.../design-spec.md` (SR-016, Ready)
- Supplemental Task Artifacts: `.../product-model-analysis.md` (approved supplement), `.../solution-handoff.md`
- Design Review Report: `.../design-review-report.md` (ARCH-REV-002, Pass; N-3 validation obligations)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Implementation Handoff: `.../implementation-handoff.md` (IR-002)
- Implementation Revision Record: `.../implementation-revision-record.md`
- Code Review Report: `.../code-review-report.md` (CRR-002, Pass)
- Code Review Revision Record: `.../code-review-revision-record.md`
- Delivery Revision Record: `N/A — not applicable` (no delivery re-entry)
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `.../api-e2e-revision-record.md` (created after the first completed result)
- Current API/E2E Revision ID: `API-REV-002` (baseline `API-REV-001`)
- API/E2E Test-Case Ledger: `.../api-e2e-test-case-ledger.md`
- Current Investigation Round: `2`
- Trigger:
  - Round 1: `/code_reviewer` CRR-002 Pass on `e9bbb28ab` (N-3 obligations).
  - Round 2: `/code_reviewer` CRR-004 Pass on `40f769e0d`, after the CRR-003 failure-origin review confirmed CR-002 (= G-01, implementation) and IR-003 removed the tracked file.
- Prior Investigation Reviewed: round 1 (this document, `e9bbb28ab`)
- Latest Authoritative Investigation: this document (round 2)

All `.../` paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/`.

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` if this stage changes durable test code; otherwise `Not Applicable` (see Investigation Decision)

## Current Requirement And Design Basis

The approved change is a clean-cut removal of every external-channel and messaging-gateway component from the main product (REQ-101–REQ-103). It adds exactly two migrations: a startup app-data migration `20260924_remove_external_messaging_data` that deletes four roots with no backup and never blocks startup (REQ-114, QR-104, QR-105), and the Prisma migration `20260924120000_remove_external_channel_tables`, which drops the two orphan tables. Other approved outcomes:

- Settings loses Messaging, and the old deep link falls back to API Keys (REQ-118).
- Release and packaging lose all gateway steps, and the gateway leaves the pnpm workspace (REQ-117).
- MCP and skills are preserved (REQ-116), and historical runs stay viewable (REQ-119).
- The identifier gate is clean (REQ-120).
- The gateway self-contains its types and is not validated (REQ-121).

The design makes AC-102, AC-103 and the AC-119 real-run check one-time validation probes, recorded in this ticket folder, so no durable test keeps legacy identifiers. AC-114 is covered by the unit test plus an upgrade probe.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-101 Settings → Messaging | Removed | REQ-101/118, AC-116, DS-003 | Browser check at desktop width plus the `settings.spec.ts` fallback |
| BEH-102 Ingress + binding-driven runs | Removed | REQ-102, AC-102/103, DS-001/002 | Live API probes (404, remote rejection, introspection) plus a legacy-bindings startup probe |
| BEH-103 Output auto-publish / callback outbox | Removed | REQ-103, AC-102, DS-001/004 | Startup/shutdown with legacy data shows no gateway process; contract tests |
| BEH-106 Legacy data on disk and in the DB | Changed (discard) | REQ-114, AC-114, QR-104/105, DS-007 | Upgrade probe on real baseline-produced data, fault injection plus retry, and the unit test |
| BEH-107 Release/packaging/workspace | Removed | REQ-117, AC-117 | Frozen install, actionlint, diff review, script syntax, Docker decision |
| BEH-108 MCP/skills | Preserved | REQ-116, AC-118 | Existing MCP tests plus a live stdio MCP with an env token across the three runtimes |
| BEH-109 Historical runs | Preserved | REQ-119, AC-119, DS-005 | A real binding-started run produced by the baseline build, viewed after upgrade via GraphQL and the browser |
| REQ-120 identifier gate | Added gate | AC-120 | Scripted content gate plus a path-level check |
| REQ-121 gateway self-containment | Changed | AC-121 | Static inspection |
| DS-004 `EXTERNAL_USER_MESSAGE` stream member | Removed | Design DS-004 | Contract, server and web streaming tests |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Cleanup migration, registry, historical migration edits, config helpers | Unit tests (8-case cleanup, migration tests) | Real config-derived roots, real runner ordering, real DB | Lifecycle (real server start) |
| API / transport / contract | Yes | REST routes, GraphQL schema, route policy, stream contracts | Route-policy unit, contract tests | Real Fastify 404, real remote classification, real schema | Live API |
| Frontend component / state | Yes | `settings.vue`, streaming handlers | Web specs | Rendered layout at desktop width | Browser |
| Browser integration / user journey | Yes | Settings nav, deep link, run-history view | Implementation narrow-viewport check only | Desktop width; historical run rendering | Browser |
| Authentication / session / permissions | Yes | `EXTERNAL_SIGNATURE` route class removed; old paths fall into the default protected family | Route-policy unit | Real remote unauthenticated request | Live API (non-loopback source) |
| Desktop renderer / web-equivalent UI | Yes (renderer = Nuxt web) | Same as browser | Web specs | Same as browser | Browser (web-equivalent) |
| Desktop shell / Electron-specific | No | No Electron shell, preload or IPC change (escalation-trigger check: no packaging expects gateway assets) | Electron vitest (implementation) | — | None |
| Process / lifecycle | Yes | Startup no longer restores gateway or channel runtimes; shutdown chain | Server-runtime gate unit | Real startup with legacy bindings; no child gateway process | Lifecycle |
| Persisted-data transition | Yes | Four roots deleted; two tables dropped; run memory with `externalSource` used directly | Unit test; implementation smoke with synthetic roots | Real baseline-produced data (DB with orphan tables, real bindings/receipts, real binding-run memory) | Lifecycle upgrade |
| Worker / queue / distributed coordination | Yes (removed) | Callback outbox worker and output delivery runtime removed | — | That no worker is started | Lifecycle (process/log check) |
| External integration | Yes | Gateway process supervision removed; MCP preserved | MCP unit/integration | Live MCP tool use on the native/Codex/Claude runtimes | Live API + runtime |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign` (branch `codex/external-messaging-agent-participant-redesign`, HEAD `e9bbb28ab`)
- Project type: pnpm monorepo. Node 22 (`v22.23.1`), pnpm 10.28. Server: Fastify + Mercurius GraphQL + Prisma SQLite. Web: Nuxt 3 + Electron shell. Library: `autobyteus-ts`.
- Conflicting, missing, or unclear instructions: `pnpm dev` uses fixed ports 8000/3000 and a repo-local data root. Those ports are free, but the user's AutoByteus app is running (PIDs 29463/30067 on 29695/50106/50124), so explicit free ports and temp data dirs are used instead. `release:test` dispatches a GitHub workflow on a pushed ref (`gh workflow run`), which is infeasible for this local-only branch.
- **Environment safety finding:** the agent shell inherits the user's running-app environment: `AUTOBYTEUS_DATA_DIR`, `AUTOBYTEUS_MEMORY_DIR` (the real `~/.autobyteus/server-data`), `DATABASE_URL`, `APP_ENV`, `DB_TYPE`, `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL`, and provider keys. `AppConfig.get()` prefers `process.env`. Every server, test and build command in this validation therefore runs through the scrubbed wrapper `api-e2e-evidence/scripts/cleanenv.sh` (`env -i` with only HOME/USER/PATH/TMPDIR/LANG). The real data dir is only ever read, never used as a server data dir.
- Required secrets: `N/A` for most cases. AC-118 live runtime cases use the locally logged-in Codex CLI (ChatGPT) and Claude CLI (claude.ai). The native runtime needs an LLM provider (see the L-07 plan). No secret values are recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `README.md` (root) "Local full-stack development", "Testing (Codex Runtime)" | Canonical dev/test paths | `pnpm dev` (built backend + Nuxt dev); `pnpm test:e2e`; `RUN_CODEX_E2E=1` for live Codex suites |
| `scripts/development/{run-dev,development-runtime}.mjs` | Dev launcher | The frontend needs `BACKEND_NODE_BASE_URL` and the `BACKEND_*_WS_ENDPOINT` env; the backend is `node dist/app.js` with a data dir holding `.env` |
| `autobyteus-server-ts/AGENTS.md` | Server tests | `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch` |
| `autobyteus-web/AGENTS.md` | Web tests, git hygiene | `pnpm test:nuxt <path> --run`; never `git add -A` |
| `autobyteus-server-ts/src/app.ts`, `src/config/app-config.ts` | Server CLI/config | `--host/--port/--data-dir`; `<dataDir>/.env` is required; DB defaults to `<dataDir>/db/<env>.db`; process env wins |
| `autobyteus-server-ts/tests/setup/prisma-env.ts` | Test DB isolation | Tests force `DATABASE_URL` to `tests/.tmp`, but memory/data env still leaks (hence the scrubbed wrapper) |
| `implementation-handoff.md` "Environment Or Dependency Notes" | Known prerequisites | Web needs `npx nuxi prepare`; the startup-migration e2e needs a built server `dist/` |
| `scripts/desktop-release.sh` | `release:test` | `gh workflow run release-desktop.yml --ref <ref>` → requires a pushed ref |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Candidate server (e9bbb28ab) | `autobyteus-server-ts` | `cleanenv.sh -- node dist/app.js --host 0.0.0.0 --port <free> --data-dir <tmp>` | Free port; temp data dir with `.env` | `GET /rest/health` 200 plus a log line | SIGTERM on the owned PID |
| Baseline server (40b1783f4) | owned detached worktree `…/autobyteus-worktrees/emr-api-e2e-baseline` | same as above | Produces real legacy data | same | SIGTERM; `git worktree remove` |
| Nuxt dev frontend | `autobyteus-web` | `cleanenv.sh BACKEND_*=… -- pnpm exec nuxi dev --port <free>` | Web-equivalent renderer | HTTP 200 on `/` | SIGTERM |
| Browser | agent browser tab | `open_tab` | Desktop-width viewport check | DOM snapshot | `close_tab` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Legacy data dir with all four roots, orphan tables, bindings and a binding-started run | Baseline server + baseline GraphQL `upsertExternalChannelBinding` + loopback ingress POST (unsigned; no secret configured) + seeded gateway roots with a fake token | Temp dir under `/private/tmp/emr-e2e`; no real data touched; fake token only | A small redacted fixture copy is kept in `api-e2e-evidence/`; temp dirs are removed |
| Real binding-started run from `~/.autobyteus` | Read-only inspection | The receipt-listed binding runs have empty memory folders (0 B) | Not usable → the baseline-produced run is used (the design allows a copied fixture) |
| Stdio MCP server with an env token | Small temp Node MCP server script (`@modelcontextprotocol/sdk` from the workspace) | Token is a fake value; the tool echoes whether the token is present | Script kept as evidence; config removed with the temp dir |

## Persisted Data Transition Coverage Basis

- Approved decision: A: `Discard or Rebuild` (discard four roots); B: `Discard or Rebuild` (drop tables via Prisma); C: `Directly Usable — No Migration` (run memory carrying `metadata.externalSource`).
- References: design-spec "Persisted Data / State Transition Decision" A/B/C; implementation-handoff "Persisted Data Transition Check".
- Representative existing-data setup: the real baseline build (`40b1783f4`) creates the DB, including the orphan tables through its historical Prisma migrations. It also creates a real binding and a real binding-started run via its own ingress. The four roots are seeded with realistic content, including `config/provider-config.json` with a fake bot token and `gateway.env`, plus a sibling `extensions/voice-input`.
- Evidence planned:
  - A: roots absent after startup; sibling kept; no token file remains (QR-104); migration record SUCCEEDED 4/4.
  - B: `sqlite_master` has no `channel_message_receipts`/`channel_delivery_events` after upgrade, and `_prisma_migrations` shows `20260924120000` applied.
  - C: the binding-started run lists and opens, and its user message projects as an ordinary user message.
  - QR-105: one root made undeletable → FAILED record, startup continues; after the fault is removed and the server restarted → SUCCEEDED (retry).
- Migration-specific completion/recovery: `N/A` (not `Migration Required`). The FAILED→retry behavior is still checked because QR-105 requires it.
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `server/tests/unit/app-data-migrations/remove-external-messaging-data-migration.test.ts` | 8 cases: all present, missing, sibling untouched, rm error, inspect error, symlink, retry | REQ-114, DS-007 | Still Valid | Design guidance lists these cases | Run |
| `server/tests/unit/remote-access/route-policy.test.ts` | Ingress cases removed; default family | AC-102, DS-002 | Still Valid | Design: removal without replacement | Run |
| `server/tests/unit/run-history/projection/local-memory-run-view-projection-provider.test.ts` | Unknown extra metadata ignored (`legacySourceMetadata`) | REQ-119, AC-119 | Still Valid | Design verification gate | Run |
| `server/tests/unit/server-runtime-app-data-migration-gate.test.ts` | FAILED migrations do not block startup | QR-105 | Still Valid | — | Run |
| `server/tests/unit/app-data-migrations/{custom-provider-readable-id,remove-global-skill-discovery-mode}-*.test.ts` | Messaging branches removed | AE-10 | Still Valid | — | Run |
| `server/tests/unit/services/agent-streaming/*`, `standalone-application-host/*`, `agent-execution/standalone-agent-run-lifecycle-service.test.ts` | Streaming/lifecycle without messaging | DS-001/004 | Still Valid | — | Run |
| `server/tests/architecture/*` | Boundary tests | REQ-101 | Still Valid | — | Run |
| `server/tests/e2e/runtime/skill-access-mode-graphql.e2e.test.ts`, `e2e/secret-management/custom-provider-readable-id-startup-migration.e2e.test.ts`, `e2e/remote-access/*`, `e2e/app-data-migrations/*` | Startup/GraphQL e2e | REQ-116, AC-114 support | Still Valid | — | Run |
| Server MCP tests (`unit/agent-tools/mcp/*`, `unit/mcp-server-management/*`, `unit/agent-execution/backends/{claude,codex}/*mcp*`, `integration/agent-tools/mcp/*`, `integration/mcp-server-management/*`, `integration/agent-team-execution/team-agent-tools-mcp-lifecycle`) | MCP config, discovery, materialization | REQ-116, AC-118 | Still Valid | Unchanged modules | Run |
| `autobyteus-ts/tests/{unit,integration}/tools/mcp/*` (incl. `stdio-managed-mcp-server`) | MCP client layer | REQ-116 | Still Valid | — | Run |
| `autobyteus-ts/tests/unit/agent/message/*`, `tests/integration/public-surface/*` | External-source parser removed | REQ-101 | Still Valid | — | Run |
| Contracts `autobyteus-{agent-presentation,team-stream}-contracts` tests | Unions without the member | DS-004 | Still Valid | — | Run |
| `web/pages/__tests__/settings.spec.ts` | No Messaging; unknown-section fallback | AC-116 | Still Valid | — | Run |
| Web streaming specs (`services/agentStreaming/**`), MCP component specs (`components/tools/__tests__/Mcp*`, `toolManagementStore.mcpGateway`) | Streaming/MCP UI | DS-004, REQ-116 | Still Valid | — | Run |
| Deleted messaging tests (server `unit/external-channel/**`, `unit/managed-capabilities/**`, `integration/external-channel/**`, `e2e/messaging/**`, `e2e/external-channel/**`, channel-ingress/verify-signature/server-runtime-endpoints tests, web messaging specs) | Asserted removed behavior | REQ-101 | Stale / Remove (already removed by implementation) | Design removal plan | Confirm there is no remaining reference |
| Gateway `autobyteus-message-gateway/tests/**` | Gateway behavior | REQ-121 | Out Of Scope | REQ-121: gateway not validated | Not run |

## Stale Or Obsolete Coverage Decisions

The implementation already removed all obsolete messaging tests (design removal plan, confirmed by CRR-001/002). This stage adds no further removal.

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Route-policy ingress/`EXTERNAL_SIGNATURE` cases (removed by implementation) | Ingress paths allowed without auth | Routes and class removed | Design "Verification Gate" | One-time live AC-102 probe (this stage) | A durable test would keep legacy route strings (REQ-120) |

## Durable Coverage To Add

None planned. The design explicitly places AC-102, AC-103 and the real-run AC-119 in one-time validation probes, to keep legacy identifiers out of durable tests (REQ-120). AC-114 has the durable unit test. The Prisma drop is plain `DROP TABLE IF EXISTS` DDL, proven here against a real baseline-created DB; a durable test would only preserve a one-time upgrade fixture. This will be revisited if execution exposes a gap.

## Durable Coverage To Update

None planned.

## Durable Coverage To Remove

None planned.

## Repository Coverage Execution Plan And Results

All commands run through `cleanenv.sh`. Results are filled after execution; see the ledger for per-case evidence.

All "pre-existing" failures below were rechecked on an owned detached baseline worktree at `40b1783f4` and matched by normalized FAIL-line diff. Details are in the ledger.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| R-01 | Contracts tests | `pnpm --filter @autobyteus/agent-presentation-contracts --filter @autobyteus/team-stream-contracts test` | DS-004 | Pass (1 + 2; tracked `dist/` unchanged) | `logs/R-01-contracts.log` |
| R-02 | autobyteus-ts build + `tests/unit/agent/message`, `tests/integration/public-surface`, `tests/unit/tools/mcp`, `tests/integration/tools/mcp` | `autobyteus-ts` | REQ-101, REQ-116 | Pass (107 tests). 4 MCP integration files depend on a toy-server folder absent in every checkout (environmental, unchanged code) → live stdio proof moved to L-07 | `logs/R-02-*.log` |
| R-03 | Server changed unit + architecture tests | `autobyteus-server-ts` | REQ-114, AC-102, AC-119, DS-001/004 | Pass (566 tests; 23 pre-existing failures identical on baseline) | `logs/R-03-*.log` |
| R-04 | Server MCP/skills unit + integration tests | `autobyteus-server-ts` | REQ-116, AC-118 | Pass (172 tests; 1 pre-existing failure identical on baseline) | `logs/R-04-*.log` |
| R-05 | Server full `tests/unit tests/architecture` + full `tests/integration` | `autobyteus-server-ts` | Regression | Pass (failing sets identical on baseline: 56 unit, 47 integration FAIL lines) | `logs/R-05-*` |
| R-06 | Server build + full `tests/e2e` | `autobyteus-server-ts` | Startup/GraphQL e2e | Pass (38/40 failing lines identical on baseline; 2 `token-usage-analytics` lines are a pre-existing order dependence reproduced on baseline) | `logs/R-06-*` |
| R-07 | Web guards + full `test:nuxt` + electron vitest | `autobyteus-web` | AC-116, DS-004, REQ-116 UI | Pass (guards pass; 5 failing files identical on baseline, including the same 14 font-size offenders) | `logs/R-07-*` |
| R-08 | Clean-worktree `pnpm install --frozen-lockfile`; lockfile checks; actionlint and shellcheck baseline vs candidate; workflow diff review; local `release --no-push` dry run in an isolated clone | root | AC-117 | Pass | `logs/R-08-*` |
| R-09 | REQ-120 content gate + path-level check + supplementary residue; AC-121 static inspection | root | AC-120, AC-121 | Content gate clean; AC-121 Pass; **path gate: 1 hit → G-01** | `logs/R-09-*` |

## Test-Case Ledger Plan

- Ledger required: `Yes`. There are 17 independently meaningful cases, several long-running (full suites, baseline build, Docker), and a credible context-compression risk.
- Canonical ledger path: `.../api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Case granularity: one scenario, journey, lifecycle check or probe per case. G-01 (the path-level residue probe) was added during execution.

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Evidence Expected |
| --- | --- | --- | --- | --- | --- | --- |
| R-01…R-09 | Repository checks (above) | see above | Repository | see above | 1–9 | Command output |
| L-01 | Produce real legacy data with the baseline build | AC-114/103/119 setup | Baseline server + GraphQL + ingress | Owned baseline worktree | 10 | Fixture inventory, DB tables, binding-run memory |
| L-02 | Upgrade start on legacy data | AC-114, AC-103, QR-104, REQ-102/103 | Lifecycle | Candidate server on a copy | 11 | Roots gone, tables dropped, record, health, no run effect, no gateway process |
| L-03 | Old API surface probes | AC-102 | Live API | curl loopback/LAN, GraphQL introspection | 12 | HTTP codes, introspection dump |
| L-04 | Fault injection + retry | QR-105, AC-114 alternate | Lifecycle | chmod fault → start → restore → restart | 13 | FAILED record + health 200 → SUCCEEDED |
| L-05 | Historical binding run viewable | AC-119, REQ-119 | Live GraphQL + browser | Run history/projection queries + web UI | 14 | Projection JSON, DOM |
| L-06 | Settings at desktop width + deep link | AC-116, REQ-118 | Browser | Nuxt dev + candidate server | 15 | DOM + screenshot |
| L-07 | Live stdio MCP with env token: configure, discover, assign; runtime use | AC-118, REQ-116 | Live API + runtimes | GraphQL + native/Codex/Claude runs | 16 | Tool list, run traces |
| L-08 | Docker all-in-one decision probe | AC-117 | Docker build | Candidate build (baseline gap noted); optional temp COPY patch | 17 | Build log |

## Post-Repository Confidence Scorecard (Mandatory)

Scored after R-01…R-09, before any live execution.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | AC-121 static and the AC-120 content gate proven; unit/spec coverage for AC-114 (cleanup), AC-116 (fallback spec), AC-119 (generic-key projection) | AC-102/103 and the AC-114 upgrade, AC-116 desktop render, AC-118 live and AC-119 real run are unproven by repository tests; the G-01 path hit is open | Live probes L-01…L-07 |
| Changed-boundary execution directness | 75% | Real Fastify routes and real migration code are exercised by unit/integration tests with temp dirs | No real startup against real legacy data; no real HTTP 404/remote probes | L-02/L-03 |
| Cross-boundary integration realism and mock gap | 70% | Integration suites run the real runner and Prisma test DB | Legacy data is synthetic; orphan tables not created by real historical migrations; MCP runtime bridges only unit-tested | Baseline-produced legacy data (L-01); live runtimes (L-07) |
| Environment, configuration, identity, and fixture fidelity | 80% | Scrubbed environment; frozen install in a clean worktree; baseline comparison for every failure | Config-derived roots (`getAppDataDir/getDownloadDir/getLogsDir`) not exercised through the real registry | L-02 |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | Unit test covers rm error, symlink, retry; runner gate unit test | Real FAILED→retry on real startup unproven; no-restore on real startup unproven | L-04, L-02 |
| User-surface, browser, and desktop-shell confidence | 75% | `settings.spec.ts` fallback; electron vitest passes; no shell change | Desktop-width render and deep link not rendered; history view not rendered | L-05/L-06 browser |
| Durable regression coverage quality and relevance | 92% | Durable changes match the design (cleanup test, generic-key projection test, settings fallback); stale messaging tests removed with rationale | No durable guard against path-level residue (G-01) — design keeps identifier checks as one-time gates | — |

- Overall post-repository confidence: **78%** (simple average)
- Every critical acceptance criterion directly proven: `No`
- Any applicable category below `90%`: `Yes`. All except durable coverage.
- Default 95% target met: `No`
- Material residual risks: every N-3 live obligation; the G-01 path-level residue.

## Broader Validation Decision (Mandatory)

- Decision: `Required`. Pre-decided by N-3 and the High-risk persisted-data/lifecycle/API change, and confirmed by the 78% post-repository score. Executed as L-01…L-08 plus the G-01 probe; results in the execution report.
- Selected execution modes: `Lifecycle` (L-01, L-02, L-04), `Live API` (L-03, L-05, L-07), `Browser` (L-05, L-06), `Other` (Docker, L-08)
- Gaps addressed:
  - Real startup ordering with real config-derived roots and real baseline-created DB tables.
  - Real Fastify/remote-access classification.
  - Rendered Settings at desktop width.
  - Historical run rendering.
  - MCP behavior through the real composed server.
- Browser rationale: AC-116 is a rendered-UI criterion, and AC-119 includes viewing. Both are web-equivalent renderer behavior, so the browser is preferred over Electron.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping the Nuxt renderer (`autobyteus-web/electron`)
- Relevant instructions: `autobyteus-web/AGENTS.md`, root README "Packaged Electron API/E2E testing"
- Web-equivalent behavior: Settings nav/deep link; run-history view
- Shell-specific behavior: none changed. The escalation-trigger check found no packaging step expecting gateway assets, and Electron vitest passed during implementation.
- Chosen approach: browser against Nuxt dev plus the candidate server. Actual desktop execution is not needed.
- Effect on the running desktop app: `None`. Separate ports and data dirs; its process is never touched.

## Live Environment And Fixture Plan

- Startup order: (1) baseline server on a temp legacy data dir → produce the legacy state → stop; (2) copy the data dir; (3) candidate server on the copy; (4) Nuxt dev pointed at the candidate server; (5) browser.
- Environment: scrubbed env; `.env` in each temp data dir with `APP_ENV=production`, `DB_TYPE=sqlite`, and `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:<port>`.
- Health: `GET /rest/health`; log line `Server listening`.
- Owned processes and state to clean up: baseline/candidate server PIDs, Nuxt PID, browser tabs, `/private/tmp/emr-e2e/**`, owned baseline worktree.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| L-01/L-02/L-04 | Baseline-produced legacy data dir + candidate server start | Real upgrade | Requires the baseline build and legacy identifiers (REQ-120); one-time upgrade |
| L-03 | curl/GraphQL scripts | 404 / protected / introspection | Design: one-time probe; durable test would keep route strings |
| L-05 | Baseline binding-run fixture + GraphQL/browser | Historical run viewable | Durable generic-key test already exists |
| L-06 | Browser journey | Rendered nav | Settings spec is the durable layer |
| L-07 | Temp stdio MCP server + GraphQL + runtime runs | MCP unchanged end to end | Live LLM/runtime dependence |
| L-08 | Docker build | Packaging | Environment-heavy; release CI owns it |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| `release:test` GitHub dispatch | Needs a pushed ref; pushing is a delivery/user decision | GitHub-runner execution of the edited workflows is unproven | Covered by actionlint (0 findings), diff review, and a local `release --no-push` dry run of the edited script; delivery/release owns the live run |
| Gateway build/tests | REQ-121: not validated | — | None |
| A real binding-started run from `~/.autobyteus` | The receipt-listed binding runs' memory folders are empty (0 B) | Low: baseline-produced binding runs (agent + team) plus a legacy-metadata variant were used instead (the design allows a copied fixture) | None |
| Docker all-in-one as-is build | Pre-existing Dockerfile gap (fails identically on baseline) | The unpatched image cannot be built; gateway-free packaging was proven with a temp patch for the gap only | Separate ticket for the Dockerfile gap |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| **G-01** — the tracked file `autobyteus-server-ts/external-channel/gateway-callback-outbox.json` (the removed gateway-callback feature's empty outbox state, accidentally committed in `76bd9107d`) remains in the main product. It is the only path-level REQ-120 hit (identifier `external-channel`). The new cleanup migration deletes it whenever the server runs with the default app-data dir (= server package root), dirtying the repository (probe: `git status` → ` D …outbox.json`). | `Local Fix`. CRR-003 confirmed it as implementation defect CR-002; IR-003 removed the file (`40f769e0d`). **Resolved in round 2:** the path gate is empty, and a default-data-dir start leaves the tree clean with the binding root SKIPPED. | Round 1: `logs/R-09-req120-gate.log` [2], `G-01/default-data-dir-probe.txt`. Round 2: `logs/R-09-req120-gate-round2.log`, `G-01/default-data-dir-probe-round2.txt` | Resolved |
| Environment safety — the agent shell inherits the user's real `AUTOBYTEUS_DATA_DIR`/`AUTOBYTEUS_MEMORY_DIR`/`DATABASE_URL` | Not a product finding (environment note) | `env` names | Recorded for future validators |
| The Docker all-in-one Dockerfile never copies `autobyteus-agent-presentation-contracts`/`autobyteus-collaboration-stream-contracts` (pre-existing; identical failure on baseline) | Out of scope (separate ticket candidate) | `logs/L-08-docker-{asis,baseline-asis}.log` | Delivery / Solution Designer for a separate ticket |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (executed)
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`. The design keeps AC-102/103/119-real-run and the identifier gate as one-time probes. G-01 is fixed by deleting a stray tracked file, not by a test.
- Post-repository confidence: 78%. Final confidence: round 1 93.6% (G-01 failing AC-120); round 2 **95.3%** (G-01 resolved). See the execution report.
- Broader validation decision: `Required` (executed)
- Reroute Required: round 1 `Yes` (G-01), resolved; round 2 `No`
- Recommended Recipient: round 2 Pass → per `get_handoff_rules` (reviewed route, normally `/code_reviewer`; proportional test-code review `Not Applicable`, since no durable test changed)
- Notes: the environment-safety wrapper was used for every command. Round 2 rechecked only the R-09 gates and the G-01 probe, because the verified delta is exactly one deleted data file. All other round-1 evidence remains valid.
