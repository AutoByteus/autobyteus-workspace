import path from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import WebSocket from "ws";

export const waitForSocketOpen = (socket: WebSocket, timeoutMs = 10_000): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket open")), timeoutMs);
    socket.once("open", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

export const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const stableResponseWordPool = [
  "amber",
  "cedar",
  "harbor",
  "lantern",
  "meadow",
  "pocket",
  "river",
  "signal",
  "thunder",
  "violet",
  "willow",
  "canyon",
] as const;

export const buildStableSkillResponse = (seed: string): string => {
  const compactSeed = seed.replace(/[^a-f0-9]/gi, "").padEnd(6, "0");
  const words: string[] = [];
  for (let index = 0; index < 3; index += 1) {
    const chunk = compactSeed.slice(index * 2, index * 2 + 2) || "0";
    const wordIndex = Number.parseInt(chunk, 16) % stableResponseWordPool.length;
    words.push(stableResponseWordPool[wordIndex] ?? stableResponseWordPool[0]);
  }
  return words.join(" ");
};

export const tokenizeLiveModelText = (value: string): string[] =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);

export const removeDirWithRetry = async (targetPath: string): Promise<void> => {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await rm(targetPath, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt >= 5) {
        throw error;
      }
      await wait(250 * attempt);
    }
  }
};

export const createConfiguredSkill = async (testDataDir: string, skillName: string, trigger: string, response: string): Promise<string> => {
  const skillRoot = path.join(testDataDir, "skills", skillName);
  const skillFilePath = path.join(skillRoot, "SKILL.md");
  await mkdir(skillRoot, { recursive: true });
  await writeFile(
    skillFilePath,
    [
      "---",
      `name: ${skillName}`,
      "description: Live Codex configured skill E2E probe.",
      "---",
      "",
      `When the user's message is exactly \"${trigger}\", respond with exactly \"${response}\".`,
      "Do not add any other words or punctuation.",
    ].join("\n"),
    "utf-8",
  );
  return skillFilePath;
};

export const isRetryableCodexBootstrapFailure = (message: string | null | undefined): boolean => {
  const normalized = (message ?? "").toLowerCase();
  return (
    normalized.includes("code_runtime_command_failed") ||
    normalized.includes("codex_runtime_command_failed") ||
    normalized.includes("startup-ready state") ||
    normalized.includes("did not reach startup-ready state") ||
    normalized.includes("runtime command failed")
  );
};

export const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export type WsMessage = {
  type: string;
  payload: Record<string, unknown>;
};

export type WsTurnCapture = {
  sawConnected: boolean;
  sawRunningAfterPrompt: boolean;
  sawIdleAfterPrompt: boolean;
  assistantOutputFragments: string[];
  errorCodes: string[];
  rawMessages: WsMessage[];
};
