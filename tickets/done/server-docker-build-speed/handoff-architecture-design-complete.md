# Handoff: Architecture Design Complete — server-docker-build-speed (autobyteus-520)

- Result: `Architecture Design Complete`
- Classification: `task_size=Medium`, `architectural_risk=High` (design-spec "Task Size And Architectural Risk")
- Current solution revision: SR-002 (requirements SR-001 Approved; design Ready)
- Route applied: handoff rule "task_size=Large or architectural_risk=High" -> `/architecture_reviewer` (independent architecture review)
- Date: 2026-11-17

## Original Request

Project Task `autobyteus-520` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). The founder (2026-11-17, relayed): "Earlier the time used is mostly just, I guess, one hour ... now it's like way more than one hour ... we should create a ticket to solve it." FU-002 of the beta.9 release (autobyteus-519): `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1.5.13-beta.9/tickets/done/release-v1.5.13-beta.9/follow-ups.md`.

Done when (Task): a build-only run shows the new total time and a table of before/after step timings; the workflow is on `personal`; RELEASE.md says what changed and how to rerun a failed architecture; the next release uses it (PM verifies).

Constraints (Task): no release without the founder's word; never move or delete a published tag; no secrets in logs; finalized on `personal` like any change; the beta.9 release in progress (run 44123354990) is not touched; packages stay the image's own (or an equivalent stated guarantee); six package files and the `:beta`/`:latest` rules stay.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-build-speed`
- Branch: `codex/server-docker-build-speed` (local, not pushed; no commits yet: the ticket documents are uncommitted in the worktree)
- Base: `origin/personal` at `1fdca761aaea6bb03eacc19f2deb1f76505501e0`
- Finalization target: `origin/personal` (RELEASE.md)

## Package

- Requirements (Approved, SR-001): `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-build-speed/tickets/in-progress/server-docker-build-speed/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-build-speed/tickets/in-progress/server-docker-build-speed/investigation-notes.md`
- Design spec (Ready, SR-002): `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-build-speed/tickets/in-progress/server-docker-build-speed/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-build-speed/tickets/in-progress/server-docker-build-speed/solution-revision-record.md`
- Supplements: None. Follow-ups: None (no `follow-ups.md`).

## Approval Basis

Requirements approved by the Solution Designer within the Task's direction (no `Needs user` decision), user informed in the Solution Designer's conversation on 2026-11-17; recorded in SR-001. Design approval is not required by the direction.

## Evidence Summary (measured; details in investigation notes)

| Run | Build step | Of which | Whole run |
| --- | --- | --- | --- |
| beta.6 43211753804 | 47:58 | — | 59:30 |
| beta.7 44001643374 | 45:43 | arm64 builder under QEMU done at 20.6 min; GHA cache export 1433 s; 0 cached steps | 58:48 |
| beta.8 44047761247 | 27:20 | arm64 builder under QEMU done at 15.5 min; GHA cache export 664 s; 0 cached steps | 39:00 |
| beta.9 44123354990 | > 100 min, still running at 17:58 UTC | — | — |

Package jobs: ~2.4 min checkout + 1.5-2.6 min disk cleanup each (79 GB free before cleanup).

## Design In One Paragraph

Native per-architecture build jobs (`ubuntu-latest` amd64, `ubuntu-24.04-arm` arm64) in parallel, each pushing its image by digest (untagged) and recording the digest as a run artifact; one merge job `publish-image` creates the version tag(s) as one index of exactly those two digests (or a dry run in build-only), checks the index, writes the summary and runs the unchanged `Move beta tag`; package jobs extract from `IMAGE@<arch digest>` (the digest the checked index lists), check the arch, sign, wait up to 60 min for the release and upload. No QEMU, no layer cache, lighter checkouts, disk cleanup only when low. New `build_only` dispatch input runs everything without publishing, in its own concurrency group. Dockerfile unchanged.

## Decisions (requirements-doc Decisions)

DEC-001 no layer cache; DEC-002 package from the checked per-architecture digest; DEC-003 build-only semantics; DEC-004 build-only pushes untagged images; DEC-005 60-min package wait; DEC-006 ≤ 30-min target; DEC-007 no `$BUILDPLATFORM` split.

## Open Risks

U-001 native arm64 build time (AC-001 measures it); R-001 CLI version skew after a late leg rerun (accepted); R-002 `Move beta tag` checkout and upload first exercised at the next release (PM verifies).

## Expected Next Action

Independent architecture review of SR-002. On Pass, the reviewer's configured route continues to implementation; on findings, return them to the Solution Designer.

## SR-003 Revision (2026-11-17) — response to ARCH-REV-001

- Result: `Architecture Design Complete` (revised), `task_size=Medium`, `architectural_risk=High` unchanged; route: `/architecture_reviewer` (same rule).
- Review read: `design-review-report.md` (ARCH-REV-001, Fail, AR-001, AR-002), `architecture-review-revision-record.md`.
- AR-001 fixed: `prepare-release` outputs `version_tag` (first line of `tags`, `-zh` for zh); `publish-image` inspects it after pushing `tags`; no tag name rebuilt downstream; zh test cases planned.
- AR-002 fixed (option a): build-only timings are GitHub's job/step record read with `gh run view <run-id> --json jobs`; no timing-table job, no `actions: read`. REQ-005 wording clarified accordingly (intent unchanged; SR-001 approval applies).
- S-2 adopted: dry-run index checked before any tag push (both modes); publish mode re-checks the pushed version tag.
- S-1 adopted: `publish-image` outputs the checked `amd64_digest`/`arm64_digest`; package jobs read them through `needs`.
- RELEASE.md will also name `--failed` over "Re-run all jobs" (review residual risk).
- Changed sections: see SR-003 in `solution-revision-record.md`.
