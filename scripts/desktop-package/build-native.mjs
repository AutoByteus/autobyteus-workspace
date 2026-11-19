#!/usr/bin/env node
// Native build order: writer -> embedded provisioner -> digest-pinned launcher.
import { execFileSync } from 'node:child_process';
import { createHash, createPublicKey } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { channelFor } from './release-record.mjs';

const source = fileURLToPath(new URL('../../autobyteus-web/linux-install/', import.meta.url));
export function buildNative({ version, arch, publicKeyFile, output, asset, testOrigin }) {
  channelFor(version);
  if (process.platform !== 'linux' || process.arch !== arch || !['x64','arm64'].includes(arch)) throw Error('Native Linux target required');
  if (asset !== `AutoByteus_personal_linux-${arch}-${version}.AppImage`) throw Error('Canonical artifact identity mismatch');
  if (testOrigin && !/^http:\/\/(127\.0\.0\.1|localhost):[0-9]+$/.test(testOrigin)) throw Error('Test origin must be isolated loopback');
  const go = process.env.GO || 'go';
  if (execFileSync(go,['version'],{encoding:'utf8'}).trim() !== `go version go1.27.4 linux/${arch === 'x64' ? 'amd64' : 'arm64'}`) throw Error('Pinned Go 1.27.4 required');
  const key = createPublicKey(readFileSync(publicKeyFile));
  if (key.asymmetricKeyType !== 'ed25519') throw Error('Desktop public anchor must be Ed25519');
  const publicKey = key.export({type:'spki',format:'der'}).subarray(-32).toString('base64');
  const fields = {Version:version,Arch:arch,Repository:'AutoByteus/autobyteus-workspace',Asset:asset,PublicKey:publicKey};
  mkdirSync(output,{recursive:true});
  const env = {...process.env,CGO_ENABLED:'0',GOTOOLCHAIN:'local'};
  // Stable Node-API, no V8 ABI or downloaded headers. Release Node distributions include these headers.
  execFileSync('gcc',['-std=c11','-O2','-Wall','-Wextra','-Werror','-fPIC','-shared',
    '-I'+resolve(process.execPath,'../../include/node'),resolve(source,'electron/managed_restart.c'),
    '-o',resolve(output,'managed-restart.node')],{stdio:'inherit'});
  function build(command,destination,extra={}) {
    let flags=Object.entries({...fields,...extra}).flatMap(([key,value])=>['-X',`autobyteus.local/desktop/linux-install/internal/buildinfo.${key}=${value}`]).join(' ');
    if (testOrigin) flags += ` -X autobyteus.local/desktop/linux-install/internal/acquire.testOrigin=${testOrigin}`;
    execFileSync(go,['build',...(testOrigin ? ['-tags=desktop_test'] : []),'-trimpath','-buildvcs=false','-ldflags',flags,'-o',destination,`./cmd/${command}`],{cwd:source,env,stdio:'inherit'});
  }
  build('client',resolve(output,'autobyteus-install-client'));
  const writer=resolve(output,'writer');build('writer',writer);
  copyFileSync(writer,resolve(source,'cmd/provision/payload/writer'));
  const provision=resolve(output,'autobyteus-provision');build('provision',provision);
  const ProvisionDigest=createHash('sha256').update(readFileSync(provision)).digest('hex');
  build('launcher',resolve(output,'AppRun'),{ProvisionDigest});
  writeFileSync(resolve(output,'identity.json'),JSON.stringify({version,arch,asset,publicKey,provisionDigest:ProvisionDigest})+'\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [version,arch,publicKeyFile,output,asset]=process.argv.slice(2);
  if (!asset || process.argv.length!==7) throw Error('Usage: build-native.mjs VERSION ARCH PUBLIC_KEY_FILE OUTPUT CANONICAL_ASSET');
  buildNative({version,arch,publicKeyFile,output:resolve(output),asset});
}
