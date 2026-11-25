# API/E2E Coverage Investigation — remove-long-running-prompt-649

## Investigation Meta

- Requirements Doc: `tickets/in-progress/remove-long-running-prompt-649/requirements-doc.md`
- Investigation Notes: `tickets/in-progress/remove-long-running-prompt-649/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/remove-long-running-prompt-649/solution-revision-record.md` (SR-001, SR-002)
- Design Spec: `tickets/in-progress/remove-long-running-prompt-649/design-spec.md`
- Supplemental Task Artifacts: None
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable` (direct route, Small/Low)
- Implementation Handoff: `tickets/in-progress/remove-long-running-prompt-649/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `tickets/in-progress/remove-long-running-prompt-649/implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable`
- API/E2E Revision Record: `tickets/in-progress/remove-long-running-prompt-649/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001
- Prior Investigation Reviewed: None
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- REQ-001 / AC-001, AC-002: no runtime's system prompt (Claude, Codex, Antigravity, Grok and DeepSeek via ACP, native) contains `Long-Running Commands`; the shared prompt ends after the semantic memory sections, the native prompt after File And Directory Practice; other sections unchanged.
- REQ-002 / AC-003: no source, test or doc in `autobyteus-server-ts` mentions the section, apart from historical tickets (the absence assertions AC-001 requires are the exception the handoff records).
- REQ-003 / AC-004: the global semantic memory note (Solution Designer's, done).
- The rest of autobyteus-483 preserved.

## Supported Scenarios And Real Usage

- SCN-001: a run of any runtime starts (or is restored) and gets its prompt. SCN-002: agents read global memory.
- Contrived/unsupported: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 prompt without the section | Removed (section) | REQ-001 | units per backend (IMP-01); every provider-free suite that reads a run's prompt (TESTING.md "Choosing the path": a system-prompt change); live prompt (IMP-04 Claude; Codex endings changed in the gated live suite) |
| Docs | Changed | REQ-002 | grep |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | prompt composer, backends' prompt inputs, ACP session profile field | IMP-01, IMP-02 | prompt-reading E2E suites beyond IMP-03 | run them (TESTING.md row) |
| External integration | Yes | the prompt a real runtime receives | IMP-04 (Claude) | Codex's changed live ending assertions | live Codex SML cases |
| Others | No | — | — | — | — |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-long-running-prompt-649`, branch `codex/remove-long-running-prompt-649`, code `92d9b01ef3`, HEAD `bb9834f1e2`.
- Testing guideline: `TESTING.md` "Choosing the path", row "A runtime's system prompt": the prompt unit tests plus every test in any layer that reads a run's composed prompt, run each file found.
- Changed build-input paths: None → no fresh-start build.
- Secrets: none for the scripted suites; live Codex uses the host login (throwaway `CODEX_HOME` linking `auth.json`, the suite's own setup).

## Existing Durable Coverage Inventory

The search (this round): every file in `tests/e2e`, `tests/integration`, `test-support` that reads a run's prompt (`promptOf(`, `processedSystemPrompt`, `carpenterSystemPrompt`, `systemPrompt`, `baseInstructions`, `_meta.rules`, `SYSTEM_INSTRUCTIONS_SUPPLIED`): 32 files.

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| prompt unit tests (composer, semantic memory section, five backends, parity) | endings and absence | AC-001 | Still Valid (rewritten by implementation) | IMP-01 | Reused |
| `configured-skill-on-demand-loading`, `collaboration-prompt-wording`, `agent-semantic-memory` | native heading list; collaboration part; composed endings | AC-001 | Still Valid (rewritten) | IMP-03 | rerun with the full set (API-01) |
| 15 more provider-free files that read a prompt (scripted AGY or ungated; list in API-01's log header), incl. `json-file-persistence-contract.e2e`, `agent-run-prompt-fallback.integration` (new since autobyteus-517) | `toContain`/order/self-comparison | AC-001 | Still Valid by reading | — | run (API-01) |
| `agent-semantic-memory-live.e2e` SML-WRITE (Claude) | prompt the CLI received has no section | AC-002 | Still Valid | IMP-04 | Reused |
| `agent-semantic-memory-live.e2e` SML-CODEX-TEAM, SML-CODEX-OFF | Codex `baseInstructions` endings (changed in this ticket) | AC-001/002 | Needs a run | never run since the change | API-02 (live Codex) |
| 10 other gated live files reading prompts | `toContain` only (no ending, heading list or snapshot assertion; checked by search) | — | Still Valid by reading | search | not run |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R1 | AC-001 (unit) | composer, backends | Reused | IMP-01, IMP-02 | same code |
| API-R2 | AC-002 | live Claude prompt | Reused | IMP-04 | same code |
| API-01 | AC-001 | the 18 provider-free prompt-reading files | Existing Test | one `vitest run` with `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture>` | TESTING.md row |
| API-02 | AC-001, AC-002 (Codex) | live Codex `baseInstructions` | Existing Test | `RUN_CODEX_E2E=1 … agent-semantic-memory-live -t "SML-WRITE\|SML-CODEX-TEAM\|SML-CODEX-OFF"` | changed assertions never run |
| API-03 | AC-003 | repository search | Review | grep (this round) | — |
| API-04 | AC-004 | global memory note | Review | read `semantic-global/` | — |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update / Remove

None planned (the implementation rewrote the stale tests).

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| Live prompts of Grok, Antigravity, DeepSeek, native | one live runtime is the AC's intent (AC-002); units cover each backend; scripted AGY covers the AGY prompt through the server | Low | No | — |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required: `No`
