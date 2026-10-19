# Check: IMP-10 rendered form self-check (implementation, not API/E2E sign-off)
# Commit: d89135a832 (server/core code identical to b109a62ea6)
# Environment: macOS, `pnpm dev` (backend http://127.0.0.1:8000, Nuxt dev http://127.0.0.1:3000), worktree dev data root `.autobyteus/development/server-data`; dummy MCP server `IMP-10-dummy-mcp-server.mjs` on 127.0.0.1 (random port) requiring `Authorization: Bearer test-dummy`
# Date: 2026-10-19
# Driver: AutoByteus browser tab tools (run_script DOM assertions + screenshots)

Steps and observed results (DOM text and API results copied from the tab):

1. Settings → MCP Servers → Add Server, transport STREAMABLE_HTTP, URL = dummy server, Token = `test-dummy`.
   - `#http_token_hint` text: `Sent as "Authorization: Bearer <token>". For other schemes (for example Basic), add an Authorization header in the JSON view instead.`
   - `#http_token[aria-describedby]` = `http_token_hint`. Screenshot: IMP-10-render-form-token-hint-en.png
2. Preview Tools (token only) → `Discovered Tools / echo / Echo test tool`.
   Dummy server log for that preview: `POST auth=expected`, `POST auth=expected`, `GET auth=expected`, `POST auth=expected` (every request, including the SSE GET, carried the Bearer header).
   (A first attempt failed with `ToolDefinition 'echo' requires a non-empty string 'description'` because the dummy tool had no description; the auth log of that attempt was already all `auth=expected`. The dummy tool was given a description and the step repeated.)
3. JSON View (token still set), added `"headers": {"authorization": "Basic test-dummy"}`, Preview Tools →
   `Failed to preview tools for MCP server: Error: Streamable HTTP MCP server 'render-check' sets both 'token' and an 'Authorization' header; use one of them.` (no value in the message)
4. JSON View: removed `token`, set `"headers": {"Authorization": "Bearer test-dummy"}`, Save Configuration (sync on) →
   `Server 'render-check' saved successfully.` / `Successfully discovered and registered 1 tools.`
   Saved `mcps.json` entry: `{"url": "http://127.0.0.1:<port>/mcp", "headers": {"Authorization": "Bearer test-dummy"}}`
5. Reload settings → MCP Servers → Edit `render-check` → JSON View: JSON contains `"headers": {"Authorization": "Bearer test-dummy"}`; Token field empty. Screenshot: IMP-10-render-edit-json-view-headers.png
6. Language → Simplified Chinese → Add Server (STREAMABLE_HTTP): label `令牌（可选）`, hint `以 "Authorization: Bearer <令牌>" 发送。其他认证方式（例如 Basic）请改为在 JSON 视图中添加 Authorization 请求头。` Screenshot: IMP-10-render-form-token-hint-zh-CN.png

Layout: hint sits directly under the Token input, `text-sm text-gray-500` like the existing JSON-view helper text, wraps cleanly at the default desktop width in both languages.
Not exercised: narrow/mobile widths; dark theme.
Cleanup: dev stack stopped, dummy server stopped, worktree dev data root removed.
