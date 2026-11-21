## What you need to do

- **iPhone and iPad: update AutoByteus from TestFlight.** This beta brings a new TestFlight build, version 1.5.14 (build 352). Its icon is now the AutoByteus logo, the same mark as on the desktop and Android, and it declares its encryption use, so it needs no manual compliance answer. It is a TestFlight beta only; nothing is sent for App Store review.
- **Coming from beta.3 or earlier?** Update the desktop app and every node you connect to together: the desktop app, your Docker nodes and your paired nodes (the agent pages, the Memory page and messages between nodes changed in beta.4). Nothing is converted when the app first starts.
- **Docker nodes:** run `autobyteus-docker upgrade --all`. Nodes on the beta track get this beta; nodes on the stable track stay on 1.5.13 (switch a node to the beta track once with `autobyteus-docker upgrade --all --tag beta`).
- **Desktop:** with **Settings > Updates > Receive beta updates** on, the app updates itself to this beta.

## Good to know

- After you switch a run's agent runtime, the new agent is told which work journal to read first and asked to read it completely.
- On Ubuntu, with **Update automatically** on, the managed app can restart itself into a verified update once no agent is working and you have not used it for five minutes.
