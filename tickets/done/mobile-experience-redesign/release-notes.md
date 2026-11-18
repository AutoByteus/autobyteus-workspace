## What you need to do

- **The phone's new screens come from the node you pair with.** Update that desktop app or Docker node to this version; the phone shows them the next time it connects. There is nothing to re-pair.
- **On Android 15 and later, install this release's APK** (`AutoByteus_personal_android-…-release.apk`) so the app's screens are no longer drawn under the status bar or the navigation bar. It installs over your current app and keeps your pairing. (The message box staying right above the keyboard comes from the node, with no new APK.)

## Changed

- **Phone Access is rebuilt around your runs.** The phone opens on the same run list as the desktop's Runs view, with each run's delegated work as a tree under it (task agents, task teams, team and org members, runs on other nodes with their node chip). Tap a row to open that agent's conversation and talk to it; a team or org run opens its coordinator.
- **One ⋮ menu per conversation** opens Artifacts, Files (read only, with one search over the folder), Messages (for a member of a team or org) and Activity, each on its own screen. Back walks back one screen at a time.
- **New run** (the round **+**) starts an agent run: Agent, Folder (or a folder by path), Runtime, Model and Auto approve tools.
- **The node name at the top** opens the connection sheet: the node's name, address and state, Check connection, its peer nodes and Unpair.

## Removed

- The phone's Home screen, the "Switch work" sheet and the bottom tabs. Starting a team or org run, Stop/Archive/Delete on rows, file filters and Attach on an opened file are no longer on the phone; use the desktop for them.

## Rolling back

Possible. This release changes no stored data. Desktop updates never downgrade, and a Docker node can be pinned to an earlier version tag.
