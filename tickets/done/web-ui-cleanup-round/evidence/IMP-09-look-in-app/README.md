# IMP-09 look in the app (implementation self-check, not API/E2E sign-off)

Stack: `autobyteus-server-ts/dist/app.js` (built from the item-2 code) on a fresh temp data root, port 18731; `pnpm dev`
(Nuxt dev from commit 51a0aec3ac's web sources) on 18732 bound to it; inspected through the browser tab tools at the
tab's own width (the narrow/stacked Settings layout and a wider render). Stopped and removed afterwards.

Observed (DOM checks, then screenshots):
- Settings menu: 13 items, text only (0 svg each); "Back to Workspace" keeps its arrow (1 svg; it appears once Iconify
  has loaded it, as before — `server-settings-submenu.png` caught it mid-load).
- Server Settings submenu: Basics/Embedding/Advanced/Migrations indented 16 px under the label (`ml-2`).
- Local Tools: tool cards show the name and description, no icon box (0 svg).
- MCP Servers: "Bulk Import"/"Add Server" without icons; card rows "Prefix: …", "Command: …", "CWD: …" without icons;
  "Sync Tools" without sparkles; the search magnifier (group C) stays.
- Memory → Search with voice input not installed: no voice button, input right padding 12 px (`pr-3`); search disabled
  until the index is ready. The button itself (voice extension enabled) is AC-011's look in the app (API/E2E).
- Agent Runtimes names and the Settings sidebar at 1440 px: IMP-07 probe screenshots (e.g. `ARP-01b-VIS-001-table-1440-en.png`).
