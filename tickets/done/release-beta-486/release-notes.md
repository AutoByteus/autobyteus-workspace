## What you need to do

- **Android:** no new app in this beta. If you have not installed the previous beta's Android app yet, install it: downloading files on the phone needs it.
- **Docker nodes:** update your nodes to this beta (`autobyteus-docker upgrade --all --tag beta`), or let them update themselves if you run them on the beta channel. The launcher has not changed.
- **Desktop:** nothing to do. With **Settings > Updates > Receive beta updates** on, the app updates itself.
- **Do not go back to an older version after updating.** Since the previous beta, an older build would not see agents delegated after the update. If you need to go back, contact support instead of installing an older build.

## What's new

- **Contents links in Markdown work.** In a document's Contents list, a link to one of its sections scrolls to that heading instead of opening a "not found" page. This works in conversations, the Files panel, the Skills page and on the phone. A link to another file no longer opens a broken page.
- **Background tasks on the phone.** The phone's **Activity** for an agent shows its background tasks above the tool calls: what each runs, whether it is running, completed, failed or stopped, how it ended (for example "exit code 1") and when it started, updating live.
- Background tasks that started before you opened a run, or before a reload, show at once on the phone and in the desktop's Background Tasks panel, for Claude, AutoByteus and Antigravity runs, as they already did for Codex.
