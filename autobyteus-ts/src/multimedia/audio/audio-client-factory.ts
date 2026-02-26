import { Singleton } from '../../utils/singleton.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../utils/parameter-schema.js';
import { MultimediaProvider } from '../providers.js';
import { AudioModel } from './audio-model.js';
import { BaseAudioClient } from './base-audio-client.js';
import { GeminiAudioClient } from './api/gemini-audio-client.js';
import { OpenAIAudioClient } from './api/openai-audio-client.js';
import { MultimediaConfig } from '../utils/multimedia-config.js';
import { AutobyteusAudioModelProvider } from './autobyteus-audio-provider.js';

const GEMINI_VOICE_DETAILS: Record<string, { gender: string; description: string }> = {
  Zephyr: { gender: 'female', description: 'Bright, Higher pitch' },
  Puck: { gender: 'male', description: 'Upbeat, Middle pitch' },
  Charon: { gender: 'male', description: 'Informative, Lower pitch' },
  Kore: { gender: 'female', description: 'Firm, Middle pitch' },
  Fenrir: { gender: 'male', description: 'Excitable, Lower middle pitch' },
  Leda: { gender: 'female', description: 'Youthful, Higher pitch' },
  Orus: { gender: 'male', description: 'Firm, Lower middle pitch' },
  Aoede: { gender: 'female', description: 'Breezy, Middle pitch' },
  Callirrhoe: { gender: 'female', description: 'Easy-going, Middle pitch' },
  Autonoe: { gender: 'female', description: 'Bright, Middle pitch' },
  Enceladus: { gender: 'male', description: 'Breathy, Lower pitch' },
  Iapetus: { gender: 'male', description: 'Clear, Lower middle pitch' },
  Umbriel: { gender: 'male', description: 'Easy-going, Lower middle pitch' },
  Algieba: { gender: 'male', description: 'Smooth, Lower pitch' },
  Despina: { gender: 'female', description: 'Smooth, Middle pitch' },
  Erinome: { gender: 'female', description: 'Clear, Middle pitch' },
  Algenib: { gender: 'male', description: 'Gravelly, Lower pitch' },
  Rasalgethi: { gender: 'male', description: 'Informative, Middle pitch' },
  Laomedeia: { gender: 'female', description: 'Upbeat, Higher pitch' },
  Achernar: { gender: 'female', description: 'Soft, Higher pitch' },
  Alnilam: { gender: 'male', description: 'Firm, Lower middle pitch' },
  Schedar: { gender: 'male', description: 'Even, Lower middle pitch' },
  Gacrux: { gender: 'female', description: 'Mature, Middle pitch' },
  Pulcherrima: { gender: 'female', description: 'Forward, Middle pitch' },
  Achird: { gender: 'male', description: 'Friendly, Lower middle pitch' },
  Zubenelgenubi: { gender: 'male', description: 'Casual, Lower middle pitch' },
  Vindemiatrix: { gender: 'female', description: 'Gentle, Middle pitch' },
  Sadachbia: { gender: 'male', description: 'Lively, Lower pitch' },
  Sadaltager: { gender: 'male', description: 'Knowledgeable, Middle pitch' },
  Sulafat: { gender: 'female', description: 'Warm, Middle pitch' }
};

const GEMINI_TTS_VOICES = Object.keys(GEMINI_VOICE_DETAILS);
const GEMINI_VOICE_METADATA_DESC =
  '\n\nDetailed Voice Options:\n' +
  GEMINI_TTS_VOICES.map((name) => `- ${name} (${GEMINI_VOICE_DETAILS[name].gender}): ${GEMINI_VOICE_DETAILS[name].description}`).join('\n');

const OPENAI_TTS_VOICES = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'onyx',
  'nova',
  'sage',
  'shimmer',
  'verse'
];

export class AudioClientFactory extends Singleton {
  protected static instance?: AudioClientFactory;

  private static modelsByIdentifier: Map<string, AudioModel> = new Map();
  private static initialized = false;

  constructor() {
    super();
    if (AudioClientFactory.instance) {
      return AudioClientFactory.instance;
    }
    AudioClientFactory.instance = this;
  }

  static ensureInitialized(): void {
    if (!AudioClientFactory.initialized) {
      AudioClientFactory.initializeRegistry();
      AudioClientFactory.initialized = true;
    }
  }

  static reinitialize(): void {
    AudioClientFactory.initialized = false;
    AudioClientFactory.modelsByIdentifier.clear();
    AutobyteusAudioModelProvider.resetDiscovery();
    AudioClientFactory.ensureInitialized();
  }

  private static initializeRegistry(): void {
    const speakerMappingItemSchema = new ParameterSchema([
      new ParameterDefinition({
        name: 'speaker',
        type: ParameterType.STRING,
        description: "The speaker's name as it appears in the prompt (e.g., 'Joe').",
        required: true
      }),
      new ParameterDefinition({
        name: 'voice',
        type: ParameterType.ENUM,
        description: `The voice to assign to this speaker.${GEMINI_VOICE_METADATA_DESC}`,
        enumValues: GEMINI_TTS_VOICES,
        required: true
      })
    ]);

    const geminiTtsSchema = new ParameterSchema([
      new ParameterDefinition({
        name: 'mode',
        type: ParameterType.ENUM,
        defaultValue: 'single-speaker',
        enumValues: ['single-speaker', 'multi-speaker'],
        description:
          "The speech generation mode. 'single-speaker' for a consistent voice, or 'multi-speaker' to assign different voices to speakers identified in the prompt."
      }),
      new ParameterDefinition({
        name: 'voice_name',
        type: ParameterType.ENUM,
        defaultValue: 'Kore',
        enumValues: GEMINI_TTS_VOICES,
        description: `The voice to use for single-speaker generation.${GEMINI_VOICE_METADATA_DESC}`
      }),
      new ParameterDefinition({
        name: 'style_instructions',
        type: ParameterType.STRING,
        description: "Optional instructions on the style of speech, e.g., 'Say this in a dramatic whisper'."
      }),
      new ParameterDefinition({
        name: 'speaker_mapping',
        type: ParameterType.ARRAY,
        description:
          'Required for multi-speaker mode. A list of objects, each mapping a speaker name from the prompt to a voice name.',
        arrayItemSchema: speakerMappingItemSchema
      })
    ]);

    const geminiTtsModel = new AudioModel({
      name: 'gemini-2.5-flash-tts',
      value: 'gemini-2.5-flash-preview-tts',
      provider: MultimediaProvider.GEMINI,
      clientClass: GeminiAudioClient,
      parameterSchema: geminiTtsSchema
    });

    const openaiTtsSchema = new ParameterSchema([
      new ParameterDefinition({
        name: 'voice',
        type: ParameterType.ENUM,
        defaultValue: 'alloy',
        enumValues: OPENAI_TTS_VOICES,
        description: 'The OpenAI TTS voice to use for generation.'
      }),
      new ParameterDefinition({
        name: 'format',
        type: ParameterType.ENUM,
        defaultValue: 'mp3',
        enumValues: ['mp3', 'wav'],
        description: 'The audio format to generate.'
      }),
      new ParameterDefinition({
        name: 'instructions',
        type: ParameterType.STRING,
        description: 'Optional delivery instructions (tone, pacing, accent, etc.).'
      })
    ]);

    const openaiTtsModel = new AudioModel({
      name: 'gpt-4o-mini-tts',
      value: 'gpt-4o-mini-tts',
      provider: MultimediaProvider.OPENAI,
      clientClass: OpenAIAudioClient,
      parameterSchema: openaiTtsSchema
    });

    const modelsToRegister = [openaiTtsModel, geminiTtsModel];
    for (const model of modelsToRegister) {
      AudioClientFactory.registerModel(model);
    }

    void AutobyteusAudioModelProvider.ensureDiscovered();
  }

  static registerModel(model: AudioModel): void {
    const identifier = model.modelIdentifier;
    AudioClientFactory.modelsByIdentifier.set(identifier, model);
  }

  static createAudioClient(modelIdentifier: string, configOverride?: MultimediaConfig | null): BaseAudioClient {
    AudioClientFactory.ensureInitialized();
    const model = AudioClientFactory.modelsByIdentifier.get(modelIdentifier);
    if (!model) {
      throw new Error(
        `No audio model registered with the name '${modelIdentifier}'. Available models: ${Array.from(
          AudioClientFactory.modelsByIdentifier.keys()
        )}`
      );
    }
    return model.createClient(configOverride ?? undefined);
  }

  static listModels(): AudioModel[] {
    AudioClientFactory.ensureInitialized();
    return Array.from(AudioClientFactory.modelsByIdentifier.values());
  }
}

export const audioClientFactory = AudioClientFactory.getInstance();
