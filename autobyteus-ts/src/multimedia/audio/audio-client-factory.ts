import { Singleton } from '../../utils/singleton.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../utils/parameter-schema.js';
import { MultimediaProvider } from '../providers.js';
import { AudioModel } from './audio-model.js';
import { BaseAudioClient } from './base-audio-client.js';
import { GeminiAudioClient } from './api/gemini-audio-client.js';
import { OpenAIAudioClient } from './api/openai-audio-client.js';
import { MultimediaConfig } from '../utils/multimedia-config.js';
import { MultimediaRuntime } from '../runtimes.js';
import type { ProviderApiKeyResolver } from '../../secrets/provider-api-key-resolver.js';
import type { GeminiRuntimeResolver } from '../../utils/gemini-runtime.js';

import { GEMINI_TTS_VOICES, GEMINI_VOICE_METADATA_DESC, GEMINI_SINGLE_VOICE_DESC } from './gemini-tts-voices.js';

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
    AudioClientFactory.ensureInitialized();
    AudioClientFactory.modelsByIdentifier.clear();
    AudioClientFactory.initializeRegistry();
    AudioClientFactory.initialized = true;
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
        description: `The featured prebuilt voice to assign to this dialogue speaker.${GEMINI_VOICE_METADATA_DESC}`,
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
        type: ParameterType.STRING,
        defaultValue: 'Kore',
        pattern: '^\\S(?:[\\s\\S]*\\S)?$',
        description: GEMINI_SINGLE_VOICE_DESC
      }),
      new ParameterDefinition({
        name: 'style_instructions',
        type: ParameterType.STRING,
        description: 'Optional global delivery instructions, separate from the transcript; fallback for turns without a nonempty override.'
      }),
      new ParameterDefinition({
        name: 'speaker_mapping',
        type: ParameterType.ARRAY,
        description:
          'Required for multi-speaker mode. One or two unique speakers matching prompt labels, mapped to featured prebuilt voices only.',
        arrayItemSchema: speakerMappingItemSchema
      }),
      new ParameterDefinition({
        name: 'turn_styles',
        type: ParameterType.ARRAY,
        description:
          'Optional multi-speaker-only ordered style entries, exactly one per dialogue line. A nonempty string overrides global style; null or empty/whitespace inherits it. Wrong count/type fails before generation. Omit the array to use global style for all turns.',
        arrayItemSchema: { anyOf: [{ type: 'string' }, { type: 'null' }] }
      })
    ]);

    const createGeminiTtsModel = (name: string, value: string): AudioModel =>
      new AudioModel({
        name,
        value,
        provider: MultimediaProvider.GEMINI,
        clientClass: GeminiAudioClient,
        parameterSchema: geminiTtsSchema
      });

    const geminiTtsModels = [
      createGeminiTtsModel('gemini-3.8-flash-tts', 'gemini-3.8-flash-tts'),
      createGeminiTtsModel('gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-lite-tts')
    ];

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

    const modelsToRegister = [openaiTtsModel, ...geminiTtsModels];
    for (const model of modelsToRegister) {
      AudioClientFactory.registerModel(model);
    }

  }

  static registerModel(model: AudioModel): void {
    const identifier = model.modelIdentifier;
    AudioClientFactory.modelsByIdentifier.set(identifier, model);
  }

  static hasRegisteredModel(modelIdentifier: string): boolean {
    AudioClientFactory.ensureInitialized();
    return AudioClientFactory.modelsByIdentifier.has(modelIdentifier);
  }

  private static requireModel(modelIdentifier: string): AudioModel {
    AudioClientFactory.ensureInitialized();
    const model = AudioClientFactory.modelsByIdentifier.get(modelIdentifier);
    if (!model) {
      throw new Error(
        `No audio model registered with the name '${modelIdentifier}'. Available models: ${Array.from(
          AudioClientFactory.modelsByIdentifier.keys()
        )}`
      );
    }
    return model;
  }


  static requiresGeminiRuntimeResolver(modelIdentifier: string): boolean {
    const model = AudioClientFactory.requireModel(modelIdentifier);
    return model.runtime === MultimediaRuntime.API
      && model.provider === MultimediaProvider.GEMINI;
  }

  static createAudioClient(
    modelIdentifier: string,
    configOverride: MultimediaConfig | null | undefined,
    apiKeyResolver: ProviderApiKeyResolver,
    geminiRuntimeResolver?: GeminiRuntimeResolver,
  ): BaseAudioClient {
    return AudioClientFactory.requireModel(modelIdentifier).createClient(configOverride, apiKeyResolver, geminiRuntimeResolver);
  }

  static listModels(): AudioModel[] {
    AudioClientFactory.ensureInitialized();
    return Array.from(AudioClientFactory.modelsByIdentifier.values());
  }
}

export const audioClientFactory = AudioClientFactory.getInstance();
