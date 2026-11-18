# Docs Sync Report

## Scope

- Ticket: `prompt-section-tests-517` (Project Task `autobyteus-517`, item 1), `task_size: Small`, `architectural_risk: Low`, route: direct low-risk (independent architecture review, code review and test-code review `Not Applicable`).
- Trigger: API/E2E `API-REV-001` Pass (final confidence 95.8%) on SR-001 / IR-001. The change is test code and `TESTING.md` only; no product code changed.
- Bootstrap base reference: `origin/personal` @ `2e9ac1e65b`.
- Integrated base reference used for docs sync: `origin/personal` @ `2e9ac1e65b` (`Already current`: the fetch at the start of delivery shows the ticket branch is not behind it, 0 commits).
- Post-integration verification reference: none needed (no base commits were integrated); the validated state is the ticket branch at `ceef6c634d`, whose test edit `735c8ba726` was typechecked by API/E2E (`API-04`).

## Why Docs Were Updated

- Summary: autobyteus-483 added a `## Long-Running Commands` section to every runtime's composed prompt. Four E2E suites that assert exact prompt structure went stale and were corrected; the project's testing guideline had no rule telling a change to a system prompt to run every test that reads a composed prompt, and the first version of that rule (the implementation's) did not catch the fourth stale suite. API/E2E, as owner of `TESTING.md`, rewrote the rule.
- Why this should live in long-lived project docs: the next prompt change (a new section, a reorder, a runtime's text) must find every prompt-reading test the same way; the ticket folder is archived.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `TESTING.md` | The ticket's requirement REQ-003 and AC-003: a row in "Choosing the path" for a change to a runtime's system prompt | Updated (by API/E2E, its owner; confirmed by delivery) | The row, committed on its own as `914cb5da97` (`docs(testing): …`), names the change (the composer or a section in `autobyteus-server-ts/src/agent-execution/prompt/`, or the section a backend passes), the proof (the prompt unit tests and every test in any layer, gated suites included, that reads a run's composed prompt) and the search terms (`promptOf`, `processedSystemPrompt`, `carpenterSystemPrompt`, `systemPrompt`, `baseInstructions`, `_meta.rules`, `match(/^## `, prompt snapshots), and why reading is not enough (a test that checks how a prompt ends, or cuts it at a heading, goes stale too). Delivery ran the same search over `autobyteus-server-ts/tests/e2e` and `tests/integration`: 25 files; the ones API/E2E did not run (the live Claude and Codex thread-start suites, and `agent-semantic-memory-live`'s other cases) assert prompts only through `toContain`, `null` inputs or the harness's own composed prompt, so an added last section cannot stale them. The row is global (TESTING.md's update rule), one row, short. |
| `DESIGN.md` | Rule 11: tests follow the code | No change | The ticket applies rule 11: the product prompt is unchanged and the tests were brought to it. No new design rule and no design case. |
| `RELEASE.md` | Finalization target, Secret Gate | No change | Followed as written; no deviation. |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | Describes the prompt sections and their order (autobyteus-483 added the Long-Running Commands section there) | No change | Already states that Long-Running Commands is last of the Carpenter sections and where each runtime's text lives. It does not describe the tests. |
| `autobyteus-server-ts/docs/modules/agent_memory.md` and other docs about the Semantic Memory section | Search for a claim that the Semantic Memory section is the last section of the prompt | No change | None found outside archived ticket documents (`tickets/done/agent-semantic-memory/` is an archive, not a long-lived doc). |
| Docs naming the four fixed suites | Search of all `*.md` outside `tickets/` for the suite names | No change | Only `autobyteus-server-ts/tests/e2e/fixtures/collaboration-prompt-complete-views.md` mentions `collaboration-prompt-wording.e2e.test.ts` (as its fixture source); it needs no change because the approved wording did not change. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `TESTING.md` | New rule (a row in "Choosing the path") | See the first row above. Authored by the implementation (`7fffdadab7`) and rewritten by API/E2E (`914cb5da97`). | The prompt-section tests had no rule, and the first rule's wording was read as still valid by the engineer who missed a suite. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| A prompt change and its tests | Run every file that reads a run's composed prompt, not only those that list headings: a test that checks how a prompt ends, or cuts at a heading, goes stale too. Four suites went stale from one added section (`configured-skill-on-demand-loading`, `agent-semantic-memory`, `agent-semantic-memory-live`, `collaboration-prompt-wording`). | `requirements-doc.md` (REQ-003), `api-e2e-execution-coverage-report.md` (API-01, API-03) | `TESTING.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| The implementation's first TESTING.md row ("exact prompt-section assertions", `7fffdadab7`) | The rewritten row (`914cb5da97`) | `TESTING.md`, "Choosing the path" |
| The requirements doc's REQ-002 finding "there is none" (no other stale suite) | Four stale suites found and fixed | `api-e2e-execution-coverage-report.md` (Latest Authoritative Result); the Solution Designer's requirements doc is its own record |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Not used. Docs impact: `Updated` (`TESTING.md`, by its owner). No other long-lived doc changes: reasons above.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from evidence (done, see `release-deployment-report.md`), archive, finalization onto `origin/personal`, no release.
- Notes: `FU-001` (two timing failures under load: `agent-package-definitions-live-refresh` DCF-E2E-002 and `grok-build-runtime-replay` `afterAll`) is outside this ticket and recorded by API/E2E; delivery added none.
