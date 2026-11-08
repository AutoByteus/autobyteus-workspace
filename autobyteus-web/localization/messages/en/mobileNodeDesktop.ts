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
  "mobile.nodeDesktop.clipboard": "Clipboard",
  "mobile.nodeDesktop.clipboard_paste_heading": "Paste to the desktop",
  "mobile.nodeDesktop.clipboard_paste_label": "Paste text here",
  "mobile.nodeDesktop.clipboard_send": "Send to desktop",
  "mobile.nodeDesktop.clipboard_copy_heading": "Copy from the desktop",
  "mobile.nodeDesktop.clipboard_copy": "Copy",
  "mobile.nodeDesktop.clipboard_copied": "Copied",
  "mobile.nodeDesktop.clipboard_copy_empty": "Copy something on the desktop first.",
  "mobile.nodeDesktop.clipboard_copy_fallback": "Long-press the text to copy it.",
} satisfies TranslationCatalog;

export default messages;
