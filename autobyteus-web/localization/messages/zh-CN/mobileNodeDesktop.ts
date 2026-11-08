import type { TranslationCatalog } from '../../runtime/types';

// The phone's VNC Viewer view (autobyteus-407); its stream states share the desktop tile's keys.
const messages = {
  "mobile.nodeDesktop.title": "VNC 查看器",
  "mobile.nodeDesktop.view_only": "仅查看",
  "mobile.nodeDesktop.control": "控制",
  "mobile.nodeDesktop.keyboard": "键盘",
  "mobile.nodeDesktop.fit": "适应屏幕",
  "mobile.nodeDesktop.full_screen": "全屏",
  "mobile.nodeDesktop.show_controls": "显示控件",
  "mobile.nodeDesktop.keyboard_input": "在节点桌面上输入",
  "mobile.nodeDesktop.clipboard": "剪贴板",
  "mobile.nodeDesktop.clipboard_paste_heading": "粘贴到桌面",
  "mobile.nodeDesktop.clipboard_paste_label": "在此粘贴文本",
  "mobile.nodeDesktop.clipboard_send": "发送到桌面",
  "mobile.nodeDesktop.clipboard_copy_heading": "从桌面复制",
  "mobile.nodeDesktop.clipboard_copy": "复制",
  "mobile.nodeDesktop.clipboard_copied": "已复制",
  "mobile.nodeDesktop.clipboard_copy_empty": "请先在桌面上复制内容。",
  "mobile.nodeDesktop.clipboard_copy_fallback": "长按文本即可复制。",
} satisfies TranslationCatalog;

export default messages;
