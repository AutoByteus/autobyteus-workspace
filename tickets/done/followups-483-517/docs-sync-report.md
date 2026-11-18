# Docs Sync Report

## Scope

- Ticket: `followups-483-517` (Project Task `autobyteus-517`, round 2: the follow-ups of autobyteus-483). `task_size: Small`, `architectural_risk: Low`, route: direct low-risk (independent architecture review, code review and test-code review `Not Applicable`).
- ID note: the requirements doc names the follow-ups it takes from autobyteus-483 as FU-002, FU-003, FU-004 (Grok) and FU-005. This ticket's own `follow-ups.md` numbers its new rows FU-001..FU-004. This report writes the first kind as `483-FU-00x` and the second as `FU-00x`.
- Trigger: API/E2E `API-REV-001` Pass (final confidence 95.1%, no category below 92%) on SR-002 / IR-002. Scope delivered: `483-FU-002` (REQ-001, REQ-002; AC-001 as refined by SR-002), `483-FU-003` (REQ-003; AC-002) and `483-FU-005` (REQ-005; AC-004). `483-FU-004` (Grok, REQ-004, AC-003, DEC-003) is not in this round: it awaits the user.
- Bootstrap base reference: `origin/personal` @ `24d438fa31`.
- Integrated base reference used for docs sync: `origin/personal` @ `f7b4d68711` (18 commits: autobyteus-534 phone Text size and run menu, autobyteus-535 release v1.5.13 and its records), merged into the ticket branch as `2c251a63ef` before any delivery edit. No conflict.
- Post-integration verification reference: ticket branch `2c251a63ef` (docs edits on top): both typechecks PASS at baseline; the AGY unit tests, the scripted `background-task-status-count` E2E, 242 web phone and panel tests and the doc link check PASS (see `release-deployment-report.md`).

## Why Docs Were Updated

- Summary: the Antigravity background-task view now keeps ended tasks for the life of the run, so two server docs that said the opposite were wrong; `settings.md` lost its stale copy of the architecture doc (done by the ticket); and the testing guideline's file-watching rule now points at the shared wait constants the ticket added.
- Why this should live in long-lived project docs: the view's contents are what a late or reloaded panel shows; the next change to the AGY monitor or the seed path must know the view lists ended tasks. The next test that waits for an OS file event must find the shared limits instead of choosing its own 3-5 s budget.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `TESTING.md` | "File watching on a busy Mac" describes the cause and how to diagnose it; the ticket added shared wait constants for the tests that suffer it | Updated | One sentence added to that bullet: such tests take their wait and vitest timeouts from `autobyteus-server-ts/tests/helpers/os-latency-under-load.ts`, never compare an event's elapsed time with a fixed bound, and a test proving an event does not happen keeps its own short quiet window. These are the helper's own header rules (DEC-002), put where a test author looks. Committed on its own as `docs(testing): …`. The rule is the ticket's; API/E2E, the owner, is told in the terminal message (no other change to TESTING.md: the phone probe, typecheck and Docker rules were followed as written). |
| `DESIGN.md` | Rule 11: tests follow the code | No change | Applied by the ticket (tests brought to the code). No new design rule or case. |
| `RELEASE.md` | Finalization target, Secret Gate, checks before tagging | No change | Followed as written; no deviation. The base brought the v1.5.13 release records (autobyteus-535); `RELEASE.md` itself is unchanged by it. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | The paragraph on the background-task view said Antigravity lists "the tasks running now (its monitor keeps no ended ones)" | Updated | Now: the monitor's tasks, running and ended, each as its latest snapshot with its exit code or `run_ended`, for the life of the run. |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Describes the AGY monitor (exit, `stopAll`, view count) | Updated | Added: the monitor keeps every task of the run, so `list()` shows an ended task to a viewer that opens or reloads after it ended; a step AGY reports open again is not brought back as running; the running count filters by status. |
| `autobyteus-web/docs/settings.md` | `483-FU-005`: it held a stale copy of the architecture doc's Level 1-3 sections | Updated (by the ticket, confirmed by delivery) | Retitled `# Settings`, the copied sections removed (2302 to 1230 lines), `## Existing Run Configuration` kept and its anchor unchanged. Confirmed: `grep` finds 0 Level headings and the title; the link check passes (50 links). |
| `autobyteus-web/docs/agent_execution_architecture.md` | Receives the one section that existed only in the old `settings.md` copy | Updated (by the ticket, confirmed by delivery) | `#### Run Workspace Choice On Start Surfaces` under *Start Surfaces And Run Workspace Choice*, with same-document links; its claims were checked against the code by implementation. The background-task bullets already read correctly for the seeded view (they say "the tasks its runtime knows now"). |
| `autobyteus-web/docs/remote_access.md` | Describes the phone's Activity background-task rows and, since the base merge, the Text size and run menu | No change | The base edit (autobyteus-534) and this ticket do not overlap. The Activity paragraph says tasks started before the phone opened the run are listed too, which is now also true for ended AGY tasks. |
| Other docs naming `settings.md` | `autobyteus-web/AGENTS.md` and the docs index link to `./docs/settings.md` as "Application configuration, API key management, and system monitoring" | No change | Still accurate for the file as it now is. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Behavior correction | The Antigravity entry of the view paragraph (see above). | The sentence was true before this ticket and false after it. |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Behavior correction | The monitor's kept tasks (see above). | Same. |
| `TESTING.md` | Rule pointer | One sentence in the file-watching bullet (see above). | The ticket created the shared limits; the rule that tells a test author to use them is the testing guideline's. |
| `autobyteus-web/docs/settings.md`, `autobyteus-web/docs/agent_execution_architecture.md` | Restructure (by the ticket) | See above. | `483-FU-005` and its doc move. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| The AGY view lists ended tasks | A panel opened late or reloaded sees ended AGY tasks with their end line; `list()` is every task of the run; the running count is a filter. | `requirements-doc.md` (REQ-003, DEC-001), `implementation-handoff.md` | `agent_execution.md`, `antigravity_cli_runtime.md` |
| Waits for OS file events | Shared limits, why they are long (events arrive up to ~14.5 s late under load), and that they do not slow a passing run. | `design-spec.md`, `tests/helpers/os-latency-under-load.ts` | `TESTING.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `AgyBackgroundTaskMonitor.list()` returning running tasks only | Every task of the run | `agent_execution.md`, `antigravity_cli_runtime.md` |
| The stale Level 1-3 copy in `settings.md` | The canonical `agent_execution_architecture.md` | `settings.md` (Settings only) |
| `AC_BOUND_MS` elapsed-time assertions of OS events (`package-auto-refresh`, live-refresh) | The shared wait | `TESTING.md` (file-watching bullet) |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Not used. Docs impact: `Updated`.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from evidence (done, see `release-deployment-report.md`), archive, finalization onto `origin/personal`, no release.
- Notes: `483-FU-004` (Grok) is not delivered and not a docs problem: the Grok section of the prompt is unchanged and `prompt_engineering.md` describes it as it is. Follow-ups `FU-001`..`FU-004` of this ticket are recorded in `follow-ups.md`; delivery added none.
