import { describe, expect, it, vi } from 'vitest';
import { migrateContextLocalFileLocator } from '../contextLocalFileLocatorMigration';

describe('migrateContextLocalFileLocator', () => {
  it('keeps exact canonical POSIX and Windows locators idempotent', () => {
    expect(migrateContextLocalFileLocator(
      'local-file://local/Users/Normy/Video%20100%25%231.mp4',
    )).toEqual({
      kind: 'canonical',
      locator: 'local-file://local/Users/Normy/Video%20100%25%231.mp4',
    });
    expect(migrateContextLocalFileLocator(
      'local-file://local/C:/Media/Video%20100%25%231.mp4',
    )).toEqual({
      kind: 'canonical',
      locator: 'local-file://local/C:/Media/Video%20100%25%231.mp4',
    });
    expect(migrateContextLocalFileLocator(
      'local-file://local/C%3A/Media/video.mp4',
    )).toEqual({
      kind: 'canonical',
      locator: 'local-file://local/C%3A/Media/video.mp4',
    });
    expect(migrateContextLocalFileLocator(
      'local-file://local/Users/Normy/video%5Cname.mp4',
    )).toEqual({
      kind: 'canonical',
      locator: 'local-file://local/Users/Normy/video%5Cname.mp4',
    });
  });

  it('transforms valid legacy POSIX and Windows drive-authority locators once', () => {
    expect(migrateContextLocalFileLocator(
      'local-file:///Users/Normy/Video%20100%25%231.mp4',
    )).toEqual({
      kind: 'migrated',
      locator: 'local-file://local/Users/Normy/Video%20100%25%231.mp4',
    });
    expect(migrateContextLocalFileLocator(
      'local-file://C:/Media/Video%20100%25%231.mp4',
    )).toEqual({
      kind: 'migrated',
      locator: 'local-file://local/C:/Media/Video%20100%25%231.mp4',
    });
    expect(migrateContextLocalFileLocator(
      'local-file:///Users/Normy/video%5Cname.mp4',
    )).toEqual({
      kind: 'migrated',
      locator: 'local-file://local/Users/Normy/video%5Cname.mp4',
    });
  });

  it('recognizes exact legacy POSIX syntax before ambient URL normalization', () => {
    const NativeUrl = globalThis.URL;
    class RendererStandardSchemeUrl extends NativeUrl {
      constructor(input: string | URL, base?: string | URL) {
        super(input, base);
        if (typeof input !== 'string' || !input.startsWith('local-file:///')) {
          return;
        }

        const [hostname, ...pathSegments] = this.pathname.slice(1).split('/');
        this.hostname = hostname ?? '';
        this.pathname = `/${pathSegments.join('/')}`;
      }
    }
    vi.stubGlobal('URL', RendererStandardSchemeUrl);

    try {
      expect(migrateContextLocalFileLocator(
        'local-file:///Users/Normy/video%5Cname%20100%25%231.mp4',
      )).toEqual({
        kind: 'migrated',
        locator: 'local-file://local/Users/Normy/video%5Cname%20100%25%231.mp4',
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('quarantines wrong, opaque, adorned, noncanonical, and malformed local locators', () => {
    const unsupported = [
      'local-file://opaque/image.png',
      'local-file://wrong/Users/Normy/video.mp4',
      'local-file://user@local/Users/Normy/video.mp4',
      'local-file://local:42/Users/Normy/video.mp4',
      'local-file://local/Users/Normy/video.mp4?download=1',
      'local-file://local/Users/Normy/video.mp4#fragment',
      'local-file://local/Users/Normy/%E0%A4%A',
      'local-file:///Users/Normy/video.mp4?download=1',
      'local-file:///Users/Normy/video.mp4#fragment',
      'local-file:///Users/Normy/%E0%A4%A',
      'local-file:relative/video.mp4',
      'LOCAL-FILE://local/Users/Normy/video.mp4',
    ];

    unsupported.forEach((locator) => {
      expect(migrateContextLocalFileLocator(locator)).toEqual({ kind: 'unsupported' });
    });
  });

  it('leaves non-local locators outside the migration boundary', () => {
    expect(migrateContextLocalFileLocator('https://cdn.example/video.mp4')).toEqual({
      kind: 'not_local',
    });
    expect(migrateContextLocalFileLocator('/workspace/video.mp4')).toEqual({ kind: 'not_local' });
  });
});
