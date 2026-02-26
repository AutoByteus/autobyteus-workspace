import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { StdioManagedMcpServer } from '../../../../src/tools/mcp/server/stdio-managed-mcp-server.js';
import { StdioMcpServerConfig } from '../../../../src/tools/mcp/types.js';

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

describe('StdioManagedMcpServer integration (pdf_mcp)', () => {
  it('lists tools and executes image_to_pdf_page', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-pdf-'));
    const imagePath = path.join(tempDir, 'sample.png');
    const outputPdf = path.join(tempDir, 'output.pdf');
    await fs.writeFile(imagePath, IMAGE_BYTES);

    const config = new StdioMcpServerConfig({
      server_id: 'pdf-mcp',
      command: resolveUvCommand(),
      args: ['run', 'python', '-m', 'pdf_mcp.server'],
      cwd: pdfMcpDir
    });

    const server = new StdioManagedMcpServer(config);

    try {
      const tools = await server.listRemoteTools();
      const toolNames = tools.map((tool: any) => tool.name);
      expect(toolNames).toContain('read_pdf_pages');
      expect(toolNames).toContain('pdf_metadata');
      expect(toolNames).toContain('image_to_pdf_page');

      const response = await server.callTool('image_to_pdf_page', {
        image_path: imagePath,
        output_path: outputPdf
      });

      if (response?.isError) {
        const payload = JSON.stringify(response, null, 2);
        throw new Error(`MCP tool error response: ${payload}`);
      }
      const stats = await fs.stat(outputPdf);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    } finally {
      await server.close();
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }, 120000);
});
