# IMP-06 — Rendered check of the Manage Nodes tab (autobyteus-363)

- Check ID: IMP-06 (implementation feedback loop; not API/E2E sign-off)
- Date: 2026-11-02, 09:20–09:50 CET
- Code: the 363 working tree that became commit `523bd0454b`. The medium-gap fix below was applied during this check. The rem font sizes, also in `523bd0454b`, came from the font-size audit right after it. At the default font size they render the same pixels (0.8125rem = 13px).
- Environment: macOS Darwin 25.5.0, node v22.23.1. The page ran in the AutoByteus browser tool (Chromium) through an iframe harness, so the frame width could be set exactly.
- Stack (test-owned, none of the user's data):
  - Three servers built from this worktree: `autobyteus-server-ts/dist/app.js`, alpha `127.0.0.1:39701`, beta `:39702`, gamma `:39703`. Each started by [start-node.sh](start-node.sh) with `env -i` and its own data root under `/tmp/mnp-visual/<name>`.
  - Nuxt dev on `127.0.0.1:39710` with `BACKEND_NODE_BASE_URL=http://127.0.0.1:39701`, opened at `/nodes?nodeTab=manage`.
  - Stopped and removed after the check; ports 39701–39703 and 39710 free.
- States set up:
  - alpha's remote collaboration on;
  - beta collaborating both ways ("Working" both directions, empty offer);
  - gamma registered on alpha with gamma's own switch off (warn notice "Remote collaboration is off on gamma." with "Turn on there");
  - "ghost" `127.0.0.1:39799`, added with the form's switch off: never reached, info notice "Not reachable. Nothing answers at that address and port." with "Check again".
- Context: browser (no Open icon; `hasOpen=false`), on the embedded node.

## Compared with the approved package

| Screenshot | Width | Compared with | Result |
| --- | --- | --- | --- |
| [desktop-1440-en-details-open.png](desktop-1440-en-details-open.png) | Window 1440 (card 1053 px, wide layout) | VIS-002 conventions; VIS-022 (version unknown), VIS-025 (browser, no Open), VIS-027 (empty offer, panel open) | Matches: one line per row (who, server, offer, capsule, actions); capsules and trash icons in one column; info, warn and framed panel shapes as the package; directions with the ✓-circle icon and "Working"; "Connection details" on one line. |
| [desktop-1440-zh-CN-details-open.png](desktop-1440-zh-CN-details-open.png) | Window 1440, zh-CN | VIS-030 | Matches the zh-CN reference: tab bar, This node card, add band, notice shapes and buttons (重新检查, 在对方开启), 连接详情 toggle. No clipping. |
| [medium-card713-en-before-gap-fix.png](medium-card713-en-before-gap-fix.png) | Card 713 px (two tiers) | Spec: "under them server then offer" | Before the gap fix: alignment right (after the earlier grid-area fix), but the never-reached row had a larger gap above its notice. |
| [medium-card713-en-details-open.png](medium-card713-en-details-open.png) | Card 713 px | Same | After the gap fix: name, capsule and trash on the first tier; server, then offer, under the name; the ghost row's notice gap equals the others'. |
| [narrow-390-en-details-open.png](narrow-390-en-details-open.png) | Window 390 (card 292 px, stacked) | VIS-033 | Matches: add band stacked with the full-width capsule and button; capsule under the offer; notice button under the text; panel directions wrap without clipping. |

## Issues found and corrected during the check

1. **Medium layout (two tiers): the reference's areas misaligned the capsules.** The reference used `'name collab actions' 'server offer offer'`. The server cell spanned only an auto column, so it widened that column per row: the capsules sat at different x from row to row, and "Connection details" wrapped. Fix: every cell below the first line spans all columns, including the 1fr one (`'server server server' 'offer offer offer'`). This also matches the spec text "under them server then offer".
2. **Empty-track gaps.** A row with no server or offer cell (never reached) kept two empty grid tracks, and their row gaps added space above its notice. Fix: no `row-gap`; each cell carries its own top margin, so a hidden (`:empty`) cell takes its spacing with it. Wide layout unchanged (margins 0 there). Narrow re-checked after the fix.
3. **Template-root comments made fragments** (the reference's `NodeServerUpdate`, `NodeNoticeIcon`, `NodeCollaborationSwitch`). Moved into script doc comments, so the single root keeps fallthrough attributes. Found by the component specs, before the rendered check.

## Not inspected here

- The Electron desktop window (Open icon, window on a Docker node in the shell). The Open slot and the Docker window are covered by the component specs and the Docker probe (IMP-08, ND-05 `window-on-docker`), not by an isolated desktop instance.
- Update available, updating and restarting, update result notices: the test servers report no server version ("Server version unknown"). These states are covered only by `NodeServerUpdate.spec.ts` (13 tests: version, update offered, progress, restarting, not reachable, result notices, Copy command, one ask per row). Neither browser probe builds them, so their rendered look against VIS-015…021, VIS-037 and the update parts of VIS-032/034 is left for API/E2E.
- No pixel-by-pixel comparison of every VIS-001…037. The comparison was by inspection, against the references named above.
