import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(import.meta.dirname, '../../..');
const packageJsonPath = path.join(projectRoot, 'package.json');

describe('autobyteus-ts package manifest', () => {
  it('ships the local postinstall script it references', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    expect(packageJson.scripts?.postinstall).toContain('./scripts/fix-node-pty-permissions.mjs');
    expect(packageJson.files).toContain('scripts/fix-node-pty-permissions.mjs');
  });
});
