import type { TranslationCatalog } from './types';

export function mergeCatalogs(baseCatalog: TranslationCatalog, overrideCatalog: TranslationCatalog): TranslationCatalog {
  return {
    ...baseCatalog,
    ...overrideCatalog,
  };
}
