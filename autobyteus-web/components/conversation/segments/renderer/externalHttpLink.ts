const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';

const readRuntimeHref = (anchor: Element): string | null => {
  const runtimeHref = (anchor as Element & { href?: unknown }).href;
  if (typeof runtimeHref === 'string') return runtimeHref;
  if (
    runtimeHref
    && typeof runtimeHref === 'object'
    && 'baseVal' in runtimeHref
    && typeof runtimeHref.baseVal === 'string'
  ) {
    return runtimeHref.baseVal;
  }
  return null;
};

export const readAnchorHref = (anchor: Element): string | null => {
  const href = anchor.getAttribute('href');
  if (href !== null) return href;

  const namespacedHref = anchor.getAttributeNS(XLINK_NAMESPACE, 'href');
  if (namespacedHref !== null) return namespacedHref;

  const prefixedHref = anchor.getAttribute('xlink:href');
  if (prefixedHref !== null) return prefixedHref;

  return readRuntimeHref(anchor);
};

export const resolveExternalHttpUrl = (
  anchor: Element,
  baseUrl: string,
): string | null => {
  const href = readAnchorHref(anchor);
  if (href === null) return null;

  try {
    const url = new URL(href, baseUrl);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};
