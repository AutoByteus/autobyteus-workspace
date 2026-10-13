> Historical DR-001 checklist, superseded by `verification-record.md` / DR-002. No mandatory user recheck remains under the updated skill; no user test or runtime answer is fabricated.

# User Verification — pending, DR-001

- Package: delegated-team-default-collapse / project_task_394f7ced-6597-41e8-824a-e2140c35b743.
- Candidate source: integrated merge `c0a4c04af3d5ae1c3b00175f0b96fc81506affff` plus documentation-only delivery edits; branch/worktree in handoff-summary.md.
- Actual user OS/runtime/version: unconfirmed. Delivery async question on 2026-10-13 asks OS, AutoByteus version and desktop versus browser/server. No response or acceptance received at DR-001.
- Agent tests and CRR-002 Pass are not user verification. The user's installed application has not changed. Checking an older installed app cannot verify this candidate.
- Appropriate user-visible isolated changed-build check: not yet arranged, pending runtime clarification. Existing API native test instance is stopped/removed; do not direct the user to dead ports or claim that the pre-integration binary is a freshly built integrated app.

## Check with a build containing the fix, once safely supplied
1. On fresh frontend/app startup, open the manager with several delegated Teams: Team rows visible, members hidden; settling/refresh must not open every Team.
2. Expand one Team; siblings stay closed. Choose an exact member conversation, then collapse; conversation/draft and ongoing work remain. Reselect manager/refresh: explicit same-session choice remains.
3. Open an explicit Project Task root: only its target Team is revealed and its coordinator selected. Existing status/Task behavior remains normal.
4. Restart only the isolated candidate: Teams return to closed. Report whether the previously perceived initial wait remains; no speedup is promised.
5. Explicitly confirm candidate acceptance or report failed steps, identifying tested OS/runtime/version and candidate. Also state release choice if wanted: no release (default), beta or stable. Approval to implement/review is not acceptance or release authorization.

Do not restart/upgrade the user's active app, import credentials, alter live data or close current workers to make this check pass. Delivery owns ordinary safe isolated setup; a native test on Linux does not claim macOS/Windows runtime validation.

## Gate receipt
- Explicit user acceptance: **No**.
- Accepted candidate/runtime/reference: **None**.
- Finalization/release authorization inferred: **No**.
- Next action: await runtime clarification, arrange verification within available platform capabilities, and record the actual explicit response before finalization. If further target integration materially changes the user-visible candidate, obtain renewed verification.
