# Docs Sync Report

## Scope
- Ticket: work-journal. Runtime-neutral Work Journal replaces the work-trace export; Skill Improvement uses it.
- Trigger: CRR-003 test-code review Pass, after API-REV-001 Pass (93.5%), on SR-010/012/014 and IR-001/IR-002.
- Classification: task_size `Large`, architectural_risk `High`. Reviewed route: ARCH-REV-001..003, CRR-001 (Fail F-001) → CRR-002 Pass, API-REV-001, CRR-003.
- Bootstrap base reference: origin/personal @ cba6b85122.
- Integrated base reference used for docs sync: origin/personal @ e2e21402b1d4dae9919d7e19b387cae493308f38, merged as b0c81c8f20.
- Post-integration verification reference: release-deployment-report.md, "Initial Delivery Integration Refresh".

## Why Docs Were Updated
- The implementation already updated the long-lived docs:
  - new `autobyteus-server-ts/docs/modules/agent_work_journal.md`;
  - removed `agent_work_traces.md`;
  - updated `skill_improvement.md`, `agent_memory.md`, PROJECT_OVERVIEW, the docs/module READMEs, `collaboration_model.md`, the retrospective-skill-improver agent and skill, and the web docs (`agent_execution_architecture.md`, `settings.md`, `skills.md`).
- Delivery checked them against the integrated code and the evidence. No further edit was needed.

## Long-Lived Docs Reviewed
| Doc Path | Why Reviewed | Result | Notes |
| --- | --- | --- | --- |
| autobyteus-server-ts/docs/modules/agent_work_journal.md | New canonical module doc | No change | Output layout, manifest fields and order, closed/open file rules and the update trigger match the evidence journals and manifests |
| All docs (`git grep agent_work_traces`) | Links to the removed doc | No change | None remain |
| src/docs/web (`git grep -i "work.?trace"`) | REQ-W8 single name | No change | Only legitimate references to the removal migration remain |
| TESTING.md | New gated E2E suites | No change (by policy) | TESTING.md now forbids per-suite rows. The suites fall under the existing "Gated runtime suites" layer, and each test file header holds its gate and command |
| RELEASE.md / data_migration_guideline.md | Rollback readability | Finding routed | See "Rollback finding" |

## Docs Updated
None by delivery. The implementation's doc changes are part of the ticket diff.

## Durable Design / Runtime Knowledge Promoted
Already promoted by the implementation into agent_work_journal.md and skill_improvement.md.

## Removed / Replaced Components Recorded
| Old | Replacement | Documented in |
| --- | --- | --- |
| src/agent-work-traces export, `work_traces/` folders, agent_work_traces.md | src/agent-work-journal, `work_journal/` folders, startup migration `20261019_remove_work_trace_exports` | agent_work_journal.md, skill_improvement.md |

## Rollback finding (routed to solution_designer)
RELEASE.md says: "Data written by a newer build must stay readable by the build you roll back to."
- The new improver session writer omits `schemaVersion`, as designed (design-spec §Persisted Data 3).
- The released reader returns `null` unless `schemaVersion === 1`.
- After a rollback, the released build would therefore treat every improver_session.json written by this build as absent. It would start a fresh improver session for those skills instead of continuing the current improver run.
- There is no crash and raw traces are not affected.
- Other rollback paths are fine: the older migration runner iterates only its own registered migrations, and older builds do not read `work_journal/`.
- The docs cannot state the rollback behavior until the decision is made: fix the code, or accept and document.

## Delivery Continuation
- Result: `Pass` for docs accuracy. The rollback finding is pending a Solution Designer decision.

## Update — SR-018 (2026-10-19)
The rollback finding is resolved by a rule correction instead of a code fix. RELEASE.md "Rollback" and data_migration_guideline.md §4 "Rolling back after a migration" now limit rollback data compatibility to releases with a converting app-data migration. Both edits (by SD, in this ticket) were reviewed by delivery: they are consistent and will be finalized with the ticket. The session-file effect is recorded as accepted in release-deployment-report.md "Rollback Criteria".

## Round 2 (DR-002)
The rule docs (RELEASE.md "Rollback", data_migration_guideline.md §4) are committed in b9d04998a4 and are identical to the reviewed edits. No other docs are affected.
