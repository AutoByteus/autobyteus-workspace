## What you need to do

- Update the Android app and every node you open from your phone together: the desktop app, and each Docker node (on the beta track: `autobyteus-docker upgrade --all --tag beta`). An updated app opening a node that still runs the older version stays on "Connecting to …" until that node is updated.

## Improvements

- Phone privacy: the phone app shows your nodes only by name, never by their network address. This covers the node list, Switch node, Connecting, Can't reach, the header inside a node and its connection sheet, so screenshots you share no longer show your computer's or your Tailscale network's name. A node with no name yet reads "AutoByteus node", and it takes its name when you pair it.
- When a node can't be reached while it is open, the phone shows "Can't reach <node>. Check that Tailscale or your Wi-Fi is on and the computer is awake." with Retry, and nothing else behind it. Once the node is back, Retry opens its page again.
- Links that open outside the app now say "Opening outside AutoByteus" without the link's address. Blocked links and links no app can open are explained in plain words.
