# Docs Sync Report

## Scope

- Ticket: `follow-ups-of-461-500` (Project Task `autobyteus-500`); `Large` / `High`, route `Reviewed`
- Trigger: test-code review passes CRR-006 … CRR-014 (with four delivery base refreshes)
- Integrated base used for docs sync: `origin/personal` `f7b4d68711` (merged as `f5a7d789c9`)

## Result

`Updated`.

## Docs Updated By Delivery

| Doc Path | What Changed | Why |
| --- | --- | --- |
| `RELEASE.md` "Cutting The Release" | The script records the shipped migration order (`migrations:record-released` → `released-migration-order.json`, committed with the version bump; fails, writing nothing, when a released migration moved). Replaces the manual `RELEASED` step added by autobyteus-461 | G-1 (`scripts/desktop-release.sh:186-190, 246-247, 276-280`); the code reviewer's request |
| `autobyteus-server-ts/docs/design/data_migration_guideline.md` "Registry order and late predecessors" | "Its released set is updated at each release" → the recorded file and who records it | Same |

Commit `9314d13f48`.

## Docs Updated In The Change

The ticket's own updates in its areas (15 files, against the merged base `f7b4d68711`): `GLOSSARY.md`, server `FILE_RENDERING_AND_MEDIA_PIPELINE.md`, `agent_websocket_streaming_protocol.md`, `collaboration_model.md`, `agent_communication.md`, `projects.md`, `remote_collaboration.md`, `restart_resume.md`, `standalone_agent_run_root.md`, `token_usage.md`; web `agent_artifacts.md`, `agent_execution_architecture.md`, `projects.md`, and the two above.

## Removed Names Check

- Method (as in autobyteus-461's delivery): every backticked identifier in `autobyteus-web/docs`, `autobyteus-server-ts/docs`, `GLOSSARY.md`, `DESIGN.md`, `TESTING.md`, `RELEASE.md` (3,417) that exists in `origin/personal` `f7b4d68711`'s source and not in the branch's.
- Result: **0** such identifiers in the docs. Control: `DelegatedChildLocations` (FU-020's removed owner): 4 files in the base's source, 0 in the branch's, 0 in the docs.
- The code reviewer's AC-001 greps cover names in source.

## Project Documents

- `DESIGN.md`: no change.
- `TESTING.md`: no change by delivery.
- `RELEASE.md`: updated (above).
- No report recorded a discrepancy in the three.

## Follow-ups

Delivery added none; FU-500-01 … FU-500-13 stand.

## Recheck On The Final Merged State (2026-11-18)

- Base `53b72018ad` (491, 492) merged as `5eb8246076` (IR-009, CRR-017).
- Removed-names check rerun against `53b72018ad`: 3,427 doc identifiers, **0** that exist in the base's source and not in the branch's.
- For the Solution Designer at closure (its documents, not long-lived docs): the FU-030 SIR-001 row "superseded by 492 DEC-001"; `design-spec.md` FU-021 "the guard stays at 60 s" → the project's 30 s (CRR-015, CRR-017).
