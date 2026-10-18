# API/E2E Test Review Report

## Review Meta

- Review Round: 1
- Trigger: API-REV-001 Pass from `/software_engineering_team/api_e2e_engineer`; test diff `git diff c59da62e70 1c69409a85` (commits `1f9aae5817` baseline test fix, `1c69409a85` new coverage)
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (as in CRR-001)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-002)
- Supplemental Task Artifacts Reviewed As Context: none behavior-defining
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001)
- Original Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline(s) applied: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-skill-collision-fix/TESTING.md`. The new live E2E follows its throwaway-`CODEX_HOME`-with-`auth.json`-symlink pattern, its `RUN_*` gates and its clean-env command. No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-101..104)
- Base merge `c59da62e70` (v1.5.6-beta.3): server changes are limited to skill-update-notice formatting, its tests and docs. It does not touch the skill-exposure source reviewed in CRR-001. Not re-reviewed here.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `tests/e2e/runtime/workspace-skill-links-live.e2e.test.ts` | Added | SCN-101..104; AC-101/102/104/105; REQ-105 | Real Studio server + real Claude/Codex/Grok CLIs with the user's absolute links | Gated per runtime; F2 deliberately not asserted (DEC-103) |
| `tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` | Updated | SCN-101/102; AC-101/102; D-19 | Live Codex `skills/list` preflight | New user-link case; stale beta.1 API usage fixed (`beginAcquire` lease, guard); D-19 case realigned |
| `tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts` | Updated | Baseline (preserved behavior) | Live Claude factory | `beginPreparation(...).prepare()`, stub `resolveSkillScope`/`hasEffectiveSkills`/`deactivateForRun` |
| `tests/integration/agent-execution/claude-session-manager.integration.test.ts` | Updated | Baseline | Live Claude session manager | `deactivateForRun` on the MCP stub |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | One `describe.each(runtime)` with three ACs named in titles; the Codex case title states REQ-105 |
| Assertions prove approved requirements | Pass | Each AC is proven by the agent's reply: new-run code, restore-only code read from a sibling file, and the workspace-own code for all-installed. Link presence/target asserted while held. Collision text and untouched workspace entry asserted. AC-105 asserts the member memory folder is absent before the first message |
| Fixtures/helpers reuse repetition | Pass | Shared `ask`, `openSocket`, `linkedWorkspace`, `createRun`, `runtimeLink`; existing e2e helpers reused |
| Isolation and determinism fit the boundary | Pass | Temp root, app data, package and `CODEX_HOME` (QR-101); unique codes per run; `CODEX_HOME` restored in `afterAll`; Codex integration lease released in `finally`. LLM nondeterminism is bounded by unique-code assertions, which suits a live gated suite |
| Large files coherent | Pass | 324-line live E2E covers one surface |
| No stale/duplicated/disabled/compat-only tests | Pass | The baseline fixes repair tests that were stale against beta.1 APIs (`getClient`, `createBackend`/`restoreBackend`, missing `deactivateForRun`). Nothing disabled. Out-of-scope stale suites were reported as follow-ups by API/E2E |
| Coverage agrees with investigation and evidence | Pass | Evidence logs 06–09 and the desktop artifacts match the cases; 3/3 per runtime, 4/4 for the live Codex bootstrapper |
| Test callers exercise an established scenario | Pass | SCN-101..104 come from the approved requirements; tests reproduce them |
| Real trigger and real actor steps | Pass | GraphQL package import → `createAgentRun`/`terminateAgentRun`/`restoreAgentRun` → agent WebSocket. The team run uses lazy member activation through the team socket. Links are created as the user does (absolute symlink) |

Specific judgments:
- **D-19 realignment** (Codex integration case 1): the expectation changed from "skip materialization" to "expose the configured copy". This is not a weakened assertion. `ec31ff371a` (D-19) is an ancestor of `v1.5.6-beta.1`, and the restored source emits `codex-runtime-duplicate: … exposing the chosen copy in the workspace` (`codex-thread-bootstrapper.ts:405`). The fixture's repo-local bundle is a different folder from the configured skill, so the new assertions (warning, link at `.codex/skills/<name>` to the configured root, cleanup removes it) match beta.1 behavior.
- **Model preference lists** in the live E2E (`gpt-5.4-mini`, `gpt-5.5-mini`) fall back to the first catalog model when none is available, as in the recorded `gpt-5.6-luna` run. This is not actionable.

## Findings

None.

## Follow-ups

None new from this review. API/E2E already sent F7 (Grok native listing) and the stale gated suites to `/project_task_manager`.

- Sent to: `None`

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the four paths above
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: release target is now v1.5.6-beta.4. Docs sync is still needed for `docs/modules/shared_network_workspaces.md` lines 18–33 (CRR-001 Docs-Impact).
