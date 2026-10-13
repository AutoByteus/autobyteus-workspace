# Release Notes — Clearer Runtime Availability In The Model Menu

Status: prepared before finalization. Whether this ships in a release, and with which version, is decided at finalization.

## Fixes
- **Antigravity CLI that is not signed in now says so.** On a node where the Antigravity CLI (`agy`) is installed but not signed in, the model menu now shows "Not signed in on this node. Run `agy` to sign in." Before, it showed a generic "model discovery failed" message. Starting a run, changing the model and launching an application show the same message.
- **The model menu no longer says "Not installed" for every unavailable runtime.** A runtime that can't be used now shows "Unavailable", with the reason under its name, for example the sign-in message above. Before, the menu showed "Not installed" for any cause and the reason appeared only in a tooltip.
- **Signing in takes effect without reloading the app.** Each time you open the model menu, it checks again any runtime that was unavailable. After you sign in, reopen the menu and the runtime can be selected.
- **Clearer messages when the Antigravity CLI is missing or too old.**

## Notes
- On a Docker node, open that node's Terminal, run `agy` and finish signing in, then reopen the model menu. Each node keeps its own sign-in, and the sign-in survives image updates as long as the node's volume is kept.
- Runtimes that are already available are not checked again when the menu opens. If a sign-in expires while the app is open, the error appears when you send a message, and the menu shows the runtime as Unavailable after the app reloads.
