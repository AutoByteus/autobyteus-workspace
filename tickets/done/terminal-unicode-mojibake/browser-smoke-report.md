# Browser Smoke Report

Date: 2026-06-06

Environment:
- Frontend: `http://localhost:3000/workspace`
- Frontend process cwd confirmed as `/Users/normy/autobyteus_org/autobyteus-worktrees/terminal-unicode-mojibake/autobyteus-web`
- Backend health: `http://127.0.0.1:29695/rest/health` returned `{"status":"ok","message":"Server is running"}`

Method:
- Opened the workspace page in the local browser tab.
- Used the visible xterm textarea to send a deterministic ASCII-only command that emits UTF-8 byte sequences for box drawing and checkmark glyphs:
  - `printf '\342\224\214\342\224\200\342\224\220\n\342\224\202\342\234\223\342\224\202\n\342\224\224\342\224\200\342\224\230\n'`

Result:
- Terminal DOM text contained `┌─┐`, `│✓│`, and `└─┘`.
- Terminal DOM text did not contain `â` mojibake.
- Screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/terminal-unicode-mojibake/tickets/done/terminal-unicode-mojibake/browser-smoke-terminal-fixed.png`

Conclusion: Pass for the deterministic browser-path Unicode smoke.
