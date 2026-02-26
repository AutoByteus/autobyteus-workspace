import { Singleton } from '../../utils/singleton.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../utils/parameter-schema.js';
import { MultimediaProvider } from '../providers.js';
import { ImageModel } from './image-model.js';
import { BaseImageClient } from './base-image-client.js';
import { OpenAIImageClient } from './api/openai-image-client.js';
import { GeminiImageClient } from './api/gemini-image-client.js';
import { MultimediaConfig } from '../utils/multimedia-config.js';
import { AutobyteusImageModelProvider } from './autobyteus-image-provider.js';

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

    const gptImageModel = new ImageModel({
      name: 'gpt-image-1.5',
      value: 'gpt-image-1.5',
      provider: MultimediaProvider.OPENAI,
      clientClass: OpenAIImageClient,
      parameterSchema: gptImageSchema,
      description:
        "OpenAI's latest stateless image model with faster renders, improved text rendering, and higher fidelity edits."
    });

    const imagenModel = new ImageModel({
      name: 'imagen-4',
      value: 'imagen-4.0-generate-001',
      provider: MultimediaProvider.GEMINI,
      clientClass: GeminiImageClient,
      parameterSchema: null,
      description: 'High-fidelity stateless model; text-to-image only.'
    });

    const geminiFlashImageModel = new ImageModel({
      name: 'gemini-2.5-flash-image',
      value: 'gemini-2.5-flash-image',
      provider: MultimediaProvider.GEMINI,
      clientClass: GeminiImageClient,
      parameterSchema: null,
      description: 'Fast conversational multimodal image model.'
    });

    const geminiProImageModel = new ImageModel({
      name: 'gemini-3-pro-image-preview',
      value: 'gemini-3-pro-image-preview',
      provider: MultimediaProvider.GEMINI,
      clientClass: GeminiImageClient,
      parameterSchema: null,
      description: 'High-quality conversational image model for complex edits.'
    });

    const modelsToRegister = [gptImageModel, imagenModel, geminiFlashImageModel, geminiProImageModel];
    for (const model of modelsToRegister) {
      ImageClientFactory.registerModel(model);
    }

    void AutobyteusImageModelProvider.ensureDiscovered();
  }

  static registerModel(model: ImageModel): void {
    const identifier = model.modelIdentifier;
    ImageClientFactory.modelsByIdentifier.set(identifier, model);
  }

  static createImageClient(modelIdentifier: string, configOverride?: MultimediaConfig | null): BaseImageClient {
    ImageClientFactory.ensureInitialized();
    const model = ImageClientFactory.modelsByIdentifier.get(modelIdentifier);
    if (!model) {
      throw new Error(
        `No image model registered with the name '${modelIdentifier}'. Available models: ${Array.from(
          ImageClientFactory.modelsByIdentifier.keys()
        )}`
      );
    }
    return model.createClient(configOverride ?? undefined);
  }

  static listModels(): ImageModel[] {
    ImageClientFactory.ensureInitialized();
    return Array.from(ImageClientFactory.modelsByIdentifier.values());
  }
}

export const imageClientFactory = ImageClientFactory.getInstance();
