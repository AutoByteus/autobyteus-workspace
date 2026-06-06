# Browser Reproduction Log

Date: 2026-06-06

## Correct runtime path

- Frontend started from: `/Users/normy/autobyteus_org/autobyteus-worktrees/terminal-unicode-mojibake/autobyteus-web`
- Command: `BACKEND_NODE_BASE_URL=http://127.0.0.1:29695 pnpm dev`
- Frontend URL: `http://localhost:3000`
- Electron-started backend health: `GET http://127.0.0.1:29695/rest/health` returned `{"status":"ok","message":"Server is running"}`.
- Browser validation used a wide 1800x1100 desktop viewport to load the right-panel Terminal surface.
- Frontend console showed terminal WebSocket connection to `ws://127.0.0.1:29695/ws/terminal/<session-id>` and `Connected`.

## Observed terminal output

After launching `codex` in the right-panel Terminal, the terminal displayed mojibake in Codex's trust prompt:

```text
... toâº 1. Yes, continu
2. No, quit
```

The `âº` sequence is consistent with UTF-8 bytes being passed to xterm as Latin-1/binary-string code units instead of being decoded as UTF-8 text before rendering.

## Screenshot

- `/Users/normy/autobyteus_org/autobyteus-worktrees/terminal-unicode-mojibake/tickets/done/terminal-unicode-mojibake/browser-repro-terminal.png`

## Notes

A prior attempt opened an unrelated existing Nuxt process from `/Users/normy/autobyteus_org/autobyteus-com-workspace/frontend`; that process was killed before the correct retest. The evidence above is from the correct worktree frontend and the Electron-started backend.

## 2026-06-06 Correct frontend deterministic UTF-8 byte repro

Runtime remained:

- Frontend: `/Users/normy/autobyteus_org/autobyteus-worktrees/terminal-unicode-mojibake/autobyteus-web`, Nuxt on `http://localhost:3000`
- Backend: Electron-started AutoByteus backend on `http://127.0.0.1:29695`

I opened `/workspace`, focused the Terminal tab, and typed an ASCII-only command that emits UTF-8 bytes for the box-drawing text `┌─┐`:

```sh
printf '\342\224\214\342\224\200\342\224\220\n'
```

Expected terminal output: `┌─┐`.
Actual terminal output in the UI: mojibake beginning with `â...`.

Screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/terminal-unicode-mojibake/tickets/done/terminal-unicode-mojibake/browser-repro-byte-output.png`

This removes Codex as a variable: any PTY output containing non-ASCII UTF-8 bytes is decoded incorrectly before being written into xterm.
