## Videos play at once in the phone apps, and full screen works on Android

(For the release that includes this change. User-facing. No user action is needed, so there is no "What you need to do" section: an app without the new player keeps playing videos as before.)

- **A video starts playing right away and jumps anywhere.** In the Android and iOS apps, a video of your node opens in the phone's own video player. It no longer downloads the whole file before it plays: it starts in about a second, and a jump to the middle fetches only the part it needs. This holds for a video you open from Files, from a link in the chat, or from a media message.
- **A video you reopen is not downloaded again.** The app keeps the parts it already fetched, up to 500 MB, and drops the least recently used first. When the file has changed on the node, you get the new version. Removing a node from the app empties its saved videos.
- **Full screen.** A wide video fills the screen in landscape, and leaving full screen returns to portrait at the same place in the video. On Android, the full-screen button of a video shown inside a page works too: it was disabled before.
- **Your phone's key stays private.** It goes only to your own node, in a request header. It is never part of a link, a log or a saved file.
- **A rewritten file shows its new content.** When an agent rewrites a file, opening it again shows the new version, in the phone apps, in the desktop app and in a browser. The node now tells every client to check for a newer copy before it reuses one.

### Good to know

- The new player needs the new app. An older app, the node's web page in a phone browser and the desktop app play videos in the page as before.
- On iOS, the app's **Back** bar stays over a video in landscape; the player's own close button also closes it.
- On Android, if the system switches dark mode while a video plays, the player shows "This video could not be played." Press **Back**, then **Play**: the video continues from what the app saved.
- On a connection slower than the video itself, the iPhone plays at the speed of the connection, and the time bar can run a little ahead of the picture.
- Audio files, and a video reached only through a message's list of reference files, still download completely before they play.
