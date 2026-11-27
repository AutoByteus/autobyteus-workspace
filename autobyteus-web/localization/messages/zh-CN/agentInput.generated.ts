import type { TranslationCatalog } from '../../runtime/types';

const messages = {
  'agentInput.components.agentInput.AgentUserInputTextArea.compaction_retry': '上下文压缩失败 — 发送消息以重试',

  'agentInput.components.agentInput.AgentUserInputTextArea.type_a_message': '输入消息...',
  'agentInput.components.agentInput.AgentUserInputTextArea.voicebuttontitle': '语音按钮标题',
  'agentInput.components.agentInput.ContextFilePathInputArea.cancel_upload': '取消上传 {{name}}',
  'agentInput.components.agentInput.ContextFilePathInputArea.clear_all': '全部清除',
  'agentInput.components.agentInput.ContextFilePathInputArea.context_image_thumbnail': '上下文图像缩略图',
  'agentInput.components.agentInput.ContextFilePathInputArea.drag_paste_or_upload': '（拖动、粘贴或上传）',
  'agentInput.components.agentInput.ContextFilePathInputArea.item_filepath_path': '项目.文件路径.路径',
  'agentInput.components.agentInput.ContextFilePathInputArea.open_image_preview': '打开图像预览',
  'agentInput.components.agentInput.ContextFilePathInputArea.remove_failed': '无法移除 {{name}}。',
  'agentInput.components.agentInput.ContextFilePathInputArea.remove_file': '删除文件',
  'agentInput.components.agentInput.ContextFilePathInputArea.remove_this_file': '删除该文件',
  'agentInput.components.agentInput.ContextFilePathInputArea.upload_failed': '无法附加 {{name}}。',
  'agentInput.components.agentInput.ContextFilePathInputArea.upload_files': '上传文件',
  'agentInput.components.agentInput.ContextFilePathInputArea.upload_interrupted': '无法附加 {{name}}：上传中断，请检查网络后重试。',
  'agentInput.components.agentInput.ContextFilePathInputArea.upload_progress': '{{percent}}%',
  'agentInput.components.agentInput.ContextFilePathInputArea.upload_too_large': '无法附加 {{name}}：文件超过 {{limit}} 大小限制。',
  'agentInput.components.agentInput.ContextFilePathInputArea.upload_unsupported_type': '无法附加 {{name}}：不支持此文件类型。',
  'agentInput.components.agentInput.ContextFilePathInputArea.uploads_unavailable': '该智能体当前无法接收上传的文件。',
  'agentInput.components.agentInput.GroupedSelect.auto_execute_tools': '自动执行工具',
  'agentInput.components.agentInput.GroupedSelect.no_models_found': '没有找到型号。',
  'agentInput.components.agentInput.GroupedSelect.search_models': '搜索型号...',
  'agentInput.components.agentInput.MessagePrimaryActionButton.send_message': '发送消息',
  'agentInput.components.agentInput.MessagePrimaryActionButton.stop_generation': '停止生成',
} satisfies TranslationCatalog;

export default messages;
