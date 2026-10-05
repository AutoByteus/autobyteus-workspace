# Delivery Handoff — Awaiting User Verification

DR-001. Small / Low, direct low-risk route. Solution SR-002, implementation IR-002 (IR-001 + CRR-001 F-001 fix), validation API-REV-002 (Pass, 96%). Architecture review N/A. Code review: failure-origin CRR-001 only. Test-code review Not Required.

## Integrated candidate
- Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness, branch `codex/ios-release-ui-test-flakiness`.
- HEAD 77d34f55d, a merge of origin/personal @ 02d6ddf052d31d1e9f3a684c9951c68a85855d19. The bootstrap base was 10fb69504. The 16 new base commits are a server-only AgentRunTermination refactor plus ticket docs, with no overlap with iOS and no conflicts.
- Checkpoint 21c48b51f (local) holds the ticket artifacts. Evidence-log whitespace was normalized, and `.xcresult` bundles are excluded by the repository's .gitignore.
- Code commits: c314aa98c and 8d3cb19ea (already on origin as the ticket branch).
- Post-integration rerun passed: `ios-release-contract-check.py`, and `xcodebuild … -only-testing:AutoByteusMobileCoreTests test` with 21/21 on the iPhone 17 simulator.
- Delivery docs edits (uncommitted until finalization): autobyteus-ios/README.md, TESTING.md.

## Behavior delivered
- The release smoke UI tests (`testFakeNodeOpensAndRestoresWithFakeMobileMarker` and the unreachable test) now wait for readiness instead of using fixed waits. They confirm that the HTTP acknowledgement switch is on and the URL is typed before Connect.
- The tests launch the Debug app with a 60 s connection-check timeout. This override exists only in Debug; Release/TestFlight keep 5 s.
- The fake node gained `--status-delay-seconds` to reproduce a slow host.
- release-ios.yml and its publish gating are unchanged.

## Validation evidence (API-REV-002)
- With a 7 s delayed status, the base fails with the CI signature (swift:66/68) and the fix passes.
- Normal speed passes, and the no-server negative still fails.
- 10/10 hosted release-ios.yml dispatches on 8d3cb19ea passed on attempt 1, on hosts that were often slow (the fake-node test took 45–136 s). Publish jobs were skipped in all 14 dispatches.
- Contract check and core tests 21/21; the smoke script passes.

## User verification
This is a CI test fix with no product change. The user approved the parallel 10-dispatch validation method on 2026-10-05.
The evidence to look at is the 10 green runs 37285707436 … 37285740945. Optionally, run the README's slow-host reproduction locally.
Reply "finalize" (and say whether a release is wanted), or describe concerns. Note that merging alone does not publish anything; the next beta tag will be the first real release run with the fix.

## Known non-blocking notes
- Optional improvement, not done: `continueAfterFailure = false` would make a failing UI test stop at its first error.
- Hosted runner slowness itself is not fixed. The tests now absorb it, and the observed worst case was 136 s with generous bounds.

## Remaining gates
User verification is pending. Not done yet: archiving, the final commit, pushing the updated ticket branch, merging into origin/personal, and cleanup. Finalization target: origin/personal. No release is authorized unless requested.

## Authoritative package (relative to this ticket directory)
requirements-doc.md, investigation-notes.md, solution-revision-record.md, design-spec.md, solution-handoff.md, probes/, implementation-handoff.md, implementation-revision-record.md, implementation-evidence/, code-review-report.md, code-review-revision-record.md, api-e2e-coverage-investigation.md, api-e2e-execution-coverage-report.md, api-e2e-revision-record.md, api-e2e-test-case-ledger.md, api-e2e-evidence/, docs-sync-report.md, handoff-summary.md, release-deployment-report.md, delivery-revision-record.md.

## DR-002 — Finalization and stable release authorized
On 2026-10-05 the user replied "finalize and release a new version" to the verification request. This is explicit acceptance plus finalization and release authorization; no manual verification result is claimed. "A new version" is read as a stable release, matching prior deliveries (for example v1.4.25 and v1.3.16 used the same wording for stable releases, while betas were requested as "a new beta").
Version: 1.4.94, the stable release completing the 1.4.94-beta series (latest stable v1.4.93; betas 1.4.94-beta.1..5). Curated release-notes.md covers all user-facing changes since v1.4.93. Method: `bash scripts/desktop-release.sh release 1.4.94 --release-notes tickets/done/ios-release-ui-test-flakiness/release-notes.md`, run after target finalization in a task-owned clean `personal` clone. This section supersedes the earlier verification hold.
