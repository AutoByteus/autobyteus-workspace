## What you need to do

- **The phone's new screens come from the node you pair with.** Update that desktop app or Docker node to this version; the phone shows them the next time it connects. There is nothing to re-pair.
- **On Android, install this release's APK** (`AutoByteus_personal_android-…-release.apk`) to get the screen-edge and keyboard fixes: nothing sits under the status bar or the navigation bar, and the message box stays right above the keyboard.
- Docker nodes: to stop an existing node from publishing its desktop and browser-debug ports to your network, reinstall the Docker launcher (the install command in the Docker Guide), then run `autobyteus-docker upgrade --all`. Each node is recreated once and keeps its Backend and VNC Viewer ports, its data and its settings.
