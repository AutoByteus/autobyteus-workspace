export const LOCAL_FILE_SCHEME = 'local-file';
export const LOCAL_FILE_AUTHORITY = 'local';

const POSIX_ABSOLUTE_PATH = /^\//;
const WINDOWS_DRIVE_ABSOLUTE_PATH = /^[A-Za-z]:[\\/]/;

const encodePathSegments = (filePath: string): string =>
  filePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

export const buildLocalFileUrl = (filePath: string): string => {
  if (filePath.includes('\0')) {
    throw new TypeError('A local-file URL requires an absolute path without null bytes.');
  }

  if (WINDOWS_DRIVE_ABSOLUTE_PATH.test(filePath)) {
    const normalizedWindowsPath = filePath.replace(/\\/g, '/');
    const encodedPath = encodePathSegments(normalizedWindowsPath).replace(/^([A-Za-z])%3A/, '$1:');
    return `${LOCAL_FILE_SCHEME}://${LOCAL_FILE_AUTHORITY}/${encodedPath}`;
  }

  if (POSIX_ABSOLUTE_PATH.test(filePath)) {
    return `${LOCAL_FILE_SCHEME}://${LOCAL_FILE_AUTHORITY}${encodePathSegments(filePath)}`;
  }

  throw new TypeError('A local-file URL requires an absolute POSIX or Windows drive path.');
};

export const parseLocalFileUrl = (requestUrl: string, platform: string): string | null => {
  try {
    const parsedUrl = new URL(requestUrl);
    if (
      parsedUrl.protocol !== `${LOCAL_FILE_SCHEME}:`
      || parsedUrl.hostname !== LOCAL_FILE_AUTHORITY
      || parsedUrl.username
      || parsedUrl.password
      || parsedUrl.port
      || parsedUrl.search
      || parsedUrl.hash
    ) {
      return null;
    }

    const decodedPathname = decodeURIComponent(parsedUrl.pathname);
    if (decodedPathname.includes('\0')) {
      return null;
    }

    const filePath = platform === 'win32'
      ? (/^\/[A-Za-z]:\//.test(decodedPathname) ? decodedPathname.slice(1) : null)
      : (decodedPathname.startsWith('/') ? decodedPathname : null);
    if (!filePath) {
      return null;
    }

    return buildLocalFileUrl(filePath) === parsedUrl.toString() ? filePath : null;
  } catch {
    return null;
  }
};
