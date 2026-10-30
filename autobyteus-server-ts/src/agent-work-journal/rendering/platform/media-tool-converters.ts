import { asText } from "../command-text.js";
import { actionLine, messageParts, quoted, textItems, type PlatformToolConverter } from "./platform-line-parts.js";

/** The media tools (contract §3): the prompt in the head, the written file below. */

const fileParts = (args: Readonly<Record<string, unknown>>) => messageParts(
  asText(args.output_file_path) ? `File: ${asText(args.output_file_path)}` : null,
);

const prompted = (label: string): PlatformToolConverter => (call, result) =>
  actionLine(`${label}: ${quoted(asText(call.args.prompt) ?? "(prompt not recorded)")}`, result, fileParts(call.args));

const editImage: PlatformToolConverter = (call, result) => {
  const inputs = textItems(call.args.input_images).length;
  return actionLine(
    `Edit image: ${quoted(asText(call.args.prompt) ?? "(prompt not recorded)")} (${inputs} input image${inputs === 1 ? "" : "s"})`,
    result,
    fileParts(call.args),
  );
};

/** The spoken text first, then the file. */
const generateSpeech: PlatformToolConverter = (call, result) =>
  actionLine("Generate speech", result, [...messageParts(asText(call.args.prompt)), ...fileParts(call.args)]);

export const mediaToolConverters: ReadonlyMap<string, PlatformToolConverter> = new Map([
  ["generate_image", prompted("Generate image")],
  ["edit_image", editImage],
  ["generate_speech", generateSpeech],
  ["generate_video", prompted("Generate video")],
]);
