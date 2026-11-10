# Implementation Handoff — server-e2e-node-credential-447

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Medium/Low, direct implementation route (no independent architecture review), `handoff-SR-001.md`
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-e2e-node-credential-447/tickets/in-progress/server-e2e-node-credential-447/requirements-doc.md` (SR-001, plus "User Direction (2026-11-10)")
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-e2e-node-credential-447/tickets/in-progress/server-e2e-node-credential-447/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-e2e-node-credential-447/tickets/in-progress/server-e2e-node-credential-447/solution-revision-record.md`
- Design spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/server-e2e-node-credential-447/tickets/in-progress/server-e2e-node-credential-447/design-spec.md`
- Supplemental task artifacts: `evidence/REPRO-01-fifteen-files-base.log`, `evidence/PROBE-02-full-e2e-base.log`, `evidence/PROBE-03-early-install-prototype.log`
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence: N/A (initial)

## Current Implementation Summary

Test code only. The server test setup installs the owner-credential attachment before any test code, so a `fetch` a test keeps is already the attached one (root cause of 7 of the 15 files and of 8 gated suites). Every other way a server E2E file reaches its node now has one path: the shared in-process start helper (new `loggingConfig` option; the two runtime GraphQL suites use it instead of composing the node themselves), an explicit owner header on `fastify.inject`, the launch credential in the fixture child's environment, and `connectMcpGatewayClient`, which reads the MCP gateway token from the owner route and connects with it. A guard test fails a directly composed node or a bare gateway client in `tests/e2e`. TESTING.md names each path and the whole-suite run for node-access harness changes; design case 2 records the shape.

- Implementation cycle: `Rework` (IR-003, SR-002 D10–D13; IR-002 Local Fix from CRR-001)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-e2e-node-credential-447/tickets/in-progress/server-e2e-node-credential-447/implementation-revision-record.md`
- Current implementation revision ID: `IR-003` (IR-001 baseline, IR-002)
- Related solution revision IDs: `SR-001`, `SR-002`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `DR-001` (blocked delivery that triggered SR-002)
- Triggering finding IDs: SR-002 (DR-001 DEL-01/DEL-02 E-002; FU-002…FU-004 folded in); earlier CRR-001 CR-001, CR-002
- Commits: `a20e7a822f` (test code + ticket docs), `9721caf187` (`docs(testing)`), `bc5f8bfa35` (IR-001 handoff/evidence); IR-002: `63dc98b054` (fixture fix), `44ee19f3b8` (`docs(testing)`), then the evidence/handoff commit named in the handoff message.; IR-003: `5abf8591db` (D10–D13 test code), `6ffb8f3bcb` (SR-002 ticket docs), then the evidence/handoff commit named in the handoff message.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: design-spec "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: 18 files, all test code, docs or test-support (`git diff --name-only 310fc27452 HEAD`, no `autobyteus-server-ts/src/` or web app path). Early installation changed no unit, integration or E2E result (IMP-03/03b, IMP-04, IMP-07). No escalation trigger fired.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | The 15 files present the credential/token and pass | D1 `tests/setup/test-launch-credential.ts` → `installOwnerCredentialAttachment()`; D2 `studio-runtime-test-server.ts` option + `agent-runtimes-graphql`, `available-agent-runtimes-graphql`; D3 `task-delegation-api-surface`, `workspace-content-rest` (`headers: owner()`); D4 `helpers/mcp-gateway-client.ts` + 3 `tool-management/mcp-*`; D5 `project-mutation-node-locality` | 15 files, 62 tests pass (IMP-02); full suite 0 failed (IMP-07) |
| BEH-002 | Gated suites with the same forms pass under their gates | D1 (capture class, no edit); D4 in `runtime/mcp-run-session-cleanup`, `mcp/mcp-github-remote-live`; IR-002 (D5 shape, REQ-003): `runtime/codex-native-multi-agent-disabled.e2e.test.ts` hands `builtServerLaunchEnvironment()` to `tests/fixtures/codex-native-multi-agent-system.mjs`, which attaches it to its own requests (not in the design's file mapping; note for the Solution Designer) | Scripted AGY: 3 files, 18 tests pass (IMP-05); GitHub MCP live: 1 test pass (IMP-06). Paid live suites not run (Non-Goal). Codex native policy fixture past the gate with a stand-in Codex (IMP-11) |
| BEH-003 | Gate and product code unchanged | No `src/` diff | Refusal suites pass in IMP-07 (`node-access-model` 23, `request-origin-and-phone-routes` 11, `phone-access-running-routes` 3, `node-desktop-routes` 9, `node-files` 5) |
| BEH-004 | Root-cause fix + guard + rules | D1; D6 `tests/architecture/e2e-node-credential-paths.test.ts`; D7/D8 `TESTING.md`; D9 `docs/design-cases.md` | Guard passes on the tree; each self-case flags its sample with file:line, cause and helper (IMP-09) |
| BEH-005 | Probes and release smoke unchanged | `owner-credential-attachment.mjs` attach functions still install idempotently | Web typecheck at baseline (IMP-08); probe files untouched |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `test-support/node-access/owner-credential-attachment.mjs` (+ `.d.mts`): private `install` → exported `installOwnerCredentialAttachment` (same body; attach functions call it).
- `autobyteus-server-ts/tests/setup/test-launch-credential.ts`: calls it after setting the credential.
- `autobyteus-server-ts/tests/e2e/helpers/studio-runtime-test-server.ts`: `options.loggingConfig` (default silent).
- `autobyteus-server-ts/tests/e2e/helpers/mcp-gateway-client.ts` (new): `connectMcpGatewayClient(serverUrl, clientName)`; throws `MCP gateway token read failed: <status>`; closes the client if connect fails; never logs the token.
- `autobyteus-server-ts/tests/architecture/e2e-node-credential-paths.test.ts` (new): rules 1 and 2, two self-cases.
- The 10 e2e files listed in the design's Final File Responsibility Mapping.

## Important Assumptions

- ASM-001 confirmed: once credentialed, all 15 files pass on product grounds (IMP-02, IMP-07).
- ASM-002 confirmed: `project-mutation-node-locality` and `project-task-search-model-unavailable` pass with the loopback attachment (Agent Tools host ignores the header).
- RSK-001 closed: unit, integration and E2E show no change caused by early installation.

## Known Risks

- Not detected statically (design Non-Goal): a new raw `inject` without a header, or a spawned node without its launch credential. TESTING.md names both; such a test fails on its first run with 401.
- Gateway wait loops in `mcp-http-auth-remote-server` and `mcp-http-redirect-and-transport` swallow connect errors, so a token-read failure there shows as "never listed" after the loop's deadline. This is the files' existing retry shape, kept unchanged.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix (test harness)
- Reviewed root-cause classification: Missing Invariant
- Reviewed refactor decision: `Refactor Needed Now` (small, in the harness)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: PROBE-03's prediction held (the 7 capture-class files needed no edit).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes`. The duplicated start sequence and `buildStudioServer` imports were removed from the two runtime files. `Client`/`StreamableHTTPClientTransport` value imports were removed from the 5 gateway files; only `import type { Client }` stays where a variable is typed.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (`StudioE2eRuntimeServerOptions` has one field)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes` (all changed files are test/test-support/doc files; the largest new file is 110 lines)
- Notes: `node-desktop-routes.e2e.test.ts` calls `attachOwnerCredential` itself; it was already like that on base, is a refusal suite and was deliberately left alone by the design.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision: `Yes`
- Direct-use evidence or discard/rebuild result: N/A
- Migration implementation and focused checks: N/A
- Deviation: `None`

## Environment Or Dependency Notes

- Worktree bootstrap (install, prebuild, build, `test:integration:prepare`) from the Solution Designer was reused; `src/` is unchanged, so `dist/` and the prepared outputs stay current.
- User direction (requirements "User Direction (2026-11-10)"): a Codex usage-limit failure would be recorded as blocked, not fixed. None occurred: no check here makes a live Codex call.

## Checks Run

Evidence folder: `tickets/in-progress/server-e2e-node-credential-447/evidence/implementation/`. All runs were on macOS with Node v22.23.1, one heavy run at a time except the IMP-03 incident described below. IMP-01…IMP-03 ran on the working tree with exactly the content of `a20e7a822f`, before it was committed; `9721caf187` adds only TESTING.md.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `a20e7a822f` content | shell env | server `src` + all server test files, `test-support` | AC-004 | Pass | `IMP-01-server-typecheck.log` | `test-file errors: 1182 in 365 files (baseline 1182 in 365 files)` / `[typecheck] PASS` |
| IMP-02 | PROBE-01: `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-server-ts exec vitest run --no-watch <the 15 files>` | `a20e7a822f` content | clean env | the 15 files + setup, attachment, helpers | BEH-001, AC-001, AC-003, REQ-001, REQ-002 | Pass | `IMP-02-fifteen-files-summary.log` | `Test Files  15 passed (15)`, `Tests  62 passed (62)`; 0 `NODE_CREDENTIAL_REQUIRED`/`MCP_GATEWAY_TOKEN_REQUIRED` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit` | `a20e7a822f` content | isolated (setup) | all unit + `tests/architecture` incl. the new guard | RSK-001, AC-005 | Pass after cause found (see IMP-03b) | `IMP-03-server-test-unit-summary.log` | `Test Files  1 failed \| 969 passed \| 5 skipped (975)`; the failure is `application-platform-state-store` `Cannot read properties of undefined (reading 'ModelName')` |
| IMP-03b | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/application-storage/application-platform-state-store.test.ts --no-watch` | `9721caf187` | isolated | that file | RSK-001 | Pass | `IMP-03b-unit-rerun-application-platform-state-store.log` | `Tests  2 passed (2)`. Cause of the IMP-03 failure: during the unit run I ran `pnpm test-vault status`, which regenerated the Prisma client ("Generated Prisma Client" in its output); the file imported `repository_prisma` while the client was being rewritten, so `Prisma.ModelName` was undefined. This was my breach of "one heavy run at a time", not the change (the attachment does not touch Prisma). |
| IMP-04 | `pnpm -C autobyteus-server-ts test:integration` | `9721caf187` | isolated | integration suite with early attachment | RSK-001 | Pass | `IMP-04-server-test-integration.log` | `Test Files  89 passed \| 20 skipped (109)`, `Tests  517 passed \| 69 skipped (586)` |
| IMP-05 | `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run --no-watch tests/e2e/runtime/mcp-run-session-cleanup.e2e.test.ts tests/e2e/agent-definitions/agent-package-definitions-live-refresh.e2e.test.ts tests/e2e/runtime/agy-skill-update-notice-roots.e2e.test.ts` | `9721caf187` | clean env, scripted AGY | D1 (capture class), D4 gateway helper | BEH-002, AC-002 | Pass | `IMP-05-gated-scripted-agy.log` | `Test Files  3 passed (3)`, `Tests  18 passed (18)` |
| IMP-06 | `env -i PATH HOME=<temp> TMPDIR AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_GITHUB_MCP_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/mcp/mcp-github-remote-live.e2e.test.ts --no-watch` | `9721caf187` | clean env, test vault, network to GitHub | D4 on a built server | BEH-002, AC-002 | Pass | `IMP-06-gated-github-mcp-live.log` | `✓ stores the token as a vault reference, discovers the tools and reads the test issue`; secret grep 0 |
| IMP-07 | `env -i PATH HOME=<resolved temp> TMPDIR pnpm test:e2e` | `9721caf187` | clean env | whole server E2E suite | AC-001, AC-003, AC-004, REQ-006 | Pass | `IMP-07-full-e2e-summary.log` (full 1.4 MB log kept in worktree, not committed) | `Test Files  122 passed \| 123 skipped (245)`, `Tests  543 passed \| 599 skipped (1142)` (base: 15 failed \| 107 passed); 3 `NODE_CREDENTIAL_REQUIRED` lines, all from the deliberate refusal case NAS-14 |
| IMP-08 | `pnpm -C autobyteus-web typecheck` | `9721caf187` | shell env | web typecheck incl. cross-package tests (shared `.d.mts`) | BEH-005 | Pass | `IMP-08-web-typecheck.log` | `test-file errors: 96 in 41 files (baseline 96 in 41 files)` / `[typecheck] PASS` |
| IMP-09 | `pnpm -C autobyteus-server-ts exec vitest run tests/architecture/e2e-node-credential-paths.test.ts --no-watch` (also inside IMP-03) | `a20e7a822f` content | isolated | guard rules and self-cases | AC-005, QR-002 | Pass | `IMP-03-server-test-unit-summary.log` (guard included); the self-cases assert the message text | 4 tests pass: tree clean for both rules; the two self-cases flag `tests/e2e/x.e2e.test.ts:2` and `tests/e2e/y.e2e.test.ts:1` |
| IMP-11 | API-11 command: `env -i PATH HOME=<resolved temp> TMPDIR NO_COLOR=1 RUN_CODEX_E2E=1 RUN_CODEX_NATIVE_POLICY_LIVE=1 CODEX_NATIVE_POLICY_AUTH_FILE=<temp>/auth.json CODEX_NATIVE_POLICY_BINARY=<temp>/codex CODEX_NATIVE_POLICY_EVIDENCE_DIR=<temp>/evidence pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-native-multi-agent-disabled.e2e.test.ts --no-watch` (stand-in Codex answers `--version` only; placeholder auth; never `~/.codex`) | `63dc98b054` content (before its stderr line; see header) | clean env, no Codex, no model | fixture child credential (IR-002) | REQ-003, BEH-002 | Pass for the credential question; the suite ends at the stand-in Codex, as expected | `IMP-11-codex-native-fixture-credential.log`, `IMP-11-codex-native-fixture-receipt.json` | `A08 checkpoint owned built Studio ready`; receipt has a `teamId` and `"error": "Error: Timeout: production Codex thread after user command"` at `inventory` (`:97`/`:170`, past `createAgentDefinition`); 0 `NODE_CREDENTIAL_REQUIRED`; 0 `own_` |
| IMP-11b | `env -i PATH node tests/fixtures/codex-native-multi-agent-system.mjs /tmp/none m` | `63dc98b054` | no credential | missing-credential branch | QR-001, AC-006 | Pass | `IMP-11b-fixture-missing-credential.log` | `AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL is missing from the fixture's environment: the suite adds builtServerLaunchEnvironment().`, `exit=1` |
| IMP-12 | `pnpm -C autobyteus-server-ts exec vitest run tests/architecture/e2e-node-credential-paths.test.ts --no-watch`; `pnpm -C autobyteus-server-ts typecheck` | `63dc98b054` | shell env | guard over tests/e2e; typecheck of the changed test file | AC-005, AC-004 | Pass | `IMP-12-guard-and-typecheck.log` | `Tests  4 passed (4)`; `test-file errors: 1182 in 365 files (baseline 1182 in 365 files)` / `[typecheck] PASS` |
| IMP-13 | `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild`, `build`, `test:integration:prepare` (the `origin/personal` merge changed server `src`) | `8b7c60e343` | shell env | built outputs for the runs below | — | Pass | `IMP-13-rebuild-after-merge.log` | `build exit=0`, `Integration test prerequisites are present.` |
| IMP-14 | D10: `env -i PATH HOME=<temp> TMPDIR NO_COLOR=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts --no-watch` (DEL-02's command) | `5abf8591db` content | clean env | E-002 `@` candidates | REQ-009, AC-009 | Pass | `IMP-14-e002-file.log` | `✓ E-002 …`, `Tests  4 passed (4)` |
| IMP-15 | D11/D12: RPE, DCF and `daily-assistant-collaborator` with `RUN_AGY_FAILURE_E2E=1` + scripted AGY | `5abf8591db` content | clean env, scripted AGY | personal-settings default, capsule helper | REQ-010 b, c | Pass | `IMP-15-d11-d12-files.log` | `Test Files  3 passed (3)`, `Tests  22 passed (22)`; RPE-001/003/006, DCF-02 pass |
| IMP-16 | D13 load attempt 1: the gated set (as IMP-18), stopped by me at 50 of 60 files when the Solution Designer's STOP arrived (later cancelled); another worktree's `test:unit` ran alongside | `6ffb8f3bcb` | clean env, scripted AGY, loaded machine | DCM-009 under load | REQ-010 d | No failure among the 50 finished files; DCM-009 passed | `IMP-16-gated-set-partial-load-attempt-1.log` | `✓ tests/e2e/projects/delegated-copy-model-change.e2e.test.ts (9 tests)` |
| IMP-17 | Full `env -i PATH HOME=<temp> TMPDIR NO_COLOR=1 pnpm test:e2e` | `6ffb8f3bcb` (code `5abf8591db`) | clean env | whole default server E2E suite | AC-001, REQ-006, REQ-009 | Pass | `IMP-17-full-e2e-summary.log` | `Test Files  123 passed \| 124 skipped (247)`, `Tests  547 passed \| 606 skipped (1153)`; 0 failed |
| IMP-18 | Deterministic gated set: `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run --no-watch $(grep -rlE RUN_AGY_FAILURE_E2E tests/e2e \| sort)` (60 files); also D13 load attempt 2 | `6ffb8f3bcb` | clean env, scripted AGY, load average ~39 | every scripted-AGY gated suite | REQ-003, REQ-010, AC-002, AC-010 | **Fail: 2 files, outside D10–D13 (below)** | `IMP-18-gated-agy-set-summary.log` | `Test Files  2 failed \| 56 passed \| 2 skipped (60)`; RPE, DCF, DCM (all 3 DCM-009) pass; failures `task-copy-idle-lifetime` and `task-existing-copy-assignment` EXC-E2E-004 |
| IMP-19 | The two IMP-18 failures alone (same env) | `6ffb8f3bcb` | clean env, scripted AGY | the two files | — | Pass alone (narrows, not a cause) | `IMP-19-two-gated-failures-alone.log` | `Test Files  2 passed (2)` |
| IMP-20 | D13 load attempt 3: DCM with the other delegated-copy files in one run | `6ffb8f3bcb` | clean env, scripted AGY, load average 47/41/40 | DCM-009 | REQ-010 d | Pass; DCM-009 did not reproduce | `IMP-20-dcm-load-attempt-3.log` | `✓ DCM-009: team root …`, org, agent; `Tests  18 passed (18)` |
| IMP-21 | `pnpm -C autobyteus-server-ts typecheck` | `6ffb8f3bcb` | shell env | server src + tests | — | Pass | `IMP-21-server-typecheck.log` | `test-file errors: 1181 in 365 files (baseline 1181 in 365 files)` / `[typecheck] PASS` |
| IMP-10 | Diff + evidence grep: `git diff --name-only 310fc27452 HEAD`; `grep own_…/mcpg_…` over all evidence | HEAD | — | — | AC-004, AC-006 | Pass | this row | no `autobyteus-server-ts/src/` or web-app path; 0 secret matches in every evidence file |

- Not run, and why: paid live-provider suites (five native live harness suites, `autobyteus-anthropic-prompt-caching-live`); Non-Goal, they share the D1 mechanism proven by IMP-02/IMP-05. Release smoke and web probes: unchanged (BEH-005), left to API/E2E's judgment.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable: test harness and docs only, no rendered frontend.

## Downstream Coverage Hints / Suggested Scenarios

- AC-005(a) by construction: a test file that captures `globalThis.fetch` at describe scope before starting its node carries the credential (the 7 capture-class files are this shape and pass with no edit).
- AC-003 restart: `mcp-http-auth-remote-server` re-reads the token after a built-server restart (passes).
- A gateway client without the token is still refused (AC-003 second half): proven at integration level by `tests/integration/mcp-gateway/mcp-gateway-routes.integration.test.ts` (`MCP_GATEWAY_TOKEN_REQUIRED`, passes in IMP-04); no server E2E case asserts it. API/E2E may add one if it judges the E2E layer needs it.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Independent validation per the team route. IR-002 changes only the Codex native policy suite and its fixture (not in the default run, gated) and TESTING.md: rerun API-11, the guard and the typecheck. IMP-02, IMP-05, IMP-06 and IMP-07 exercise neither file and stay valid (TESTING.md "Rerun by impact").
- Delivery's whole-suite run on the integrated `personal` state (AC-001, REQ-006, REQ-008).

## SR-002 Implementation (IR-003)

- **D10** (`remove-built-in-project-task-manager-startup.e2e.test.ts`): a `MODEL_ROUTER_ID` constant beside `BUILT_IN_IDS`. The AC-009 check expects the repository manager and the Daily Assistant among the candidates, and the Model Router and the retired manager not. The comment names autobyteus-455. `BUILT_IN_IDS` stays for the catalog checks. The product registry is not imported.
- **D11** (`registered-package-definition-edit.e2e.test.ts`):
  - RPE-001/003: the saved default is asserted in `<app-data>/agent-packages/personal-settings.json` under `agent_team:<id>` / `agent_org:<id>` (exact record `{ defaultLaunchConfig: {runtimeKind, llmModelIdentifier, llmConfig: null} }`), and in the definition read. The package config file's `defaultLaunchConfig` stays null. The description is still in `team.md` / `org.md`.
  - RPE-006: a default-only save leaves the package Team folder byte-identical (snapshot before/after); the personal setting and the definition read carry the new default; the copy runs on it.
  - The header text is updated; the scenario IDs are kept.
- **D12**: there were three copies of the walk: `delegated-copy-project-folder`, `daily-assistant-collaborator`, and `collaboration-root-harness`'s `capsuleOf`. One helper, `tests/e2e/helpers/agy-run-capsule.ts` `findAgyRunCapsule(memoryDir, runId)`, replaces them. It skips a capsule whose `manifest.json` is missing or not yet complete (the writer writes it last, `agy-run-capsule.ts:58-70`). The harness keeps its `capsuleOf` (path, or a throw naming the run).
- **D13**:
  - DCM-009's two stop assertions now show the whole result (`outcome`, `message`) on failure.
  - DCM-009 did not reproduce in 3 load runs (IMP-16 partial gated set, IMP-18 full gated set, IMP-20 delegated-copy files together; load average 39–47). No timing was changed.
  - From the product code, a `success: false` stop is `NOT_FOUND`, `ROOT_NOT_ACTIVE` or `INTERNAL_ERROR` (`delegated-launch-selection-service.ts:45-46`, `delegated-launch-selection-command.ts:159-174`). The next occurrence will name which one.
- **Not green: the deterministic gated set (IMP-18), 2 failed files.** Neither uses a file changed in IR-001…IR-003, and both pass alone (IMP-19).
  - `projects/task-existing-copy-assignment` **EXC-E2E-004** (QR-001: DONE of a copy's Task and its next assignment as parallel tool calls, both orders). At offset 7 the product refused the assignment: `Task … was given to the task agent, but the message with its work was not delivered (The task agent exc_worker_… could not continue with its conversation: Task TeamRun 'exc_squad_…' is already active or reserved.)`. The refusal comes from the product's own restore/reservation path while the copy was being reserved by the parallel call. This points to a product race under load, which needs the Solution Designer before any product change. Not investigated further here.
  - `projects/task-copy-idle-lifetime`: the org root's worker copy reported `background running`, but no `idle` status with a later timestamp arrived within 60 s (`task-copy-idle-lifetime.e2e.test.ts:381`, `signal` default 60 s). Cause not established. One candidate is that under load the AGY background monitor's `running` update arrives after the copy's `idle` status, so the test's `e.at >= running.at` ordering never matches. The other is the turn end taking more than 60 s at load ~39. Separating the two needs the frame log, which the file only keeps with its evidence dir set.
