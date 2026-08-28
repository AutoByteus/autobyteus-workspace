import { McpSchemaMapper } from "autobyteus-ts/tools/mcp/schema-mapper.js";
import type { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import type { ApplicationAgentToolInputSchema } from "@autobyteus/application-sdk-contracts";
import { canonicalizeApplicationAgentToolSchema } from "../../../../application-agent-tools/domain/application-agent-tool-declaration-snapshot.js";

export class ApplicationAgentToolNativeSchemaProjector {
  constructor(private readonly mapper = new McpSchemaMapper()) {}

  project(inputSchema: ApplicationAgentToolInputSchema): ParameterSchema {
    const projected = this.mapper.mapToAutobyteusSchema(
      structuredClone(inputSchema) as Record<string, unknown>,
    );
    const expected = JSON.stringify(canonicalizeApplicationAgentToolSchema(inputSchema));
    const actual = JSON.stringify(
      canonicalizeApplicationAgentToolSchema(projected.toJsonSchema()),
    );
    if (actual !== expected) {
      throw new Error(
        "Application agent tool input schema cannot be represented faithfully by the AutoByteus runtime.",
      );
    }
    return projected;
  }
}
