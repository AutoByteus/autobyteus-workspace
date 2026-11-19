#!/usr/bin/env node
// Run only AppImage extraction (never the desktop) in a test-owned directory.
import { createHash, createPublicKey } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
const [image, publicPath] = process.argv.slice(2);
if (!image || ![3,4].includes(process.argv.length)) throw Error('Usage: verify-layout.mjs IMAGE [PUBLIC_KEY_FILE]');
const directory=mkdtempSync(join(tmpdir(),'autobyteus-layout-'));
try {
  for (const file of ['AppRun','autobyteus','autobyteus.desktop','autobyteus-provision','autobyteus-install-client','managed-restart.node']) {
    execFileSync(resolve(image),['--appimage-extract',file],{cwd:directory,stdio:'pipe'});
    const data=readFileSync(join(directory,'squashfs-root',file));
    if (file.endsWith('.desktop')) {
      if (!/^Exec=AppRun --autobyteus-appimage-desktop-entry %U$/m.test(data.toString()) || data.includes('--no-sandbox')) throw Error('Unsafe generated desktop Exec');
    } else if (!data.subarray(0,4).equals(Buffer.from([0x7f,0x45,0x4c,0x46]))) throw Error(`Expected native ELF: ${file}`);
  }
  execFileSync(resolve(image),['--appimage-extract','resources/linux-install-identity.json'],{cwd:directory,stdio:'pipe'});
  const identity=JSON.parse(readFileSync(join(directory,'squashfs-root/resources/linux-install-identity.json'),'utf8'));
  const helper=readFileSync(join(directory,'squashfs-root/autobyteus-provision'));
  if (createHash('sha256').update(helper).digest('hex')!==identity.provisionDigest) throw Error('Provisioner digest differs from packaged identity');
  if (publicPath) {
    const expected=createPublicKey(readFileSync(publicPath)).export({type:'spki',format:'der'}).subarray(-32).toString('base64');
    if (identity.publicKey!==expected) throw Error('Packaged identity differs from release trust anchor');
  }
  console.log('Verified native AppRun, unchanged Electron ELF, provisioner/client and sandbox-preserving desktop Exec');
} finally { rmSync(directory,{recursive:true,force:true}); }
