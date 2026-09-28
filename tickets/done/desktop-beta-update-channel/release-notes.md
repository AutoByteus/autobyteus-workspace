## What's New
- **Beta updates for the desktop app.** Go to **Settings → Updates** and turn on **Receive beta updates** to get early builds before everyone else.
  - The switch is off by default. Your choice is saved on this computer and is kept across restarts and app updates.
  - With the switch on, the app offers the newest build, beta or stable.
  - Turning the switch off never downgrades. You stay on your current version until a newer stable release is available.
  - When you are running a beta, a **Beta** label appears next to the version.
  - If an update has already been downloaded, the switch is locked until you install it or restart.
- **Beta track for the Docker server.** Run `autobyteus-docker upgrade --all --tag beta` once to follow beta builds. Run `autobyteus-docker upgrade --all --tag latest` to return to stable, but only once a stable release at least as new as your beta is available.

## Improvements
- Beta builds are published as GitHub pre-releases. Everyone who has not turned on beta updates, including older app versions, keeps receiving only stable releases.
