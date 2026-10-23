import type { TranslationCatalog } from '../../runtime/types';

// remote-runs-in-tree: 另一个节点为本节点的委派运行的任务。
const remoteRunsMessages = {
  'remote.chip.label': '运行在 {{node}} 上',
  'remote.row.accessible': '在 {{node}} 上',
  'remote.row.unreachable': '无法连接 {{node}}。',
  'remote.row.checking': '正在检查 {{node}}…',
  'remote.row.retry': '重试',
  'remote.row.retryAria': '重试连接 {{node}}',
  'remote.row.stopFailed': '无法停止：{{node}} 无法连接。',
  'remote.view.title': '无法连接 {{node}}',
  'remote.view.detail': '暂时无法加载此运行的对话。你的其他运行不受影响。节点恢复后请重试。',
  'remote.view.sendFailed': '未发送：{{node}} 无法连接。',
  'remote.panel.title': '在 {{node}} 上',
  'remote.panel.files': '此运行的文件在 {{node}} 上。请在该节点的窗口中打开它来查看。',
  'remote.panel.terminal': '此运行的终端在 {{node}} 上。请在该节点的窗口中打开它来使用。',
  'remote.panel.artifacts': '此运行写入的文件在 {{node}} 上。请在该节点的窗口中打开它来查看。',
  'remote.panel.vnc': '此运行的屏幕在 {{node}} 上。请在该节点的窗口中打开它来查看。',
  'remote.composer.placeholder': '向 {{node}} 上的 {{agent}} 发消息…',
  'remote.filePath': '该文件在 {{node}} 上：请在该节点的窗口中打开此运行来查看。',
} satisfies TranslationCatalog;

export default remoteRunsMessages;
