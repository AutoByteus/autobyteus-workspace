/**
 * AC-002 real-release check (opt-in): Voice Input installed through a signed catalog by the real Extension Manager, with
 * the real package, the real voice runtime 0.3.2 download and its speech model, then dictation through the node's real
 * action route: English, Chinese and silence. Also the page route: the packaged page is served with the sandbox CSP.
 *
 *   AUTOBYTEUS_VOICE_INPUT_REAL_E2E=1 pnpm -C autobyteus-server-ts test:voice-input-real-release
 *
 * The catalog is AutoByteus's published one, or (before the first release) a development catalog set by
 * AUTOBYTEUS_EXTENSIONS_CATALOG_URL / AUTOBYTEUS_EXTENSIONS_CATALOG_PUBLIC_KEY. macOS only (the clips come from `say`
 * and `ffmpeg`); downloads about 2 GB into a temporary folder, which is removed afterwards. Nothing under ~/.autobyteus
 * is used: the extensions folder and the speech model cache are temporary.
 */
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, describe, expect, it } from "vitest";
import { readExtensionCatalogSource } from "../../src/extensions/catalog/extension-catalog-source.js";
import { thisPlatform } from "../../src/extensions/domain/extension-description.js";
import { composeExtensions } from "../../src/compositions/extensions-composition.js";
import type { ExtensionManager } from "../../src/extensions/services/extension-manager.js";
import { extensionRoutesApp } from "../fixtures/extension-packages.js";

const run = promisify(execFile);
const enabled = process.env.AUTOBYTEUS_VOICE_INPUT_REAL_E2E === "1" && process.platform === "darwin";

const speech = async (dir: string, text: string, localePrefix: string): Promise<Buffer> => {
  const { stdout } = await run("say", ["-v", "?"]);
  const voice = stdout.split("\n").map((line) => line.trim().split(/\s{2,}/)).find(([, locale]) => locale?.startsWith(localePrefix))?.[0];
  if (!voice) throw new Error(`no macOS voice for ${localePrefix}`);
  const aiff = path.join(dir, `${localePrefix}.aiff`);
  const wav = path.join(dir, `${localePrefix}.wav`);
  await run("say", ["-v", voice, "-o", aiff, text]);
  await run("ffmpeg", ["-y", "-loglevel", "error", "-i", aiff, "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", wav]);
  return fs.readFile(wav);
};
const silence = async (dir: string): Promise<Buffer> => {
  const wav = path.join(dir, "silence.wav");
  await run("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", "1", "-c:a", "pcm_s16le", wav]);
  return fs.readFile(wav);
};

describe.skipIf(!enabled)("Voice Input real release (AC-002)", () => {
  let root: string;
  let manager: ExtensionManager;

  afterAll(async () => {
    await manager?.stopAll();
    if (root) await fs.rm(root, { recursive: true, force: true });
  });

  it("installs from the signed catalog, ends On and ready, and dictates through the action route", async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "voice-input-real-release-"));
    process.env.HF_HOME = path.join(root, "huggingface");
    manager = composeExtensions({
      dataDir: path.join(root, "server-data"), platform: thisPlatform(), isDesktopNode: true,
      catalogSource: readExtensionCatalogSource(), fetch: globalThis.fetch,
    });
    const app = await extensionRoutesApp(manager);
    const item = async () => (await manager.list({ refreshCatalog: false })).extensions.find((entry) => entry.id === "voice-input");

    const listed = await manager.list({ refreshCatalog: true });
    expect(listed.catalog).toBe("verified");
    expect(listed.extensions.find((entry) => entry.id === "voice-input")).toMatchObject({ state: "notInstalled" });

    const started = Date.now();
    await manager.install("voice-input");
    while ((await item())?.state === "installing") await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(await item()).toMatchObject({ state: "installed", enabled: true });
    while ((await item())?.starting) await new Promise((resolve) => setTimeout(resolve, 500));
    console.info(`[voice-input real release] installed and ready in ${Math.round((Date.now() - started) / 1000)} s`);
    expect(await item()).toMatchObject({ state: "installed", enabled: true, ready: true, message: "Ready." });

    const page = await app.inject({ method: "GET", url: "/rest/extensions/voice-input/ui/index.html", headers: { host: "127.0.0.1:29695" } });
    expect(page.statusCode).toBe(200);
    expect(page.headers["content-security-policy"]).toContain("connect-src 'none'");

    const clips = await fs.mkdtemp(path.join(root, "clips-"));
    const transcribe = async (bytes: Buffer) => {
      const answer = await app.inject({ method: "POST", url: "/rest/extensions/voice-input/actions/transcribe", headers: { "content-type": "audio/wav" }, payload: bytes });
      expect(answer.statusCode, answer.body).toBe(200);
      return answer.json().output as { text: string; noSpeech: boolean; detectedLanguage: string | null };
    };
    const setLanguage = (language: string) => app.inject({ method: "POST", url: "/rest/extensions/voice-input/actions/setLanguage", payload: { language } });

    await setLanguage("en");
    const english = await transcribe(await speech(clips, "Please summarize the meeting notes.", "en_"));
    expect(english.text.toLowerCase()).toContain("meeting");
    await setLanguage("zh");
    const chinese = await transcribe(await speech(clips, "你好世界", "zh_"));
    expect(chinese.text).toMatch(/你好|世界/);
    await setLanguage("auto");
    expect(await transcribe(await silence(clips))).toMatchObject({ noSpeech: true, text: "" });

    await manager.remove("voice-input");
    expect(await item()).toMatchObject({ state: "notInstalled" });
    await app.close();
  }, 30 * 60_000);
});
