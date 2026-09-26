import fs from "node:fs/promises";
import { constants } from "node:fs";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_TRANSCRIPT_DELTA = 2 * 1024 * 1024;
const MAX_TRANSCRIPT_BYTES = 64 * 1024 * 1024;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const FLUSH_ATTEMPTS = 5;
const FLUSH_DELAY_MS = 50;
type Row = Record<string, unknown>;
export type AgyTranscriptBaseline = Readonly<{
  conversationRoot: string; transcript: string; offset: number;
  identity: { dev: bigint; ino: bigint } | null;
}>;

const failure = (code: string): Error => new Error(`AGY_NATIVE_IMAGE_${code}`);
const inside = (root: string, candidate: string): boolean => {
  const relative = path.relative(root, candidate);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};
const object = (value: unknown): Row | null => value && typeof value === "object" && !Array.isArray(value) ? value as Row : null;
const safeDirectory = async (directory: string): Promise<void> => {
  const stat = await fs.lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw failure("UNSAFE_PATH");
};
const providerPaths = (conversationId: string): { root: string; transcript: string; directories: string[] } => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId))
    throw failure("CONVERSATION_INVALID");
  const brain = path.join(os.homedir(), ".gemini", "antigravity-cli", "brain");
  const gemini = path.join(os.homedir(), ".gemini");
  const antigravity = path.join(gemini, "antigravity-cli");
  const root = path.join(brain, conversationId);
  const generated = path.join(root, ".system_generated");
  const logs = path.join(generated, "logs");
  return { root, transcript: path.join(logs, "transcript.jsonl"), directories: [gemini, antigravity, brain, root, generated, logs] };
};

/** Capture only the exact conversation's current transcript position before provider stdin. */
export const captureAgyTranscriptBaseline = async (conversationId: string): Promise<AgyTranscriptBaseline> => {
  const { root, transcript, directories } = providerPaths(conversationId);
  try {
    for (const directory of directories) await safeDirectory(directory);
    const stat = await fs.lstat(transcript, { bigint: true });
    if (!stat.isFile() || stat.isSymbolicLink()) throw failure("UNSAFE_PATH");
    if (stat.size > BigInt(MAX_TRANSCRIPT_BYTES)) throw failure("TRANSCRIPT_TOO_LARGE");
    return { conversationRoot: root, transcript, offset: Number(stat.size), identity: { dev: stat.dev, ino: stat.ino } };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return { conversationRoot: root, transcript, offset: 0, identity: null };
    throw failure("BASELINE_UNAVAILABLE");
  }
};

const appendedRows = async (baseline: AgyTranscriptBaseline): Promise<Row[]> => {
  const { transcript, conversationRoot } = baseline;
  const paths = providerPaths(path.basename(conversationRoot));
  if (paths.transcript !== transcript) throw failure("CONVERSATION_INVALID");
  try { for (const directory of paths.directories) await safeDirectory(directory); }
  catch { throw failure("UNSAFE_PATH"); }
  const handle = await fs.open(transcript, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.size < BigInt(baseline.offset)
      || before.size > BigInt(MAX_TRANSCRIPT_BYTES)
      || (baseline.identity && (before.dev !== baseline.identity.dev || before.ino !== baseline.identity.ino)))
      throw failure("TRANSCRIPT_CHANGED");
    const length = Number(before.size) - baseline.offset;
    if (length > MAX_TRANSCRIPT_DELTA) throw failure("TRANSCRIPT_TOO_LARGE");
    const bytes = Buffer.alloc(length);
    let read = 0;
    while (read < length) {
      const next = await handle.read(bytes, read, length - read, baseline.offset + read);
      if (!next.bytesRead) throw failure("TRANSCRIPT_CHANGED");
      read += next.bytesRead;
    }
    const after = await handle.stat({ bigint: true });
    const named = await fs.lstat(transcript, { bigint: true });
    if (after.dev !== before.dev || after.ino !== before.ino || after.size < before.size
      || named.dev !== before.dev || named.ino !== before.ino || named.isSymbolicLink())
      throw failure("TRANSCRIPT_CHANGED");
    const text = bytes.toString("utf8");
    if (text && !text.endsWith("\n")) throw failure("TRANSCRIPT_INCOMPLETE");
    return text.split("\n").filter(Boolean).map((line) => {
      let row: unknown;
      try { row = JSON.parse(line); } catch { throw failure("TRANSCRIPT_INVALID"); }
      const record = object(row);
      if (!record) throw failure("TRANSCRIPT_INVALID");
      return record;
    });
  } finally { await handle.close(); }
};

const matchingMedia = (rows: Row[], stepIndex: number): Row | null => {
  if (rows.filter((row) => row.step_index === stepIndex).length !== 1) return null;
  const matches = rows.map((row, index) => ({ row, index })).filter(({ row }) =>
    row.step_index === stepIndex && row.source === "MODEL" && row.type === "GENERIC" && row.status === "DONE");
  if (matches.length !== 1) return null;
  const { row, index } = matches[0]!;
  const planner = rows[index - 1];
  if (!planner || planner.source !== "MODEL" || planner.type !== "PLANNER_RESPONSE"
    || planner.status !== "DONE" || planner.step_index !== stepIndex - 1) return null;
  const calls = planner.tool_calls;
  if (!Array.isArray(calls) || calls.length !== 1 || object(calls[0])?.name !== "generate_image") return null;
  return row;
};

const imageFormat = (mime: string): { extension: string; magic: (bytes: Buffer) => boolean } | null => {
  if (mime === "image/jpeg") return { extension: "jpg", magic: (b) => b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) };
  if (mime === "image/png") return { extension: "png", magic: (b) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) };
  if (mime === "image/gif") return { extension: "gif", magic: (b) => ["GIF87a", "GIF89a"].includes(b.subarray(0, 6).toString("ascii")) };
  if (mime === "image/webp") return { extension: "webp", magic: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" };
  return null;
};

const verifiedBytes = async (root: string, media: unknown): Promise<{ bytes: Buffer; extension: string }> => {
  const entry = object(media);
  const format = typeof entry?.mime_type === "string" ? imageFormat(entry.mime_type) : null;
  if (!format || typeof entry?.uri !== "string" || entry.uri.includes("%")) throw failure("MEDIA_INVALID");
  let url: URL;
  try { url = new URL(entry.uri); } catch { throw failure("MEDIA_INVALID"); }
  if (url.protocol !== "file:" || url.host || url.search || url.hash) throw failure("MEDIA_INVALID");
  const imagePath = fileURLToPath(url);
  if (!inside(root, imagePath) || path.extname(imagePath).toLowerCase() !== `.${format.extension}`
    && !(format.extension === "jpg" && path.extname(imagePath).toLowerCase() === ".jpeg")) throw failure("MEDIA_INVALID");
  const relative = path.relative(root, imagePath).split(path.sep);
  let cursor = root;
  for (const part of relative.slice(0, -1)) { cursor = path.join(cursor, part); await safeDirectory(cursor); }
  const initial = await fs.lstat(imagePath, { bigint: true });
  if (!initial.isFile() || initial.isSymbolicLink() || initial.size === 0n || initial.size > BigInt(MAX_IMAGE_BYTES))
    throw failure("MEDIA_INVALID");
  const handle = await fs.open(imagePath, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = await handle.stat({ bigint: true });
    if (opened.dev !== initial.dev || opened.ino !== initial.ino || opened.size !== initial.size
      || opened.mtimeNs !== initial.mtimeNs || opened.ctimeNs !== initial.ctimeNs) throw failure("MEDIA_CHANGED");
    const bytes = Buffer.alloc(Number(initial.size));
    let read = 0;
    while (read < bytes.length) {
      const next = await handle.read(bytes, read, bytes.length - read, read);
      if (!next.bytesRead) throw failure("MEDIA_CHANGED");
      read += next.bytesRead;
    }
    const after = await handle.stat({ bigint: true });
    const named = await fs.lstat(imagePath, { bigint: true });
    if (after.dev !== opened.dev || after.ino !== opened.ino || after.size !== opened.size
      || after.mtimeNs !== opened.mtimeNs || after.ctimeNs !== opened.ctimeNs
      || named.dev !== opened.dev || named.ino !== opened.ino || named.isSymbolicLink()
      || !format.magic(bytes))
      throw failure("MEDIA_INVALID");
    return { bytes, extension: format.extension };
  } finally { await handle.close(); }
};

const copyRunOwned = async (memoryDir: string, turnId: string, stepIndex: number, image: { bytes: Buffer; extension: string }): Promise<string> => {
  await safeDirectory(memoryDir);
  const directory = path.join(memoryDir, "agy-native-images");
  try { await fs.mkdir(directory, { mode: 0o700 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  await safeDirectory(directory);
  await fs.chmod(directory, 0o700);
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(turnId) || !Number.isSafeInteger(stepIndex) || stepIndex < 0)
    throw failure("IDENTITY_INVALID");
  const destination = path.join(directory, `${turnId}-${stepIndex}.${image.extension}`);
  const temporary = path.join(directory, `.${randomUUID()}.tmp`);
  const handle = await fs.open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try {
    await handle.writeFile(image.bytes);
    await handle.sync();
  } finally { await handle.close(); }
  try { await fs.link(temporary, destination); }
  finally { await fs.unlink(temporary); }
  return destination;
};

/** Return only a verified immutable run copy, never a provider brain URI. */
export const reconcileAgyNativeImage = async (input: {
  baseline: AgyTranscriptBaseline; stepIndex: number; turnId: string; memoryDir: string;
}): Promise<string> => {
  let row: Row | null = null;
  for (let attempt = 0; attempt < FLUSH_ATTEMPTS; attempt += 1) {
    try { row = matchingMedia(await appendedRows(input.baseline), input.stepIndex); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT"
        && (!(error instanceof Error) || error.message !== "AGY_NATIVE_IMAGE_TRANSCRIPT_INCOMPLETE")) throw error;
    }
    if (row) break;
    if (attempt + 1 < FLUSH_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, FLUSH_DELAY_MS));
  }
  if (!row || !Array.isArray(row.media) || row.media.length !== 1) throw failure("MEDIA_MISSING");
  const image = await verifiedBytes(input.baseline.conversationRoot, row.media[0]);
  return copyRunOwned(input.memoryDir, input.turnId, input.stepIndex, image);
};
