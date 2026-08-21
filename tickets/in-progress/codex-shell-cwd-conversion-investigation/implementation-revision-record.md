# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates the initial implementation baseline and any later implementation-owned revisions.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| `IR-001` | `architecture_reviewer` / `design-review-report.md` / Round 1 (`ARCH-REV-001`) | `N/A` | `Initial Baseline` | `SR-001`; `ARCH-REV-001`; `CRR/API-REV/DR: N/A` | `Projection correction complete; ready for code review` |

## Revision Entries

### IR-001 — Preserve stable Codex command CWD across canonical projections

- Triggering role, report path, and round: `architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/in-progress/codex-shell-cwd-conversion-investigation/design-review-report.md`; Round 1 / `ARCH-REV-001` Pass.
- Triggering finding IDs: `N/A`
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: shared-parser projection correction and focused tests are committed at `bf8b71e285ca1bbca0d27a891ebef5f1316788d5`; ready for code review.
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: establishes the initial implementation handoff for the approved projection-only correction after architecture review passed without findings.
- Approved behavior or requirement IDs affected: `BEH-001`–`BEH-004`; `REQ-001`–`REQ-005`; `AC-001`–`AC-006`.
- Implementation delta: the existing `run_bash` argument branch now resolves canonical `cwd` from structured canonical arguments, stable top-level approval params, or stable nested command items, in that precedence order. It assigns only a usable string and does not map raw `workdir`, fabricate a directory, execute a command, or change policy. Focused regression coverage pins parser precedence/absence, live start/completion, approval projection/forwarding, and native history.
- Changed files or areas: one Codex parser source file and four existing Codex unit-test files under parser events, live conversion, native history, and thread approval coordination; canonical implementation artifacts in this ticket folder.
- Local validation and result: focused affected tests Pass (`70` tests plus the exact approval-forwarding test); post-audit parser suite Pass (`5` tests); production TypeScript Pass; full production build/bootstrap Pass; diff/source/size audit Pass. A broader selection retained three unrelated existing team-member fixture-construction failures, and generic package typecheck remains blocked by the repository's `rootDir: src` plus `include: tests` configuration.
- Next recipient or routing: `/code_reviewer`
- Remaining limitations or risks: downstream API/E2E coverage investigation and executable validation remain required; upstream app-server protocol evolution remains an ordinary integration risk; pre-change local traces remain intentionally unenriched.
