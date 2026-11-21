## What you need to do

- **Update the desktop app and every node you connect to together:** the desktop app, your Docker nodes and your paired nodes. In this release the data behind the agent pages and the new Memory page changed shape, and messages between nodes name the sending and receiving agent in a new way. An older app with a newer node (or the reverse) can fail to load those pages, and a message between a node on this release and a paired node on an older release is refused. Nothing is converted when the app first starts.
- **Docker nodes:** run `autobyteus-docker upgrade --all`. Nodes on the beta track get this beta; nodes on the stable track stay on 1.5.13 (switch a node to the beta track once with `autobyteus-docker upgrade --all --tag beta`).
- **iPhone and iPad:** a new TestFlight build of AutoByteus 1.5.14 is on its way, built with Xcode 27 and the iOS 27 SDK, which App Store Connect requires from April 2027. Update it from TestFlight. It is a TestFlight beta only; nothing is sent for App Store review.
- **Desktop:** with **Settings > Updates > Receive beta updates** on, the app updates itself to this beta.

## Good to know

- Semantic memory is now on for every agent, with no switch, plus one global folder that every agent can read and write. Each agent's instructions gain two short sections about them.
- A run that has delegated work now opens on **Activity**; its messages are on the new **Messages** tab.
- On Ubuntu, the managed app repairs its own shortcut and icon the first time the updated app starts.
