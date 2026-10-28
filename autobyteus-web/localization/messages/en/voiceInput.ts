import type { TranslationCatalog } from '../../runtime/types';

/** The status line of a voice transcript target (`components/voiceInput/VoiceTargetStatus.vue`). */
const voiceInputMessages = {
  'voiceInput.status.starting': 'Starting voice input…',
  'voiceInput.status.recording': 'Recording… Tap stop when you are done.',
  'voiceInput.status.transcribing': 'Transcribing voice input…',
  'voiceInput.status.cancel': 'Cancel recording',
  'voiceInput.status.noSpeech': 'No speech detected. Try again or type instead.',
  'voiceInput.status.failed': 'Voice input could not be transcribed. Your text is unchanged. Try again or type instead.',
} satisfies TranslationCatalog;

export default voiceInputMessages;
