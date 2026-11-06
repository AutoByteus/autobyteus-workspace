import type { TranslationCatalog } from '../../runtime/types';

// The phone's VNC Viewer view (autobyteus-407); its stream states share the desktop tile's keys.
const messages = {
  "mobile.nodeDesktop.title": "VNC Viewer",
  "mobile.nodeDesktop.view_only": "View only",
  "mobile.nodeDesktop.control": "Control",
  "mobile.nodeDesktop.keyboard": "Keyboard",
  "mobile.nodeDesktop.fit": "Fit",
  "mobile.nodeDesktop.full_screen": "Full screen",
  "mobile.nodeDesktop.show_controls": "Show controls",
  "mobile.nodeDesktop.keyboard_input": "Type on the node desktop",
} satisfies TranslationCatalog;

export default messages;
