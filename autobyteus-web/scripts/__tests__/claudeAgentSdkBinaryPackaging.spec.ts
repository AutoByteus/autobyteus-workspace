import { lstat, mkdir, mkdtemp, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { pruneClaudeAgentSdkBinaries } from '../claude-agent-sdk-binary-packaging.mjs';

/**
 * The packaged server without the Claude Agent SDK's platform binaries (autobyteus-514, REQ-002, AC-001), on the two
 * staged layouts: the `pnpm deploy --legacy` stage (macOS, Linux, Docker) and the flat `npm install` stage (Windows).
 */
const SDK_PNPM = '@anthropic-ai+claude-agent-sdk@0.3.280_@anthropic-ai+sdk@0.132.1_zod@4.3.6';
const BINARY_BYTES = 4096;
let stage: string;

const exists = (target: string) => lstat(target).then(() => true, () => false);
const writePackage = async (dir: string, name: string, extra: Record<string, string> = {}) => {
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name, version: '0.3.280' }));
  for (const [file, content] of Object.entries(extra)) await writeFile(path.join(dir, file), content);
};
const binary = { claude: 'x'.repeat(BINARY_BYTES) };
const link = async (target: string, at: string) => {
  await mkdir(path.dirname(at), { recursive: true });
  await symlink(path.relative(path.dirname(at), target), at, 'dir');
};

/** As `pnpm deploy --legacy` stages it (and as the shipped macOS app contains it): one folder and two links. */
const pnpmStage = async (platform: string) => {
  const nm = path.join(stage, 'node_modules');
  const sdkReal = path.join(nm, '.pnpm', SDK_PNPM, 'node_modules', '@anthropic-ai', 'claude-agent-sdk');
  const binaryReal = path.join(nm, '.pnpm', `@anthropic-ai+claude-agent-sdk-${platform}@0.3.280`, 'node_modules', '@anthropic-ai', `claude-agent-sdk-${platform}`);
  await writePackage(sdkReal, '@anthropic-ai/claude-agent-sdk', { 'sdk.mjs': 'export {}' });
  await writePackage(binaryReal, `@anthropic-ai/claude-agent-sdk-${platform}`, binary);
  await link(binaryReal, path.join(nm, '.pnpm', SDK_PNPM, 'node_modules', '@anthropic-ai', `claude-agent-sdk-${platform}`));
  await link(binaryReal, path.join(nm, '.pnpm', 'node_modules', '@anthropic-ai', `claude-agent-sdk-${platform}`));
  await link(sdkReal, path.join(nm, '.pnpm', 'node_modules', '@anthropic-ai', 'claude-agent-sdk'));
  await link(sdkReal, path.join(nm, '@anthropic-ai', 'claude-agent-sdk'));
  // Another package of the same scope, and another scope's package with "claude-agent-sdk-" in its name, stay.
  await writePackage(path.join(nm, '.pnpm', '@anthropic-ai+sdk@0.132.1', 'node_modules', '@anthropic-ai', 'sdk'), '@anthropic-ai/sdk');
  await writePackage(path.join(nm, '@example', 'claude-agent-sdk-darwin-arm64'), '@example/claude-agent-sdk-darwin-arm64');
  return { nm, sdkReal };
};

afterEach(async () => { await rm(stage, { recursive: true, force: true }); });

describe('pruneClaudeAgentSdkBinaries', () => {
  it.each(['darwin-arm64', 'darwin-x64', 'linux-x64', 'linux-arm64-musl'])('removes the %s package and both links from a pnpm stage and keeps the SDK', async (platform) => {
    stage = await mkdtemp(path.join(os.tmpdir(), 'claude-sdk-prune-'));
    const { nm, sdkReal } = await pnpmStage(platform);

    const removed = await pruneClaudeAgentSdkBinaries(stage);

    expect((await readdir(path.join(nm, '.pnpm'))).sort()).toEqual([SDK_PNPM, '@anthropic-ai+sdk@0.132.1', 'node_modules'].sort());
    expect(await readdir(path.join(nm, '.pnpm', SDK_PNPM, 'node_modules', '@anthropic-ai'))).toEqual(['claude-agent-sdk']);
    expect(await readdir(path.join(nm, '.pnpm', 'node_modules', '@anthropic-ai'))).toEqual(['claude-agent-sdk']);
    expect(await exists(path.join(sdkReal, 'sdk.mjs'))).toBe(true);
    expect(await exists(path.join(nm, '@anthropic-ai', 'claude-agent-sdk', 'package.json'))).toBe(true);
    expect(await exists(path.join(nm, '@example', 'claude-agent-sdk-darwin-arm64', 'package.json'))).toBe(true);
    // The folder's files are counted once; the links add only their own few bytes.
    expect(removed).toBeGreaterThanOrEqual(BINARY_BYTES);
    expect(removed).toBeLessThan(BINARY_BYTES + 1024);
  });

  it('removes a flat npm stage\'s platform package, top-level and nested, and keeps the SDK (Windows)', async () => {
    stage = await mkdtemp(path.join(os.tmpdir(), 'claude-sdk-prune-'));
    const nm = path.join(stage, 'node_modules');
    await writePackage(path.join(nm, '@anthropic-ai', 'claude-agent-sdk'), '@anthropic-ai/claude-agent-sdk');
    await writePackage(path.join(nm, '@anthropic-ai', 'claude-agent-sdk-win32-x64'), '@anthropic-ai/claude-agent-sdk-win32-x64', binary);
    await writePackage(path.join(nm, '@anthropic-ai', 'sdk'), '@anthropic-ai/sdk');
    // A copy npm nested under a dependent package, when versions differ.
    await writePackage(path.join(nm, 'some-tool', 'node_modules', '@anthropic-ai', 'claude-agent-sdk-win32-arm64'), '@anthropic-ai/claude-agent-sdk-win32-arm64', binary);

    const removed = await pruneClaudeAgentSdkBinaries(stage);

    expect((await readdir(path.join(nm, '@anthropic-ai'))).sort()).toEqual(['claude-agent-sdk', 'sdk']);
    expect(await readdir(path.join(nm, 'some-tool', 'node_modules', '@anthropic-ai'))).toEqual([]);
    expect(removed).toBeGreaterThanOrEqual(2 * BINARY_BYTES);
  });

  it('changes nothing and returns 0 when the stage has no platform package', async () => {
    stage = await mkdtemp(path.join(os.tmpdir(), 'claude-sdk-prune-'));
    await writePackage(path.join(stage, 'node_modules', '@anthropic-ai', 'claude-agent-sdk'), '@anthropic-ai/claude-agent-sdk');

    expect(await pruneClaudeAgentSdkBinaries(stage)).toBe(0);
    expect(await readdir(path.join(stage, 'node_modules', '@anthropic-ai'))).toEqual(['claude-agent-sdk']);
  });

  it('fails the build when the SDK package itself is missing from the stage', async () => {
    stage = await mkdtemp(path.join(os.tmpdir(), 'claude-sdk-prune-'));
    await writePackage(path.join(stage, 'node_modules', '@anthropic-ai', 'claude-agent-sdk-linux-x64'), '@anthropic-ai/claude-agent-sdk-linux-x64', binary);

    await expect(pruneClaudeAgentSdkBinaries(stage)).rejects.toThrow('@anthropic-ai/claude-agent-sdk is missing');
  });
});
