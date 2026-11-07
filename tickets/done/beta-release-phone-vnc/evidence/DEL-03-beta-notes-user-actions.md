## What you need to do

- Nothing, if you reach your node directly, through Tailscale Serve, or through a proxy that keeps the original host name (or sends `X-Forwarded-Host`).
- If your phone reaches the node through a gateway or proxy that rewrites the host name and does not send `X-Forwarded-Host`, add the phone URL's origin to the node setting `AUTOBYTEUS_ALLOWED_ORIGINS` (for example `AUTOBYTEUS_ALLOWED_ORIGINS=https://gateway.example.com` in the node's `.env`) and restart the node. Otherwise the phone shows the node as unreachable and the node logs `REMOTE_ACCESS_ORIGIN_REFUSED`.
- To see a Docker node's desktop on your phone, update that node to this release (on the beta track: `autobyteus-docker upgrade --all --tag beta`). The phone gets the new screen from the node it is paired with. The VNC Viewer needs no Android app update, but this release's APK (`AutoByteus_personal_android-1.5.12-beta.6-release.apk`) keeps the open page when you rotate the phone.
