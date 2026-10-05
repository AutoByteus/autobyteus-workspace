# Solution handoff — Architecture Design Complete
## Identity and status
- Package: ios-release-ui-test-flakiness — fix the intermittent iOS release smoke UI-test failure. Revision SR-002.
- Result: **Architecture Design Complete**; task_size **Small**, architectural_risk **Low** (design-spec.md).
- Requirements: **Approved** by the user 2026-10-05 ("lets try to fix it", U02).
- Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness; branch codex/ios-release-ui-test-flakiness; base origin/personal @ 10fb69504; finalization target origin/personal. Ticket artifacts untracked; no commits yet.

## Request and goal
Requested by the user (via delivery) after v1.4.94-beta.5: the iOS release first attempt fails often and passes on rerun. Goal: the iOS release passes reliably on the first attempt, root cause fixed, without blind retries. The iOS app is currently not in active use (App Store review blocked), so production behavior must stay unchanged.

## Proven evidence
- Runner image and code ruled out (same macos-26-arm64 20260828.587 and Xcode for every attempt; no iOS/workflow/script diff between the last clean and first failing tags).
- All 7 failing first attempts classified: (A) the app's 5 s connection check timed out on a slow simulator → "node unreachable" screen (5); (B) the marker appeared after the 20 s wait (1); (C) typing before keyboard focus (1).
- Deterministic local reproduction of (A): fake server delaying the status response by 7 s → exactly the CI failure (same errors, exit 65, same screen); baseline passes (probes/local-repro/).

## Required implementation
See design-spec.md: a DEBUG-only `AUTOBYTEUS_CONNECTION_TIMEOUT_SECONDS` launch override in AppShellCoordinator → ConnectionValidator(timeoutSeconds:); UI tests apply it on every launch (including restore), wait for readiness (hittable elements, keyboard focus) and use generous bounded waits; fake server `--status-delay-seconds` for local regression; docs.

## Acceptance
REQ-I1–I4 (requirements-doc.md): local proof with delays 0/7/30 s plus a negative check; core tests and the contract check pass; CI proof = 10 sequential manual dispatches of release-ios.yml on the fix branch with publish_app_store_connect=false, all passing on the first attempt with publish jobs skipped. Never dispatch with publish_app_store_connect=true; dispatch sequentially (shared concurrency group cancels extra pending runs).

## Artifacts (absolute paths)
- /Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness/tickets/in-progress/ios-release-ui-test-flakiness/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness/tickets/in-progress/ios-release-ui-test-flakiness/design-spec.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness/tickets/in-progress/ios-release-ui-test-flakiness/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness/tickets/in-progress/ios-release-ui-test-flakiness/solution-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness/tickets/in-progress/ios-release-ui-test-flakiness/probes/ (local-repro/, beta5 failure screen and server log, ci-launch-timings.txt, timing.py, delays.py)
- Architecture review: N/A — not applicable (Small/Low direct route). Product artifacts: N/A — not applicable.

## Constraints and open risks
No production timeout change; no workflow publish-gating change; no job-level retries. The CI proof consumes ~10 hosted macOS runs. Unknown additional slowness forms are bounded by the 10-run proof.

## Expected output
Implementation with local proof and implementation-handoff.md; then validation (CI dispatch series) and delivery.

## Routing
get_handoff_rules → "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → /implementation_engineer.
- Sent 2026-10-05 via send_message_to → /implementation_engineer; DELIVERED, target_agent_run_id implementation_engineer_8368905559634bb4a617100bcac1f243.
