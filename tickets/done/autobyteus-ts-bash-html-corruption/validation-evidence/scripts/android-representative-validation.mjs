import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

process.env.ANDROID_ROOT = process.env.ANDROID_ROOT || '/system';
process.env.ANDROID_DATA = process.env.ANDROID_DATA || '/data';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const evidenceRoot = path.join(repoRoot, 'tickets/in-progress/autobyteus-ts-bash-html-corruption/validation-evidence');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-android-representative-'));
const terminalDist = path.join(repoRoot, 'autobyteus-ts/dist/tools/terminal');
const { getDefaultSessionFactory } = await import(path.join(terminalDist, 'session-factory.js'));
const { runBash } = await import(path.join(terminalDist, 'tools/run-bash.js'));
const { NonInteractiveShellResolver } = await import(path.join(terminalDist, 'command-execution/non-interactive-shell-resolver.js'));

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const assert = (condition, message, details) => {
  if (!condition) {
    const err = new Error(message);
    err.details = details;
    throw err;
  }
};

try {
  const factoryName = getDefaultSessionFactory().name;
  assert(factoryName === 'DirectShellSession', 'Android env did not select DirectShellSession for interactive default', { factoryName });

  const resolver = new NonInteractiveShellResolver({ env: { ...process.env, PATH: '/definitely/missing' } });
  const invocation = resolver.resolve('printf android_sh', workspace);
  assert(invocation.executable === '/system/bin/sh' || invocation.executable.endsWith('/sh'), 'Android resolver without PATH bash did not fall back to sh', invocation);
  assert(invocation.kind === 'posix', 'Android resolver should remain POSIX execution target, not WSL', invocation);

  const payload = '<!doctype html>\n<title>android representative</title>\n<script>console.log("android-run-bash-exact")</script>\n';
  const expectedHash = sha256(payload);
  const result = await runBash({ workspaceRootPath: workspace, agentId: `android-representative-${runId}` }, `cat > index.html <<'HTML'\n${payload}HTML\nnode -e "const fs=require('fs'),crypto=require('crypto');const b=fs.readFileSync('index.html');console.log(crypto.createHash('sha256').update(b).digest('hex'))"`, workspace, 10);
  const written = await fs.readFile(path.join(workspace, 'index.html'), 'utf8');
  assert(result.exitCode === 0, 'Android-env run_bash exited non-zero', result);
  assert(written === payload, 'Android-env run_bash did not preserve exact bytes', { expectedHash, actualHash: sha256(written), result });

  const evidence = {
    runId,
    hostPlatform: { platform: process.platform, arch: process.arch, node: process.version },
    emulatedAndroidEnv: { ANDROID_ROOT: process.env.ANDROID_ROOT, ANDROID_DATA: process.env.ANDROID_DATA },
    workspace,
    defaultSessionFactory: factoryName,
    noPathResolverInvocation: {
      executable: invocation.executable,
      args: invocation.args,
      kind: invocation.kind,
      processTarget: invocation.processTarget
    },
    runBashExactWrite: {
      expectedHash,
      actualHash: sha256(written),
      expectedBytes: Buffer.byteLength(payload),
      actualBytes: Buffer.byteLength(written),
      result: result.toJSON?.() ?? result
    }
  };
  const evidencePath = path.join(evidenceRoot, 'logs', `android-representative-validation-${runId}.json`);
  await fs.writeFile(evidencePath, JSON.stringify(evidence, null, 2), 'utf8');
  console.log(JSON.stringify({ status: 'pass', evidencePath, defaultSessionFactory: factoryName, resolverExecutable: invocation.executable, expectedHash }, null, 2));
} finally {
  await fs.rm(workspace, { recursive: true, force: true });
}
