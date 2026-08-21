# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer; code-review-report.md; round 1 | SR-001, ARCH-REV-001, IR-001, CRR-001 | N/A | Pass / 97.3% |
| API-REV-002 | user real-browser re-entry; round 2 | SR-001, ARCH-REV-001, IR-001, CRR-001, API-REV-001 | Pass / 97.3% | Fail / 98.0% failure-origin confidence |
| API-REV-003 | code_reviewer; CRR-004 corrected-commit rerun; round 3 | SR-001, ARCH-REV-001, IR-002, CRR-004, API-REV-002 | Fail / 98.0% failure-origin confidence | Pass / 98.3% validation confidence |

## Revision Entries

### API-REV-001 — Initial durable restart and realistic renderer baseline

- Triggering role, report path, and round: code_reviewer; /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/code-review-report.md; API/E2E round 1.
- Triggering finding or scenario IDs: No code-review finding. CRR-001 requested evidence for fresh-process standalone/team reopen, compound team/member identity, live-before/during/after GraphQL, and continuous team traffic with maximum one in-flight aggregate request.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: SR-001, ARCH-REV-001, IR-001, CRR-001; no delivery revision.
- Why this baseline or coverage/execution revision was recorded: This is the first completed API/E2E result for the ticket; no prior result or confidence existed.
- Coverage decisions or durable test paths changed: Added /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-server-ts/tests/e2e/token-usage/token-usage-record-restart-graphql.e2e.test.ts; no durable coverage updated or removed; all inventoried existing coverage remained valid.
- Scenarios added, changed, removed, or rechecked: Added API-TS-006 and temporary BROWSER-TS-001 through BROWSER-TS-007; rechecked API-TS-001 through API-TS-005, current-store integration, GraphQL projections/unit-price/provider semantics, builds, and guards; removed none.
- Commands, environment, fixture, or broader-validation delta: Added built-server stop/start on one isolated migrated SQLite DB; ran Nuxt/Chrome against that backend with deterministic priced standalone and two-team identities; controlled real GraphQL response timing; captured concurrency, DOM, screenshots, logs, and cleanup.

#### Prior Failure Resolution

None. No prior completed API/E2E round existed. Non-authoritative test/probe authoring corrections were resolved before the final result and did not expose a product-source failure.

- Canonical artifacts and sections updated: api-e2e-coverage-investigation.md repository results/confidence/broader decision; api-e2e-execution-coverage-report.md full evidence and latest result; this revision record.
- Prior result and confidence: N/A
- Current result and confidence: Pass, 97.3%.
- New or remaining failure IDs: None.
- Recommended recipient: /code_reviewer for proportional test-code review of the added durable E2E.
- Remaining risks, blocked evidence, or untested scope: Electron-only wrapper and live external provider execution were not tested because they are unchanged/out of scope; no material blocker remains.

### API-REV-002 — Real-provider `open_tab` reproduction of strict Team token-event rejection

- Triggering role, report path, and round: user; explicit real-testing request plus supplied Electron screenshot; API/E2E round 2.
- Triggering finding or scenario IDs: User screenshot showed repeated red `Rejected TOKEN_USAGE_UPDATED` cards for `observed_runtime_kinds`, `observed_model_identifiers`, and `observed_model_providers`. Added `LIVE-BROWSER-TS-008` and `LIVE-BROWSER-TS-009`.
- Related solution, architecture-review, implementation, code-review, delivery, or prior API/E2E revision IDs: SR-001, ARCH-REV-001, IR-001, CRR-001, API-REV-001; no completed delivery revision is accepted as authoritative for this reroute.
- Why this coverage/execution revision was recorded: The user's production-equivalent evidence invalidated API-REV-001's assumption that external provider/runtime execution would not materially improve coverage. The real runtime path was required to exercise the summary builder through strict Team live transport.
- Coverage decisions changed: Existing strict DTO and Team adapter tests remain valid but incomplete because they use manually contract-shaped fixtures. Round-1 persistence/race/restart coverage remains valid. The missing stable seam is a real builder-produced summary admitted by the Team adapter/projector and strict shared parser.
- Durable test paths changed in this revision: None. Source and durable coverage changes are intentionally deferred until focused failure-origin review determines correct ownership.
- Scenarios added or rechecked:
  - `LIVE-BROWSER-TS-008` — real Classroom Simulation Team with AutoByteus/`deepseek-v4-flash` Professor and Codex App Server/`gpt-5.6-luna` Student through `open_tab`: **Fail**.
  - `LIVE-BROWSER-TS-009` — successful terminate, fresh built backend, fresh `open_tab`, historical exchange/message/Token Meter hydration: **Pass with linked live failure still open**.
- Commands/environment delta: Used real `pnpm secrets:import` from `/Users/normy/.autobyteus/server-data/.env` into an isolated database; loaded `/Users/normy/autobyteus_org/autobyteus-agents`; started built backend and Nuxt dev frontend on owned loopback ports; used `mcp__autobyteus_agent_tools__open_tab` at the user's direction; executed real provider turns; queried GraphQL before and after backend restart; captured screenshots; cleaned all owned resources.

#### Failure Reproduction And Classification

- Expected: valid live `TOKEN_USAGE_UPDATED` events are admitted without visible errors while persisted cumulative usage updates the Token Meter.
- Actual: the file-backed Professor -> Student -> Professor exchange completed with the correct answer `42`, and persisted totals/messages were correct, but repeated red event-monitor cards rejected the token event's three `observed_*` arrays as unknown strict-contract keys.
- Preliminary failure origin: implementation source defect.
- Source seam:
  - `autobyteus-server-ts/src/token-usage/projections/token-usage-run-aggregate.ts:118-120,124-145`
  - `autobyteus-server-ts/src/agent-team-execution/services/team-agent-event-adapter.ts:141-155`
  - `autobyteus-team-stream-contracts/src/token-usage-run-summary-dto.ts:33-88`
- Differential evidence: GraphQL and the Token Meter retained 44,254 Professor tokens, 169,894 Student tokens, 214,148 team tokens, and 14 reports across a fresh backend process. The defect is live strict transport admission, not persistence, provider generation, or restart hydration.
- User screenshot match: Exact message, exact three keys, and exact red event-card presentation reproduced.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, and this revision record.
- Evidence root: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/probes/api-e2e/real-provider-evidence`.
- Prior result and confidence: Pass, 97.3%.
- Current result and confidence: **Fail, 98.0% failure-origin confidence**.
- New or remaining failure IDs: `LIVE-BROWSER-TS-008`.
- Recommended recipient: `/code_reviewer` for focused failure-origin review; delivery must wait.
- Remaining work: Correct the source/contract composition, add builder-to-strict-Team-transport durable regression coverage, rerun relevant repository suites, repeat the real provider `open_tab` journey until no red token rejection appears, and repeat fresh-process reopen.

### API-REV-003 — Corrected real Team, standalone, and fresh-process browser revalidation

- Triggering role, report path, and round: code_reviewer; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/code-review-report.md` at `CRR-004`; API/E2E round 3.
- Triggering finding or scenario IDs: rerun unresolved `LIVE-BROWSER-TS-008` first, linked `LIVE-BROWSER-TS-009` second, and add proportionate standalone `LIVE-BROWSER-TS-010` because the corrected builder feeds both Team and independent-agent live summaries.
- Related solution, architecture-review, implementation, code-review, delivery, or prior API/E2E revision IDs: SR-001, ARCH-REV-001, IR-002, CRR-004, API-REV-002; historical delivery revisions remain stopped until successful proportional test review.
- Why this revision was recorded: IR-002 commit `0ce9d17b75195b0142abadc4593f6fea47893be0` replaces the over-wide aggregate spread with an exact summary projection and adds the missing real builder-to-strict-Team regression. The latest authoritative Fail could change only after independent real-system re-execution.
- Coverage decisions changed: the IR-002 Team transport regression is now valid and directly adequate for the missing stable source seam. The strict DTO, restart GraphQL E2E, focused frontend race/cache coverage, and Round-1 deterministic browser baseline remain valid. Round-2 evidence remains the pre-fix differential baseline.
- Durable test paths changed by API/E2E in this revision: None. IR-002 changed `autobyteus-server-ts/tests/unit/agent-team-execution/team-agent-token-usage-event-transport.test.ts`; API/E2E reran it and must return it for proportional review.
- Repository scenarios rechecked:
  - Shared strict contract: 2/2 Pass.
  - Affected Team transport/fold/accumulator suites: 14/14 Pass across 3 files.
  - Production server build and sanitized bootstrap smoke: Pass.
  - Exact projection/strict DTO inspection and `git diff --check`: Pass.
- Commands/environment delta: repeated the real value-safe `pnpm secrets:import` dry-run and interactive import from `/Users/normy/.autobyteus/server-data/.env`; loaded `/Users/normy/autobyteus_org/autobyteus-agents`; started an isolated built backend and real Nuxt dev frontend on dynamic ports 55972/55973; used three actual `open_tab` instances; executed external DeepSeek and Codex runtimes; queried exact GraphQL summaries before/after a fresh backend; inspected screenshots; cleaned all owned resources.

#### Prior Failure Resolution

- Prior expected behavior: valid real Team `TOKEN_USAGE_UPDATED` events are admitted without a visible diagnostic while member/team Token Meter values converge.
- Prior actual behavior: repeated red cards rejected `observed_runtime_kinds`, `observed_model_identifiers`, and `observed_model_providers` even though provider work and persistence succeeded.
- Corrected actual behavior: the same Classroom Simulation Team flow completed Professor AutoByteus/`deepseek-v4-flash` -> Student Codex App Server/`gpt-5.6-luna` -> Professor, returned `42`, persisted two communication messages, and produced zero `Rejected TOKEN_USAGE_UPDATED`, zero three-key signatures, and zero `An Error Occurred` in the browser and log scans.
- Differential persisted totals: Professor 52,132 tokens/7 reports; Student 84,231/6; Team 136,363/13. Browser Token Meters matched GraphQL live and after a fresh built-backend process.
- Standalone proportional result: Daily Assistant AutoByteus/`deepseek-v4-flash` returned `standalone token check complete.`; Token Meter and GraphQL both showed 6,137 tokens/1 report with zero red rejection.
- Fresh-process result: Professor, Student, Team, two communication messages, and all pre-captured standalone summary fields matched after restart/fresh `open_tab`; visible history restored `42` and both model/runtime labels.
- Resolution classification: `LIVE-BROWSER-TS-008` implementation-source failure resolved without weakening the strict DTO; no replacement failure found.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, and this revision record.
- Evidence root: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/probes/api-e2e/real-provider-evidence-api-rev-003`.
- Prior result and confidence: **Fail, 98.0% failure-origin confidence**.
- Current result and confidence: **Pass, 98.3% validation confidence**.
- New or remaining failure IDs: None.
- Recommended recipient: `/code_reviewer` for proportional durable-test review, then delivery if that review passes.
- Remaining risks, blocked evidence, or untested scope: Electron preload/window/package behavior remains unchanged and was not launched; actual `open_tab` exercises the web-equivalent renderer, and the user's earlier Electron screenshot independently established that renderer diagnostic as the material shell-visible symptom. No material API/E2E blocker remains.
- Cleanup: Team and standalone terminated; all three owned tabs closed; backend/Nuxt processes stopped; owned ports cleared; unique runtime, workspace, database, vault key, and sidecars removed; fixed ports 8000/3000 and user data untouched.
