import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PRODUCT_COPYRIGHT,
  PRODUCT_LICENSE_EXTRA_RESOURCES,
  PRODUCT_LICENSE_REQUIRED_FILES,
} from '../../build/scripts/productLicensePackaging';

const AGPL_SHA256 = '0d96a4ff68ad6d4b6f1f30f713b18d5184912ba8dd389f86aa7710db079abcb0';

const webRoot = path.resolve(process.cwd());
const distRoot = path.join(webRoot, 'electron-dist');

interface PackagedApp {
  resourcesDir: string;
  infoPlistPath: string | null;
}

/** Packaged apps present in electron-dist (macOS bundles, Linux/Windows unpacked). */
function packagedApps(): PackagedApp[] {
  if (!existsSync(distRoot)) return [];
  const apps: PackagedApp[] = [];
  for (const entry of readdirSync(distRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const outputDir = path.join(distRoot, entry.name);
    if (/-unpacked$/.test(entry.name)) {
      apps.push({ resourcesDir: path.join(outputDir, 'resources'), infoPlistPath: null });
    }
    for (const child of readdirSync(outputDir)) {
      if (!child.endsWith('.app')) continue;
      const contentsDir = path.join(outputDir, child, 'Contents');
      apps.push({
        resourcesDir: path.join(contentsDir, 'Resources'),
        infoPlistPath: path.join(contentsDir, 'Info.plist'),
      });
    }
  }
  return apps;
}

function readPlistString(plistPath: string, key: string): string | null {
  let xml = readFileSync(plistPath, 'utf8');
  if (xml.startsWith('bplist')) {
    xml = execFileSync('plutil', ['-convert', 'xml1', '-o', '-', plistPath], { encoding: 'utf8' });
  }
  const match = xml.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`));
  return match ? match[1] : null;
}

function sha256(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

describe('product license packaging', () => {
  it('ships LICENSE, LICENSING.md and NOTICE to <resources>/ for every desktop target', () => {
    expect(PRODUCT_LICENSE_EXTRA_RESOURCES).toEqual([
      { from: 'LICENSE', to: 'LICENSE' },
      { from: '../LICENSING.md', to: 'LICENSING.md' },
      { from: '../NOTICE', to: 'NOTICE' },
    ]);
    expect(PRODUCT_LICENSE_REQUIRED_FILES).toEqual(['LICENSE', '../LICENSING.md', '../NOTICE']);
    const buildSource = readFileSync(path.join(webRoot, 'build', 'scripts', 'build.ts'), 'utf8');
    const extraResources = buildSource.slice(buildSource.indexOf('extraResources: ['));
    expect(extraResources.slice(0, extraResources.indexOf(']'))).toContain('...PRODUCT_LICENSE_EXTRA_RESOURCES');
    expect(buildSource).toContain('copyright: PRODUCT_COPYRIGHT');
  });

  it('states the copyright holder and licence in the About/copyright string', () => {
    expect(PRODUCT_COPYRIGHT).toBe(
      'Copyright © 2026 Yu Zheng (AutoByteus). Licensed under AGPL-3.0-only or a commercial license.',
    );
  });

  it('has every required source file, with the AGPL text as LICENSE', () => {
    for (const filePath of PRODUCT_LICENSE_REQUIRED_FILES) {
      expect(existsSync(path.join(webRoot, filePath)), filePath).toBe(true);
    }
    expect(sha256(path.join(webRoot, 'LICENSE'))).toBe(AGPL_SHA256);
  });

  const packaged = packagedApps();
  it.skipIf(packaged.length === 0)('is present in packaged output', () => {
    for (const app of packaged) {
      for (const resource of PRODUCT_LICENSE_EXTRA_RESOURCES) {
        const packagedPath = path.join(app.resourcesDir, resource.to);
        expect(existsSync(packagedPath), packagedPath).toBe(true);
        expect(readFileSync(packagedPath)).toEqual(readFileSync(path.join(webRoot, resource.from)));
      }
      if (app.infoPlistPath) {
        expect(readPlistString(app.infoPlistPath, 'NSHumanReadableCopyright')).toBe(PRODUCT_COPYRIGHT);
      }
    }
  });
});
