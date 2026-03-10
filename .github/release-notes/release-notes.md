## Improvements
- Managed messaging now uses the server's internal runtime URL for colocated gateway callbacks instead of reusing the public client URL.
- Embedded server deployments now write the actual started callback port into the managed messaging runtime configuration.

## Fixes
- Fixed Docker-backed remote nodes so Telegram-triggered managed messaging no longer tries to call the server through the host-mapped public URL from inside the container.
