import { BaseTool } from '../base-tool.js';
import { ToolCategory } from '../tool-category.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../utils/parameter-schema.js';
import { ImageClientFactory } from '../../multimedia/image/image-client-factory.js';
import { downloadFileFromUrl } from '../../utils/download-utils.js';
import { resolveSafePath } from '../../utils/file-utils.js';

type WorkspaceLike = { getBasePath?: () => string };
type AgentContextLike = { agentId?: string; workspace?: WorkspaceLike | null };

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

class SharedImageClientManager {
  private static clients = new Map<string, any>();
  private static refCounts = new Map<string, number>();

  static getClient(agentId: string, modelIdentifier: string): any {
    const key = `${agentId}:${modelIdentifier}`;
    if (!SharedImageClientManager.clients.has(key)) {
      SharedImageClientManager.clients.set(key, ImageClientFactory.createImageClient(modelIdentifier));
      SharedImageClientManager.refCounts.set(key, 0);
    }

    const current = SharedImageClientManager.refCounts.get(key) ?? 0;
    SharedImageClientManager.refCounts.set(key, current + 1);
    return SharedImageClientManager.clients.get(key);
  }

  static async releaseClient(agentId: string, modelIdentifier: string): Promise<void> {
    const key = `${agentId}:${modelIdentifier}`;
    if (!SharedImageClientManager.refCounts.has(key)) return;

    const nextCount = (SharedImageClientManager.refCounts.get(key) ?? 0) - 1;
    if (nextCount <= 0) {
      const client = SharedImageClientManager.clients.get(key);
      SharedImageClientManager.clients.delete(key);
      SharedImageClientManager.refCounts.delete(key);
      if (client?.cleanup) {
        await client.cleanup();
      }
    } else {
      SharedImageClientManager.refCounts.set(key, nextCount);
    }
  }
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

function buildDynamicImageSchema(
  baseParams: ParameterDefinition[],
  modelEnvVar: string,
  defaultModel: string
): ParameterSchema {
  const modelIdentifier = getConfiguredModelIdentifier(modelEnvVar, defaultModel);
  ImageClientFactory.ensureInitialized();

  const model = ImageClientFactory.listModels().find(
    (candidate) => candidate.modelIdentifier === modelIdentifier || candidate.name === modelIdentifier
  );

  if (!model) {
    throw new Error(`Failed to configure image tool. Image model '${modelIdentifier}' not found.`);
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
        description: `Model-specific generation parameters for the configured '${modelIdentifier}' model.`,
        required: false,
        objectSchema: model.parameterSchema
      })
    );
  }

  return schema;
}

function getModelDescriptionSuffix(modelEnvVar: string, defaultModel: string): string {
  try {
    const modelIdentifier = getConfiguredModelIdentifier(modelEnvVar, defaultModel);
    ImageClientFactory.ensureInitialized();
    const model = ImageClientFactory.listModels().find(
      (candidate) => candidate.modelIdentifier === modelIdentifier || candidate.name === modelIdentifier
    );
    if (model?.description) {
      return `\n\n**MODEL SPECIFIC CAPABILITIES:** ${model.description}`;
    }
  } catch {
    // ignore
  }
  return '';
}

type GenerateImageArgs = {
  prompt: string;
  input_images?: string;
  output_file_path: string;
  generation_config?: Record<string, any>;
};

type EditImageArgs = {
  prompt: string;
  input_images?: string;
  output_file_path: string;
  generation_config?: Record<string, any>;
  mask_image?: string;
};

export class GenerateImageTool extends BaseTool {
  static CATEGORY = ToolCategory.MULTIMEDIA;
  static MODEL_ENV_VAR = 'DEFAULT_IMAGE_GENERATION_MODEL';
  static DEFAULT_MODEL = 'gpt-image-1.5';

  private client: any = null;
  private modelIdentifier: string | null = null;

  static getName(): string {
    return 'generate_image';
  }

  static getDescription(): string {
    const baseDesc =
      'Generates one or more images based on a textual description (prompt). ' +
      'This versatile tool handles both creation from scratch and modification of existing images. ' +
      "If 'input_images' are provided, it serves as a powerful editing and variation engine. " +
      "Use cases include: creating or editing posters, modifying scene elements (e.g., 'add a cat to the sofa'), " +
      "style transfer (e.g., 'turn this photo into an oil painting'), generating variations of a design, " +
      "or any imaging task requiring consistency with an input reference (e.g., preserving a specific composition or background while changing the subject). " +
      'Saves the generated image to the specified local file path and returns the path. ' +
      'Please refer to the specific capabilities of the configured model below to check if it supports ' +
      'input images for variations/editing.';
    const suffix = getModelDescriptionSuffix(GenerateImageTool.MODEL_ENV_VAR, GenerateImageTool.DEFAULT_MODEL);
    return `${baseDesc}${suffix}`;
  }

  static getArgumentSchema(): ParameterSchema {
    const baseParams = [
      new ParameterDefinition({
        name: 'prompt',
        type: ParameterType.STRING,
        description: 'A detailed textual description of the image to generate.',
        required: true
      }),
      new ParameterDefinition({
        name: 'input_images',
        type: ParameterType.STRING,
        description: 'Optional. A comma-separated string of image locations (URLs or file paths).',
        required: false
      }),
      new ParameterDefinition({
        name: 'output_file_path',
        type: ParameterType.STRING,
        description:
          "Required. The local file path (relative to workspace) where the generated image should be saved. Example: 'assets/images/result.png'",
        required: true
      })
    ];

    return buildDynamicImageSchema(baseParams, GenerateImageTool.MODEL_ENV_VAR, GenerateImageTool.DEFAULT_MODEL);
  }

  protected async _execute(context: AgentContextLike, kwargs?: GenerateImageArgs): Promise<any> {
    const { prompt, output_file_path, input_images, generation_config } = kwargs ?? ({} as GenerateImageArgs);

    if (!this.modelIdentifier) {
      this.modelIdentifier = getConfiguredModelIdentifier(
        GenerateImageTool.MODEL_ENV_VAR,
        GenerateImageTool.DEFAULT_MODEL
      );
    }

    if (!this.client) {
      const agentId = context.agentId ?? 'default';
      this.client = SharedImageClientManager.getClient(agentId, this.modelIdentifier);
    }

    const urlsList = input_images
      ? input_images.split(',').map((value) => value.trim()).filter(Boolean)
      : null;

    const response = await this.client.generateImage(prompt, urlsList ?? undefined, generation_config);
    if (!response.image_urls || response.image_urls.length === 0) {
      throw new Error('Image generation failed to return any image URLs.');
    }

    if (!output_file_path) {
      throw new Error('output_file_path is required but was not provided.');
    }

    const resolvedPath = resolveSafePath(output_file_path, getWorkspaceRoot(context));
    await downloadFileFromUrl(response.image_urls[0], resolvedPath);
    return { file_path: resolvedPath };
  }

  async cleanup(): Promise<void> {
    if (this.client && this.modelIdentifier) {
      const agentId = this.agentId ?? 'default';
      await SharedImageClientManager.releaseClient(agentId, this.modelIdentifier);
      this.client = null;
    }
  }
}

export class EditImageTool extends BaseTool {
  static CATEGORY = ToolCategory.MULTIMEDIA;
  static MODEL_ENV_VAR = 'DEFAULT_IMAGE_EDIT_MODEL';
  static DEFAULT_MODEL = 'gpt-image-1.5';

  private client: any = null;
  private modelIdentifier: string | null = null;

  static getName(): string {
    return 'edit_image';
  }

  static getDescription(): string {
    const baseDesc =
      'Edits an existing image based on a textual description (prompt)' +
      'A mask can be provided to specify the exact area to edit (inpainting). ' +
      'Saves the edited image to the specified local file path and returns the path.';
    const suffix = getModelDescriptionSuffix(EditImageTool.MODEL_ENV_VAR, EditImageTool.DEFAULT_MODEL);
    return `${baseDesc}${suffix}`;
  }

  static getArgumentSchema(): ParameterSchema {
    const baseParams = [
      new ParameterDefinition({
        name: 'prompt',
        type: ParameterType.STRING,
        description: 'A detailed textual description of the edits to apply to the image.',
        required: true
      }),
      new ParameterDefinition({
        name: 'input_images',
        type: ParameterType.STRING,
        description:
          'A comma-separated string of image locations (URLs or file paths) to be edited. Logic for providing this:\n' +
          '1. **Has Context & Image IN Context:** OMIT.\n' +
          '2. **Has Context & Image NOT in Context:** PROVIDE.\n' +
          '3. **No Context & Supports Input:** PROVIDE.\n' +
          '4. **No Context & No Input Support:** OMIT.',
        required: false
      }),
      new ParameterDefinition({
        name: 'output_file_path',
        type: ParameterType.STRING,
        description:
          "Required. The local file path (relative to workspace) where the edited image should be saved. Example: 'assets/images/edited_result.png'",
        required: true
      }),
      new ParameterDefinition({
        name: 'mask_image',
        type: ParameterType.STRING,
        description:
          'Optional. Path or URL to a mask image (PNG) for inpainting. Transparent areas are regenerated; opaque areas stay unchanged.',
        required: false
      })
    ];

    return buildDynamicImageSchema(baseParams, EditImageTool.MODEL_ENV_VAR, EditImageTool.DEFAULT_MODEL);
  }

  protected async _execute(context: AgentContextLike, kwargs?: EditImageArgs): Promise<any> {
    const { prompt, output_file_path, input_images, generation_config, mask_image } = kwargs ?? ({} as EditImageArgs);

    if (!this.modelIdentifier) {
      this.modelIdentifier = getConfiguredModelIdentifier(EditImageTool.MODEL_ENV_VAR, EditImageTool.DEFAULT_MODEL);
    }

    if (!this.client) {
      const agentId = context.agentId ?? 'default';
      this.client = SharedImageClientManager.getClient(agentId, this.modelIdentifier);
    }

    const urlsList = input_images
      ? input_images.split(',').map((value) => value.trim()).filter(Boolean)
      : [];

    const response = await this.client.editImage(prompt, urlsList, mask_image ?? undefined, generation_config);
    if (!response.image_urls || response.image_urls.length === 0) {
      throw new Error('Image editing failed to return any image URLs.');
    }

    if (!output_file_path) {
      throw new Error('output_file_path is required but was not provided.');
    }

    const resolvedPath = resolveSafePath(output_file_path, getWorkspaceRoot(context));
    await downloadFileFromUrl(response.image_urls[0], resolvedPath);
    return { file_path: resolvedPath };
  }

  async cleanup(): Promise<void> {
    if (this.client && this.modelIdentifier) {
      const agentId = this.agentId ?? 'default';
      await SharedImageClientManager.releaseClient(agentId, this.modelIdentifier);
      this.client = null;
    }
  }
}
