import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseCanonicalApplicationId } from "../../application-bundles/utils/application-bundle-identity.js";
import type { ApplicationStorageLayout } from "../domain/models.js";

export type ApplicationStoragePathConfig = {
  getAppDataDir(): string;
};

const MAX_APPLICATION_STORAGE_SEGMENT_LENGTH = 200;
const STORAGE_ID_HINT_MAX_LENGTH = 48;

const normalizeApplicationId = (applicationId: string): string => {
  const normalized = encodeURIComponent(applicationId.trim());
  if (!normalized) {
    throw new Error("applicationId is required.");
  }
  return normalized;
};

const normalizeStorageHint = (value: string): string => {
  const encoded = encodeURIComponent(value.trim())
    .replaceAll("%", "_")
    .replaceAll(/_+/g, "_")
    .replaceAll(/^_+|_+$/g, "");
  if (!encoded) {
    return "app";
  }
  return encoded.slice(0, STORAGE_ID_HINT_MAX_LENGTH);
};

export const buildApplicationStorageKey = (applicationId: string): string => {
  const normalized = normalizeApplicationId(applicationId);
  if (normalized.length <= MAX_APPLICATION_STORAGE_SEGMENT_LENGTH) {
    return normalized;
  }

  const parsedCanonicalId = parseCanonicalApplicationId(applicationId);
  const hintSource = parsedCanonicalId?.localApplicationId ?? applicationId;
  const keyPrefix = parsedCanonicalId ? "bundle-app" : "app";
  const digest = crypto.createHash("sha256").update(normalized).digest("hex");
  return `${keyPrefix}__${normalizeStorageHint(hintSource)}__${digest}`;
};

export const buildApplicationStorageLayout = (
  appConfig: ApplicationStoragePathConfig,
  applicationId: string,
): ApplicationStorageLayout => {
  const rootPath = path.join(
    appConfig.getAppDataDir(),
    "applications",
    buildApplicationStorageKey(applicationId),
  );
  const dbDir = path.join(rootPath, "db");
  const logsDir = path.join(rootPath, "logs");
  const runtimeDir = path.join(rootPath, "runtime");

  return {
    applicationId,
    rootPath,
    dbDir,
    appDatabasePath: path.join(dbDir, "app.sqlite"),
    platformDatabasePath: path.join(dbDir, "platform.sqlite"),
    logsDir,
    workerStdoutLogPath: path.join(logsDir, "worker.stdout.log"),
    workerStderrLogPath: path.join(logsDir, "worker.stderr.log"),
    runtimeDir,
    engineLockPath: path.join(runtimeDir, "engine.lock"),
    engineStatusPath: path.join(runtimeDir, "engine-status.json"),
  };
};

export const ensureApplicationStorageDirectories = (layout: ApplicationStorageLayout): void => {
  fs.mkdirSync(layout.rootPath, { recursive: true });
  fs.mkdirSync(layout.dbDir, { recursive: true });
  fs.mkdirSync(layout.logsDir, { recursive: true });
  fs.mkdirSync(layout.runtimeDir, { recursive: true });
};
