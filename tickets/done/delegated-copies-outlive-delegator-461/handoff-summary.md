# Handoff Summary — delegated-copies-outlive-delegator-461

## What Changed

Project Task `autobyteus-461`, "delegated runs are runs of their own". Every delegated run, local or on a peer node, is a run of its own, bound to its Task and not to the run that delegated it.

- Stopping a delegator no longer stops what it delegated, and a report wakes the stopped delegator. No run hosts, idles, wakes or stops another.
- A delegating run's view shows its children from the Task entries through one server-built run tree (`RUN_TREE_SNAPSHOT` / `RUN_TREE_CHANGED`). A child row's commands, Stop and Settings go to the child's own run.
- Each run's status is its own, delegated runs nest under the member that delegated them, and a delegated run has one name, its slot.
- Archive and delete are refused while a delegated run works, here or on a peer.
- After a restart, runs resume bottom-up along `delegatedFrom`.
- Existing data is converted once at startup (`20261111_delegated_runs_own_runs_v1`, with its `20261114_*` follow-ups). The data migration guideline gained "Registry order and late predecessors".

## Classification And Route

- `task_size` `Large`, `architectural_risk` `High`, route `Reviewed`.
- Architecture review: `design-review-report.md`. Code review: through round 43 (CRR-065, docs); last code review CRR-062 on the base merge; test-code review CRR-063.
- API/E2E: API-REV-021, Pass, 95%.

## Code State

- Branch `codex/delegated-copies-outlive-delegator-461`; base `origin/personal` `1e8b6e5d0a`, merged by IR-041 as `339602ff36` (5 conflicts resolved, CRR-062).
- Since API/E2E round 21 (`f1f8ffc643`), only docs and two code comments changed (MSP-56).

## Verification

Verified from evidence by delivery, AC-001 … AC-017. The table is in `release-deployment-report.md` "Verification (second pass)".

- The full server E2E on the merged state passed: 886 tests, 0 failed.
- AC-001 was rerun on a live model (DeepSeek) on the merged state: 2/2.
- AC-015 is delivery's own document review.
- No user check was needed.

## Docs

`docs-sync-report.md`. Delivery found the server and web docs describing removed code and a superseded child-row design, and no doc naming the run-tree contract. The implementation engineer rewrote them (IR-042, IR-043); the code reviewer reviewed them (CRR-064, CRR-065).

Delivery itself fixed:

- the `follows_team` lines in `agent_teams.md` and `settings.md`;
- the MSP-56 comments;
- `RELEASE.md`: record the shipped migrations in the registry-order test before tagging.

## Release

A beta, as the user decided on 2026-11-16. `release-notes.md` carries two items under "What you need to do": update every paired node together, and do not go back to an older version on the same data.

## Residual Risk And Follow-ups

- Accepted:
  - AC-009's notice text and AC-013's approval edge are proven below API/E2E level;
  - AC-014 was not run on an isolated desktop instance;
  - Grok is FU-035;
  - the base's desktop build does not start (a base packaging issue).
- Follow-ups are in `follow-ups.md`, with a suggested grouping. The Solution Designer sends them.
