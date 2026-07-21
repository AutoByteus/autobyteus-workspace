import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const render = (value) => {
  if (typeof value === 'string') return value;
  try {
    const serialized = JSON.stringify(value);
    return typeof serialized === 'string' ? serialized : String(value);
  } catch {
    return String(value);
  }
};

export const LIVE_E2E_RUNNER_CANARIES = Object.freeze([
  'synthetic-live-e2e-scan-canary',
]);

export class LiveE2eEvidenceScanner {
  constructor(syntheticCanaries) {
    this.forbidden = syntheticCanaries.flatMap((value) => [
      value,
      Buffer.from(value).toString('base64'),
    ]).filter(Boolean);
  }

  assertClean(value) {
    const output = render(value);
    if (this.forbidden.some((candidate) => output.includes(candidate))) {
      throw new Error('LIVE_E2E_EVIDENCE_LEAK_DETECTED');
    }
  }

  assertStructurallyValueFree(value) {
    const output = render(value);
    if (/(api[_-]?key|authorization|credentialValue|secretValue)\s*[":=]/i.test(output)) {
      throw new Error('LIVE_E2E_EVIDENCE_SECRET_FIELD_DETECTED');
    }
  }

  assertEvidenceClean(value) {
    this.assertClean(value);
    this.assertStructurallyValueFree(value);
  }
}

const stableCaptureError = (error) => {
  const code = error instanceof Error && error.message.startsWith('LIVE_E2E_')
    ? error.message
    : 'LIVE_E2E_EVIDENCE_CAPTURE_FAILED';
  return new Error(code);
};

const scanEvidencePath = async (evidencePath, scanner) => {
  const metadata = await fs.lstat(evidencePath);
  if (metadata.isSymbolicLink()) {
    throw new Error('LIVE_E2E_EVIDENCE_ARTIFACT_INVALID');
  }
  if (metadata.isDirectory()) {
    const entries = await fs.readdir(evidencePath, { withFileTypes: true });
    for (const entry of entries) {
      await scanEvidencePath(path.join(evidencePath, entry.name), scanner);
    }
    return;
  }
  if (!metadata.isFile()) {
    throw new Error('LIVE_E2E_EVIDENCE_ARTIFACT_INVALID');
  }
  scanner.assertEvidenceClean(await fs.readFile(evidencePath, 'utf8'));
};

export const runCapturedLiveE2eProcess = ({
  command,
  args,
  cwd,
  env,
  evidencePaths = [],
  syntheticCanaries = LIVE_E2E_RUNNER_CANARIES,
}) => new Promise((resolve, reject) => {
  const scanner = new LiveE2eEvidenceScanner(syntheticCanaries);
  let stdout = '';
  let stderr = '';
  let terminalError = null;
  let child;

  const rejectEvidence = (error) => {
    if (terminalError) return;
    terminalError = stableCaptureError(error);
    stdout = '';
    stderr = '';
    child?.kill('SIGKILL');
  };

  try {
    child = spawn(command, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    reject(new Error('LIVE_E2E_RUNNER_START_FAILED'));
    return;
  }

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');

  child.stdout.on('data', (chunk) => {
    if (terminalError) return;
    stdout += chunk;
    try {
      scanner.assertEvidenceClean({ stdout, stderr });
    } catch (error) {
      rejectEvidence(error);
    }
  });
  child.stderr.on('data', (chunk) => {
    if (terminalError) return;
    stderr += chunk;
    try {
      scanner.assertEvidenceClean({ stdout, stderr });
    } catch (error) {
      rejectEvidence(error);
    }
  });

  child.on('error', () => {
    if (!terminalError) terminalError = new Error('LIVE_E2E_RUNNER_START_FAILED');
  });

  child.on('close', (status, signal) => {
    void (async () => {
      if (terminalError) {
        reject(terminalError);
        return;
      }
      try {
        scanner.assertEvidenceClean({ stdout, stderr });
        for (const evidencePath of evidencePaths) {
          await scanEvidencePath(evidencePath, scanner);
        }
      } catch (error) {
        reject(stableCaptureError(error));
        return;
      }
      resolve({
        status: status ?? 1,
        signal: signal ?? null,
        stdout,
        stderr,
      });
    })();
  });
});
