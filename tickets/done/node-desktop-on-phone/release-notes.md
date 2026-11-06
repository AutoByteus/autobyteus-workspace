## What you need to do

- To see a Docker node's desktop on your phone, update that node to this release (on the beta track: `autobyteus-docker upgrade --all --tag beta`). The phone gets the new screen from the node it is paired with; the Android app itself does not need an update.

## What's New

- Watch the agent's desktop on your phone: on a Docker node, a run's ⋮ menu has a **VNC Viewer**. It opens in View only, fitted to the screen, in portrait or landscape. Pinch to zoom, drag to pan, and double tap or **Fit** to go back. **Full screen** hides the bars.
- Switch to **Control** to tap, drag and scroll on the desktop, and open **Keyboard** to type, including suggestions and corrections from your phone's keyboard.
- The same view works in a desktop browser paired with the node's `/mobile` address, with the mouse, and with Ctrl+scroll or a trackpad pinch to zoom.

## Improvements

- When you leave the app, the desktop stream stops. It reconnects in View only when you come back.
- Turning Phone Access off or removing a paired phone ends that phone's desktop view within 30 seconds.
- A node shows at most four desktop streams at once, and at most two from one phone. Past that, the viewer says "Too many viewers on this node right now" and offers Retry.
