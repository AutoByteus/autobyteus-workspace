import fs from "node:fs";
import dotenv from "dotenv";
import { replaceEnvironmentAssignmentFileDurably } from "../environment-assignment-file.js";

const SETTING = "DEFAULT_SPEECH_GENERATION_MODEL";
const FLASH = "gemini-3.8-flash-tts";
const RETIRED = new Set([
  "gemini-3.1-flash-tts-preview",
  "gemini-2.5-flash-tts",
  "gemini-2.5-pro-tts",
]);

/** One-time persisted-setting transition; retired IDs never enter runtime model lookup. */
export function migrateRetiredSpeechModelSelection(
  configFile: string,
  configData: Record<string, string>,
  inheritedSelection: string | undefined,
): void {
  if (inheritedSelection !== undefined && RETIRED.has(inheritedSelection)) {
    throw new Error("An inherited speech model selection is retired; update external configuration before startup.");
  }
  if (!RETIRED.has(configData[SETTING])) return;

  try {
    replaceEnvironmentAssignmentFileDurably(configFile, SETTING, FLASH);
    const parsed = dotenv.parse(fs.readFileSync(configFile, "utf-8"));
    if (parsed[SETTING] !== FLASH) throw new Error("Target setting did not validate.");
  } catch {
    throw new Error("Unable to migrate the saved speech model selection; inspect config file and permissions.");
  }

  configData[SETTING] = FLASH;
  if (inheritedSelection === undefined) process.env[SETTING] = FLASH;
}
