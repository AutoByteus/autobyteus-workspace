## What you need to do

- **Android:** install the new version of the AutoByteus Android app (the APK on this release). Full screen now uses the whole screen, also under the camera cutout, and a reload or Android reopening the app brings back the same run and screen.
- **Docker nodes:** update your nodes to this beta (`autobyteus-docker upgrade --all --tag beta`), or let them update themselves if you run them on the beta channel. The launcher has not changed since the previous beta. If you come from an older beta, reinstall it once as that beta's notes say.
- **Desktop:** nothing to do. With **Settings > Updates > Receive beta updates** on, the app updates itself.

## What's new

### Background commands for AutoByteus agents

- AutoByteus agents can run a long command in the background with `run_bash`, for example a build or a dev server. The call returns right away with the command's process id and an output file the agent can read with ordinary commands such as `tail`.
- Commands started with `&` in a normal `run_bash` call are tracked the same way.
- When background commands finish, the agent is told once, with the exit code or signal, how long it ran and its last output lines. Commands that end close together are reported in one notice, and an idle agent wakes up to handle it. No polling is needed.
- The Activity tab's Background Tasks panel shows AutoByteus background commands, running and finished. An agent with a running background command is not shut down for being idle.
- An agent stops a background command with `kill <pid>`, and everything the command started stops with it. Ending or terminating a run stops its background commands. Pressing Stop leaves them running, and their result still arrives.
- The separate background-process tools are retired. Agents that still list them start normally; the old names are skipped.

### Phone and Android fixes

- The Android remote screen viewer's full screen uses the whole screen width, also under the display cutout and on Android 9–14.
- A phone page reload, or Android ending and reopening the app, reopens the same run or Team on the same screen, including runs created with New run.
- In landscape full screen, the Clipboard sheet's Send button stays visible above the keyboard.
- Android names the node and what to try when the node's page answers with an HTTP error.
- Retry after a pairing link failed at first load now pairs the phone.
- The phone guide tells you to tap "Got it" on Android's one-time full-screen hint.
- Live updates stop retrying once the node has ended the phone's session.

### Other fixes

- The Nodes page says why a node is not reached when the node refuses the address's name, and how to allow it (`AUTOBYTEUS_ALLOWED_HOSTS`).
- Phone and browser pages no longer make a health request at start.
- A delegated task of a stopped node leaves the run list within one refresh once its Task is closed.
- Delegating a task to an agent's own address is refused with a clear message.
- An expanded System instructions item shows its whole text in Activity, with no inner scroll.

No stored data changes. Rolling back is possible: install the previous version.
