## What you need to do

- **Update the app and every server node it connects to together.** This version changes how a connection resends its state after it drops, so an app on this version cannot read a node on an earlier one. Update your desktop app, your phone, and every Docker or paired node to this release before you rely on them together.
- **Ubuntu desktop (AppImage) users: allow the one-time setup.** On Ubuntu desktops that restrict the browser sandbox, opening the new AppImage offers a protected installation. It needs an internet connection and one Ubuntu administrator authorization the first time. Afterwards open AutoByteus from the menu. Do not turn the sandbox off to get around a setup message; follow the recovery message instead.
- **Nothing else to do, and two things happen once on their own:** on the first start the app converts the stored links of files attached to delegated runs (it keeps a copy first, and on a very large data folder this takes about half a minute), and your Work Journals are rendered again once in the background while memory search re-indexes them. No data is lost.

**Full Changelog**: https://github.com/AutoByteus/autobyteus-workspace/compare/v1.5.14-beta.1...v1.5.14-beta.2
