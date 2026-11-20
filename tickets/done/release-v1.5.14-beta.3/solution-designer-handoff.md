# Handoff — release request: beta v1.5.14-beta.3 (package release-beta-1514-3)

Classification: **Release Requested** (nothing to design; no requirements, notes or design written).

## Request
Task autobyteus-570 (Project project_a1377344-25db-482a-97cc-ecfdb0fb495a), requested by /project_task_manager on the founder's authorization of 2026-11-20, in his words: "If the iOS demo mode is finished we should release", confirmed "Yesss" that this means a beta so the iOS Demo Mode build goes to **TestFlight** automatically, and **not** a submission to Apple App Review (the founder checks on a real iPhone first; the App Review submission only on his explicit word).

- Release kind: **beta** pre-release; expected version **v1.5.14-beta.3** (the last tag is `v1.5.14-beta.2`); the version, steps and checks come from `RELEASE.md`. Always cut from the latest `origin/personal` at the cut (`67b85023b2` when I fetched).
- Range `v1.5.14-beta.2..HEAD`: 37 commits at this handoff; verify at the cut. The one ticket is **autobyteus-279** (iOS Demo Mode, merge `f7b24c8622`); its notes are `tickets/done/ios-demo-mode-279/release-notes.md` on personal. Check for any other commits in the range.
- **Release notes start with "What you need to do"**, in plain language, built from 279's notes and anything else in the range.
- **Grok:** the founder's standing rule: waive the Grok smoke check **only if Grok is out of usage limits**. Any other Grok failure (for example a model-not-offered or discovery failure): stop and send it to me first, as in beta.2 (rerun once with Grok pinned; the founder waived a recurrence of that instability for beta.2 only).
- **Do NOT submit to Apple App Review.** The iOS workflow uploads to App Store Connect/TestFlight only. Report the iOS marketing version, the build number and the upload result from the workflow log (as for beta.2: version 1.5.14, build 342 then).
- Keep GitHub `Latest` on stable `v1.5.13`; Docker `:beta` moves to `1.5.14-beta.3`, `:latest` stays on `1.5.13`.

## Context
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-beta-1514-3`; branch `codex/release-beta-1514-3`; base `origin/personal` @ 67b85023b2 (fetched 2026-11-20); finalization target `origin/personal`.
- The production Linux desktop trust (`DESKTOP_RELEASE_PUBLIC_KEY` and the `desktop-release-signing` environment, Task 564) is provisioned and worked for beta.2: expect the Linux x64/ARM64 builds, the signing job and the sidecars to pass. Do not touch any key, secret or variable; any trust failure: stop and report.
- Gates (from the Task): all four workflows green (Desktop, Server Docker, Android, iOS); **27 assets** (the guide's 23 plus the four Linux signed-release sidecars) with `latest*.yml` published after the server packages; the record copy in `/Users/normy/autobyteus_org/autobyteus-delivery-records/release-v1.5.14-beta.3-autobyteus-570-20261120/` with `archive.sha256` verified; clean up the release worktree, branches and `/tmp` leftovers.
- Known, not blockers: the Grok model-list instability (the follow-up to re-resolve the model per scenario is already sent); the macOS staple retry gap (rerun if it recurs).

## Expected output
`Delivery Completed` to the Solution Designer with the release report (version, tag, published artifacts, checks, Grok decision, iOS TestFlight upload result); I verify the receipt and report to the project task manager.
