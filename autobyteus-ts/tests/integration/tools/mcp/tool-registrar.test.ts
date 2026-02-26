import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import { McpToolRegistrar } from '../../../../src/tools/mcp/tool-registrar.js';
import { McpConfigService } from '../../../../src/tools/mcp/config-service.js';
import { McpServerInstanceManager } from '../../../../src/tools/mcp/server-instance-manager.js';
import { ToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { GenericMcpTool } from '../../../../src/tools/mcp/tool.js';
import { ParameterType } from '../../../../src/utils/parameter-schema.js';

const IMAGE_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
  'base64'
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../..');
const mcpsRoot = path.resolve(repoRoot, '..', 'autobyteus_mcps');
const pdfMcpDir = path.join(mcpsRoot, 'pdf_mcp');

const resolveUvCommand = (): string => {
  const envOverride = process.env.UV_BIN;
  if (envOverride && envOverride.trim()) {
    return envOverride;
  }
  const candidates = [
    path.join(os.homedir(), '.local', 'bin', 'uv'),
    '/usr/local/bin/uv',
    '/opt/homebrew/bin/uv'
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return 'uv';
};

const buildPdfConfig = (serverId: string, prefix: string) => ({
  [serverId]: {
    transport_type: 'stdio',
    enabled: true,
    tool_name_prefix: prefix,
    stdio_params: {
      command: resolveUvCommand(),
      args: ['run', 'python', '-m', 'pdf_mcp.server'],
      cwd: pdfMcpDir
    }
  }
});

describe('McpToolRegistrar integration (pdf_mcp)', () => {
  let registrar: McpToolRegistrar;
  let configService: McpConfigService;
  let toolRegistry: ToolRegistry;
  let instanceManager: McpServerInstanceManager;
  let originalDefinitions: Map<string, any>;

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
    await instanceManager.cleanupAllMcpServerInstances();
    toolRegistry.restore(originalDefinitions);
    configService.clearConfigs();
  });

  it('loads and registers tools from pdf_mcp', async () => {
    const configDict = buildPdfConfig('pdf-mcp', 'pdf');

    await registrar.loadAndRegisterServer(configDict);

    expect(configService.getConfig('pdf-mcp')).not.toBeNull();
    expect(registrar.isServerRegistered('pdf-mcp')).toBe(true);

    const metadataTool = toolRegistry.getToolDefinition('pdf_pdf_metadata');
    expect(metadataTool).toBeDefined();
    expect(metadataTool?.metadata?.mcp_server_id).toBe('pdf-mcp');

    const schema = metadataTool?.argumentSchema;
    const fileParam = schema?.getParameter('file_path');
    expect(fileParam?.type).toBe(ParameterType.STRING);
    expect(fileParam?.required).toBe(true);
  }, 120000);

  it('executes a registered MCP tool via the registry', async () => {
    const configDict = buildPdfConfig('pdf-mcp-exec', 'pdf');
    await registrar.loadAndRegisterServer(configDict);

    const toolName = 'pdf_image_to_pdf_page';
    const tool = toolRegistry.createTool(toolName);
    expect(tool).toBeInstanceOf(GenericMcpTool);

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-tool-'));
    const imagePath = path.join(tempDir, 'input.png');
    const outputPdf = path.join(tempDir, 'output.pdf');
    await fs.writeFile(imagePath, IMAGE_BYTES);

    try {
      const result = await tool.execute({ agentId: 'agent-1' }, {
        image_path: imagePath,
        output_path: outputPdf
      });

      expect(result).toBeTruthy();
      const stats = await fs.stat(outputPdf);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }, 120000);

  it('previews tools without registering them', async () => {
    const configDict = buildPdfConfig('pdf-mcp-preview', 'preview');

    const toolDefs = await registrar.listRemoteTools(configDict);
    const names = toolDefs.map((def) => def.name);
    expect(names).toContain('preview_read_pdf_pages');
    expect(names).toContain('preview_pdf_metadata');
    expect(configService.getAllConfigs().length).toBe(0);
    expect(toolRegistry.listTools().length).toBe(0);
  }, 120000);
});
