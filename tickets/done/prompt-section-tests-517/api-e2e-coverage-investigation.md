# API/E2E Coverage Investigation — prompt-section-tests-517

## Investigation Meta

- Requirements Doc: `tickets/in-progress/prompt-section-tests-517/requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `tickets/in-progress/prompt-section-tests-517/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/prompt-section-tests-517/solution-revision-record.md`
- Design Spec: `tickets/in-progress/prompt-section-tests-517/design-spec.md`
- Supplemental Task Artifacts: `evidence/SD-01-repro-before-fix.log`
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable` (direct route, Small/Low)
- Implementation Handoff: `tickets/in-progress/prompt-section-tests-517/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `tickets/in-progress/prompt-section-tests-517/implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable`
- API/E2E Revision Record: `tickets/in-progress/prompt-section-tests-517/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001
- Prior Investigation Reviewed: None
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- REQ-001 / AC-001: the native prompt-heading list in `configured-skill-on-demand-loading.e2e.test.ts:291` includes `## Long-Running Commands`; the test passes 4/4.
- REQ-002 / AC-002: no other test asserting complete prompt sections (or how a composed prompt ends) is stale; the prompt unit tests pass. The implementation found and fixed two more suites (`agent-semantic-memory.e2e`, `agent-semantic-memory-live.e2e`), inside REQ-002's intent.
- REQ-003 / AC-003: one TESTING.md row for a system-prompt change, committed on its own as `docs(testing): …`. TESTING.md is the API/E2E engineer's document: confirm or rewrite.
- Product code unchanged.

## Supported Scenarios And Real Usage

- The scenario is a developer's validation of a prompt change: every suite that reads a run's prompt must match the product. Real trigger: running those suites.
- Contrived/unsupported: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 test expectations follow the product prompt | Changed (tests only) | REQ-001, REQ-002 | run the changed suites; search for and run every other suite that reads a run's prompt |
| BEH-002 TESTING.md row | Added | REQ-003 | review; check that its search terms find every suite this round finds |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No | — | — | — | — |
| Test suites reading a run's prompt | Yes | expectations in three test files | IMP-01, IMP-03, IMP-04 | other suites that read prompts (scripted AGY, ungated) were not run; the live Codex cases were not run | run them |
| Project document (TESTING.md) | Yes | one row | review | search terms may miss suites | compare with this round's search |
| All other surfaces | No | — | — | — | — |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/prompt-section-tests-517`, branch `codex/prompt-section-tests-517`, HEAD `68190d46fa` (tests `71a0caeecc`, TESTING.md `7fffdadab7`).
- Testing guideline: `TESTING.md` (root). Scripted AGY suites: `env -i PATH HOME TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs`; live Codex: `RUN_CODEX_E2E=1` (the suite makes a throwaway `CODEX_HOME` linking the host `auth.json`), model `gpt-6.1-terra` (TESTING.md).
- Changed build-input paths: None (test files and TESTING.md only) → no fresh-start build.
- Secrets: none for scripted suites; the live Codex cases use the host's Codex login.

## Existing Durable Coverage Inventory

The search (this round, every test layer, gated included): files with an assertion on a run's prompt (`promptOf(`, `processedSystemPrompt`, `carpenterSystemPrompt`, `baseInstructions`, `_meta.rules`, `SYSTEM_INSTRUCTIONS_SUPPLIED`), prompt endings (`endsWith`/`lastIndexOf` on prompt text), heading lists (`/^## /`, literal heading arrays), whole-prompt equality, prompt snapshots.

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts` | native heading list | REQ-001 | Needs Update → updated by implementation | IMP-00/01 | Reused IMP-01; rerun in API-01 |
| `e2e/agent-definitions/agent-semantic-memory.e2e.test.ts` | composed prompt ends with Project / Semantic Memory | REQ-002 | Needs Update → updated | IMP-02/03 | rerun in API-01 |
| `e2e/runtime/agent-semantic-memory-live.e2e.test.ts` (SML-CODEX-TEAM, SML-CODEX-OFF) | Codex `baseInstructions` endings | REQ-002 | Needs Update → updated, never run | — | API-02 (live) |
| `e2e/projects/collaboration-prompt-wording.e2e.test.ts` | collaboration part of the prompt, cut at `## Working Environment` | REQ-002 | Unclear (on AGY the cut may now include the Long-Running section) | — | run in API-01 |
| other scripted-AGY suites reading prompts: `agent-package-definitions-live-refresh`, `background-step-stop-own-view`, `daily-assistant-collaborator`, `own-stream-turns-read-once`, `project-run-history`, `team-tab-subtree-messages`, `history-list-read-timing`, `delegator-view-follows-child` | `toContain` / `not.toContain` of sections, prompt reads | REQ-002 | Still Valid by reading; run to confirm | — | run in API-01 |
| ungated: `memory-view-graphql`, `recent-run-projection-graphql`, `grok-build-runtime-replay` (e2e); `codex-segment-turn-rejection-logging`, `brief-package-team-prompt` (integration) | prompt reads / `toContain` | REQ-002 | Still Valid by reading; run to confirm | — | run in API-01 |
| unit: composer, section, semantic-memory, collaboration sections, the five backend prompt tests, parity | sections, order, endings | AC-002 | Still Valid | IMP-04 | Reused |
| other live suites reading prompts (`codex-live-memory-persistence`, `claude-agent-websocket-interrupt-resume`, Codex integration probes, `claude-session-manager.integration`, `agent-initiated-collaborators`) | `toContain` or a prompt compared with its own source | — | Still Valid by reading (no ending, list or snapshot assertion) | search output | not run (no structure assertion; credits) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R1 | AC-002 (unit) | prompt unit + backend + parity | Reused | IMP-04 | same commit, no change since |
| API-R2 | — | typechecks | Reused | IMP-05, IMP-06 | same content |
| API-01 | AC-001, AC-002 | every scripted-AGY and ungated suite that reads a run's prompt (list above) | Existing Test | one `vitest run <files>` with `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture>` in a clean env | proves the search's "Still Valid" readings and the changed suites together |
| API-02 | REQ-002 (live) | real Codex `baseInstructions` | Existing Test | `RUN_CODEX_E2E=1 vitest run tests/e2e/runtime/agent-semantic-memory-live.e2e.test.ts -t "SML-CODEX-TEAM|SML-CODEX-OFF"` | changed assertions never run |
| API-03 | AC-003 | TESTING.md row | Review | read the row against TESTING.md's update rule; check its terms find every file in this round's search | the document is API/E2E's |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update / Remove

Decided after API-01 (a stale suite found there is this ticket's work under REQ-002).

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| Live suites that read prompts without structure assertions | no ending/list/snapshot assertion to go stale; provider credits | Low | No | — |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Undetermined` (only if API-01 finds another stale suite)
- Reroute Required: `No`
