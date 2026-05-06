# Agent Tools

## Scope

Registers and exposes tool groups for agent runtime and APIs.

## TS Source

- `src/agent-tools`
- `src/startup/agent-tool-loader.ts`
- `src/api/graphql/types/tool-management.ts`

## Notes

Tool groups are loaded dynamically and logged per group at startup.

Browser-tool support is runtime-gated:

- embedded Electron runtimes resolve the Browser bridge from environment variables injected at desktop startup
- remote nodes can resolve the same Browser bridge through an in-memory runtime registration when a desktop client explicitly pairs that node with its local browser
- browser tool exposure still stays subject to the active runtime/tool projection and the configured agent tool names

## Server-Owned Media Tools

The server owns the first-party media agent-tool boundary for:

- `generate_image`
- `edit_image`
- `generate_speech`

Canonical contracts, schemas, parsing, model-default resolution, safe path
resolution, and execution orchestration live under `src/agent-tools/media`.
Provider-specific image/audio clients still come from `autobyteus-ts`
multimedia infrastructure, but the old direct `autobyteus-ts` media `BaseTool`
classes are no longer the active first-party registration path.

Runtime projection is explicit:

- AutoByteus uses thin local tool wrappers registered from the server media
  manifest.
- Codex receives dynamic tool registrations built from the same manifest.
- Claude receives MCP tools under the reserved server name
  `autobyteus_image_audio`; a user-configured MCP server with that same name is
  rejected rather than silently overwritten.

`generate_image` and `edit_image` use an array-shaped `input_images` public
contract across all projections. Callers must pass image references as
`string[]` values, including one-element arrays for a single reference. String
or comma-separated `input_images` values are rejected rather than
compatibility-parsed, which avoids corrupting data URIs that legitimately
contain commas.

Image references may be URLs, data URIs, or safe local paths. Local references
and media output paths are resolved through the media path resolver:

- relative output paths resolve inside the active workspace
- absolute output paths must be under the workspace, Downloads, or system temp
  directory
- local input image paths must resolve to existing files inside the same safe
  path policy

All media tools return the canonical result shape `{ file_path }`. Runtime event
normalizers preserve that result shape, including Claude MCP-prefixed tool names
such as `mcp__autobyteus_image_audio__generate_image`, so generated media files
continue to project as generated-output file changes.
