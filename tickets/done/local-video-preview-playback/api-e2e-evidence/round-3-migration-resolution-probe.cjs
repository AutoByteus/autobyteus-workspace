const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const WORKTREE = process.env.API_E2E_WORKTREE;
const WEB_ROOT = path.join(WORKTREE, 'autobyteus-web');
const FIXTURE_ROOT = process.env.API_E2E_FIXTURE_ROOT;
const PAGE_URL = process.env.API_E2E_PAGE_URL;
const OUTPUT = process.env.API_E2E_MIGRATION_RESULT_PATH;
const lifecycle = require(path.join(WEB_ROOT, 'dist/electron/local-file-protocol/local-file-protocol.js'));
const { buildLocalFileUrl } = require(path.join(WEB_ROOT, 'dist/shared/localFileUrl.js'));

app.setName('AutoByteusLocalLocatorMigrationResolutionProbe');
app.setPath('userData', path.join(FIXTURE_ROOT, 'electron-migration-failure-user-data'));
lifecycle.registerLocalFileProtocolScheme();

const imagePath = path.join(FIXTURE_ROOT, 'probe image.png');
const canonical = buildLocalFileUrl(imagePath);
const legacy = `local-file://${imagePath.split('/').map(encodeURIComponent).join('/')}`;
const nodeParsed = new URL(legacy);
const result = {
  runtime: null,
  sourceIdentity: { imagePath, canonical, legacy },
  nodeMainUrlParse: { href: nodeParsed.href, hostname: nodeParsed.hostname, pathname: nodeParsed.pathname },
  electronRendererUrlParse: null,
  actualHydration: null,
  expectedHydration: { kind: 'external_url', locator: canonical },
  outcome: 'running',
};

app.whenReady().then(async () => {
  result.runtime = {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
  };
  lifecycle.installLocalFileProtocol();
  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } });
  await win.loadURL(PAGE_URL);
  const observed = await win.webContents.executeJavaScript(`(async () => {
    const started = Date.now();
    while (!window.__apiE2ELocalPreview) {
      if (Date.now() - started > 30000) throw new Error('hook timeout');
      await new Promise(r => setTimeout(r, 50));
    }
    const parsed = new URL(${JSON.stringify(legacy)});
    const lifecycle = await window.__apiE2ELocalPreview.runAttachmentLifecycle({
      canonicalImage: ${JSON.stringify(canonical)},
      legacyPosix: ${JSON.stringify(legacy)},
      legacyWindows: 'local-file://C:/Media/My%20Video%25%231.mp4',
      embeddedImagePath: ${JSON.stringify(imagePath)},
      invalidLocators: [],
    });
    return {
      rendererParse: { href: parsed.href, hostname: parsed.hostname, pathname: parsed.pathname },
      legacyHydration: lifecycle.legacyPosix,
      canonicalHydration: lifecycle.canonicalHydration,
    };
  })()`, true);
  result.electronRendererUrlParse = observed.rendererParse;
  result.actualHydration = observed.legacyHydration;
  result.canonicalControl = observed.canonicalHydration;
  result.outcome = result.actualHydration.kind === 'external_url' && result.actualHydration.locator === canonical ? 'Pass' : 'Fail';
  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
  console.log(`API_E2E_MIGRATION_RESOLUTION ${JSON.stringify(result)}`);
  win.destroy();
  app.exit(result.outcome === 'Pass' ? 0 : 1);
}).catch((error) => {
  result.outcome = 'ProbeError';
  result.error = { message: error.message, stack: error.stack };
  try { fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2)); } catch {}
  console.error(error);
  app.exit(2);
});
