# API/E2E Execution Coverage Report — server-e2e-node-credential-447

## Round

- Coverage investigation (the plan; it lists the upstream documents): `/Users/normy/autobyteus_org/autobyteus-worktrees/server-e2e-node-credential-447/tickets/in-progress/server-e2e-node-credential-447/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-003`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: Round 3; IR-003 (SR-002 D10–D13: REQ-009/AC-009, REQ-010/AC-010; SR-003 DEC-005: FU-005, FU-006 recorded as follow-ups), after delivery's `origin/personal` merge `5c29d6fca2` (autobyteus-455's collaborator change), HEAD `86404668ff` (code = `5abf8591db`). Round 2: Local Fix IR-002 (CRR-001 CR-001, CR-002) on API-REV-001's API-11, HEAD `0a324654a5`. Round 1: IR-001, HEAD `bc5f8bfa35`, code as of `9721caf187`
- Prior round reviewed: Round 2 (API-REV-002, Pass) and round 1 (API-REV-001, Fail on API-11)
- Rerun by impact, round 3 (TESTING.md; plan in the investigation's "Round 3 Plan"): `git diff --name-only 2b70ffdab4 86404668ff` adds the base merge (server `src` collaborator policy and built-in registry, web code and probes, unit tests, `typecheck-baseline.json`) and this ticket's 7 e2e files including the shared helpers `agy-run-capsule.ts` and `collaboration-root-harness.ts`. Reused at HEAD's code: IMP-14, IMP-15, IMP-17, IMP-18, IMP-19, IMP-20, IMP-21, DEL-03 (API-17…API-19). Rerun: API-03, API-06, API-09 (merge changed `src`, web and unit tests), API-11 (`dist` rebuilt), API-12. New: API-15. Still valid without rerun: API-07 and API-01's files (inside IMP-17), API-08/08b (DEL-03 reran the guard on the integrated tree), API-11c (fixture unchanged), API-13 (`git diff 2b70ffdab4 HEAD -- TESTING.md` empty). `origin/personal` has since moved to `aae0a53a81` (one delivery document, no code)
- Rerun by impact, round 2: `git diff --name-only 8c0d99eb83 0a324654a5` lists `TESTING.md`, `tests/e2e/runtime/codex-native-multi-agent-disabled.e2e.test.ts`, `tests/fixtures/codex-native-multi-agent-system.mjs` and ticket documents. Rerun: API-11 (the changed suite and fixture), API-08b guard and API-14 typecheck (a `tests/e2e` file changed), API-13 (TESTING.md); new API-11c (the fixture's missing-credential branch). Still valid: API-01…API-07, API-09, API-10, API-12 (none exercises the changed files: the changed suite is skipped without its gates and is not a `RUN_AGY_FAILURE_E2E` suite; the fixture is used only by it)
- Deviations from the investigation's plan, and why: API-10b (rerun of the 3 files that failed in API-10, Rule 9 diagnosis) and API-14 (server typecheck with the new API-07 file) were added during execution.
- Evidence folder (absolute path; the handoff message gives the commit that holds it): `/Users/normy/autobyteus_org/autobyteus-worktrees/server-e2e-node-credential-447/tickets/in-progress/server-e2e-node-credential-447/evidence/api-e2e/`. The full logs `API-10-scripted-agy-gated-all.full.log` (7.9 MB) and `API-10b-three-failing-files-alone.full.log` (430 KB) stay in the worktree uncommitted; their committed excerpts sit next to them.

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `bc5f8bfa35` (code identical to `9721caf187`); round-2 reruns API-08b, API-11c, API-13, API-14 at `0a324654a5`; round-3 runs API-03, API-06, API-09, API-12, API-15 at `86404668ff` with `dist` and prepared outputs rebuilt from the merged `src` (IMP-13) | macOS (Darwin 25.5.0) | Node v22.23.1; server `dist/` and Brief Studio package from the worktree bootstrap (`src/` unchanged) | Clean environment `env -i PATH HOME=<resolved temp> TMPDIR`; test-owned data roots and ports; owner credential and gateway token created per process, never printed |
| ENV-2 | ENV-1 + the new `tests/e2e/mcp/mcp-gateway-token.e2e.test.ts` (committed with this report) | as ENV-1 | as ENV-1 | as ENV-1 |
| ENV-3 | as ENV-1 | as ENV-1 | as ENV-1 plus `RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND=<abs>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Scripted AGY CLI, no provider |
| ENV-4 | round 1: `bc5f8bfa35`; round 2: `0a324654a5`; round 3: `86404668ff` (rebuilt `dist`) | as ENV-1 | as ENV-1 plus `RUN_CODEX_E2E=1 RUN_CODEX_NATIVE_POLICY_LIVE=1`; `CODEX_NATIVE_POLICY_BINARY` = a stand-in script that answers `--version` only; `CODEX_NATIVE_POLICY_AUTH_FILE` = a placeholder file in a temp folder | No real Codex, no model call, the user's `~/.codex` never read (user direction on Codex limits respected) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-003, AC-004, REQ-006 | Whole server E2E suite | Reused: IMP-07 | — | Pass | — | — | Ran at `9721caf187`; `git diff --name-only 9721caf187 bc5f8bfa35` lists only ticket docs/evidence. Summary checked: `Test Files  122 passed \| 123 skipped (245)`, every FU-004 file and the five refusal suites `✓` |
| API-02 | REQ-001, REQ-002 | The 15 files | Reused: IMP-02 | — | Pass | — | — | Same code; also inside API-01 |
| API-03 | RSK-001 | Server integration | Round 3: `pnpm -C autobyteus-server-ts test:integration`, run alone; rounds 1–2: reused IMP-04 | ENV-1 (round 3) | Pass | `API-03-server-test-integration.log` | `Test Files  89 passed \| 20 skipped (109)`, `Tests  517 passed \| 69 skipped (586)`, `exit=0` | Round 3 rerun after the merge |
| API-04 | AC-002 | 3 inventory scripted-AGY suites | Reused: IMP-05 | — | Pass | — | — | Same code; rerun again inside API-10 (all three `✓` there) |
| API-05 | AC-002, AC-003 | GitHub remote MCP via gateway on a built server | Reused: IMP-06 | — | Pass | — | — | Same code |
| API-06 | AC-004, BEH-005 | Server and web typecheck | Round 3: `pnpm -C autobyteus-web typecheck` (server: API-19); rounds 1–2: reused IMP-01, IMP-08 | ENV-1 (round 3) | Pass | `API-06-web-typecheck.log` | `test-file errors: 96 in 41 files (baseline 96 in 41 files)`, `[typecheck] PASS` | Round 3 rerun after the merge; the web typecheck reads `test-support/node-access/*.d.mts` |
| API-07 | AC-003 (refusal half), REQ-002, NAS-25, QR-001 | `/mcp/gateway` on the real in-process studio server | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" NO_COLOR=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/mcp/mcp-gateway-token.e2e.test.ts --no-watch --reporter=verbose` | ENV-2 | Pass | `API-07-mcp-gateway-token-e2e.log` | `Tests  4 passed (4)`; `✓ … refuses the owner credential the test process attaches: it is not the gateway token`; `✓ … refuses a client with no token and one with a wrong token`; `✓ … admits a client connected through connectMcpGatewayClient and lists its tools` | New durable test. Owner credential (attached and named explicitly), no token and a wrong `mcpg_` token are each refused 401 `MCP_GATEWAY_TOKEN_REQUIRED`; the helper's token is admitted; neither secret appears in output. Secret grep of the log: 0 |
| API-08 | AC-005(b), QR-002 | Guard over the real `tests/e2e` tree | Planted `tests/e2e/zz-api08-probe.e2e.test.ts` (direct `buildStudioServer(` and a multi-line bare gateway transport), ran `pnpm -C autobyteus-server-ts exec vitest run tests/architecture/e2e-node-credential-paths.test.ts --no-watch --reporter=verbose`, removed the file, ran again | ENV-1 | Pass | `API-08-guard-planted-file.log` | `"tests/e2e/zz-api08-probe.e2e.test.ts:5 composes a node with buildStudioServer: its requests carry no owner credential. Start it with startStudioE2eRuntimeServer …"` and `"tests/e2e/zz-api08-probe.e2e.test.ts:7 opens the MCP gateway with its own StreamableHTTPClientTransport: the gateway needs its token …"`; after removal `Tests  4 passed (4)` | Temporary probe; the planted file is gone (`ls` confirms). The clean rerun also covers the new API-07 file (no false positive on its `inject`/`fetch` refusals) |
| API-09 | RSK-001, AC-005 | Server `test:unit` incl. `tests/architecture` | `pnpm -C autobyteus-server-ts test:unit`, run alone | ENV-1 | Pass | `API-09-server-test-unit.log` (round 3) | `Test Files  970 passed \| 5 skipped (975)`, `Tests  8271 passed \| 9 skipped (8280)`, `exit=0` | Round 3 rerun after the merge. Round 1 (`bc5f8bfa35`): 970 passed, 8267 tests, closing IMP-03's one failure (a concurrent Prisma regeneration) |
| API-10 | REQ-003, AC-002 | Every `RUN_AGY_FAILURE_E2E` gated suite (59 files) | `env -i PATH HOME=<resolved temp> TMPDIR NO_COLOR=1 RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run --no-watch $(grep -rlE RUN_AGY_FAILURE_E2E tests/e2e \| sort)` | ENV-3 | Fail (not from this change) | `API-10-scripted-agy-gated-all-summary.log` | `Test Files  3 failed \| 54 passed \| 2 skipped (59)`; header line `grep NODE_CREDENTIAL_REQUIRED\|MCP_GATEWAY_TOKEN_REQUIRED: 0` | The credential question this case asks is answered: no gated scripted suite is refused for a credential or token. The 3 failures have causes outside this ticket: RPE-001/003/006 stale since autobyteus-95 (FU-002); DCF-02 test reads a capsule before its manifest exists (FU-003); DCM-009 stop `success: false` under load, cause not yet found, request admitted (FU-004). Out of scope, recorded as follow-ups |
| API-10b | Rule 9 diagnosis | The 3 failing files alone | Same as API-10 with the 3 files | ENV-3 | Fail (RPE only) | `API-10b-three-failing-files-alone-summary.log` | `Test Files  1 failed \| 2 passed (3)`; RPE `:243`, `:277`, `:362` fail again | RPE is deterministic (FU-002); DCF and DCM pass alone (narrows to load; causes in FU-003, FU-004) |
| API-11 | REQ-003 | Fixture-composed node of the gated Codex native policy suite (`tests/e2e/runtime/codex-native-multi-agent-disabled.e2e.test.ts` + `tests/fixtures/codex-native-multi-agent-system.mjs`) | `env -i PATH HOME=<resolved temp> TMPDIR NO_COLOR=1 RUN_CODEX_E2E=1 RUN_CODEX_NATIVE_POLICY_LIVE=1 CODEX_NATIVE_POLICY_AUTH_FILE=<temp placeholder> CODEX_NATIVE_POLICY_BINARY=<stand-in answering --version only> CODEX_NATIVE_POLICY_EVIDENCE_DIR=<temp> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-native-multi-agent-disabled.e2e.test.ts --no-watch` | ENV-4 | Rounds 2 and 3: **Pass** (credential boundary); round 1: Fail | `API-11-codex-native-fixture-probe.log`, `API-11-codex-native-fixture-receipt.json` | No `NODE_CREDENTIAL_REQUIRED` outside the header's round-1 note (`grep -v '^#' … \| grep -c refused` = 0); receipt `"teamId": "native_policy_team_…"` and `"error": "Error: Timeout: production Codex thread after user command"` | Round 3 (rebuilt `dist`): same result as round 2, receipt with `teamId`, 0 refusals outside the header, 0 secrets. Round 2: the child's GraphQL setup (two agent definitions, the Team definition, `createAgentTeamRun`) is admitted, and its WebSocket reaches `TEAM_EXECUTION_VIEW_SNAPSHOT` (it would otherwise time out at "public Team stream ready", fixture `:85`); the run then stops at the stand-in Codex (`:99`), the expected end of this probe. The live Codex part of A08 is not run (user direction; paid live suite, Non-Goal). Round 1 (at `bc5f8bfa35`): `Node request refused NODE_CREDENTIAL_REQUIRED /graphql from 127.0.0.1`, `401 !== 200` at `:65` via `:145`; that log and receipt are in git at `8c0d99eb83` |
| API-11c | REQ-003, QR-002 | The fixture child's missing-credential branch (CR-001) | From `autobyteus-server-ts`: `env -i PATH HOME=<temp> TMPDIR APP_ENV=test node tests/fixtures/codex-native-multi-agent-system.mjs <temp root> gpt-6.1-terra` | ENV-1 | Pass | `API-11c-fixture-missing-credential.log` | `AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL is missing from the fixture's environment: the suite adds builtServerLaunchEnvironment().`, `exit=1` | Includes the stderr line added after IMP-11. No value printed |
| API-08b | AC-005 | Guard on the round-2 tree | `NO_COLOR=1 pnpm -C autobyteus-server-ts exec vitest run tests/architecture/e2e-node-credential-paths.test.ts --no-watch --reporter=verbose` | ENV-1 | Pass | `API-08b-guard-round2.log` | `Tests  4 passed (4)` | The changed e2e file passes both rules |
| API-12 | AC-004, AC-006 | Branch diff and evidence | Round 3: `git diff --name-only origin/personal...HEAD` (`origin/personal` = `aae0a53a81`); rounds 1–2: `git diff --name-only 310fc27452...HEAD`; `grep -rEl 'own_[A-Za-z0-9_-]{20,}\|mcpg_[A-Za-z0-9_-]{10,}' tickets/in-progress/server-e2e-node-credential-447/` | ENV-1 | Pass | this row | No `autobyteus-server-ts/src/` or `autobyteus-web/` app path in the diff; grep exit 1 (no match), including the uncommitted full logs | Round 3: no product path against the current base (the merged autobyteus-455 `src` change is the base's, not this branch's); the grep also covers the new implementation and delivery evidence, full logs included: no match |
| API-13 | AC-007, AC-008 | TESTING.md | Read "Node credentials" and "Choosing the path" on the branch | ENV-1 | Pass | this row | "Node credentials": the attachment installed before test code, one path per form, `fastify.inject` needs `authorization: Bearer <ownerCredential>`, "the MCP gateway needs its own token, not the owner credential: `connectMcpGatewayClient`", the guard named; "Choosing the path" row: "The node's request gate, node credentials, the MCP gateway token, or the shared server test harness … \| The whole server E2E suite (`pnpm test:e2e`) …" | Global style kept. Minor: the bullet "a built one: `startBuiltTestServer` (`test-support/live-e2e/`); both attach the credential. A suite that spawns …" has one over-long source line; not a finding. Round 2: the added sentence "A fixture child that also sends requests to its node attaches the credential in its own process (`attachOwnerCredentialToLoopback`), reading it before it imports the server composition, which consumes it" covers the API-11 form, in the paragraph's global style |
| API-14 | AC-004 | Server typecheck (round 1: with the API-07 file; round 2: with the IR-002 test change) | `pnpm -C autobyteus-server-ts typecheck` | ENV-1 (round 2) | Pass | `API-14-server-typecheck.log` (round 2) | `test-file errors: 1182 in 365 files (baseline 1182 in 365 files)`, `[typecheck] PASS` | Both rounds at baseline |
| API-15 | AC-010 (c), REQ-010 | `tests/e2e/helpers/agy-run-capsule.ts` `findAgyRunCapsule` (D12) | Temporary probe (`node --experimental-strip-types`, script in the log header): a temp memory folder with an `agy-project` without `manifest.json` and one with a half-written manifest naming the target run; then the target's complete capsule | ENV-1 | Pass | `API-15-agy-capsule-lookup-probe.log` | `"whileIncomplete": null`, `"threw": false`, `"whenComplete"` path equals `"expectedPath"`, `"result": "PASS"` | Proves the rule directly; DCF-02's race needs load to show (API-18). Not durable: the rule is three lines in an e2e helper, and its callers' runs exercise it. Script removed |
| API-17 | AC-009, AC-001, REQ-006, REQ-009 | Default server E2E suite and the E-002 file | Reused: IMP-14, IMP-17 | — | Pass | — | — | At `6ffb8f3bcb`/working tree = HEAD's code (`git diff --name-only 6ffb8f3bcb HEAD` lists ticket documents only), `dist` rebuilt after the merge (IMP-13). Checked: `Test Files  123 passed \| 124 skipped (247)`; `✓ …remove-built-in-project-task-manager-startup.e2e.test.ts (4 tests)`; `✓ …mcp-gateway-token.e2e.test.ts (4 tests)`. Delivery's DEL-01 failure (E-002 on the integrated state) is resolved by D10. E-002 asserts the Daily Assistant is a candidate and the Model Router and the retired manager are not, with literal IDs (no product registry import) |
| API-18 | AC-010, REQ-010 | RPE, DCF, DCM (and the daily-assistant collaborator file on the shared capsule helper) under `RUN_AGY_FAILURE_E2E` | Reused: IMP-15, IMP-18, IMP-19, IMP-20 | — | Pass (for AC-010's files) | — | — | IMP-15: the 3 D11/D12 files, `Tests  22 passed (22)`. IMP-18 (all 60 scripted gated files, HEAD's code): RPE, DCF, DCM, daily-assistant `✓`; 0 credential/token refusals; 2 failures outside this ticket: `task-existing-copy-assignment` EXC-E2E-004 and `task-copy-idle-lifetime`. Both pass alone (IMP-19), touch none of this ticket's code, and are follow-ups FU-005, FU-006 by SR-003 DEC-005. DCM-009 passed in 3 load runs (IMP-16, 50 of 60 files with another worktree's `test:unit` alongside; IMP-18; IMP-20 at load average ~40–47); its assertions now print the whole stop result (D13), so a recurrence shows its cause. The code read: D11 asserts the personal setting `agent_team:<id>`/`agent_org:<id>`, the definition read, `defaultLaunchConfig ?? null` null in the package config and a byte-identical package snapshot for a default-only save |
| API-19 | AC-004, AC-005 | Server typecheck and guard on the merged tree | Reused: IMP-21, DEL-03 | — | Pass | — | — | IMP-21 at HEAD's code: `test-file errors: 1181 in 365 files (baseline 1181 in 365 files)`, `[typecheck] PASS` (the merged base shrank the baseline by one). DEL-03: guard `Tests  4 passed (4)` on the integrated `tests/e2e`; D10–D13 add no `buildStudioServer(` or gateway transport (read) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01, API-02, API-17 | Proven on the branch at HEAD's code after the merge (delivery's final run on `personal` remains, REQ-006) | — |
| AC-002 | Yes | API-04, API-05, API-10 (no credential/token refusal in any of 59 scripted gated files) | Proven for the deterministic suites of the inventory and beyond | — |
| AC-003 | Yes | API-01 (three `tool-management/mcp-*` files incl. built-server restart), API-05, API-07 (refusal half on the real server) | Proven | — |
| AC-004 | Yes | API-12, API-01 (refusal suites), API-06, API-14 | Proven | — |
| AC-005 | Yes | API-01 (the 7 fetch-capture files pass unedited: (a)), API-08, API-08b (b), API-09 | Proven. A fixture child that calls its own node is not statically detected: approved residual risk (requirements Non-Goals; CRR-001 C-03 rejected a guard extension because rule 1 would flag the correct `project-mutation-http-node.mjs`); TESTING.md names the rule and API-11c's message names the fix | — |
| AC-006 | Yes | API-12, API-07 | Proven | — |
| AC-007 | No | API-13 | Proven | — |
| AC-008 | No | API-13 | Proven | — |
| AC-009 | Yes | API-17 | Proven | — |
| AC-010 | Yes | API-18, API-15 | Proven: RPE passes; DCF and DCM pass alone and in the gated set; DCM-009's cause could not be recorded because 3 load runs did not reproduce it, which D13 approves; the improved assertion records the cause if it recurs | — |
| REQ-003 (no separate AC beyond AC-002) | Should | API-04, API-05, API-10, API-11, API-11c | Proven for every gated suite up to the node boundary: the scripted ones run in full; the Codex native policy suite's node requests are admitted (round 2); its live Codex part is a Non-Goal | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 95% | Rounds 1–3: API-01…API-19 | Live Codex part of the gated Codex suite not run (Non-Goal, user direction); DCM-009's cause unknown (did not recur in 3 load runs; D13's approved outcome) | A live run when Codex quota and the user allow |
| Changed-boundary execution directness | 95% | 95% | API-07, API-08, API-11, API-15, API-17, API-18 run the real servers, requests and helpers | Paid live suites not run (Non-Goal) | — |
| Cross-boundary integration realism and mock gap | 95% | 95% | Real in-process, built and fixture-child nodes; real MCP SDK client; scripted AGY CLI; the merged base's product | Providers replaced by scripted CLIs or a stand-in past the node boundary | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | Clean env per TESTING.md; `dist` and prepared outputs rebuilt from merged `src` (IMP-13); real launch-credential intake and attachment | Stand-in Codex beyond the node boundary | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | API-07, API-08, API-11c, API-15 (incomplete capsule), API-18 (gated set under load) | Two load-only gated failures outside this ticket (FU-005, FU-006) | Their own Tasks |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | Test harness only; no UI or shell surface | — | — |
| Durable regression coverage quality and relevance | 90% | 95% | Guard, API-07, the 15 files, the fixed gated suites (RPE, DCF, DCM with a self-explaining assertion, the Codex fixture's message), one capsule helper instead of three copies, TESTING.md | Fixture children not statically guarded (approved Non-Goal) | — |

- Overall post-repository confidence: 90% (round 1)
- Overall final confidence: 95% (round 3; round 2 also 95%)
- Calculation method: simple average of the six applicable categories; round 3 (95+95+95+95+95+95)/6 = 95%
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: the live Codex part of the gated Codex native policy suite and other paid live suites are not run (Non-Goal; user direction on Codex limits); fixture children are not statically guarded (approved Non-Goal); DCM-009's original failure has no recorded cause (not reproduced in 3 load runs; its assertion now prints the stop result); two load-only gated failures outside this ticket are FU-005, FU-006 (DEC-005)

## Broader Validation Decision (Mandatory)

- Decision: `Not Required`
- Execution mode: `None`
- Confidence gap or residual risk it addresses, and the expected gain: none remaining in scope; round 1's gap was a defect (API-11), fixed in IR-002 and proven by the same real suite.
- Browser validation needed, and why or why not: No. Test harness only; web probes and release smoke are unchanged (BEH-005) and the attach functions behave as before.
- If `Not Required`: the cases that already exercise the real changed boundary: API-01, API-07, API-10, API-11 run the real servers and requests.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/mcp/mcp-gateway-token.e2e.test.ts` | Added | API-07 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route)
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI | `tests/fixtures/agy-failure-cli.mjs` (project's scripted CLI) | TESTING.md "Runtimes without a model" | Proves transport, not inference |
| Codex CLI and login (API-11) | Stand-in script answering `--version`; placeholder auth file | User direction (no Codex calls today); the defect is reached before any Codex use | The rest of A08 after the first GraphQL call is not exercised |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Planted `tests/e2e/zz-api08-probe.e2e.test.ts` | Yes | Removed after API-08 | Gone (`ls` reports no such file; `git status` shows only the new API-07 test) |
| `/tmp/api11-fake-codex-*`, `/tmp/api11-evidence` (round 1), `/tmp/api11r2-*` (round 2), `/tmp/api11c-*` | Yes | `rm -rf` after copying the sanitized receipt | Removed |
| Test-owned data roots, ports, child processes | Yes (by each suite) | Suites' own teardown; API-11 test removed its private root (`privateRootAndAuthRemoved: true`) | No leftover reported |
| Full logs `API-10-…full.log`, `API-10b-…full.log` | Yes | Kept in the worktree, not committed | Excerpts committed |

## Preliminary Classification (On `Fail`)

Round 2: not applicable (Pass). Round 1's API-11 failure was classified `Local Fix` (implementation), confirmed by failure-origin review CRR-001 (CR-001, CR-002) and fixed in IR-002 (`63dc98b054`, `44ee19f3b8`).

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): None
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: `/software_engineering_team/delivery_engineer` (direct Medium/Low route; test-code review `Not Required — direct low-risk route`)
- Notes: Round 3. FU-002…FU-004 (found by API-10) are now fixed in this ticket by SR-002 (D11, D12, D13; AC-010). FU-005 and FU-006 (IMP-18) are follow-ups by SR-003 DEC-005; they do not block this ticket. Delivery's whole-suite run on the integrated `personal` state remains for AC-001/REQ-006 (REQ-008); `origin/personal` is at `aae0a53a81`, one delivery document past the merged `f78b60dddd`.
