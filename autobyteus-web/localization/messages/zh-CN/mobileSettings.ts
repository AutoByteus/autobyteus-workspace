import type { TranslationCatalog } from '../../runtime/types';

// The phone's run Settings (autobyteus-458, autobyteus-522): the specification's keys.
const messages = {
  "mobile.settings.menuEntry": "设置",
  "mobile.settings.title": "设置",
  "mobile.settings.stopRun": "停止运行",
  "mobile.settings.save": "保存",
  "mobile.settings.remoteRun": "此运行位于 {{node}}。只能在该节点上更改它的运行时和模型。",
} satisfies TranslationCatalog;

export default messages;
