# API/E2E Execution Coverage Report — server-e2e-node-credential-447

## Round

- Coverage investigation (the plan; it lists the upstream documents): `/Users/normy/autobyteus_org/autobyteus-worktrees/server-e2e-node-credential-447/tickets/in-progress/server-e2e-node-credential-447/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: Round 1; Implementation Complete IR-001 on SR-001 (HEAD `bc5f8bfa35`, code as of `9721caf187`)
- Prior round reviewed: None
- Deviations from the investigation's plan, and why: API-10b (rerun of the 3 files that failed in API-10, Rule 9 diagnosis) and API-14 (server typecheck with the new API-07 file) were added during execution.
- Evidence folder (absolute path; the handoff message gives the commit that holds it): `/Users/normy/autobyteus_org/autobyteus-worktrees/server-e2e-node-credential-447/tickets/in-progress/server-e2e-node-credential-447/evidence/api-e2e/`. The full logs `API-10-scripted-agy-gated-all.full.log` (7.9 MB) and `API-10b-three-failing-files-alone.full.log` (430 KB) stay in the worktree uncommitted; their committed excerpts sit next to them.

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery` (not reached: this round fails)
- Proportional test-code review decision: `Not Required — direct low-risk route` (on a later Pass)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `bc5f8bfa35` (code identical to `9721caf187`) | macOS (Darwin 25.5.0) | Node v22.23.1; server `dist/` and Brief Studio package from the worktree bootstrap (`src/` unchanged) | Clean environment `env -i PATH HOME=<resolved temp> TMPDIR`; test-owned data roots and ports; owner credential and gateway token created per process, never printed |
| ENV-2 | ENV-1 + the new `tests/e2e/mcp/mcp-gateway-token.e2e.test.ts` (committed with this report) | as ENV-1 | as ENV-1 | as ENV-1 |
| ENV-3 | as ENV-1 | as ENV-1 | as ENV-1 plus `RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND=<abs>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Scripted AGY CLI, no provider |
| ENV-4 | as ENV-1 | as ENV-1 | as ENV-1 plus `RUN_CODEX_E2E=1 RUN_CODEX_NATIVE_POLICY_LIVE=1`; `CODEX_NATIVE_POLICY_BINARY` = a stand-in script that answers `--version` only; `CODEX_NATIVE_POLICY_AUTH_FILE` = a placeholder file in a temp folder | No real Codex, no model call, the user's `~/.codex` never read (user direction on Codex limits respected) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-003, AC-004, REQ-006 | Whole server E2E suite | Reused: IMP-07 | — | Pass | — | — | Ran at `9721caf187`; `git diff --name-only 9721caf187 bc5f8bfa35` lists only ticket docs/evidence. Summary checked: `Test Files  122 passed \| 123 skipped (245)`, every FU-004 file and the five refusal suites `✓` |
| API-02 | REQ-001, REQ-002 | The 15 files | Reused: IMP-02 | — | Pass | — | — | Same code; also inside API-01 |
| API-03 | RSK-001 | Server integration | Reused: IMP-04 | — | Pass | — | — | Same code; `Test Files  89 passed \| 20 skipped (109)` |
| API-04 | AC-002 | 3 inventory scripted-AGY suites | Reused: IMP-05 | — | Pass | — | — | Same code; rerun again inside API-10 (all three `✓` there) |
| API-05 | AC-002, AC-003 | GitHub remote MCP via gateway on a built server | Reused: IMP-06 | — | Pass | — | — | Same code |
| API-06 | AC-004, BEH-005 | Server and web typecheck | Reused: IMP-01, IMP-08 | — | Pass | — | — | Same code; server typecheck rerun with the new file as API-14 |
| API-07 | AC-003 (refusal half), REQ-002, NAS-25, QR-001 | `/mcp/gateway` on the real in-process studio server | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" NO_COLOR=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/mcp/mcp-gateway-token.e2e.test.ts --no-watch --reporter=verbose` | ENV-2 | Pass | `API-07-mcp-gateway-token-e2e.log` | `Tests  4 passed (4)`; `✓ … refuses the owner credential the test process attaches: it is not the gateway token`; `✓ … refuses a client with no token and one with a wrong token`; `✓ … admits a client connected through connectMcpGatewayClient and lists its tools` | New durable test. Owner credential (attached and named explicitly), no token and a wrong `mcpg_` token are each refused 401 `MCP_GATEWAY_TOKEN_REQUIRED`; the helper's token is admitted; neither secret appears in output. Secret grep of the log: 0 |
| API-08 | AC-005(b), QR-002 | Guard over the real `tests/e2e` tree | Planted `tests/e2e/zz-api08-probe.e2e.test.ts` (direct `buildStudioServer(` and a multi-line bare gateway transport), ran `pnpm -C autobyteus-server-ts exec vitest run tests/architecture/e2e-node-credential-paths.test.ts --no-watch --reporter=verbose`, removed the file, ran again | ENV-1 | Pass | `API-08-guard-planted-file.log` | `"tests/e2e/zz-api08-probe.e2e.test.ts:5 composes a node with buildStudioServer: its requests carry no owner credential. Start it with startStudioE2eRuntimeServer …"` and `"tests/e2e/zz-api08-probe.e2e.test.ts:7 opens the MCP gateway with its own StreamableHTTPClientTransport: the gateway needs its token …"`; after removal `Tests  4 passed (4)` | Temporary probe; the planted file is gone (`ls` confirms). The clean rerun also covers the new API-07 file (no false positive on its `inject`/`fetch` refusals) |
| API-09 | RSK-001, AC-005 | Server `test:unit` incl. `tests/architecture` | `pnpm -C autobyteus-server-ts test:unit`, run alone | ENV-1 | Pass | `API-09-server-test-unit.log` | `Test Files  970 passed \| 5 skipped (975)`, `Tests  8267 passed \| 9 skipped (8276)`, `exit=0` | Closes IMP-03's one failure (attributed to a concurrent Prisma regeneration): a clean full run has none |
| API-10 | REQ-003, AC-002 | Every `RUN_AGY_FAILURE_E2E` gated suite (59 files) | `env -i PATH HOME=<resolved temp> TMPDIR NO_COLOR=1 RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run --no-watch $(grep -rlE RUN_AGY_FAILURE_E2E tests/e2e \| sort)` | ENV-3 | Fail (not from this change) | `API-10-scripted-agy-gated-all-summary.log` | `Test Files  3 failed \| 54 passed \| 2 skipped (59)`; header line `grep NODE_CREDENTIAL_REQUIRED\|MCP_GATEWAY_TOKEN_REQUIRED: 0` | The credential question this case asks is answered: no gated scripted suite is refused for a credential or token. The 3 failures have causes outside this ticket: RPE-001/003/006 stale since autobyteus-95 (FU-002); DCF-02 test reads a capsule before its manifest exists (FU-003); DCM-009 stop `success: false` under load, cause not yet found, request admitted (FU-004). Out of scope, recorded as follow-ups |
| API-10b | Rule 9 diagnosis | The 3 failing files alone | Same as API-10 with the 3 files | ENV-3 | Fail (RPE only) | `API-10b-three-failing-files-alone-summary.log` | `Test Files  1 failed \| 2 passed (3)`; RPE `:243`, `:277`, `:362` fail again | RPE is deterministic (FU-002); DCF and DCM pass alone (narrows to load; causes in FU-003, FU-004) |
| API-11 | REQ-003 | Fixture-composed node of the gated Codex native policy suite (`tests/e2e/runtime/codex-native-multi-agent-disabled.e2e.test.ts` + `tests/fixtures/codex-native-multi-agent-system.mjs`) | `env -i PATH HOME=<resolved temp> TMPDIR NO_COLOR=1 RUN_CODEX_E2E=1 RUN_CODEX_NATIVE_POLICY_LIVE=1 CODEX_NATIVE_POLICY_AUTH_FILE=<temp>/auth.json CODEX_NATIVE_POLICY_BINARY=<temp>/codex CODEX_NATIVE_POLICY_EVIDENCE_DIR=<temp> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-native-multi-agent-disabled.e2e.test.ts --no-watch` | ENV-4 | **Fail** | `API-11-codex-native-fixture-probe.log`, `API-11-codex-native-fixture-receipt.json` | `Node request refused NODE_CREDENTIAL_REQUIRED /graphql from 127.0.0.1`; receipt `"phases": ["owned built Studio ready"]`, `"error": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n401 !== 200\n"` at `codex-native-multi-agent-system.mjs:65` via `:145`/`:148` (the first `createAgentDefinition`) | The child composes its node from `dist` and posts `/graphql` from its own process with no launch credential in its environment (test `:61-63`) and no attachment in the child. Refused before any Codex use; the stand-in binary was only asked `--version`. Same gap as form 3/1b, not in the design's inventory; the guard reads only `tests/e2e/**/*.ts`, so it does not see `tests/fixtures/*.mjs` |
| API-12 | AC-004, AC-006 | Branch diff and evidence | `git diff --name-only 310fc27452...HEAD`; `grep -rEl 'own_[A-Za-z0-9_-]{20,}\|mcpg_[A-Za-z0-9_-]{10,}' tickets/in-progress/server-e2e-node-credential-447/` | ENV-1 | Pass | this row | No `autobyteus-server-ts/src/` or `autobyteus-web/` app path in the diff; grep exit 1 (no match), including the uncommitted full logs | Rechecked over the new API evidence: 0 matches in every API log |
| API-13 | AC-007, AC-008 | TESTING.md | Read "Node credentials" and "Choosing the path" on the branch | ENV-1 | Pass | this row | "Node credentials": the attachment installed before test code, one path per form, `fastify.inject` needs `authorization: Bearer <ownerCredential>`, "the MCP gateway needs its own token, not the owner credential: `connectMcpGatewayClient`", the guard named; "Choosing the path" row: "The node's request gate, node credentials, the MCP gateway token, or the shared server test harness … \| The whole server E2E suite (`pnpm test:e2e`) …" | Global style kept. Minor: the bullet "a built one: `startBuiltTestServer` (`test-support/live-e2e/`); both attach the credential. A suite that spawns …" has one over-long source line; not a finding. Once API-11 is fixed, a fixture that composes and calls its own node in a child process is a sixth form worth one clause there (implementation's call) |
| API-14 | AC-004 | Server typecheck with the API-07 file | `pnpm -C autobyteus-server-ts typecheck` | ENV-2 | Pass | `API-14-server-typecheck.log` | `test-file errors: 1182 in 365 files (baseline 1182 in 365 files)`, `[typecheck] PASS` | The new file adds no error |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01, API-02 | Proven on the branch (delivery reruns on the integrated state, REQ-006) | — |
| AC-002 | Yes | API-04, API-05, API-10 (no credential/token refusal in any of 59 scripted gated files) | Proven for the deterministic suites of the inventory and beyond | — |
| AC-003 | Yes | API-01 (three `tool-management/mcp-*` files incl. built-server restart), API-05, API-07 (refusal half on the real server) | Proven | — |
| AC-004 | Yes | API-12, API-01 (refusal suites), API-06, API-14 | Proven | — |
| AC-005 | Yes | API-01 (the 7 fetch-capture files pass unedited: (a)), API-08 (b), API-09 | Proven for `tests/e2e/**/*.ts`; a node composed inside a `tests/fixtures/*.mjs` child is not seen by the guard (see API-11) | — |
| AC-006 | Yes | API-12, API-07 | Proven | — |
| AC-007 | No | API-13 | Proven | — |
| AC-008 | No | API-13 | Proven | — |
| REQ-003 (no separate AC beyond AC-002) | Should | API-11 | **Not Proven**: the gated Codex native policy suite still calls its fixture-composed node without a credential | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 75% | API-01…API-14 | REQ-003 fails in one gated suite (API-11) | Fix the fixture; rerun API-11 |
| Changed-boundary execution directness | 95% | 95% | API-01, API-07, API-08, API-10, API-11 run the real server and the real requests | Paid live suites not run (Non-Goal) | — |
| Cross-boundary integration realism and mock gap | 95% | 95% | Real in-process and built nodes, real MCP SDK client, scripted AGY CLI, fixture child | Live providers replaced by scripted CLIs | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 90% | Clean env per TESTING.md; real credential intake and attachment; API-11 with a fake Codex stand-in up to the first node request | The fixture gap shows the census's fixture coverage was incomplete; the rest of `tests/fixtures/*.mjs` checked by reading (two others correct) | Extending the guard to `tests/fixtures/` would make this structural |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | API-07 (owner credential, none, wrong token), API-08 (guard failure text), API-01 (restart case) | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | Test harness only; no UI or shell surface | — | — |
| Durable regression coverage quality and relevance | 90% | 90% | Guard, API-07 durable case, the 15 files | Guard does not read `tests/fixtures/` (the API-11 shape) | As above |

- Overall post-repository confidence: 90%
- Overall final confidence: 90%
- Calculation method: simple average of the six applicable categories (75+95+95+90+95+90)/6 = 90%
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes` (AC-001…AC-008); REQ-003 is not met for one gated suite
- Any final applicable category below `90%`: `Yes` — requirement and acceptance-criteria proof (75%)
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: API-11 (REQ-003)

## Broader Validation Decision (Mandatory)

- Decision: `Not Required`
- Execution mode: `None`
- Confidence gap or residual risk it addresses, and the expected gain: the gap is a defect (API-11), not missing evidence; no broader surface would close it.
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

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct route; attached with this failure package for context)
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
| `/tmp/api11-fake-codex-*` (stand-in and placeholder auth), `/tmp/api11-evidence` | Yes | `rm -rf` after copying the sanitized receipt | Removed |
| Test-owned data roots, ports, child processes | Yes (by each suite) | Suites' own teardown; API-11 test removed its private root (`privateRootAndAuthRemoved: true`) | No leftover reported |
| Full logs `API-10-…full.log`, `API-10b-…full.log` | Yes | Kept in the worktree, not committed | Excerpts committed |

## Preliminary Classification (On `Fail`)

- `Local Fix` — owner: implementation engineer. The approved design already covers the remedy (D5's credential handover for a spawned node, with the child also attaching its credential to its own loopback requests, as `tests/e2e/shutdown/busy-run-stop-now-fixture.mjs:17, 66, 70` does): `codex-native-multi-agent-disabled.e2e.test.ts` adds `...builtServerLaunchEnvironment()` to the child environment, and `tests/fixtures/codex-native-multi-agent-system.mjs` calls `attachOwnerCredentialToLoopback(process.env.AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL)` before importing the `dist` composition (the launch-credential intake removes the variable when it loads). Whether the guard should also read `tests/fixtures/` is for the failure-origin review to judge (not required by AC-005's wording; it is how the gap went unseen).
- Verification of the fix without Codex: rerun API-11 as above; the receipt should list phases past `owned built Studio ready` and the log no `NODE_CREDENTIAL_REQUIRED`. The run then stops at the stand-in Codex, which is expected for this probe.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check (IDs): REQ-003 (one gated suite, API-11). No user-only parts.
- Preliminary classification and recommended owner: `Local Fix`, implementation engineer
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review)
- Notes: Out-of-scope failures found by API-10 are recorded as FU-002, FU-003, FU-004 in `follow-ups.md`; they do not block this ticket.
