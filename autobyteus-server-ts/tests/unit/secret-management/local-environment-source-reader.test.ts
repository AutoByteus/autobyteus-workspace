import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { providerCredentialCatalog } from '../../../src/secret-management/catalog/provider-credential-catalog.js';
import {
  LocalEnvironmentSourceReader,
  verifyWindowsExclusiveAcl,
} from '../../../src/secret-management/provisioning/local-environment-source-reader.js';
import { LOCAL_IMPORT_CREDENTIAL_ALIAS_TO_SECRET_ID } from '../../../src/secret-management/provisioning/local-import-credential-alias-registry.js';
import { LocalEnvironmentSecretImportError } from '../../../src/secret-management/provisioning/local-environment-secret-import.js';

const privateFile = async (filePath: string, content: string | Buffer): Promise<void> => {
  await fs.writeFile(filePath, content, { mode: 0o600 });
  if (process.platform !== 'win32') await fs.chmod(filePath, 0o600);
};

describe('LocalEnvironmentSourceReader', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'local-environment-source-'));
    if (process.platform !== 'win32') await fs.chmod(directory, 0o700);
  });

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  it('accepts an arbitrary filename under the one literal assignment grammar and releases owned buffers', async () => {
    const sourcePath = path.join(directory, 'renamed-credential-source.data');
    await privateFile(sourcePath, [
      '# synthetic source',
      'APP_MODE=development',
      'export OPENAI_API_KEY = "synthetic\\"openai"',
      'SERPER_API_KEY=synthetic=serper#literal',
      "VERTEX_AI_API_KEY='synthetic\\'vertex'",
      '',
    ].join('\r\n'));

    const result = await new LocalEnvironmentSourceReader().read(sourcePath);
    expect(result.credentials.map((credential) => String(credential.secretId))).toEqual([
      'provider.openai.api-key',
      'search.serper.api-key',
      'provider.google.vertex-express.api-key',
    ]);
    expect(result.credentials.map((credential) => credential.valueBytes.toString('utf8'))).toEqual([
      'synthetic"openai',
      'synthetic=serper#literal',
      "synthetic'vertex",
    ]);

    const buffers = result.credentials.map((credential) => credential.valueBytes);
    result.release();
    result.release();
    expect(buffers.every((buffer) => buffer.every((byte) => byte === 0))).toBe(true);
  });

  it('maps every immutable approved alias without filename-driven format selection', async () => {
    const sourcePath = path.join(directory, 'not-an-env-file.bin');
    await privateFile(sourcePath, Object.keys(LOCAL_IMPORT_CREDENTIAL_ALIAS_TO_SECRET_ID)
      .map((alias, index) => `${alias}=synthetic-${index}`)
      .join('\n'));

    const result = await new LocalEnvironmentSourceReader().read(sourcePath);
    try {
      expect(result.credentials.map((credential) => String(credential.secretId))).toEqual(
        Object.values(LOCAL_IMPORT_CREDENTIAL_ALIAS_TO_SECRET_ID).map(String),
      );
      expect(result.credentials.every((credential) => (
        providerCredentialCatalog.isKnownSecretId(credential.secretId)
      ))).toBe(true);
      expect(LOCAL_IMPORT_CREDENTIAL_ALIAS_TO_SECRET_ID).toHaveProperty(
        'DASHSCOPE_API_KEY',
        'provider.qwen.api-key',
      );
      expect(LOCAL_IMPORT_CREDENTIAL_ALIAS_TO_SECRET_ID).not.toHaveProperty('QWEN_API_KEY');
      expect(LOCAL_IMPORT_CREDENTIAL_ALIAS_TO_SECRET_ID).not.toHaveProperty('ZHIPU_API_KEY');
    } finally {
      result.release();
    }
  });

  it('ignores every unrecognized line without parsing its right-hand side or retaining metadata', async () => {
    const sourcePath = path.join(directory, '.env');
    await privateFile(sourcePath, [
      'AUTOBYTEUS_SERVER_HOST=http://localhost:8000',
      'DATABASE_URL=file:synthetic.db',
      'OLLAMA_API_KEY="unterminated-unrelated-value',
      'GOOGLE_CSE_API_KEY=$(',
      'QWEN_API_KEY=${UNRELATED_DYNAMIC_VALUE}',
      'ZHIPU_API_KEY=`unrelated-command`',
      'CLAUDE_CODE_API_KEY=synthetic-unmapped-claude',
      'UNREVIEWED_TOKEN=synthetic-unmapped-token',
      'malformed unrelated text with no assignment',
      'DASHSCOPE_API_KEY=synthetic-dashscope',
      '',
    ].join('\n'));

    const result = await new LocalEnvironmentSourceReader().read(sourcePath);
    try {
      expect(result.credentials).toHaveLength(1);
      expect(result.credentials[0]?.secretId).toBe('provider.qwen.api-key');
      expect(result.credentials[0]?.valueBytes.toString('utf8')).toBe('synthetic-dashscope');
      expect(Object.keys(result).sort()).toEqual(['credentials', 'release']);
      expect(JSON.stringify(result)).not.toContain('QWEN_API_KEY');
      expect(JSON.stringify(result)).not.toContain('ZHIPU_API_KEY');
      expect(JSON.stringify(result)).not.toContain('UNREVIEWED_TOKEN');
    } finally {
      result.release();
    }
  });

  it('ignores bare carriage returns in unrelated lines while retaining selected-assignment validation', async () => {
    const sourcePath = path.join(directory, 'mixed-physical-lines');
    await privateFile(
      sourcePath,
      'UNRELATED_SETTING=unparsed\rmalformed-fragment\nOPENAI_API_KEY=synthetic-openai\n',
    );

    const result = await new LocalEnvironmentSourceReader().read(sourcePath);
    try {
      expect(result.credentials).toHaveLength(1);
      expect(result.credentials[0]?.secretId).toBe('provider.openai.api-key');
      expect(result.credentials[0]?.valueBytes.toString('utf8')).toBe('synthetic-openai');
    } finally {
      result.release();
    }
  });

  it('treats every normalized empty form and repeated empty occurrences as absent', async () => {
    const sourcePath = path.join(directory, 'empty-placeholders');
    const sourceBefore = Buffer.from([
      'OPENAI_API_KEY=',
      'OPENAI_API_KEY=   ',
      'MISTRAL_API_KEY=\t \t',
      'GEMINI_API_KEY=""',
      "ANTHROPIC_API_KEY=''",
      'DEEPSEEK_API_KEY=" \t "',
      'SERPER_API_KEY=synthetic-serper',
      '',
    ].join('\n'));
    await privateFile(sourcePath, sourceBefore);

    const result = await new LocalEnvironmentSourceReader().read(sourcePath);
    try {
      expect(result.credentials).toHaveLength(1);
      expect(result.credentials[0]?.secretId).toBe('search.serper.api-key');
      expect(result.credentials[0]?.valueBytes.toString('utf8')).toBe('synthetic-serper');
      expect(Object.keys(result).sort()).toEqual(['credentials', 'release']);
      expect(JSON.stringify(result)).not.toMatch(/empty|placeholder|ignored/i);
      expect(await fs.readFile(sourcePath)).toEqual(sourceBefore);
    } finally {
      result.release();
    }
  });

  it('selects one populated occurrence while empty occurrences of the same spelling remain absent', async () => {
    const sourcePath = path.join(directory, 'empty-and-populated');
    await privateFile(sourcePath, [
      'OPENAI_API_KEY=',
      'OPENAI_API_KEY=synthetic-openai',
      'MISTRAL_API_KEY=synthetic-mistral',
      'MISTRAL_API_KEY=""',
      '',
    ].join('\n'));

    const result = await new LocalEnvironmentSourceReader().read(sourcePath);
    try {
      expect(result.credentials.map(({ secretId }) => String(secretId))).toEqual([
        'provider.openai.api-key',
        'provider.mistral.api-key',
      ]);
      expect(result.credentials.map(({ valueBytes }) => valueBytes.toString('utf8'))).toEqual([
        'synthetic-openai',
        'synthetic-mistral',
      ]);
    } finally {
      result.release();
    }
  });

  it.each([
    ['duplicate', 'OPENAI_API_KEY=synthetic-one\nOPENAI_API_KEY=synthetic-two', 'IMPORT_SOURCE_DUPLICATE_ASSIGNMENT'],
    ['all empty', 'OPENAI_API_KEY=\nOPENAI_API_KEY=""\nGEMINI_API_KEY=   ', 'IMPORT_NO_MAPPED_CREDENTIALS'],
    ['recognized assignment without a separator', 'OPENAI_API_KEY synthetic', 'IMPORT_SOURCE_SYNTAX_INVALID'],
    ['dynamic expression', 'OPENAI_API_KEY=${SYNTHETIC_SOURCE}', 'IMPORT_SOURCE_SYNTAX_INVALID'],
    ['line continuation marker', 'OPENAI_API_KEY=synthetic\\', 'IMPORT_SOURCE_SYNTAX_INVALID'],
    ['unmatched quote', 'OPENAI_API_KEY="synthetic', 'IMPORT_SOURCE_SYNTAX_INVALID'],
    ['bare carriage return', 'OPENAI_API_KEY=synthetic\rAPP_MODE=test', 'IMPORT_SOURCE_SYNTAX_INVALID'],
    ['zero mapped', 'APP_MODE=development', 'IMPORT_NO_MAPPED_CREDENTIALS'],
  ])('rejects %s input value-free', async (_name, content, code) => {
    const sourcePath = path.join(directory, 'source');
    await privateFile(sourcePath, content);
    const error = await new LocalEnvironmentSourceReader().read(sourcePath).catch((caught) => caught);
    expect(error).toBeInstanceOf(LocalEnvironmentSecretImportError);
    expect(error.toJSON()).toEqual({ code });
    expect(JSON.stringify(error)).not.toContain('synthetic');
    expect(JSON.stringify(error)).not.toContain(sourcePath);
  });

  it('rejects invalid encoding, NUL, oversize, symlink, and relative sources', async () => {
    const cases: Array<{ name: string; content: Buffer; code: string }> = [
      { name: 'invalid-utf8', content: Buffer.from([0xff]), code: 'IMPORT_SOURCE_ENCODING_INVALID' },
      { name: 'nul', content: Buffer.from('OPENAI_API_KEY=synthetic\0value'), code: 'IMPORT_SOURCE_ENCODING_INVALID' },
      { name: 'oversize', content: Buffer.alloc((1024 * 1024) + 1, 0x61), code: 'IMPORT_SOURCE_TOO_LARGE' },
    ];
    for (const testCase of cases) {
      const sourcePath = path.join(directory, testCase.name);
      await privateFile(sourcePath, testCase.content);
      await expect(new LocalEnvironmentSourceReader().read(sourcePath)).rejects.toMatchObject({
        code: testCase.code,
      });
    }

    const target = path.join(directory, 'target');
    const link = path.join(directory, 'link');
    await privateFile(target, 'OPENAI_API_KEY=synthetic');
    await fs.symlink(target, link);
    await expect(new LocalEnvironmentSourceReader().read(link)).rejects.toMatchObject({
      code: 'IMPORT_SOURCE_UNTRUSTED',
    });
    await expect(new LocalEnvironmentSourceReader().read(directory)).rejects.toMatchObject({
      code: 'IMPORT_SOURCE_UNTRUSTED',
    });
    await expect(new LocalEnvironmentSourceReader().read('relative-source')).rejects.toMatchObject({
      code: 'IMPORT_SOURCE_PATH_INVALID',
    });
  });

  it('discards bytes when opened-file identity changes during the bounded read', async () => {
    const sourcePath = path.join(directory, 'raced-source');
    await privateFile(sourcePath, 'OPENAI_API_KEY=synthetic-before-race');
    const reader = new LocalEnvironmentSourceReader(undefined, async (handle) => {
      const bytes = await handle.readFile();
      await fs.appendFile(sourcePath, '\n# changed while open');
      return bytes;
    });

    const error = await reader.read(sourcePath).catch((caught) => caught);
    expect(error.toJSON()).toEqual({ code: 'IMPORT_SOURCE_RACED' });
    expect(JSON.stringify(error)).not.toContain('synthetic-before-race');
  });

  it('uses a literal-path Windows ACL probe and fails closed without mutating source access', async () => {
    const sourcePath = path.join(directory, 'windows-acl-source');
    await privateFile(sourcePath, 'OPENAI_API_KEY=synthetic');
    let invocation: { executable: string; args: readonly string[] } | null = null;
    verifyWindowsExclusiveAcl(sourcePath, (executable, args) => {
      invocation = { executable, args };
    });
    expect(invocation?.executable).toBe('powershell.exe');
    expect(invocation?.args.at(-1)).toBe(sourcePath);

    expect(() => verifyWindowsExclusiveAcl(sourcePath, () => {
      throw new Error('synthetic ACL rejection');
    })).toThrowError('IMPORT_SOURCE_UNTRUSTED');
    if (process.platform !== 'win32') expect((await fs.stat(sourcePath)).mode & 0o777).toBe(0o600);
  });

  it.runIf(process.platform !== 'win32')('rejects a source with group or other access without mutating it', async () => {
    const sourcePath = path.join(directory, 'non-private');
    await privateFile(sourcePath, 'OPENAI_API_KEY=synthetic');
    await fs.chmod(sourcePath, 0o640);

    await expect(new LocalEnvironmentSourceReader().read(sourcePath)).rejects.toMatchObject({
      code: 'IMPORT_SOURCE_UNTRUSTED',
    });
    expect((await fs.stat(sourcePath)).mode & 0o777).toBe(0o640);
  });
});
