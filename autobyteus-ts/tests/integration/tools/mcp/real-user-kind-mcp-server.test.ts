/**
 * Opt-in check: StdioManagedMcpServer lists the tools of a real `uv` MCP server of the kind users run.
 *
 * Purpose: prove the client against a real third-party Python MCP server, started the way users start theirs
 * (`uv run` in the server's folder). The server runs from a temp copy of its folder (without `.venv`), with
 * `UV_PROJECT_ENVIRONMENT` in a temp directory, so the source folder is never written; the test also
 * checks that the source folder's files are unchanged. It lists tools only, unless a call is given.
 * Gate and inputs (a skip is not a pass):
 *   - RUN_REAL_MCP_SERVER_E2E=1
 *   - AUTOBYTEUS_MCPS_DIR=<folder that contains the server folder>, e.g. /path/to/autobyteus_mcps
 *   - REAL_MCP_SERVER_FOLDER (default `pptx-mcp`)
 *   - REAL_MCP_SERVER_COMMAND (default `uv run --frozen python app/main.py`, as pptx-mcp's README documents;
 *     its `start-pptx-mcp` script is not installed because the project is virtual)
 *   - REAL_MCP_SERVER_CALL='{"tool":"<name>","arguments":{…}}' (optional; calls one tool — use a read-only one)
 *   - UV_CACHE_DIR (optional; default `<os.tmpdir()>/autobyteus-mcp-test-server-uv-cache`). The first run
 *     needs the network to fetch the server's pinned packages.
 * Command: RUN_REAL_MCP_SERVER_E2E=1 AUTOBYTEUS_MCPS_DIR=<dir> env -i … pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp/real-user-kind-mcp-server.test.ts
 *   (with `env -i`, pass the variables after `env -i`, together with PATH, HOME=<temp> and TMPDIR)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { StdioManagedMcpServer } from '../../../../src/tools/mcp/server/stdio-managed-mcp-server.js';
import { StdioMcpServerConfig } from '../../../../src/tools/mcp/types.js';

const gate = process.env.RUN_REAL_MCP_SERVER_E2E === '1';
const mcpsDir = process.env.AUTOBYTEUS_MCPS_DIR ?? '';
const folderName = process.env.REAL_MCP_SERVER_FOLDER || 'pptx-mcp';
const sourceDir = mcpsDir ? path.resolve(mcpsDir, folderName) : '';
const [command = 'uv', ...commandArgs] = (process.env.REAL_MCP_SERVER_COMMAND || 'uv run --frozen python app/main.py').split(/\s+/);
const call = process.env.REAL_MCP_SERVER_CALL ? (JSON.parse(process.env.REAL_MCP_SERVER_CALL) as { tool: string; arguments?: Record<string, unknown> }) : null;

const inputSkipReason = !gate
  ? 'RUN_REAL_MCP_SERVER_E2E=1 is not set'
  : !mcpsDir
    ? 'AUTOBYTEUS_MCPS_DIR is not set'
    : !fs.existsSync(sourceDir)
      ? `server folder not found: ${sourceDir}`
      : null;

/** Path, size and mtime of every file outside `.venv`, to prove the source folder was not written. */
const fingerprint = (dir: string): string[] =>
  (fs.readdirSync(dir, { recursive: true, withFileTypes: true }) as fs.Dirent[])
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name))
    .filter((file) => !path.relative(dir, file).split(path.sep).includes('.venv'))
    .map((file) => {
      const stat = fs.statSync(file);
      return `${path.relative(dir, file)} ${stat.size} ${stat.mtimeMs}`;
    })
    .sort();

type Prepared = { workRoot: string; copyDir: string; before: string[]; uvEnv: Record<string, string> };

/** Copies the folder to temp and lets `uv` prepare it there; a preparation failure becomes the skip reason. */
const prepare = (): Prepared | string => {
  const before = fingerprint(sourceDir);
  const workRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'real-mcp-server-')));
  const copyDir = path.join(workRoot, folderName);
  fs.cpSync(sourceDir, copyDir, {
    recursive: true,
    filter: (source) => !path.relative(sourceDir, source).split(path.sep).includes('.venv')
  });
  const uvEnv = {
    UV_PROJECT_ENVIRONMENT: path.join(workRoot, 'venv'),
    UV_CACHE_DIR: process.env.UV_CACHE_DIR ?? path.join(os.tmpdir(), 'autobyteus-mcp-test-server-uv-cache'),
    PYTHONDONTWRITEBYTECODE: '1'
  };
  if (command === 'uv') {
    const sync = spawnSync('uv', ['sync', '--frozen'], { cwd: copyDir, env: { ...process.env, ...uvEnv }, encoding: 'utf8', timeout: 600_000 });
    if (sync.status !== 0) {
      fs.rmSync(workRoot, { recursive: true, force: true });
      return `uv could not prepare ${folderName}: ${sync.error ?? sync.stderr.trim().split('\n').at(-1)}`;
    }
  }
  return { workRoot, copyDir, before, uvEnv };
};

const prepared = inputSkipReason === null ? prepare() : inputSkipReason;
const skipReason = typeof prepared === 'string' ? prepared : null;

describe.skipIf(skipReason !== null)(`Real user-kind MCP server: ${folderName}${skipReason ? ` — skipped: ${skipReason}` : ''}`, () => {
  const { workRoot, copyDir, before, uvEnv } = (typeof prepared === 'string' ? {} : prepared) as Prepared;
  let client: StdioManagedMcpServer | null = null;

  afterAll(async () => {
    await client?.close();
    if (workRoot) fs.rmSync(workRoot, { recursive: true, force: true });
  });

  it('lists the server tools from a temp copy, leaving the source folder unchanged', async () => {
    client = new StdioManagedMcpServer(
      new StdioMcpServerConfig({ server_id: `real-${folderName}`, command, args: commandArgs, env: uvEnv, cwd: copyDir })
    );
    const tools = (await client.listRemoteTools()) as Array<{ name: string }>;
    console.info(`[real-mcp-server] ${folderName}: ${tools.length} tools: ${tools.map((tool) => tool.name).join(', ')}`);
    expect(tools.length).toBeGreaterThan(0);

    if (call) {
      const result = (await client.callTool(call.tool, call.arguments ?? {})) as { isError?: boolean };
      console.info(`[real-mcp-server] ${folderName}: called ${call.tool}: isError=${result.isError ?? false}`);
      expect(result.isError ?? false).toBe(false);
    }

    await client.close();
    client = null;
    expect(fingerprint(sourceDir)).toEqual(before);
  }, 120_000);
});
