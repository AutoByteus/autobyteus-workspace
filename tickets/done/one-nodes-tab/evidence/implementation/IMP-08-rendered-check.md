# IMP-08 Rendered check of Manage Nodes (implementation self-validation)

- Commit: base `ca1f09e52a` + the implementation working tree (committed as the implementation commit named in the handoff).
- Date: 2026-10-23. macOS, Node v22.23.1, the agent browser (Chromium).
- Stack: two test-owned servers of this worktree's `autobyteus-server-ts/dist` (built from the working tree), each with
  its own data root under `/tmp/one-nodes-visual/<name>` and a clean environment (`env -i`): alpha `127.0.0.1:38701`,
  beta `127.0.0.1:38702`. Nuxt dev server `127.0.0.1:38710` with `BACKEND_NODE_BASE_URL=http://127.0.0.1:38701`
  (browser mode: "This node" is alpha; no Open icon). No user data, app or container was touched.
- Viewports: the browser tab is 400–518 CSS px wide (the narrow layout). The desktop layout was rendered in a
  same-origin 1440 px iframe scaled into the tab (media queries use the iframe's width).
- This is not API/E2E sign-off. The Electron shell (Open, desktop registry IPC) and a node in Docker (the loopback hint
  end to end) were not exercised here.

## Steps and what was observed (DOM text read back after each step)

| # | Step | Observed |
| --- | --- | --- |
| 1 | Open `/nodes?nodeTab=manage` | Tabs: Manage Nodes, Memory Sync, Phone Setup, Docker Guide, NFS Guide (no Remote Collaboration). "This node" card: Embedded Node, EMBEDDED, `http://127.0.0.1:38701`, Remote collaboration Off with the off note. Empty list text: "No other nodes yet. Add one to open its window or let agents work with it." |
| 2 | Add `http://127.0.0.1:38702` "beta", switch on | First run found a defect: the confirmation did not open (the dialog took the window address only from a finished probe). Fixed (`nodeChangeDialogStore.targetOf`); after the fix, Turn on opens it. |
| 3 | Confirmation (alpha off, beta off) | "Let agents work with beta?" On this node (Embedded Node): Turn on remote collaboration (it is off), Register beta as “beta”; On beta: Turn on remote collaboration (it is off), Register this node as “Embedded Node” + "beta finds this node's address once it is on."; trusted note; Cancel / Turn on (`IMP-08-narrow-confirm-turn-on.png`). |
| 4 | Turn on | Dialog closed; row: "beta shares no Agents or Agent Teams." Server check: alpha peer `beta @ http://127.0.0.1:38702`, beta peer `Embedded Node @ http://127.0.0.1:38701`, both switches on. |
| 5 | Open the row's details (1440 px) | "This node → beta ✓ Working via http://127.0.0.1:38702 Change address"; "beta → this node ✓ Working via http://127.0.0.1:38701"; Node ID; Checked hh:mm (`IMP-08-desktop-1440-working-details.png`). |
| 6 | Change address to `http://127.0.0.1:38799` | First run found a design-text issue: with the other node's candidates after the typed address, the old address was kept silently. Changed to check the typed address alone (AC-707, VIS-026). After the fix: the editor stays with "Nothing answers at that address and port." |
| 7 | Turn beta's switch off on beta, Check again | Amber line "Remote collaboration is off on beta. [Turn on there]"; both directions "⚠ Off on beta". Turn on there → "Finish connecting beta?" with only "On beta: Turn on remote collaboration (it is off)" → Make these changes → working. |
| 8 | Switch beta's row off | "Stop agents working with beta?" Remove beta from this node / Remove this node from beta / "beta stays in your list, and its own remote collaboration stays on." → Turn off: both peers lists empty, both switches still on. |
| 9 | Register alpha on beta directly, reopen the tab | "ⓘ beta has registered this node. Its agents can reach this node once you turn collaboration on for beta. [Turn on]" → the confirmation lists only "Register beta as “beta”". |
| 10 | Rename to "Embedded Node", then "lab box" | "Another node is already named Embedded Node." (field stays); "lab box" saved: alpha's peer and the browser's desktop entry both renamed; the entry keeps `serverInstanceId`. |
| 11 | Add `localhost:38702` again | "ⓘ This is lab box, already in your list." (matched by node ID; different host spelling). |
| 12 | Add `http://127.0.0.1:38799` "ghost" | Row added, hollow dot, "ⓘ Not reachable. Nothing answers at that address and port. [Check again]", switch off and disabled; no confirmation, no notice. |
| 13 | This node's switch off (1440 px) | Off note; collaborating row: switch dimmed, "Connection details", both directions "⚠ Off on this node"; the unreachable row keeps its line (`IMP-08-desktop-1440-this-node-off.png`). Compared with VIS-024: Change address was hidden while off; changed to stay visible, as in VIS-024. |
| 14 | Remove "ghost" | "Remove ghost?" lists only "Remove ghost from your list" + "The node and its data are not touched." → removed. |
| 15 | Stop beta, Remove "lab box" | "Remove lab box?" lists the three lines (VIS-009). After Remove: ✓ Remove lab box from this node, ✗ Remove this node from lab box "Nothing answers at that address and port.", ✓ Remove lab box from your list, "Removed here. lab box could not be reached, so this node is still registered there." with Close only; the row is gone. |
| 16 | zh-CN (1440 px), beta re-added and Cancel | Chinese copy throughout; the "registered only by the other node" line in Chinese (`IMP-08-desktop-1440-zh-CN-registered-only-there.png`). |
| 17 | Narrow (518 px) | Add form stacks Address, Name, switch, Add node; the row's controls wrap under the name (`IMP-08-narrow-stacked-form-and-row.png`). |
