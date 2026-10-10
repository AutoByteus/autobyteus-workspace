import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';

/** The absolute URL of an attachment locator on the bound node (absolute locators pass through). */
export const resolveContextAttachmentUrl = (locator: string): string => {
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(locator)) {
    return locator;
  }
  const windowNodeContextStore = useWindowNodeContextStore();
  if (!windowNodeContextStore.initialized) {
    throw new Error('Attachment fetch requested before window node binding.');
  }
  const baseUrl = windowNodeContextStore.nodeBaseUrl.replace(/\/$/, '');
  return locator.startsWith('/') ? `${baseUrl}${locator}` : `${baseUrl}/${locator}`;
};
