import { BaseTool } from '../base-tool.js';
import { ToolCategory } from '../tool-category.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../utils/parameter-schema.js';
import { AudioClientFactory } from '../../multimedia/audio/audio-client-factory.js';
import { downloadFileFromUrl } from '../../utils/download-utils.js';
import { resolveSafePath } from '../../utils/file-utils.js';

type WorkspaceLike = { getBasePath?: () => string };
type AgentContextLike = { agentId?: string; workspace?: WorkspaceLike | null };

type GenerateSpeechArgs = {
  prompt: string;
  output_file_path: string;
  generation_config?: Record<string, any>;
};

function getWorkspaceRoot(context: AgentContextLike): string {
  const workspace = context.workspace;
  if (!workspace) {
    throw new Error(
      `Relative path provided, but no workspace is configured for agent '${context.agentId}'. ` +
        'A workspace is required to resolve relative paths.'
    );
  }

  const basePath = typeof workspace.getBasePath === 'function'
    ? workspace.getBasePath()
    : null;

  if (!basePath || typeof basePath !== 'string') {
    throw new Error(
      `Agent '${context.agentId}' has a configured workspace, but it provided an invalid base path ` +
        `('${basePath}'). Cannot resolve relative paths.`
    );
  }

  return basePath;
}

function getConfiguredModelIdentifier(envVar: string, defaultModel?: string): string {
  const modelIdentifier = process.env[envVar];
  if (!modelIdentifier) {
    if (defaultModel) return defaultModel;
    throw new Error(`The '${envVar}' environment variable is not set. Please configure it.`);
  }
  return modelIdentifier;
}

export const _getConfiguredModelIdentifier = getConfiguredModelIdentifier;

function buildDynamicAudioSchema(
  baseParams: ParameterDefinition[],
  modelEnvVar: string,
  defaultModel: string
): ParameterSchema {
  const modelIdentifier = getConfiguredModelIdentifier(modelEnvVar, defaultModel);
  AudioClientFactory.ensureInitialized();

  const model = AudioClientFactory.listModels().find(
    (candidate) => candidate.modelIdentifier === modelIdentifier || candidate.name === modelIdentifier
  );

  if (!model) {
    throw new Error(`Failed to configure audio tool. Audio model '${modelIdentifier}' not found.`);
  }

  const schema = new ParameterSchema();
  for (const param of baseParams) {
    schema.addParameter(param);
  }

  if (model.parameterSchema?.parameters?.length) {
    schema.addParameter(
      new ParameterDefinition({
        name: 'generation_config',
        type: ParameterType.OBJECT,
        description: `Model-specific parameters for the configured '${modelIdentifier}' model.`,
        required: false,
        objectSchema: model.parameterSchema
      })
    );
  }

  return schema;
}

export class GenerateSpeechTool extends BaseTool {
  static CATEGORY = ToolCategory.MULTIMEDIA;
  static MODEL_ENV_VAR = 'DEFAULT_SPEECH_GENERATION_MODEL';
  static DEFAULT_MODEL = 'gemini-2.5-flash-tts';

  private client: any = null;

  static getName(): string {
    return 'generate_speech';
  }

  static getDescription(): string {
    return (
      "Generates spoken audio from text using the system's default Text-to-Speech (TTS) model. " +
      'Saves the generated audio file (.wav or .mp3) to the specified local file path and returns the path.'
    );
  }

  static getArgumentSchema(): ParameterSchema {
    const baseParams = [
      new ParameterDefinition({
        name: 'prompt',
        type: ParameterType.STRING,
        description:
          "The text to be converted into spoken audio. For multi-speaker mode, you must format the prompt " +
          "with speaker labels that match the speakers defined in 'speaker_mapping'. CRITICAL: Each speaker's dialogue MUST be on a new line. " +
          "Example: 'Joe: Hello Jane.\nJane: Hi Joe, how are you?'",
        required: true
      }),
      new ParameterDefinition({
        name: 'output_file_path',
        type: ParameterType.STRING,
        description:
          "Required. The local file path (relative to workspace) where the generated audio should be saved. Example: 'assets/audio/speech.wav'",
        required: true
      })
    ];

    return buildDynamicAudioSchema(baseParams, GenerateSpeechTool.MODEL_ENV_VAR, GenerateSpeechTool.DEFAULT_MODEL);
  }

  protected async _execute(context: AgentContextLike, kwargs?: GenerateSpeechArgs): Promise<any> {
    const { prompt, output_file_path, generation_config } = kwargs ?? ({} as GenerateSpeechArgs);

    const modelIdentifier = getConfiguredModelIdentifier(
      GenerateSpeechTool.MODEL_ENV_VAR,
      GenerateSpeechTool.DEFAULT_MODEL
    );

    if (!this.client) {
      this.client = AudioClientFactory.createAudioClient(modelIdentifier);
    }

    const response = await this.client.generateSpeech(prompt, generation_config);
    if (!response.audio_urls || response.audio_urls.length === 0) {
      throw new Error('Speech generation failed to return any audio file paths.');
    }

    if (!output_file_path) {
      throw new Error('output_file_path is required but was not provided.');
    }

    const resolvedPath = resolveSafePath(output_file_path, getWorkspaceRoot(context));
    await downloadFileFromUrl(response.audio_urls[0], resolvedPath);

    return { file_path: resolvedPath };
  }

  async cleanup(): Promise<void> {
    if (this.client?.cleanup) {
      await this.client.cleanup();
      this.client = null;
    }
  }
}
