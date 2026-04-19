# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Small`
- Triage Rationale: The failure is isolated to the XML argument parsing path in `autobyteus-ts`. The MCP server schema is correct, the validation failure is deterministic, and the likely fix surface is a small set of parser and test files.
- Investigation Goal: Identify why XML tool calls that encode array arguments with repeated `<item>` tags fail validation before reaching the MCP server.
- Primary Questions To Resolve:
  - Where is the XML tool-call payload converted into JavaScript arguments?
  - Does the video MCP publish `audio_paths` as an actual array schema?
  - At what layer is the malformed `{ item: "..." }` structure produced?
  - What parser limitations must the fix handle to prevent regression?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-19 | Code | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/src/agent/streaming/adapters/tool-call-parsing.ts` | Inspect XML argument parser | `parseXmlFragment()` maps tags into plain objects and overwrites repeated sibling names instead of accumulating arrays | Yes |
| 2026-04-19 | Code | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/src/agent/streaming/adapters/invocation-adapter.ts` | Confirm how XML tool content enters parser | `SegmentType.TOOL_CALL` content is routed through `parseXmlArguments()` when not JSON | No |
| 2026-04-19 | Code | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/src/tools/usage/providers/tool-manifest-provider.ts` | Check XML formatting contract shown to model | XML guidance explicitly instructs arrays to be encoded as repeated `<item>` tags | Yes |
| 2026-04-19 | Code | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/src/tools/usage/formatters/default-xml-example-formatter.ts` | Verify generated examples | XML examples emit repeated `<item>` elements for array parameters | Yes |
| 2026-04-19 | Code | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/src/tools/base-tool.ts` | Locate validation failure | Array parameters are validated with `Array.isArray(value)`, so object-shaped XML results fail before tool execution | No |
| 2026-04-19 | Code | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/src/tools/mcp/schema-mapper.ts` | Verify MCP schema mapping | MCP `array` types are correctly mapped into Autobyteus parameter schema arrays | No |
| 2026-04-19 | Repo | `/Users/normy/autobyteus_org/autobyteus_mcps/video-audio-mcp/core.py`, `/Users/normy/autobyteus_org/autobyteus_mcps/video-audio-mcp/server.py`, `/Users/normy/autobyteus_org/autobyteus_mcps/video-audio-mcp/tools/editing.py` | Confirm how the video MCP is defined and registered | `FastMCP` registers `concatenate_audios` via decorator, and the Python signature declares `audio_paths: list[str]` | No |
| 2026-04-19 | Command | `../autobyteus_mcps/video-audio-mcp/.venv/bin/python - <<'EOF' ... mcp._tool_manager.list_tools() ... EOF` | Inspect live FastMCP tool metadata | `concatenate_audios.parameters` exposes `audio_paths` as `{ type: "array", items: { type: "string" } }` | No |
| 2026-04-19 | Command | `node - <<'EOF' ... parseXmlFragment('<arg name=\"audio_paths\"><item>/tmp/1.wav</item><item>/tmp/2.wav</item><item>/tmp/7.wav</item></arg>') ... EOF` | Reproduce parser behavior in isolation | Output is `{ "audio_paths": { "item": "/tmp/7.wav" } }`; earlier items are lost | No |
| 2026-04-19 | Command | `node - <<'EOF' ... parseXmlFragment('<arg name=\"address\"><arg name=\"street\">Main</arg><arg name=\"city\">Paris</arg></arg>') ... EOF` | Probe nested object behavior | Regex parsing also mishandles nested repeated `<arg>` structures; nested XML is not robust today | Yes |
| 2026-04-19 | Code | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/tests/unit/agent/streaming/adapters/tool-call-parsing.test.ts` | Check test coverage | No unit test currently covers XML arrays or repeated `<item>` handling | Yes |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - XML tool-call segment parsing in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/src/agent/streaming/adapters/invocation-adapter.ts`
  - XML argument conversion in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/src/agent/streaming/adapters/tool-call-parsing.ts`
- Execution boundaries:
  - LLM emits XML tool payload
  - `autobyteus-ts` parses XML into JS arguments
  - `BaseTool.execute()` validates parsed arguments against the mapped schema
  - Only after validation succeeds does MCP proxying call the Python server
- Owning subsystems / capability areas:
  - `autobyteus-ts` streaming tool-call parsing
  - `autobyteus-ts` tool schema validation
  - MCP registration/schema discovery
- Optional modules involved:
  - Video MCP tool registration and schema generation for the repro case
- Folder / file placement observations:
  - The defect is localized to the streaming adapter/parser layer; MCP tool code is not the right fix location

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/src/agent/streaming/adapters/tool-call-parsing.ts` | `parseXmlArguments`, `parseXmlFragment` | Convert XML tool-call content into argument objects | Repeated sibling tags overwrite prior values; no array support exists | Primary fix location |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/src/agent/streaming/adapters/invocation-adapter.ts` | `ToolInvocationAdapter.handleEnd` | Select JSON vs XML parsing path for tool calls | XML path uses `parseXmlArguments()` directly | Keep behavior, update parser output |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/src/tools/base-tool.ts` | `validateValue` | Enforce argument type compatibility | Array validation is correct; parser shape is wrong | No fix needed here unless additional coercion is chosen |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/src/tools/usage/providers/tool-manifest-provider.ts` | XML array guidance | Instruct model how to encode arrays | Contract says repeated `<item>` tags are mandatory | Parser must honor this contract |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/src/tools/usage/formatters/default-xml-example-formatter.ts` | XML array example generation | Emit examples for array params | Formatter already emits repeated `<item>` elements | Parser/test alignment needed |
| `/Users/normy/autobyteus_org/autobyteus_mcps/video-audio-mcp/tools/editing.py` | `concatenate_audios` | Concatenate audio files via FastMCP tool | Tool signature expects `list[str]` for `audio_paths` | Confirms downstream contract |

### Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-19 | Probe | Local Node snippet reusing `parseXmlFragment()` logic for repeated `<item>` tags | Returns `{ "audio_paths": { "item": "/tmp/7.wav" } }` | The last repeated sibling wins; arrays are not implemented |
| 2026-04-19 | Probe | Local Node snippet for nested `<arg>` inside `<arg>` | Returns malformed nested object output | Parser relies on a regex strategy that is fragile for nested structures |
| 2026-04-19 | Setup | `../autobyteus_mcps/video-audio-mcp/.venv/bin/python` | Allowed inspection of live FastMCP tool metadata without changing the MCP code | Python-side schema can be trusted as current evidence |

### External Code / Dependency Findings

- Upstream repo / package / sample examined: Local clone of `video-audio-mcp`, built on `mcp[cli]` / FastMCP
- Version / tag / commit / release: Local checkout in `/Users/normy/autobyteus_org/autobyteus_mcps/video-audio-mcp`, package metadata from `pyproject.toml`
- Files, endpoints, or examples examined:
  - `core.py`
  - `server.py`
  - `tools/editing.py`
  - live `mcp._tool_manager.list_tools()` metadata via the local `.venv`
- Relevant behavior, contract, or constraint learned:
  - FastMCP correctly exposes `audio_paths` as an array of strings
  - The Python tool implementation never sees XML and only receives already-validated JSON-like arguments
- Confidence and freshness: High / verified locally on 2026-04-19

### Reproduction / Environment Setup

- Required services, mocks, or emulators: None
- Required config, feature flags, or env vars: None for parser reproduction
- Required fixtures, seed data, or accounts: None
- External repos, samples, or artifacts cloned/downloaded for investigation: Existing sibling repo `/Users/normy/autobyteus_org/autobyteus_mcps/video-audio-mcp`
- Setup commands that materially affected the investigation:
  - `git fetch origin personal`
  - `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/xml-tool-array-parser-fix -b codex/xml-tool-array-parser-fix origin/personal`
  - `../autobyteus_mcps/video-audio-mcp/.venv/bin/python - <<'EOF' ... EOF`
  - `node - <<'EOF' ... EOF`
- Cleanup notes for temporary investigation-only setup: No temporary code or external services created

## External / Internet Findings

No internet sources were required. All relevant evidence came from the local repositories and local runtime inspection.

## Constraints

- Technical constraints:
  - The parser must preserve existing simple XML scalar behavior
  - The parser output must satisfy schema validation before MCP proxy execution
  - The XML formatter contract already promises repeated `<item>` list encoding
- Environment constraints:
  - Work is isolated to the dedicated worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/xml-tool-array-parser-fix`
- Third-party / API constraints:
  - FastMCP publishes JSON schema for tool input; `autobyteus-ts` must consume it correctly

## Unknowns / Open Questions

- Unknown: Whether the intended fix should support only scalar `<item>` arrays or also nested object arrays in XML
- Why it matters: The current regex parser is fragile for nested object structures, and the design should decide whether to patch minimally or normalize nested repeated tags more generally
- Planned follow-up: Resolve in Stage 2/3 based on requirements and design scope

## Implications

### Requirements Implications

- Requirements must explicitly align the XML parsing behavior with the documented XML array contract
- Requirements should cover at least scalar array handling and the concrete MCP repro case

### Design Implications

- A parser-layer fix is preferable to schema or MCP-side workarounds because the schema and MCP tool are already correct
- Tests need to cover repeated sibling tags to prevent future contract drift between XML examples and runtime parsing

### Implementation / Placement Implications

- Primary code changes should stay within the XML parsing adapter and adjacent tests in `autobyteus-ts`
- If nested object arrays are included in scope, the current regex-only parser strategy may need a more deliberate normalization step rather than a minimal overwrite fix

## Re-Entry Additions

Append new dated evidence here when later stages reopen investigation.
