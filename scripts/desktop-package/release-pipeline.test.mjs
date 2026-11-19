// node --test scripts/desktop-package/release-pipeline.test.mjs
// Offline packaging units: disposable keys and inert bytes, not a real desktop update.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { signRelease } from './sign-release.mjs';

const directory = new URL('./', import.meta.url);
const command = (name, args, env = {}) => spawnSync(process.execPath, [new URL(name, directory).pathname, ...args], {
  encoding: 'utf8', env: { PATH: process.env.PATH, ...env },
});
const keyPair = () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return { privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }), publicKey: publicKey.export({ type: 'spki', format: 'pem' }) };
};

test('production trust cannot use absent provisioning or a build-only key implicitly', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'desktop-trust-unit-'));
  try {
    assert.notEqual(command('prepare-build-trust.mjs', ['production', tmp], { GITHUB_REPOSITORY: 'AutoByteus/autobyteus-workspace' }).status, 0);
    const keys = keyPair();
    assert.notEqual(command('prepare-build-trust.mjs', ['production', tmp], { GITHUB_REPOSITORY: 'untrusted/fork', DESKTOP_RELEASE_PUBLIC_KEY: keys.publicKey }).status, 0);
    assert.equal(command('prepare-build-trust.mjs', ['production', tmp], { GITHUB_REPOSITORY: 'AutoByteus/autobyteus-workspace', DESKTOP_RELEASE_PUBLIC_KEY: keys.publicKey }).status, 0);
    assert.equal(existsSync(join(tmp, 'desktop-test-private.pem')), false);
    assert.equal(readFileSync(join(tmp, 'desktop-public.pem'), 'utf8'), keys.publicKey);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('build-only trust is fresh, separate from supplied production public key', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'desktop-build-only-unit-'));
  try {
    const keys = keyPair();
    assert.equal(command('prepare-build-trust.mjs', ['build-only', tmp], { DESKTOP_RELEASE_PUBLIC_KEY: keys.publicKey }).status, 0);
    assert.notEqual(readFileSync(join(tmp, 'desktop-public.pem'), 'utf8'), keys.publicKey);
    assert.equal(existsSync(join(tmp, 'desktop-test-private.pem')), true);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('signing/metadata CLI binds exact final bytes, canonical asset, version, arch and key', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'desktop-sign-unit-'));
  try {
    const image = join(tmp, 'AutoByteus_personal_linux-x64-1.5.14.AppImage');
    const bytes = Buffer.from('inert test bytes, not executable');
    writeFileSync(image, bytes);
    const keys = keyPair(), publicPath = join(tmp, 'public.pem'); writeFileSync(publicPath, keys.publicKey);
    await assert.rejects(signRelease({ image, version: '1.5.14', arch: 'x64', privateKey: keys.privateKey, expectedPublicKey: keyPair().publicKey }));
    await signRelease({ image, version: '1.5.14', arch: 'x64', privateKey: keys.privateKey, expectedPublicKey: keys.publicKey });
    const verify = () => command('verify-release.mjs', [image, '1.5.14', 'x64', publicPath]);
    assert.equal(verify().status, 0);
    const signature = readFileSync(`${image}.release.json.sig`);
    const nonAscii = Buffer.from(signature); nonAscii[0] |= 0x80;
    writeFileSync(`${image}.release.json.sig`, nonAscii); assert.notEqual(verify().status, 0);
    writeFileSync(`${image}.release.json.sig`, signature);
    assert.notEqual(command('verify-release.mjs', [image, '1.5.14', 'arm64', publicPath]).status, 0);
    const digest = createHash('sha512').update(bytes).digest('base64');
    const metadata = join(tmp, 'latest-linux.yml');
    const yaml = `version: 1.5.14\nfiles:\n  - url: ${image.split('/').at(-1)}\n    sha512: ${digest}\n    size: ${bytes.length}\n    blockMapSize: 12\npath: ${image.split('/').at(-1)}\nsha512: ${digest}\n`;
    writeFileSync(metadata, yaml);
    const validate = () => spawnSync('python3', [resolve('scripts/validate_linux_updater_metadata.py'), '--metadata', metadata, '--arch-token', 'linux-x64', '--image', image, '--public-key', publicPath], { encoding: 'utf8' });
    assert.equal(validate().status, 0);
    writeFileSync(metadata, yaml.replace(/^path:.*$/m, 'path: wrong-linux-x64.AppImage'));
    assert.notEqual(validate().status, 0);
    writeFileSync(metadata, yaml.replace(/^sha512:.*$/m, 'sha512: wrong'));
    assert.notEqual(validate().status, 0);
    writeFileSync(metadata, yaml.replace('version: 1.5.14', 'version: 1.5.15'));
    assert.notEqual(validate().status, 0); writeFileSync(metadata, yaml);
    writeFileSync(image, Buffer.from('same size malicious replacement'));
    assert.notEqual(verify().status, 0); assert.notEqual(validate().status, 0);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
