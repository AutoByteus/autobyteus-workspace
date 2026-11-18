#!/usr/bin/env node
// Build-only jobs never receive production signing credentials.
import { generateKeyPairSync, createPublicKey } from 'node:crypto';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
const [mode, directory] = process.argv.slice(2);
if (!['production', 'build-only'].includes(mode) || !directory) throw Error('Usage: prepare-build-trust.mjs production|build-only DIRECTORY');
mkdirSync(directory, {recursive:true,mode:0o700});
const publicPath=resolve(directory,'desktop-public.pem'), privatePath=resolve(directory,'desktop-test-private.pem');
if (mode==='production') {
  if (process.env.GITHUB_REPOSITORY !== 'AutoByteus/autobyteus-workspace') throw Error('Production desktop builds require the official repository');
  const pem=process.env.DESKTOP_RELEASE_PUBLIC_KEY;
  if (!pem || createPublicKey(pem).asymmetricKeyType!=='ed25519') throw Error('Production desktop public anchor is not provisioned');
  writeFileSync(publicPath,pem);
} else {
  const {publicKey,privateKey}=generateKeyPairSync('ed25519');
  writeFileSync(publicPath,publicKey.export({format:'pem',type:'spki'}));
  writeFileSync(privatePath,privateKey.export({format:'pem',type:'pkcs8'}),{mode:0o600});
}
if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV,`AUTOBYTEUS_DESKTOP_PUBLIC_KEY_FILE=${publicPath}\nAUTOBYTEUS_DESKTOP_TEST_KEY_FILE=${privatePath}\n`);
