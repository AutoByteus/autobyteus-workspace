import { config } from '@vue/test-utils';

const fallbackTranslate = (key: string): string => {
  const tail = key.split('.').pop() || key;
  const normalized = tail
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase();

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

config.global.mocks = {
  ...(config.global.mocks ?? {}),
  $t: (key: string) => fallbackTranslate(key),
  $localization: {
    translate: (key: string) => fallbackTranslate(key),
  },
};
