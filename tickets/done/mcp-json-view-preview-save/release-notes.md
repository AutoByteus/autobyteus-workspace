## Improvements
- JSON View can now preview and save a pasted single-server `mcpServers` config directly.
- **Apply JSON to Form** remains available as an optional conversion helper, not a required step.
- JSON View now accepts standard STDIO and Streamable HTTP shapes with common transport and tool-prefix aliases.

## Fixes
- Fixed Preview Tools using stale hidden form values after a user pasted JSON.
- Invalid or multi-server JSON now shows a clear error instead of previewing or saving the wrong configuration.
