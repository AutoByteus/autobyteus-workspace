## What you need to do

- For the phone's VNC Viewer full screen to turn the phone to landscape and hide Android's bars, install this release's Android APK and update the Docker node you view (on the beta track: `autobyteus-docker upgrade --all --tag beta`). With an older app, full screen still works inside the page, without turning the phone or hiding Android's bars.

## Improvements

- Phone VNC Viewer: **Full screen** turns the phone to landscape, either way round, even with auto-rotate off, and hides Android's status and navigation bars. Leaving full screen gives back your own orientation and bars. Leave with the **Show controls** strip, the Back key or gesture, or a tap in View only.
- In View only, a double tap switches between **Fit** (the whole desktop) and **Fill** (the picture covers the screen; drag to see the rest). Nothing reaches the desktop while you do this.
- In Control full screen, **Keyboard** and **Clipboard** stay at hand in the top strip, so you can type and paste without leaving full screen.
- In a desktop or phone browser, full screen uses the browser's own full screen. It asks for landscape where the browser allows it (Chrome on Android), and Esc leaves it.
