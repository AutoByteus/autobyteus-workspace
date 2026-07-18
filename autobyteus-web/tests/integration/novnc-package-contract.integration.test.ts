import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  NO_VNC_ELECTRON_REQUIRED_NOTICE_FILES,
  NO_VNC_THIRD_PARTY_NOTICE_EXTRA_RESOURCE,
  NO_VNC_THIRD_PARTY_NOTICE_PACKAGING,
} from '../../build/scripts/noVncThirdPartyNotice';

const EXACT_VERSION = '1.7.0-g7c36fab';
const EXACT_COMMIT = '7c36fabe599e053c5a81e98e091ac636f6c1e174';
const EXACT_INTEGRITY = 'sha512-MAG6tCn4LA7QfxlEHv0+EQiQCFfS/7tIT8y4A+/GgXxsLzz2chIRRzvRGQddr9o30d/A7lhljOPNwCBsszzlwA==';
const require = createRequire(import.meta.url);
const webRoot = path.resolve(process.cwd());
const workspaceRoot = path.resolve(webRoot, '..');
const resolvedRfbPath = require.resolve('@novnc/novnc');
const packageRoot = path.resolve(path.dirname(resolvedRfbPath), '..');

const readJson = (filePath: string) => JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, any>;
const normalizeLicenseText = (value: string) => value.replace(/[ \t]+$/gm, '').trim();

describe('noVNC package integration contract', () => {
  it('pins the exact official package-root build and registry integrity', () => {
    const frontendManifest = readJson(path.join(webRoot, 'package.json'));
    const installedManifest = readJson(path.join(packageRoot, 'package.json'));
    const lockfile = readFileSync(path.join(workspaceRoot, 'pnpm-lock.yaml'), 'utf8');

    expect(frontendManifest.dependencies?.['@novnc/novnc']).toBe(EXACT_VERSION);
    expect(installedManifest).toMatchObject({
      name: '@novnc/novnc',
      version: EXACT_VERSION,
      type: 'module',
      exports: './core/rfb.js',
      license: 'MPL-2.0',
      author: 'Joel Martin <github@martintribe.org> (https://github.com/kanaka)',
      repository: {
        type: 'git',
        url: 'git+https://github.com/novnc/noVNC.git',
      },
    });
    expect(resolvedRfbPath).toBe(path.join(packageRoot, 'core', 'rfb.js'));
    expect(lockfile).toContain(`'@novnc/novnc@${EXACT_VERSION}':`);
    expect(lockfile).toContain(`integrity: ${EXACT_INTEGRITY}`);
  });

  it('retains the selected build automatic async clipboard owner', () => {
    const clipboardSource = readFileSync(path.join(packageRoot, 'core', 'clipboard.js'), 'utf8');
    const browserSupportSource = readFileSync(path.join(packageRoot, 'core', 'util', 'browser.js'), 'utf8');
    const rfbSource = readFileSync(resolvedRfbPath, 'utf8');

    expect(clipboardSource).toContain('browserAsyncClipboardSupport');
    expect(clipboardSource).toContain('navigator.clipboard.readText()');
    expect(clipboardSource).toContain('navigator.clipboard.writeText(text)');
    expect(browserSupportSource).toContain('{name: "clipboard-read",  allowWithoutGesture: false}');
    expect(browserSupportSource).toContain('{name: "clipboard-write", allowWithoutGesture: true}');
    expect(rfbSource).toContain('this._asyncClipboard = new AsyncClipboard(this._canvas)');
    expect(rfbSource).toContain('this._asyncClipboard.onpaste = this.clipboardPasteFrom.bind(this)');
    expect(rfbSource).toContain('if (this._asyncClipboard.writeClipboard(text)) return');
  });

  it('keeps application resolution at the root and the vendored tree absent', () => {
    const sessionSource = readFileSync(path.join(webRoot, 'composables', 'useVncSession.ts'), 'utf8');
    const sessionTestSource = readFileSync(path.join(webRoot, 'composables', '__tests__', 'useVncSession.spec.ts'), 'utf8');
    const layoutTestSource = readFileSync(path.join(webRoot, 'components', 'layout', '__tests__', 'WorkspaceAdaptiveLayout.spec.ts'), 'utf8');

    expect(sessionSource).toContain("import RFB from '@novnc/novnc'");
    expect(sessionTestSource).toContain("vi.mock('@novnc/novnc'");
    expect(layoutTestSource).toContain("vi.mock('@novnc/novnc'");
    expect(sessionSource).not.toMatch(/@novnc\/novnc\//);
    expect(existsSync(path.join(webRoot, 'lib', 'novnc'))).toBe(false);
  });

  it('ships the exact dependency notice through web and desktop packaging', () => {
    const noticeSourcePath = path.join(webRoot, NO_VNC_THIRD_PARTY_NOTICE_PACKAGING.sourcePath);
    const notice = readFileSync(noticeSourcePath, 'utf8');
    const upstreamNotice = readFileSync(path.join(packageRoot, 'LICENSE.txt'), 'utf8').trim();
    const upstreamMpl = readFileSync(path.join(packageRoot, 'docs', 'LICENSE.MPL-2.0'), 'utf8').trim();
    const upstreamPakoLicense = readFileSync(path.join(packageRoot, 'vendor', 'pako', 'LICENSE'), 'utf8').trim();
    const desktopBuildSource = readFileSync(path.join(webRoot, 'build', 'scripts', 'build.ts'), 'utf8');
    const genericNuxtConfigSource = readFileSync(path.join(webRoot, 'nuxt.config.ts'), 'utf8');
    const electronNuxtConfigSource = readFileSync(path.join(webRoot, 'nuxt.electron.config.ts'), 'utf8');

    expect(NO_VNC_THIRD_PARTY_NOTICE_PACKAGING).toEqual({
      sourcePath: `public/THIRD_PARTY_NOTICES/noVNC-${EXACT_VERSION}.txt`,
      genericWebOutputPath: `dist/public/THIRD_PARTY_NOTICES/noVNC-${EXACT_VERSION}.txt`,
      electronRendererOutputPath: `dist/renderer/THIRD_PARTY_NOTICES/noVNC-${EXACT_VERSION}.txt`,
      desktopOutputPath: `THIRD_PARTY_NOTICES/noVNC-${EXACT_VERSION}.txt`,
    });
    expect(NO_VNC_ELECTRON_REQUIRED_NOTICE_FILES).toEqual([
      NO_VNC_THIRD_PARTY_NOTICE_PACKAGING.sourcePath,
      NO_VNC_THIRD_PARTY_NOTICE_PACKAGING.electronRendererOutputPath,
    ]);
    expect(NO_VNC_THIRD_PARTY_NOTICE_EXTRA_RESOURCE).toEqual({
      from: NO_VNC_THIRD_PARTY_NOTICE_PACKAGING.sourcePath,
      to: NO_VNC_THIRD_PARTY_NOTICE_PACKAGING.desktopOutputPath,
    });
    expect(notice).toContain(`Package: @novnc/novnc@${EXACT_VERSION}`);
    expect(notice).toContain(`Exact upstream commit: ${EXACT_COMMIT}`);
    expect(notice).toContain(`https://github.com/novnc/noVNC/tree/${EXACT_COMMIT}`);
    expect(notice).toContain('Package author: Joel Martin <github@martintribe.org>');
    expect(notice).toContain('noVNC is Copyright (C) 2022 The noVNC authors');
    const normalizedNotice = normalizeLicenseText(notice);
    expect(normalizedNotice).toContain(normalizeLicenseText(upstreamNotice));
    expect(normalizedNotice).toContain(normalizeLicenseText(upstreamMpl));
    expect(normalizedNotice).toContain(normalizeLicenseText(upstreamPakoLicense));
    expect(desktopBuildSource).toMatch(
      /extraResources:\s*\[[\s\S]*NO_VNC_THIRD_PARTY_NOTICE_EXTRA_RESOURCE[\s\S]*\],\s*publish:/,
    );
    expect(desktopBuildSource).toContain('for (const filePath of NO_VNC_ELECTRON_REQUIRED_NOTICE_FILES)');
    expect(genericNuxtConfigSource).toContain("publicDir: 'dist/public'");
    expect(electronNuxtConfigSource).toContain("publicDir: 'dist/renderer'");
  });
});
