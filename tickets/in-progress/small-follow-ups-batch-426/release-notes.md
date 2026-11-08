## Improvements

- **The phone shows what the node said about it.** When the computer revokes a phone, the phone returns to its pairing screen. When Phone access is turned off, the phone keeps its pairing, shows "Phone access off" and tells you the node is reachable but Phone access is off; after turning it back on, **Check** loads your runs again. A node that does not answer still shows "Can't reach" with **Check**.
- **The Android app comes back where you were.** When Android closes the app in the background, returning to it reopens the same node page. A pairing link that opened the app no longer shows "This code has expired" when you come back. Run screens still come back as the run list.
- **HTML previews show on Android.** An HTML artifact's preview now opens inside the page in the Android app, walled off from the app.
- **Clipboard for the node desktop on the phone.** In the VNC Viewer's Control mode, **Clipboard** sends text from the phone to the desktop's clipboard and copies the desktop's clipboard text to the phone.
- **Clear answers for a folder typed by path.** On the phone ("Open a folder by path") and in the desktop's New chat, a path that is not an existing folder is refused with the reason, such as "No folder at this path." or "This path is a file, not a folder." The node no longer records such a path as a workspace.
- **Phone Setup for a node on another computer** names that node in its texts instead of "this computer".
- **Dates and numbers follow the app's language** across Memory, settings, activity and other views, not the computer's language.
- **Address lists for Memory Sync and Remote Collaboration** label public addresses as public and list them after private and Tailscale addresses, and no longer offer link-local addresses.
- **Finished conversations explain file links.** When a file link in a read-only conversation cannot be opened, the conversation now says why.
- **The phone no longer tries to connect to the computer it runs on** before it is paired.
- For node operators: a node-desktop stream refused because too many viewers are connected is now logged, with no device or address details.

Rolling back is possible: install the previous version. No stored data changes.
