import { ParameterDefinition, ParameterSchema, ParameterType } from '../../utils/parameter-schema.js';

export const FILE_TOOL_PATH_DESCRIPTION =
  'Absolute filesystem path, or a relative file path paired with base_dir. If path is relative, you must provide an absolute base_dir. If base_dir is omitted, path must be absolute. Absolute paths are used directly and take precedence if base_dir is also supplied. Relative paths are never resolved from the configured workspace, process cwd, or prior shell cd state.';

export const FILE_TOOL_BASE_DIR_DESCRIPTION =
  'Optional absolute directory used only when path is relative; it is required for a relative path. If path is absolute, omit base_dir (an absolute path takes precedence if both are supplied). This applies to this tool call only and does not change shell or agent working-directory state. Do not provide a relative base_dir.';

export function addFileToolPathParameters(argumentSchema: ParameterSchema): void {
  argumentSchema.addParameter(new ParameterDefinition({
    name: 'path',
    type: ParameterType.STRING,
    description: FILE_TOOL_PATH_DESCRIPTION,
    required: true
  }));
  argumentSchema.addParameter(new ParameterDefinition({
    name: 'base_dir',
    type: ParameterType.STRING,
    description: FILE_TOOL_BASE_DIR_DESCRIPTION,
    required: false
  }));
}
