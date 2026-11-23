# Solution Designer Handoff — autobyteus-619 (follow-ups-615-619)

- From: Solution Designer (`solution_designer_703182187282472484b90793eac8be40`), 2026-11-23
- Classification: `Architecture Design Complete`, `task_size = Medium`, `architectural_risk = Low`
- Solution revision: SR-001
- Approval: within the direction; the founder was informed. No design approval needed.

## Original request

Project Task `autobyteus-619` (absorbs 620), from `/project_task_manager`: four follow-ups of autobyteus-615.
- FU-003 (priority): three server E2E files fail on personal.
- FU-004: a whole-run race in `scoped-org-history-graphql`.
- FU-002: the SR-016 `TMPDIR` form.
- FU-001: duplicate design-case numbers.

Constraints: `DESIGN.md`, `TESTING.md`, synthetic data, no release without the founder's word.

## Causes (investigation-notes.md, reproduced)

- **Two upgrade E2E files** (`collaborators-to-delegated-runs-startup`, `removed-skill-access-mode-history-graphql`) are not faithful upgrades. With an empty ledger, an old team-tree migration fails on newer data, its dependents never run, and 29's Org conversion correctly waits, so the Org is refused.
- **`memory-collaboration-graphql`** is a 29 regression: an Org's Team unit (now a Team run of its own) is listed as a team root on the Memory page, against 29's preserved REQ-006.
- **`scoped-org-history-graphql`**: the shared helper `restoreByMemberMessage` returns before its message's acknowledgement, and the server records the summary just before that acknowledgement.
- **SR-016**: the test mixes path forms. The product is fine.
- **Design cases**: 599's two cases took numbers 591 and autobyteus-28 had taken a day earlier.

## Design summary (design-spec.md)

- A shared faithful-upgrade ledger helper, used by all four upgrade E2E files. Two of them have it inline today.
- The team-memory explorer lists team roots only (`containedIn` absent).
- `restoreByMemberMessage` waits for its acknowledgement.
- SR-016 uses one path form.
- 599's cases are renumbered 29 and 30, with a note on taking the next free number.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/follow-ups-615-619`
- Branch: `codex/follow-ups-615-619`
- Base: `origin/personal` @ `dad158474c`
- Installed and built.
- The temporary diagnostics are removed (`git status`: only the untracked SDK `dist/` folders from the install).

## Documents

- `requirements-doc.md`
- `investigation-notes.md`
- `design-spec.md`
- `solution-revision-record.md`
- `follow-ups.md` (FU-001)

## Routing record

- `get_handoff_rules`: the rule for Small or Medium with Low risk sends to `/implementation_engineer`.
- Sent 2026-11-23 to `/implementation_engineer` (run `implementation_engineer_b837a62ada2a4a38923f9ee7df199366`): DELIVERED, with the handoff and the ticket documents attached.
