import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveAppReleasePageUrl } from '../appReleasePage';

describe('resolveAppReleasePageUrl', () => {
  let dir = '';
  const write = (text: string) => {
    const file = path.join(dir, 'app-update.yml');
    fs.writeFileSync(file, text);
    return file;
  };
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-release-page-')); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it('builds the GitHub release tag page from the packaged publish config', () => {
    const file = write('owner: AutoByteus\nrepo: autobyteus-workspace\nprovider: github\nupdaterCacheDirName: autobyteus-updater\n');
    expect(resolveAppReleasePageUrl(file, '1.5.7-beta.4'))
      .toBe('https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.5.7-beta.4');
  });

  it('accepts quoted values', () => {
    const file = write("provider: 'github'\nowner: \"AutoByteus\"\nrepo: autobyteus-workspace\n");
    expect(resolveAppReleasePageUrl(file, '1.0.0')).toBe('https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.0.0');
  });

  it('is null for a non-GitHub provider, an unsafe identity or a missing file', () => {
    expect(resolveAppReleasePageUrl(write('provider: generic\nurl: http://127.0.0.1:8123\n'), '1.0.0')).toBeNull();
    expect(resolveAppReleasePageUrl(write('provider: github\nowner: ../evil\nrepo: x\n'), '1.0.0')).toBeNull();
    expect(resolveAppReleasePageUrl(path.join(dir, 'missing.yml'), '1.0.0')).toBeNull();
  });
});
