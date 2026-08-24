/**
 * The embedded node sentinel is also the browser bootstrap fallback. The
 * Electron bridge, not that sentinel, is the authority for local filesystem
 * preview capability.
 */
export function hasTrustedElectronLocalFileCapability(): boolean {
  return typeof window !== 'undefined'
    && typeof window.electronAPI?.readLocalTextFile === 'function';
}
