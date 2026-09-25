# API/E2E Execution Coverage Report — Remove External Messaging From The Main Product

## Execution Round Meta

All `.../` paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/`.

- Requirements Doc: `.../requirements.md` (Approved, SR-014)
- Investigation Notes: `.../investigation-notes.md`
- Solution Revision Record: `.../solution-revision-record.md`
- Design Spec: `.../design-spec.md` (SR-016)
- Supplemental Task Artifacts: `.../product-model-analysis.md`, `.../solution-handoff.md`
- Design Review Report: `.../design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Implementation Handoff: `.../implementation-handoff.md` (IR-002)
- Implementation Revision Record: `.../implementation-revision-record.md`
- Code Review Report: `.../code-review-report.md` (CRR-002, Pass)
- Code Review Revision Record: `.../code-review-revision-record.md`
- Delivery Revision Record: `N/A — not applicable`
- Relevant Delivery Revision IDs: `N/A`
- Coverage Investigation: `.../api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `.../api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `.../api-e2e-revision-record.md`
- Evidence folder: `.../api-e2e-evidence/` (logs, scripts, fixture, per-case folders)
- Current API/E2E Revision ID: `API-REV-002` (baseline `API-REV-001`)
- Current Execution Round: `2`
- Trigger:
  - Round 1: `/code_reviewer` CRR-002 Pass on `e9bbb28ab` (N-3 obligations).
  - Round 2: `/code_reviewer` CRR-004 Pass on `40f769e0d`, after the CRR-003 failure-origin review confirmed G-01 as implementation defect CR-002 (plus a review-gate gap) and IR-003 removed the tracked file.
- Prior Round Reviewed: round 1 (`e9bbb28ab`, Fail on G-01, 93.6%)
- Latest Authoritative Round: `2`
- Commit validated: `40f769e0d` on `codex/external-messaging-agent-participant-redesign`.
  - Round 1 validated `e9bbb28ab`.
  - The verified delta `e9bbb28ab..40f769e0d` is exactly `D autobyteus-server-ts/external-channel/gateway-callback-outbox.json` (no source, test, config or ignore change), so the round-1 live evidence carries forward.
  - Base `40b1783f4` was used for every baseline comparison and for producing real legacy data.

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Applicable`. API/E2E changed no durable test in either round. Round 1 was `Fail` and went to failure-origin review; round 2 is `Pass`.

## Investigation And Execution Basis

- Coverage investigation completed before execution: `Yes`
- Investigation plan followed: `Yes`. Deviations:
  - (a) Added case G-01 after a discovery-time path-level observation.
  - (b) Desktop-width browser evidence used Playwright-core (1440×900), because the agent browser tab is fixed at 450 px.
  - (c) Docker builds dropped the `# syntax=docker/dockerfile:1` line in temp copies, because Docker Hub resolution hung (the frontend image was already local; build semantics unchanged).
  - (d) The real `~/.autobyteus` binding-run memory is empty, so baseline-produced binding runs were used (the design allows a copied fixture).
- Existing coverage decisions revised during execution: none. No durable coverage was added, updated or removed.
- Reroute required: round 1 `Yes` (G-01), resolved by IR-003; round 2 `No`
- Round-2 scope (agreed with `/code_reviewer` in CRR-004): verify the delta, then recheck the prior failure G-01 and the R-09 gates. A single deleted data file cannot affect the other executed scenarios.
- Environment-safety rule: every command ran through `api-e2e-evidence/scripts/cleanenv.sh` (`env -i`). The agent shell inherits the user's live-app `AUTOBYTEUS_DATA_DIR`/`AUTOBYTEUS_MEMORY_DIR`/`DATABASE_URL`, which `AppConfig` would prefer over the data dir `.env`. The user's real data was only read, never used as a server data dir.

## Test-Case Ledger Reconciliation

- Ledger path: `.../api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Long-running case checkpoints recorded: `Yes` (L-01 build, R-05 background run, L-05, L-08)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: sequence 26 (round-2 G-01 recheck Completed)
- Cases still running, interrupted, or not started: none

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| R-01 | Pass | #2 | `logs/R-01-contracts.log` | — |
| R-02 | Pass | #3 | `logs/R-02-*.log` | 4 environment-dependent MCP integration files (toy-server folder absent everywhere); live proof in L-07 |
| R-03 | Pass | #5 | `logs/R-03-*.log` | Pre-existing failures identical on baseline |
| R-04 | Pass | #6 | `logs/R-04-*.log` | Pre-existing failure identical on baseline |
| R-05 | Pass | #10 | `logs/R-05-*` | Identical failing sets on baseline |
| R-06 | Pass | #18 | `logs/R-06-*` | Pre-existing, including a reproduced order dependence |
| R-07 | Pass | #21 | `logs/R-07-*` | Identical failing set and details on baseline |
| R-08 | Pass | #20 | `logs/R-08-*` | `release:test` needs a pushed ref (not run) |
| R-09 | Pass (round 2) | #25 | `logs/R-09-req120-gate-round2.log` (round 1: `logs/R-09-req120-gate.log`) | Round 1 path gate hit → G-01; round 2 content + path gates clean |
| G-01 | Pass (round 2) | #26 | `G-01/default-data-dir-probe-round2.txt` (round 1: `G-01/default-data-dir-probe.txt`) | Round 1 Fail → CR-002 / IR-003 → resolved |
| L-01 | Pass | #9 | `fixture-legacy-baseline-40b1783f4/` | — |
| L-02 | Pass | #11 | `L-02-upgrade/` | — |
| L-03 | Pass | #12 | `L-03-api/` | — |
| L-04 | Pass | #16 | `L-04-fault/` | — |
| L-05 | Pass | #15 | `L-05-history/` | — |
| L-06 | Pass | #14 | `L-06-settings/` | — |
| L-07 | Pass | #17 | `L-07-mcp/` | — |
| L-08 | Pass (pre-existing gap recorded) | #24 | `logs/L-08-*` | Separate ticket candidate for the Dockerfile gap |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (round 2). Round 1 found one tracked legacy data artifact (G-01), which IR-003 removed. No runtime code path, stub route, alias, flag or shim was observed in either round. L-03 shows plain 404/default policy, and the introspection has 0 messaging fields.
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: round 1 `Local Fix` (G-01 → CR-002, resolved in IR-003)
- Upstream recipient notified: round 1 `/code_reviewer` (failure-origin review; delivery confirmed)

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| L-02 | AC-114, AC-103, QR-104, REQ-102/103 | Startup, Prisma migration, cleanup migration, run lifecycle | Candidate server on a real baseline-produced data dir | Live | Pass | `L-02-upgrade/*`, `logs/L-02-*` |
| L-03 | AC-102 | REST routes, remote-access policy, GraphQL schema | curl (loopback + verified non-loopback), baseline contrast, introspection | Live | Pass | `L-03-api/*` |
| L-04 | QR-105, AC-114 alternate | Migration runner FAILED/retry | Fault injection (`chflags uchg`) + 4 starts | Live | Pass | `L-04-fault/*` |
| L-05 | AC-119, REQ-119 | Run-history projection + web view | GraphQL + browser (450 px tab + 1440 px Playwright) | Live/Browser | Pass | `L-05-history/*` |
| L-06 | AC-116, REQ-118 | Settings nav + deep link | Browser at 1440×900 | Browser | Pass | `L-06-settings/*` |
| L-07 | AC-118, REQ-116 | MCP config/discovery/assignment + native/Codex/Claude tool use | GraphQL + WebSocket + real stdio MCP process | Live | Pass | `L-07-mcp/*` |
| R-08, L-08 | AC-117, REQ-117 | Workspace/lockfile/workflows/scripts/Docker | Clean frozen install, actionlint, shellcheck, local release dry run, Docker build + container | Temporary/Live | Pass (pre-existing Docker gap out of scope) | `logs/R-08-*`, `logs/L-08-*` |
| R-09 | AC-120 (content + path), AC-121 | Repo content | Scripted gates | Temporary | Pass (round 2: content = allowed registry lines only; path gate empty) | `logs/R-09-req120-gate-round2.log` |
| G-01 | AC-120 (path), REQ-101/120, legacy policy | Tracked residue + new cleanup migration | Default-data-dir start probe | Live | Pass (round 2: no tracked change; binding root SKIPPED). Round 1 was Fail. | `G-01/default-data-dir-probe-round2.txt` |
| R-01…R-07 | REQ-101/114/116/119/120 (suites pass) | All changed packages | Repository suites + baseline comparison | Durable | Pass (no regression) | `logs/R-0*` |

## Additional Repository Coverage Execution

No commands beyond the investigation's table. R-06 added two diagnostic reruns (isolated file, and the file pair on both worktrees), recorded in ledger #18.

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 97% (round 1: 85%) | +22 | AC-102, 103, 114, 116, 117, 118, 119 and 121 directly proven live (round 1). AC-120 content + path gates clean and G-01 resolved (round 2). | `release:test` GitHub dispatch not exercised (covered by static and local dry-run evidence) |
| Changed-boundary execution directness | 75% | 97% | +22 | Real startup, real HTTP 404/401 including non-loopback, real schema, real browser, real runtimes, real image | GitHub runner execution of the workflows |
| Cross-boundary integration realism and mock gap | 70% | 96% | +26 | Legacy state produced by the real baseline build via its own GraphQL and signed-ingress path (real bindings, real LLM replies, real orphan tables); live Codex/Claude/native MCP use | The owner's own Telegram history was unusable (empty folders), so a baseline-produced equivalent was used |
| Environment, configuration, identity, and fixture fidelity | 80% | 93% | +13 | Config-derived roots via the real registry; scrubbed env; clean-room frozen install; isolated release dry run | `release:test` needs a pushed ref; the Docker proof needed a temp patch for a pre-existing gap |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 97% | +17 | FAILED → FAILED → SUCCEEDED → skipped across 4 real starts; siblings/symlink-free scope; no restore; graceful shutdown | Negligible |
| User-surface, browser, and desktop-shell confidence | 75% | 95% | +20 | Desktop-width Settings + deep link; history view at both widths; 0 page errors; no Electron-shell change (Electron vitest pass) | Electron shell not launched (not needed: no shell change) |
| Durable regression coverage quality and relevance | 92% | 92% | 0 | Durable changes match the design; suites show no regression versus baseline | No durable guard for path-level residue (design keeps identifier gates one-time) |

- Overall post-repository confidence: 78%
- Overall final confidence: **95.3%** (round 2; simple average of 97, 97, 96, 93, 97, 95, 92). Round 1 was 93.6% with G-01 open.
- Confidence change: +15.6 points from broader validation (round 1); +1.7 from the G-01 resolution (round 2)
- Every critical acceptance criterion directly proven: `Yes` (round 2)
- Any final applicable category below 90%: `No`
- Default final confidence target of 95% met: `Yes`
- Confidence-limiting residual risks: `release:test` not exercised on GitHub (needs a pushed ref); pre-existing Docker all-in-one gap (proven gateway-free with a temp patch).

## Broader Validation Decision And Execution

- Decision and mode: `Required`. Lifecycle (L-01/02/04, G-01), Live API (L-03/05/07), Browser (L-05/06), Other: Docker (L-08).
- Material deviations: Playwright-core for desktop width; the Docker syntax line; the baseline-produced fixture (see Investigation And Execution Basis).
- Gaps addressed: every N-3 obligation, plus a path-level residue check.
- Startup and readiness:
  - Baseline server `:18731` (legacy data production), then candidate `:18741` (0.0.0.0) on a copy.
  - Nuxt dev `:18751`, with `BACKEND_*` set to `:18741`.
  - Fault/idempotence candidate `:18761`.
  - Default-data-dir probe `:18771`.
  - Docker container `127.0.0.1:18781/18782`.
  - Readiness was confirmed by `GET /rest/health` → 200 and the "Server listening" log line.
- Environment choices: scrubbed env; per-dir `.env` (`APP_ENV=production`, `DB_TYPE=sqlite`, no `DATABASE_URL`, so the DB lives in the data dir); explicit free ports; the user's running app (29695/50106/50124) untouched.
- Seed data and identities:
  - Baseline GraphQL: OpenAI key (from the environment, saved into the temp vault only), agent `telegram-helper`, team `classroom-relay`, 2 Telegram bindings, fake Telegram bot token.
  - 3 loopback ingress messages.
  - One seeded row per orphan table.
  - Seeded gateway roots/sibling folders.
  - Derived variant run with `metadata.externalSource`.
  - Codex/Claude via the locally logged-in CLIs.
  - A fake MCP env token.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Upgrade start on legacy data (L-02) | Roots deleted, tables dropped, server up, no run effect, no gateway | Record SUCCEEDED 4/4; 4 roots gone, siblings kept; 11 removed files all under the roots; tables absent; `20260924120000` applied; indexes byte-identical; 3 runs listed `isActive=false`; no child/gateway process; no token; no backup | `L-02-upgrade/*` | Pass |
| Old ingress POST, loopback (L-03) | 404 | 404 `Route POST:/rest/api/channel-ingress/v1/messages not found` (same for `delivery-events`) | `L-03-api/http-probes.txt` | Pass |
| Old ingress POST, non-loopback (L-03) | Default protected treatment | No credential → 404 (same as unknown path); invalid mobile credential → 401 `REMOTE_ACCESS_AUTH_INVALID` (same as `/graphql`). Baseline contrast: 202 accepted, even with an invalid credential | `L-03-api/remote-probes-*` | Pass |
| GraphQL introspection (L-03) | No messaging types/fields | 270 types, 0 hits | `L-03-api/graphql-introspection-candidate.json` | Pass |
| Fault injection (L-04) | FAILED, startup continues, retry later | #1 FAILED (3 migrated, EPERM item) + WARN + listening; #2 FAILED attempts 2; #3 SUCCEEDED attempts 3; #4 not re-run | `L-04-fault/*` | Pass |
| Historical binding runs (L-05) | Open as ordinary user/assistant | Agent, team and variant runs render You/assistant turns; "Offline"; no metadata visible; projection items keyed only `content/kind/media/role/ts` | `L-05-history/*` | Pass |
| Settings at 1440 px (L-06) | No Messaging; deep link valid | 12 entries, no gap, API Keys active on both `/settings` and `?section=messaging` | `L-06-settings/*` | Pass |
| MCP across runtimes (L-07) | Configure, discover, assign; tool used on each runtime | autobyteus/codex/claude each returned `TOKEN_PRESENT=true TOKEN_SHA8=abf32337 NONCE=<runtime nonce>`; MCP processes children of the candidate server | `L-07-mcp/*` | Pass |
| Docker (L-08) | Gateway-free packaging | As-is fails at a pre-existing step identical to baseline. With the gap temp-patched: image builds; server+web RUNNING; no gateway program/files/process/port; health ok; ingress 404 | `logs/L-08-*` | Pass (gap out of scope) |
| Default-data-dir start (G-01), round 1 on `e9bbb28ab` | No tracked repository file deleted; no residue | ` D autobyteus-server-ts/external-channel/gateway-callback-outbox.json` | `G-01/default-data-dir-probe.txt` | Fail (round 1) |
| Default-data-dir start (G-01), round 2 on `40f769e0d` | Same | No tracked change; record SUCCEEDED "migrated 0; skipped 4"; binding root `SKIPPED` "Not present." | `G-01/default-data-dir-probe-round2.txt` | **Pass** |

## Desktop Application Validation

- Approach: web-equivalent renderer in the browser (Nuxt dev + candidate server). No Electron launch; shell behavior is unchanged and Electron vitest passed (33 files).
- Browser-tested behavior: AC-116 Settings nav/deep link; AC-119 run-history view.
- Shell-specific behavior: none changed (escalation-trigger check: no packaging expects gateway assets).
- Effect on the running desktop application: `None`. Separate ports and data dirs; its processes (29463/30067 and its runtime children) were untouched.
- Not directly proven: none material.

## Platform / Runtime Targets

- OS: macOS (Darwin 25.5.0, arm64). Docker Desktop (linux/aarch64 container).
- Node v22.23.1, pnpm 10.28.x (10.28.2 in install). Candidate `e9bbb28ab`, baseline `40b1783f4`.
- Browser: Chromium (Playwright-core 1.58.2 cached build) at 1440×900; agent browser tab at 450×738, DPR 2.
- Runtimes: autobyteus (OpenAI `gpt-5.4-mini`), codex_app_server (`gpt-5.5`), claude_agent_sdk (`haiku`).

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved decision: A discard (four roots), B drop (Prisma), C directly usable (run memory).
- Representative data: produced by the real baseline build (DB with its historical channel migrations, real bindings/receipts/outbox, real binding-started agent and team runs), plus seeded gateway runtime/config/env/download/log content and non-messaging siblings.
- Results:
  - A: deleted, no backup, siblings kept, no token left (L-02).
  - B: tables dropped and the migration recorded (L-02).
  - C: runs list and open unchanged, including an injected `externalSource` variant (L-05).
  - FAILED→retry→SUCCEEDED→skip across real starts (L-04).
- Observation: baseline never persisted `externalSource` to raw traces (native recorder, and the Codex/Claude `recordForwardedUserMessage`), so real binding history is plain user/assistant traces. The design's C premise is conservative and still satisfied.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual persisted-data risk: none. Round 1's G-01 (a tracked file at `<package root>/external-channel`) was removed in IR-003, and round 2 shows a default-data-dir start with no tracked change.

## Tests Implemented Or Updated

None (no durable coverage change this round).

## Tests Removed As Stale Or Obsolete

None by API/E2E. The implementation already removed the obsolete messaging tests (CRR-001/002 confirmed).

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`
- Paths added or updated: none
- Paths removed: none
- Attached for proportional test-code review: `Not Applicable`

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `api-e2e-evidence/fixture-legacy-baseline-40b1783f4/` | Baseline-produced legacy fixture (bindings, receipts, outbox, memory incl. variant; DB table lists; redacted provider-config) | Retained (ticket folder, REQ-120 allowed set 2) | Token redacted; the DB binary is not kept |
| `api-e2e-evidence/logs/` | All command logs and baseline rechecks | Retained | — |
| `api-e2e-evidence/L-0*/`, `G-01/` | Per-case evidence (JSON, screenshots, probe outputs) | Retained | — |
| `api-e2e-evidence/scripts/` | `cleanenv.sh`, `req120-gate.sh`, `gql.mjs`, `remote-probes.sh`, `start-stop.sh`, `token-echo-mcp-server.mjs`, `mcp-runtime-probe.mjs`, `settings-desktop-probe.mjs`, `history-desktop-probe.mjs` | Retained as evidence; they reference removed `/private/tmp` paths | Reusable for the rerun after the G-01 fix |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| Owned baseline worktree `…/autobyteus-worktrees/emr-api-e2e-baseline` (`40b1783f4`) | Real legacy data; baseline failure comparisons; Docker contrast | L-01, R-0x rechecks, L-08(C) | Removed (`git worktree remove`) |
| Clean worktree `…/emr-api-e2e-frozen-install` (`e9bbb28ab`) | Clean-room frozen install; Docker build context | R-08, L-08 | Removed |
| Isolated clone `/private/tmp/emr-e2e/release-clone` | Local `release --no-push` dry run without touching shared refs | R-08 | Removed; the shared repo has no `v9.9.9` |
| Temp data dirs `/private/tmp/emr-e2e/{legacy-src,legacy-pristine,upgrade-a,upgrade-fault,baseline-scratch,ws-*,mcp}` | Isolated server data | L-01…L-07 | Removed |
| Temp Dockerfiles (no-syntax; temp-patched) | Offline frontend; pre-existing gap patch | L-08 | Removed (the patch diff is kept in `logs/L-08-temp-patch.diff`) |
| Docker image `emr-api-e2e-allinone:candidate-temp-patched`, container `emr-api-e2e-allinone-probe` | Runtime packaging check | L-08 | Removed |
| Temporary `autobyteus-server-ts/.env` + probe DB/logs in the assigned worktree | G-01 default-data-dir probe | G-01 | Removed; tracked file restored with `git checkout` |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Messaging gateway / Telegram | Loopback ingress POSTs to the baseline server imitate the gateway's unsigned forward (no secret configured) | The gateway is out of scope (REQ-121), and real Telegram is not needed to produce legacy state | None for the upgrade proof |
| Installed gateway runtime/download/logs | Seeded placeholder files in the real root layout | Enabling the managed gateway would download ~GBs | None (the cleanup is path-based) |
| Messaging MCP server | Temp stdio MCP server with a fake env token | No messaging MCP exists yet (DEC-108) | None (the generic MCP path is what AC-118 requires) |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | R-01…R-08, L-01…L-08 | Every N-3 obligation proven live (round 1; valid for `40f769e0d`, since the delta is one deleted data file). There are no regressions versus baseline in any suite. |
| Pass | R-09 (round 2) | AC-120 content + path gates clean; AC-121 proven |
| Pass | G-01 (round 2) | Prior failure resolved: file removed (IR-003); default-data-dir start leaves the tree clean |
| Out Of Scope | — | Gateway build/tests (REQ-121); the pre-existing Docker Dockerfile gap; `release:test` GitHub dispatch (needs a pushed ref) |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Servers :18731/:18741/:18761/:18771, Nuxt :18751 | Owned | SIGTERM (graceful) | All ports free; no orphan MCP/PTY/runtime processes from these servers |
| Browser tab `1fee66` | Owned | `close_tab` | Closed |
| Docker container + image | Owned | `docker rm -f`, `docker rmi` | Removed. Shared build cache and other images untouched. |
| Worktrees `emr-api-e2e-baseline`, `emr-api-e2e-frozen-install` | Owned | `git worktree remove --force` + prune | Removed |
| `/private/tmp/emr-e2e/**` | Owned | `rm -rf` | Removed |
| Assigned worktree probe artifacts (`.env`, `db/production.db*`, `logs/*`, index backup, empty `llm/`, `workspaces.json`) | Owned | Removed; tracked file restored | `git status` = only the pre-existing untracked SDK `dist/` + ticket folder; HEAD `e9bbb28ab` |
| User's AutoByteus app, `~/.autobyteus` | Not owned | Read-only inspection only | Untouched |
| Round 2: temporary `autobyteus-server-ts/.env`, probe DB/logs/index backups/empty `llm/`, server :18771, `/private/tmp/emr-e2e` | Owned | Graceful stop; removed against a pre-probe snapshot | Package root, `db/`, `logs/` and `download/` equal the pre-probe snapshot; `git status` clean at `40f769e0d` |

## Preliminary Classification

- Round 2: `N/A` (Pass).
- Round 1 (history): `Local Fix` for G-01. CRR-003 confirmed it as implementation defect CR-002, and IR-003 resolved it with a single-file `git rm`.

## Recommended Recipient

Round 2 Pass on the reviewed route (Large/High): per `get_handoff_rules`, normally `/code_reviewer`. Proportional test-code review is `Not Applicable` (no durable test changed by API/E2E).

## Evidence / Notes

- Round-2 rerun scope, as executed:
  - Delta verified (one deleted data file; added-file set unchanged).
  - R-09 content + path gates: clean.
  - G-01 default-data-dir probe: no tracked change, binding root SKIPPED.
  - No L-02 smoke needed, because nothing beyond that file changed.
- Informational notes:
  - The `.gitignore` does not cover the two SDK `dist/` folders (pre-existing; CRR note). They were present untracked before and after this round.
  - The `token-usage-analytics-graphql` e2e has a pre-existing order dependence on `token-usage-ledger-provider-semantics` (reproduced on baseline). It is a candidate for a separate test-isolation ticket.
  - The Docker all-in-one Dockerfile gap (missing agent-presentation/collaboration-stream contracts) is pre-existing and needs a separate ticket. The temp patch in `logs/L-08-temp-patch.diff` shows the minimal fix.
  - Validators should keep using a scrubbed environment: the agent shell inherits the user's real data-dir env.

- Informational gateway check (requested by the user after round 2; outside REQ-121 scope; does not change the result): `api-e2e-evidence/gateway-build-check/SUMMARY.md`.
  - A standalone copy of `autobyteus-message-gateway` installs, typechecks (0 errors), builds (0 errors), passes its tests (86 files / 268 tests) and starts with `/health` 200.
  - The workspace-based packaging paths (`build:runtime-package`, the gateway's own `docker/Dockerfile`) no longer work, because pnpm matches no workspace project for the gateway. This is the known SR-011 deferral.
- **User direction after round 2 (2026-09-24):** "the message gateway doesn't [have to] work but it should build".
  - This contradicts REQ-121 ("no requirement that it builds").
  - Follow-up measurement (`gateway-build-check/SUMMARY.md`, follow-up section):
    - baseline root install + gateway `pnpm build`: Pass → candidate: **Fail** (`tsc: command not found`);
    - `build:runtime-package`: Pass → **Fail**;
    - `pnpm install --ignore-workspace` + build in the gateway folder: Pass (fix direction).
  - Routed to `/solution_designer` as a **Requirement Gap** (delivered). The package should not be finalized until the revised requirement is approved, implemented and validated. API/E2E will then add a gateway clean-clone build check.


## Latest Authoritative Result

- Result: `Pass` (round 2, API-REV-002, commit `40f769e0d`)
- Final validation confidence: 95.3%
- Default 95% confidence target met: `Yes`
- Any final applicable confidence category below 90%: `No`
- Broader validation decision: `Required`, executed in round 1 (Lifecycle, Live API, Browser, Docker); carried forward because the round-2 delta is a single deleted data file
- Critical acceptance criteria lacking direct proof: none
- Prior failure resolution: G-01 (round 1 Fail) → CR-002 (CRR-003) → IR-003 `git rm` → round 2 Pass
- Required next recipient: per `get_handoff_rules` (reviewed-route Pass, normally `/code_reviewer`). Proportional test-code review is `Not Applicable`; no durable test changed.
- Durable coverage added, updated or removed: none
- Notes: residual non-blocking items for delivery:
  - `release:test` needs a pushed ref.
  - The pre-existing Docker all-in-one contract-copy gap (minimal patch in `logs/L-08-temp-patch.diff`).
  - The pre-existing token-usage e2e order dependence.
  - The release notes should mention the unpruned Docker `gateway.log` and `gateway-memory` volume (R-3).
  - Validators must scrub the inherited app env.
