import type { ContextAttachment } from '~/types/conversation';
import { getBrowserServerBaseUrl, getBrowserServerUrls } from '~/utils/browserServerConfig';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { buildLocalFileUrl, LOCAL_FILE_SCHEME, parseLocalFileUrl } from '~/shared/localFileUrl';
import { isBrowserOpenableContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';

const isAbsoluteLocalPath = (value: string): boolean => value.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(value);

const isCanonicalLocalFileLocator = (locator: string): boolean => {
  try {
    const parsedUrl = new URL(locator);
    const platform = /^\/[A-Za-z]:\//.test(parsedUrl.pathname) ? 'win32' : 'posix';
    return parseLocalFileUrl(locator, platform) !== null;
  } catch {
    return false;
  }
};

const normalizeBrowserUrl = (locator: string): string => {
  if (
    locator.startsWith('blob:') ||
    locator.startsWith('data:') ||
    locator.startsWith('local-file://') ||
    locator.startsWith('file://') ||
    locator.startsWith('http://') ||
    locator.startsWith('https://')
  ) {
    return locator;
  }

  const baseUrl = resolveBoundNodeBaseUrl();
  if (locator.startsWith('/')) {
    return `${baseUrl}${locator}`;
  }

  if (locator.startsWith('rest/')) {
    return `${baseUrl}/${locator}`;
  }

  return locator;
};

const resolveWorkspacePreviewUrl = (input: {
  locator: string;
  workspaceId?: string | null;
  isEmbeddedElectronRuntime?: boolean;
}): string | null => {
  if (input.isEmbeddedElectronRuntime && isAbsoluteLocalPath(input.locator)) {
    return buildLocalFileUrl(input.locator);
  }

  if (!input.workspaceId) {
    return null;
  }

  const restBaseUrl = resolveBoundRestBaseUrl();
  return `${restBaseUrl}/workspaces/${input.workspaceId}/content?path=${encodeURIComponent(input.locator)}`;
};

const resolveBoundNodeBaseUrl = (): string => {
  try {
    const contextStore = useWindowNodeContextStore();
    if (contextStore.initialized) {
      return contextStore.nodeBaseUrl.replace(/\/$/, '');
    }
  } catch {
    // A non-Pinia browser utility can still use browser runtime configuration.
  }
  if (typeof window !== 'undefined' && window.electronAPI) {
    throw new Error('Electron attachment URL requested before window node binding.');
  }
  return getBrowserServerBaseUrl().replace(/\/$/, '');
};

const resolveBoundRestBaseUrl = (): string => {
  try {
    const contextStore = useWindowNodeContextStore();
    if (contextStore.initialized) {
      return contextStore.getBoundEndpoints().rest.replace(/\/$/, '');
    }
  } catch {
    // A non-Pinia browser utility can still use browser runtime configuration.
  }
  if (typeof window !== 'undefined' && window.electronAPI) {
    throw new Error('Electron attachment REST URL requested before window node binding.');
  }
  return getBrowserServerUrls().rest.replace(/\/$/, '');
};

export const contextAttachmentPresentation = {
  getKey(attachment: ContextAttachment): string {
    return attachment.id;
  },

  getDisplayLabel(attachment: ContextAttachment): string {
    return attachment.displayName;
  },

  isOpenable(attachment: ContextAttachment): boolean {
    if (!isBrowserOpenableContextAttachment(attachment)) {
      return false;
    }
    if (
      attachment.kind === 'external_url'
      && attachment.locator.toLowerCase().startsWith(`${LOCAL_FILE_SCHEME}:`)
    ) {
      return isCanonicalLocalFileLocator(attachment.locator);
    }
    return true;
  },

  resolveImagePreviewUrl(
    attachment: ContextAttachment,
    options: {
      workspaceId?: string | null;
      isEmbeddedElectronRuntime?: boolean;
      failedKeys?: Set<string>;
    } = {},
  ): string | null {
    if (attachment.type !== 'Image') {
      return null;
    }
    if (!this.isOpenable(attachment)) {
      return null;
    }
    if (options.failedKeys?.has(attachment.id)) {
      return null;
    }

    if (attachment.kind === 'workspace_path') {
      return resolveWorkspacePreviewUrl({
        locator: attachment.locator,
        workspaceId: options.workspaceId,
        isEmbeddedElectronRuntime: options.isEmbeddedElectronRuntime,
      });
    }

    return normalizeBrowserUrl(attachment.locator);
  },

  openAttachment(
    attachment: ContextAttachment,
    options: {
      workspaceId?: string | null;
      isEmbeddedElectronRuntime?: boolean;
      failedKeys?: Set<string>;
      preferFileViewerForPreviewableImages?: boolean;
      openWorkspaceFile?: (locator: string, workspaceId: string) => void;
      openFilePreview?: (url: string, workspaceId: string) => void;
      openBrowserUrl?: (url: string) => void;
    } = {},
  ): void {
    if (!this.isOpenable(attachment)) {
      return;
    }

    if (attachment.kind === 'workspace_path' && options.workspaceId && options.openWorkspaceFile) {
      options.openWorkspaceFile(attachment.locator, options.workspaceId);
      return;
    }

    const previewUrl =
      attachment.kind !== 'workspace_path'
        ? this.resolveImagePreviewUrl(attachment, {
            workspaceId: options.workspaceId,
            isEmbeddedElectronRuntime: options.isEmbeddedElectronRuntime,
            failedKeys: options.failedKeys,
          })
        : null;
    if (
      previewUrl &&
      options.preferFileViewerForPreviewableImages &&
      options.workspaceId &&
      options.openFilePreview
    ) {
      options.openFilePreview(previewUrl, options.workspaceId);
      return;
    }

    const fallbackWorkspaceUrl =
      attachment.kind === 'workspace_path'
        ? resolveWorkspacePreviewUrl({
            locator: attachment.locator,
            workspaceId: options.workspaceId,
            isEmbeddedElectronRuntime: options.isEmbeddedElectronRuntime,
          })
        : null;
    const browserUrl = fallbackWorkspaceUrl || normalizeBrowserUrl(attachment.locator);

    if (options.openBrowserUrl) {
      options.openBrowserUrl(browserUrl);
      return;
    }

    if (typeof window !== 'undefined') {
      window.open(browserUrl, '_blank', 'noopener,noreferrer');
    }
  },
};
