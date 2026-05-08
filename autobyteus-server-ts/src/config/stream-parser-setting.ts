import {
  DEFAULT_TOOL_CALL_FORMAT,
  TOOL_CALL_FORMAT_ENV_VAR,
  TOOL_CALL_FORMATS,
  type ToolCallFormat,
} from "autobyteus-ts/utils/tool-call-format.js";

export const AUTOBYTEUS_STREAM_PARSER_SETTING_KEY = TOOL_CALL_FORMAT_ENV_VAR;
export const STREAM_PARSER_SETTING_VALUES = TOOL_CALL_FORMATS;
export type StreamParserSettingValue = ToolCallFormat;
export const STREAM_PARSER_XML_VALUE: StreamParserSettingValue = "xml";
export const STREAM_PARSER_PROVIDER_NATIVE_VALUE: StreamParserSettingValue = DEFAULT_TOOL_CALL_FORMAT;

const STREAM_PARSER_SETTING_VALUE_SET = new Set<string>(STREAM_PARSER_SETTING_VALUES);

export const isStreamParserSettingValue = (
  value: string,
): value is StreamParserSettingValue => STREAM_PARSER_SETTING_VALUE_SET.has(value);

export const normalizeStreamParserSettingForPersistence = (
  value: string,
): [true, StreamParserSettingValue] | [false, string] => {
  const normalizedValue = value.trim().toLowerCase();

  if (isStreamParserSettingValue(normalizedValue)) {
    return [true, normalizedValue];
  }

  return [
    false,
    `Server setting '${AUTOBYTEUS_STREAM_PARSER_SETTING_KEY}' must be one of: ${STREAM_PARSER_SETTING_VALUES.join(", ")}.`,
  ];
};
