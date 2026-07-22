import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { TextDecoder } from 'node:util';
import type { Stats } from 'node:fs';
import type { FileHandle } from 'node:fs/promises';
import type { SecretDefinitionId } from '../domain/secret-binding.js';
import { localImportDefinitionForAlias } from './local-import-credential-alias-registry.js';
import { LocalEnvironmentSecretImportError } from './local-environment-secret-import.js';
import {
  assertWindowsExclusiveAcl,
  type WindowsAclCommandRunner,
} from '../windows-exclusive-acl.js';

const MAX_SOURCE_BYTES = 1024 * 1024;

export type LocalEnvironmentMappedCredential = {
  definitionId: SecretDefinitionId;
  valueBytes: Buffer;
};

export type LocalEnvironmentSourceReadResult = {
  credentials: LocalEnvironmentMappedCredential[];
  release: () => void;
};

const fail = (code: ConstructorParameters<typeof LocalEnvironmentSecretImportError>[0]): never => {
  throw new LocalEnvironmentSecretImportError(code);
};

const sameIdentity = (left: Stats, right: Stats): boolean => {
  const stableDeviceIdentity = left.dev !== 0 && right.dev !== 0 && left.ino !== 0 && right.ino !== 0;
  return (!stableDeviceIdentity || (left.dev === right.dev && left.ino === right.ino))
    && left.size === right.size
    && left.mtimeMs === right.mtimeMs
    && left.ctimeMs === right.ctimeMs;
};

const verifyPosixPrivateOwner = (stat: Stats): void => {
  if (typeof process.getuid !== 'function' || stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0) {
    fail('IMPORT_SOURCE_UNTRUSTED');
  }
};

export const verifyWindowsExclusiveAcl = (
  sourcePath: string,
  runCommand?: WindowsAclCommandRunner,
): void => {
  try {
    assertWindowsExclusiveAcl(sourcePath, runCommand);
  } catch {
    fail('IMPORT_SOURCE_UNTRUSTED');
  }
};

const verifyPrivateOwner = (sourcePath: string, stat: Stats): void => {
  if (process.platform === 'win32') verifyWindowsExclusiveAcl(sourcePath);
  else verifyPosixPrivateOwner(stat);
};

const parseQuotedValue = (rawValue: string, quote: "'" | '"'): string => {
  let value = '';
  for (let index = 1; index < rawValue.length; index += 1) {
    const character = rawValue[index];
    if (character === '\\') {
      const escaped = rawValue[index + 1];
      if (escaped !== quote && escaped !== '\\') fail('IMPORT_SOURCE_SYNTAX_INVALID');
      value += escaped;
      index += 1;
      continue;
    }
    if (character === quote) {
      if (!/^[ \t]*$/.test(rawValue.slice(index + 1))) fail('IMPORT_SOURCE_SYNTAX_INVALID');
      return value;
    }
    value += character;
  }
  return fail('IMPORT_SOURCE_SYNTAX_INVALID');
};

const parseAssignment = (line: string): { name: string; value: string } => {
  const match = /^[ \t]*(?:export[ \t]+)?([A-Za-z_][A-Za-z0-9_]*)[ \t]*=(.*)$/.exec(line);
  if (!match || typeof match[1] !== 'string' || typeof match[2] !== 'string') {
    return fail('IMPORT_SOURCE_SYNTAX_INVALID');
  }
  const name = match[1];
  const rawValue = match[2].replace(/^[ \t]+/, '');
  const first = rawValue[0];
  const quoted = first === "'" || first === '"';
  const value = quoted ? parseQuotedValue(rawValue, first) : rawValue.replace(/[ \t]+$/, '');
  if (!quoted && value.endsWith('\\')) fail('IMPORT_SOURCE_SYNTAX_INVALID');
  return { name, value };
};

const recognizeAssignmentName = (line: string): string | null =>
  /^[ \t]*(?:export[ \t]+)?([A-Za-z_][A-Za-z0-9_]*)/.exec(line)?.[1] ?? null;

const parseSource = (sourceText: string): LocalEnvironmentMappedCredential[] => {
  const credentials: LocalEnvironmentMappedCredential[] = [];
  const seenNames = new Set<string>();
  try {
    for (const line of sourceText.split(/\r?\n/)) {
      const recognizedName = recognizeAssignmentName(line);
      const definitionId = recognizedName
        ? localImportDefinitionForAlias(recognizedName)
        : null;
      if (!definitionId) continue;
      if (line.includes('\r')) fail('IMPORT_SOURCE_SYNTAX_INVALID');

      const assignment = parseAssignment(line);
      if (seenNames.has(assignment.name)) fail('IMPORT_SOURCE_DUPLICATE_ASSIGNMENT');
      seenNames.add(assignment.name);
      if (assignment.value.length === 0) fail('IMPORT_SOURCE_EMPTY_CREDENTIAL');
      if (assignment.value.includes('${') || assignment.value.includes('$(') || assignment.value.includes('`')) {
        fail('IMPORT_SOURCE_SYNTAX_INVALID');
      }
      credentials.push({ definitionId, valueBytes: Buffer.from(assignment.value, 'utf8') });
    }
    if (credentials.length === 0) fail('IMPORT_NO_MAPPED_CREDENTIALS');
    return credentials;
  } catch (error) {
    for (const credential of credentials) credential.valueBytes.fill(0);
    throw error;
  }
};

const readBounded = async (handle: fsp.FileHandle): Promise<Buffer> => {
  const bytes = Buffer.allocUnsafe(MAX_SOURCE_BYTES + 1);
  let offset = 0;
  try {
    while (offset < bytes.length) {
      const read = await handle.read(bytes, offset, bytes.length - offset, null);
      if (read.bytesRead === 0) break;
      offset += read.bytesRead;
    }
    if (offset > MAX_SOURCE_BYTES) fail('IMPORT_SOURCE_TOO_LARGE');
    return Buffer.from(bytes.subarray(0, offset));
  } finally {
    bytes.fill(0);
  }
};

export type LocalEnvironmentSourceOwnerVerifier = (sourcePath: string, stat: Stats) => void;
export type LocalEnvironmentSourceHandleReader = (handle: FileHandle) => Promise<Buffer>;

export class LocalEnvironmentSourceReader {
  constructor(
    private readonly ownerVerifier: LocalEnvironmentSourceOwnerVerifier = verifyPrivateOwner,
    private readonly handleReader: LocalEnvironmentSourceHandleReader = readBounded,
  ) {}

  async read(sourceAbsolutePath: string): Promise<LocalEnvironmentSourceReadResult> {
    if (!path.isAbsolute(sourceAbsolutePath)) fail('IMPORT_SOURCE_PATH_INVALID');
    let sourceBytes: Buffer | null = null;
    try {
      const selectedStat = await fsp.lstat(sourceAbsolutePath);
      if (selectedStat.isSymbolicLink() || !selectedStat.isFile()) fail('IMPORT_SOURCE_UNTRUSTED');
      this.ownerVerifier(sourceAbsolutePath, selectedStat);
      if (selectedStat.size > MAX_SOURCE_BYTES) fail('IMPORT_SOURCE_TOO_LARGE');

      const canonicalPath = await fsp.realpath(sourceAbsolutePath);
      const canonicalStat = await fsp.lstat(canonicalPath);
      if (!canonicalStat.isFile() || !sameIdentity(selectedStat, canonicalStat)) fail('IMPORT_SOURCE_RACED');

      const noFollow = process.platform === 'win32' ? 0 : fs.constants.O_NOFOLLOW;
      const handle = await fsp.open(canonicalPath, fs.constants.O_RDONLY | noFollow);
      try {
        const beforeRead = await handle.stat();
        if (!beforeRead.isFile() || !sameIdentity(canonicalStat, beforeRead)) fail('IMPORT_SOURCE_RACED');
        this.ownerVerifier(canonicalPath, beforeRead);
        sourceBytes = await this.handleReader(handle);
        const afterRead = await handle.stat();
        if (!sameIdentity(beforeRead, afterRead)) fail('IMPORT_SOURCE_RACED');
      } finally {
        await handle.close();
      }

      if (sourceBytes.includes(0)) fail('IMPORT_SOURCE_ENCODING_INVALID');
      let sourceText: string;
      try {
        sourceText = new TextDecoder('utf-8', { fatal: true }).decode(sourceBytes);
      } catch {
        sourceText = fail('IMPORT_SOURCE_ENCODING_INVALID');
      }
      const credentials = parseSource(sourceText);
      let released = false;
      return {
        credentials,
        release: () => {
          if (released) return;
          released = true;
          for (const credential of credentials) credential.valueBytes.fill(0);
        },
      };
    } catch (error) {
      if (error instanceof LocalEnvironmentSecretImportError) throw error;
      throw new LocalEnvironmentSecretImportError('IMPORT_SOURCE_UNTRUSTED');
    } finally {
      sourceBytes?.fill(0);
    }
  }
}
