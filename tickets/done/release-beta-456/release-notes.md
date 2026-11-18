## What you need to do

- **Android:** install the new version of the AutoByteus Android app (the APK on this release). The updated app stops a stray file link from ever showing the pairing screen.
- **Docker nodes:** update your nodes to this beta (`autobyteus-docker upgrade --all --tag beta`), or let them update themselves if you run them on the beta channel. To get the new launcher messages, run the launcher's install command again (`curl -fsSL https://raw.githubusercontent.com/AutoByteus/autobyteus-workspace/personal/scripts/public/docker/autobyteus-docker.sh | bash -s -- install`, or the Windows PowerShell command in the Docker README). Your nodes, their data and their setup codes are not touched.
- **Desktop:** nothing to do. With **Settings > Updates > Receive beta updates** on, the app updates itself.
- **Daily Assistant on another node:** to delegate to a paired node's Daily Assistant, give it a runtime and model on that node, or turn on Model Routing there.

## What's new

- **The Daily Assistant can be delegated to.** It is listed at `/daily_assistant`, so a project manager or any agent can hand it a Task or a description, and `@` offers it in chat, on this node and on a paired node. It is never offered to its own run, and a Team that already has it as a member does not start a second one. The Model Router stays internal and is never offered.
- **Attached files open on the phone.** Images, PDFs and text files attached to a conversation show and open in the phone's own viewer, in sent messages and in the message you are writing. Images show as thumbnails, and Back returns to the conversation. Tapping an attachment no longer shows "Pair this phone again".
- **Files always open with their current content.** Opening a file again, from a conversation link, an attachment or the Files tab, shows its latest content on the desktop and on the phone. An unsaved edit in an open file is kept.
- **`autobyteus-docker setup-code` and `new-container` no longer look stuck.** They say what they are doing (checking the image with Docker's download progress, recreating or starting the node) and print a waiting message with the elapsed time while the node starts. A node that stops answering ends the wait after 90 seconds with its name, the last error and the logs command.

No stored data changes. Rolling back is possible: install the previous version.
