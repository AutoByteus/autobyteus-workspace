import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import { MEDIA_TOOL_NAME_LIST } from "../../../../src/agent-tools/media/media-tool-contract.js";
import {
  registerMediaTools,
  reloadMediaToolSchemas,
  unregisterMediaTools,
} from "../../../../src/agent-tools/media/register-media-tools.js";

const NON_MEDIA_TOOL_NAME = "not_media_schema_reload_probe";

describe("registerMediaTools", () => {
  afterEach(() => {
    unregisterMediaTools();
    if (defaultToolRegistry.getToolDefinition(NON_MEDIA_TOOL_NAME)) {
      defaultToolRegistry.unregisterTool(NON_MEDIA_TOOL_NAME);
    }
  });

  it("registers server-owned media local tools without duplicate overwrite ownership", () => {
    registerMediaTools();
    registerMediaTools();

    for (const toolName of MEDIA_TOOL_NAME_LIST) {
      const definition = defaultToolRegistry.getToolDefinition(toolName);
      expect(definition).toBeDefined();
      expect(definition?.category).toBe("Multimedia");
      expect(definition?.metadata.server_owned_media_tool).toBe(true);
      expect(definition?.argumentSchema?.getParameter("output_file_path")).toBeDefined();
    }
    expect(
      defaultToolRegistry
        .getToolDefinition("generate_image")
        ?.argumentSchema?.getParameter("input_images")?.type,
    ).toBe("array");
  });

  it("reloads cached schemas for registered media tools without touching unrelated tools", () => {
    registerMediaTools();

    const nonMediaDefinition = new ToolDefinition(
      NON_MEDIA_TOOL_NAME,
      "Non-media schema reload probe",
      ToolOrigin.LOCAL,
      "Test",
      () => new ParameterSchema(),
      () => null,
      {
        customFactory: () => ({}) as never,
      },
    );
    defaultToolRegistry.registerTool(nonMediaDefinition);

    const schemasBeforeReload = new Map(
      MEDIA_TOOL_NAME_LIST.map((toolName) => {
        const definition = defaultToolRegistry.getToolDefinition(toolName);
        expect(definition).toBeDefined();
        return [toolName, definition?.argumentSchema] as const;
      }),
    );
    const mediaReloadSpies = MEDIA_TOOL_NAME_LIST.map((toolName) =>
      vi.spyOn(defaultToolRegistry.getToolDefinition(toolName)!, "reloadCachedSchema"),
    );
    const nonMediaReloadSpy = vi.spyOn(nonMediaDefinition, "reloadCachedSchema");

    reloadMediaToolSchemas();

    for (const [index, toolName] of MEDIA_TOOL_NAME_LIST.entries()) {
      expect(mediaReloadSpies[index]).toHaveBeenCalledTimes(1);
      expect(defaultToolRegistry.getToolDefinition(toolName)?.argumentSchema).not.toBe(
        schemasBeforeReload.get(toolName),
      );
    }
    expect(nonMediaReloadSpy).not.toHaveBeenCalled();
  });
});
