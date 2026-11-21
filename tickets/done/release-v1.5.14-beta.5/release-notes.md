## What you need to do

- **iPhone and iPad: update AutoByteus from TestFlight.** This beta brings a new TestFlight build of AutoByteus, version 1.5.14 (build 349), the first built with Xcode 27 and the iOS 27 SDK, which App Store Connect requires from April 2027. It includes **Try demo** on the first screen, to look at the whole app with sample data before you connect a computer. It is a TestFlight beta only; nothing is sent for App Store review.
- **Coming from beta.3 or earlier?** Update the desktop app and every node you connect to together: the desktop app, your Docker nodes and your paired nodes. The agent pages and the Memory page changed shape in beta.4, and messages between nodes now name the sending and receiving agent in a new way, so an older app or node with a newer one can fail to load those pages or refuse a message. Nothing is converted when the app first starts. From beta.4, nothing extra is needed.
- **Docker nodes:** run `autobyteus-docker upgrade --all`. Nodes on the beta track get this beta; nodes on the stable track stay on 1.5.13 (switch a node to the beta track once with `autobyteus-docker upgrade --all --tag beta`).
- **Desktop:** with **Settings > Updates > Receive beta updates** on, the app updates itself to this beta.

## Good to know

- After the update, your agents' Work Journals are rebuilt once in the background, and memory search re-indexes the changed ones. Nothing needs to be done and no data is lost; the journals are rebuilt from the raw records.
