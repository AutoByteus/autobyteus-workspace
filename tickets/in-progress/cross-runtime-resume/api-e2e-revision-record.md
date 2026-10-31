# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative; this file records the baseline or delta of each round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-001 (Pass), round 1 | SR-004; ARCH-REV-002; IR-001; CRR-001 | N/A | Fail / 83.9% |

## Revision Entries

### API-REV-001 — Built-server switch to and from the native runtime, settings, codegen, journal identity, baseline

- Triggering role, report path, and round: Code reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-resume/tickets/in-progress/cross-runtime-resume/code-review-report.md`, round 1
- Triggering finding or case IDs: none (the review passed; it listed the coverage to add)
- Related revision IDs: SR-004, ARCH-REV-002, IR-001, CRR-001; delivery `N/A`
- Why recorded: first validation of the approved design on the reviewed `Large` + `High` route
- Coverage decisions or durable test paths changed: added `tests/e2e/runtime/runtime-switch-native-built-server.e2e.test.ts` (RS-01 native pair, RS-02 settings, RS-03 host with a delegated copy) and `tests/agent-work-journal/services/work-journal-unswitched-identity.test.ts`; updated the 331 `work-journal-neutral-vocabulary.e2e.test.ts` (per-file journal runtime); regenerated `autobyteus-web/generated/graphql.ts`.
- Cases added, changed, removed, or rechecked: API-01…API-08 run, OBS-1 observed, API-09 Not Tested; implementer's clean-clone suites reused.
- Commands, environment, fixture, or broader-validation delta: build of the worktree at `60c3ac4ec8`; built server as a child process with a native model stand-in and the scripted AGY; codegen against it; a base-commit worktree for the journal byte comparison; live Claude and Codex repeated.

#### Prior Failure Resolution

None. (One stale assertion of mine in the 331 journal E2E failed in API-07 and was updated; see the report.)

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`
- Prior result and confidence: N/A
- Current result and confidence: Fail / 83.9% (post-repository 86.9%)
- New or remaining failure IDs: F-1 (switch to the native runtime leaks the candidate's `system_instruction` into the previous agent's archive, I-7), F-2 (the reopened chat starts at the latest marker)
- Recommended owner: Solution Designer (both are `Design Impact`), after the code reviewer's failure-origin review
- Remaining risks, blocked evidence, or untested scope: OBS-1, C-6 corner, native runtime on a real provider, rendered Settings page and chat in a browser, a stored pending switch across a server restart.
