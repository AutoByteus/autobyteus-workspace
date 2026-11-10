# API/E2E Coverage Investigation — server-e2e-node-credential-447

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-e2e-node-credential-447/tickets/in-progress/server-e2e-node-credential-447/requirements-doc.md` (SR-001, with "User Direction (2026-11-10)")
- Investigation Notes: `.../server-e2e-node-credential-447/investigation-notes.md`
- Solution Revision Record: `.../server-e2e-node-credential-447/solution-revision-record.md`
- Design Spec (required on every route): `.../server-e2e-node-credential-447/design-spec.md`
- Supplemental Task Artifacts: `evidence/REPRO-01-fifteen-files-base.log`, `evidence/PROBE-02-full-e2e-base.log`, `evidence/PROBE-03-early-install-prototype.log`
- Design Review Report: `N/A — not applicable` (direct Medium/Low route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `.../server-e2e-node-credential-447/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `.../server-e2e-node-credential-447/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `.../server-e2e-node-credential-447/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: Implementation Complete, IR-001 on SR-001, branch `codex/server-e2e-node-credential-447`, HEAD `bc5f8bfa35`
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

Test code only. Every server E2E suite must reach its test-owned node with the launch owner credential and the MCP gateway with its own token (REQ-001…REQ-003), with no product change (REQ-004), the attachment installed before any test code plus a guard for the shapes a static check can see (REQ-005), and TESTING.md rules (REQ-007, REQ-008). Design D1–D9: attachment installed from `tests/setup/test-launch-credential.ts`; one in-process start path (`startStudioE2eRuntimeServer` with `loggingConfig`); explicit owner header on `fastify.inject`; `builtServerLaunchEnvironment()` for a fixture child; `connectMcpGatewayClient`; guard `tests/architecture/e2e-node-credential-paths.test.ts`; TESTING.md; design case 2.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (default `pnpm test:e2e`), SCN-002 (gated suites under their `RUN_*` gate), SCN-003 (gate contract unchanged), SCN-004 (a new test file). SCN-005 is out of scope (no change).
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-002 widened: every gated suite that runs deterministically with the scripted AGY CLI (`RUN_AGY_FAILURE_E2E=1`, 59 files), not only the three of the design's inventory. Real trigger: an engineer sets that gate per TESTING.md "Runtimes without a model". The design's census was by reading for known patterns; a run of all of them is direct proof.
  - SCN-002, a gated suite whose node is composed inside a fixture child (`tests/fixtures/*.mjs`) and called from that child: found by my census of node-composing fixtures. `tests/e2e/runtime/codex-native-multi-agent-disabled.e2e.test.ts` + `tests/fixtures/codex-native-multi-agent-system.mjs` composes a node from `dist`, listens, and posts `/graphql` from the child with no launch credential and no attachment. Not in the design's inventory; the guard reads only `tests/e2e/**/*.ts`. Real trigger: `RUN_CODEX_E2E=1 RUN_CODEX_NATIVE_POLICY_LIVE=1 CODEX_NATIVE_POLICY_AUTH_FILE=…` (its header).
  - SCN-001 / NAS-25 at E2E level: an MCP client that uses the owner credential (what the attachment adds automatically) or no token is refused at the real server's gateway, and the helper's token is accepted (AC-003 second half; today only integration covers the refusal).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 (15 default-run files) | Changed | REPRO-01, IMP-02, IMP-07 | Full suite green proves it; reuse IMP-07 |
| BEH-002 (gated suites) | Changed | Census, IMP-05, IMP-06 | Run every scripted-AGY gated suite; probe the fixture-composed Codex suite up to its first node request |
| BEH-003 (gate, gateway token) | Preserved | No `src/` diff | Diff check; refusal suites in IMP-07; new E2E gateway refusal case |
| BEH-004 (early, clear failure) | Changed | D1, D6 | Guard on the real tree with a planted bad file; unit run |
| BEH-005 (probes, release smoke) | Preserved | Attach functions unchanged apart from calling the renamed install | Web typecheck (IMP-08); code read |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No (product); Yes (test clients) | Test clients' HTTP/GraphQL/inject/MCP requests to the node | Full E2E suite | Gated suites not in the default run | Gated runs |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No | — | — | — | — |
| Authentication / session / permissions | Yes (test side) | Owner credential and gateway token presentation | IMP-02/07; integration gateway test | Gateway refusal on the real server not asserted at E2E | Durable E2E case |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes (test side) | Fixture child nodes and their credential | `project-mutation-node-locality` | Fixture-composed nodes in gated suites | Probe |
| Persisted-data transition | No | — | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes (gated) | GitHub remote MCP via gateway | IMP-06 | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-e2e-node-credential-447`, branch `codex/server-e2e-node-credential-447`, base `origin/personal` `310fc27452`
- Project type and runtime stack: pnpm monorepo; server `autobyteus-server-ts` (Fastify, Prisma/SQLite, Vitest); macOS, Node v22.23.1
- Project testing guideline path(s): `TESTING.md` (repository root; read in full on the branch, including this ticket's D7/D8 edits). No closer `TESTING*.md` under `autobyteus-server-ts/`.
- Conflicting, missing, or unclear project instructions: None. TESTING.md "Rerun by impact" allows reuse of IMP-0x runs: no code changed after `9721caf187` (`bc5f8bfa35` adds ticket docs and evidence only).
- Changed build-input paths: `None`. Changed paths are `TESTING.md`, `docs/design-cases.md`, `autobyteus-server-ts/tests/**`, `test-support/node-access/*`; no manifest, lockfile, tsconfig, baseline, scripts, workflow or contract package, and no new import of another workspace package (`@modelcontextprotocol/client` is an existing npm dependency of the server). No fresh-start build case.
- Required environment variables or secrets available: `Yes` for what the planned cases need (no provider keys; the scripted AGY CLI is in the repository; no real Codex auth is used).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Project testing guideline | Clean env `env -i PATH HOME=<resolved temp> TMPDIR`; one heavy run at a time; Rule 9; rerun by impact; scripted AGY gate; never store credentials/tokens in evidence |
| `AGENTS.md` (root) | Repository instructions | Test vault only through `AUTOBYTEUS_TEST_VAULT`; not needed here |
| `autobyteus-server-ts/package.json` | Scripts | `test:unit` = `vitest run tests/unit tests/app-data-migrations tests/architecture tests/agent-work-journal`; one file: `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch` |
| `autobyteus-server-ts/vitest.config.ts` setupFiles | Per-file setup | `tests/setup/test-launch-credential.ts` runs before every test file |
| Test file headers (gated suites) | Gate and command | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs`; Codex native policy suite: `RUN_CODEX_E2E=1 RUN_CODEX_NATIVE_POLICY_LIVE=1 CODEX_NATIVE_POLICY_AUTH_FILE=<auth.json>` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build outputs (`dist/`, Brief Studio package) | worktree | From the Solution Designer's bootstrap; `src/` unchanged since | — | `dist/app.js` present | Untracked, left as is |
| Test-owned nodes | `autobyteus-server-ts` | Started by each suite | Own temp data roots and free ports | Suite's own | Suite's own teardown |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Owner credential, gateway token | Test setup creates them per process; gateway token read from the owner route | Never printed; evidence grepped for `own_`/`mcpg_` | Process-scoped |
| Fake Codex auth for the API-11 probe | A temp folder with placeholder `auth.json`, `config.toml`, `models_cache.json` and a fake `codex` that only answers `--version` | Never the user's `~/.codex`; no model call | Temp folder removed |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| The 15 FU-004 files | Their product assertions, unchanged | REQ-001, REQ-002, AC-001, AC-003 | Still Valid | IMP-02, IMP-07 | Reuse |
| `tests/architecture/e2e-node-credential-paths.test.ts` (new) | Rules 1 and 2 over `tests/e2e/**/*.ts` with self-cases | REQ-005, AC-005 | Still Valid | IMP-09 | Probe it on the real tree with a planted file |
| `tests/integration/mcp-gateway/mcp-gateway-routes.integration.test.ts` | Gateway refuses missing/wrong token (route composition) | AC-003 second half | Still Valid | IMP-04 | Keep; add the E2E case on the full server |
| Refusal suites (`node-access-model`, `remote-access/*`, `node-files`, `node-desktop`) | Deliberate no-credential refusals | AC-004 | Still Valid (unchanged) | IMP-07 | Reuse |
| Scripted-AGY gated suites (59 files) | Their own behavior | REQ-003, AC-002 | Unclear until run (only 3 run by implementation) | IMP-05 | Run all |
| `tests/e2e/runtime/codex-native-multi-agent-disabled.e2e.test.ts` + `tests/fixtures/codex-native-multi-agent-system.mjs` | Live Codex native policy A08 | REQ-003 | Needs Update (by reading: the child's `/graphql` calls carry no credential) | Read; API-11 probe | Prove by probe; route |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-003, AC-004, REQ-006 | Whole server E2E suite | Reused | IMP-07 | Ran at `9721caf187`; `git diff --name-only 9721caf187 bc5f8bfa35` touches only ticket docs/evidence; summary shows the counts and every file line |
| API-02 | REQ-001, REQ-002 | The 15 files | Reused | IMP-02 | Same commit content; covered again by API-01 |
| API-03 | RSK-001 (D1 inert outside E2E) | Server integration | Reused | IMP-04 | Ran at `9721caf187` |
| API-04 | AC-002 | 3 inventory scripted-AGY suites | Reused | IMP-05 | Ran at `9721caf187`; included again in API-10 |
| API-05 | AC-002, AC-003 | GitHub remote MCP via gateway on a built server | Reused | IMP-06 | Ran at `9721caf187` |
| API-06 | AC-004, BEH-005 | Server and web typecheck | Reused | IMP-01, IMP-08 | No code change since |
| API-07 | AC-003 (refusal half), REQ-002, NAS-25 | `/mcp/gateway` on the real in-process server | Durable | New `tests/e2e/mcp/mcp-gateway-token.e2e.test.ts`; `env -i … pnpm -C autobyteus-server-ts exec vitest run <it> --no-watch` | No E2E case asserts the gateway refuses the owner credential/no token on the full server |
| API-08 | AC-005(b), QR-002 | Guard on the real tree | Temporary Probe | Plant `tests/e2e/zz-probe-*.e2e.test.ts` with `buildStudioServer(` and a bare gateway transport; run the guard; remove | The self-cases test the detector on strings; this proves the real file walk flags a real file and names the fix. Not durable: a planted file in the tree cannot stay |
| API-09 | RSK-001, AC-005 | Server `test:unit` incl. `tests/architecture` | Existing Test | `pnpm -C autobyteus-server-ts test:unit` alone | IMP-03 had one failure attributed to a concurrent Prisma regeneration; a clean full run removes the doubt |
| API-10 | REQ-003, AC-002 | Every `RUN_AGY_FAILURE_E2E` suite (59 files) | Existing Test | `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run --no-watch <59 files>` | Direct proof that no deterministic gated suite still misses its credential |
| API-11 | REQ-003 | Fixture-composed node in the Codex native policy suite | Temporary Probe | Real suite with its gates, a fake Codex binary (`--version` only) and placeholder auth; observe the child's first `/graphql` result | The suite is live Codex (user direction: no Codex calls today); its first node request happens before any Codex use, so the credential gap can be proven without a model |
| API-10b | Rule 9 diagnosis of API-10 | The 3 files that failed in API-10 | Existing Test | Same command, the 3 files alone | Added during execution: narrows load-dependent from deterministic failures before finding causes |
| API-14 | AC-004 (test files typecheck) | Server typecheck with the API-07 file | Existing Test | `pnpm -C autobyteus-server-ts typecheck` | Added during execution: a new test file must not grow the test-file baseline |
| API-12 | AC-004, AC-006 | Diff and evidence | Existing Test | `git diff --name-only 310fc27452...HEAD`; grep `own_…`/`mcpg_…` over the ticket folder | Direct check |
| API-13 | AC-007, AC-008 | TESTING.md | Existing Test (docs review) | Read TESTING.md "Node credentials" and "Choosing the path" on the branch | Docs criteria |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-07 | `autobyteus-server-ts/tests/e2e/mcp/mcp-gateway-token.e2e.test.ts` | NAS-25 on the real server: the owner credential the attachment adds is not the gateway's secret (401 `MCP_GATEWAY_TOKEN_REQUIRED`), a client with no or a wrong token is refused, and `connectMcpGatewayClient` is admitted. Keeps the helper honest: if the gateway ever accepted the owner credential, or the helper stopped presenting the token, this fails |

## Durable Coverage To Update

None by API/E2E. The Codex native policy fixture's credential gap (API-11) is implementation scope (REQ-003) and is routed, not fixed here.

## Durable Coverage To Remove

None.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Paid live suites (native live harness ×5, `autobyteus-anthropic-prompt-caching-live`, live Codex/Claude/Grok/LM Studio/DeepSeek suites) | Non-Goal; user direction on Codex limits | They share D1/D4; the fixture-child shape is probed by API-11 | No | None |
| Web probes, release smoke | BEH-005, no change; attach functions only call the renamed install | Negligible | No | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| Codex native policy suite's fixture child composes and calls its node with no credential (missed by the census; the guard reads only `tests/e2e/**/*.ts`) | Reproduced by API-11 (401 `NODE_CREDENTIAL_REQUIRED` on the child's first `/graphql`); preliminary `Local Fix`, routed through failure-origin review | Read: `tests/fixtures/codex-native-multi-agent-system.mjs:37-41, 63-66, 141-147`; the test's child env has no `AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL` (`codex-native-multi-agent-disabled.e2e.test.ts:61-63`) | Implementation engineer (via failure-origin review) |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (API-07 added)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: The fixture finding is an execution-level question first (API-11); if it reproduces, it is a `Fail` routed through failure-origin review.
