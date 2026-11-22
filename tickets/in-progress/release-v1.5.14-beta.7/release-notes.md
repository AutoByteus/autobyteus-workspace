## What you need to do

- **Update every node that is paired with another node to this release together.** A node on this release refuses a message, a delegation or a Task close from a paired node on an older release, so two paired nodes on different releases cannot work together reliably until both are updated. An agent that sends to another node now always names that node (`node` on every cross-node `send_message_to` and `delegate_task`).
- **Docker nodes: recreate them once.** This release's server image is system level 2 (the browser base chrome-vnc 1.4.2, with the fix for the VNC desktop after a restart). A node still on a level-1 image refuses the level-2 server update until it is recreated: run `autobyteus-docker upgrade --all` (it recreates each managed node from its saved image and keeps its volumes). Nodes on the beta track get this beta; nodes on the stable track stay on 1.5.13 (switch a node to the beta track once with `autobyteus-docker upgrade --all --tag beta`).
- **iPhone and iPad: update AutoByteus from TestFlight** to the new build, version 1.5.14 (build @@IOS_BUILD@@). It is a TestFlight beta only; nothing is sent for App Store review.
- **Desktop:** with **Settings > Updates > Receive beta updates** on, the app updates itself to this beta.

## Good to know

- Agents can now send files to agents on other nodes with `send_message_to` and `delegate_task`; the receiving node keeps its own read-only copy.
- Closing a Task also stops the work it delegated to another node.
- A running team now follows its team definition: members added join Offline, removed members leave after their current turn.
- The Linux ARM64 AppImage starts on a standard desktop again, with no extra system package.
- On Ubuntu, with **Update automatically** on, the managed app now installs a verified update right away, which can interrupt a running turn; the run gets an update notice and you can continue.
