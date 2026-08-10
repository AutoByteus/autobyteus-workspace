import { LOCAL_IMPORT_CREDENTIAL_ALIAS_NAMES } from "../secret-management/provisioning/local-import-credential-alias-registry.js";

export const forbiddenGenericSettingNames = new Set<string>([
  ...LOCAL_IMPORT_CREDENTIAL_ALIAS_NAMES,
  "QWEN_API_KEY",
  "ZHIPU_API_KEY",
  "OLLAMA_API_KEY",
  "GOOGLE_CSE_API_KEY",
  "CLAUDE_CODE_API_KEY",
  "CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR",
]);

export const retiredSettingNames = new Set<string>(["AUTOBYTEUS_STREAM_PARSER"]);
