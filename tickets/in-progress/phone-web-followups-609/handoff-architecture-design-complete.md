# Handoff: Architecture Design Complete (autobyteus-609, SR-001)

- Result: `Architecture Design Complete`, task_size `Large`, architectural_risk `High`. The route is independent architecture review.
- Package: `phone-web-followups-609`. Task autobyteus-609 in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`. It absorbs autobyteus-575 (PM comment 2026-11-22).
- Requested by: `/project_task_manager`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-web-followups-609`
- Branch: `codex/phone-web-followups-609` (no upstream)
- Base: `origin/personal` @ `f2c0d2a902`
- Finalization target: `origin/personal`
- Constraints:
  - Follow DESIGN.md and TESTING.md.
  - No release without the founder's word.
  - Never use the user's running app or data.
  - Real keys only from `AUTOBYTEUS_TEST_VAULT`.

## Original request

The ten follow-ups in the Task description and comment: autobyteus-590 FU-001…FU-007, plus autobyteus-572 FU-003…FU-005. Items A–J are mapped in `investigation-notes.md`.

## Approval basis

`requirements-doc.md` at SR-001, approved by the Solution Designer within the direction; the user was informed in conversation 2026-11-22. No `Needs user` decision.

Decisions named to the user:
- DEC-002: only Markdown links with a relative path become file links, resolved against the run's own folder.
- DEC-005: an interrupted call reads "Stopped" with a stop icon.
- DEC-007: the task list re-reads the node when its run stops. This makes it correct by construction; the lost hop itself was not found (FU-001).

## Documents

- `requirements-doc.md`: REQ-A…J, AC-A…J, DEC-001…008
- `investigation-notes.md`: evidence A–J, runtime findings
- `design-spec.md`: D-A…D-J, Change Scope, derived consumers, classification
- `solution-revision-record.md`: SR-001
- `follow-ups.md`: FU-001, FU-002, not sent

## Classification evidence

Large: ten items over six subsystems, about 35 files.

High:
- GraphQL `EventMonitorToolCard.summaryArgs` changes from a typed object to JSON (clean cut, DESIGN.md rule 9).
- A new export in `@autobyteus/agent-presentation-contracts` (tracked `dist/`).
- The REST workspace routes switch to the restoring lookup, on the path that serves the phone (route permissions unchanged).
- Build inputs change (`scripts/**`, contract `dist/`, `autobyteus-web/generated/**`), so DESIGN.md rule 12 applies: fresh-start build and the build-only Desktop Release run.

## Points for the reviewer's attention

- D-E: a JSON field instead of a typed object, to keep one key list.
- D-I: the bounded re-read rule (at most 5 reads, 2 s apart, only while the run is not live and a task still shows running).
- D-H: the `file-path-action` payload becomes a discriminated union.
- D-J: on-demand skill and semantic workspaces are now reachable through REST after a restart, the same as the GraphQL Files path.

## Next expected action

Architecture review of SR-001. On Pass, implementation (the review rule routes it). On findings, back to the Solution Designer.

## Route

The handoff rules were applied (rule: Large or High → `/architecture_reviewer`).
