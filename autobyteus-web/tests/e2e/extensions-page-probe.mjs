#!/usr/bin/env node
// Settings → Extensions on a real node (autobyteus-516; VIS-V*, AC-001, AC-002, AC-003, AC-005, AC-007): a probe-owned node
// started as the desktop's own node, a development catalog signed with a throwaway key and served on loopback, the
// real Voice Input package packed from the extensions repository, the real voice runtime 0.3.2 and its speech model
// (about 2 GB, downloaded into the probe's temporary folder), a Nuxt dev server and headless Chrome. Chrome's fake
// microphone plays a spoken clip, so the Test records and transcribes for real. The update cases (U1, U2) publish later
// catalog releases on the same catalog: Voice Input 1.0.1 (the repository's package with the version changed), then a
// broken 1.0.2 whose server part pins a voice runtime release that does not exist, so its install(ctx) fails.
//
//   node tests/e2e/extensions-page-probe.mjs --extensions-repo=<AutoByteus/autobyteus-extensions checkout> [--skip-server-build]
//     [--output-dir=<new folder>] [--browser-executable=<chrome>]
//
// The window is a browser window with a stand-in for the desktop shell (`window.electronAPI`: its own node's window,
// reached through the dev proxy); the desktop's credential attacher is stood in for by the probe's browser context (TESTING.md § Browser
// probes). macOS only (the clip comes from `say` and `ffmpeg`). Nothing under ~/.autobyteus is used.
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { execFile, spawn } from 'node:child_process';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { createRequire } from 'node:module';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { prepareOutputDir, probeOutputDir } from './fixtures/probe-output-dir.mjs';
import { attachToBrowserContext, attachToProbeProcess, withNodeCredential } from './fixtures/probe-node-access.mjs';

attachToProbeProcess();

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const execFileAsync = promisify(execFile);
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = path.dirname(webDir);
const serverDir = path.join(root, 'autobyteus-server-ts');
const arg = (name, fallback) => {
  const value = process.argv.find(item => item.startsWith(`--${name}=`));
  return value ? value.slice(name.length + 3) : fallback;
};
const outputDir = prepareOutputDir(probeOutputDir(webDir, 'extensions-page', arg('output-dir')));
const extensionsRepo = arg('extensions-repo');
const skipServerBuild = process.argv.includes('--skip-server-build');
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
const evidence = {
  startedAt: new Date().toISOString(), result: 'Fail', platform: `${process.platform}-${process.arch}`, node: process.version,
  cases: {}, browserErrors: [], refusedRequests: [], timings: {}, cleanup: {}, error: null,
};

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const waitFor = async (description, fn, ms = 30000) => {
  const deadline = Date.now() + ms;
  let lastError;
  while (Date.now() < deadline) {
    try { if (await fn()) return; } catch (error) { lastError = error; }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ''}`);
};
const choosePort = () => new Promise((resolve, reject) => {
  const socket = net.createServer();
  socket.once('error', reject);
  socket.listen(0, '127.0.0.1', () => { const { port } = socket.address(); socket.close(() => resolve(port)); });
});
const exited = child => child.exitCode !== null || child.signalCode !== null;
const start = (command, args, cwd, env, logPath) => {
  const log = createWriteStream(logPath, { flags: 'a' });
  const child = spawn(command, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  child.once('close', () => log.end());
  return child;
};
const run = (command, args, cwd, env, logPath) => new Promise((resolve, reject) => {
  const child = start(command, args, cwd, env, logPath);
  child.once('error', reject);
  child.once('close', (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited ${code}/${signal}; see ${logPath}`)));
});
const stop = async child => {
  if (!child) return 'not-started';
  for (const signal of ['SIGTERM', 'SIGKILL']) {
    if (exited(child)) break;
    process.kill(-child.pid, signal);
    await Promise.race([new Promise(resolve => child.once('close', resolve)), sleep(8000)]);
  }
  assert(exited(child), `Owned child ${child.pid} did not exit`);
  return `terminated:${child.pid}`;
};
const scrubbedEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('ENABLE_') && !key.startsWith('AUTOBYTEUS_')));

/**
 * A later Voice Input package for the update cases (AC-003): the repository's voice-input folder with another version,
 * packed with the repository's own packing code. `runtimeVersion` pins another voice runtime release in the server
 * part: a release that does not exist makes the package's install(ctx) fail, as a broken package release would.
 */
const packVoiceVariant = async (folder, version, { runtimeVersion } = {}) => {
  const variant = path.join(folder, `voice-input-${version}`);
  await fs.cp(path.join(extensionsRepo, 'voice-input'), variant, { recursive: true });
  const descriptionFile = path.join(variant, 'extension.json');
  const description = { ...JSON.parse(await fs.readFile(descriptionFile, 'utf8')), version };
  await fs.writeFile(descriptionFile, `${JSON.stringify(description, null, 2)}\n`);
  if (runtimeVersion) {
    const serverFile = path.join(variant, 'server', 'index.mjs');
    const source = await fs.readFile(serverFile, 'utf8');
    const pinned = source.replace(/const RUNTIME_VERSION = '[^']+'/, `const RUNTIME_VERSION = '${runtimeVersion}'`);
    assert(pinned !== source, 'the voice server part pins its runtime as const RUNTIME_VERSION');
    await fs.writeFile(serverFile, pinned);
  }
  const { packageFiles } = await import(pathToFileURL(path.join(extensionsRepo, 'scripts', 'lib', 'extension-package.mjs')).href);
  const { packTarGz } = await import(pathToFileURL(path.join(extensionsRepo, 'scripts', 'lib', 'tar-gz.mjs')).href);
  const bytes = packTarGz(await packageFiles(variant));
  return { name: `voice-input-${version}.tar.gz`, bytes, sha256: createHash('sha256').update(bytes).digest('hex'), description };
};

/**
 * The development catalog: the real voice-input package, signed with a throwaway key, on loopback. `publish` replaces
 * the catalog's voice-input entry and its signature (a catalog release), so the update cases can offer a later version.
 */
const startCatalog = async (folder) => {
  const { packExtension } = await import(pathToFileURL(path.join(extensionsRepo, 'scripts', 'pack.mjs')).href);
  const { file, sha256, description } = await packExtension('voice-input', { outDir: folder });
  const port = await choosePort();
  const base = `http://127.0.0.1:${port}`;
  const keys = generateKeyPairSync('ed25519');
  const files = new Map([[path.basename(file), await fs.readFile(file)]]);
  const publish = ({ name, bytes, sha256: digest, description: entry }) => {
    files.set(name, bytes);
    const catalogBytes = Buffer.from(JSON.stringify({ extensions: [{ ...entry, packageUrl: `${base}/${name}`, sha256: digest }] }));
    files.set('extensions-catalog.json', catalogBytes);
    files.set('extensions-catalog.json.sig', Buffer.from(sign(null, catalogBytes, keys.privateKey).toString('base64')));
  };
  publish({ name: path.basename(file), bytes: files.get(path.basename(file)), sha256, description });
  const server = http.createServer((request, response) => {
    const body = files.get(path.basename(new URL(request.url, base).pathname));
    if (!body) { response.statusCode = 404; response.end(); return; }
    response.end(body);
  });
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  evidence.catalog = { url: `${base}/extensions-catalog.json`, packageSha256: sha256, packageSha256Check: createHash('sha256').update(files.get(path.basename(file))).digest('hex') };
  return { server, publish, url: `${base}/extensions-catalog.json`, publicKeyPem: keys.publicKey.export({ type: 'spki', format: 'pem' }).toString() };
};

/** The voice worker processes this probe's node runs (their model path is under the probe's own folder). */
const voiceWorkers = async (ownedFolder) => {
  const { stdout } = await execFileAsync('ps', ['-axo', 'pid=,command=']);
  return stdout.split('\n').filter(line => line.includes(' serve --backend ') && line.includes(ownedFolder)).map(line => line.trim().split(/\s+/)[0]);
};

const createNode = async (ownedRoot, catalog) => {
  const dataRoot = path.join(ownedRoot, 'node');
  const databasePath = path.join(dataRoot, 'db', 'node.db');
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  for (const folder of ['logs', 'memory', 'temp_workspace', 'home']) await fs.mkdir(path.join(dataRoot, folder), { recursive: true });
  const port = await choosePort();
  const url = `http://127.0.0.1:${port}`;
  const databaseUrl = pathToFileURL(databasePath).href;
  const env = {
    ...scrubbedEnv(), HOME: path.join(dataRoot, 'home'), AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '', AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS: '', AUTOBYTEUS_SKILLS_PATHS: '',
    APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: databaseUrl, AUTOBYTEUS_SERVER_HOST: url, AUTOBYTEUS_LOG_DIR: path.join(dataRoot, 'logs'),
    AUTOBYTEUS_MEMORY_DIR: path.join(dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(dataRoot, 'temp_workspace'),
    // The desktop's own node, so Voice Input (offered on desktop-node) is listed; the probe's development catalog.
    AUTOBYTEUS_DESKTOP_EMBEDDED_NODE: '1',
    AUTOBYTEUS_EXTENSIONS_CATALOG_URL: catalog.url, AUTOBYTEUS_EXTENSIONS_CATALOG_PUBLIC_KEY: catalog.publicKeyPem,
  };
  await fs.writeFile(path.join(dataRoot, '.env'), ['APP_ENV=development', 'DB_TYPE=sqlite', `DATABASE_URL=${databaseUrl}`, `AUTOBYTEUS_SERVER_HOST=${url}`].join('\n') + '\n');
  await run('corepack', ['pnpm', '-C', serverDir, 'exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], root, env, path.join(outputDir, 'migrate.log'));
  return { dataRoot, port, url, env, process: null };
};

/** A spoken English clip for Chrome's fake microphone (48 kHz mono, as a recording device would deliver). */
const spokenClip = async (folder) => {
  const aiff = path.join(folder, 'clip.aiff');
  const wav = path.join(folder, 'clip.wav');
  await execFileAsync('say', ['-v', 'Samantha', '-o', aiff, 'Please summarize the meeting notes and send them to the team.']);
  await execFileAsync('ffmpeg', ['-y', '-loglevel', 'error', '-i', aiff, '-af', 'apad=pad_dur=2', '-ac', '1', '-ar', '48000', '-c:a', 'pcm_s16le', wav]);
  return wav;
};

let page;
const shot = async name => {
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true });
};
const text = async testId => (await page.locator(`[data-testid="${testId}"]`).first().innerText()).replace(/\s+/g, ' ').trim();
const kase = async (id, title, body) => {
  const started = Date.now();
  try {
    await body();
    evidence.cases[id] = { title, result: 'Pass', ms: Date.now() - started };
  } catch (error) {
    evidence.cases[id] = { title, result: 'Fail', ms: Date.now() - started, error: error.message };
    await shot(`${id}-failure`).catch(() => undefined);
  }
  console.log(`${evidence.cases[id].result} ${id} ${title}${evidence.cases[id].error ? `: ${evidence.cases[id].error}` : ''}`);
};

let ownedRoot, node, frontend, browser, catalog;
try {
  assert(extensionsRepo && existsSync(path.join(extensionsRepo, 'voice-input', 'extension.json')), '--extensions-repo must name an AutoByteus/autobyteus-extensions checkout');
  if (!skipServerBuild) await run('corepack', ['pnpm', '-C', serverDir, 'build'], root, process.env, path.join(outputDir, 'server-build.log'));
  ownedRoot = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-extensions-page-e2e-')));
  catalog = await startCatalog(path.join(ownedRoot, 'catalog'));
  const clip = await spokenClip(ownedRoot);
  const frontendPort = await choosePort();
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  node = await createNode(ownedRoot, catalog);
  node.env.AUTOBYTEUS_ALLOWED_ORIGINS = frontendUrl;
  node.process = start(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(node.port), '--data-dir', node.dataRoot],
    serverDir, withNodeCredential(node.env), path.join(outputDir, 'backend.log'));
  await waitFor('backend health', async () => {
    if (exited(node.process)) throw new Error(`backend exited ${node.process.exitCode}`);
    return fetch(`${node.url}/rest/health`).then(response => response.ok).catch(() => false);
  }, 120000);
  evidence.isolation = { tempRoot: ownedRoot, backend: node.url, frontend: frontendUrl };
  frontend = start('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...scrubbedEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: node.url }, path.join(outputDir, 'frontend.log'));
  await waitFor('frontend', async () => { if (exited(frontend)) throw new Error('frontend exited'); return fetch(frontendUrl).then(r => r.ok).catch(() => false); }, 240000);
  browser = await chromium.launch({
    headless: true, executablePath,
    args: ['--disable-dev-shm-usage', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${clip}`],
  });
  evidence.browserVersion = browser.version();
  const openContext = async (locale, viewport) => {
    const context = await browser.newContext({ viewport, locale: locale === 'zh-CN' ? 'zh-CN' : 'en-US', timezoneId: 'Europe/Berlin' });
    await context.grantPermissions(['microphone', 'clipboard-read', 'clipboard-write'], { origin: frontendUrl });
    await attachToBrowserContext(context);
    await context.addInitScript(({ mode, nodeUrl }) => {
      if (window !== window.top) return; // the extension's sandboxed page has its own world
      localStorage.setItem('autobyteus.localization.preference-mode', mode);
      // The Extensions page is the desktop app's. This stands in for the desktop shell: the window is its own node's
      // window (the node reached through the dev proxy), the node is up, and every other shell call does nothing.
      const now = new Date().toISOString();
      const known = {
        getNodeRegistrySnapshot: async () => ({ version: 1, nodes: [{ id: 'embedded-local', name: 'Embedded Node', baseUrl: nodeUrl, nodeType: 'embedded', createdAt: now, updatedAt: now }] }),
        getWindowContext: async () => ({ windowId: 1, entryId: 'embedded-local' }),
        checkServerHealth: async () => ({ status: 'ok' }),
        getServerStatus: async () => ({ status: 'running', baseUrl: nodeUrl, urls: {} }),
        getNodeAccessStates: async () => ({ 'embedded-local': 'connected' }),
        getAppLocale: async () => mode,
      };
      window.electronAPI = new Proxy(known, {
        get: (target, key) => (key in target ? target[key] : (key.startsWith('on') ? () => () => undefined : async () => undefined)),
      });
    }, { mode: locale, nodeUrl: frontendUrl });
    const opened = await context.newPage();
    opened.on('pageerror', e => evidence.browserErrors.push(e.message));
    opened.on('response', response => {
      if (response.url().includes('/rest/extensions/') && response.status() >= 400) evidence.refusedRequests.push(`${response.status()} ${response.url()}`);
    });
    return opened;
  };
  page = await openContext('en', { width: 1440, height: 900 });
  const openExtensions = async () => {
    await page.goto(`${frontendUrl}/settings?section=extensions`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="extension-card-voice-input"]').waitFor({ state: 'visible', timeout: 120000 });
  };
  const card = id => text(`extension-state-${id}`);

  await kase('R1', 'This computer\'s Extensions: Voice Input Not installed from the verified catalog (V1-01, V2-01)', async () => {
    await openExtensions();
    assert((await text('extensions-node-line')).includes('this computer'), 'node line');
    assert(await card('voice-input') === 'Not installed', `state ${await card('voice-input')}`);
    assert(await page.locator('[data-testid="extensions-catalog-unverified"], [data-testid="extensions-catalog-offline"]').count() === 0, 'no catalog note');
    await shot('R1-not-installed');
  });

  await kase('R2', 'Install: phases without a percent, then Installed and on, Getting ready, then On and Ready (V2-02…V2-05, AC-002, REQ-012)', async () => {
    const started = Date.now();
    await page.locator('[data-testid="extension-install-voice-input"]').click();
    await waitFor('installing', async () => await card('voice-input') === 'Installing', 30000);
    evidence.installPhases = [];
    await shot('R2-installing');
    await waitFor('the speech model phase', async () => {
      const progress = await page.locator('[data-testid="extension-progress-voice-input"]').innerText().catch(() => '');
      if (progress && !evidence.installPhases.includes(progress.trim())) evidence.installPhases.push(progress.trim());
      return progress.includes('Preparing the speech model');
    }, 120000);
    await shot('R2-preparing-speech-model');
    await waitFor('installed and starting', async () => (await page.locator('[data-testid="extension-starting-voice-input"]').count()) > 0 || await card('voice-input') === 'On', 1800000);
    evidence.timings.installSeconds = Math.round((Date.now() - started) / 1000);
    if (await page.locator('[data-testid="extension-starting-voice-input"]').count()) {
      evidence.startingMessage = await text('extension-message-voice-input');
      await shot('R2-installed-and-on-getting-ready');
    }
    await waitFor('ready', async () => (await page.locator('[data-testid="extension-starting-voice-input"]').count()) === 0, 300000);
    evidence.timings.readySeconds = Math.round((Date.now() - started) / 1000);
    assert(await card('voice-input') === 'On', `state ${await card('voice-input')}`);
    await shot('R2-on-ready');
  });

  await kase('R3', 'The packaged page through the real node: loads, shows the installed runtime and folder, saves the language; nothing refused (AC-002 page check, V7-01)', async () => {
    await page.locator('[data-testid="extension-toggle-page-voice-input"]').click();
    const frame = page.frameLocator('[data-testid="extension-page-voice-input"] iframe');
    await frame.locator('#facts').getByText('0.3.2').waitFor({ timeout: 30000 });
    evidence.pageFacts = await frame.locator('#facts').innerText();
    await frame.locator('#lang').selectOption('en');
    await frame.getByText('Saved').waitFor({ timeout: 15000 });
    const frameHeight = await page.locator('[data-testid="extension-page-voice-input"] iframe').evaluate(element => element.getBoundingClientRect().height);
    evidence.frameHeight = frameHeight;
    assert(frameHeight > 120, `frame resized to its page (${frameHeight})`);
    const settings = await (await fetch(`${node.url}/rest/extensions/voice-input/actions/getSettings`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'null' })).json();
    assert(settings.output.language === 'en', `language saved on the node: ${JSON.stringify(settings)}`);
    assert(evidence.refusedRequests.length === 0, `refused requests: ${evidence.refusedRequests.join(', ')}`);
    await shot('R3-page-language-saved');
  });

  /** The microphone panel's Test: records the fake microphone for 5 s and returns the transcript and its time. */
  const recordTest = async (shotPrefix) => {
    // The panel is in the card's settings section; a freshly opened page shows it collapsed ("Show settings").
    if (!(await page.locator('[data-testid="voice-microphone-panel"]').count())) {
      await page.locator('[data-testid="extension-toggle-page-voice-input"]').click();
    }
    await page.locator('[data-testid="voice-microphone-panel"]').scrollIntoViewIfNeeded();
    if (shotPrefix) await shot(`${shotPrefix}-microphone-panel`);
    await page.locator('[data-testid="voice-test-button"]').click();
    // While the Test records and transcribes, the panel hides the earlier result, so the result that appears is this one.
    await waitFor('recording', async () => (await page.locator('[data-testid="voice-test-button"]').innerText()).includes('Stop Test'), 20000);
    await sleep(5000);
    if (shotPrefix) await shot(`${shotPrefix}-test-recording`);
    await page.locator('[data-testid="voice-test-button"]').click();
    const started = Date.now();
    await page.locator('[data-testid="voice-test-result"]').waitFor({ timeout: 120000 });
    return { transcript: await text('voice-test-result'), ms: Date.now() - started };
  };

  await kase('R4', 'Microphone panel and Test: records the fake microphone and transcribes with this computer\'s Voice Input (V8-01…V8-04, AC-007)', async () => {
    const { transcript, ms } = await recordTest('R4');
    evidence.timings.testTranscriptionMs = ms;
    evidence.testResult = transcript;
    assert(/meeting|summari/i.test(evidence.testResult), `transcript: ${evidence.testResult}`);
    await shot('R4-test-result');
  });

  await kase('R5', 'A voice surface shows the microphone button: Memory search (V5-01)', async () => {
    await page.goto(`${frontendUrl}/memory`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-test="memory-section-search"]').click({ timeout: 60000 });
    await page.getByRole('button', { name: 'Start voice input' }).first().waitFor({ timeout: 60000 });
    await shot('R5-memory-microphone');
  });

  await kase('R6', 'View log, then Off hides the microphone in another page, and On again (V11-01, V4, AR-001)', async () => {
    await openExtensions();
    await page.locator('[data-testid="extension-log-voice-input"]').click();
    await page.locator('[data-testid="extension-log-lines"]').waitFor({ timeout: 15000 });
    evidence.logExcerpt = (await text('extension-log-lines')).slice(0, 400);
    assert(evidence.logExcerpt.includes('install'), 'log has the install');
    await shot('R6-log');
    await page.keyboard.press('Escape');
    await page.locator('[data-testid="extension-log-overlay"]').click({ position: { x: 5, y: 5 } }).catch(() => undefined);
    await page.locator('[data-testid="extension-switch-voice-input"]').click();
    await waitFor('off', async () => await card('voice-input') === 'Off', 30000);
    await shot('R6-off');
    try {
      await page.goto(`${frontendUrl}/memory`, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-test="memory-section-search"]').click({ timeout: 60000 });
      await sleep(3000);
      assert(await page.getByRole('button', { name: 'Start voice input' }).count() === 0, 'no microphone while off');
      await shot('R6-memory-no-microphone-while-off');
    } finally {
      await openExtensions();
      if (await card('voice-input') === 'Off') await page.locator('[data-testid="extension-switch-voice-input"]').click();
    }
    await waitFor('on and ready', async () => await card('voice-input') === 'On' && (await page.locator('[data-testid="extension-starting-voice-input"]').count()) === 0, 120000);
    await page.goto(`${frontendUrl}/memory`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-test="memory-section-search"]').click({ timeout: 60000 });
    await page.getByRole('button', { name: 'Start voice input' }).first().waitFor({ timeout: 60000 });
  });

  await kase('R7', 'Chinese app: translated card and page texts (VIS-L-01, VIS-L-02); phone width layout (VIS-N-01, N-02)', async () => {
    const zh = await openContext('zh-CN', { width: 1440, height: 900 });
    const previous = page;
    page = zh;
    await openExtensions();
    assert((await page.locator('#extension-title-voice-input').innerText()).trim() === '语音输入', 'translated name');
    await page.locator('[data-testid="extension-toggle-page-voice-input"]').click();
    await page.frameLocator('[data-testid="extension-page-voice-input"] iframe').getByText('语音运行时').waitFor({ timeout: 30000 });
    await shot('R7-zh-page');
    await page.close();
    page = await openContext('en', { width: 390, height: 844 });
    await openExtensions();
    await shot('R7-phone-width');
    await page.locator('[data-testid="extension-toggle-page-voice-input"]').click();
    await page.frameLocator('[data-testid="extension-page-voice-input"] iframe').locator('#facts').getByText('0.3.2').waitFor({ timeout: 30000 });
    await shot('R7-phone-width-page');
    await page.close();
    page = previous;
  });

  const readyAgain = () => waitFor('on and ready', async () => await card('voice-input') === 'On'
    && (await page.locator('[data-testid="extension-starting-voice-input"]').count()) === 0, 300000);
  const nodeSettings = async () => (await (await fetch(`${node.url}/rest/extensions/voice-input/actions/getSettings`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: 'null',
  })).json()).output;
  const extensionState = async () => JSON.parse(await fs.readFile(path.join(node.dataRoot, 'extensions', 'state.json'), 'utf8'));

  await kase('U1', 'Update 1.0.0 → 1.0.1 from a newer catalog release: Update offered, On and the language kept, the Test dictates with the new package; one worker (AC-003, V9-01, V9-02)', async () => {
    catalog.publish(await packVoiceVariant(path.join(ownedRoot, 'catalog'), '1.0.1'));
    await openExtensions();
    await waitFor('update offered', async () => (await page.locator('[data-testid="extension-update-badge-voice-input"]').count()) > 0, 30000);
    assert((await text('extension-update-badge-voice-input')).includes('1.0.1'), `badge ${await text('extension-update-badge-voice-input')}`);
    await shot('U1-update-offered');
    await page.locator('[data-testid="extension-update-voice-input"]').click();
    await waitFor('updating', async () => await card('voice-input') === 'Updating', 30000);
    evidence.updateProgress = await page.locator('[data-testid="extension-progress-voice-input"]').innerText().catch(() => null);
    await shot('U1-updating');
    await readyAgain();
    assert(await text('extension-version-voice-input') === '1.0.1', `version ${await text('extension-version-voice-input')}`);
    assert(await page.locator('[data-testid="extension-update-voice-input"]').count() === 0, 'no Update offered after the update');
    const settings = await nodeSettings();
    assert(settings.language === 'en' && settings.runtimeVersion === '0.3.2', `settings kept: ${JSON.stringify(settings)}`);
    const state = await extensionState();
    assert(state['voice-input']?.enabled === true, `state.json kept On: ${JSON.stringify(state)}`);
    const { transcript, ms } = await recordTest();
    evidence.u1 = { settings, state, transcript, ms, workers: await voiceWorkers(ownedRoot) };
    assert(/meeting|summari/i.test(transcript), `transcript after the update: ${transcript}`);
    assert(evidence.u1.workers.length === 1, `one voice worker after the update: ${evidence.u1.workers.join(', ')}`);
    await shot('U1-updated');
  });

  await kase('U2', 'A broken 1.0.2 release: "Update to 1.0.2 failed: …", Update still offered, 1.0.1 still On and dictating (AC-003 failure outcome)', async () => {
    catalog.publish(await packVoiceVariant(path.join(ownedRoot, 'catalog'), '1.0.2', { runtimeVersion: '0.3.99' }));
    await openExtensions();
    await waitFor('update offered', async () => (await page.locator('[data-testid="extension-update-badge-voice-input"]').count()) > 0, 30000);
    await page.locator('[data-testid="extension-update-voice-input"]').click();
    await waitFor('the update failure on the card', async () => (await text('extension-message-voice-input').catch(() => '')).includes('Update to 1.0.2 failed'), 120000);
    await readyAgain();
    const message = await text('extension-message-voice-input');
    assert(/Update to 1\.0\.2 failed: .+/.test(message), `message ${message}`);
    assert(await text('extension-version-voice-input') === '1.0.1', `version ${await text('extension-version-voice-input')}`);
    assert((await page.locator('[data-testid="extension-update-voice-input"]').count()) === 1, 'Update still offered');
    const log = await fs.readFile(path.join(node.dataRoot, 'extensions', 'voice-input', 'extension.log'), 'utf8');
    const { transcript, ms } = await recordTest();
    evidence.u2 = { message, settings: await nodeSettings(), state: await extensionState(), transcript, ms, workers: await voiceWorkers(ownedRoot),
      logLines: log.split('\n').filter(line => /1\.0\.2|update/i.test(line)).slice(-8) };
    assert(evidence.u2.settings.language === 'en', `language kept: ${JSON.stringify(evidence.u2.settings)}`);
    assert(/meeting|summari/i.test(transcript), `transcript after the failed update: ${transcript}`);
    assert(evidence.u2.workers.length === 1, `one voice worker: ${evidence.u2.workers.join(', ')}`);
    await shot('U2-update-failed');
  });

  await kase('R8', 'Remove: confirmation, Removing, Not installed; the folder is gone (V10-01…V10-03)', async () => {
    await openExtensions();
    await page.locator('[data-testid="extension-remove-voice-input"]').click();
    await page.locator('[data-testid="extension-remove-dialog"]').waitFor();
    await shot('R8-remove-confirmation');
    await page.locator('[data-testid="extension-remove-confirm"]').click();
    await waitFor('not installed', async () => await card('voice-input') === 'Not installed', 120000);
    assert(!existsSync(path.join(node.dataRoot, 'extensions', 'voice-input')), 'extension folder removed');
    await shot('R8-not-installed');
  });

  evidence.result = Object.values(evidence.cases).every(entry => entry.result === 'Pass') && evidence.browserErrors.length === 0 ? 'Pass' : 'Fail';
} catch (error) {
  evidence.error = error.stack ?? String(error);
  console.error(error);
} finally {
  evidence.cleanup.browser = browser ? await browser.close().then(() => 'closed', e => `failed: ${e.message}`) : 'not-started';
  evidence.cleanup.frontend = await stop(frontend).catch(e => `failed: ${e.message}`);
  evidence.cleanup.backend = await stop(node?.process).catch(e => `failed: ${e.message}`);
  evidence.cleanup.catalog = catalog ? await new Promise(resolve => catalog.server.close(() => resolve('closed'))) : 'not-started';
  if (ownedRoot) await fs.rm(ownedRoot, { recursive: true, force: true }).then(() => { evidence.cleanup.tempRoot = 'removed'; }, e => { evidence.cleanup.tempRoot = `failed: ${e.message}`; });
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outputDir, 'evidence.json'), JSON.stringify(evidence, null, 2));
  console.log(`result ${evidence.result}; evidence ${path.join(outputDir, 'evidence.json')}`);
  process.exitCode = evidence.result === 'Pass' ? 0 : 1;
}
