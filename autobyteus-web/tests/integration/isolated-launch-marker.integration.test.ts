import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ISOLATED_LAUNCH_CONTRACT,
  ISOLATED_LAUNCH_MARKER_EXTRA_RESOURCE,
  ISOLATED_LAUNCH_MARKER_FILE,
  ISOLATED_LAUNCH_MARKER_SOURCE_PATH,
} from '../../build/scripts/isolatedLaunchMarker';
import {
  ISOLATED_LAUNCH_MARKER_FILE as LIFECYCLE_MARKER_FILE,
  REQUIRED_ISOLATED_LAUNCH_CONTRACT,
} from '../../scripts/electron-launch/appExecutable.mjs';

const webRoot = path.resolve(process.cwd());
const distRoot = path.join(webRoot, 'electron-dist');

/** Resources directories of packaged apps present in electron-dist (macOS bundles, Linux unpacked). */
function packagedResourceDirs(): string[] {
  if (!existsSync(distRoot)) return [];
  const dirs: string[] = [];
  for (const entry of readdirSync(distRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const outputDir = path.join(distRoot, entry.name);
    if (/-unpacked$/.test(entry.name)) dirs.push(path.join(outputDir, 'resources'));
    for (const child of readdirSync(outputDir)) {
      if (child.endsWith('.app')) dirs.push(path.join(outputDir, child, 'Contents', 'Resources'));
    }
  }
  return dirs;
}

describe('isolated-launch capability marker packaging', () => {
  it('commits the marker with the current contract', () => {
    const marker = JSON.parse(readFileSync(path.join(webRoot, ISOLATED_LAUNCH_MARKER_SOURCE_PATH), 'utf8'));
    expect(marker).toEqual({ isolatedLaunchContract: ISOLATED_LAUNCH_CONTRACT });
  });

  it('ships the marker to <resources>/isolated-launch.json for every desktop target', () => {
    expect(ISOLATED_LAUNCH_MARKER_EXTRA_RESOURCE).toEqual({
      from: 'build/isolated-launch/isolated-launch.json',
      to: 'isolated-launch.json',
    });
    const buildSource = readFileSync(path.join(webRoot, 'build', 'scripts', 'build.ts'), 'utf8');
    const extraResources = buildSource.slice(buildSource.indexOf('extraResources: ['));
    expect(extraResources.slice(0, extraResources.indexOf(']'))).toContain('ISOLATED_LAUNCH_MARKER_EXTRA_RESOURCE');
  });

  it('matches what the isolated-app lifecycle requires', () => {
    expect(LIFECYCLE_MARKER_FILE).toBe(ISOLATED_LAUNCH_MARKER_FILE);
    expect(REQUIRED_ISOLATED_LAUNCH_CONTRACT).toBe(ISOLATED_LAUNCH_CONTRACT);
  });

  const packaged = packagedResourceDirs();
  it.skipIf(packaged.length === 0)('is present in packaged output', () => {
    for (const resourcesDir of packaged) {
      const markerPath = path.join(resourcesDir, ISOLATED_LAUNCH_MARKER_FILE);
      expect(existsSync(markerPath), markerPath).toBe(true);
      expect(JSON.parse(readFileSync(markerPath, 'utf8'))).toEqual({ isolatedLaunchContract: ISOLATED_LAUNCH_CONTRACT });
    }
  });
});
