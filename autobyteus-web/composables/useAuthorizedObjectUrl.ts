import { onBeforeUnmount, ref, watch, type Ref } from 'vue';
import {
  fetchAuthorizedResourceBlob,
  shouldLoadResourceThroughAuthorizedFetch,
} from '~/utils/remoteAccess/authorizedResourceUrl';

type UrlSource = () => string | null | undefined;

const revokeObjectUrl = (url: string | null): void => {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

export function useAuthorizedObjectUrl(source: UrlSource): {
  resolvedUrl: Ref<string | null>;
  error: Ref<string | null>;
  refresh: () => Promise<void>;
} {
  const resolvedUrl = ref<string | null>(null);
  const error = ref<string | null>(null);
  let activeObjectUrl: string | null = null;
  let loadToken = 0;

  const clearObjectUrl = (): void => {
    revokeObjectUrl(activeObjectUrl);
    activeObjectUrl = null;
  };

  const refresh = async (): Promise<void> => {
    const currentToken = ++loadToken;
    const nextSource = source()?.trim() || null;
    error.value = null;
    clearObjectUrl();

    if (!nextSource) {
      resolvedUrl.value = null;
      return;
    }

    if (!shouldLoadResourceThroughAuthorizedFetch(nextSource)) {
      resolvedUrl.value = nextSource;
      return;
    }

    try {
      const blob = await fetchAuthorizedResourceBlob(nextSource);
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

  watch(source, () => {
    void refresh();
  }, { immediate: true });

  onBeforeUnmount(() => {
    loadToken += 1;
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

  const clearObjectUrls = (): void => {
    for (const objectUrl of objectUrls) {
      revokeObjectUrl(objectUrl);
    }
    objectUrls = [];
  };

  const refresh = async (): Promise<void> => {
    const currentToken = ++loadToken;
    const uniqueSources = [...new Set(sourceUrls().map((url) => url.trim()).filter(Boolean))];
    clearObjectUrls();
    errorsBySource.value = {};

    const nextResolved: Record<string, string> = {};
    for (const sourceUrl of uniqueSources) {
      if (!shouldLoadResourceThroughAuthorizedFetch(sourceUrl)) {
        nextResolved[sourceUrl] = sourceUrl;
        continue;
      }

      try {
        const blob = await fetchAuthorizedResourceBlob(sourceUrl);
        if (currentToken !== loadToken) {
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        objectUrls.push(objectUrl);
        nextResolved[sourceUrl] = objectUrl;
      } catch (fetchError) {
        if (currentToken !== loadToken) {
          return;
        }
        errorsBySource.value = {
          ...errorsBySource.value,
          [sourceUrl]: fetchError instanceof Error ? fetchError.message : String(fetchError),
        };
      }
    }

    if (currentToken === loadToken) {
      resolvedUrlsBySource.value = nextResolved;
    }
  };

  watch(
    () => sourceUrls().join('\u0000'),
    () => {
      void refresh();
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    loadToken += 1;
    clearObjectUrls();
  });

  return {
    resolvedUrlsBySource,
    errorsBySource,
    resolveUrl: (sourceUrl: string) => resolvedUrlsBySource.value[sourceUrl] ?? null,
    refresh,
  };
}
