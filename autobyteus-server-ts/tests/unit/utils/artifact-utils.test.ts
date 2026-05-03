import { describe, expect, it } from "vitest";
import { inferArtifactType } from "../../../src/utils/artifact-utils.js";

describe("artifact-utils", () => {
  it("infers artifact types from extensions", () => {
    expect(inferArtifactType("/tmp/image.png")).toBe("image");
    expect(inferArtifactType("/tmp/sound.mp3")).toBe("audio");
    expect(inferArtifactType("/tmp/movie.mp4")).toBe("video");
    expect(inferArtifactType("/tmp/file.pdf")).toBe("pdf");
    expect(inferArtifactType("/tmp/data.csv")).toBe("csv");
    expect(inferArtifactType("/tmp/sheet.xlsx")).toBe("excel");
    expect(inferArtifactType("/tmp/unknown.bin")).toBe("file");
  });
});
