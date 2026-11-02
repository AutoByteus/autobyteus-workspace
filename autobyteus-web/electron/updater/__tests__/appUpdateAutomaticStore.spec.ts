import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { loggerMock } = vi.hoisted(() => ({ loggerMock: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../../logger', () => ({ logger: loggerMock }));

import { loadAppUpdateAutomatic, saveAppUpdateAutomatic } from '../appUpdateAutomaticStore';

/** autobyteus-356 REQ-001: "Update automatically" for the app, a desktop file, off by default. */
describe('app update automatic store', () => {
  let dir = '';
  const file = () => path.join(dir, 'app-update-automatic.json');
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-update-automatic-')); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); vi.clearAllMocks(); });

  it('is off without a file (a fresh profile), quietly', () => {
    expect(loadAppUpdateAutomatic(dir)).toBe(false);
    expect(loggerMock.warn).not.toHaveBeenCalled();
  });

  it('saves atomically and reads the value back', () => {
    expect(saveAppUpdateAutomatic(dir, true)).toBe(true);
    expect(JSON.parse(fs.readFileSync(file(), 'utf8'))).toEqual({ enabled: true });
    expect(loadAppUpdateAutomatic(dir)).toBe(true);
    expect(fs.readdirSync(dir)).toEqual(['app-update-automatic.json']);
    expect(saveAppUpdateAutomatic(dir, false)).toBe(true);
    expect(loadAppUpdateAutomatic(dir)).toBe(false);
  });

  it('reads an invalid file as off, with a warning', () => {
    fs.writeFileSync(file(), '{ broken');
    expect(loadAppUpdateAutomatic(dir)).toBe(false);
    fs.writeFileSync(file(), JSON.stringify({ enabled: 'yes' }));
    expect(loadAppUpdateAutomatic(dir)).toBe(false);
    expect(loggerMock.warn).toHaveBeenCalledTimes(2);
  });

  it('reports a failed save', () => {
    expect(saveAppUpdateAutomatic(path.join(dir, 'missing-folder'), true)).toBe(false);
    expect(loggerMock.error).toHaveBeenCalled();
  });
});
