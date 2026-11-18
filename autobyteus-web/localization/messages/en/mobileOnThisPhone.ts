import type { TranslationCatalog } from '../../runtime/types';

// The run list's ⋮ menu of the phone's own preferences, Text size first (autobyteus-506, autobyteus-525); its title is the
// menu's accessible name only, not shown (autobyteus-534).
const messages = {
  "mobile.onThisPhone.title": "On this phone",
  "mobile.onThisPhone.close": "Close menu",
  "mobile.onThisPhone.textSize": "Text size",
  "mobile.onThisPhone.textSize.standard": "Standard",
  "mobile.onThisPhone.textSize.large": "Large",
  "mobile.onThisPhone.textSize.largest": "Largest",
} satisfies TranslationCatalog;

export default messages;
