# Tool Schema and Configuration Design and Implementation

**Date:** 2026-01-06
**Status:** Live

## 1. Overview

Tools in Autobyteus support two distict data ingestion pathways, each requiring a well-defined schema:

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

### 4.4 Flow: From TypeScript to LLM Prompt

1.  **Developer**: Writes a `tool(...)` function with a `ParameterSchema`.
2.  **Decorator**: Registers the schema as a `ToolDefinition`.
3.  **Registry**: Stores it in `ToolRegistry`.
4.  **Formatters**:
    - `DefaultXmlSchemaFormatter`: Converts schema to `<tool>` XML.
    - `DefaultJsonSchemaFormatter`: Converts schema to JSON for OpenAI.
5.  **LLM**: Sees the formatted schema in the system prompt.

### 4.5 Custom Overrides

For complex requirements (e.g., custom sentinel tag instructions like `write_file`'s `__START_CONTENT__`), specific tools can bypass default generation by registering a **Custom Formatter** in the `ToolFormattingRegistry`.

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

- **CLI Integration**: A CLI command to list available tools and their required config options.
- **Declarative Specs**: A top-level YAML/JSON spec to wire up tools and config without writing TypeScript instantiation code.
- **Auto-Validation**: Adding a flag to `ToolRegistry.create_tool` to enforce config validation automatically.
