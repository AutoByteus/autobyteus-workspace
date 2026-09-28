import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readAgyNativeImagePath } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-step-output-reader.js";

const conversation = "010c6db0-b642-42e6-b2aa-aba1a6d95236";
const otherConversation = "5b1ab95d-0000-4000-8000-000000000001";
let brainRoot: string;

const conversationDir = (id = conversation) => path.join(brainRoot, id);
const stepDir = (step: number, id = conversation) => path.join(conversationDir(id), ".system_generated", "steps", String(step));
const agyOutput = (imagePath: string) => `Using prompt: A happy golden retriever.\n\nGenerated image is saved at ${imagePath}.\n\n`
  + " Do not output the path of this image to show to the user since the user can already see it.";
const writeImage = (name: string, id = conversation) => {
  fs.mkdirSync(conversationDir(id), { recursive: true });
  const file = path.join(conversationDir(id), name);
  fs.writeFileSync(file, "jpg-bytes");
  return file;
};
const writeOutput = (step: number, text: string, id = conversation) => {
  fs.mkdirSync(stepDir(step, id), { recursive: true });
  fs.writeFileSync(path.join(stepDir(step, id), "output.txt"), text);
};

beforeEach(() => { brainRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agy-brain-")); });
afterEach(() => { fs.rmSync(brainRoot, { recursive: true, force: true }); });

describe("readAgyNativeImagePath", () => {
  it("resolves the realpath of the image AGY reported for exactly that conversation step", () => {
    const image = writeImage("golden_retriever_dog_1790572457860.jpg");
    writeOutput(2, agyOutput(image));
    const resolution = readAgyNativeImagePath(conversation, 2, brainRoot);
    expect(resolution).toEqual({
      path: fs.realpathSync(image), outputText: agyOutput(image).trim(), reason: null,
    });
  });

  it("resolves distinct paths for distinct (parallel) steps and tolerates CRLF output", () => {
    const first = writeImage("dog_1.jpg");
    const second = writeImage("cat_2.jpg");
    writeOutput(6, agyOutput(first));
    writeOutput(7, agyOutput(second).replace(/\n/g, "\r\n"));
    expect(readAgyNativeImagePath(conversation, 6, brainRoot).path).toBe(fs.realpathSync(first));
    expect(readAgyNativeImagePath(conversation, 7, brainRoot).path).toBe(fs.realpathSync(second));
  });

  it.each([
    ["not-a-uuid", 2], ["../" + conversation, 2], [conversation, -1], [conversation, 1.5], [conversation, Number.NaN],
  ])("rejects invalid identity %s / %s", (id, step) => {
    expect(readAgyNativeImagePath(id, step, brainRoot)).toEqual({ path: null, outputText: null, reason: "INVALID_IDENTITY" });
  });

  it("falls back when the step output is missing (older AGY layout)", () => {
    writeImage("dog.jpg");
    expect(readAgyNativeImagePath(conversation, 2, brainRoot).reason).toBe("OUTPUT_MISSING");
  });

  it("does not follow a symlinked output.txt and rejects a non-regular output", () => {
    const image = writeImage("dog.jpg");
    const elsewhere = path.join(brainRoot, "elsewhere.txt");
    fs.writeFileSync(elsewhere, agyOutput(image));
    fs.mkdirSync(stepDir(2), { recursive: true });
    fs.symlinkSync(elsewhere, path.join(stepDir(2), "output.txt"));
    expect(readAgyNativeImagePath(conversation, 2, brainRoot).reason).toBe("OUTPUT_UNSAFE");
    fs.mkdirSync(path.join(stepDir(3), "output.txt"), { recursive: true });
    expect(readAgyNativeImagePath(conversation, 3, brainRoot).reason).toBe("OUTPUT_UNSAFE");
  });

  it("rejects output larger than 16 KiB without parsing it", () => {
    const image = writeImage("dog.jpg");
    writeOutput(2, agyOutput(image) + "x".repeat(16 * 1024));
    expect(readAgyNativeImagePath(conversation, 2, brainRoot).reason).toBe("OUTPUT_TOO_LARGE");
  });

  it.each([
    ["unrecognised wording", "Image created: /tmp/x.jpg"],
    ["relative path", "Generated image is saved at dog.jpg."],
    ["empty output", ""],
  ])("falls back on %s", (_label, text) => {
    writeOutput(2, text);
    expect(readAgyNativeImagePath(conversation, 2, brainRoot).reason).toBe("PATH_NOT_FOUND_IN_OUTPUT");
  });

  it("ignores an image outside the conversation brain directory", () => {
    const foreign = writeImage("dog.jpg", otherConversation);
    writeOutput(2, agyOutput(foreign));
    expect(readAgyNativeImagePath(conversation, 2, brainRoot).reason).toBe("PATH_OUTSIDE_CONVERSATION");
    const escaping = path.join(conversationDir(), "..", otherConversation, "dog.jpg");
    writeOutput(3, agyOutput(escaping));
    expect(readAgyNativeImagePath(conversation, 3, brainRoot).reason).toBe("PATH_OUTSIDE_CONVERSATION");
  });

  it("ignores a symlinked image even when its target is inside the conversation", () => {
    const outside = path.join(brainRoot, "outside.jpg");
    fs.writeFileSync(outside, "secret");
    const inside = writeImage("real.jpg");
    fs.symlinkSync(outside, path.join(conversationDir(), "escape.jpg"));
    fs.symlinkSync(inside, path.join(conversationDir(), "alias.jpg"));
    writeOutput(2, agyOutput(path.join(conversationDir(), "escape.jpg")));
    writeOutput(3, agyOutput(path.join(conversationDir(), "alias.jpg")));
    expect(readAgyNativeImagePath(conversation, 2, brainRoot)).toMatchObject({ path: null, reason: "IMAGE_MISSING" });
    expect(readAgyNativeImagePath(conversation, 3, brainRoot)).toMatchObject({ path: null, reason: "IMAGE_MISSING" });
  });

  it("falls back when the reported image does not exist or is a directory", () => {
    fs.mkdirSync(path.join(conversationDir(), "folder.jpg"), { recursive: true });
    writeOutput(2, agyOutput(path.join(conversationDir(), "missing.jpg")));
    writeOutput(3, agyOutput(path.join(conversationDir(), "folder.jpg")));
    expect(readAgyNativeImagePath(conversation, 2, brainRoot).reason).toBe("IMAGE_MISSING");
    expect(readAgyNativeImagePath(conversation, 3, brainRoot).reason).toBe("IMAGE_MISSING");
  });

  it("never throws for an unusable brain root", () => {
    expect(() => readAgyNativeImagePath(conversation, 2, "\0invalid")).not.toThrow();
    expect(readAgyNativeImagePath(conversation, 2, "\0invalid").path).toBeNull();
  });
});
