import {
  buildLocalFileUrl,
  LOCAL_FILE_AUTHORITY,
  LOCAL_FILE_SCHEME,
} from '~/shared/localFileUrl';

export type ContextLocalFileLocatorMigration =
  | { kind: 'not_local' }
  | { kind: 'canonical'; locator: string }
  | { kind: 'migrated'; locator: string }
  | { kind: 'unsupported' };

const LOCAL_FILE_PREFIX = /^local-file:/i;
const LEGACY_POSIX_LOCATOR = /^local-file:\/\/(\/.*)$/;
const WINDOWS_CANONICAL_PATHNAME = /^\/[A-Za-z]:\//;

const decodePathname = (pathname: string): string | null => {
  try {
    const decoded = decodeURIComponent(pathname);
    return decoded.includes('\0') ? null : decoded;
  } catch {
    return null;
  }
};

const buildLegacyPosixLocator = (filePath: string): string => {
  const encoded = filePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${LOCAL_FILE_SCHEME}://${encoded}`;
};

const buildLegacyWindowsLocator = (filePath: string): string => {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const encoded = normalizedPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
    .replace(/^([A-Za-z])%3A/, '$1:');
  return `${LOCAL_FILE_SCHEME}://${encoded}`;
};

export const migrateContextLocalFileLocator = (
  authoredLocator: string,
): ContextLocalFileLocatorMigration => {
  const locator = authoredLocator.trim();
  if (!LOCAL_FILE_PREFIX.test(locator)) {
    return { kind: 'not_local' };
  }

  const legacyPosixMatch = LEGACY_POSIX_LOCATOR.exec(locator);
  if (legacyPosixMatch?.[1]) {
    const decodedPathname = decodePathname(legacyPosixMatch[1]);
    if (!decodedPathname || buildLegacyPosixLocator(decodedPathname) !== locator) {
      return { kind: 'unsupported' };
    }
    return { kind: 'migrated', locator: buildLocalFileUrl(decodedPathname) };
  }

  try {
    const parsedUrl = new URL(locator);
    if (
      parsedUrl.protocol !== `${LOCAL_FILE_SCHEME}:`
      || parsedUrl.username
      || parsedUrl.password
      || parsedUrl.port
      || parsedUrl.search
      || parsedUrl.hash
    ) {
      return { kind: 'unsupported' };
    }

    const decodedPathname = decodePathname(parsedUrl.pathname);
    if (!decodedPathname) {
      return { kind: 'unsupported' };
    }

    if (parsedUrl.hostname === LOCAL_FILE_AUTHORITY) {
      const filePath = WINDOWS_CANONICAL_PATHNAME.test(parsedUrl.pathname)
        ? decodedPathname.slice(1)
        : decodedPathname;
      const canonicalLocator = buildLocalFileUrl(filePath);
      return canonicalLocator === locator
        ? { kind: 'canonical', locator: canonicalLocator }
        : { kind: 'unsupported' };
    }

    const driveAuthorityMatch = /^local-file:\/\/([A-Za-z]):(\/.*)$/.exec(locator);
    if (driveAuthorityMatch?.[1] && driveAuthorityMatch[2]) {
      const decodedDrivePath = decodePathname(driveAuthorityMatch[2]);
      if (!decodedDrivePath) {
        return { kind: 'unsupported' };
      }
      const filePath = `${driveAuthorityMatch[1]}:${decodedDrivePath}`;
      if (buildLegacyWindowsLocator(filePath) !== locator) {
        return { kind: 'unsupported' };
      }
      return { kind: 'migrated', locator: buildLocalFileUrl(filePath) };
    }
  } catch {
    return { kind: 'unsupported' };
  }

  return { kind: 'unsupported' };
};
