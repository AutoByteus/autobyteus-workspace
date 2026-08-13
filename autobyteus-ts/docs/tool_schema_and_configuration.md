# Tool Schema and Configuration Design and Implementation

**Date:** 2026-01-06
**Status:** Live

## 1. Overview

Tools in Autobyteus support two distinct data ingestion pathways, each requiring a well-defined schema:

1.  **Runtime Arguments**: Arguments passed by the LLM when it invokes a tool (e.g., source code content for a `write_file` tool).
2.  **Instantiation Configuration**: Configuration parameters passed when a tool instance is created (e.g., API keys, result limits).

This document details the unified design for defining, generating, and using schemas for both scenarios.

---

## 2. Goals

- **Discoverability**: Provide clear, accessible schemas so users and LLMs understand exactly what a tool accepts.
- **Consistency**: Use a unified underlying schema model (`ParameterSchema`) for both runtime args and static config.
- **Ease of Use**: Generate schemas from TypeScript `ParameterSchema` definitions (or from Zod via the converter).
- **Flexibility**: Allow tools to be simple (zero-config) or complex (rich validation) without changing the framework core.
- **Validation**: Enable data validation at both instantiation time (config) and runtime (arguments).

**Non-goals**:

- Enforcing a universal config format beyond the internal `ParameterSchema`.
- Automatically converting runtime arguments into configuration settings.

## 2.1 Generic File-Tool Path Contract

The generic local file tools (`read_file`, `write_file`, and `edit_file`) use a
trusted-local path contract.
This is intentionally distinct from the workspace-rooted file-explorer and
terminal `cwd` boundaries:

- an absolute `path` is used directly and may refer to any local path that the
  server process can access;
- a relative `path` requires an explicit absolute `base_dir` for that single
  invocation;
- when `path` is absolute it takes precedence if `base_dir` is also supplied;
- omitting `base_dir` for a relative path is an error; the resolver never
  falls back to the configured workspace, process `cwd`, or a prior shell
  `cd`;
- `base_dir` is invocation-scoped and does not change agent or shell working
  directory state; and
- configured AutoByteus internal deny paths remain protected after physical
  path resolution, including descendants and symlink traversal.

The path and `base_dir` descriptions are shared across the three native
schemas. Provider-specific formatters must preserve the same precedence and
fallback wording. This contract supports configured skill references and
external project worktrees without introducing a second per-path approval
workflow; tool/run approval remains the separate invocation gate.

## 2.2 `edit_file` Context-Patch Contract

`edit_file` applies context-located hunks in a simplified unified-diff-style
format rather than line-number-located unified diffs. Before constructing a
patch, read the current relevant file region unless it was just read and has
not changed. Copy unchanged and removal lines exactly from that latest content;
do not reconstruct them from memory. After an intervening edit or a
context-match failure, read the affected region again before retrying.

The model-facing canonical patch-field example is:

```diff
@@
-const mode = 'old'
+const mode = 'new'
 const keep = true
```

- Every hunk starts with a bare `@@` line. Each hunk body line starts with one
  space for unchanged context, `-` for a removal, or `+` for an addition.
- Every prefixed hunk body record is one complete logical line even when the
  outer patch string has no final line ending. The parser completes that record
  with `CRLF` when the patch contains `CRLF`, and with `LF` otherwise; already
  terminated patch documents are unchanged.
- Outer patch-string termination is transport framing, not target-file
  semantics. To make changed target content end without a line terminator,
  immediately follow that content record with the exact
  `\ No newline at end of file` marker. This marker is the sole opt-out from a
  changed record's normal line terminator.
- Unchanged and removal lines form the location anchor. Addition-only hunks are
  rejected because they do not identify a safe location.
- The target file is supplied separately through `path`; a patch contains only
  bare context hunks. Do not include Git file headers (`diff --git`, `---`, or
  `+++`), numeric hunk coordinates, or `*** Begin Patch` / `*** End Patch`
  semantic envelopes.
- Each hunk must match exactly one eligible location after the preceding hunk.
  Hunk-specific failures report the one-based hunk index and total.
- Matching tries exact content first, then a whitespace-tolerant retry. The
  complete multi-hunk result is constructed before the file is written, so a
  failed hunk does not leave a partial edit.
- After both strategies fail, missing-context diagnostics conservatively scan
  the complete eligible region for same-length windows with exactly one
  whitespace-tolerant mismatch. A unique result reports only its target range,
  mismatch line, and the two mismatching `-`/`+` excerpts. Zero or multiple
  results expose no source content or target location. Diagnostic candidates
  are never applied or used as retry locations.
- Each completed unique evidence line is capped at 200 Unicode code points,
  including its prefix and any ellipses. Long excerpts use a code-point-aware
  window around the first normalized difference rather than truncating only
  from the end.
- Ambiguous context reports the eligible full-match count but no content or
  location. All public patch failures state that no file changes were written.
- A conventional numeric-decorated header such as
  `@@ -10,2 +10,3 @@` may be accepted as model-output noise, but its coordinates
  and counts are discarded and never affect matching. Schemas, examples, and
  generated prompts must request the bare `@@` form.
- File headers, line labels, semantic patch wrappers, and arbitrary header
  suffixes are not part of the grammar. XML sentinel tags are transport framing
  only and are stripped before the patch reaches this semantic boundary.

Canonical native/XML semantic wording and the patch-field example are owned by
`src/tools/file/edit-file-contract.ts`; XML formatting adds only its sentinel
framing. Patch grammar, matching, candidate classification, and structured
failure facts are owned by `src/tools/file/context-patch.ts`. Bounded public
failure rendering is owned by `src/tools/file/edit-file-patch-diagnostic.ts`.
Path resolution, retry sequencing, existing-file validation, and
write-after-complete-success behavior remain owned by
`src/tools/file/edit-file.ts`.

## 2.3 File-Tool Surface And Stored Tool Names

The supported file-change routes are surgical `edit_file`, deliberate
whole-file `write_file`, and explicit `run_bash`; `read_file` provides file
inspection. The default registry does not define the retired
`replace_in_file` or `insert_in_file` tools and no compatibility alias restores
them.

Agent definitions persist tool names as strings. Existing configurations are
not rewritten when a registered tool is removed: the normal AutoByteus resolver
warns and skips an unknown name while continuing to instantiate the remaining
registered tools. A stale name may therefore remain visible until a user edits
the definition, but it is inactive and requires no data migration.

---

## 3. Core Architecture

### 3.1 `ParameterSchema` and `ParameterDefinition`

_File_: `src/utils/parameter-schema.ts`

These classes form the backbone of the schema system:

- **`ParameterDefinition`**: Defines a single field (name, type, description, default, constraints).
- **`ParameterSchema`**: A collection of definitions with logic for validation and serialization (to JSON/XML).

It supports primitive types (`STRING`, `INTEGER`, `FLOAT`, `BOOLEAN`), `ENUM`s, and nested `OBJECT`s/`ARRAY`s.

### 3.2 `ToolDefinition` and Discovery

_File_: `src/tools/registry/tool-definition.ts`

The `ToolRegistry` stores `ToolDefinition` objects which hold providers for both schemas:

- `argumentSchema`: Runtime LLM arguments.
- `configSchema`: Instantiation-time configuration.

These properties are **lazily generated and cached** to minimize overhead at startup.

---

## 4. Part I: Runtime Argument Schema

Argument schemas tell the LLM how to call a tool. They are defined explicitly via `ParameterSchema`.

### 4.1 The `tool(...)` Helper

_File_: `src/tools/functional-tool.ts`

The primary way to define a tool is via the `tool(...)` helper, which wraps a function and uses the provided `ParameterSchema`.

### 4.2 Type Mapping

TypeScript types are mapped to internal `ParameterType`s:

| TypeScript Type              | ParameterType | JSON Schema |
| ---------------------------- | ------------- | ----------- |
| `string`                     | STRING        | string      |
| `number` (integer)           | INTEGER       | integer     |
| `number` (float)             | FLOAT         | number      |
| `boolean`                    | BOOLEAN       | boolean     |
| `Record<string, unknown>`    | OBJECT        | object      |
| `Array<T>`                   | ARRAY         | array       |
| `enum` / string union        | ENUM          | string      |

### 4.3 Parameter Metadata (TypeScript)

To provide rich metadata without boilerplate, tools define a `ParameterSchema`
with `ParameterDefinition` entries.

**Mechanism**:
The schema captures description, default values, and requiredness.

**Example**:

```ts
import { tool } from 'src/tools/functional-tool';
import { ParameterSchema, ParameterDefinition, ParameterType } from 'src/utils/parameter-schema';

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(new ParameterDefinition({
  name: 'username',
  type: ParameterType.STRING,
  description: 'Unique identifier for the user',
  required: true
}));
argumentSchema.addParameter(new ParameterDefinition({
  name: 'is_admin',
  type: ParameterType.BOOLEAN,
  description: 'Grant admin privileges',
  required: false,
  defaultValue: false
}));

const createUser = tool({
  name: 'create_user',
  description: 'Create a user',
  argumentSchema
})(async (_context, username: string, isAdmin: boolean) => {
  // ...
});
```

### 4.4 Flow: From TypeScript to LLM

1.  **Developer**: Writes a `tool(...)` function with a `ParameterSchema`.
2.  **Decorator**: Registers the schema as a `ToolDefinition`.
3.  **Registry**: Stores it in `ToolRegistry`.
4.  **Provider schema path**:
    - `LlmPhase` asks `ToolSchemaProvider` to build schemas only when the current
      turn has configured tools, and passes the same condition to
      `LlmStreamingResponseHandler` as its explicit tool-call gate.
    - `ToolSchemaProvider` resolves the provider-aware native schema formatter:
      Anthropic, Gemini, or the OpenAI-compatible function-tool envelope used by
      the remaining supported provider paths.
    - `LlmPhase` supplies the resulting array through the provider request's
      native `tools` field. With zero tools it sends no schema field.
5.  **LLM**: Receives provider-native tool metadata. Tool definitions are not
    rendered into system-prompt instructions, examples, XML, sentinel blocks,
    or another model-authored text protocol.

Structured provider-native calls are the only supported model-to-tool
invocation channel. Assistant text is not parsed into invocations.

### 4.5 OpenAI-Compatible Function Tool Schemas

_Files_: `src/tools/usage/formatters/openai-json-schema-formatter.ts`,
`src/tools/usage/formatters/openai-tool-schema-normalizer.ts`

OpenAI-compatible providers such as LM Studio and custom OpenAI-style endpoints
use the function-tool envelope:

```ts
{
  type: 'function',
  function: {
    name: tool.name,
    description: tool.description,
    parameters
  }
}
```

Before the schema is returned, `normalizeOpenAiToolParameters(...)` recursively
closes JSON object schemas by setting `additionalProperties: false`. This
applies to the top-level `parameters` object and nested object schemas produced
from `ParameterSchema`.

Strict function tools remain intentionally gated off by default. Current
`ParameterSchema` optional fields remain optional by being omitted from
`required`; enabling `function.strict: true` safely would require a future
nullable-required optional-field conversion. The normalizer therefore rejects
attempts to enable strict mode until that transform exists.

### 4.6 MCP-Origin JSON Schema Mapping

_File_: `src/tools/mcp/schema-mapper.ts`

Configured external MCP tools are imported into the AutoByteus tool registry by
mapping their MCP JSON Schema input schemas into `ParameterSchema`. The mapper
preserves direct JSON Schema primitive/object/array types and also unwraps
nullable single-type forms before choosing the AutoByteus `ParameterType`.

Supported nullable forms include:

- `anyOf` / `oneOf` with exactly one non-null branch, such as
  `{ anyOf: [{ type: "array", items: { type: "string" } }, { type: "null" }] }`.
- JSON Schema type-array shorthand with exactly one non-null type, such as
  `{ type: ["array", "null"], items: { type: "string" } }`.

The mapper keeps outer property metadata such as `description`, `default`, and
basic constraints while using the non-null branch for type-specific mapping.
This matters for configured MCP media tools such as `generate_video`, where
`input_images`, `input_audios`, and `input_videos` are optional nullable arrays
of strings and must be exposed as arrays, not strings.

True multi-type unions with more than one non-null branch are not guessed into
one arbitrary `ParameterType`; until `ParameterSchema` has first-class union
support, those schemas follow the mapper's conservative unsupported-schema
fallback behavior.

### 4.7 Provider Schema Extensions

Provider-specific schema changes belong in the retained native formatters or in
the provider adapter that owns request legality. Do not add prompt examples,
text-call syntax formatters, per-tool manifest overrides, or a parallel schema
registry. `write_file` and `edit_file` live streaming is a response-display
projection and does not change their authoritative provider-native schemas.

---

## 5. Part II: Instantiation Configuration Schema

Configuration schemas tell the developer (or application builder) how to configure a tool instance.

### 5.1 `ToolConfig`

_File_: `src/tools/tool-config.ts`

A simple wrapper `ToolConfig(params: Record<string, unknown>)` used to pass raw configuration data into tool constructors.

### 5.2 Defining Configuration

Tools implement the `getConfigSchema()` class method to declare their options.

**Example**:

```ts
class SearchTool extends BaseTool {
  static getConfigSchema(): ParameterSchema | null {
    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'max_results',
      type: ParameterType.INTEGER,
      description: 'Maximum number of search results',
      required: false,
      defaultValue: 5,
      minValue: 1,
      maxValue: 50,
    }));
    return schema;
  }
}
```

### 5.3 Passing Configuration

Configuration is passed during instantiation:

**1. Direct Instantiation**:

```ts
const searchTool = new SearchTool(new ToolConfig({ max_results: 5 }));
```

**2. Via Registry**:

```ts
const tool = registry.createTool('SearchTool', new ToolConfig({ max_results: 5 }));
```

### 5.4 Validation Strategy

Validation is optional but supported via `ParameterSchema.validate_config`.

**Recommended Pattern**:

```ts
constructor(config?: ToolConfig) {
  super(config);
  const schema = (this.constructor as typeof SearchTool).getConfigSchema();
  if (schema && config) {
    const [isValid, errors] = schema.validateConfig(config.params);
    if (!isValid) {
      throw new Error(`Invalid config: ${errors.join(', ')}`);
    }
  }
}
```

---

## 6. Best Practices for Tool Authors

1.  **Separation of Concerns**: Use `getConfigSchema()` for _static_ setup (keys, limits) and `tool(...)` arguments for _dynamic_ LLM inputs.
2.  **Sensible Defaults**: Always provide defaults where possible to allow zero-config usage.
3.  **Rich Descriptions**: Use `ParameterDefinition.description` for arguments and detailed descriptions for config params. This is the primary UI for the LLM and the developer.
4.  **Use Enums**: For discrete choices, use TypeScript `enum`s or string unions in arguments or `ParameterType.ENUM` in config to enforce correctness.

---

## 7. Future Extensions

- **Developer Tooling Integration**: A programmatic or server/web-owned surface
  to list available tools and their required config options.
- **Declarative Specs**: A top-level YAML/JSON spec to wire up tools and config without writing TypeScript instantiation code.
- **Auto-Validation**: Adding a flag to `ToolRegistry.create_tool` to enforce config validation automatically.
