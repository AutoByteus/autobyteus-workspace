import type { TranslationCatalog } from '../../runtime/types';

/** The status line of a voice transcript target (`components/voiceInput/VoiceTargetStatus.vue`). */
const voiceInputMessages = {
  'voiceInput.status.starting': '正在启动语音输入…',
  'voiceInput.status.recording': '正在录音…完成后点击停止。',
  'voiceInput.status.transcribing': '正在转录语音输入…',
  'voiceInput.status.cancel': '取消录音',
  'voiceInput.status.noSpeech': '未检测到语音。请重试或直接输入。',
  'voiceInput.status.failed': '语音转录失败。文本未改变。请重试或直接输入。',
} satisfies TranslationCatalog;

export default voiceInputMessages;
