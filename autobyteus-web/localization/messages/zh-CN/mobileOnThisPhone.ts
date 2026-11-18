import type { TranslationCatalog } from '../../runtime/types';

// The run list's ⋮ menu of the phone's own preferences, Text size first (autobyteus-506, autobyteus-525); its title is the
// menu's accessible name only, not shown (autobyteus-534).
const messages = {
  "mobile.onThisPhone.title": "本机设置",
  "mobile.onThisPhone.close": "关闭菜单",
  "mobile.onThisPhone.textSize": "文字大小",
  "mobile.onThisPhone.textSize.standard": "标准",
  "mobile.onThisPhone.textSize.large": "大",
  "mobile.onThisPhone.textSize.largest": "特大",
} satisfies TranslationCatalog;

export default messages;
