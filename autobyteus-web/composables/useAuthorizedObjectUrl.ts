import { onBeforeUnmount, ref, watch, type Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore';
import {
  fetchAuthorizedResourceBlob,
  shouldLoadResourceThroughAuthorizedFetchWithCredential,
} from '~/utils/remoteAccess/authorizedResourceUrl';

type UrlSource = () => string | null | undefined;

const revokeObjectUrl = (url: string | null): void => {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

const normalizedSources = (sources: string[]): string[] => (
  [...new Set(sources.map((url) => url.trim()).filter(Boolean))]
);

/**
 * A displayable URL for a resource: an object URL of its bytes where the node key must be sent (the phone), else the URL
 * itself. `revision` (an open file's `contentRevision`, autobyteus-450) reloads the same URL: a reload always reads the
 * bytes again (`no-store`) into an object URL, since a browser shows an image it already has for a URL it saw before.
 */
export function useAuthorizedObjectUrl(source: UrlSource, options: Readonly<{ revision?: () => number }> = {}): {
  resolvedUrl: Ref<string | null>;
  error: Ref<string | null>;
  refresh: () => Promise<void>;
} {
  const resolvedUrl = ref<string | null>(null);
  const error = ref<string | null>(null);
  let activeObjectUrl: string | null = null;
  let loadToken = 0;
  const { activeCredential } = storeToRefs(useMobileNodeSessionStore());

  const clearObjectUrl = (): void => {
    revokeObjectUrl(activeObjectUrl);
    activeObjectUrl = null;
  };

  const refresh = async (): Promise<void> => {
    const currentToken = ++loadToken;
    const nextSource = source()?.trim() || null;
    const credentialSnapshot = activeCredential.value;
    resolvedUrl.value = null;
    error.value = null;
    clearObjectUrl();

    if (!nextSource) {
      resolvedUrl.value = null;
      return;
    }

    const reloaded = (options.revision?.() ?? 0) > 0 && !/^(blob:|data:)/i.test(nextSource);
    if (!reloaded && !shouldLoadResourceThroughAuthorizedFetchWithCredential(nextSource, credentialSnapshot)) {
      resolvedUrl.value = nextSource;
      return;
    }

    try {
      const blob = await fetchAuthorizedResourceBlob(nextSource, {}, credentialSnapshot);
      if (currentToken !== loadToken) {
        return;
      }
      activeObjectUrl = URL.createObjectURL(blob);
      resolvedUrl.value = activeObjectUrl;
    } catch (fetchError) {
      if (currentToken !== loadToken) {
        return;
      }
      error.value = fetchError instanceof Error ? fetchError.message : String(fetchError);
      resolvedUrl.value = null;
    }
  };

  watch(
    [() => source()?.trim() || null, activeCredential, () => options.revision?.() ?? 0],
    () => {
      void refresh();
    },
    { immediate: true, flush: 'sync' },
  );

  onBeforeUnmount(() => {
    loadToken += 1;
    resolvedUrl.value = null;
    error.value = null;
    clearObjectUrl();
  });

  return { resolvedUrl, error, refresh };
}

export function useAuthorizedObjectUrlMap(sourceUrls: () => string[]): {
  resolvedUrlsBySource: Ref<Record<string, string>>;
  errorsBySource: Ref<Record<string, string>>;
  resolveUrl: (sourceUrl: string) => string | null;
  refresh: () => Promise<void>;
} {
  const resolvedUrlsBySource = ref<Record<string, string>>({});
  const errorsBySource = ref<Record<string, string>>({});
  let objectUrls: string[] = [];
  let loadToken = 0;
  const { activeCredential } = storeToRefs(useMobileNodeSessionStore());

  const clearObjectUrls = (): void => {
    for (const objectUrl of objectUrls) {
      revokeObjectUrl(objectUrl);
    }
    objectUrls = [];
  };

  const refresh = async (): Promise<void> => {
    const currentToken = ++loadToken;
    const uniqueSources = normalizedSources(sourceUrls());
    const credentialSnapshot = activeCredential.value;
    resolvedUrlsBySource.value = {};
    errorsBySource.value = {};
    clearObjectUrls();

    const nextResolved: Record<string, string> = {};
    const nextErrors: Record<string, string> = {};
    const generationObjectUrls: string[] = [];
    const cleanStaleGeneration = (): void => {
      for (const objectUrl of generationObjectUrls) {
        revokeObjectUrl(objectUrl);
      }
    };
    for (const sourceUrl of uniqueSources) {
      if (!shouldLoadResourceThroughAuthorizedFetchWithCredential(sourceUrl, credentialSnapshot)) {
        nextResolved[sourceUrl] = sourceUrl;
        continue;
      }

      try {
        const blob = await fetchAuthorizedResourceBlob(sourceUrl, {}, credentialSnapshot);
        if (currentToken !== loadToken) {
          cleanStaleGeneration();
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        generationObjectUrls.push(objectUrl);
        nextResolved[sourceUrl] = objectUrl;
      } catch (fetchError) {
        if (currentToken !== loadToken) {
          cleanStaleGeneration();
          return;
        }
        nextErrors[sourceUrl] = fetchError instanceof Error ? fetchError.message : String(fetchError);
      }
    }

    if (currentToken === loadToken) {
      objectUrls = generationObjectUrls;
      resolvedUrlsBySource.value = nextResolved;
      errorsBySource.value = nextErrors;
    } else {
      cleanStaleGeneration();
    }
  };

  watch(
    [() => JSON.stringify(normalizedSources(sourceUrls())), activeCredential],
    () => {
      void refresh();
    },
    { immediate: true, flush: 'sync' },
  );

  onBeforeUnmount(() => {
    loadToken += 1;
    resolvedUrlsBySource.value = {};
    errorsBySource.value = {};
    clearObjectUrls();
  });

  return {
    resolvedUrlsBySource,
    errorsBySource,
    resolveUrl: (sourceUrl: string) => resolvedUrlsBySource.value[sourceUrl] ?? null,
    refresh,
  };
}
