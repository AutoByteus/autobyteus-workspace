import { describe, expect, it } from "vitest";
import {
  parseGenerateImageInput,
  parseMediaInputImages,
} from "../../../../src/agent-tools/media/media-tool-input-parsers.js";

const DATA_URI = "data:image/png;base64,aW5wdXQtaW1hZ2U=";

describe("media tool input parsers", () => {
  it("preserves array-shaped input image references including data URIs", () => {
    expect(parseMediaInputImages([" inputs/ref.png ", DATA_URI, "   "])).toEqual([
      "inputs/ref.png",
      DATA_URI,
    ]);
  });

  it("rejects comma-separated string input_images so data URI commas are not ambiguously parsed", () => {
    expect(() => parseMediaInputImages(`inputs/ref.png,${DATA_URI}`)).toThrow(
      /must be an array of image reference strings/,
    );
  });

  it("rejects non-string entries inside the input_images array", () => {
    expect(() => parseMediaInputImages([DATA_URI, 123])).toThrow(
      /input_images\[1\].*must be a string/,
    );
  });

  it("parses generate_image input with an array-shaped input_images contract", () => {
    expect(parseGenerateImageInput({
      prompt: "draw",
      input_images: [DATA_URI],
      output_file_path: "out.png",
    })).toEqual({
      prompt: "draw",
      input_images: [DATA_URI],
      output_file_path: "out.png",
      generation_config: null,
    });
  });
});
