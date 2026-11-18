#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { imageDigest, verifyRecord } from './release-record.mjs';
const [image, version, arch, publicPath] = process.argv.slice(2);
if (!publicPath || process.argv.length!==6) throw Error('Usage: verify-release.mjs IMAGE VERSION ARCH PUBLIC_KEY_FILE');
if (basename(image)!==`AutoByteus_personal_linux-${arch}-${version}.AppImage`) throw Error('Noncanonical published asset name');
const record=verifyRecord(await readFile(`${image}.release.json`),await readFile(`${image}.release.json.sig`,'utf8'),await readFile(publicPath));
const actual=await imageDigest(image);
if (record.version!==version || record.arch!==arch || record.size!==actual.size || record.sha256!==actual.sha256) throw Error('Signed release does not describe final AppImage');
console.log(`Verified signed desktop release ${version} ${arch}`);
