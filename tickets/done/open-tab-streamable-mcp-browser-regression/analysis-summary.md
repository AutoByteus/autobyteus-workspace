# Analysis Summary — Streamable MCP `open_tab` Does Not Open Visible Browser Panel

## Short answer

`open_tab` is opening Electron browser sessions. The visible Browser panel stays empty because the Streamable MCP refactor changed the streamed success `result` shape from a canonical browser result object to an MCP content envelope. The frontend focus hook cannot extract `tab_id` from that envelope, so it never calls `browserShellStore.focusSession(tab_id)`.

## Evidence

- Persisted raw traces for Daily Assistant and `solution_designer` both show `TOOL_EXECUTION_SUCCEEDED` for `open_tab`.
- The `tool_result` shape is:
  - `{ content: [{ type: "text", text: "{ ... \"tab_id\": \"65ab2c\" ... }" }], structuredContent: null, _meta: null }`
- A direct `list_tabs` probe shows sessions exist:
  - `65ab2c` -> `https://example.com/`
  - `67fb94` -> `https://www.google.com/`
- Frontend `browserToolExecutionSucceededHandler.ts` only supports direct `{ tab_id }` or a JSON string result, not an MCP content envelope.

## Root cause

The server-side runtime event canonicalization invariant was broken by the Streamable MCP refactor. Browser tool events must reach the renderer as canonical browser results with `result.tab_id` directly available. Instead, Codex/Agent Tools MCP is leaking raw MCP call-tool result envelopes into `TOOL_EXECUTION_SUCCEEDED`.

## Recommended fix

Fix at the server event-converter boundary:

1. Add or extract a shared known-browser-tool MCP result normalizer.
2. For `open_tab` and the rest of `BROWSER_TOOL_NAME_LIST`, unwrap MCP content envelopes and parse JSON text into direct result objects before streaming `TOOL_EXECUTION_SUCCEEDED`.
3. Reuse the shared normalizer in Claude and Codex paths so both runtimes keep the same canonical browser event contract.
4. Add regression tests using the exact observed envelope shape and asserting `payload.result.tab_id` exists directly.

Frontend-only parsing would mask the boundary regression and duplicate runtime-specific result parsing in the renderer; it should not be the primary fix.
