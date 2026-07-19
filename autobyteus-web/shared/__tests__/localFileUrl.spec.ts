import { describe, expect, it } from 'vitest';
import {
  buildLocalFileUrl,
  LOCAL_FILE_AUTHORITY,
  LOCAL_FILE_SCHEME,
  parseLocalFileUrl,
} from '../localFileUrl';

describe('localFileUrl', () => {
  it('builds one fixed-authority identity for POSIX and Windows absolute paths', () => {
    expect(LOCAL_FILE_SCHEME).toBe('local-file');
    expect(LOCAL_FILE_AUTHORITY).toBe('local');
    expect(buildLocalFileUrl('/Users/Normy/Video 100%#1.mp4')).toBe(
      'local-file://local/Users/Normy/Video%20100%25%231.mp4',
    );
    expect(buildLocalFileUrl('C:\\Media\\Video 100%#1.mp4')).toBe(
      'local-file://local/C:/Media/Video%20100%25%231.mp4',
    );
  });

  it('round trips case-sensitive Unicode and URL-significant POSIX paths exactly', () => {
    const posixPath = '/Users/Normy/视频 100%#1.mp4';
    const posixBackslashPath = '/Users/Normy/video\\name.mp4';
    const posixDriveLikePath = '/C:/Media/video.mp4';
    const windowsPath = 'D:\\Media\\视频 100%#1.mp4';

    expect(parseLocalFileUrl(buildLocalFileUrl(posixPath), 'darwin')).toBe(posixPath);
    expect(buildLocalFileUrl(posixBackslashPath)).toBe(
      'local-file://local/Users/Normy/video%5Cname.mp4',
    );
    expect(parseLocalFileUrl(buildLocalFileUrl(posixBackslashPath), 'darwin')).toBe(
      posixBackslashPath,
    );
    expect(parseLocalFileUrl(buildLocalFileUrl(posixDriveLikePath), 'darwin')).toBe(posixDriveLikePath);
    expect(parseLocalFileUrl(buildLocalFileUrl(windowsPath), 'win32')).toBe(
      'D:/Media/视频 100%#1.mp4',
    );
  });

  it('rejects non-absolute builder input', () => {
    for (const input of ['relative/video.mp4', 'C:relative.mp4', 'local-file:///tmp/video.mp4', '']) {
      expect(() => buildLocalFileUrl(input)).toThrow(TypeError);
    }
  });

  it('rejects old, wrong, adorned, malformed, and platform-invalid parser shapes', () => {
    const invalid = [
      'local-file:///Users/Normy/video.mp4',
      'local-file://C:/Media/video.mp4',
      'local-file://opaque/Users/Normy/video.mp4',
      'local-file://user@local/Users/Normy/video.mp4',
      'local-file://local:42/Users/Normy/video.mp4',
      'local-file://local/Users/Normy/video.mp4?download=1',
      'local-file://local/Users/Normy/video.mp4#fragment',
      'local-file://local/Users/Normy/%E0%A4%A',
      'https://local/Users/Normy/video.mp4',
    ];

    invalid.forEach((url) => expect(parseLocalFileUrl(url, 'darwin')).toBeNull());
    expect(parseLocalFileUrl('local-file://local/Users/Normy/video.mp4', 'win32')).toBeNull();
  });
});
