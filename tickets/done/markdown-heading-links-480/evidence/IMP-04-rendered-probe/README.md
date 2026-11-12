# Check: IMP-04 (rendered self-check in a real browser)
# Command: node evidence/IMP-04-rendered-probe/heading-links-probe.mjs --output-dir=evidence/IMP-04-rendered-probe/run (after pnpm -C autobyteus-server-ts build)
# Commit: base 931a1feeb6 + the IR-001 working tree = 45e456b8b0
# Environment: macOS 26.5.2 arm64, node v22.23.1, pnpm 10.28.2; isolated node from this worktree; `nuxt dev` desktop window in headless Chrome (1440x1000); test files only
# Date: 2026-11-12

Files: `heading-links-probe.mjs` (the probe), `run-stdout.log`, `run/probe-summary.json`, `run/server.log`, `run/frontend.log`, two screenshots.

Look for in `run/probe-summary.json` → `totals`: `contentsEntries: 26`, `contentsFound: 26`, `contentsInView: 26`, `contentsUrlUnchanged: 26`, `linksUrlUnchanged: 5`; `popups` holds only the probe's own page (`step: "start"`, `about:blank`).
Each Contents click starts with the viewer scrolled to the top; after it the heading sits at `offsetFromViewerTop: 0` of the Files panel's scroll container.
`relativeInDoc` (`ticket-scope.md#common-situations` in the fixture) and `linksFile` (`#no-such-heading`, `other.md`, `other.md#x`, `/x.md`, `./x.md`): URL unchanged, the file still shown, no 404 text.
Screenshot `desktop-after-contents-click.png`: the Files panel viewer with "The Approach: Spine First, Practices In Context" at its top.
Not covered here: the phone viewer and the Skills page (the same `MarkdownRenderer` through `FileViewer`), and a Contents inside a conversation message (the fake agent's reply is JSON-quoted, so it carries no headings); AC-003 is unit-covered (IMP-01).
