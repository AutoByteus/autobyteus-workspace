# API/E2E Coverage Investigation — `grok-build-runtime-support`

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/requirements-doc.md` (Approved; SR-005 baseline + SR-008 clarifications)
- Investigation Notes: `.../tickets/in-progress/grok-build-runtime-support/investigation-notes.md`
- Solution Revision Record: `.../solution-revision-record.md`
- Design Spec: `.../design-spec.md` (SR-008, Ready)
- Supplemental Task Artifacts: `.../evidence/grok-acp-probes/*`, `.../evidence/implementation-probes/*` (evidence only). Product/UI supplements: `N/A — not applicable`.
- Design Review Report: `.../design-review-report.md` (ARCH-REV-002 Pass)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Implementation Handoff: `.../implementation-handoff.md`
- Implementation Revision Record: `.../implementation-revision-record.md` (IR-001)
- Code Review Report: `.../code-review-report.md` (CRR-001 Pass, 9.35/10)
- Code Review Revision Record: `.../code-review-revision-record.md`
- Delivery Revision Record: N/A (no delivery re-entry)
- API/E2E Revision Record: `.../api-e2e-revision-record.md` (created after the first completed result)
- Current API/E2E Revision ID: `API-REV-001` (pending until the round completes)
- API/E2E Test-Case Ledger: `.../api-e2e-test-case-ledger.md`
- Current Investigation Round: `1`
- Trigger: `/code_reviewer` CRR-001 Pass handoff (commit `2b31b046d`, base `e06080b00`)
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this file

(`...` = `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support`)

## Round 2 Update (API-REV-002, trigger CRR-003 / IR-002, commit `d7d4aa2ad`)

- Basis changes: SR-011 amended AC-004 (deny → Grok ends its turn → shown **completed**, run idle, next message continues; real interrupt stays interrupted), clarified REQ-005 (Grok's own policy decides which calls prompt; AutoByteus surfaces every request raised — resolves round-1 F-3), AC-012 unchanged (fixed in CR-004), REQ-017/AC-015 application launch **deferred by the user (SR-009)** — not validated in this ticket.
- Delta: shared ACP session (`endTurnFor` classification, `userDeniedInTurn`), permission bridge outcome, factory → `AgentCreationError` with `describeAcpActivationError`, new `acp-error-message.ts`, process stderr drained.
- Coverage decisions: existing durable Grok e2e `Still Valid`; `grok-build-live-runtime.e2e.test.ts` step B `Needs Update` (soft → hard `TURN_COMPLETED`, no `TURN_INTERRUPTED`); **add** GE2E-005 (deny→completed→next turn) and GE2E-006 (unauth `session/new` → provider text) to the zero-cost replay suite.
- Execution: repo checks, replay ×3 (+ negative check on `2b31b046d`), real unauth probe, live standalone, default runtime e2e folder, live team + org (the delta touches the shared session all members use; closes the 90–94% confidence gap on the final commit).
- Post-repository confidence (round 2): 93%; final: 95% (execution report).

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review)
- Proportional test-code review decision: `Required` (durable coverage will change)

## Current Requirement And Design Basis

`grok_build` ("Grok Build") is a fifth runtime driven through a runtime-neutral ACP layer plus a Grok profile (`grok agent --no-leader --model M --reasoning-effort E stdio`, per-run process). Must prove: availability row and safe diagnostics (AC-001), agent-reported catalog with effort schema (AC-002), normalized stream incl. `list_dir` card and no bookkeeping (AC-003), per-call approvals `run_bash` approve/deny (AC-004), team/org canonical `get_handoff_rules`/`send_message_to` through `search_tool`/`use_tool` (AC-005), exact `session/load` restore with history once and continuity (AC-006), reference-file block (AC-007), interrupt ≤ 2 s with reuse (AC-008), one ledger record per model call summing to the turn usage and priced by `grok-4.7` tier (AC-009), `.grok/skills` links (AC-010), `autobyteus` `grok-4.7` row (AC-011), provider auth/rate-limit error surfacing (AC-012), disabled `task`/`workflow`/`ask_user_question` with `web_search` usable (AC-013), existing suites unchanged (AC-014), application preflight + Grok-backed application run (AC-015), neutral ACP layer (AC-016, review-owned; neutrality unit test exists). Code-review residual risks: CAND-06 (auth failure by process exit loses provider text), `session/load` with non-empty MCP under a prompt, live `web_search`.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 availability row | Added | REQ-001/002, AC-001 | Capability GraphQL e2e must list 5 kinds and classify Grok enabled/disabled safely |
| BEH-002 catalog | Added | REQ-003, AC-002 | GraphQL catalog e2e (fake CLI) + live catalog (zero cost) |
| BEH-003 stream | Added | REQ-004, AC-003 | Full-stack WS replay (fake agent) + gated live turn |
| BEH-004 approvals | Added | REQ-005, AC-004 | Gated live approve + deny through WS `APPROVE_TOOL`/`DENY_TOOL` |
| BEH-005 team/org | Added | REQ-006/007, AC-005 | Gated live mixed team (+ org if budget allows) |
| BEH-006 restore | Added | REQ-008, AC-006 | Gated live terminate/restore with Agent Tools MCP attached + follow-up |
| BEH-007 usage | Added | REQ-011, AC-009 | Full-stack replay (exact fixture sums, GraphQL summary) + live per-call records vs Grok turn usage |
| BEH-008 skills | Added | REQ-012, AC-010 | Existing unit (registration test); no live need |
| BEH-009 reference files | Added | REQ-009, AC-007 | Existing unit (prompt builder) |
| BEH-010 `grok-4.7` row | Changed | REQ-013, AC-011 | `autobyteus-ts` unit suites |
| BEH-011 auth errors | Added | REQ-015, AC-012 | Observe real unauthenticated Grok (HOME-isolated wrapper, zero cost) through server; process-exit path via fake agent |
| BEH-012 interrupt | Added | REQ-010, AC-008 | Gated live interrupt latency + follow-up |
| BEH-013 application scope | Added | REQ-017, AC-015 | Browser/dev-stack application launch with `grok_build` (preflight + run) |
| REQ-014 existing runtimes | Preserved | AC-014 | Existing default suites; no provider behavior touched |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | ACP backend/session/converter/bridge, Grok profile | 17 unit files (fake-agent replay of real wire logs) | Real Grok behavior beyond recorded fixtures | Live API (gated) |
| API / transport / contract | Yes | GraphQL `runtimeAvailabilities`, catalog, `createAgentRun`, team/org DTO enums, agent WS | Capability e2e lists 3 kinds only | 5-kind contract, WS/GraphQL end-to-end with Grok backend | Durable GraphQL/WS e2e |
| Frontend component / state | Yes (labels) | Runtime label/help/source key/token-usage labels | Web specs | Rendered with real Grok data | Browser (dev stack) |
| Browser integration / user journey | Yes | Picker, launch, app launch | Implementation dev-UI check (no run) | Application launch with Grok; analytics label with real rows | Browser |
| Authentication / session / permissions | Yes | Grok-owned auth; per-call permission bridge | Unit only | Real unauthenticated/rate-limited Grok; real approve/deny | Live + HOME-isolated probe |
| Desktop renderer / web-equivalent UI | Yes (same web app) | As frontend | Web specs | As above | Browser (web-equivalent) |
| Desktop shell / Electron-specific | No | None | — | — | None |
| Process / lifecycle | Yes | Per-run child process, interrupt, exit, terminate, restore | Unit (fake agent) | Real process restore with MCP, interrupt latency | Live |
| Persisted-data transition | Yes (Directly Usable) | `runtimeKind=grok_build`, `platformAgentRunId=sessionId`, usage rows | Unit | Real persistence round-trip + restore | Live restore |
| Worker / queue / distributed | No | — | — | — | None |
| External integration | Yes | `grok` CLI 1.0.41, xAI inference, Agent Tools MCP over HTTP | Recorded fixtures | Live team MCP via `use_tool`, web_search | Live |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support` (branch `codex/grok-build-runtime-support`, HEAD `2b31b046d`)
- Stack: pnpm monorepo; server Fastify + type-graphql + Prisma (SQLite), Vitest (`pool: forks`, no file parallelism); Nuxt web; Electron shell not affected.
- Instructions: conflicting/missing: server `typecheck` script fails on a pre-existing tsconfig `rootDir` issue → use `tsc -p tsconfig.build.json --noEmit` (implementation handoff).
- Required secrets: Grok auth is the host's own `grok` login (`~/.grok/auth.json`, not read); no `XAI_API_KEY` in env. No AutoByteus secrets needed.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Server test commands | `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch` |
| `autobyteus-server-ts/vitest.config.ts` | Runner config | forks pool, serial files, Prisma global setup (shared test DB across files) |
| `README.md` §Local full-stack development | Dev stack | `pnpm dev` → backend `127.0.0.1:8000`, frontend `127.0.0.1:3000`, state under `<repo>/.autobyteus/development/`; Ctrl+C stops both |
| `tests/e2e/runtime/*` (AGY/Claude/Codex live suites) | Live-gating precedent | `RUN_<RUNTIME>_E2E=1` + binary check; `startStudioE2eRuntimeServer`; GraphQL + `/ws/agent/<id>`, `/ws/agent-team/<id>`, `/ws/agent-org/<id>`; temp app-data dir via `appConfigProvider.config.setCustomAppDataDir` |
| `tests/fixtures/grok-acp/README.md` | Zero-cost replay | `fake-grok-cli.mjs` (`--version`, `agent --help`, `agent … stdio` → `fake-acp-agent.mjs` with `FAKE_ACP_FIXTURE`) |
| `src/runtime-management/grok/grok-build-launch-profile.ts` | Command override | `GROK_BUILD_COMMAND` read per call; child env = server env + 3 switches |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process Studio server (e2e) | `autobyteus-server-ts` | `startStudioE2eRuntimeServer()` in test | Random port; temp app-data dir | Fastify listen resolves | `fastify.close()`, `rm -rf` temp dir |
| Real `grok` CLI 1.0.41 | per-run temp workspace | spawned by the backend | Paid inference (user's limited credits) — reasoning effort `low`, minimal turns | Availability row enabled | Run terminate; process stop verified |
| Fake Grok CLI wrapper | temp dir | executable `sh` wrapper → `node fake-grok-cli.mjs` | Zero cost | — | temp dir removed |
| Grok wire tap (temporary) | `/tmp/grok-api-e2e` | `GROK_BUILD_COMMAND` → node tap wrapper around real `grok` | Evidence of prompt-result usage / auth errors | — | Removed after run; logs retained as evidence |
| Dev stack (browser) | worktree root | `pnpm dev` | Ports 8000/3000 free; worktree-local state | Launcher readiness line | Ctrl+C / kill owned PIDs; `.autobyteus/development` removed |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent/team/org definitions | GraphQL create mutations with unique names | Temp app-data dir per suite | Deleted in `afterEach`; dir removed |
| Workspaces | `mkdtemp` | Grok writes its own `~/.grok/sessions/<cwd>` (user-owned, documented) | Temp workspaces removed; Grok session folders left (provider-owned) |
| Unauthenticated Grok | Wrapper with `HOME=<empty temp>` | Never touches `~/.grok/auth.json` | Temp home removed |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- References: design-spec "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check".
- Representative existing data: existing runs of other runtimes are untouched (existing suites); new Grok run metadata (`runtimeKind=grok_build`, `platformAgentRunId=<Grok sessionId>`) must round-trip through terminate → restore.
- Evidence planned: live standalone terminate/restore reads the persisted binding through the normal reader; team restore compares resume config before/after.
- Migration scenarios: N/A. Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related REQ / AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/e2e/runtime/runtime-capability-graphql.e2e.test.ts` | 3 kinds present | AC-001 | `Needs Update` | Lists only autobyteus/codex/claude | Assert 5 kinds + deterministic Grok enabled/unavailable/unsupported rows via fake CLI |
| `tests/unit/{agent-execution/backends,runtime-management}/{acp,grok}/*` (17 files) | Replay of real wire logs through production modules | AC-002..AC-010, AC-013, AC-016, QR-005/006 | `Still Valid` | 87–133 tests pass | Keep |
| `tests/unit/llm-management/*`, app-launch validator tests | Grok diagnostics | AC-002, AC-015 | `Still Valid` | Pass | Keep |
| `autobyteus-ts` `supported-model-definitions`, `grok-llm` | `grok-4.7` row | AC-011 | `Still Valid` | 18/18 pass | Keep |
| `autobyteus-web` Grok presentation + token-usage specs | Labels | UI reqs | `Still Valid` | 22/22 pass (7 files) | Keep |
| `tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Live usage for 3 runtimes | AC-009 analog | `Out Of Scope` (gated, other runtimes) | — | Grok usage covered in new Grok suite |
| `tests/e2e/runtime/agy-*`, `claude-*`, `codex-*` live suites | Other runtimes | AC-014 | `Still Valid` (gated) | Skipped by default | Unchanged |
| `tests/e2e/token-usage/token-usage-analytics-graphql.e2e.test.ts` | Analytics GraphQL | AC-014 | `Still Valid` | Passes alone; fails only in the combined run through shared-DB pollution from another file (pre-existing, unrelated) | None |
| `tests/e2e/run-history/nested-team-history-restart.e2e.test.ts` | V1/V2 team-history migration via built server | AC-014 | `Still Valid` (pre-existing failure) | Fails `AgentRun 'agent-run-architect' was not found in root TeamRun` after fresh build; the only related diff is a throwing `GROK_BUILD` switch case unreachable for this Codex/autobyteus fixture | Recorded as unrelated pre-existing; no action |

## Stale Or Obsolete Coverage Decisions

None.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Evidence | Planned Artifact / Path | Why Durable |
| --- | --- | --- | --- | --- |
| GE2E-002 | Grok catalog via GraphQL (fake CLI handshake) | AC-002, QR-002 | `tests/e2e/runtime/grok-build-runtime-graphql.e2e.test.ts` (default CI, fake) | Server contract regression without credits |
| GE2E-003 | Standalone GraphQL create + WS turn replay (`prompt.jsonl`): stream shape, `list_dir` card, no bookkeeping, 2 per-call usage records, persisted GraphQL summary | AC-003, AC-009 | same file (fake) | Full-stack regression at zero cost |
| GE2E-004 | Agent process exits at `session/prompt` → interrupted turn + runtime `ERROR`, no hang | QR-006, AC-012 exit path | same file (fake) | Deterministic failure path through WS |
| GE2E-L1..L5 | Live standalone (list_dir + approve, deny, interrupt + follow-up, terminate/restore with MCP + follow-up), live mixed team (+restore) | AC-003/004/005/006/008/009 | same file, `RUN_GROK_E2E=1` + `grok` binary | Repeatable live parity check (design step 8) |

## Durable Coverage To Update

| Scenario ID | Existing Path | Required Update | Evidence | Notes |
| --- | --- | --- | --- | --- |
| GE2E-001 | `runtime-capability-graphql.e2e.test.ts` | 5 kinds; Grok row enabled (fake supported CLI), `GROK_CLI_UNAVAILABLE` (missing command), `GROK_CLI_UNSUPPORTED` (old version) with exact safe messages | AC-001, QR-001 | Uses `GROK_BUILD_COMMAND` override, restored after |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `npx tsc -p tsconfig.build.json --noEmit` | `autobyteus-server-ts` | Server source types | Pass | `/tmp/grok-api-e2e/typecheck.log` |
| 2 | `npx vitest run tests/unit/agent-execution/backends/{acp,grok} tests/unit/runtime-management/{acp,grok} tests/unit/llm-management tests/unit/application-platform/launch-configuration tests/unit/agent-execution/services/agent-run-manager.test.ts --no-watch` | `autobyteus-server-ts` | ACP/Grok units, catalog, selection, app validator, manager | Pass (133/134; the 1 failure is `gemini-configuration-service` reading host Vertex env — unrelated, pre-existing) | `/tmp/grok-api-e2e/unit-narrow.log` |
| 3 | `npx vitest run tests/e2e/runtime tests/e2e/token-usage tests/e2e/run-history tests/e2e/llm-management --no-watch` | `autobyteus-server-ts` (no RUN_* flags) | Default e2e (AC-014) | 23 files pass, 19 gated skip; 2 files fail, both unrelated (see inventory) | `/tmp/grok-api-e2e/e2e-default.log` |
| 4 | `npx vitest run tests/unit/llm/supported-model-definitions.test.ts tests/unit/llm/api/grok-llm.test.ts` | `autobyteus-ts` | AC-011 | Pass 18/18 | console |
| 5 | `npx vitest run utils/__tests__/grokBuildRuntimePresentation.spec.ts components/settings/token-usage` | `autobyteus-web` | Labels | Pass 22/22 | console |
| 6 | New/updated durable e2e (default CI) | `autobyteus-server-ts` | GE2E-001..004 | Planned | ledger |
| 7 | Gated live suite `RUN_GROK_E2E=1` | `autobyteus-server-ts` | GE2E-L1..L5 | Planned | ledger |

## Test-Case Ledger Plan

- Ledger required: `Yes` — many independent cases, paid live runs, long-running execution and context-compression risk.
- Canonical ledger path: `.../api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Case granularity: one scenario/journey/probe per case.

| Case ID | Case / Journey | REQ / AC IDs | Boundary / Surface | Planned Command Or Entry Point | Order | Evidence Expected |
| --- | --- | --- | --- | --- | --- | --- |
| GE2E-001 | Capability GraphQL 5 kinds + Grok classified rows | AC-001, QR-001 | GraphQL | capability e2e | 1 | Pass output |
| GE2E-002 | Catalog GraphQL (fake handshake) | AC-002 | GraphQL | Grok e2e (fake) | 2 | Model row, schema |
| GE2E-003 | Standalone WS replay + usage GraphQL | AC-003, AC-009 | GraphQL/WS/Prisma | Grok e2e (fake) | 3 | Event sequence, summary |
| GE2E-004 | Process exit during prompt | QR-006, AC-012 | WS | Grok e2e (fake) | 4 | ERROR code, interrupted turn |
| GE2E-L0 | Live catalog + availability (no inference) | AC-001, AC-002 | GraphQL + real `grok` | live suite | 5 | enabled row, grok-4.7 |
| GE2E-L1 | Live standalone list_dir + approve `run_bash` + per-call usage | AC-003, AC-004, AC-009 | WS + real Grok | live suite | 6 | events, usage sums, tap |
| GE2E-L2 | Live deny `run_bash` | AC-004 | WS | live suite | 7 | TOOL_DENIED, turn completes |
| GE2E-L3 | Live interrupt ≤ 2 s + follow-up | AC-008, QR-003 | WS | live suite | 8 | latency, follow-up |
| GE2E-L4 | Live terminate/restore with Agent Tools MCP + history once + follow-up | AC-006, REQ-007 | GraphQL/WS + `session/load` | live suite | 9 | projection, continuity |
| GE2E-L5 | Live mixed team: Grok `get_handoff_rules` + `send_message_to` via `use_tool`, delivery, team restore + follow-up | AC-005 | Team WS + MCP | live suite | 10 | canonical names, receipt |
| GE2E-L6 | Live org with Grok member relay (budget permitting) | AC-005 (org) | Org WS | live suite / temp | 11 | attributed turns, receipt |
| GE2E-P1 | Unauthenticated Grok (HOME-isolated) through server + direct ACP probe | AC-012, CAND-06 | real `grok` | temp probe | 12 | observed error surface |
| GE2E-P2 | Live `web_search` usable; session tool set | AC-013 | real Grok | temp probe / live turn | 13 | tool evidence |
| GE2E-B1 | Browser: application launch with `grok_build` (preflight + run) | AC-015 | dev stack + browser | `pnpm dev` | 14 | DOM, backend log |
| GE2E-B2 | Browser: runtime picker / token-usage analytics "Grok Build" with real rows | AC-001, AC-009 UI | dev stack + browser | `pnpm dev` | 15 | DOM/screenshot |

## Post-Repository Confidence Scorecard (Mandatory)

After GE2E-001..004 (durable, zero cost) and the repository suites:

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation |
| --- | --- | --- | --- | --- |
| Requirement and AC proof | 60% | AC-001/002/003/009 and approve path proven through the real server with recorded Grok traffic | AC-004 deny, AC-005, AC-006, AC-008, AC-012, AC-015 unproven against real Grok | Live suite, unauth probe |
| Changed-boundary execution directness | 70% | Real Studio GraphQL/WS/manager/backend | Real Grok process not used | Live |
| Cross-boundary integration realism | 65% | Recorded wire replay | Real MCP `use_tool`, real restore | Live team/restore |
| Environment/fixture fidelity | 80% | Sanitized real Grok 1.0.41 fixtures | Provider drift | Live |
| Failure/edge/lifecycle | 75% | Mid-turn exit proven | Auth failure, interrupt latency | Probes, live |
| User-surface/browser | N/A | Labels covered by web specs; no UI change beyond labels | — | — |
| Durable regression quality | 85% | New default-CI replay + 5-kind capability test | Live parity not durable yet | Gated live suite |

- Overall post-repository confidence: 72%; critical ACs directly proven: `No`; categories below 90%: all except none; target met: `No`.

Final scores after broader validation are in the execution report (overall **82%**, Fail).

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Live API` (gated live suite against the real `grok` CLI through the real Studio server GraphQL/WS), `CLI` probes (HOME-isolated Grok, wire tap), and `Browser` (dev stack) for AC-015 and rendered labels.
- Residual risk addressed: every paid live flow (AC-004/005/006/008), the real per-call usage totals (AC-009), unauthenticated behavior (AC-012/CAND-06), web_search (AC-013), application launch (AC-015).
- Why: repository evidence replays recorded fixtures through mocks of the manager/server layers; real Grok, real MCP reachability and real restore are unproven.
- Browser-specific rationale: application launch and rendered labels are web-equivalent renderer journeys; Electron shell unaffected.
- Credit discipline: `reasoning_effort=low`, one run per scenario, cost tracked from `costUsdTicks` in raw usage.

## Desktop Application Validation Decision

- Desktop framework: Electron (not changed). Web-equivalent behavior only; browser via `pnpm dev`. Shell-specific behavior: none in scope. Effect on the user's running desktop app: none (separate ports/state).

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness | Behavior Proven | Why Not Durable |
| --- | --- | --- | --- |
| GE2E-L1 tap | `/tmp/grok-api-e2e/grok-tap/*` wrapper logging Grok stdout | Prompt-result `_meta.usage` vs recorded per-call sums | Wire tap depends on host CLI; evidence only |
| GE2E-P1 | HOME-isolated `grok` wrapper; direct ACP script | Grok's real unauthenticated behavior | Host-specific, provider behavior observation |
| GE2E-P2 | Live web search turn | Provider-side web search usable | Paid, non-deterministic provider feature |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| Real xAI rate-limit (429) | Cannot be induced safely without exhausting the user's credits | Low (Grok retries 429 internally per investigation) | Report observed auth behavior; rate-limit remains design evidence |

| AC-015 application launch + run | **De-scoped by explicit user direction (2026-09-26)**: focus this ticket on agent/team/org; report the application problem to the Solution Designer as a separate ticket | Grok-backed application runs unproven; code reading indicates a blocking credential-readiness issue (F-4) | Separate ticket via `/solution_designer` |
| `web_search` live use (AC-013) | No `web_search` tool in Grok sessions on this host/plan, with or without AutoByteus | Low | Recheck on a plan that exposes it |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| F-1 unauthenticated Grok → generic `Failed to prepare agent run` (AC-012) | `Local Fix` | `evidence/api-e2e/ac012-*` | `/code_reviewer` → implementation |
| F-2 deny ends the turn (`stopReason:"cancelled"` → `TURN_INTERRUPTED`) vs AC-004 "agent continues" | `Requirement Gap` / `Design Impact` (Unclear) | live standalone run, tap | `/code_reviewer` → solution designer |
| F-3 Grok auto-allows routine commands (`echo`, `touch`) with approvals on | `Requirement Gap` / `Design Impact` (Unclear) | `evidence/api-e2e/approval-bisect-results.txt` | `/code_reviewer` → solution designer |
| F-4 application quarantine (pre-existing) + `GROK_BUILD` credential authority `unsupported` | Separate ticket candidate (user direction) | execution report F-4 | `/solution_designer` (informational) |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (executed)
- Repository-Resident Durable Coverage Added / Updated / Removed: `Yes` — 1 updated (`runtime-capability-graphql.e2e.test.ts`), 3 added (`helpers/grok-fake-cli.ts`, `grok-build-runtime-replay.e2e.test.ts`, `grok-build-live-runtime.e2e.test.ts`)
- Post-repository confidence: 72%; final: 82% (execution report)
- Broader validation decision: `Required` (executed; AC-015 de-scoped by user)
- Reroute Required: `Yes` — Fail to `/code_reviewer` for failure-origin review
