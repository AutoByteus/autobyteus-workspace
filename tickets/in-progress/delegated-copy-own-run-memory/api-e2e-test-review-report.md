# API/E2E Test Review Report

## Review Meta

- Review Round: 4 (merged-state delta; rounds 1–3 = CRR-004, CRR-006, CRR-008)
- Trigger: `api_e2e_engineer` API-REV-001 Pass (~93%)
- Requirements Doc Reviewed As Context: `requirements-doc.md` (REQ-004, REQ-008, REQ-009, REQ-017, REQ-019; AC-004..AC-016, AC-019, AC-020)
- Investigation Notes Reviewed As Context: through the design and contract
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-009)
- Design Spec Reviewed As Context: `design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: `memory-layout-contract.md` §3.1, §3.2, §10, §12.3
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-004
- Implementation Revision Record Reviewed As Context: IR-001, IR-002
- Original Code Review Report: `code-review-report.md` (CRR-003 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-010`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- API/E2E Result: Pass
- Final Validation Confidence: ~93%
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline(s) applied: `TESTING.md`. Relevant rules: built server tested from a fresh build; never the user's data; root-container recipes (§ Environment-specific setup). No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`:
  - SCN-007 (startup upgrade of an install where every earlier migration completed);
  - AC-010 (a failed step under REQ-007's continuation contract);
  - AC-012 (delete);
  - AC-005 (G1/G2) through the real routes.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/task-agent-own-run-startup.e2e.test.ts` | Added | AC-005/006/008/010/011/012/013, REQ-008 | the built server upgrading a faithful released install (TAU-1..3) | The ledger is made realistically: a first start of this build, then this migration's row removed. Data is the hand-built released fixtures with runtime values swapped and shapes unchanged. Checks byte hashes per file. Enters through the real startup, GraphQL and REST routes |
| `.../tests/e2e/projects/task-reactivation-root-visibility.e2e.test.ts` | Updated (stale layout) | REQ-004 | the resumed conversation is bound to the worker | now also accepts the worker's own `run_metadata.json` (`runId` key); the check still requires that record to hold the resumed id |
| `.../tests/e2e/projects/delegated-launch-config-defaults.e2e.test.ts` | Updated (stale layout) | contract §3.2 | the "pre-change record" simulation | also strips `taskAgent.launchSource` from the task team's own tree, where the default launch source now lives |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | TAU-1..3 map to ACs; the header lists what is and isn't covered (AC-004 is in the desktop journey) |
| Assertions prove approved requirements | Pass | per-file hash equality for every moved folder; nothing left behind; runs open with their task agents; conversation and context file read from the own folder; G1/G2 refusals; Memory page attribution; second start unchanged; the model edit stored in the own file |
| Fixtures and helpers reused | Pass | reuses `released-task-agent-layout-fixtures.ts` (`writeReleasedDataRoot`, `snapshot`, `OLD_FOLDERS`/`NEW_FOLDERS`) |
| Isolation and determinism | Fail | test-owned temp roots, its own HOME and database, cleanup in `afterEach`. But TAU-2's `chmod 0o555` does not block for a root user, and TESTING.md supports root containers (TR-001) |
| Large files coherent | Pass | 271 lines, one boundary |
| No stale or compatibility-only tests | Fail | the comment at line 186 claims "the hub is" restored, which the test does not assert and which runs 3/4 showed fails on hand-built data (TR-002) |
| Coverage agrees with the investigation and evidence | Fail | final runs pass (`TAU-run9.log` 3/3, `TAU-run7.log`), but runs 1–4 and 8 failed and the ledger does not mention them (TR-002) |
| Callers exercise an independently established scenario | Pass | every assertion goes through product routes; the context-file URL is the form the app stores for an Agent-root copy (`/rest/agent-collaborations/<host>/agent-runs/<id>/…`, `context-file-owner-types.ts:189` at base) |
| Real trigger, no setup real use doesn't produce | Pass | the ledger row removal reproduces an install upgrading from the previous release. Forcing a step failure through permissions stands for REQ-007's "a step failed" contract |

Evidence checked by the reviewer:
- TAU run logs 1–9: final 3/3. Run 8 failed only because an earlier draft fetched the standalone route `/rest/runs/<copy>/…`, which never served copies, so it wasn't a product regression.
- Desktop evidence: the migration log, before/after file lists and screenshots exist. The ledger's claims match the logs.
- Credential scan of `evidence/api-e2e`: the only key-shaped strings are test skill IDs (`sk-reactivation…`); no secrets. `import-secrets.exp` prints IDs and statuses only.

## Findings

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| TR-001 | `task-agent-own-run-startup.e2e.test.ts` TAU-2 | Lines 209–210 make a step fail with `fs.chmod(blocked, 0o555)`. A root user ignores the mode bits, so in the root containers TESTING.md supports, the first start succeeds and `expect(migration.status).not.toBe("SUCCEEDED")` fails. On win32 the mode does not block either. Precedent: `project-task-boundaries.e2e.test.ts:624` skips its unreadable case when `process.getuid?.() === 0`; the secret-management e2e tests guard `chmod` on win32 | Guard TAU-2 the same way (skip with a reason when the process is root or on win32), or check that the block holds before relying on it | Local Fix / `api_e2e_engineer` |
| TR-002 | ledger TAU rows; test line 186 | `evidence/api-e2e/TAU-run1..4,8.log` failed, and the ledger cites only `TAU-run7`/`TAU-run9`. The causes were authoring iterations: run 1 null org via the history listing; run 2 the hub missing from a listing; runs 3–4 "the hub restores: expected true to be false" plus the TAU-4 wake; run 8 the standalone context-file route. The line 186 comment "…; the hub is." states a restore the test does not assert, and runs 3/4 show it fails on this hand-built data (the reason TAU-4 moved to the desktop journey) | Record runs 1–4 and 8 in the ledger with their causes. Reword line 186 to match what is asserted | Local Fix / `api_e2e_engineer` |

## Follow-ups

| Follow-up ID | What is wrong, where | Evidence | Why outside | Suggested Task description |
| --- | --- | --- | --- | --- |
| FU-5 (withdrawn: now in scope as DEC-018 / CR-004) | Memory page group label for an agent task agent shows the definition ID ("code-reviewer"), not its name | API/E2E observation; the label comes from the history index row (`agent-memory-explorer-service.ts:134-142`), which task agents never have | AC-013 (listed under its definition, never "Unattributed") is met; label quality is new polish | resolve the group label from the agent definition when there is no history row |
| FU-6 | 5 s product bounds miss under heavy machine load: package-auto-refresh AC-012, live-refresh DCF-E2E-007 | `R3d-auto-refresh-1/2.log` (pass alone 14/14), the e2e log | not touched by this ticket | make the bounds load-tolerant, or measure from the server event |

- Sent to: `/project_task_manager` (CRR-004 follow-up message). Recorded:
  - FU-5 → part 2 of the Memory-page view Task `50e82cf7`.
  - FU-6 → part 2 of the timing-determinism Task `7e13a4af`.
  - Both TODO.
- Scope question (not a test-code finding): API/E2E did not test the AC-020 sub-case where `20260926_team_context_file_execution_locators_v1` is pending together with ours, by the user's decision. REQ-017 says "any supported earlier release". Sent to `/software_engineering_team/solution_designer` to narrow REQ-017/AC-020 or add a follow-up test.
- Noted for the record: AC-019 inventory gap. The implementer's e2e run had the scripted-AGY gate off (78 files skipped), so two stale projects tests were missed; API/E2E updated them.

## Round 2 Resolution (CRR-006, API-REV-002)

| Finding ID | Prior Status | Current Status | Verification Evidence |
| --- | --- | --- | --- |
| TR-001 | Local Fix | Resolved | `modeBitsBlock = process.platform !== "win32" && process.getuid?.() !== 0` (line 35, as in `project-task-boundaries`). TAU-2 is `it.skipIf(!modeBitsBlock)` with the reason in its title. After the chmod it checks that a write into the blocked folder rejects with EACCES/EPERM (line 214). The header states the condition. `TAU-run10.log`: 3/3 |
| TR-002 | Local Fix | Resolved | ledger row `TAU-auth` records runs 1–4, 6 and 8 with errors and causes (all in the test or its hand-built data; none a product failure). The line-186 comment now says what is asserted |

## Round 3 — CR-004 Rerun (CRR-008, API-REV-003)

- **Changed durable test:** TAU-1's Memory page block in `task-agent-own-run-startup.e2e.test.ts` (lines 192–202, uncommitted).
  - It creates the definition "Code Reviewer" through `createAgentDefinition`, as a user would, and asserts the generated id is `code-reviewer`, the id the released task agent names.
  - It asserts the task agents' group shows displayName "Code Reviewer" and the `helper` group (no definition) falls back to "helper" (DEC-018), and that search by name finds `code-reviewer`.
  - The rest of TAU-1 is unchanged.
- **Checks:**

| Check | Result | Notes |
| --- | --- | --- |
| Assertions prove the requirement | Pass | the name, the fallback and search are all asserted |
| Real trigger | Pass | the definition is created through the product mutation, not seeded |
| Determinism | Pass | depends only on the slug of a fixed name, which is asserted explicitly |
| Coverage matches evidence | Pass | `round2/M6-memory-e2e-and-tau.log`: TAU 3/3; memory-collaboration, imported-team-memory, memory-explorer, memory-view and memory-sync-api pass. memory-sync-multiprocess fails in its `writeCurrentNestedTeamPackage` seed: the known baseline failure, fixed on `origin/personal` by `42965d5043` (reviewer confirmed it is on origin/personal) |

- Rerun by impact from `2f7f5b3f4b`: only the explorer service and its test changed, so the selection was right. The desktop rerun was correctly skipped, because the web shows the server's displayName as it is.

## Round 4 — Merged State (CRR-010, API-REV-004)

- **Changed durable test:** `004a3a965b` (baseline fix) in `tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts` UC-2.
  - The old code stopped waiting at the first "Server listening at" line and took the last URL seen. The agent-tools MCP host logs its own line about 20 ms before the Studio app, so a read in between hit the MCP host's URL (POST /graphql → 404).
  - It now waits for the server's "Server listening on 127.0.0.1:0" (the same readiness line TAU uses), then uses the listener whose POST `/graphql {__typename}` succeeds. It fails clearly if none does.
  - The cause is in the test (two real listeners are product behavior); no assertion was weakened.
- **Evidence:**
  - `round3/UC-fixed-1..3.log`: 2/2 each.
  - `round3/M6-e2e-all.log`: 112 files pass. Two failed: `terminal-websocket-lifecycle` (autobyteus-59), and UC-2 before the fix.
  - The rerun-by-impact choice is sound: the merge added a startup migration (a shared foundation), so the full server set reran. TAU rebuilds its faithful ledger from the merged build.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed:
  - rounds 1–3: TAU file and the two projects tests;
  - round 4: UC-2 fix `004a3a965b`;
  - also on the branch: IR-004 test commits reviewed in CRR-009.
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes:
  - The branch is already integrated with origin/personal `2d076088dd` (merge `1dd3cedadf`).
  - Commits after delivery's blocker: `217430a404` (IR-004 tests) and `004a3a965b` (UC-2 fix).
  - Follow-ups: FU-1..FU-4, FU-6, FU-7 with `/project_task_manager`. FU-5 was withdrawn (DEC-018).
