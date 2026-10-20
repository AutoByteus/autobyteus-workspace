# Check: IMP-10 rendered Bulk Import view (implementation self-check, not API/E2E sign-off)
# Surface: pnpm dev (backend 127.0.0.1:8000, Nuxt dev 127.0.0.1:3000), worktree dev data root (removed after)
# Driver: IMP-10-render-script.mjs (playwright-core + system Chrome, headless, 1440x900), run against the running stack
# Code: df15c4385d + the uncommitted polish (scroll the failure list into view; English success toast wording), committed next
# Date: 2026-10-20

## en (headless Chrome)
```json
{
  "facts": {
    "listText": "These entries were not imported:\n\nrender_bad_en2: Invalid 'transport_type' string 'websocket' for server 'render_bad_en2'. Valid types are: stdio, streamable_http.\nrender_empty_en2: Config for server 'render_empty_en2' needs 'command' (stdio) or 'url' (streamable_http), or an explicit 'transport_type'.",
    "listBelowButton": true,
    "listInsideCard": true,
    "itemsOverflowing": 0,
    "toastText": "Imported 1; 2 failed. See the entries below.",
    "stillOnView": true,
    "listInViewport": true
  },
  "afterFull": {
    "onView": false,
    "listShowsServer": true,
    "toast": "MCP server configurations imported: 1."
  },
  "pageErrors": []
}
```
Screenshots: IMP-10-render-partial-import-en.png (view after a partial import, not scrolled by the script), IMP-10-render-failure-list-en.png, IMP-10-render-full-import-en.png (server list after a full import; info toast from the partial import and success toast).

## zh-CN (AutoByteus browser tab; DOM only, the pane had a 0x0 viewport so no screenshot or layout)
- Partial import of render_ok / render_bad (websocket) / render_empty: view stayed open; list heading `以下条目未导入：`; toast `已导入 1 个，2 个失败。请查看下方条目。`; reasons are the server messages (English).

Not inspected: narrow widths, dark theme.
