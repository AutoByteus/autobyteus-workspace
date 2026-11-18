# Handoff — Release Requested (device install): install-beta7-apk-on-phone

- Classification: `Release Requested`. This deploys an already released artifact to the user's device; nothing in the software changes. There is nothing to design: no requirements, investigation or design documents.
- Task: autobyteus-425 in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`, "Install the beta.7 Android APK on the user's phone (plugged in by USB)".
- Requested by: the user, through `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). The user's words (2026-11-07): "can you ask the solution designer from the previous team to install the newest apk to my phone. i already plugged in my phone". The PM's note: this team's delivery engineer installed the beta.4 APK on his Xiaomi phone before (autobyteus-277).
- From: Solution Designer, 2026-11-07.

## What to do (the Task's words)

- Install the APK `AutoByteus_personal_android-1.5.12-beta.7-release.apk` from the GitHub release `v1.5.12-beta.7` on the user's phone over USB (adb). Check the downloaded file against the release's `.sha256` first.
- Install it as an update over the existing app (`adb install -r`), so his saved nodes and paired phones stay. Do NOT uninstall the app, clear its data or change anything else on his phone.
- If the install is refused (for example a different signature or a downgrade), stop and tell him and the PM what the message says. Ask before doing anything that could remove his saved nodes or pairing.
- Do not read or copy anything from his phone beyond what the install needs (a package version check is fine). No screenshots of his phone's content.
- Report: the phone model and Android version as adb shows it, the installed version name afterwards, and what you did.

## Constraints

- The user's phone and data are his: only the install he asked for.
- Use the official APK of the release; do not build a different one.

## Done when

The phone has the beta.7 app (version name checked with adb), his data is kept, a short report goes to the PM, and temporary files are removed.

## Context

- The release `v1.5.12-beta.7` was verified by the Solution Designer on 2026-11-07: GitHub pre-release, 23 assets, Android workflow 42367987210 succeeded on `84596c87b8`. Record: `tickets/done/one-step-phone-pairing/release-deployment-report.md` on `origin/personal`.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/install-beta7-apk-on-phone`, branch `codex/install-beta7-apk-on-phone`, base `origin/personal` @ `270a89a608`. It holds only this handoff file. Commit or drop it as RELEASE.md and your skill decide.
- Return the result to the Solution Designer. The Task asks for a short report to the PM; the Solution Designer sends it after checking the result.
