import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { extension as mimeExtension, lookup as lookupMime } from "mime-types";
import { downloadFileFromUrl } from "../utils/download-utils.js";
import { appConfigProvider } from "../config/app-config-provider.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

type AppConfigLike = {
  getAppDataDir(): string;
  getBaseUrl(): string;
};

export class InvalidMediaCategoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidMediaCategoryError";
  }
}

export class InvalidMediaPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidMediaPathError";
  }
}

export class MediaFileNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaFileNotFoundError";
  }
}

export class MediaStorageService {
  private static instance: MediaStorageService | null = null;

  static getInstance(): MediaStorageService {
    if (!MediaStorageService.instance) {
      MediaStorageService.instance = new MediaStorageService();
    }
    return MediaStorageService.instance;
  }

  static resetInstance(): void {
    MediaStorageService.instance = null;
  }

  private config: AppConfigLike;
  private mediaRoot: string;
  private imagesDir: string;
  private audioDir: string;
  private videoDir: string;
  private documentsDir: string;
  private othersDir: string;
  private ingestedContextDir: string;
  private categoryMap: Record<string, string>;

  constructor(configOverride?: AppConfigLike) {
    this.config = configOverride ?? appConfigProvider.config;
    const dataDir = this.config.getAppDataDir();

    this.mediaRoot = path.join(dataDir, "media");
    this.imagesDir = path.join(this.mediaRoot, "images");
    this.audioDir = path.join(this.mediaRoot, "audio");
    this.videoDir = path.join(this.mediaRoot, "video");
    this.documentsDir = path.join(this.mediaRoot, "documents");
    this.othersDir = path.join(this.mediaRoot, "others");
    this.ingestedContextDir = path.join(this.mediaRoot, "ingested_context");

    this.categoryMap = {
      images: this.imagesDir,
      audio: this.audioDir,
      video: this.videoDir,
      documents: this.documentsDir,
      others: this.othersDir,
    };

    for (const dirPath of [...Object.values(this.categoryMap), this.ingestedContextDir]) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    logger.info(`MediaStorageService initialized. Media root: ${this.mediaRoot}`);
  }

  getMediaRoot(): string {
    return this.mediaRoot;
  }

  getStorageDirByCategory(category: string): string {
    const categoryMapSemantic: Record<string, string> = {
      ...this.categoryMap,
      texts: this.documentsDir,
    };
    return categoryMapSemantic[category] ?? this.othersDir;
  }

  async listMediaFiles(category?: string, page = 1, limit = 20): Promise<{
    files: Array<{ filename: string; category: string; url: string; createdAt: number }>;
    pagination: { currentPage: number; totalPages: number; totalFiles: number; limit: number };
  }> {
    logger.info(`Listing media files for category '${category}' - Page: ${page}, Limit: ${limit}`);
    const baseUrl = this.config.getBaseUrl();
    const allFiles: Array<{ filename: string; category: string; url: string; createdAt: number }> = [];

    const categoriesToScan =
      category && Object.prototype.hasOwnProperty.call(this.categoryMap, category)
        ? [category]
        : Object.keys(this.categoryMap);

    for (const catName of categoriesToScan) {
      const directory = this.categoryMap[catName];
      try {
        const entries = fs.readdirSync(directory, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile()) {
            continue;
          }
          const filePath = path.join(directory, entry.name);
          const relativePath = path.relative(this.mediaRoot, filePath).split(path.sep).join("/");
          const stat = fs.statSync(filePath);

          allFiles.push({
            filename: entry.name,
            category: catName,
            url: `${baseUrl}/rest/files/${relativePath}`,
            createdAt: stat.mtimeMs,
          });
        }
      } catch (error) {
        logger.warn(`Media directory not found for category: ${catName}`);
      }
    }

    allFiles.sort((a, b) => b.createdAt - a.createdAt);

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedFiles = allFiles.slice(startIndex, endIndex);
    const totalFiles = allFiles.length;
    const totalPages = Math.ceil(totalFiles / limit) || 1;

    return {
      files: paginatedFiles,
      pagination: {
        currentPage: page,
        totalPages,
        totalFiles,
        limit,
      },
    };
  }

  deleteMediaFile(category: string, filename: string): void {
    logger.info(`Attempting to delete media file: '${filename}' from category: '${category}'`);

    const allowedCategories: Record<string, string> = {
      ...this.categoryMap,
      ingested_context: this.ingestedContextDir,
    };
    if (!allowedCategories[category]) {
      throw new InvalidMediaCategoryError(`Invalid media category: ${category}`);
    }

    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      throw new InvalidMediaPathError(`Invalid characters in filename: ${filename}`);
    }

    const directory = allowedCategories[category];
    const filePath = path.join(directory, filename);
    const resolvedPath = path.resolve(filePath);
    const resolvedRoot = path.resolve(this.mediaRoot);

    if (!resolvedPath.startsWith(resolvedRoot + path.sep)) {
      throw new InvalidMediaPathError(
        "Attempted to access a file outside the designated media directory.",
      );
    }

    if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
      throw new MediaFileNotFoundError(`File not found: ${filePath}`);
    }

    fs.unlinkSync(resolvedPath);
    logger.info(`Successfully deleted file: ${resolvedPath}`);
  }

  async ingestLocalFileForContext(localPathStr: string): Promise<string> {
    logger.debug(`Attempting to ingest local context file from: ${localPathStr}`);

    if (!path.isAbsolute(localPathStr)) {
      logger.warn(
        `Path provided to ingestLocalFileForContext is not absolute: ${localPathStr}`,
      );
      throw new Error(`Path must be absolute: ${localPathStr}`);
    }

    if (!fs.existsSync(localPathStr) || !fs.statSync(localPathStr).isFile()) {
      logger.warn(`Local context file not found at path for ingestion: ${localPathStr}`);
      throw new Error(`Local context file not found at: ${localPathStr}`);
    }

    const extension = path.extname(localPathStr);
    const uniqueFilename = `${randomUUID()}${extension}`;
    const destinationPath = path.join(this.ingestedContextDir, uniqueFilename);

    try {
      await fs.promises.copyFile(localPathStr, destinationPath);
      logger.info(`Successfully copied local context file to: ${destinationPath}`);
    } catch (error) {
      logger.error(
        `Failed to copy local context file from '${localPathStr}' to '${destinationPath}': ${String(error)}`,
      );
      throw error;
    }

    const relativePath = path
      .relative(this.mediaRoot, destinationPath)
      .split(path.sep)
      .join("/");
    const baseUrl = this.config.getBaseUrl();
    const serverUrl = `${baseUrl}/rest/files/${relativePath}`;

    logger.info(`Generated server URL for ingested context file: ${serverUrl}`);
    return serverUrl;
  }

  async storeMediaAndGetUrl(sourceUri: string, desiredFilename: string): Promise<string> {
    if (!desiredFilename || !String(desiredFilename).trim()) {
      throw new Error("desiredFilename is required when storing media");
    }
    const filePath = await this.saveMedia(sourceUri, desiredFilename, null);
    const relativePath = path
      .relative(this.mediaRoot, filePath)
      .split(path.sep)
      .join("/");
    const baseUrl = this.config.getBaseUrl();
    const serverUrl = `${baseUrl}/rest/files/${relativePath}`;
    logger.info(`Successfully saved media to ${filePath}. Server URL: ${serverUrl}`);
    return serverUrl;
  }

  async storeMediaAndGetPath(
    sourceUri: string,
    desiredFilename: string,
    targetRoot: string,
  ): Promise<string> {
    if (!desiredFilename || !String(desiredFilename).trim()) {
      throw new Error("desiredFilename is required when saving to a custom path");
    }
    const filePath = await this.saveMedia(sourceUri, desiredFilename, targetRoot);
    const absPath = path.resolve(filePath);
    logger.info(`Successfully saved media to ${absPath} (custom target root)`);
    return absPath;
  }

  private async saveMedia(
    sourceUri: string,
    desiredFilename: string | null,
    targetRoot: string | null,
  ): Promise<string> {
    logger.debug(`Processing media source URI: ${sourceUri.slice(0, 100)}...`);
    if (!sourceUri) {
      throw new Error("sourceUri is required");
    }

    if (sourceUri.startsWith("data:")) {
      return this.saveFromDataUri(sourceUri, desiredFilename, targetRoot);
    }
    if (sourceUri.startsWith("http")) {
      return this.saveFromUrl(sourceUri, desiredFilename, targetRoot);
    }
    if (fs.existsSync(sourceUri)) {
      return this.saveFromLocalPath(sourceUri, desiredFilename, targetRoot);
    }

    logger.warn(`Unrecognized or non-existent media source: ${sourceUri.slice(0, 100)}`);
    throw new Error(`Unsupported media source: ${sourceUri.slice(0, 100)}`);
  }

  private async saveFromUrl(
    url: string,
    desiredFilename?: string | null,
    targetRoot?: string | null,
  ): Promise<string> {
    const mimeType = lookupMime(url) || undefined;
    const destinationDir = this.getDirFromMimeType(mimeType, targetRoot);

    let filePath = await downloadFileFromUrl(url, destinationDir);
    if (desiredFilename) {
      filePath = this.renameWithStem(filePath, desiredFilename);
    }
    return filePath;
  }

  private saveFromDataUri(
    dataUri: string,
    desiredFilename?: string | null,
    targetRoot?: string | null,
  ): string {
    try {
      const [header, encodedData] = dataUri.split(",", 2);
      const mimeType = header.split(":")[1]?.split(";")[0];

      const destinationDir = this.getDirFromMimeType(mimeType, targetRoot);
      const ext = mimeType ? mimeExtension(mimeType) : false;
      const extension = ext ? `.${ext}` : ".bin";

      const fileBytes = Buffer.from(encodedData, "base64");
      const filename = this.buildFilename(destinationDir, desiredFilename, extension);
      const filePath = path.join(destinationDir, filename);

      fs.writeFileSync(filePath, fileBytes);
      return filePath;
    } catch (error) {
      logger.error(`Failed to save from data URI: ${String(error)}`);
      throw new Error("Invalid data URI format.");
    }
  }

  private saveFromLocalPath(
    localPathStr: string,
    desiredFilename?: string | null,
    targetRoot?: string | null,
  ): string {
    if (!fs.existsSync(localPathStr)) {
      throw new Error(`Local path is not a file: ${localPathStr}`);
    }

    const mimeType = lookupMime(localPathStr) || undefined;
    const destinationDir = this.getDirFromMimeType(mimeType, targetRoot);
    const extension = path.extname(localPathStr) || ".bin";
    const filename = this.buildFilename(destinationDir, desiredFilename, extension);
    const destinationPath = path.join(destinationDir, filename);

    fs.copyFileSync(localPathStr, destinationPath);
    return destinationPath;
  }

  private getDirFromMimeType(mimeType?: string, targetRoot?: string | null): string {
    const root = targetRoot ?? this.mediaRoot;
    const imagesDir = path.join(root, "images");
    const audioDir = path.join(root, "audio");
    const videoDir = path.join(root, "video");
    const documentsDir = path.join(root, "documents");
    const othersDir = path.join(root, "others");

    for (const dirPath of [imagesDir, audioDir, videoDir, documentsDir, othersDir]) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    if (!mimeType) {
      return othersDir;
    }
    if (mimeType.startsWith("image/")) {
      return imagesDir;
    }
    if (mimeType.startsWith("audio/")) {
      return audioDir;
    }
    if (mimeType.startsWith("video/")) {
      return videoDir;
    }
    return documentsDir;
  }

  private sanitizeStem(stem: string): string {
    const cleaned = [...stem].filter((ch) => /[a-z0-9_-]/i.test(ch)).join("");
    return cleaned.replace(/^[-_]+|[-_]+$/g, "") || "file";
  }

  private buildFilename(destinationDir: string, desiredFilename: string | null | undefined, extension: string): string {
    let stem: string | null = null;
    if (desiredFilename) {
      stem = this.sanitizeStem(path.parse(desiredFilename).name);
    }
    if (!stem) {
      stem = randomUUID();
    }

    let candidateName = `${stem}${extension}`;
    let counter = 1;
    while (fs.existsSync(path.join(destinationDir, candidateName))) {
      candidateName = `${stem}_${counter}${extension}`;
      counter += 1;
    }
    return candidateName;
  }

  private renameWithStem(filePath: string, desiredFilename: string): string {
    const stem = this.sanitizeStem(path.parse(desiredFilename).name);
    if (!stem) {
      return filePath;
    }

    const destinationDir = path.dirname(filePath);
    const extension = path.extname(filePath);
    const newName = this.buildFilename(destinationDir, stem, extension);
    const newPath = path.join(destinationDir, newName);

    try {
      fs.renameSync(filePath, newPath);
      return newPath;
    } catch (error) {
      logger.error(`Failed to rename file '${filePath}' to '${newPath}': ${String(error)}`);
      return filePath;
    }
  }
}

export const getMediaStorageService = (): MediaStorageService => MediaStorageService.getInstance();
