// Drives the Electron harness through the E2E-01..08 scenarios. Usage:
//   node run-scenarios.js <abxTempDir> <worktree> [scenarioName...]
const { execFileSync, spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const [abx, worktree, ...only] = process.argv.slice(2);
const harnessDir = __dirname;
const evidenceDir = path.join(harnessDir, '..', 'harness-results');
fs.mkdirSync(evidenceDir, { recursive: true });
const electronBin = path.join(abx, 'Electron.app/Contents/MacOS/Electron');
const newDist = path.join(abx, 'new-dist');
const baseDist = path.join(abx, 'base-dist');
// Real electron-builder 25.1.8 output for 1.4.91-beta.1 (saved from E2E-UNK).
const builderYml = fs.readFileSync(path.join(harnessDir, '..', 'unk001-builder', 'mac-arm64__latest-mac.yml'), 'utf8');

function stableYml(version) {
  const name = `AutoByteus_personal_macos-arm64-${version}.zip`;
  const sha = crypto.createHash('sha512').update(version).digest('base64');
  return `version: ${version}\nfiles:\n  - url: ${name}\n    sha512: ${sha}\n    size: 1\npath: ${name}\nsha512: ${sha}\nreleaseDate: '2026-09-27T00:00:00.000Z'\n`;
}

function release(tag, prerelease, yml) {
  return { tag, prerelease, assets: { 'latest-mac.yml': { text: yml ?? stableYml(tag.slice(1)) } } };
}

function feed(...releases) {
  return {
    releases: releases.map(({ tag, prerelease }) => ({ tag, prerelease })),
    assets: Object.fromEntries(releases.map((r) => [r.tag, r.assets])),
  };
}

// FEED-A: a beta is the newest release; v1.4.90 is the newest stable. The beta's
// metadata is the real electron-builder output for 1.4.91-beta.1 (no beta-mac.yml exists).
const FEED_A = feed(release('v1.4.91-beta.1', true, builderYml), release('v1.4.90', false), release('v1.4.89', false));
// FEED-A2: a second beta is newest.
const FEED_A2 = feed(
  release('v1.4.91-beta.2', true),
  release('v1.4.91-beta.1', true, builderYml),
  release('v1.4.90', false),
  release('v1.4.89', false),
);
// FEED-B: the stable release of the beta line is newest.
const FEED_B = feed(
  release('v1.4.91', false),
  release('v1.4.91-beta.2', true),
  release('v1.4.91-beta.1', true, builderYml),
  release('v1.4.90', false),
);

function downloadFeed() {
  // The "update" is a zip of the same (ad-hoc signed) Electron.app the harness runs,
  // so Squirrel.Mac's code-signature check can pass without a signing identity.
  const zipName = 'AutoByteus_personal_macos-arm64-1.4.91-beta.1.zip';
  const zipPath = path.join(abx, zipName);
  if (!fs.existsSync(zipPath)) {
    execFileSync('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', path.join(abx, 'Electron.app'), zipPath]);
  }
  const data = fs.readFileSync(zipPath);
  const sha = crypto.createHash('sha512').update(data).digest('base64');
  const yml = `version: 1.4.91-beta.1\nfiles:\n  - url: ${zipName}\n    sha512: ${sha}\n    size: ${data.length}\npath: ${zipName}\nsha512: ${sha}\nreleaseDate: '2026-09-27T00:00:00.000Z'\n`;
  const beta = release('v1.4.91-beta.1', true, yml);
  beta.assets[zipName] = { file: zipPath };
  return feed(beta, release('v1.4.90', false));
}


const UI_PRELUDE = `
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const sw = () => document.querySelector('[data-testid="settings-updates-beta-channel-toggle"]');
  const btn = (re) => [...document.querySelectorAll('button')].find((b) => re.test(b.textContent || ''));
  const snap = (label) => ({
    label,
    status: document.querySelector('[data-testid="settings-updates-status"]')?.textContent.trim(),
    version: document.querySelector('[data-testid="settings-updates-version"]')?.textContent.trim(),
    switchChecked: sw()?.getAttribute('aria-checked'),
    switchDisabled: sw()?.disabled,
    downloadedHint: document.querySelector('[data-testid="settings-updates-beta-channel-downloaded-hint"]')?.textContent.trim() || null,
    checkButtonDisabled: btn(/check for updates/i)?.disabled,
    buttons: [...document.querySelectorAll('[data-testid="settings-updates-panel"] button')].map((b) => (b.textContent || '').trim() + (b.disabled ? ' [disabled]' : '')),
  });
  const until = async (pred, ms) => { const t = Date.now(); while (!pred() && Date.now() - t < ms) await sleep(200); return pred(); };
`;
const ui = (body) => ({ op: 'eval', js: `(async () => { ${UI_PRELUDE} ${body} })()` });

const scenarios = [
  { name: 'E2E-01a-new-stable-1.4.90', code: 'new', version: '1.4.90', feed: FEED_A, steps: [{ op: 'startup' }, { op: 'check' }] },
  { name: 'E2E-01b-new-stable-1.4.89', code: 'new', version: '1.4.89', feed: FEED_A, steps: [{ op: 'check' }] },
  { name: 'E2E-02a-base-1.4.89', code: 'base', version: '1.4.89', feed: FEED_A, steps: [{ op: 'startup' }, { op: 'check' }] },
  { name: 'E2E-02b-base-1.4.90', code: 'base', version: '1.4.90', feed: FEED_A, steps: [{ op: 'check' }] },
  {
    name: 'E2E-03-ipc-opt-in', code: 'new', version: '1.4.90', feed: FEED_A,
    steps: [{ op: 'window' }, { op: 'ipc-check' }, { op: 'ipc-set', channel: 'beta' }, { op: 'wait', ms: 300 }, { op: 'renderer-broadcasts' }, { op: 'ipc-get' }],
  },
  { name: 'E2E-04a-restart', code: 'new', version: '1.4.90', feed: FEED_A, userDataFrom: 'E2E-03-ipc-opt-in', steps: [{ op: 'startup' }] },
  { name: 'E2E-04b-after-upgrade-to-beta', code: 'new', version: '1.4.91-beta.1', feed: FEED_A2, userDataFrom: 'E2E-04a-restart', steps: [{ op: 'startup' }] },
  { name: 'E2E-05-beta-offered-newer-stable', code: 'new', version: '1.4.91-beta.2', feed: FEED_B, userDataFrom: 'E2E-04b-after-upgrade-to-beta', steps: [{ op: 'check' }] },
  {
    name: 'E2E-06a-opt-out-on-beta-build', code: 'new', version: '1.4.91-beta.1', feed: FEED_A2, userDataFrom: 'E2E-04b-after-upgrade-to-beta',
    steps: [{ op: 'window' }, { op: 'ipc-check' }, { op: 'ipc-set', channel: 'stable' }, { op: 'ipc-check' }],
  },
  { name: 'E2E-06b-opted-out-later-stable', code: 'new', version: '1.4.91-beta.1', feed: FEED_B, userDataFrom: 'E2E-06a-opt-out-on-beta-build', steps: [{ op: 'check' }] },
  { name: 'E2E-08-corrupt-preference', code: 'new', version: '1.4.90', feed: FEED_A, channelFileText: '{"channel": "beta"', steps: [{ op: 'check' }] },
  {
    name: 'E2E-07-downloaded-lock', code: 'new', version: '1.4.90', feed: 'download', channelFileText: '{"channel":"beta"}',
    steps: [
      { op: 'window' },
      { op: 'ipc-check' },
      { op: 'ipc-download' },
      { op: 'ipc-set', channel: 'stable' },
      { op: 'ipc-check' },
      { op: 'ipc-get' },
    ],
  },
  {
    // Reachability of the ARCH-001 lock bypass: downloaded -> manual check -> switch to Stable -> quit.
    name: 'E2E-07b-downloaded-then-check-then-opt-out', code: 'new', version: '1.4.90', feed: 'download', channelFileText: '{"channel":"beta"}',
    steps: [
      { op: 'window' },
      { op: 'ipc-check' },
      { op: 'ipc-download' },
      { op: 'ipc-check' },
      { op: 'ipc-set', channel: 'stable' },
      { op: 'ipc-get' },
    ],
  },
  {
    // Round 2: a check that fails after the download must not release the lock either.
    name: 'E2E-07c-downloaded-then-failed-check', code: 'new', version: '1.4.90', feed: 'download', channelFileText: '{"channel":"beta"}',
    steps: [
      { op: 'window' },
      { op: 'ipc-check' },
      { op: 'ipc-download' },
      { op: 'feed-down' },
      { op: 'ipc-check' },
      { op: 'ipc-set', channel: 'stable' },
      { op: 'ipc-get' },
    ],
  },
  {
    // BR-02: real About page (nuxt dev) in the Electron window with the real preload and IPC.
    name: 'BR-02-about-ui-downloaded-lock', code: 'new', version: '1.4.90', feed: 'download', channelFileText: '{"channel":"beta"}',
    steps: [
      { op: 'window', url: 'http://127.0.0.1:3291/settings' },
      ui(`await until(() => document.querySelector('[data-testid="settings-nav-updates"]'), 60000);
          document.querySelector('[data-testid="settings-nav-updates"]').click();
          await until(() => sw(), 10000); await sleep(500); return snap('updates-open');`),
      ui(`btn(/check for updates/i).click(); await until(() => btn(/^\\s*download/i), 30000); return snap('after-check');`),
      ui(`btn(/^\\s*download/i).click();
          await until(() => document.querySelector('[data-testid="settings-updates-beta-channel-downloaded-hint"]'), 120000);
          await sleep(500); return snap('downloaded');`),
      ui(`sw().click(); await sleep(1500); return snap('switch-click-while-downloaded');`),
      ui(`const b = btn(/check for updates/i); const wasDisabled = b.disabled; b.click();
          await until(() => sw() && !sw().disabled, 30000); await sleep(500); return { checkWasDisabled: wasDisabled, ...snap('after-check-in-downloaded') };`),
      ui(`sw().click(); await until(() => sw().getAttribute('aria-checked') === 'false', 30000); await sleep(1500); return snap('after-switch-to-stable');`),
    ],
  },
];

const summary = [];
for (const scenario of scenarios) {
  if (only.length && !only.includes(scenario.name)) continue;
  const dir = path.join(abx, 'scn', scenario.name);
  fs.rmSync(dir, { recursive: true, force: true });
  const userData = path.join(dir, 'userData');
  fs.mkdirSync(userData, { recursive: true });
  if (scenario.userDataFrom) {
    fs.cpSync(path.join(abx, 'scn', scenario.userDataFrom, 'userData'), userData, { recursive: true });
  }
  if (scenario.channelFileText) {
    fs.writeFileSync(path.join(userData, 'app-update-channel.v1.json'), scenario.channelFileText);
  }
  const resultPath = path.join(evidenceDir, `${scenario.name}.json`);
  const config = {
    name: scenario.name,
    codeLabel: scenario.code,
    codeDir: scenario.code === 'base' ? baseDist : newDist,
    appVersion: scenario.version,
    userData,
    logBase: path.join(dir, 'logs-base'),
    cacheDirName: 'abx-e2e-updater',
    feed: scenario.feed === 'download' ? downloadFeed() : scenario.feed,
    steps: scenario.steps,
    quitNormally: Boolean(scenario.quitNormally),
    resultPath,
  };
  const configPath = path.join(dir, 'scenario.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  const env = { ...process.env, ABX_SCENARIO: configPath, ABX_NODE_MODULES: path.join(worktree, 'autobyteus-web/node_modules') };
  delete env.ELECTRON_RUN_AS_NODE; // the calling shell may be an Electron host
  const run = spawnSync(electronBin, [harnessDir], {
    env,
    encoding: 'utf8',
    timeout: 240000,
  });
  fs.writeFileSync(path.join(evidenceDir, `${scenario.name}.stdio.log`), `exit=${run.status}\n${run.stdout}\n${run.stderr}`);
  const logFile = path.join(dir, 'logs-base', 'logs', 'app.log');
  if (fs.existsSync(logFile)) fs.copyFileSync(logFile, path.join(evidenceDir, `${scenario.name}.app.log`));
  summary.push({ name: scenario.name, exit: run.status });
  console.log(`${scenario.name}: exit=${run.status}`);
}
console.log(JSON.stringify(summary));
