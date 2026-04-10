import type { SupportedLocale, TranslationCatalog } from './types';
import enMessages from '../messages/en';
import zhCnMessages from '../messages/zh-CN';

const catalogRegistry: Record<SupportedLocale, TranslationCatalog> = {
  en: enMessages,
  'zh-CN': zhCnMessages,
};

export function getCatalog(locale: SupportedLocale): TranslationCatalog {
  return catalogRegistry[locale];
}
