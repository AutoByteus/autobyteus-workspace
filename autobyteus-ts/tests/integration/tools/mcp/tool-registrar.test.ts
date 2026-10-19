/**
 * McpToolRegistrar against the tiny real MCP test server, over stdio.
 *
 * Purpose: register a server's tools (with prefix and argument schema), execute a registered tool through
 * the tool registry, and preview tools without registering anything. Implementations: Python via `uv`
 * (skipped with the reason when `uv` cannot prepare it) and Node (always). See `mcp-test-server-launcher.ts`.
 * Command: env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp
 * Values: dummy only.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { McpToolRegistrar } from '../../../../src/tools/mcp/tool-registrar.js';
import { McpConfigService } from '../../../../src/tools/mcp/config-service.js';
import { McpServerInstanceManager } from '../../../../src/tools/mcp/server-instance-manager.js';
import { ToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { GenericMcpTool } from '../../../../src/tools/mcp/tool.js';
import { ParameterType } from '../../../../src/utils/parameter-schema.js';
import { prepareMcpTestServers, stdioServerConfig, type McpTestServerImpl } from './mcp-test-server-launcher.js';

const configDict = (impl: McpTestServerImpl, serverId: string, prefix: string) => {
  const config = stdioServerConfig(impl, { serverId });
  return {
    [serverId]: {
      transport_type: 'stdio',
      enabled: true,
      tool_name_prefix: prefix,
      stdio_params: { command: config.command, args: config.args, env: config.env }
    }
  };
};

for (const { impl, available, reason } of prepareMcpTestServers()) {
  describe.skipIf(!available)(`McpToolRegistrar with the real MCP test server (${impl}${available ? '' : ` — skipped: ${reason}`})`, () => {
    let registrar: McpToolRegistrar;
    let configService: McpConfigService;
    let toolRegistry: ToolRegistry;
    let instanceManager: McpServerInstanceManager;
    let originalDefinitions: ReturnType<ToolRegistry['snapshot']>;

    beforeEach(() => {
      (McpToolRegistrar as any).instance = undefined;
      (McpConfigService as any).instance = undefined;
      (ToolRegistry as any).instance = undefined;
      (McpServerInstanceManager as any).instance = undefined;

      registrar = McpToolRegistrar.getInstance();
      configService = McpConfigService.getInstance();
      toolRegistry = ToolRegistry.getInstance();
      instanceManager = McpServerInstanceManager.getInstance();

      originalDefinitions = toolRegistry.snapshot();
      toolRegistry.clear();
      configService.clearConfigs();
    });

    afterEach(async () => {
      // Registration and preview close their own discovery sessions; execution opens one for 'agent-1'.
      await instanceManager.cleanupMcpServerInstancesForAgent('agent-1');
      toolRegistry.restore(originalDefinitions);
      configService.clearConfigs();
    });

    it('registers the server tools with prefix and argument schema', async () => {
      await registrar.loadAndRegisterServer(configDict(impl, 'test-server', 'ts'));

      expect(registrar.isServerRegistered('test-server')).toBe(true);
      const echo = toolRegistry.getToolDefinition('ts_echo');
      expect(echo?.metadata?.mcp_server_id).toBe('test-server');
      const textParam = echo?.argumentSchema?.getParameter('text');
      expect(textParam?.type).toBe(ParameterType.STRING);
      expect(textParam?.required).toBe(true);
      expect(toolRegistry.getToolDefinition('ts_add')).toBeDefined();
    });

    it('executes a registered tool through the registry', async () => {
      await registrar.loadAndRegisterServer(configDict(impl, 'test-server-exec', 'ts'));

      const tool = toolRegistry.createTool('ts_add');
      expect(tool).toBeInstanceOf(GenericMcpTool);
      const result = (await tool.execute({ agentId: 'agent-1' }, { a: 2, b: 3 })) as { structuredContent?: unknown; isError?: boolean };
      expect(result.structuredContent).toEqual({ sum: 5 });
      expect(result.isError ?? false).toBe(false);
    });

    it('previews tools without registering them', async () => {
      const toolDefs = await registrar.listRemoteTools(configDict(impl, 'test-server-preview', 'preview'));
      expect(toolDefs.map((def) => def.name).sort()).toEqual([
        'preview_add', 'preview_echo', 'preview_fail', 'preview_report_env_and_cwd', 'preview_slow'
      ]);
      expect(configService.getAllConfigs()).toHaveLength(0);
      expect(toolRegistry.listTools()).toHaveLength(0);
    });
  });
}
