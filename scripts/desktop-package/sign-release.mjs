#!/usr/bin/env node
// Sign only final packaged bytes. Key provisioning belongs to release administration.
import { createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { channelFor, encodeRecord, imageDigest, PRODUCT, verifyRecord } from './release-record.mjs';

export async function signRelease({ image, version, arch, privateKey, expectedPublicKey }) {
  const key = createPrivateKey(privateKey);
  if (key.asymmetricKeyType !== 'ed25519') throw Error('Desktop key must be Ed25519');
  const actual = createPublicKey(key).export({ type: 'spki', format: 'der' });
  const expected = createPublicKey(expectedPublicKey).export({ type: 'spki', format: 'der' });
  if (!actual.equals(expected)) throw Error('Desktop signing key differs from embedded trust anchor');
  const { size, sha256 } = await imageDigest(image);
  const bytes = encodeRecord({ format: 1, product: PRODUCT, artifact: 'AppImage', os: 'linux', arch,
    version, channel: channelFor(version), size, sha256, minWriter: 1 });
  const signature = sign(null, bytes, key).toString('base64');
  verifyRecord(bytes, signature, expectedPublicKey);
  await writeFile(`${image}.release.json`, bytes);
  await writeFile(`${image}.release.json.sig`, signature);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [image, version, arch, privatePath, publicPath] = process.argv.slice(2);
  if (!publicPath || process.argv.length !== 7) throw Error('Usage: sign-release.mjs IMAGE VERSION ARCH PRIVATE_KEY_FILE PUBLIC_KEY_FILE');
  await signRelease({ image, version, arch, privateKey: await readFile(privatePath), expectedPublicKey: await readFile(publicPath) });
}
