import { describe, expect, it } from "vitest";
import { extractCandidateOutputPath, inferArtifactType, isCandidateKey } from "../../../src/utils/artifact-utils.js";
describe("artifact-utils", () => {
    it("detects candidate keys", () => {
        expect(isCandidateKey("output_path")).toBe(true);
        expect(isCandidateKey("destination")).toBe(true);
        expect(isCandidateKey("file_name")).toBe(false);
    });
    it("extracts path from tool result output_file_url + local_file_path", () => {
        const result = {
            output_file_url: "http://server/files/output.png",
            local_file_path: "/tmp/output.png",
        };
        const path = extractCandidateOutputPath(null, result);
        expect(path).toBe("/tmp/output.png");
    });
    it("extracts path from tool result fields", () => {
        const result = {
            destination: "/tmp/out.pdf",
        };
        const path = extractCandidateOutputPath(null, result);
        expect(path).toBe("/tmp/out.pdf");
    });
    it("extracts path from tool args when result has none", () => {
        const args = {
            output_path: "/tmp/out.csv",
        };
        const path = extractCandidateOutputPath(args, null);
        expect(path).toBe("/tmp/out.csv");
    });
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
