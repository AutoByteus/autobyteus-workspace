## What you need to do

- **From beta.8: a normal update.** Nothing else to do.
- **From beta.7 or older: two things come with this beta.**
  - **Update the app and every node you connect to together.** An app and a node of different versions cannot open each other's message reference files: the link the app uses changed, and the old one is gone. This applies to the desktop app, the phone app, paired desktop nodes and Docker or remote nodes.
  - **Saved organization runs are converted on the first start, once, and this cannot be undone.** Nothing to do before upgrading: your saved organization runs keep their conversations, messages, memory, Tasks and history. After upgrading, do not install an older version; if you need to go back, contact support instead. If you work with a paired node, upgrade both nodes.
- **Docker nodes:** this release's server image is still system level 2, as the previous betas. A node that is still on a level-1 image (for example the stable 1.5.13) must be recreated once before it takes this beta: run `autobyteus-docker upgrade --all --tag beta`. A node already on a previous beta updates in place.
- **iPhone and iPad: update AutoByteus from TestFlight** to the new build, version 1.5.14 (build 355). It is a TestFlight beta only; nothing is sent for App Store review.
- **Desktop:** with **Settings > Updates > Receive beta updates** on, the app updates itself to this beta.

## What's fixed since beta.8

- **The Memory page lists a Team inside an Org under its Org.** Since Orgs began to hold their Teams as runs of their own (beta.8), the Memory page's Agent Teams list, and each team's runs, showed a Team that belongs to an Org as if it were an Agent Team of its own. The page now lists only real team runs in the Agent Teams view; a Team inside an Org appears under its Org, with its members' memory, as before. Nothing changes for standalone Teams or for the Org's own page.

## Good to know

- If you come from beta.7 or older, everything that is new since then (organizations as containers of runs, reference files of delegated runs, "Stopped" tool calls, the phone's Activity details, Grok improvements and more) is listed in the [beta.8 release notes](https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.5.14-beta.8).
