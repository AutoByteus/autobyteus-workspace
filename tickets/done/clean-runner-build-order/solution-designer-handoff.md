# Handoff — clean-runner-build-order (Architecture Design Complete, Small / Low, direct implementation route)

## Request
The beta v1.5.11-beta.11 is blocked: the build-only desktop run failed all five jobs in the web type gate on a clean runner (delivery's Blocked report: `/Users/normy/autobyteus_org/autobyteus-worktrees/clean-runner-build-order/../release-beta-20261102` branch `codex/release-beta-20261102`, commit 1d5afd7a41, `tickets/in-progress/release-beta-20261102/release-deployment-report.md`). The user, relayed by delivery, asked for the fix and for a design rule about release-runner build order in DESIGN.md "so that you consider it when you design".

## Status
- Requirements: Approved (Solution Designer within the direction; the user informed in the Solution Designer's conversation).
- Design: Ready. `task_size=Small`, `architectural_risk=Low`. Route: direct (implementation, API/E2E validation, delivery); no independent architecture review.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/clean-runner-build-order`, branch `codex/clean-runner-build-order`, base `origin/personal` @ 84ea944ac5, commit with the documents 2e0d7e8303. Finalization target: `origin/personal`. NOTE: the worktree contains untracked `*/dist/` folders from the investigation; never commit them (RELEASE.md), and do your clean-clone proof in a fresh clone or worktree.

## What is done and what is yours
- Done by me (the guide documents, committed): DESIGN.md rule 12, the checklist item and the anti-pattern; docs/design-cases.md Case 15; pointers in TESTING.md and RELEASE.md; the RELEASE.md case study. Do not edit them; wording corrections go back to me.
- Yours: the five script lines in the two `package.json` files (design-spec "Intended Change" 1 and 2), then the implementation-scoped checks in "Guidance For Implementation" (clean-clone web and server typecheck; the built machine check). Reproduction: `evidence/INV-01-…log` fails today; the expected pass is `evidence/INV-03-…log`.
- Not yours: `pnpm release:test` (delivery runs the build-only release run on the pushed branch before the merge: AC-004).

## Evidence and decisions
Investigation `investigation-notes.md` F-01…F-09 (reproduced on a clean install: the gate fails; the server's prepare plus the Prisma client turns it green). DEC-1: one prepare owner (the server's), not a second list. DEC-3: the enforceable guard (a clean-runner CI job) is follow-up FU-1, to be sent to the requester later.

## Open risks
`prisma generate` on the five runners (it already runs in `prepare-server`); the double build time (ASM-001). Both are shown by AC-004.

## Next after this
The release resumes: delivery runs the build-only run on this branch, merges, then the Solution Designer sends a new Release Requested for the beta (the earlier handoff `release-beta-20261102` still stands).

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/clean-runner-build-order/tickets/in-progress/clean-runner-build-order`.
