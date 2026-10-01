import type { ChatModelOption } from '~/composables/chat/useChatModelCatalog'

/** The full, untruncated row text for `title` / `aria-label`: label, then the secondary line. */
export const chatModelOptionFullText = (option: ChatModelOption): string =>
  [option.label, option.secondary].filter(Boolean).join(' — ')
