import type { TranslationCatalog } from '../../runtime/types';

// The phone's run Settings and Text size (autobyteus-458, autobyteus-506, autobyteus-522): the specification's keys.
const messages = {
  "mobile.settings.menuEntry": "Settings",
  "mobile.settings.title": "Settings",
  "mobile.settings.stopRun": "Stop run",
  "mobile.settings.save": "Save",
  "mobile.settings.remoteRun": "This run is on {{node}}. Its runtime and model can be changed only on that node.",
  "mobile.settings.textSize": "Text size",
  "mobile.settings.textSize.small": "Small",
  "mobile.settings.textSize.standard": "Standard",
  "mobile.settings.textSize.large": "Large",
  "mobile.settings.textSize.largest": "Largest",
} satisfies TranslationCatalog;

export default messages;
