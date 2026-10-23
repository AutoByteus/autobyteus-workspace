# IMP-11 Rendered re-check of the flows CRR-001 restructured

- Commit: `23f3feb193` (the CRR-001 fixes; server `dist` unchanged from IMP-08, no server source changed). Date 2026-10-23.
  macOS, Node v22.23.1, agent Chromium.
- Stack as IMP-08, with fresh data roots: alpha `127.0.0.1:38701`, beta `127.0.0.1:38702` (test-owned, `env -i`),
  Nuxt dev `127.0.0.1:38710` against alpha (browser mode). Stopped afterwards; ports 38701/38702/38710 free.

| # | Step | Observed (DOM text read back) |
| --- | --- | --- |
| 1 | Open the tab; the browser's list still had beta with the node ID of the earlier (deleted) beta | The window's probe answered with the new beta's ID; `identify` replaced the stored ID (AR-003); one row keyed `srv_XZLE…`. |
| 2 | Remove beta (not collaborating) | "Remove beta?" with only "Remove beta from your list" → removed. |
| 3 | Add `http://127.0.0.1:38702` "beta", switch on (CR-003: `addNode` returns `confirm`, `AddNodePanel` opens the dialog) | "Let agents work with beta?" with turn on here, register beta here, turn on there, register this node there + "beta finds this node's address once it is on." |
| 4 | Turn on | Row: "beta shares no Agents or Agent Teams."; both servers on with each other registered. |
| 5 | Rename to "lab box" (via `nodeListStore` → connector, no dialog) | Row and alpha's peer named "lab box". |
| 6 | Change address `http://127.0.0.1:38799` (CR-002: one `changeAddressHere` step) | Editor stays: "Nothing answers at that address and port." |
| 7 | Change address `http://localhost:38702` | Saved: alpha's peer `lab box @ http://localhost:38702`. |
