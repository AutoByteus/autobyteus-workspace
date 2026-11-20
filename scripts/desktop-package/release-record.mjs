import { createHash, verify } from 'node:crypto';
import { createReadStream } from 'node:fs';

export const PRODUCT = 'autobyteus-personal-desktop';
const fields = ['format', 'product', 'artifact', 'os', 'arch', 'version', 'channel', 'size', 'sha256', 'minWriter'];
export function channelFor(version) {
  if (!/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-beta\.(0|[1-9][0-9]*))?$/.test(version)) throw Error('Invalid release version');
  return version.includes('-beta.') ? 'beta' : 'stable';
}
export function encodeRecord(record) {
  if (JSON.stringify(Object.keys(record)) !== JSON.stringify(fields)) throw Error('Noncanonical record fields');
  if (record.format !== 1 || record.minWriter !== 1 || record.product !== PRODUCT || record.artifact !== 'AppImage' || record.os !== 'linux'
    || !['x64', 'arm64'].includes(record.arch) || channelFor(record.version) !== record.channel
    || !Number.isSafeInteger(record.size) || record.size < 1 || record.size > 2147483648 || !/^[0-9a-f]{64}$/.test(record.sha256)) throw Error('Unsupported release record');
  return Buffer.from(`${JSON.stringify(record)}\n`);
}
export function decodeRecord(bytes) {
  if (bytes.length > 4096) throw Error('Record too large');
  const record = JSON.parse(bytes.toString('utf8'));
  if (!encodeRecord(record).equals(bytes)) throw Error('Noncanonical release bytes');
  return record;
}
export function verifyRecord(bytes, encodedSignature, publicKey) {
  const record = decodeRecord(bytes);
  const signature = Buffer.from(encodedSignature, 'base64');
  if (encodedSignature.length !== 88 || signature.length !== 64 || signature.toString('base64') !== encodedSignature
    || !verify(null, bytes, publicKey, signature)) throw Error('Desktop signature refused');
  return record;
}
export async function imageDigest(path) {
  const hash = createHash('sha256');
  let size = 0;
  for await (const chunk of createReadStream(path)) {
    size += chunk.length;
    if (size > 2147483648) throw Error('AppImage exceeds size limit');
    hash.update(chunk);
  }
  return { size, sha256: hash.digest('hex') };
}
