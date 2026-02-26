import { describe, it, expect } from 'vitest';
import { resolveSafePath } from '../../../src/utils/file-utils.js';
import * as path from 'node:path';
import * as os from 'node:os';

describe('file_utils (integration)', () => {
  it('allows paths inside system temp directory', () => {
    const workspaceRoot = path.resolve(os.homedir(), 'test_workspace');
    const target = path.join(os.tmpdir(), 'integration_temp_file.tmp');
    const resolved = resolveSafePath(target, workspaceRoot);
    expect(resolved).toBe(path.resolve(target));
  });
});
