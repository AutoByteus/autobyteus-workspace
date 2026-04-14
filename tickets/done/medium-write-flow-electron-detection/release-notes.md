## Improvements
- Browser tabs now use a dedicated persistent Browser-owned Electron session instead of the default app session.
- Popup/new-window Browser flows now stay on the same Browser-owned session when Electron supplies matching popup `webContents`.

## Fixes
- Browser popup adoption now rejects foreign-session popup `webContents` cleanly instead of creating stray child Browser state.
- After one-time re-login on the new Browser session, Browser auth can persist across Browser tabs, popup flows, and app restarts.
