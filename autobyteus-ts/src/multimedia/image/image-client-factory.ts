import { Singleton } from '../../utils/singleton.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../utils/parameter-schema.js';
import { MultimediaProvider } from '../providers.js';
import { ImageModel } from './image-model.js';
import { BaseImageClient } from './base-image-client.js';
import { OpenAIImageClient } from './api/openai-image-client.js';
import { GeminiImageClient } from './api/gemini-image-client.js';
import { MultimediaConfig } from '../utils/multimedia-config.js';
import { AutobyteusImageModelProvider } from './autobyteus-image-provider.js';
import type { ResolvedMultimediaAuthentication } from '../multimedia-construction-context.js';

export class ImageClientFactory extends Singleton {
  protected static instance?: ImageClientFactory;

  private static modelsByIdentifier: Map<string, ImageModel> = new Map();
  private static initialized = false;

  constructor() {
    super();
    if (ImageClientFactory.instance) {
      return ImageClientFactory.instance;
    }
    ImageClientFactory.instance = this;
  }

  static ensureInitialized(): void {
    if (!ImageClientFactory.initialized) {
      ImageClientFactory.initializeRegistry();
      ImageClientFactory.initialized = true;
    }
  }

  static reinitialize(): void {
    ImageClientFactory.initialized = false;
    ImageClientFactory.modelsByIdentifier.clear();
    AutobyteusImageModelProvider.resetDiscovery();
    ImageClientFactory.ensureInitialized();
  }

  private static initializeRegistry(): void {
    const gptImageSchema = new ParameterSchema([
      new ParameterDefinition({
        name: 'n',
        type: ParameterType.INTEGER,
        defaultValue: 1,
        minValue: 1,
        maxValue: 1,
        description: 'The number of images to generate.'
      }),
      new ParameterDefinition({
        name: 'size',
        type: ParameterType.ENUM,
        defaultValue: '1024x1024',
        enumValues: ['1024x1024', '1792x1024', '1024x1792'],
        description: 'The size of the generated images.'
      }),
      new ParameterDefinition({
        name: 'quality',
        type: ParameterType.ENUM,
        defaultValue: 'auto',
        enumValues: ['auto', 'low', 'medium', 'high'],
        description: 'The quality of the image that will be generated.'
      })
    ]);

    const gptImage2Schema = new ParameterSchema([
      new ParameterDefinition({
        name: 'n',
        type: ParameterType.INTEGER,
        defaultValue: 1,
        minValue: 1,
        maxValue: 1,
        description: 'The number of images to generate.'
      }),
      new ParameterDefinition({
        name: 'size',
        type: ParameterType.ENUM,
        defaultValue: 'auto',
        enumValues: [
          'auto',
          '1024x1024',
          '1536x1024',
          '1024x1536',
          '2048x2048',
          '2048x1152',
          '3840x2160',
          '2160x3840'
        ],
        description: 'The size of the generated image. GPT Image 2 also accepts custom valid multiples of 16.'
      }),
      new ParameterDefinition({
        name: 'quality',
        type: ParameterType.ENUM,
        defaultValue: 'auto',
        enumValues: ['auto', 'low', 'medium', 'high'],
        description: 'The quality of the image that will be generated.'
      })
    ]);

    const gptImageModel = new ImageModel({
      name: 'gpt-image-1.5',
      value: 'gpt-image-1.5',
      provider: MultimediaProvider.OPENAI,
      authenticationRequirement: { kind: 'apiKey', credentialSlot: 'apiKey', required: true },
      clientClass: OpenAIImageClient,
      parameterSchema: gptImageSchema,
      description:
        "OpenAI's stateless image model with fast renders, improved text rendering, and higher fidelity edits."
    });

    const gptImage2Model = new ImageModel({
      name: 'gpt-image-2',
      value: 'gpt-image-2',
      provider: MultimediaProvider.OPENAI,
      authenticationRequirement: { kind: 'apiKey', credentialSlot: 'apiKey', required: true },
      clientClass: OpenAIImageClient,
      parameterSchema: gptImage2Schema,
      description:
        "OpenAI's state-of-the-art image generation and editing model with flexible image sizes."
    });

    const imagenModel = new ImageModel({
      name: 'imagen-4',
      value: 'imagen-4.0-generate-001',
      provider: MultimediaProvider.GEMINI,
      authenticationRequirement: { kind: 'googleAuthenticationMode' },
      clientClass: GeminiImageClient,
      parameterSchema: null,
      description: 'High-fidelity stateless model; text-to-image only.'
    });

    const geminiFlashImageModel = new ImageModel({
      name: 'gemini-2.5-flash-image',
      value: 'gemini-2.5-flash-image',
      provider: MultimediaProvider.GEMINI,
      authenticationRequirement: { kind: 'googleAuthenticationMode' },
      clientClass: GeminiImageClient,
      parameterSchema: null,
      description: 'Fast conversational multimodal image model.'
    });

    const gemini31FlashLiteImageModel = new ImageModel({
      name: 'gemini-3.1-flash-lite-image',
      value: 'gemini-3.1-flash-lite-image',
      provider: MultimediaProvider.GEMINI,
      authenticationRequirement: { kind: 'googleAuthenticationMode' },
      clientClass: GeminiImageClient,
      parameterSchema: null,
      description:
        'Fast, cost-efficient Gemini 3.1 Flash-Lite Image model with 1K output; best for lightweight image generation and edits, not multiple references or multi-turn editing.'
    });

    const gemini31FlashImageModel = new ImageModel({
      name: 'gemini-3.1-flash-image',
      value: 'gemini-3.1-flash-image',
      provider: MultimediaProvider.GEMINI,
      authenticationRequirement: { kind: 'googleAuthenticationMode' },
      clientClass: GeminiImageClient,
      parameterSchema: null,
      description: 'GA Nano Banana 2 / Gemini 3.1 Flash Image model for versatile image generation and editing.'
    });

    const geminiProImageModel = new ImageModel({
      name: 'gemini-3-pro-image',
      value: 'gemini-3-pro-image',
      provider: MultimediaProvider.GEMINI,
      authenticationRequirement: { kind: 'googleAuthenticationMode' },
      clientClass: GeminiImageClient,
      parameterSchema: null,
      description: 'GA Nano Banana Pro / Gemini 3 Pro Image model for high-quality complex image tasks.'
    });

    const modelsToRegister = [
      gptImageModel,
      gptImage2Model,
      imagenModel,
      geminiFlashImageModel,
      gemini31FlashLiteImageModel,
      gemini31FlashImageModel,
      geminiProImageModel
    ];
    for (const model of modelsToRegister) {
      ImageClientFactory.registerModel(model);
    }

  }

  static registerModel(model: ImageModel): void {
    const identifier = model.modelIdentifier;
    ImageClientFactory.modelsByIdentifier.set(identifier, model);
  }

  static describeConstructionTarget(modelIdentifier: string): ImageModel {
    ImageClientFactory.ensureInitialized();
    const model = ImageClientFactory.modelsByIdentifier.get(modelIdentifier);
    if (!model) {
      throw new Error(
        `No image model registered with the name '${modelIdentifier}'. Available models: ${Array.from(
          ImageClientFactory.modelsByIdentifier.keys()
        )}`
      );
    }
    return model;
  }

  static createImageClient(
    modelIdentifier: string,
    input: { configOverride?: MultimediaConfig | null; authentication: ResolvedMultimediaAuthentication },
  ): BaseImageClient {
    return ImageClientFactory.describeConstructionTarget(modelIdentifier).createClient(input);
  }

  static listModels(): ImageModel[] {
    ImageClientFactory.ensureInitialized();
    return Array.from(ImageClientFactory.modelsByIdentifier.values());
  }
}

export const imageClientFactory = ImageClientFactory.getInstance();
